import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { safeFile, orchestrationRef } from './governance-io.mjs';
import { parseAsset, canonicalValue, serializeAsset, byteDigest, validateAssetStructure, TOOL_ROOT } from './structured-assets.mjs';
import { runAssetTransaction } from './asset-transactions.mjs';
import { verifyUserDecisionFile } from './user-decision.mjs';
import { validateJsonSchema } from './json-schema.mjs';

export const PLAN_REVIEW_PROTOCOL = 'bounded-plan-review-v1';
// Routing identities are stable lifecycle IDs. Budgets and policy come exclusively from the contract.
const PLAN_BOUNDARIES = new Set(['check.domain-strategy-approved', 'check.stage-decision-package-approved', 'gate.plan-approved']);
const fail = (code, message) => { const error = new TypeError(`${code}: ${message}`); error.code = code; throw error; };
const ensure = (value, code, message) => { if (!value) fail(code, message); };
const text = value => typeof value === 'string' && value.trim().length > 0;
const strings = value => Array.isArray(value) && value.every(text) && new Set(value).size === value.length;
const equal = (a, b) => JSON.stringify(canonicalValue(a)) === JSON.stringify(canonicalValue(b));
const clone = value => structuredClone(value);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = value => sha(JSON.stringify(canonicalValue(value)));
const digest = (value, label = 'digest') => { const result = String(value ?? '').replace(/^sha256:/, ''); ensure(/^[a-f0-9]{64}$/.test(result), 'PLAN_REVIEW_BINDING_REQUIRED', label); return result; };
const timestamp = options => { const result = options?.now || new Date().toISOString(); ensure(text(result) && Number.isFinite(Date.parse(result)), 'PLAN_REVIEW_BINDING_REQUIRED', '有效时间'); return result; };
const source = (options = {}) => ({ root: options.root || TOOL_ROOT, read: options.read || (file => fs.readFileSync(file)) });
const document = (ref, options = {}) => { const io = source(options); return parseAsset(io.read(safeFile(io.root, ref)), ref); };
const maybeDocument = (ref, options) => { if (!/\.(?:json|ya?ml)$/.test(ref)) return undefined; try { return document(ref, options); } catch { return undefined; } };
const safeReference = (ref, options = {}) => { ensure(text(ref), 'PLAN_REVIEW_BINDING_REQUIRED', '相对证据引用'); safeFile(source(options).root, ref); return ref; };

function evidence(rows, options = {}, { nonempty = true, verify = true } = {}) {
  ensure(Array.isArray(rows) && (!nonempty || rows.length > 0), 'PLAN_REVIEW_EVIDENCE_REQUIRED', '需要绑定实际证据');
  const io = source(options), refs = new Set();
  return rows.map(row => {
    ensure(row && typeof row === 'object', 'PLAN_REVIEW_EVIDENCE_REQUIRED', '证据结构');
    const ref = safeReference(row.ref, options), expected = digest(row.digest, ref);
    ensure(!refs.has(ref), 'PLAN_REVIEW_EVIDENCE_REQUIRED', `重复证据引用: ${ref}`); refs.add(ref);
    if (verify && options.verifyEvidence !== false) {
      let bytes;
      try { bytes = io.read(safeFile(io.root, ref)); } catch { fail('PLAN_REVIEW_EVIDENCE_REQUIRED', `证据不可读: ${ref}`); }
      ensure(sha(bytes) === expected, 'PLAN_REVIEW_EVIDENCE_DRIFT', ref);
    }
    return { ref, digest: expected };
  });
}

function combinedEvidence(primary, secondary, options) {
  const rows = evidence(primary, options), byRef = new Map(rows.map(row => [row.ref, row]));
  for (const row of evidence(secondary, options, { nonempty: false })) {
    const previous = byRef.get(row.ref);
    ensure(!previous || previous.digest === row.digest, 'PLAN_REVIEW_EVIDENCE_REQUIRED', `同一证据引用的摘要冲突: ${row.ref}`);
    if (!previous) { rows.push(row); byRef.set(row.ref, row); }
  }
  return rows;
}

/** Policy is read from the current profile's orchestration contract; there is no fallback budget. */
export function loadPlanReviewPolicy(options = {}) {
  const io = source(options), ref = options.policyRef || orchestrationRef(io.root);
  const raw = options.policy || document(ref, options).planning?.review_control;
  ensure(raw && raw.enabled === true && raw.protocol === PLAN_REVIEW_PROTOCOL, 'PLAN_REVIEW_PROTOCOL_REQUIRED', '消费者需升级到当前 Plan 审查协议');
  ensure(strings(raw.professional_check_ids) && raw.professional_check_ids.length > 0 && raw.professional_check_ids.every(id => PLAN_BOUNDARIES.has(id) && id !== raw.aggregate_gate), 'PLAN_REVIEW_POLICY_INVALID', '专业检查边界');
  ensure(text(raw.aggregate_gate) && PLAN_BOUNDARIES.has(raw.aggregate_gate), 'PLAN_REVIEW_POLICY_INVALID', '聚合门禁');
  ensure(Array.isArray(raw.phase_order) && equal(raw.phase_order, ['initial', 'rereview', 'exception']), 'PLAN_REVIEW_POLICY_INVALID', '审查阶段协议');
  ensure(raw.limits && ['regular', 'exception', 'total'].every(key => Number.isSafeInteger(raw.limits[key]) && raw.limits[key] > 0) && raw.limits.regular + raw.limits.exception === raw.limits.total, 'PLAN_REVIEW_POLICY_INVALID', '预算必须来自有效事实源');
  ensure(strings(raw.finding_kinds) && ['violation', 'missing-evidence', 'suggestion'].every(kind => raw.finding_kinds.includes(kind)) && strings(raw.later_finding_origins), 'PLAN_REVIEW_POLICY_INVALID', '问题分类');
  return { ...clone(raw), policy_ref: ref, policy_digest: hash(raw) };
}

/** Non-Plan consumers need not load a Plan policy, including older Backend/Frontend profiles. */
export function isPlanReview(checkIds, options = {}) {
  if (!Array.isArray(checkIds) || !checkIds.some(id => PLAN_BOUNDARIES.has(id))) return false;
  const policy = loadPlanReviewPolicy(options);
  return checkIds.some(id => policy.professional_check_ids.includes(id) || id === policy.aggregate_gate);
}

