import path from 'node:path';
import { verifyContextReconciliation } from './context-reconciliation.mjs';
import { decisionIO, decisionDigest, assertUserDecisionRequirement } from './user-decision.mjs';
import { assertCurrentApproval, assertApprovalSigner, assertCurrentApprovalEvidenceRef, assertCurrentApprovalReferences } from './approval-current.mjs';
import { selectApprovalRecord, reviewBundleRows } from './approval-record-io.mjs';
import { loadDigitalHumanRoles } from './digital-human-roles.mjs';
import { approvalExpectationForCheckpoint } from './approval-consumption.mjs';
import { validateAssetStructure, canonicalValue } from './structured-assets.mjs';
import { PLAN_REVIEW_PROTOCOL, loadPlanReviewPolicy, assertPlanReviewEntry, assertPlanReviewTask } from './plan-review-control.mjs';
import { validateJsonSchema } from './json-schema.mjs';

const fail = message => { throw new TypeError(`plan-spec-entry-blocked: ${message}`); };
const text = value => typeof value === 'string' && value.trim().length > 0;
const hex = value => typeof value === 'string' ? value.replace(/^sha256:/, '') : value;
const same = (a, b) => JSON.stringify(canonicalValue(a)) === JSON.stringify(canonicalValue(b));
const sameSet = (a, b) => Array.isArray(a) && Array.isArray(b) && new Set(a).size === a.length && new Set(b).size === b.length && same([...a].sort(), [...b].sort());

export function planEntryPolicy(options = {}) {
  const registry = decisionIO(options).document('.template-spec/process/lifecycle-registry.yaml');
  const policy = registry.stages.find(stage => stage.id === 'stage.plan')?.spec_entry;
  if (!policy?.required_checks?.length || !policy?.gate_impacts) fail('缺少 Plan 入口策略');
  const gateIds = registry.gates.filter(gate => gate.stage === 'stage.plan').map(gate => gate.id).sort();
  if (!same(gateIds, Object.keys(policy.gate_impacts).sort())) fail('Plan 门禁触发策略覆盖不完整');
  const checkIds = registry.checks.filter(check => check.stage === 'stage.plan').map(check => check.id).sort();
  if (!same(checkIds, Object.keys(policy.check_impacts || {}).sort())) fail('Plan 内部检查触发策略覆盖不完整');
  return policy;
}

function historicalApprovalLinked(control, ref, io) {
  if (control.provenance?.kind !== 'adopted') return false;
  const expected = hex(decisionDigest(io.bytes(ref)));
  for (const item of control.history_evidence || []) {
    if (item.ref === ref && hex(item.digest) === expected) return true;
    const classification = io.document(item.ref);
    if (classification.kind === 'plan-review-history-classification' && classification.feature_id === control.feature_id && classification.entries?.some(row => row.kind === 'professional' && row.ref === ref && hex(row.digest) === expected)) return true;
  }
  return false;
}

function validatePlanBundle(source, approvalRef, checkId, state, io, roles, options) {
  const control = state.plan_review_control;
  const declared = (roles.gate_policy.review_execution?.review_bundles || []).find(item => item.aggregate_gate === 'gate.plan-approved');
  validateAssetStructure(source, 'approval-record');
  reviewBundleRows(source);
  if (source.schema_version !== 2 || !source.plan_review_binding) {
    if (!historicalApprovalLinked(control, approvalRef, io)) fail('PLAN_REVIEW_BINDING_REQUIRED: 新 Plan 审查须带当前周期绑定');
    return;
  }
  if (!declared || source.bundle_id !== declared.bundle_id || source.work_unit_id !== declared.work_unit) fail('Plan review-bundle 与角色策略不匹配');
  const binding = source.plan_review_binding;
  if (binding.protocol_version !== PLAN_REVIEW_PROTOCOL || binding.cycle_id !== control.cycle_id || binding.scope_digest !== control.scope_digest) fail('PLAN_REVIEW_BINDING_REQUIRED: 组合结论不属于当前 Plan 周期');
  if (!sameSet(source.reviews.map(row => row.gate_id), binding.check_ids)) fail('Plan review-bundle 必须只包含该轮实际检查范围');
  const attempt = [...control.attempts].reverse().find(row => row.check_ids.includes(checkId));
  if (!attempt || attempt.attempt_id !== binding.attempt_id || attempt.status !== 'completed' || attempt.task_ref !== source.review_task_ref || attempt.task_digest !== source.review_task_digest || attempt.check_results?.find(row => row.check_id === checkId)?.status !== 'passed') fail(`PLAN_REVIEW_RESULT_REQUIRED: ${checkId} 缺少登记且通过的当前结论`);
  const task = io.document(source.review_task_ref);
  if (!same(task.review_context?.plan_review_binding, binding)) fail('Plan review-bundle 与当前审查任务绑定不一致');
}

