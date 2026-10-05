import { readFileSync, existsSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseDocument } from '../vendor/yaml.mjs';
import { loadRegistry, ROOT } from './lifecycle-registry.mjs';
import { validateTaskPackageSchema } from './task-package-schema.mjs';
import { loadSkillRegistry } from './skill-registry.mjs';
import { assertPlanReviewTask } from './plan-review-control.mjs';

export const REVIEW_POLICY_REF = '.template-spec/agents/digital-human-roles.yaml';
const HEX = /^[a-f0-9]{64}$/;
const ID = /^capability\.[a-z0-9][a-z0-9-]*$/;
const REVIEW_STATES = new Set(['Reviewer', 'Verifier']);
const contextFields = ['check_ids', 'capability_ids', 'candidate_ref', 'candidate_digest', 'policy_ref', 'policy_digest', 'reviewer_principal_ref', 'drafter_principal_ref', 'approval_scope', 'basis', 'current_approvals', 'plan_review_binding'];
const fail = (code, detail) => { const error = new TypeError(`${code}: ${detail}`); error.code = code; throw error; };
const strings = value => Array.isArray(value) && value.length > 0 && value.every(x => typeof x === 'string' && x.trim()) && new Set(value).size === value.length;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sameSet = (a, b) => strings(a) && strings(b) && same([...a].sort(), [...b].sort());
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const reviewDigest = bytes => createHash('sha256').update(bytes).digest('hex');
export const currentApprovalsDigest = rows => reviewDigest(JSON.stringify(canonical(rows)));