function policyFor(control, options) {
  const policy = loadPlanReviewPolicy(options);
  ensure(control?.protocol_version === policy.protocol, 'PLAN_REVIEW_PROTOCOL_REQUIRED', '缺失或不支持的控制协议');
  ensure(control.policy_ref === policy.policy_ref && control.policy_digest === policy.policy_digest, 'PLAN_REVIEW_POLICY_DRIFT', '策略变化需受控升级，不能重置审查次数');
  ensure(text(control.feature_id) && text(control.cycle_id) && strings(control.scope_ids) && control.scope_ids.length > 0 && /^[a-f0-9]{64}$/.test(control.scope_digest || '') && Array.isArray(control.attempts) && Array.isArray(control.findings) && Array.isArray(control.diagnoses) && Array.isArray(control.predecessors), 'PLAN_REVIEW_CONTROL_INVALID', '控制记录缺少范围、审查、问题或历史');
  ensure(control.history_count === null || Number.isSafeInteger(control.history_count) && control.history_count >= 0, 'PLAN_REVIEW_CONTROL_INVALID', '历史次数');
  const ids = new Set(), keys = new Set();
  control.attempts.forEach((attempt, index) => {
    ensure(!ids.has(attempt.attempt_id) && !keys.has(attempt.request_key) && /^[a-f0-9]{64}$/.test(attempt.request_key || '') && ['reserved','dispatched','completed'].includes(attempt.status) && policy.phase_order.includes(attempt.phase), 'PLAN_REVIEW_CONTROL_INVALID', '审查身份、阶段或请求重复');
    ensure(control.history_count !== null && attempt.attempt_id === `${control.cycle_id}.attempt-${control.history_count + index + 1}`, 'PLAN_REVIEW_CONTROL_INVALID', '审查序号不能清零或删除重排');
    ensure(index === control.attempts.length - 1 || attempt.status === 'completed', 'PLAN_REVIEW_CONTROL_INVALID', '之前任务未完成，不得继续派发');
    ensure(strings(attempt.check_ids) && attempt.check_ids.length > 0 && attempt.check_ids.every(id => policy.professional_check_ids.includes(id)), 'PLAN_REVIEW_CONTROL_INVALID', '检查范围');
    if (attempt.status === 'completed') ensure(attempt.task_digest && attempt.dispatched_at && attempt.completed_at && attempt.result_ref && attempt.result_digest && ['passed','blocked'].includes(attempt.outcome) && Array.isArray(attempt.check_results) && attempt.check_results.length === attempt.check_ids.length, 'PLAN_REVIEW_CONTROL_INVALID', '完成尝试缺少实际派发或逐项结果证据');
    if (attempt.status === 'completed') ensure(new Set(attempt.check_results.map(row => row.check_id)).size === attempt.check_ids.length && attempt.check_results.every(row => attempt.check_ids.includes(row.check_id) && ['passed','blocked'].includes(row.status)) && (attempt.outcome !== 'passed' || attempt.check_results.every(row => row.status === 'passed')), 'PLAN_REVIEW_CONTROL_INVALID', '逐项结果不能重复、越界或伪称通过');
    ids.add(attempt.attempt_id); keys.add(attempt.request_key);
  });
  ensure(new Set(control.findings.map(row => row.id)).size === control.findings.length && control.findings.every(row => text(row.id) && policy.finding_kinds.includes(row.kind) && ['open','closed','backlog'].includes(row.status) && (row.kind === 'suggestion' ? row.status === 'backlog' : row.status !== 'backlog')), 'PLAN_REVIEW_CONTROL_INVALID', '问题重复或将建议升级为阻断');
  return policy;
}

export function validatePlanReviewControl(control, options = {}) {
  const schemaRoot = options.schemaRoot || TOOL_ROOT;
  try { validateJsonSchema(control, path.join(schemaRoot, '.template-spec/process/schemas/plan-review-control.schema.json'), { cwd: schemaRoot, label: 'Plan 审查控制' }); }
  catch (error) { fail('PLAN_REVIEW_CONTROL_INVALID', error.message); }
  return { protocol_version: control.protocol_version, structurally_valid: true, execution_authorization: 'not-granted' };
}

function counted(control) { return control.history_count === null ? null : control.history_count + control.attempts.length; }
function openFindings(control) { return control.findings.filter(row => row.kind !== 'suggestion' && row.status === 'open'); }
function currentBinding(control, attempt) {
  return { protocol_version: control.protocol_version, checkpoint_ref: attempt.checkpoint_ref, cycle_id: control.cycle_id, attempt_id: attempt.attempt_id, phase: attempt.phase, scope_digest: control.scope_digest, request_key: attempt.request_key, check_ids: [...attempt.check_ids], target_finding_ids: [...attempt.target_finding_ids] };
}
function attemptFor(control, binding, options) {
  policyFor(control, options);
  const attempt = control.attempts.find(row => row.attempt_id === binding?.attempt_id);
  ensure(attempt && equal(currentBinding(control, attempt), binding), 'PLAN_REVIEW_ATTEMPT_UNREGISTERED', '任务不属于当前登记周期及审查范围');
  return attempt;
}

function freshControl(input, policy, provenance, options) {
  ensure(text(input.feature_id) && strings(input.scope_ids) && input.scope_ids.length > 0, 'PLAN_REVIEW_SCOPE_REQUIRED', '功能与已确认范围');
  return { protocol_version: policy.protocol, feature_id: input.feature_id, cycle_id: `plan-review.${hash({ feature_id: input.feature_id, scope_ids: [...input.scope_ids].sort(), scope_digest: digest(input.scope_digest), provenance }).slice(0, 24)}`, scope_ids: [...input.scope_ids].sort(), scope_digest: digest(input.scope_digest), policy_ref: policy.policy_ref, policy_digest: policy.policy_digest, status: 'active', attempts: [], findings: [], diagnoses: [], history_count: 0, history_evidence: [], history_conclusions: [], predecessors: [], provenance };
}

function containsHistoricalReview(checkpoint, policy) {
  if (checkpoint.plan_review_control) return true;
  const rows = [checkpoint.checks, checkpoint.gates].flatMap(value => Array.isArray(value) ? value.map(row => [row.check_id || row.gate_id || row.id, row]) : Object.entries(value || {}));
  if (rows.some(([id, row]) => PLAN_BOUNDARIES.has(id) && (['approved', 'passed', 'completed'].includes(row.status) || Object.keys(row).some(key => /^(?:approval_ref|review_task_ref|review_bundle_ref|review_result_ref|result_ref|record_ref|approval_record_ref)$/.test(key) && row[key])))) return true;
  // Old checkpoints may store refs in evidence/task collections instead of check rows.
  function visit(value, key = '') {
    if (typeof value === 'string') return /(?:review_task|review_bundle|review_result|approval_record|review_task_ref|bundle_ref|approval_ref)/.test(key) && value.length > 0;
    if (Array.isArray(value)) return value.some(item => visit(item, key));
    return value && typeof value === 'object' && Object.entries(value).some(([next, item]) => visit(item, next));
  }
  return visit(checkpoint);
}

/** Only an explicit new-feature origin may start at zero. Missing history is never inferred as zero. */
export function initializePlanReview(checkpoint, input, options = {}) {
  const policy = loadPlanReviewPolicy(options);
  ensure(!containsHistoricalReview(checkpoint, policy), 'PLAN_REVIEW_HISTORY_ADOPTION_REQUIRED', '已有审查、批准或周期必须受控接入');
  ensure(checkpoint.feature_id === input.feature_id, 'PLAN_REVIEW_SCOPE_MISMATCH', 'checkpoint 功能');
  ensure(input.provenance?.kind === 'new-feature', 'PLAN_REVIEW_INITIALIZATION_REQUIRED', '需要明确新功能来源声明');
  const origin = evidence([{ ref: input.provenance.source_ref, digest: input.provenance.source_digest }], options)[0];
  if (options.verifyEvidence !== false) ensure(equal(document(origin.ref, options), checkpoint), 'PLAN_REVIEW_ORIGIN_MISMATCH', '新功能来源必须是初始化前 checkpoint');
  return freshControl(input, policy, { kind: 'new-feature', source_ref: origin.ref, source_digest: origin.digest }, options);
}

