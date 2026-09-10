import path from 'node:path';
import { verifyContextReconciliation } from './context-reconciliation.mjs';
import { decisionIO, decisionDigest, assertUserDecisionRequirement } from './user-decision.mjs';
import { validateApprovalRecord } from './approval-record.mjs';

const fail = message => { throw new TypeError(`plan-spec-entry-blocked: ${message}`); };
const text = value => typeof value === 'string' && value.trim().length > 0;

export function planEntryPolicy(options = {}) {
  const registry = decisionIO(options).document('docs/process/lifecycle-registry.yaml');
  const policy = registry.stages.find(stage => stage.id === 'stage.plan')?.spec_entry;
  if (!policy?.required_checks?.length || !policy?.gate_impacts) fail('缺少 Plan 入口策略');
  const gateIds = registry.gates.filter(gate => gate.stage === 'stage.plan').map(gate => gate.id).sort();
  if (JSON.stringify(gateIds) !== JSON.stringify(Object.keys(policy.gate_impacts).sort())) fail('Plan 门禁触发策略覆盖不完整');
  const checkIds = registry.checks.filter(check => check.stage === 'stage.plan').map(check => check.id).sort();
  if (JSON.stringify(checkIds) !== JSON.stringify(Object.keys(policy.check_impacts || {}).sort())) fail('Plan 内部检查触发策略覆盖不完整');
  return policy;
}

// 自动加载只产生 pending；持久化审阅包、证据新鲜度和真实回复共同决定放行。
export function assertPlanSpecEntry(state, options = {}) {
  if (!text(state?.plan_review_ref) || !text(state?.feature_id)) fail('缺少 plan_review_ref / feature_id');
  const io = decisionIO(options);
  const policy = planEntryPolicy(options);
  const review = io.document(state.plan_review_ref);
  if (review.schema_version !== 1 || review.kind !== 'plan-entry-review' || review.gate_id !== 'gate.plan-approved' || review.feature_id !== state.feature_id) fail('审阅包身份或范围不匹配');
  if (!Array.isArray(review.basis) || !review.basis.length) fail('缺少带摘要依据');
  const basis = new Map();
  for (const asset of review.basis) {
    if (!text(asset.ref) || basis.has(asset.ref) || decisionDigest(io.bytes(asset.ref)) !== asset.digest) fail(`依据缺失、重复或已变更: ${asset.ref}`);
    basis.set(asset.ref, asset);
  }
  const evidence = refs => {
    if (!Array.isArray(refs) || !refs.length || refs.some(ref => !basis.has(ref))) fail('检查项缺少当前依据');
  };
  for (const ref of [review.plan_ref, 'CONTEXT.md', 'docs/process/lifecycle-registry.yaml', review.context_reconciliation_ref]) {
    if (!basis.has(ref)) fail(`必需依据未绑定: ${ref}`);
  }
  if (Object.keys(review.checks || {}).length !== policy.required_checks.length) fail('检查项缺失或存在未知项');
  for (const id of policy.required_checks) {
    const check = review.checks[id];
    if (check?.status !== 'passed') fail(`检查未通过: ${id}`);
    evidence(check.evidence_refs);
  }
  if (!Array.isArray(review.open_items)) fail('必须显式列出未决项');
  for (const item of review.open_items) {
    if (!text(item.id) || typeof item.critical !== 'boolean' || typeof item.runnable_blocker !== 'boolean') fail('未决项分类不完整');
    if (item.status === 'resolved') { evidence(item.evidence_refs); continue; }
    if (item.status !== 'deferred' || item.critical || item.runnable_blocker) fail(`关键问题或可执行阻塞未解决: ${item.id}`);
    for (const field of ['noncritical_reason', 'owner', 'resolution_point', 'downstream_recipient']) if (!text(item[field])) fail(`延期项缺少 ${field}`);
    evidence(item.evidence_refs);
  }
  for (const [gateId, impact] of Object.entries(policy.check_impacts)) {
    if (typeof review.impacts?.[impact] !== 'boolean') fail(`未评估影响面: ${impact}`);
    const gate = review.internal_checks?.[gateId];
    evidence(gate?.evidence_refs);
    if (review.impacts[impact]) {
      if (gate.status !== 'approved' || !basis.has(gate.approval_ref) || !basis.has(gate.subject_ref)) fail(`命中门禁未批准或未绑定依据: ${gateId}`);
      const record = io.document(gate.approval_ref);
      if (record.gate_id !== gateId || record.subject_ref !== gate.subject_ref || !gate.approval_scope?.includes(state.feature_id) || JSON.stringify([...(gate.approval_scope || [])].sort()) !== JSON.stringify([...(record.approval_scope || [])].sort())) fail(`会签资产或范围不匹配: ${gateId}`);
      validateApprovalRecord(record, { ...options, requireApproved: true });
    } else if (gate.status !== 'not-applicable' || !text(gate.reason)) fail(`未命中门禁须有原因和依据: ${gateId}`);
  }
  // 门禁依赖不能通过将上游标成 N/A 来跳过。
  const registry = io.document('docs/process/lifecycle-registry.yaml');
  for (const gate of registry.checks.filter(gate => gate.stage === 'stage.plan')) {
    if (review.internal_checks[gate.id]?.status === 'approved') {
      for (const dependency of gate.requires_checks || []) if (review.internal_checks[dependency]?.status !== 'approved') fail(`门禁依赖未批准: ${dependency}`);
    }
  }
  const reconciliation = io.document(review.context_reconciliation_ref);
  if (reconciliation.status !== 'reconciled' || reconciliation.repository_mode !== 'project-instance') fail('Context 未调和');
  try { verifyContextReconciliation(path.resolve(io.root, review.context_reconciliation_ref), { root: io.root }); }
  catch (error) { fail(`Context reconciliation 验证失败: ${error.message}\n`); }
  assertUserDecisionRequirement({ boundary: 'gate.plan-approved', subject_ref: state.plan_review_ref, scope: [state.feature_id], user_decision_ref: state.plan_user_decision_ref }, options);
  return { result: 'allowed', blocking_signals: [], missing_requirements: [], evidence_refs: [state.plan_review_ref, ...basis.keys()], next_work_unit: null };
}

export function validatePlanSpecEntry(state, options = {}) {
  try { return assertPlanSpecEntry(state, options); }
  catch (error) { return { result: 'blocked', blocking_signals: ['plan-spec-entry-blocked'], missing_requirements: [error.message], evidence_refs: [], next_work_unit: null }; }
}

export function assertPlanCheckpoint(checkpoint, options = {}) {
  if (checkpoint.repository_mode !== 'project-instance') return;
  const entering = checkpoint.next_work_unit === 'work-unit.spec-synthesis' || checkpoint.stage === 'stage.spec-architecture' || checkpoint.stage_trace?.completed_work_unit === 'work-unit.spec-synthesis';
  if (entering) assertPlanSpecEntry(checkpoint, options);
}