export function reviewLocalPath(root, ref, { missing = false } = {}) {
  if (typeof ref !== 'string' || !ref.trim() || path.isAbsolute(ref) || ref.includes('\\') || ref.split('/').includes('..') || /^[a-z][a-z0-9+.-]*:/i.test(ref)) fail('APPROVAL_CONTEXT_REQUIRED', `必须使用项目内相对引用: ${ref}`);
  const file = path.resolve(root, ref), rel = path.relative(root, file);
  if (!rel || rel === '..' || rel.startsWith(`..${path.sep}`)) fail('APPROVAL_CONTEXT_REQUIRED', `引用越界: ${ref}`);
  let current = path.resolve(root);
  for (const segment of rel.split(path.sep)) {
    current = path.join(current, segment);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) fail('APPROVAL_CONTEXT_REQUIRED', `引用不得经过 symlink: ${ref}`);
  }
  if (existsSync(file) && existsSync(root)) {
    const realRelative = path.relative(realpathSync(root), realpathSync(file));
    if (realRelative === '..' || realRelative.startsWith(`..${path.sep}`)) fail('APPROVAL_CONTEXT_REQUIRED', `引用越界: ${ref}`);
  } else if (!missing && !existsSync(root)) fail('APPROVAL_CONTEXT_REQUIRED', '项目根不可读');
  return file;
}
function io({ root = ROOT, read = file => readFileSync(file) } = {}) {
  const bytes = ref => { try { return Buffer.from(read(reviewLocalPath(root, ref))); } catch (error) { if (error.code === 'APPROVAL_CONTEXT_REQUIRED') throw error; fail('APPROVAL_CONTEXT_REQUIRED', `当前引用不可读: ${ref}`); } };
  const document = ref => {
    const doc = parseDocument(String(bytes(ref)), { uniqueKeys: true, maxAliasCount: 0 });
    if (doc.errors.length) fail('APPROVAL_CONTEXT_REQUIRED', `当前引用格式无效: ${ref}`);
    return doc.toJS({ maxAliasCount: 0 });
  };
  return { root, read, bytes, document };
}
export function reviewAuthorityRegistries(options = {}) {
  const source=io(options);
  const current=(key,ref,fallback)=>{
    if(!existsSync(reviewLocalPath(source.root,ref,{missing:true})))return options[key] || fallback();
    const actual=source.document(ref);
    if(options[key] && !same(canonical(options[key]),canonical(actual)))fail('REVIEW_BINDING_STALE',`传入注册表与目标项目事实源不一致: ${ref}`);
    return actual;
  };
  return {registry:current('registry','.template-spec/process/lifecycle-registry.yaml',loadRegistry),skillRegistry:current('skillRegistry','.template-spec/agents/yss-skill-registry.yaml',loadSkillRegistry)};
}
export function reviewRuleForBoundary(rolesDoc, boundary) {
  const policy = rolesDoc.gate_policy || {};
  const rule = [...(policy.check_reviews || []), ...(policy.digital_human_review || []), ...(policy.dual_digital_human || [])].find(x => x.gate === boundary);
  if (!rule) fail('GATE_POLICY_REQUIRED', `没有专业审查能力政策: ${boundary}`);
  return rule;
}
export function validateReviewCapabilityPolicy(rolesDoc, { skillIds, gateIds, checkIds } = {}) {
  if (rolesDoc.gate_policy?.default_if_unlisted !== 'reject-unlisted') fail('GATE_POLICY_REQUIRED', '当前能力政策必须拒绝未分类边界');
  if (!Array.isArray(rolesDoc.review_capabilities) || !rolesDoc.review_capabilities.length) fail('GATE_POLICY_REQUIRED', '缺少 review_capabilities');
  const roles = new Map((rolesDoc.roles || []).map(role => [role.id, role]));
  const ids = new Set();
  for (const item of rolesDoc.review_capabilities) {
    if (!ID.test(item?.id || '') || ids.has(item.id)) fail('GATE_POLICY_REQUIRED', `能力编号未知或重复: ${item?.id}`);
    ids.add(item.id);
    if (typeof item.name !== 'string' || !item.name.trim() || !strings(item.eligible_roles) || !strings(item.review_skills)) fail('GATE_POLICY_REQUIRED', `${item.id} 缺少能力名称、角色或技能`);
    for (const skill of item.review_skills) if (skillIds && !skillIds.has(skill)) fail('GATE_POLICY_REQUIRED', `未登记审查技能: ${skill}`);
    for (const roleId of item.eligible_roles) {
      const role = roles.get(roleId);
      if (!role) fail('GATE_POLICY_REQUIRED', `能力引用未知角色: ${roleId}`);
      if (item.review_skills.some(skill => role.forbidden_skills.includes(skill))) fail('REVIEW_CAPABILITY_FORBIDDEN', `${roleId} 的禁止技能不能成为审查补充能力`);
    }
  }
  const rules = [...(rolesDoc.gate_policy?.check_reviews || []), ...(rolesDoc.gate_policy?.digital_human_review || []), ...(rolesDoc.gate_policy?.dual_digital_human || []), ...(rolesDoc.gate_policy?.digital_human_review_work_units || [])];
  for (const rule of rules) {
    if (!strings(rule.capability_ids) || rule.capability_ids.some(id => !ids.has(id))) fail('GATE_POLICY_REQUIRED', `${rule.gate || rule.work_unit} 缺少完整能力分类`);
  }
  if (gateIds || checkIds) {
    const policy = rolesDoc.gate_policy;
    const classifiedGates = [...(policy.evidence_only || []), ...(policy.orchestrator || []), ...(policy.product_digital_human_with_biological_veto || []), ...(policy.biological_human || []), ...(policy.digital_human_review || []).map(x => x.gate), ...(policy.dual_digital_human || []).map(x => x.gate)];
    const classifiedChecks = [...(policy.automatic_checks || []), ...(policy.check_reviews || []).map(x => x.gate)];
    for (const [expected, actual, kind] of [[gateIds, classifiedGates, 'gate'], [checkIds, classifiedChecks, 'check']]) {
      if (!expected) continue;
      if (new Set(actual).size !== actual.length || actual.some(id => !expected.has(id)) || [...expected].some(id => !actual.includes(id))) fail('GATE_POLICY_REQUIRED', `${kind} 分类必须完整且唯一`);
    }
  }
  return { capability_count: ids.size };
}
export function compileReviewCapabilities({ checkIds, roleId, executionState = 'Reviewer', rolesDoc, registry = loadRegistry(), skillRegistry = loadSkillRegistry() }) {
  if (!rolesDoc) fail('GATE_POLICY_REQUIRED', '缺少权威能力政策');
  const skillIds = new Set(['skills', 'platform_skills', 'external_skills'].flatMap(key => (skillRegistry[key] || []).map(item => item.id)));
  validateReviewCapabilityPolicy(rolesDoc, { skillIds, gateIds: new Set(registry.gates.map(x => x.id)), checkIds: new Set((registry.checks || []).map(x => x.id)) });
  if (!REVIEW_STATES.has(executionState)) fail('REVIEW_CAPABILITY_STATE', '审查补充技能只允许 Reviewer / Verifier');
  if (!strings(checkIds)) fail('GATE_POLICY_REQUIRED', 'check_ids 必须是非空唯一数组');
  const role = rolesDoc.roles.find(x => x.id === roleId);
  if (!role) fail('REVIEW_CAPABILITY_MISSING', `未知审查角色: ${roleId}`);
  const known = new Map([...registry.gates, ...(registry.checks || [])].map(x => [x.id, x]));
  const capabilityIds = [...new Set(checkIds.flatMap(id => {
    if (!known.has(id)) fail('GATE_POLICY_REQUIRED', `未知当前审查边界: ${id}`);
    const rule = reviewRuleForBoundary(rolesDoc, id);
    if (!strings(rule.capability_ids)) fail('GATE_POLICY_REQUIRED', `${id} 缺少能力要求`);
    return rule.capability_ids;
  }))].sort();
  const skills = new Set(), stages = new Set(checkIds.map(id => known.get(id).stage));
  for (const id of capabilityIds) {
    const capability = rolesDoc.review_capabilities?.find(x => x.id === id);
    if (!capability?.eligible_roles.includes(roleId)) fail('REVIEW_CAPABILITY_MISSING', `${roleId} 缺少 ${id}；应增加有该能力的专家`);
    for (const skill of capability.review_skills) {
      if (role.forbidden_skills.includes(skill)) fail('REVIEW_CAPABILITY_FORBIDDEN', `${roleId} 禁止加载 ${skill}`);
      skills.add(skill);
    }
  }
  return { check_ids: [...checkIds], capability_ids: capabilityIds, review_skills: [...skills].sort(), review_stages: [...stages] };
}
/** Supplements existing professional work-unit reviews; it grants no approval boundary. */
export function compileWorkUnitReviewCapabilities({workUnitId,roleId,executionState='Reviewer',rolesDoc,registry=loadRegistry()}) {
  if(!REVIEW_STATES.has(executionState)) fail('REVIEW_CAPABILITY_STATE','工作单元审查能力只允许 Reviewer / Verifier');
  const skillRegistry=loadSkillRegistry();
  validateReviewCapabilityPolicy(rolesDoc,{skillIds:new Set(['skills','platform_skills','external_skills'].flatMap(key=>(skillRegistry[key] || []).map(row=>row.id))),gateIds:new Set(registry.gates.map(row=>row.id)),checkIds:new Set((registry.checks || []).map(row=>row.id))});
  const unit=registry.work_units.find(row=>row.id===workUnitId), rule=rolesDoc.gate_policy.digital_human_review_work_units?.find(row=>row.work_unit===workUnitId), role=rolesDoc.roles.find(row=>row.id===roleId);
  if(!unit || !rule || !role) fail('GATE_POLICY_REQUIRED','工作单元没有已登记的专业审查政策');
  const skills=new Set();
  for(const id of rule.capability_ids) {
    const capability=rolesDoc.review_capabilities.find(row=>row.id===id);
    if(!capability?.eligible_roles.includes(roleId)) fail('REVIEW_CAPABILITY_MISSING',`${roleId} 缺少 ${id}；应增加专家`);
    for(const skill of capability.review_skills) {if(role.forbidden_skills.includes(skill)) fail('REVIEW_CAPABILITY_FORBIDDEN',`${roleId} 禁止加载 ${skill}`);skills.add(skill);}
  }
  return {capability_ids:[...rule.capability_ids].sort(),review_skills:[...skills].sort(),review_stages:[unit.stage]};
}
/** Read current subjects from consumer-owned checkpoint rows, never from approvals. */
export function currentApprovalsFromCheckpoint(checkpointRef, boundaries, options = {}) {
  const source = io(options), checkpoint = source.document(checkpointRef);
  if (!strings(boundaries)) fail('APPROVAL_CONTEXT_REQUIRED', '缺少当前检查范围');
  return boundaries.map(boundary => {
    const row = checkpoint[boundary.startsWith('check.') ? 'checks' : 'gates']?.[boundary];
    if (!row?.subject_ref || !strings(row.approval_scope) || !row.drafter_principal_ref?.trim() || !Array.isArray(row.basis) || !row.basis.length || new Set(row.basis.map(x => x.ref)).size !== row.basis.length) fail('APPROVAL_CONTEXT_REQUIRED', `${boundary} 缺少当前 subject、scope、basis 或作者来源`);
    const subjectDigest = reviewDigest(source.bytes(row.subject_ref));
    if (row.subject_digest !== undefined && row.subject_digest !== subjectDigest) fail('REVIEW_BINDING_STALE', `${boundary} 当前 subject 摘要漂移`);
    for (const item of row.basis) if (!/^(sha256:)?[a-f0-9]{64}$/.test(item.digest || '') || reviewDigest(source.bytes(item.ref)) !== item.digest.replace(/^sha256:/,'')) fail('REVIEW_BINDING_STALE', `${boundary} 当前 basis 摘要漂移`);
    for (const evidence of row.evidence_refs || []) if (!row.basis.some(x => x.ref === evidence)) fail('APPROVAL_CONTEXT_REQUIRED', `${boundary} 证据必须包含在当前 basis`);
    const basis=row.basis.filter(item=>![row.subject_ref,row.approval_ref].includes(item.ref)).map(item=>({ref:item.ref,digest:item.digest.replace(/^sha256:/,'')}));
    if(!basis.length) fail('APPROVAL_CONTEXT_REQUIRED', `${boundary} 缺少独立审查依据`);
    return { boundary, subject_ref: row.subject_ref, subject_digest: subjectDigest, approval_scope: [...row.approval_scope], basis, drafter_principal_ref: row.drafter_principal_ref };
  });
}
function currentContext(context, source, options = {}) {
  if (!context || contextFields.filter(field => field !== 'plan_review_binding').some(field => context[field] === undefined)) fail('APPROVAL_CONTEXT_REQUIRED', '缺少完整当前 review_context');
  // A completed Plan bundle may supply an unaffected check after a narrower repair.
  // Only that check's consumer-selected closure is freshened; the issued task stays byte-bound.
  const boundary = context.plan_review_binding && options.boundary;
  for (const field of ['check_ids', 'capability_ids', 'approval_scope']) if (!strings(context[field])) fail('APPROVAL_CONTEXT_REQUIRED', `${field} 无效`);
  if (context.reviewer_principal_ref === context.drafter_principal_ref || !context.reviewer_principal_ref?.trim() || !context.drafter_principal_ref?.trim()) fail('REVIEW_NOT_INDEPENDENT', '审查实例必须不同于起草实例');
  for (const [ref, digest] of [[context.candidate_ref, context.candidate_digest], [context.policy_ref, context.policy_digest]]) {
    if (!HEX.test(digest || '') || reviewDigest(source.bytes(ref)) !== digest) fail('REVIEW_BINDING_STALE', `当前候选或政策摘要过期: ${ref}`);
  }
  if (context.policy_ref !== REVIEW_POLICY_REF) fail('GATE_POLICY_REQUIRED', '政策引用必须指向唯一角色事实源');
  if (!Array.isArray(context.basis) || !context.basis.length || new Set(context.basis.map(x => x.ref)).size !== context.basis.length) fail('APPROVAL_CONTEXT_REQUIRED', '缺少唯一当前 basis');
  const rows = context.current_approvals;
  if (!Array.isArray(rows) || !sameSet(rows.map(row => row.boundary), context.check_ids)) fail('APPROVAL_CONTEXT_REQUIRED', 'current_approvals 必须完整且唯一覆盖 check_ids');
  const selected = boundary ? rows.filter(row => row.boundary === boundary) : rows;
  if (!selected.length) fail('APPROVAL_CONTEXT_REQUIRED', '消费边界不属于当前审查任务');
  const selectedRefs = new Set(selected.flatMap(row => row.basis.map(item => item.ref)));
  for (const item of context.basis) {
    if (!HEX.test(item.digest || '')) fail('REVIEW_BINDING_STALE', `依据摘要无效: ${item.ref}`);
    if ((!boundary || selectedRefs.has(item.ref) || ['.template-spec/process/lifecycle-registry.yaml','.template-spec/agents/yss-skill-registry.yaml'].includes(item.ref)) && reviewDigest(source.bytes(item.ref)) !== item.digest) fail('REVIEW_BINDING_STALE', `当前依据摘要过期: ${item.ref}`);
  }
  for (const row of rows) {
    if (!HEX.test(row.subject_digest || '') || ((!boundary || row.boundary === boundary) && reviewDigest(source.bytes(row.subject_ref)) !== row.subject_digest)) fail('REVIEW_BINDING_STALE', `当前逐项主体已变化: ${row.subject_ref}`);
    if (!strings(row.approval_scope) || row.approval_scope.some(x => !context.approval_scope.includes(x)) || !row.drafter_principal_ref?.trim() || row.drafter_principal_ref === context.reviewer_principal_ref) fail('REVIEW_NOT_INDEPENDENT', '逐项范围或独立作者来源无效');
    if (!Array.isArray(row.basis) || !row.basis.length || new Set(row.basis.map(x => x.ref)).size !== row.basis.length || row.basis.some(item => !context.basis.some(bound => same(canonical(bound), canonical(item))))) fail('APPROVAL_CONTEXT_REQUIRED', '逐项 basis 必须绑定当前任务依据');
  }
  const candidate = source.document(context.candidate_ref);
  if (candidate?.schema_version !== 1 || candidate.kind !== 'review-subject' || !same(canonical(candidate.current_approvals), canonical(rows))) fail('REVIEW_BINDING_STALE', '候选审阅包未绑定逐项当前上下文');
  if (!candidate.source_checkpoint?.ref || !HEX.test(candidate.source_checkpoint.digest || '')) fail('REVIEW_BINDING_STALE', '当前审阅包缺少 checkpoint 来源');
  const currentRows = currentApprovalsFromCheckpoint(candidate.source_checkpoint.ref, boundary ? [boundary] : context.check_ids, source);
  const checkpointDigest = candidate.source_checkpoint.binding_kind === 'current-approvals-v1' ? currentApprovalsDigest(currentRows) : reviewDigest(source.bytes(candidate.source_checkpoint.ref));
  if(!boundary && checkpointDigest !== candidate.source_checkpoint.digest) fail('REVIEW_BINDING_STALE','当前审阅包的 checkpoint 批准输入已变化');
  if (!same(canonical(currentRows), canonical(selected))) fail('REVIEW_BINDING_STALE', '逐项预期与当前 checkpoint 消费上下文不同');

}
export function validateReviewTaskBinding(task, options = {}) {
  const source = io(options);
  validateTaskPackageSchema(task);
  if (task.schema_version !== 1 || !REVIEW_STATES.has(task.execution_state) || !['active', 'resolved'].includes(task.workflow_status) || task.contract.status !== 'issued') fail('REVIEW_CAPABILITY_STATE', '只接受 issued 的正式 v1 Reviewer / Verifier 任务');
  currentContext(task.review_context, source, options);
  const policy = source.document(task.review_context.policy_ref), rolesDoc = options.rolesDoc || policy;
  if (!same(canonical(rolesDoc), canonical(policy))) fail('REVIEW_BINDING_STALE', '传入角色政策与当前政策字节不一致');
  const role = rolesDoc.roles.find(x => x.id === task.role_id);
  if (!role || !rolesDoc.runtimes.some(x => x.id === task.runtime_id)) fail('REVIEW_CAPABILITY_MISSING', '未登记审查角色或运行时');
  if (task.skill_source.registry_ref !== REVIEW_POLICY_REF || task.skill_source.defaults_ref !== `taskPackageDefaults(${task.role_id})` || !same(task.skill_source.core_skills, role.core_skills) || !same(task.skill_source.forbidden_skills, role.forbidden_skills)) fail('REVIEW_CAPABILITY_FORBIDDEN', 'core / forbidden 技能不得通过能力任务改变');
  const authority=reviewAuthorityRegistries(options);
  const compiled = compileReviewCapabilities({ checkIds: task.review_context.check_ids, roleId: task.role_id, executionState: task.execution_state, rolesDoc, ...authority });
  const unit=authority.registry.work_units.find(row=>row.id===task.work_unit_id),checkpointRef=source.document(task.review_context.candidate_ref).source_checkpoint.ref;
  if(!unit || unit.scope==='template-source' || task.work_unit_id==='work-unit.slice-implementation' || !task.stage_id || !authority.registry.stages.some(row=>row.id===task.stage_id) || (unit.stage && task.stage_id!==unit.stage))fail('REVIEW_TASK_INVALID','正式生命周期审查任务须绑定已登记工作单元及阶段；切片实现必须使用 slice-implementation 合同');
  if(task.contract.kind!=='lifecycle-work-unit' || task.contract.slice_contract_ref || task.contract.maintenance_ref || task.contract.contract_ref!==task.review_context.candidate_ref || task.contract.lifecycle_ref!==checkpointRef || task.checkpoint_ref!==checkpointRef || task.convergence.parent_work_unit!==task.work_unit_id || task.convergence.convergence_ref!==checkpointRef)fail('REVIEW_TASK_INVALID','正式审查任务的合同、checkpoint 与汇合来源不一致');
  for(const ref of [checkpointRef,task.review_context.policy_ref,task.review_context.candidate_ref,...task.review_context.basis.map(row=>row.ref),...task.review_context.current_approvals.map(row=>row.subject_ref)])if(!task.inputs.includes(ref))fail('REVIEW_TASK_INVALID','正式审查任务输入未覆盖当前审查来源: '+ref);
  if (!sameSet(task.review_context.capability_ids, compiled.capability_ids) || !same(task.skill_source.review_skills, compiled.review_skills)) fail('REVIEW_CAPABILITY_MISSING', 'capability_ids / review_skills 必须由当前能力政策编译');
  if (task.stage_id && !compiled.review_stages.includes(task.stage_id)) fail('REVIEW_CAPABILITY_MISSING', '审查阶段与当前检查不匹配');
  if (task.review_context.implementation_actor_id === task.actor_id) fail('REVIEW_NOT_INDEPENDENT', '审查 actor 不得等于实现 actor');
  const protectedRefs = [task.review_context.candidate_ref, task.review_context.policy_ref, ...task.review_context.basis.map(x => x.ref), ...task.review_context.current_approvals.map(x => x.subject_ref), source.document(task.review_context.candidate_ref).source_checkpoint.ref];
  for (const allowed of task.allowed_write_paths) {
    const output = reviewLocalPath(source.root, allowed, { missing: true });
    for (const ref of protectedRefs) {
      const rel = path.relative(output, reviewLocalPath(source.root, ref));
      if (!rel || (rel !== '..' && !rel.startsWith(`..${path.sep}`))) fail('REVIEW_CAPABILITY_WRITE_SCOPE', '审查输出范围不得覆盖候选、政策或依据');
    }
  }
  if (options.expected) {
    for (const field of contextFields) {
      const equal = ['check_ids', 'capability_ids', 'approval_scope'].includes(field) ? sameSet(task.review_context[field], options.expected[field]) : same(canonical(task.review_context[field]), canonical(options.expected[field]));
      if (!equal) fail('REVIEW_BINDING_STALE', `任务未绑定当前消费者 ${field}`);
    }
  }
  assertPlanReviewTask(task, options);
  return { ...task.review_context, ...compiled };
}
export function approvalExpectedFromTask(task, { boundary, reviewTaskRef, reviewTaskDigest, ...options } = {}) {
  const context = validateReviewTaskBinding(task, { ...options, boundary });
  const rows = task.review_context?.current_approvals;
  const matches = rows?.filter(row => row.boundary === boundary);
  if (!context.check_ids.includes(boundary) || matches?.length !== 1) fail('APPROVAL_CONTEXT_REQUIRED', '任务缺少当前边界的独立 subject / scope / basis 来源');
  const row = matches[0], source = io(options);
  if (!HEX.test(row.subject_digest || '') || reviewDigest(source.bytes(row.subject_ref)) !== row.subject_digest) fail('REVIEW_BINDING_STALE', '任务的当前审查主体摘要过期');
  if (!strings(row.approval_scope) || row.approval_scope.some(x => !context.approval_scope.includes(x)) || !row.drafter_principal_ref?.trim() || row.drafter_principal_ref === context.reviewer_principal_ref || !Array.isArray(row.basis) || !row.basis.length) fail('APPROVAL_CONTEXT_REQUIRED', '任务的当前审查行缺少范围、依据或作者绑定');
  for (const basis of row.basis) if (!context.basis.some(x => same(canonical(x), canonical(basis)))) fail('REVIEW_BINDING_STALE', '行依据不属于当前任务 basis');
  if (!reviewTaskRef || !HEX.test(reviewTaskDigest || '') || reviewDigest(source.bytes(reviewTaskRef)) !== reviewTaskDigest) fail('APPROVAL_CONTEXT_REQUIRED', '缺少当前任务文件及摘要');
  if (!same(canonical(task), canonical(source.document(reviewTaskRef)))) fail('REVIEW_BINDING_STALE', '传入任务不是所绑定任务文件的当前字节');
  return { ...row, review_context: { ...task.review_context, review_task_ref: reviewTaskRef, review_task_digest: reviewTaskDigest } };
}
export function assertReviewCapabilityBinding(record, { expected, ...options } = {}) {
  if (!expected?.review_task_ref || !HEX.test(expected.review_task_digest || '')) fail('APPROVAL_CONTEXT_REQUIRED', '缺少消费者当前 review task 来源');
  if (record.review_task_ref !== expected.review_task_ref || record.review_task_digest !== expected.review_task_digest) fail('REVIEW_BINDING_STALE', '会签未绑定当前审查任务');
  const source = io(options), bytes = source.bytes(expected.review_task_ref);
  if (reviewDigest(bytes) !== expected.review_task_digest) fail('REVIEW_BINDING_STALE', '审查任务字节已变化');
  const task = source.document(expected.review_task_ref);
  const context = validateReviewTaskBinding(task, { ...options, expected, boundary: record.gate_id });
  const plan = assertPlanReviewTask(task, { ...options, boundary: record.gate_id, requireCompleted: true });
  if (plan.applicable && (!record.plan_review_binding || !same(canonical(record.plan_review_binding), canonical(plan.binding)))) fail('PLAN_REVIEW_RESULT_MISMATCH', 'Plan 结论未绑定已完成的当前专业审查尝试');
  if (!context.check_ids.includes(record.gate_id) || !sameSet(record.capability_ids, context.capability_ids)) fail('REVIEW_CAPABILITY_MISSING', '会签边界或能力不属于当前任务');
  if (record.role_id !== task.role_id || record.runtime_id !== task.runtime_id || record.principal_ref !== context.reviewer_principal_ref || record.drafter_principal_ref !== context.current_approvals.find(row => row.boundary === record.gate_id)?.drafter_principal_ref) fail('REVIEW_NOT_INDEPENDENT', '会签与任务中的角色、运行时或独立身份不匹配');
  return { task_id: task.task_id, capability_ids: context.capability_ids, review_skills: context.review_skills };
}