/** Preserve original evidence; classification cannot invent professional rounds from machine checks. */
export function adoptPlanReview(checkpoint, input, options = {}) {
  const policy = loadPlanReviewPolicy(options);
  ensure(!checkpoint.plan_review_control, 'PLAN_REVIEW_CYCLE_EXISTS', '不能重新接入已有周期以清零');
  ensure(checkpoint.feature_id === input.feature_id, 'PLAN_REVIEW_SCOPE_MISMATCH', 'checkpoint 功能');
  const history = evidence(input.history_evidence, options);
  ensure(input.history_count === null || Number.isSafeInteger(input.history_count) && input.history_count >= 0, 'PLAN_REVIEW_HISTORY_REQUIRED', '历史次数未知须保存 null');
  if (input.history_count !== null) {
    ensure(input.classification && Number.isSafeInteger(input.classification.professional) && input.classification.professional === input.history_count && ['clarification', 'machine'].every(key => Number.isSafeInteger(input.classification[key]) && input.classification[key] >= 0), 'PLAN_REVIEW_HISTORY_REQUIRED', '需要专业、澄清与机器检查分类');
    if (options.verifyEvidence !== false) {
      const classifications = history.map(row => maybeDocument(row.ref, options)).filter(row => row?.kind === 'plan-review-history-classification' && row.feature_id === input.feature_id && row.scope_digest?.replace(/^sha256:/, '') === digest(input.scope_digest));
      ensure(classifications.length === 1 && equal(classifications[0].counts, input.classification), 'PLAN_REVIEW_HISTORY_REQUIRED', '历史计数必须绑定接入核对记录');
      const entries = classifications[0].entries;
      ensure(Array.isArray(entries) && entries.every(row => ['professional', 'clarification', 'machine'].includes(row.kind)), 'PLAN_REVIEW_HISTORY_REQUIRED', '历史核对需逐项分类');
      const counts = Object.fromEntries(['professional', 'clarification', 'machine'].map(kind => [kind, entries.filter(row => row.kind === kind).length]));
      ensure(equal(counts, input.classification), 'PLAN_REVIEW_HISTORY_REQUIRED', '分类次数与历史条目不一致');
      evidence(entries.map(row => ({ ref: row.ref, digest: row.digest })), options, { nonempty: input.history_count > 0 });
    }
  }
  const control = freshControl(input, policy, { kind: 'adopted', source_ref: history[0].ref, source_digest: history[0].digest }, options);
  control.history_count = input.history_count; control.history_evidence = history;
  control.history_conclusions = normalizeHistoryConclusions(input.history_conclusions || [], history, options);
  control.status = input.history_count === null ? 'history-unknown' : input.history_count >= policy.limits.regular ? 'diagnosis-required' : 'active';
  return control;
}

function normalizeHistoryConclusions(inputs, history, options) {
  ensure(Array.isArray(inputs), 'PLAN_REVIEW_HISTORY_REQUIRED', '历史结论结构');
  const ids = new Set(), closure = history.concat(history.flatMap(row => maybeDocument(row.ref, options)?.entries || []).map(row => ({ ref: row.ref, digest: row.digest })));
  return inputs.map(row => {
    ensure(PLAN_BOUNDARIES.has(row.check_id) && row.check_id !== 'gate.plan-approved' && !ids.has(row.check_id) && strings(row.approval_scope) && row.approval_scope.length > 0, 'PLAN_REVIEW_HISTORY_REQUIRED', '历史逐项检查、范围必须唯一'); ids.add(row.check_id);
    const approval = evidence([{ ref: row.approval_ref, digest: row.approval_digest }], options)[0], subject = evidence([{ ref: row.subject_ref, digest: row.subject_digest }], options)[0];
    ensure(closure.some(item => item.ref === approval.ref && digest(item.digest) === approval.digest), 'PLAN_REVIEW_HISTORY_REQUIRED', '历史结论必须来源于原始审查证据，不补造新审查');
    return { check_id: row.check_id, approval_ref: approval.ref, approval_digest: approval.digest, subject_ref: subject.ref, subject_digest: subject.digest, approval_scope: [...row.approval_scope], basis: evidence(row.basis, options) };
  });
}

/** Resolve unknown history through a verified classification without replacing the original cycle. */
export function reconcilePlanReviewHistory(input, historyInput, options = {}) {
  const control = clone(input); policyFor(control, options);
  ensure(control.provenance?.kind === 'adopted' && control.attempts.length === 0 && (control.history_count === null || historyInput.history_count === control.history_count), 'PLAN_REVIEW_HISTORY_REQUIRED', '已知次数不可减小；新尝试开始后不得重新分类清零');
  ensure(historyInput.feature_id === control.feature_id && digest(historyInput.scope_digest) === control.scope_digest && equal([...historyInput.scope_ids || []].sort(), control.scope_ids), 'PLAN_REVIEW_SCOPE_MISMATCH', '历史核对不能改变当前范围');
  ensure(historyInput.history_count !== null, 'PLAN_REVIEW_HISTORY_UNKNOWN', '核对必须取得真实分类次数');
  const classified = adoptPlanReview({ feature_id: control.feature_id }, historyInput, options);
  const combined = new Map(control.history_evidence.map(row => [row.ref, row]));
  for (const row of classified.history_evidence) { ensure(!combined.has(row.ref) || equal(combined.get(row.ref), row), 'PLAN_REVIEW_HISTORY_DRIFT', '历史证据不得覆盖'); combined.set(row.ref, row); }
  control.history_count = classified.history_count; control.history_evidence = [...combined.values()];
  const previous = new Map((control.history_conclusions || []).map(row => [row.check_id, row]));
  for (const row of classified.history_conclusions) { ensure(!previous.has(row.check_id) || equal(previous.get(row.check_id), row), 'PLAN_REVIEW_HISTORY_DRIFT', '旧结论不得改写，实质变更回到新决定'); previous.set(row.check_id, row); }
  control.history_conclusions = [...previous.values()]; control.status = classified.status;
  return control;
}