function validatePlanAggregate(state, review, basis, bundles, io, roles, registry, options) {
  const approvalRef = state.plan_approval_ref || state.gates?.['gate.plan-approved']?.approval_ref;
  if (!text(approvalRef)) fail('bounded-plan-review-v1 缺少 plan_approval_ref');
  assertCurrentApprovalEvidenceRef(approvalRef);
  const approval = io.document(approvalRef);
  assertCurrentApprovalReferences(approval);
  if (approval.kind === 'review-bundle' || approval.gate_id !== 'gate.plan-approved') fail('Plan 聚合门禁必须使用独立批准记录');
  assertApprovalSigner(approval, { rolesDoc: roles, registry });
  if (approval.subject_ref !== state.plan_review_ref || hex(approval.subject_digest) !== hex(decisionDigest(io.bytes(state.plan_review_ref)))) fail('Plan 批准未绑定当前审阅包');
  if (!sameSet(approval.approval_scope, [state.feature_id])) fail('Plan 批准范围不匹配');
  const currentDrafter = review.drafter_principal_ref || state.gates?.['gate.plan-approved']?.drafter_principal_ref;
  if (!text(currentDrafter) || approval.drafter_principal_ref !== currentDrafter || approval.principal_ref === currentDrafter) fail('Plan 聚合批准缺少当前独立起草者来源');
  if (!Array.isArray(approval.basis) || !approval.basis.length || new Set(approval.basis.map(asset => asset.ref)).size !== approval.basis.length) fail('Plan 聚合批准缺少当前依据');
  for (const asset of approval.basis) if (hex(decisionDigest(io.bytes(asset.ref))) !== hex(asset.digest)) fail(`Plan 聚合批准依据已变更: ${asset.ref}`);
  for (const asset of basis.values()) if (!approval.basis.some(bound => bound.ref === asset.ref && hex(bound.digest) === hex(asset.digest))) fail(`Plan 聚合批准未覆盖检查依据: ${asset.ref}`);
  if (state.plan_continuation_ref) {
    if (approval.continuation_ref !== state.plan_continuation_ref) fail('Plan 聚合批准未绑定当前批准延续');
  } else if (approval.user_decision_ref !== state.plan_user_decision_ref) fail('Plan 聚合批准未绑定同一真实用户决定');
  const control = state.plan_review_control;
  const last = control.attempts.at(-1);
  if (last) {
    const latest = [...bundles.values()].find(bundle => bundle.plan_review_binding?.attempt_id === last.attempt_id);
    if (!latest || approval.review_bundle_ref !== [...bundles].find(([, bundle]) => bundle === latest)?.[0] || approval.review_session_id !== latest.review_session_id || approval.role_id !== latest.role_id || approval.runtime_id !== latest.runtime_id || approval.principal_ref !== latest.principal_ref) fail('Plan 门禁未复用最终内部检查的同一审查会话');
    if (approval.schema_version === 2 && (approval.review_task_ref !== latest.review_task_ref || approval.review_task_digest !== latest.review_task_digest || !sameSet(approval.capability_ids, latest.capability_ids) || !same(approval.plan_review_binding, latest.plan_review_binding))) fail('Plan 聚合批准未复用最终内部任务与能力绑定');
  } else if (Object.values(review.internal_checks).some(check => check.status === 'approved')) {
    if (control.provenance?.kind !== 'adopted') fail('Plan 历史专业结论缺少受控接入关联');
    if (bundles.size) {
      const reused = bundles.get(approval.review_bundle_ref);
      if (!reused || approval.review_session_id !== reused.review_session_id || approval.role_id !== reused.role_id || approval.runtime_id !== reused.runtime_id || approval.principal_ref !== reused.principal_ref) fail('Plan 聚合批准未复用原内部审查会话与独立身份');
      if (reused.schema_version === 2 && (approval.review_task_ref !== reused.review_task_ref || approval.review_task_digest !== reused.review_task_digest)) fail('Plan 聚合批准未复用原有效专业任务');
    } else {
      const records = Object.entries(review.internal_checks).filter(([,check]) => check.status === 'approved').map(([checkId,check]) => selectApprovalRecord(io.document(check.approval_ref),checkId));
      const reused = records.find(record => record.principal_ref === approval.principal_ref && record.role_id === approval.role_id && record.runtime_id === approval.runtime_id);
      if (!reused || (reused.review_session_id && approval.review_session_id !== reused.review_session_id) || (approval.review_task_ref && (approval.review_task_ref !== reused.review_task_ref || approval.review_task_digest !== reused.review_task_digest))) fail('Plan 聚合批准未复用原有效内部结论的独立身份或任务');
      if (approval.review_bundle_ref != null) fail('旧单项专业结论不得补造 review-bundle');
    }
  } else if (approval.review_bundle_ref != null || approval.review_task_ref != null || approval.plan_review_binding != null) fail('内部检查均不适用时不得制造空 review-bundle 或专业任务');
  return approval;
}

