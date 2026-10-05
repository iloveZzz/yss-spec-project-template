import {createHash} from 'node:crypto';
import path from 'node:path';
import {withValidationPhase, existsSync, readFileSync} from './validation-phase.mjs';
import {loadRegistry, ROOT} from './lifecycle-registry.mjs';
import {loadDigitalHumanRoles, countersignRuleForGate, BIOLOGICAL_ROLE_ID} from './digital-human-roles.mjs';
import {parseAsset, validateAssetStructure} from './structured-assets.mjs';
import {approvalIO, approvalError} from './approval-record-io.mjs';
import {assertApprovalUserDecision} from './user-decision-reuse.mjs';
import {assertReviewCapabilityBinding, approvalExpectedFromTask} from './review-capabilities.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const hex = value => typeof value === 'string' ? value.replace(/^sha256:/, '') : value;
const text = value => typeof value === 'string' && value.trim();
const sameScope = (a,b) => Array.isArray(a) && a.length > 0 && Array.isArray(b) && b.length > 0 && new Set(a).size === a.length && new Set(b).size === b.length && JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const fail = detail => approvalError('APPROVAL_CURRENT_INVALID', detail);
function checkedBasis(basis, io, label) {
  if (!Array.isArray(basis) || !basis.length) fail(`${label} 缺少当前证据摘要`);
  const refs = new Set();
  return basis.map(asset => {
    if (!text(asset?.ref) || refs.has(asset.ref) || !/^[a-f0-9]{64}$/.test(hex(asset.digest))) fail(`${label} 证据引用缺失、重复或摘要非法`);
    refs.add(asset.ref);
    if (hash(io.bytes(asset.ref)) !== hex(asset.digest)) fail(`${label} 证据过期: ${asset.ref}`);
    return {ref:asset.ref,digest:hex(asset.digest)};
  });
}
export function assertApprovalSigner(record, {rolesDoc = loadDigitalHumanRoles(), registry = loadRegistry()} = {}) {
  validateAssetStructure(record, 'approval-record');
  if (registry.id_policy?.deprecated_ids?.includes(record.gate_id)) fail(`未知或已退役门禁: ${record.gate_id}`);
  if (!rolesDoc.runtimes?.some(runtime => runtime.id === record.runtime_id)) fail(`未知 runtime_id: ${record.runtime_id}`);
  if (record.actor_kind === 'orchestrator') fail('编排器门禁不使用会签记录关闭');
  let rule = countersignRuleForGate(rolesDoc.gate_policy, record.gate_id);
  const continuationReviewers = rolesDoc.gate_policy.continuation_reviews?.[record.gate_id];
  if (record.continuation_ref && record.actor_kind === 'digital-human' && continuationReviewers) rule = {bucket:'digital_human_review',gate:record.gate_id,countersigners:continuationReviewers};
  if (!rule) fail(`${record.gate_id} 不是会签门禁；evidence_only / orchestrator 门禁不写 approval-record`);
  if (record.decision !== 'approved') fail(`${record.gate_id} 会签 decision 必须为 approved 才能关闭门禁`);
  if (record.biological_veto === true) fail(`${record.gate_id} 已被生物人否决，不能标为 approved`);
  if (rule.bucket === 'biological_human') {
    if (record.actor_kind !== 'biological-human' || record.role_id !== BIOLOGICAL_ROLE_ID) fail(`${record.gate_id} 必须由生物人会签`);
  } else {
    if (record.actor_kind !== 'digital-human') fail(`${record.gate_id} 必须由数字人会签`);
    // v2 professional review is constrained by the issued capability task below.
    if (!(record.schema_version === 2 && rule.capability_ids?.length) && !rule.countersigners?.includes(record.role_id)) fail(`${record.gate_id} 会签角色必须是 ${(rule.countersigners || []).join(' / ')}`);
    if (record.schema_version === 1 && rule.drafter && record.role_id === rule.drafter) fail(`${record.gate_id} 起草者不得会签自己`);
    if (record.schema_version === 1 && rule.drafter && record.countersigner_role_ids?.includes(rule.drafter)) fail(`${record.gate_id} 起草者不得出现在 countersigner_role_ids`);
    if (rule.drafter && record.drafter_role_id && record.drafter_role_id !== rule.drafter) fail(`${record.gate_id} drafter_role_id 必须为 ${rule.drafter}`);
  }
  return rule;
}
export function approvalExpectationFromState(boundary, state, context = {}) {
  if (!state || !text(state.subject_ref) || !sameScope(state.approval_scope, state.approval_scope)) approvalError('APPROVAL_CONTEXT_REQUIRED','当前消费边界缺少主体或批准范围');
  const io = approvalIO(context), bytes = io.bytes(state.subject_ref);
  let subject;
  try {subject = parseAsset(bytes,io.resolve(state.subject_ref));} catch {subject = null;}
  return {boundary,subject_ref:state.subject_ref,subject_digest:state.subject_digest || state.basis?.find(asset=>asset.ref===state.subject_ref)?.digest || hash(bytes),approval_scope:[...state.approval_scope],basis:state.basis?.filter(asset => ![state.approval_ref,state.subject_ref].includes(asset.ref)),drafter_principal_ref:state.drafter_principal_ref || subject?.drafter_principal_ref,review_package:context.review_package ?? state.review_package ?? boundary.startsWith('gate.'),review_context:state.review_context};
}
export function approvalExpectationFromSubject(boundary, subjectRef, context = {}) {
  const io=approvalIO(context),bytes=io.bytes(subjectRef),subject=parseAsset(bytes,io.resolve(subjectRef)),scope=subject.approval_scope || subject.scope;
  if (!sameScope(scope,scope) || !subject.basis?.length) approvalError('APPROVAL_CONTEXT_REQUIRED','当前主体缺少独立范围及依据；请提供 checkpoint/task 消费上下文');
  return {boundary,subject_ref:subjectRef,subject_digest:hash(bytes),approval_scope:[...scope],basis:subject.basis,drafter_principal_ref:subject.drafter_principal_ref,review_package:context.review_package ?? boundary.startsWith('gate.')};
}
/** Validates only a supplied current binding; never derives expected values from the approval record. */
function validateCurrentApproval(record, expected, context = {}) {
  const authorityRoot=context.root || ROOT,rolesPath=path.resolve(authorityRoot,'.template-spec/agents/digital-human-roles.yaml'),registryPath=path.resolve(authorityRoot,'.template-spec/process/lifecycle-registry.yaml');
  const roles = context.rolesDoc || loadDigitalHumanRoles(existsSync(rolesPath)?rolesPath:undefined), registry = context.registry || loadRegistry(existsSync(registryPath)?registryPath:undefined);
  const rule = assertApprovalSigner(record, {rolesDoc:roles,registry});
  if (!expected || !text(expected.boundary) || !text(expected.subject_ref) || !sameScope(expected.approval_scope,expected.approval_scope) || !expected.basis?.length) approvalError('APPROVAL_CONTEXT_REQUIRED','当前批准须有来自 checkpoint/task/当前主体的边界、范围及依据');
  const io = approvalIO(context);
  if (record.schema_version === 2) {
    const task = io.document(record.review_task_ref);
    const issued = approvalExpectedFromTask(task,{...context,expected:expected.review_context,read:context.read || readFileSync,rolesDoc:roles,registry,boundary:expected.boundary,reviewTaskRef:record.review_task_ref,reviewTaskDigest:record.review_task_digest});
    if ((record.review_task_id && record.review_task_id !== task.task_id) || (record.review_work_unit_id && record.review_work_unit_id !== task.work_unit_id)) fail('组合包身份与正式审查任务不匹配');
    if (record.review_bundle_basis) {
      const bundleBasis = record.plan_review_binding ? record.review_bundle_basis.filter(asset => issued.basis.some(row => row.ref === asset.ref)) : record.review_bundle_basis;
      const basis = checkedBasis(bundleBasis,io,'组合包');
      if ((!record.plan_review_binding && basis.length !== task.review_context.basis.length) || record.review_bundle_basis.length !== task.review_context.basis.length || record.review_bundle_basis.some(asset=>!task.review_context.basis.some(bound=>bound.ref===asset.ref && hex(bound.digest)===hex(asset.digest)))) fail('组合包依据与正式审查任务不匹配');
    }
    if (issued.subject_ref !== expected.subject_ref || !sameScope(issued.approval_scope,expected.approval_scope)) fail('当前消费上下文与正式审查任务范围不匹配');
    for (const asset of expected.basis) if (!issued.basis.some(row => row.ref === asset.ref && hex(row.digest) === hex(asset.digest))) fail('当前消费上下文依据不属于正式审查任务');
    if (expected.drafter_principal_ref && expected.drafter_principal_ref !== issued.drafter_principal_ref) fail('正式审查任务作者与消费上下文不匹配');
    expected = {...expected,drafter_principal_ref:issued.drafter_principal_ref,review_context:expected.review_context || issued.review_context};
  }
  if (!text(expected.drafter_principal_ref)) approvalError('APPROVAL_CONTEXT_REQUIRED','当前消费上下文缺少独立起草者来源');
  if (record.gate_id !== expected.boundary || record.subject_ref !== expected.subject_ref) fail('审查对象不匹配');
  if (!sameScope(record.approval_scope,expected.approval_scope)) fail('审查范围不匹配');
  if (!text(record.drafter_principal_ref) || record.drafter_principal_ref === record.principal_ref) fail('缺少独立审查身份或起草者自签');
  if (expected.drafter_principal_ref && expected.drafter_principal_ref !== record.drafter_principal_ref) fail('起草者身份与当前消费上下文不匹配');
  if (expected.implementer_principal_ref && record.principal_ref === expected.implementer_principal_ref) fail('实施者不得审查自己');
  const bytes = io.bytes(expected.subject_ref);
  if (!/^[a-f0-9]{64}$/.test(hex(record.subject_digest)) || hash(bytes) !== hex(record.subject_digest)) fail('审查资产摘要不匹配；批准依据过期');
  if (expected.subject_digest && hash(bytes) !== hex(expected.subject_digest)) fail('当前主体摘要与消费边界冻结摘要不匹配');
  let subject;
  try {subject = io.document(expected.subject_ref);} catch {subject = null;}
  if (expected.subject_id && ![subject?.id,subject?.contract_id].includes(expected.subject_id)) fail('主体 ID 不匹配');
  if (expected.subject_version && ![subject?.version,subject?.contract_version].includes(expected.subject_version)) fail('主体版本不匹配');
  if ((expected.review_package ?? expected.boundary.startsWith('gate.')) && (subject?.gate_id !== expected.boundary || !subject?.basis?.length)) fail('审阅包身份或依据缺失');
  const required = checkedBasis(expected.basis,io,'当前消费上下文');
  const bound = checkedBasis(record.basis || subject?.basis,io,'批准记录');
  for (const asset of required) if (!bound.some(row => row.ref === asset.ref && row.digest === asset.digest)) fail(`批准范围未覆盖证据: ${asset.ref}`);
  if (record.schema_version === 2) {
    if (!expected.review_context) approvalError('APPROVAL_CONTEXT_REQUIRED','v2 批准缺少独立当前审查任务上下文');
    assertReviewCapabilityBinding(record,{...context,read:context.read || readFileSync,rolesDoc:roles,registry,expected:expected.review_context});
  }
  if (roles.user_decision_policy.gates.includes(record.gate_id)) {
    const result = assertApprovalUserDecision(record, roles, {...context,root:io.root});
    if (record.actor_kind === 'biological-human' && result.validated.some(row => row.principal_ref !== record.principal_ref)) fail('user-decision-responder-mismatch: 生物人会签者与原始回复者不一致');
  }
  return {...rule, subject_ref:expected.subject_ref, approval_scope:[...expected.approval_scope], execution_authorization:'not-evaluated'};
}

export function assertCurrentApproval(record,expected,context={}) {
  return withValidationPhase({root:context.root || ROOT,purpose:"approval-current-kernel",readOnly:true},()=>validateCurrentApproval(record,expected,context));
}