/** A successor requires a preserved prior snapshot, a material delta, and verified real user approval. */
export function successorPlanReview(checkpoint, input, options = {}) {
  const previous = checkpoint.plan_review_control, policy = policyFor(previous, options);
  ensure(input.feature_id === previous.feature_id && input.previous_cycle_id === previous.cycle_id && digest(input.scope_digest) !== previous.scope_digest, 'PLAN_REVIEW_SUCCESSOR_REQUIRED', '后继周期必须属于同功能且范围实质改变');
  const history = evidence(input.history_evidence, options), changes = evidence(input.scope_change_evidence, options);
  if (options.verifyEvidence !== false) {
    ensure(history.some(row => equal(document(row.ref, options), previous)), 'PLAN_REVIEW_SUCCESSOR_REQUIRED', '必须保留前周期完整快照');
    const deltas = changes.map(row => document(row.ref, options)).filter(row => row.previous_cycle_id === previous.cycle_id && row.previous_scope_digest === previous.scope_digest && row.next_scope_digest === digest(input.scope_digest) && row.material_change === true && Array.isArray(row.changes) && row.changes.length > 0 && row.changes.every(text));
    ensure(deltas.length > 0, 'PLAN_REVIEW_SUCCESSOR_REQUIRED', '范围变化记录需绑定前后范围和实际差异');
  }
  const decision = evidence([{ ref: input.user_decision_ref, digest: input.user_decision_digest }], options)[0];
  ensure(text(input.decision_subject_ref), 'PLAN_REVIEW_SUCCESSOR_REQUIRED', '缺少已展示范围变化资产');
  ensure(changes.some(row => row.ref === input.decision_subject_ref), 'PLAN_REVIEW_SUCCESSOR_REQUIRED', '真实决定必须覆盖本次差异');
  // Even tests which omit file evidence must supply an explicit decision verifier; no approved boolean is accepted.
  const verifyDecision = options.verifyDecision || verifyUserDecisionFile;
  const checked = verifyDecision(input.user_decision_ref, { ...options, expected: [{ boundary: policy.aggregate_gate, subject_ref: input.decision_subject_ref, scope: input.scope_ids }] });
  ensure(checked?.validated?.length > 0, 'PLAN_REVIEW_SUCCESSOR_REQUIRED', '未核验真实用户决定');
  const control = freshControl(input, policy, { kind: 'successor', source_ref: changes[0].ref, source_digest: changes[0].digest }, options);
  control.predecessors = [...clone(previous.predecessors), { cycle_id: previous.cycle_id, scope_digest: previous.scope_digest, history_evidence: history, scope_change_evidence: changes, user_decision_ref: decision.ref, user_decision_digest: decision.digest }];
  return control;
}

/** Reserve a professional attempt purely; the caller commits checkpoint and files in one asset transaction. */
export function planReviewRequest(checkpoint, request, options = {}) {
  ensure(checkpoint.plan_review_control, 'PLAN_REVIEW_INITIALIZATION_REQUIRED', '先受控初始化或接入 Plan 周期');
  const control = clone(checkpoint.plan_review_control), policy = policyFor(control, options);
  ensure(checkpoint.feature_id === control.feature_id && request.feature_id === control.feature_id && digest(request.scope_digest) === control.scope_digest && equal([...request.scope_ids || []].sort(), control.scope_ids), 'PLAN_REVIEW_SCOPE_MISMATCH', '改名或换候选不得重置功能范围');
  ensure(strings(request.check_ids) && request.check_ids.length > 0 && request.check_ids.every(id => policy.professional_check_ids.includes(id)), 'PLAN_REVIEW_CHECKS_REQUIRED', '仅允许专业检查；Plan 聚合门禁复用组合结论');
  ensure(policy.phase_order.includes(request.phase), 'PLAN_REVIEW_PHASE_INVALID', '未知审查阶段');
  const basis = evidence(request.basis, options), resolution = evidence(request.resolution_evidence || [], options, { nonempty: false });
  const candidate_ref = safeReference(request.candidate_ref, options), candidate_digest = digest(request.candidate_digest);
  const targets = request.target_finding_ids || [];
  ensure(strings(targets) && targets.every(id => control.findings.some(row => row.id === id && row.kind !== 'suggestion' && (row.status === 'open' || request.phase === 'rereview' && row.status === 'closed'))), 'PLAN_REVIEW_TARGET_INVALID', '定向范围仅包含已登记阻断项；关闭结论只可在常规复审凭新证据重开');
  const request_key = hash({ candidate_digest, basis: [...basis].sort((a, b) => a.ref.localeCompare(b.ref)), check_ids: [...request.check_ids].sort(), target_finding_ids: [...targets].sort() });
  const existing = control.attempts.find(row => row.request_key === request_key);
  if (existing) return { control, binding: currentBinding(control, existing), reusedAttempt: true };
  ensure(control.history_count !== null, 'PLAN_REVIEW_HISTORY_UNKNOWN', '历史次数未知，先核对；不得按零重启');
  ensure(!control.attempts.some(row => row.status !== 'completed'), 'PLAN_REVIEW_ATTEMPT_PENDING', '已有预留或派发任务；中断恢复沿用原尝试');
  const total = counted(control), regular = control.history_count + control.attempts.filter(row => row.phase !== 'exception').length;
  const previous = control.attempts.at(-1);
  ensure(total < policy.limits.total, 'PLAN_REVIEW_BUDGET_EXHAUSTED', '累计预算用尽，保留阻塞并停止自动审查');
  if (request.phase === 'initial') {
    const applicable = policy.professional_check_ids.filter(id => checkpoint.checks?.[id]?.status !== 'not-applicable');
    ensure(total === 0 && applicable.length > 0 && equal([...request.check_ids].sort(), [...applicable].sort()) && targets.length === 0, 'PLAN_REVIEW_INITIAL_INVALID', '首轮必须完整覆盖实际适用专业检查且只能执行一次');
  } else if (request.phase === 'rereview') {
    ensure(regular > 0 && regular < policy.limits.regular && !['diagnosis-required', 'diagnosis-ready', 'blocked'].includes(control.status), 'PLAN_REVIEW_DIAGNOSIS_REQUIRED', '常规额度不足或无进展，转主控诊断');
    ensure(previous?.outcome === 'blocked' || control.history_count > 0, 'PLAN_REVIEW_REREVIEW_INVALID', '已有通过结论不得常规重开');
    ensure(targets.length > 0 && resolution.length > 0, 'PLAN_REVIEW_EVIDENCE_REQUIRED', '复审需明确修复项及新增解决证据');
  } else {
    ensure(control.status === 'diagnosis-ready' && control.diagnoses.length > 0 && regular >= policy.limits.regular && control.attempts.filter(row => row.phase === 'exception').length < policy.limits.exception, 'PLAN_REVIEW_DIAGNOSIS_REQUIRED', '异常核验须先诊断且只限一次');
    const diagnosis = control.diagnoses.at(-1);
    ensure(targets.length > 0 && targets.every(id => diagnosis.finding_ids.includes(id)) && resolution.length > 0 && resolution.every(row => diagnosis.resolution_evidence.some(item => equal(row, item))), 'PLAN_REVIEW_TARGET_INVALID', '异常核验必须绑定诊断解决证据及限定问题');
  }
  if (request.phase !== 'initial') {
    const oldEvidence = control.findings.flatMap(row => row.evidence).concat(previous?.resolution_evidence || []);
    ensure(resolution.some(row => !oldEvidence.some(old => equal(old, row))), 'PLAN_REVIEW_NO_PROGRESS', '同一阻塞没有新增解决证据；停止派发并转诊断');
  }
  const attempt = { attempt_id: `${control.cycle_id}.attempt-${total + 1}`, phase: request.phase, status: 'reserved', request_key, checkpoint_ref: safeReference(request.checkpoint_ref, options), task_ref: safeReference(request.task_ref, options), task_digest: null, candidate_ref, candidate_digest, basis, check_ids: [...request.check_ids], target_finding_ids: [...targets], resolution_evidence: resolution, check_results: [], outcome: null, created_at: timestamp(options), dispatched_at: null, completed_at: null, result_ref: null, result_digest: null };
  control.attempts.push(attempt); control.status = 'active';
  return { control, binding: currentBinding(control, attempt), reusedAttempt: false };
}