// 自动加载只产生 pending；持久化审阅包、证据新鲜度和真实回复共同决定放行。
export function assertPlanSpecEntry(state, options = {}) {
  if (!text(state?.plan_review_ref) || !text(state?.feature_id)) fail('缺少 plan_review_ref / feature_id');
  assertCurrentApprovalEvidenceRef(state.plan_review_ref);
  const io = decisionIO(options), policy = planEntryPolicy(options);
  const review = io.document(state.plan_review_ref);
  if (review.schema_version !== 1 || review.kind !== 'plan-entry-review' || review.gate_id !== 'gate.plan-approved' || review.feature_id !== state.feature_id) fail('审阅包身份或范围不匹配');
  if (review.review_protocol != null && !['bundled-plan-review-v1', PLAN_REVIEW_PROTOCOL].includes(review.review_protocol)) fail(`不支持的 Plan 审查协议: ${review.review_protocol}`);
  if (!Array.isArray(review.basis) || !review.basis.length) fail('缺少带摘要依据');
  const basis = new Map();
  for (const asset of review.basis) {
    if (!text(asset.ref) || basis.has(asset.ref) || hex(decisionDigest(io.bytes(asset.ref))) !== hex(asset.digest)) fail(`依据缺失、重复或已变更: ${asset.ref}`);
    basis.set(asset.ref, asset);
  }
  const evidence = refs => {
    if (!Array.isArray(refs) || !refs.length || refs.some(ref => !basis.has(ref))) fail('检查项缺少当前依据');
  };
  for (const ref of [review.plan_ref, 'CONTEXT.md', '.template-spec/process/lifecycle-registry.yaml', review.context_reconciliation_ref]) if (!basis.has(ref)) fail(`必需依据未绑定: ${ref}`);
  if (Object.keys(review.checks || {}).length !== policy.required_checks.length) fail('检查项缺失或存在未知项');
  for (const id of policy.required_checks) {
    if (review.checks[id]?.status !== 'passed') fail(`检查未通过: ${id}`);
    evidence(review.checks[id].evidence_refs);
  }
  if (!Array.isArray(review.open_items)) fail('必须显式列出未决项');
  for (const item of review.open_items) {
    if (!text(item.id) || typeof item.critical !== 'boolean' || typeof item.runnable_blocker !== 'boolean') fail('未决项分类不完整');
    if (item.status === 'resolved') { evidence(item.evidence_refs); continue; }
    if (item.status !== 'deferred' || item.critical || item.runnable_blocker) fail(`关键问题或可执行阻塞未解决: ${item.id}`);
    for (const field of ['noncritical_reason', 'owner', 'resolution_point', 'downstream_recipient']) if (!text(item[field])) fail(`延期项缺少 ${field}`);
    evidence(item.evidence_refs);
  }
  loadPlanReviewPolicy(options);
  const control = state.plan_review_control;
  if (control?.protocol_version !== PLAN_REVIEW_PROTOCOL || control.feature_id !== state.feature_id) fail('PLAN_REVIEW_CONTROL_REQUIRED: 新 Plan 执行需受控初始化或接入当前周期');
  validateJsonSchema(control,path.resolve(io.root,'.template-spec/process/schemas/plan-review-control.schema.json'));
  const roles = options.rolesDoc || loadDigitalHumanRoles(path.resolve(io.root, '.template-spec/agents/digital-human-roles.yaml'));
  const registry = io.document('.template-spec/process/lifecycle-registry.yaml');
  const applicableChecks = [], bundles = new Map(), adoptedApprovals = [];
  for (const [checkId, impact] of Object.entries(policy.check_impacts)) {
    if (typeof review.impacts?.[impact] !== 'boolean') fail(`未评估影响面: ${impact}`);
    const check = review.internal_checks?.[checkId];
    evidence(check?.evidence_refs);
    if (review.impacts[impact]) {
      if (check.status !== 'approved' || !basis.has(check.approval_ref) || !basis.has(check.subject_ref)) fail(`命中门禁未批准或未绑定依据: ${checkId}`);
      const source = io.document(check.approval_ref), record = selectApprovalRecord(source, checkId);
      if (record.gate_id !== checkId || record.subject_ref !== check.subject_ref || !check.approval_scope?.includes(state.feature_id) || !sameSet(check.approval_scope, record.approval_scope)) fail(`会签资产或范围不匹配: ${checkId}`);
      if (source.kind === 'review-bundle') {
        validatePlanBundle(source, check.approval_ref, checkId, state, io, roles, options);
        bundles.set(check.approval_ref, source);
      } else if (!historicalApprovalLinked(control, check.approval_ref, io)) fail(`PLAN_REVIEW_BUNDLE_REQUIRED: ${checkId}`);
      const expected = approvalExpectationForCheckpoint(checkId, { ...check, basis: [...basis.values()].filter(asset => check.evidence_refs?.includes(asset.ref)) }, options);
      assertCurrentApproval(record, expected, { ...options, checkpoint:state, rolesDoc: roles, registry });
      applicableChecks.push(checkId);
      adoptedApprovals.push({check_id:checkId,approval_ref:check.approval_ref,subject_ref:check.subject_ref,subject_digest:hex(record.subject_digest),approval_scope:check.approval_scope,basis:expected.basis});
    } else if (check.status !== 'not-applicable' || !text(check.reason)) fail(`未命中门禁须有原因和依据: ${checkId}`);
  }
  for (const check of registry.checks.filter(item => item.stage === 'stage.plan')) if (review.internal_checks[check.id]?.status === 'approved') {
    for (const dependency of check.requires_checks || []) if (review.internal_checks[dependency]?.status !== 'approved') fail(`门禁依赖未批准: ${dependency}`);
  }
  const reconciliation = io.document(review.context_reconciliation_ref);
  if (reconciliation.status !== 'reconciled' || reconciliation.repository_mode !== 'project-instance') fail('Context 未调和');
  try { verifyContextReconciliation(path.resolve(io.root, review.context_reconciliation_ref), { root: io.root }); }
  catch (error) { fail(`Context reconciliation 验证失败: ${error.message}`); }
  const last = control.attempts.at(-1);
  let currentCandidateDigest;
  if (last) {
    const task = io.document(last.task_ref), subject = io.document(task.review_context.candidate_ref);
    if (task.checkpoint_ref !== last.checkpoint_ref || subject.source_checkpoint?.ref !== last.checkpoint_ref) fail('PLAN_REVIEW_CANDIDATE_REQUIRED: 当前任务未绑定登记 checkpoint 来源');
    currentCandidateDigest = subject.source_checkpoint?.digest;
    if (!text(currentCandidateDigest)) fail('PLAN_REVIEW_CANDIDATE_REQUIRED: 当前任务缺少业务候选摘要');
  }
  assertPlanReviewEntry(state, { ...options, checkpoint:state, applicableCheckIds: applicableChecks, naEvidence: [...basis.values()].map(asset => ({ref:asset.ref,digest:hex(asset.digest)})), currentCandidateDigest, adoptedApprovals, verifyHistoricalApproval: row => {
    const check = review.internal_checks[row.check_id];
    const expected = approvalExpectationForCheckpoint(row.check_id, {...check,basis:[...basis.values()].filter(asset=>check.evidence_refs?.includes(asset.ref))},options);
    return assertCurrentApproval(selectApprovalRecord(io.document(row.approval_ref),row.check_id),expected,{...options,checkpoint:state,rolesDoc:roles,registry});
  }});
  assertUserDecisionRequirement({ boundary: 'gate.plan-approved', subject_ref: state.plan_review_ref, scope: [state.feature_id], user_decision_ref: state.plan_user_decision_ref, continuation_ref: state.plan_continuation_ref }, options);
  validatePlanAggregate(state, review, basis, bundles, io, roles, registry, options);
  return { result: 'allowed', blocking_signals: [], missing_requirements: [], evidence_refs: [state.plan_review_ref, state.plan_approval_ref || state.gates?.['gate.plan-approved']?.approval_ref, ...basis.keys()], next_work_unit: null };
}