export function bindPlanReviewAttempt(input, attemptId, task, options = {}) {
  const control = clone(input); policyFor(control, options);
  const attempt = control.attempts.find(row => row.attempt_id === attemptId);
  ensure(attempt && attempt.status === 'reserved' && attempt.task_ref === task.task_ref, 'PLAN_REVIEW_ATTEMPT_UNREGISTERED', '只能绑定已预留任务');
  const next = digest(task.task_digest);
  ensure(!attempt.task_digest || attempt.task_digest === next, 'PLAN_REVIEW_TASK_DRIFT', '预留任务不得替换');
  attempt.task_digest = next; return control;
}

/** Mark actual dispatch once; a technical restart uses this same registration. */
export function dispatchPlanReview(input, binding, options = {}) {
  const control = clone(input), attempt = attemptFor(control, binding, options);
  ensure(attempt.task_digest, 'PLAN_REVIEW_TASK_UNBOUND', '未绑定最终任务字节，不得派发');
  combinedEvidence([{ ref: attempt.task_ref, digest: attempt.task_digest }, ...attempt.basis], attempt.resolution_evidence, options);
  ensure(attempt.status !== 'completed', 'PLAN_REVIEW_DUPLICATE_DISPATCH', '已消费任务不得再次派发');
  if (attempt.status === 'dispatched') return control;
  attempt.status = 'dispatched'; attempt.dispatched_at = timestamp(options); return control;
}

const fingerprint = finding => hash({ rule_ref: finding.rule_ref, scenario: finding.scenario });

function applyFindings(control, attempt, inputs, options) {
  const policy = loadPlanReviewPolicy(options), seen = new Set(); let changed = false;
  ensure(Array.isArray(inputs), 'PLAN_REVIEW_FINDINGS_REQUIRED', '首轮必须汇总问题，空数组表示未发现问题');
  for (const input of inputs) {
    ensure(text(input.id) && !seen.has(input.id), 'PLAN_REVIEW_FINDING_INVALID', '问题 ID 需稳定唯一'); seen.add(input.id);
    ensure(policy.finding_kinds.includes(input.kind) && (text(input.rule_ref) || text(input.scenario)) && text(input.close_condition), 'PLAN_REVIEW_FINDING_INVALID', '问题需规则或场景、证据、关闭条件');
    ensure(['open', 'closed', 'backlog'].includes(input.status) && (input.kind === 'suggestion' ? input.status === 'backlog' : input.status !== 'backlog'), 'PLAN_REVIEW_SUGGESTION_BLOCKING', '偏好与未来优化只进待办');
    const proof = evidence(input.evidence, options), previous = control.findings.find(row => row.id === input.id);
    if (attempt.phase !== 'initial' && !previous) {
      ensure(policy.later_finding_origins.includes(input.origin) && text(input.reason), 'PLAN_REVIEW_NEW_FINDING_UNJUSTIFIED', '新增问题必须注明修复引入、真实新证据或首轮漏检及依据');
      ensure(attempt.phase !== 'exception' || input.kind === 'suggestion', 'PLAN_REVIEW_EXCEPTION_SCOPE', '异常关闭核验不得扩成新一轮专业审查');
      if (['repair','new-evidence'].includes(input.origin)) ensure(proof.some(row => !control.findings.flatMap(item => item.evidence).concat(control.attempts.filter(item => item.attempt_id !== attempt.attempt_id).flatMap(item => item.basis)).some(old => equal(old, row))), 'PLAN_REVIEW_NEW_FINDING_UNJUSTIFIED', '修复引入或新证据分类必须有新增事实；已有漏检使用 initial-miss');
    }
    if (!previous) {
      ensure(!control.findings.some(row => fingerprint(row) === fingerprint(input)), 'PLAN_REVIEW_FINDING_ALIAS', '同一问题改名不能作为新问题');
      ensure(attempt.phase !== 'initial' || input.origin === 'initial', 'PLAN_REVIEW_FINDING_INVALID', '首轮问题来源');
      control.findings.push({ id: input.id, kind: input.kind, origin: input.origin, rule_ref: input.rule_ref || '', scenario: input.scenario || '', evidence: proof, close_condition: input.close_condition, status: input.status, first_attempt_id: attempt.attempt_id, history: [{ attempt_id: attempt.attempt_id, status: input.status, evidence: proof, reason: input.reason || '首轮适用检查结论' }] }); changed = true; continue;
    }
    ensure(previous.kind === input.kind && previous.rule_ref === (input.rule_ref || '') && previous.scenario === (input.scenario || '') && previous.close_condition === input.close_condition, 'PLAN_REVIEW_FINDING_ID_DRIFT', '稳定问题身份不能替换含义');
    if (previous.status === 'closed' && input.status === 'open') {
      ensure(['behavior-changed', 'closure-evidence-invalid'].includes(input.reopen_reason) && text(input.reason) && proof.some(row => !previous.evidence.some(old => equal(old, row))), 'PLAN_REVIEW_REOPEN_UNJUSTIFIED', '重开需行为变化或关闭证据失效的新增依据');
      if (input.reopen_reason === 'closure-evidence-invalid' && options.verifyEvidence !== false) {
        const io = source(options);
        ensure(previous.evidence.some(row => { try { return sha(io.read(safeFile(io.root, row.ref))) !== row.digest; } catch { return true; } }), 'PLAN_REVIEW_REOPEN_UNJUSTIFIED', '关闭证据仍有效');
      }
    }
    if (attempt.phase !== 'initial' && previous.status !== input.status && previous.kind !== 'suggestion') ensure(attempt.target_finding_ids.includes(previous.id), 'PLAN_REVIEW_EXCEPTION_SCOPE', '定向复审不能修改未受影响问题的结论');
    if (input.status === 'closed' && previous.status === 'open') ensure(text(input.reason) && proof.some(row => !previous.evidence.some(old => equal(old, row))), 'PLAN_REVIEW_CLOSURE_REQUIRED', '关闭需新增解决证据及结论');
    if (input.status !== previous.status || !equal(proof, previous.evidence)) changed = true;
    previous.status = input.status; previous.evidence = proof;
    previous.history.push({ attempt_id: attempt.attempt_id, status: input.status, evidence: proof, reason: input.reopen_reason ? `${input.reopen_reason}: ${input.reason}` : input.reason || '定向核验已有结论' });
  }
  return changed;
}

/** Consume reviewer findings without approving any lifecycle gate or user decision. */
export function completePlanReview(input, binding, result, options = {}) {
  const control = clone(input), attempt = attemptFor(control, binding, options), policy = loadPlanReviewPolicy(options);
  ensure(attempt.status === 'dispatched', 'PLAN_REVIEW_NOT_DISPATCHED', '未实际派发或已消费，不能提交完成');
  ensure(equal(result.plan_review_binding, binding), 'PLAN_REVIEW_RESULT_MISMATCH', '审查结果必须绑定当前任务尝试');
  combinedEvidence([{ ref: attempt.task_ref, digest: attempt.task_digest }, ...attempt.basis], attempt.resolution_evidence, options);
  if (options.verifyEvidence !== false) assertPlanReviewTask(document(attempt.task_ref, options), { ...options, checkpoint: { feature_id: control.feature_id, plan_review_control: control } });
  const proof = evidence([{ ref: result.result_ref, digest: result.result_digest }], options)[0];
  if (options.verifyEvidence !== false) {
    const actual = document(proof.ref, options);
    for (const key of ['plan_review_binding', 'outcome', 'check_results', 'findings']) ensure(equal(actual[key], result[key]), 'PLAN_REVIEW_RESULT_MISMATCH', `结果文件与消费内容不同: ${key}`);
  }
  ensure(['passed', 'blocked'].includes(result.outcome) && Array.isArray(result.check_results) && result.check_results.length === attempt.check_ids.length, 'PLAN_REVIEW_COVERAGE_REQUIRED', '需逐项保留适用检查结论');
  const checks = new Map(result.check_results.map(row => [row.check_id, row.status]));
  ensure(checks.size === result.check_results.length && attempt.check_ids.every(id => ['passed', 'blocked'].includes(checks.get(id))), 'PLAN_REVIEW_COVERAGE_REQUIRED', '检查覆盖或结论缺失');
  // The policy list expresses dependency order: business boundaries precede decision handoff.
  for (let i = 1; i < policy.professional_check_ids.length; i++) {
    const earlier = policy.professional_check_ids.slice(0, i);
    if (checks.get(policy.professional_check_ids[i]) === 'passed') ensure(earlier.every(id => checks.get(id) === 'passed' || options.applicableCheckIds?.includes(id) === false || reusableCheck(control, id, options)), 'PLAN_REVIEW_DEPENDENCY_BLOCKED', '前置业务边界未通过，决策包不得通过');
  }
  const changed = applyFindings(control, attempt, result.findings, options), unresolved = openFindings(control);
  ensure(result.outcome !== 'passed' || unresolved.length === 0 && [...checks.values()].every(status => status === 'passed'), 'PLAN_REVIEW_UNRESOLVED_FINDINGS', '未关闭阻断项或检查未通过');
  ensure(result.outcome !== 'blocked' || unresolved.length > 0, 'PLAN_REVIEW_BLOCK_REASON_REQUIRED', '失败检查必须有可关闭的具体阻断问题');
  attempt.status = 'completed'; attempt.completed_at = timestamp(options); attempt.result_ref = proof.ref; attempt.result_digest = proof.digest; attempt.outcome = result.outcome; attempt.check_results = clone(result.check_results);
  control.status = result.outcome === 'passed' ? 'converged' : attempt.phase === 'exception' || counted(control) >= policy.limits.total ? 'blocked' : attempt.phase === 'rereview' || !changed ? 'diagnosis-required' : 'active';
  return control;
}

export function diagnosePlanReview(input, diagnosis, options = {}) {
  const control = clone(input), policy = policyFor(control, options);
  ensure(control.history_count !== null, 'PLAN_REVIEW_HISTORY_UNKNOWN', '先核对历史次数');
  ensure((['diagnosis-required', 'blocked'].includes(control.status) || control.status === 'active' && control.attempts.at(-1)?.outcome === 'blocked') && !control.attempts.some(row => row.status !== 'completed'), 'PLAN_REVIEW_DIAGNOSIS_INVALID', '仅在主控诊断态或首轮无进展阻塞中登记解决证据');
  const historical = control.provenance?.kind === 'adopted' && control.attempts.length === 0 && control.history_count > 0 && equal(diagnosis.finding_ids, [`history:${control.cycle_id}`]);
  ensure(strings(diagnosis.finding_ids) && diagnosis.finding_ids.length > 0 && (historical || diagnosis.finding_ids.every(id => openFindings(control).some(row => row.id === id))), 'PLAN_REVIEW_TARGET_INVALID', '诊断只能绑定已登记未关闭问题或旧周期当前结论复用核验');
  const proof = evidence([{ ref: diagnosis.ref, digest: diagnosis.digest }], options)[0], resolution = evidence(diagnosis.resolution_evidence, options);
  const old = control.findings.flatMap(row => row.evidence).concat(control.diagnoses.flatMap(row => row.resolution_evidence));
  ensure(resolution.some(row => !old.some(item => equal(row, item))), 'PLAN_REVIEW_NO_PROGRESS', '诊断需新增解决证据');
  if (options.verifyEvidence !== false) {
    const actual = document(proof.ref, options);
    ensure(actual.cycle_id === control.cycle_id && equal([...actual.finding_ids || []].sort(), [...diagnosis.finding_ids].sort()) && equal(actual.resolution_evidence, resolution) && actual.status === 'resolved-with-evidence', 'PLAN_REVIEW_DIAGNOSIS_INVALID', '诊断证据需绑定当前周期、问题和实际解决证据');
  }
  control.diagnoses.push({ ...proof, finding_ids: [...diagnosis.finding_ids], resolution_evidence: resolution, completed_at: diagnosis.completed_at || timestamp(options) });
  const regular = control.history_count + control.attempts.filter(row => row.phase !== 'exception').length;
  control.status = historical || regular < policy.limits.regular ? 'active' : counted(control) < policy.limits.total && control.attempts.filter(row => row.phase === 'exception').length < policy.limits.exception ? 'diagnosis-ready' : 'blocked';
  return control;
}