export function assertPlanAggregateApproval(state, options = {}) {
  if (state?.gates?.['gate.plan-approved']?.status !== 'approved') fail('gate.plan-approved 未批准');
  return assertPlanSpecEntry(state, options);
}
export function validatePlanSpecEntry(state, options = {}) {
  try { return assertPlanSpecEntry(state, options); }
  catch (error) { return { result: 'blocked', blocking_signals: ['plan-spec-entry-blocked'], missing_requirements: [error.message], evidence_refs: [], next_work_unit: null }; }
}
export function assertPlanCheckpoint(checkpoint, options = {}) {
  if (checkpoint.repository_mode !== 'project-instance') return;
  const entering = checkpoint.next_work_unit === 'work-unit.spec-synthesis' || checkpoint.stage === 'stage.spec-architecture' || checkpoint.stage_trace?.completed_work_unit === 'work-unit.spec-synthesis';
  if (entering) return assertPlanSpecEntry(checkpoint, options);
  if (checkpoint.stage !== 'stage.plan' || !['resume','orchestrate'].includes(checkpoint.mode)) return;
  const ids = ['check.domain-strategy-approved','check.stage-decision-package-approved'];
  const priorReview = ids.some(id => checkpoint.checks?.[id]?.approval_ref || ['approved','passed'].includes(checkpoint.checks?.[id]?.status)) || checkpoint.gates?.['gate.plan-approved']?.status === 'approved';
  if (!checkpoint.plan_review_control && !priorReview) return;
  const io = decisionIO(options), policy = loadPlanReviewPolicy(options), control = checkpoint.plan_review_control;
  if (!control || control.protocol_version !== policy.protocol) fail('PLAN_REVIEW_HISTORY_ADOPTION_REQUIRED: 恢复新执行须受控升级并接入历史，不得清零');
  validateJsonSchema(control,path.resolve(io.root,'.template-spec/process/schemas/plan-review-control.schema.json'));
  if (control.feature_id !== checkpoint.feature_id || control.policy_ref !== policy.policy_ref || control.policy_digest !== policy.policy_digest) fail('PLAN_REVIEW_POLICY_DRIFT: 当前周期或策略不匹配');
  const count = control.history_count === null ? null : control.history_count + control.attempts.length;
  if ((count === null || count > policy.limits.total) && !['history-unknown','diagnosis-required','blocked'].includes(control.status)) fail('PLAN_REVIEW_BUDGET_EXHAUSTED: 超限或未知历史只能诊断、补证据');
  for (const attempt of control.attempts.filter(row => row.status !== 'completed')) assertPlanReviewTask(io.document(attempt.task_ref),{...options,checkpoint});
  return {result:'controlled',cycle_id:control.cycle_id,status:control.status,execution_authorization:'not-granted'};
}