/** Validate a task against the authoritative checkpoint, not a task's copied declaration. */
export function assertPlanReviewTask(task, options = {}) {
  const ids = task?.review_context?.check_ids || [];
  if (!isPlanReview(ids, options)) return { applicable: false };
  const binding = task.review_context.plan_review_binding;
  ensure(binding, 'PLAN_REVIEW_ATTEMPT_UNREGISTERED', 'Plan 专业任务未预留额度');
  const checkpoint = options.checkpoint || document(binding.checkpoint_ref, options), control = checkpoint.plan_review_control;
  if (options.verifyEvidence !== false) {
    validatePlanReviewControl(control, options);
    const authoritative = document(binding.checkpoint_ref, options);
    ensure(authoritative.feature_id === control.feature_id && equal(authoritative.plan_review_control, control), 'PLAN_REVIEW_CHECKPOINT_DRIFT', '传入控制状态必须与消费者当前 checkpoint 一致');
  }
  const attempt = attemptFor(control, binding, options);
  ensure(attempt.task_digest && ['reserved', 'dispatched', 'completed'].includes(attempt.status), 'PLAN_REVIEW_TASK_UNBOUND', '最终任务字节未绑定');
  ensure(!options.requireCompleted || attempt.status === 'completed', 'PLAN_REVIEW_NOT_COMPLETED', '批准消费只能使用已经完成的专业审查');
  ensure(equal(task.review_context.check_ids, attempt.check_ids) && task.review_context.candidate_ref === attempt.candidate_ref && equal(task.review_context.basis.map(row => ({ ref: row.ref, digest: digest(row.digest) })), attempt.basis), 'PLAN_REVIEW_TASK_DRIFT', '任务候选、依据或检查范围变化');
  const io = source(options);
  if (options.verifyEvidence !== false) {
    ensure(sha(io.read(safeFile(io.root, attempt.task_ref))) === attempt.task_digest && equal(document(attempt.task_ref, options), task), 'PLAN_REVIEW_TASK_DRIFT', '登记任务字节变化');
    const subjectBytes = io.read(safeFile(io.root, attempt.candidate_ref)), subject = parseAsset(subjectBytes, attempt.candidate_ref);
    ensure(sha(subjectBytes) === digest(task.review_context.candidate_digest) && equal(subject.plan_review_binding, binding) && subject.source_checkpoint?.ref === binding.checkpoint_ref && subject.source_checkpoint?.digest === attempt.candidate_digest && hash(subject.current_approvals) === attempt.candidate_digest && equal(subject.current_approvals, task.review_context.current_approvals), 'PLAN_REVIEW_TASK_DRIFT', '审阅主体原字节或逻辑批准输入未绑定已登记尝试');
    const rows = options.boundary ? subject.current_approvals.filter(row => row.boundary === options.boundary) : subject.current_approvals;
    ensure(!options.boundary || rows.length === 1, 'PLAN_REVIEW_COVERAGE_REQUIRED', '任务未覆盖所消费检查');
    // A prior bundle may retain unrelated historical bytes. Reusing one check requires only its own
    // current subject/basis plus global compiler inputs; ordinary dispatch validates the whole task.
    const applicableBasis = options.boundary ? attempt.basis.filter(item => rows.some(row => row.basis.some(proof => proof.ref === item.ref)) || !subject.current_approvals.some(row => row.basis.some(proof => proof.ref === item.ref))) : attempt.basis;
    evidence(applicableBasis, options);
    for (const row of rows) {
      evidence([{ ref: row.subject_ref, digest: row.subject_digest }, ...row.basis], options);
      const current = authoritativeRow(checkpoint, row.boundary);
      if (current) ensure(current.subject_ref === row.subject_ref && (!current.subject_digest || digest(current.subject_digest) === row.subject_digest) && equal(current.approval_scope, row.approval_scope) && current.drafter_principal_ref === row.drafter_principal_ref, 'PLAN_REVIEW_CANDIDATE_DRIFT', '当前检查主体、范围或作者来源已变化');
    }
  }
  return { applicable: true, control, binding, attempt };
}

function authoritativeRow(checkpoint, boundary) { return checkpoint[boundary?.startsWith('check.') ? 'checks' : 'gates']?.[boundary]; }

/** Entry only asserts control convergence. The existing Plan gate still checks Context and real approval. */
export function assertPlanReviewEntry(input, options = {}) {
  const control = input?.plan_review_control || input?.control || input;
  const policy = policyFor(control, options);
  if (options.verifyEvidence !== false) validatePlanReviewControl(control, options);
  const checkpointRef = options.checkpointRef || control.attempts.at(-1)?.checkpoint_ref;
  if (checkpointRef && options.verifyEvidence !== false) {
    const authoritative = document(checkpointRef, options);
    ensure(authoritative.feature_id === control.feature_id && equal(authoritative.plan_review_control, control), 'PLAN_REVIEW_CHECKPOINT_DRIFT', '阶段入口不得从旧状态对象复制审查完成结论');
  }
  if (Array.isArray(options.applicableCheckIds) && options.applicableCheckIds.length === 0) {
    ensure(control.history_count !== null && control.attempts.every(row => row.status === 'completed') && openFindings(control).length === 0 && !['blocked','history-unknown','diagnosis-required'].includes(control.status), 'PLAN_REVIEW_ENTRY_BLOCKED', '无专业影响仍需当前控制、已知历史且无阻断');
    evidence(options.naEvidence, options);
    return { applicable: false, cycle_id: control.cycle_id, professional_review_required: false, execution_authorization: 'not-granted' };
  }
  if (control.provenance?.kind === 'adopted' && control.attempts.length === 0 && control.history_count > 0) {
    const applicable = options.applicableCheckIds || policy.professional_check_ids;
    ensure(control.status === 'active' && openFindings(control).length === 0 && typeof options.verifyHistoricalApproval === 'function' && Array.isArray(control.history_conclusions), 'PLAN_REVIEW_ENTRY_BLOCKED', '旧结论需主控诊断处置及原批准当前独立核验');
    if (control.history_count >= policy.limits.regular) ensure(control.diagnoses.some(row => equal(row.finding_ids, [`history:${control.cycle_id}`])), 'PLAN_REVIEW_ENTRY_BLOCKED', '历史超额须先主控诊断，不能直接按预算通过');
    for (const checkId of applicable) {
      const conclusion = control.history_conclusions.find(row => row.check_id === checkId);
      ensure(conclusion, 'PLAN_REVIEW_ENTRY_BLOCKED', '缺少适用历史逐项原结论');
      evidence([{ ref: conclusion.approval_ref, digest: conclusion.approval_digest }, { ref: conclusion.subject_ref, digest: conclusion.subject_digest }, ...conclusion.basis], options);
      const checked = options.verifyHistoricalApproval(conclusion, options);
      ensure(checked && typeof checked === 'object' && checked.decision !== 'rejected' && checked.result !== 'blocked', 'PLAN_REVIEW_ENTRY_BLOCKED', '历史结论当前核验失败');
    }
    for (const diagnosis of control.diagnoses) evidence([{ ref: diagnosis.ref, digest: diagnosis.digest }, ...diagnosis.resolution_evidence], options);
    return { applicable: true, cycle_id: control.cycle_id, historical_reuse: true, professional_attempts: control.history_count, execution_authorization: 'not-granted' };
  }
  ensure(control.history_count !== null && control.status === 'converged' && openFindings(control).length === 0, 'PLAN_REVIEW_ENTRY_BLOCKED', '当前 Plan 周期未收敛');
  const last = control.attempts.at(-1);
  ensure(last?.status === 'completed' && last.outcome === 'passed', 'PLAN_REVIEW_ENTRY_BLOCKED', '缺少当前专业审查完成证据');
  ensure(counted(control) <= policy.limits.total && control.attempts.filter(row => row.phase !== 'exception').length + control.history_count <= policy.limits.regular && control.attempts.filter(row => row.phase === 'exception').length <= policy.limits.exception, 'PLAN_REVIEW_BUDGET_EXHAUSTED', '历史或当前周期超额，不能形成通过结论');
  evidence([{ ref: last.task_ref, digest: last.task_digest }, { ref: last.result_ref, digest: last.result_digest }, ...last.basis], options);
  if (options.currentCandidateDigest) ensure(last.candidate_digest === digest(options.currentCandidateDigest), 'PLAN_REVIEW_CANDIDATE_DRIFT', '当前候选与最终审查不一致');
  if (options.binding) ensure(attemptFor(control, options.binding, options).attempt_id === last.attempt_id, 'PLAN_REVIEW_ENTRY_BLOCKED', '不能使用旧成功尝试替代当前最终结论');
  if (options.verifyEvidence !== false) {
    const actual = document(last.result_ref, options);
    ensure(equal(actual.plan_review_binding, currentBinding(control, last)) && actual.outcome === 'passed' && equal(actual.check_results, last.check_results), 'PLAN_REVIEW_RESULT_MISMATCH', '当前完成结论必须与原始结果一致');
    assertPlanReviewTask(document(last.task_ref, options), { ...options, checkpoint: input?.plan_review_control ? input : { feature_id: control.feature_id, plan_review_control: control }, requireCompleted: true });
    const applicable = options.applicableCheckIds || policy.professional_check_ids;
    ensure(applicable.every(id => reusableCheck(control, id, { ...options, checkpoint: options.checkpoint || (input?.plan_review_control ? input : undefined) })), 'PLAN_REVIEW_ENTRY_BLOCKED', '缺少适用专业检查当前有效结论');
  }
  return { applicable: true, cycle_id: control.cycle_id, attempt_id: last.attempt_id, execution_authorization: 'not-granted' };
}

/** Reuse only the latest per-check passed conclusion, binding its unchanged subject and its own evidence. */
function reusableCheck(control, checkId, options) {
  const attempt = [...control.attempts].reverse().find(row => row.status === 'completed' && row.check_results?.some(check => check.check_id === checkId));
  if (!attempt || attempt.check_results.find(row => row.check_id === checkId).status !== 'passed') return false;
  if (options.verifyEvidence === false) return true;
  evidence([{ ref: attempt.task_ref, digest: attempt.task_digest }, { ref: attempt.result_ref, digest: attempt.result_digest }], options);
  const result = document(attempt.result_ref, options), task = document(attempt.task_ref, options), subject = document(attempt.candidate_ref, options);
  ensure(equal(result.plan_review_binding, currentBinding(control, attempt)) && equal(result.check_results, attempt.check_results) && equal(task.review_context?.plan_review_binding, currentBinding(control, attempt)) && hash(subject.current_approvals) === attempt.candidate_digest, 'PLAN_REVIEW_RESULT_MISMATCH', '复用检查缺少原任务或结果绑定');
  const rows = subject.current_approvals?.filter(row => row.boundary === checkId);
  ensure(rows?.length === 1, 'PLAN_REVIEW_COVERAGE_REQUIRED', '复用检查缺少逐项审阅主体');
  const row = rows[0]; evidence([{ ref: row.subject_ref, digest: row.subject_digest }, ...row.basis], options);
  if (options.checkpoint?.checks?.[checkId]) {
    const current = options.checkpoint.checks[checkId];
    ensure(current.subject_ref === row.subject_ref && (!current.subject_digest || digest(current.subject_digest) === row.subject_digest) && equal(current.approval_scope, row.approval_scope), 'PLAN_REVIEW_CANDIDATE_DRIFT', '复用项当前主体或范围已变化');
  }
  return true;
}

export function summarizePlanReview(control, options = {}) {
  const policy = loadPlanReviewPolicy(options);
  if (!control) return { applicable: true, status: 'migration-required', next_condition: '受控初始化新功能或核对旧功能历史审查' };
  const count = counted(control), regular = control.history_count === null ? null : control.history_count + control.attempts.filter(row => row.phase !== 'exception').length, exceptions = control.attempts.filter(row => row.phase === 'exception').length;
  const next = { active: '派发已预留任务或修复首轮问题后定向复审', 'diagnosis-required': '主控诊断、补证据或专业冲突处理', 'diagnosis-ready': '仅对已诊断问题执行一次异常关闭核验', blocked: '保持阻塞，停止自动专业审查并处理实际缺陷', converged: '复用专业结论并校验当前 Plan 与真实用户批准', 'history-unknown': '核对专业、澄清和机器检查历史，不按零轮重启' };
  const historical = control.provenance?.kind === 'adopted' && control.attempts.length === 0 && control.history_count > 0 && control.status === 'active';
  return { applicable: true, protocol_version: control.protocol_version, cycle_id: control.cycle_id, status: control.status, professional_attempts: count, completed_attempts: control.history_count === null ? null : control.history_count + control.attempts.filter(row => row.status === 'completed').length, remaining_regular: regular === null ? null : Math.max(0, policy.limits.regular - regular), remaining_exception: Math.max(0, Math.min(policy.limits.exception - exceptions, count === null ? 0 : policy.limits.total - count)), unresolved_findings: openFindings(control).map(row => row.id), disposition: historical ? 'historical-reuse-awaiting-validation' : control.status, next_condition: historical ? '核验当前有效旧专业结论、完整入口与真实批准；不新派审查' : next[control.status] || '核验控制记录', execution_authorization: 'not-granted' };
}

/** Strict JSON checkpoint mutation, preserving every field outside this protocol and all historical approval bytes. */
export function writePlanReviewCheckpoint(checkpointRef, mutate, options = {}) {
  const root = fs.realpathSync(options.root || TOOL_ROOT);
  ensure(typeof checkpointRef === 'string' && checkpointRef.endsWith('.json') && /^(?:docs\/|\.yss\/)/.test(checkpointRef) && !checkpointRef.startsWith('.yss/asset-transactions/'), 'PLAN_REVIEW_WRITE_SCOPE', '仅更新项目内 JSON checkpoint');
  const file = safeFile(root, checkpointRef), beforeBytes = fs.readFileSync(file), checkpoint = parseAsset(beforeBytes, checkpointRef);
  validateAssetStructure(checkpoint, 'checkpoint', { schemaRoot: root });
  const control = mutate(clone(checkpoint)), next = { ...checkpoint, plan_review_control: control };
  validateAssetStructure(next, 'checkpoint', { schemaRoot: root });
  const bytes = serializeAsset(next), mode = fs.statSync(file).mode & 0o777;
  if (options.dryRun) return { checkpoint: next, summary: summarizePlanReview(control, options), dry_run: true, written: false };
  if (equal(next, checkpoint)) return { summary: summarizePlanReview(control, options), written: false, reused: true, execution_authorization: 'not-granted' };
  runAssetTransaction(root, [{ ref: checkpointRef, kind: 'checkpoint', before: { digest: byteDigest(beforeBytes), mode }, after_digest: byteDigest(bytes) }], () => {
    const temporary = `${file}.plan-review-${process.pid}.tmp`, fd = fs.openSync(temporary, 'wx', mode);
    try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    try { fs.renameSync(temporary, file); const directory = fs.openSync(path.dirname(file), 'r'); try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); } } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  });
  return { summary: summarizePlanReview(control, options), written: true, execution_authorization: 'not-granted' };
}
