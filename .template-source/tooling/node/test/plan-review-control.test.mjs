import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { parseDocument } from '../../../../scripts/vendor/yaml.mjs';
import { ROOT } from '../../../../scripts/lib/lifecycle-registry.mjs';
import { validateReviewTaskBinding } from '../../../../scripts/lib/review-capabilities.mjs';
import { prepareReviewPackage } from '../../../../scripts/lib/review-package.mjs';
import { buildPlanReviewFixture, PLAN_BOUNDARIES } from '../../../../scripts/fixtures/plan-review-control/build-fixture.mjs';
import { buildLegacyPlanSourceFixture } from '../../../../scripts/fixtures/plan-review-control/legacy-source-fixture.mjs';
import { localizeSyntheticPlanSource, syntheticPlanSourceContext } from '../../../../scripts/fixtures/plan-review-control/source-consumption-fixture.mjs';
import { buildPlanFixture } from '../../../../scripts/fixtures/user-decision/plan-fixture.mjs';
import { assertPlanSpecEntry, assertPlanAggregateApproval } from '../../../../scripts/lib/plan-spec-entry.mjs';
import { validateApprovalRecord, validateApprovalRecordFile, assertApprovedGateHasValidApproval, assertCheckpointApprovals } from '../../../../scripts/lib/approval-record.mjs';
import { assertGateChecks } from '../../../../scripts/lib/lifecycle-controls.mjs';
import { sourceApproval } from '../../../../scripts/lib/strategic-handoff.mjs';
import { withSourceContextSnapshot } from '../../../../scripts/lib/strategic-handoff-io.mjs';
import { lifecycleStatus } from '../../../../scripts/lib/lifecycle-status.mjs';
import { decisionDigest } from '../../../../scripts/lib/user-decision.mjs';
import {
  initializePlanReview, planReviewRequest, bindPlanReviewAttempt, dispatchPlanReview, completePlanReview, diagnosePlanReview, adoptPlanReview, reconcilePlanReviewHistory, summarizePlanReview, assertPlanReviewEntry
} from '../../../../scripts/lib/plan-review-control.mjs';

// Unit fixtures do not authorize a user decision or a real project gate.
const policy = {
  protocol: 'bounded-plan-review-v1', enabled: true, professional_check_ids: PLAN_BOUNDARIES,
  aggregate_gate: 'gate.plan-approved', limits: { regular: 2, exception: 1, total: 3 },
  phase_order: ['initial', 'rereview', 'exception'], finding_kinds: ['violation', 'missing-evidence', 'suggestion'],
  later_finding_origins: ['repair', 'new-evidence', 'initial-miss']
};
const digest = 'a'.repeat(64);
const noIO = { policy, verifyEvidence: false };
const asset = (ref = 'input/evidence.md', value = digest) => ({ ref, digest: value });
const request = (overrides = {}) => ({
  checkpoint_ref: 'docs/.scratch/feature.demo/checkpoint.json', feature_id: 'feature.demo', scope_ids: ['feature.demo'], scope_digest: digest,
  phase: 'initial', check_ids: [...PLAN_BOUNDARIES], candidate_ref: 'reviews/initial/subject.json', candidate_digest: digest,
  basis: [asset()], task_ref: 'reviews/initial/task.json', ...overrides
});
const finding = (overrides = {}) => ({
  id: 'plan.rule-001', kind: 'violation', origin: 'initial', rule_ref: 'rules/confirmed.md', scenario: '失败提交可修正后重试',
  evidence: [asset()], close_condition: '规则和验收场景明确允许失败提交后修正', status: 'open', ...overrides
});
const result = (overrides = {}) => ({
  result_ref: 'reviews/initial/result.json', result_digest: digest, outcome: 'passed',
  check_results: PLAN_BOUNDARIES.map(check_id => ({ check_id, status: 'passed' })), findings: [], ...overrides
});
function freshCheckpoint() {
  const checkpoint = { feature_id: 'feature.demo', checks: {}, gates: {} };
  checkpoint.plan_review_control = initializePlanReview(checkpoint, { feature_id: 'feature.demo', scope_ids: ['feature.demo'], scope_digest: digest, provenance: { kind: 'new-feature', source_ref: 'input/scope.md', source_digest: digest } }, noIO);
  return checkpoint;
}
function start(checkpoint = freshCheckpoint(), overrides = {}) {
  const prepared = planReviewRequest({ feature_id: 'feature.demo', ...checkpoint }, request(overrides), noIO);
  const bound = bindPlanReviewAttempt(prepared.control, prepared.binding.attempt_id, { task_ref: request(overrides).task_ref, task_digest: digest }, noIO);
  const control = dispatchPlanReview(bound, prepared.binding, noIO);
  return { ...prepared, control };
}
function finish(attempt, outcome = 'blocked', findings = [finding()]) {
  return completePlanReview(attempt.control, attempt.binding, result({ plan_review_binding: attempt.binding, outcome, findings, check_results: PLAN_BOUNDARIES.map(check_id => ({ check_id, status: outcome === 'passed' ? 'passed' : 'blocked' })) }), noIO);
}
function fixture(t, options) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-plan-review-control-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return buildPlanReviewFixture(root, options);
}
function prepareArgs(f, overrides = {}) {
  const options = { ...f.options, ...overrides };
  return [path.join(ROOT, 'scripts/prepare-review-package'), '--root', f.root, '--checkpoint', options.checkpointRef,
    ...options.checkIds.flatMap(id => ['--check', id]), '--role', options.roleId, '--runtime', options.runtimeId,
    '--actor', options.actorId, '--reviewer-principal', options.reviewerPrincipalRef, '--drafter-principal', options.drafterPrincipalRef,
    '--implementation-actor', options.implementationActorId, '--task-id', options.taskId, '--review-session', options.reviewSessionId,
    '--work-unit', options.workUnitId, '--output-dir', options.outputDir, '--review-phase', options.reviewPhase];
}
function run(args, cwd) { return spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 30000 }); }
function runAsync(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = ''; child.stdout.on('data', chunk => stdout += chunk); child.stderr.on('data', chunk => stderr += chunk);
    child.on('error', reject); child.on('close', status => resolve({ status, stdout, stderr }));
  });
}

async function legacySourceFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-legacy-plan-source-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return buildLegacyPlanSourceFixture(root);
}

async function assertReadonlySourceContextConsumption(root, consume) {
  const context = path.join(root, 'CONTEXT.md'), snapshot = path.join(root, 'source-context.snapshot.md');
  const bytes = fs.readFileSync(context);
  fs.renameSync(context, snapshot);
  try {
    assert.equal(fs.existsSync(context), false, 'v5 readonly source layout has no root CONTEXT.md');
    await assert.doesNotReject(withSourceContextSnapshot(root, consume), 'valid Plan source remains consumable through the fixed readonly Context snapshot alias');
    assert.deepEqual(fs.readFileSync(snapshot), bytes);
  } finally { fs.renameSync(snapshot, context); }
}

test('legacy Plan source current approval remains readable with independently bound context', async t => {
  const f = await legacySourceFixture(t);
  assert.ok(f.rolesDoc.gate_policy.review_execution.review_bundles.some(row => row.aggregate_gate === 'gate.plan-approved'));
  assert.ok(f.rolesDoc.gate_policy.review_execution.review_bundles.every(row => row.aggregate_additional_review_task !== 'forbidden'));
  assert.equal(f.checkpoint.plan_review_control, undefined);
  const options = { root: f.root, rolesDoc: f.rolesDoc, registry: f.registry, expected: f.expected };
  const approvalBytes = f.read(f.approvalRef), replyBytes = f.read(f.record.user_decision_ref);
  assert.doesNotThrow(() => validateApprovalRecord(f.record, options));
  assert.doesNotThrow(() => validateApprovalRecordFile(path.join(f.root, f.approvalRef), options));
  assert.doesNotThrow(() => assertApprovedGateHasValidApproval('gate.plan-approved', f.gate, { ...options, checkpoint: f.checkpoint }));
  assert.equal(assertGateChecks('gate.plan-approved', f.checkpoint, options).result, 'passed');
  await assert.doesNotReject(sourceApproval(f.record, f.rolesDoc, f.root, f.binding));
  assert.deepEqual(f.read(f.approvalRef), approvalBytes);
  assert.deepEqual(f.read(f.record.user_decision_ref), replyBytes);
  assert.throws(() => validateApprovalRecord({ ...f.record, subject_digest: '0'.repeat(64) }, options), /APPROVAL_CURRENT_INVALID/);
  fs.writeFileSync(path.join(f.root, 'evidence/offline.log'), 'Synthetic changed source evidence; original approval is stale.\n');
  assert.throws(() => assertGateChecks('gate.plan-approved', f.checkpoint, options), /证据过期/);
  await assert.rejects(sourceApproval(f.record, f.rolesDoc, f.root, f.binding), /APPROVAL_CURRENT_INVALID/);
});

test('legacy Plan consumers default to the supplied source root policy without rewriting approval bytes', async t => {
  const f = await legacySourceFixture(t);
  const options = { root: f.root, registry: f.registry, expected: f.expected };
  const approvalBytes = f.read(f.approvalRef), replyBytes = f.read(f.record.user_decision_ref);
  assert.doesNotThrow(() => validateApprovalRecord(f.record, options));
  assert.doesNotThrow(() => validateApprovalRecordFile(path.join(f.root, f.approvalRef), options));
  assert.doesNotThrow(() => assertApprovedGateHasValidApproval('gate.plan-approved', f.gate, { ...options, checkpoint: f.checkpoint }));
  assert.doesNotThrow(() => assertCheckpointApprovals(f.checkpoint, path.join(f.root, 'checkpoint.json'), options));
  assert.deepEqual(f.read(f.approvalRef), approvalBytes);
  assert.deepEqual(f.read(f.record.user_decision_ref), replyBytes);
  assert.throws(() => validateApprovalRecord({ ...f.record, subject_digest: '0'.repeat(64) }, options), /APPROVAL_CURRENT_INVALID/);
  assert.throws(() => validateApprovalRecord(f.record, { root: f.root, registry: f.registry }), /APPROVAL_CONTEXT_REQUIRED/);
  assert.throws(() => validateApprovalRecordFile(path.join(f.root, f.approvalRef), { root: f.root, registry: f.registry }), /APPROVAL_CONTEXT_REQUIRED/);
});

test('legacy Plan source still rejects missing independent consumer expectations', async t => {
  const f = await legacySourceFixture(t);
  const options = { root: f.root, rolesDoc: f.rolesDoc, registry: f.registry };
  assert.throws(() => validateApprovalRecord(f.record, options), /APPROVAL_CONTEXT_REQUIRED/);
  assert.throws(() => validateApprovalRecordFile(path.join(f.root, f.approvalRef), options), /APPROVAL_CONTEXT_REQUIRED/);
  await assert.rejects(sourceApproval(f.record, f.rolesDoc, f.root), /APPROVAL_CONTEXT_REQUIRED/);
  const expected = { ...f.expected }; delete expected.drafter_principal_ref;
  assert.throws(() => validateApprovalRecord(f.record, { ...options, expected }), /APPROVAL_CONTEXT_REQUIRED.*独立起草者/);
  const gate = { ...f.gate }; delete gate.subject_ref;
  assert.throws(() => assertApprovedGateHasValidApproval('gate.plan-approved', gate, options), /APPROVAL_CONTEXT_REQUIRED/);
});

test('bounded Plan source policy rejects current aggregate approval without review control', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-bounded-plan-source-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const f = buildPlanFixture(root), rolesDoc = parseDocument(fs.readFileSync(path.join(root, '.template-spec/agents/digital-human-roles.yaml'), 'utf8')).toJS();
  assert.ok(rolesDoc.gate_policy.review_execution.review_bundles.some(row => row.aggregate_gate === 'gate.plan-approved' && row.aggregate_additional_review_task === 'forbidden'));
  const record = parseDocument(fs.readFileSync(f.state.plan_approval_ref, 'utf8')).toJS();
  const asset = ref => ({ ref, digest: decisionDigest(fs.readFileSync(path.resolve(root, ref))).replace(/^sha256:/, '') });
  const gate = { status: 'approved', approval_ref: f.state.plan_approval_ref, subject_ref: f.state.plan_review_ref,
    subject_digest: asset(f.state.plan_review_ref).digest, approval_scope: [f.state.feature_id], drafter_principal_ref: f.review.drafter_principal_ref,
    basis: [...f.review.basis.map(row => ({ ...row, digest: row.digest.replace(/^sha256:/, '') })), asset(f.state.plan_review_ref), asset(f.state.plan_approval_ref)] };
  const checkpoint = { ...f.state, gates: { 'gate.plan-approved': gate }, checks: {} }; delete checkpoint.plan_review_control;
  const registry = { id_policy: { deprecated_ids: [] }, gates: [{ id: 'gate.plan-approved', requires_checks: [], evidence: [] }], checks: [] };
  const options = { root, rolesDoc, registry, checkpoint };
  for (const consume of [
    () => validateApprovalRecord(record, options),
    () => validateApprovalRecordFile(f.state.plan_approval_ref, options),
    () => assertApprovedGateHasValidApproval('gate.plan-approved', gate, options),
    () => assertGateChecks('gate.plan-approved', checkpoint, options)
  ]) assert.throws(consume, /PLAN_REVIEW_CONTROL_REQUIRED/);
  assert.throws(() => validateApprovalRecord(record, { root, rolesDoc, registry, expected: { boundary: 'gate.plan-approved', ...gate } }), /APPROVAL_CONTEXT_REQUIRED/);
});

test('direct Plan aggregate rejects target-named primary aliases while retaining original approval bytes and history', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-plan-aggregate-alias-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const f = buildPlanFixture(root), approvalRef = f.state.plan_approval_ref;
  f.state.gates = { 'gate.plan-approved': { status: 'approved', approval_ref: approvalRef, subject_ref: f.state.plan_review_ref } };
  f.write('current-checkpoint.json', f.state);
  const checkpointBytes = fs.readFileSync(path.join(root, 'current-checkpoint.json')), approvalBytes = fs.readFileSync(approvalRef);
  assert.equal(assertPlanAggregateApproval(f.state, { root }).result, 'allowed');
  for (const ref of ['nested/Progression-Target.JSON', 'progression-target.json']) {
    const alias = path.join(root, ref);
    fs.mkdirSync(path.dirname(alias), { recursive: true }); fs.writeFileSync(alias, approvalBytes);
    const state = { ...f.state, plan_approval_ref: alias };
    assert.equal(state.gates['gate.plan-approved'].approval_ref, approvalRef);
    assert.throws(() => assertPlanAggregateApproval(state, { root }), /推进目标.*不能作为批准或交付证据/);
    assert.equal(validateApprovalRecordFile(alias, { root, history: true }).execution_authorization, 'not-evaluated');
    assert.deepEqual(fs.readFileSync(alias), approvalBytes);
  }
  assert.deepEqual(fs.readFileSync(approvalRef), approvalBytes);
  assert.deepEqual(fs.readFileSync(path.join(root, 'current-checkpoint.json')), checkpointBytes);
  assert.equal(assertPlanAggregateApproval(f.state, { root }).result, 'allowed');
});

test('direct Plan aggregate rejects extra target intent in current evidence refs while pure history remains readable', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-plan-aggregate-evidence-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const f = buildPlanFixture(root), approvalRef = f.state.plan_approval_ref;
  f.state.gates = { 'gate.plan-approved': { status: 'approved', approval_ref: approvalRef, subject_ref: f.state.plan_review_ref } };
  const approvalBytes = fs.readFileSync(approvalRef), record = JSON.parse(approvalBytes);
  assert.equal(assertPlanAggregateApproval(f.state, { root }).result, 'allowed');
  for (const ref of ['nested/Progression-Target.JSON', 'progression-target.json']) {
    f.write(ref, { schema_version: 1, kind: 'lifecycle-progression-target', feature_id: f.state.feature_id, checkpoint_ref: 'current-checkpoint.json', target: 'business-accepted', intent_source: 'synthetic-test', consumers: [] });
    const contaminated = { ...record, evidence_refs: [...record.evidence_refs, ref] };
    f.write(approvalRef, contaminated);
    assert.throws(() => assertPlanAggregateApproval(f.state, { root }), /推进目标.*不能作为批准或交付证据/);
    assert.equal(validateApprovalRecordFile(approvalRef, { root, history: true }).execution_authorization, 'not-evaluated');
  }
  fs.writeFileSync(approvalRef, approvalBytes);
  assert.equal(assertPlanAggregateApproval(f.state, { root }).result, 'allowed');
});

test('first Plan review covers both professional checks and preserves their dependency', () => {
  assert.throws(() => planReviewRequest(freshCheckpoint(), request({ check_ids: [PLAN_BOUNDARIES[0]] }), noIO), /PLAN_REVIEW|initial|首轮|完整/);
  const attempt = start();
  assert.throws(() => completePlanReview(attempt.control, attempt.binding, result({ plan_review_binding: attempt.binding, outcome: 'passed', check_results: [{ check_id: PLAN_BOUNDARIES[0], status: 'blocked' }, { check_id: PLAN_BOUNDARIES[1], status: 'passed' }] }), noIO), /PLAN_REVIEW|依赖|passed|通过/);
});

test('same inputs reuse their attempt across task renaming and restart', () => {
  const first = planReviewRequest(freshCheckpoint(), request(), noIO);
  const replay = planReviewRequest({ feature_id: 'feature.demo', plan_review_control: first.control }, request({ task_ref: 'reviews/renamed/task.json' }), noIO);
  assert.ok(replay.reusedAttempt);
  assert.deepEqual(replay.binding, first.binding);
  assert.equal(replay.control.attempts.length, 1);
  const bound = bindPlanReviewAttempt(first.control, first.binding.attempt_id, { task_ref: request().task_ref, task_digest: digest }, noIO);
  const active = dispatchPlanReview(bound, first.binding, noIO);
  assert.deepEqual(dispatchPlanReview(active, first.binding, noIO), active, 'technical restart preserves the active registration');
  assert.throws(() => dispatchPlanReview(first.control, { ...first.binding, attempt_id: 'attempt.unregistered' }, noIO), /PLAN_REVIEW|attempt|未登记|匹配/);
});

test('two blocked reviews route to diagnosis and never grant approval or require a user reply', () => {
  const first = start(), blocked = finish(first);
  const second = start({ plan_review_control: blocked }, { phase: 'rereview', candidate_digest: 'b'.repeat(64), candidate_ref: 'reviews/second/subject.json', task_ref: 'reviews/second/task.json', target_finding_ids: ['plan.rule-001'], resolution_evidence: [asset('input/fix.md', 'b'.repeat(64))] });
  const twice = finish(second), summary = summarizePlanReview(twice, noIO);
  assert.match(JSON.stringify(summary), /diagnos|诊断/);
  assert.doesNotMatch(JSON.stringify(summary), /"(?:result|status|decision)":"(?:passed|approved)"/);
  assert.throws(() => planReviewRequest({ feature_id: 'feature.demo', plan_review_control: twice }, request({ phase: 'rereview', candidate_digest: 'c'.repeat(64), task_ref: 'reviews/third/task.json' }), noIO), /PLAN_REVIEW|预算|次数|diagnos/);
});

test('one exception requires completed diagnosis and new closure evidence; no fourth dispatch', () => {
  const first = start(), once = finish(first);
  const second = start({ plan_review_control: once }, { phase: 'rereview', candidate_digest: 'b'.repeat(64), task_ref: 'reviews/second/task.json', target_finding_ids: ['plan.rule-001'], resolution_evidence: [asset('input/fix.md', 'b'.repeat(64))] });
  const twice = finish(second);
  const exception = request({ phase: 'exception', candidate_digest: 'c'.repeat(64), task_ref: 'reviews/exception/task.json', target_finding_ids: ['plan.rule-001'], resolution_evidence: [asset('input/closure.md', 'c'.repeat(64))] });
  assert.throws(() => planReviewRequest({ feature_id: 'feature.demo', plan_review_control: twice }, exception, noIO), /PLAN_REVIEW|diagnos|诊断/);
  const diagnosed = diagnosePlanReview(twice, { ref: 'reviews/diagnosis.json', digest, finding_ids: ['plan.rule-001'], resolution_evidence: [asset('input/closure.md', 'c'.repeat(64))], completed_at: '2026-10-05T01:00:00Z' }, noIO);
  assert.throws(() => planReviewRequest({ feature_id: 'feature.demo', plan_review_control: diagnosed }, { ...exception, resolution_evidence: [] }, noIO), /PLAN_REVIEW|evidence|证据/);
  const prepared = start({ plan_review_control: diagnosed }, exception);
  const third = finish(prepared);
  assert.throws(() => planReviewRequest({ feature_id: 'feature.demo', plan_review_control: third }, { ...exception, candidate_digest: 'd'.repeat(64), task_ref: 'reviews/fourth/task.json' }, noIO), /PLAN_REVIEW|预算|次数|exhaust|停止/);
});

test('suggestions become backlog and never create blocking findings', () => {
  const first = start();
  assert.throws(() => completePlanReview(first.control, first.binding, result({ plan_review_binding: first.binding, outcome: 'blocked', findings: [finding({ kind: 'suggestion' })] }), noIO), /PLAN_REVIEW|suggestion|建议|backlog/);
  const control = completePlanReview(first.control, first.binding, result({ plan_review_binding: first.binding, findings: [finding({ kind: 'suggestion', status: 'backlog' })] }), noIO);
  assert.equal(control.findings.find(row => row.id === 'plan.rule-001').status, 'backlog');
});

test('new blocking findings in rereview require their repair, new evidence or initial miss origin', () => {
  const blocked = finish(start());
  const second = start({ plan_review_control: blocked }, { phase: 'rereview', candidate_digest: 'b'.repeat(64), task_ref: 'reviews/second/task.json', target_finding_ids: ['plan.rule-001'], resolution_evidence: [asset('input/fix.md', 'b'.repeat(64))] });
  const newFinding = finding({ id: 'plan.rule-002', origin: 'preference', scenario: '审查者喜欢另一个措辞' });
  assert.throws(() => finish(second, 'blocked', [finding(), newFinding]), /PLAN_REVIEW|origin|来源|偏好/);
  for (const origin of ['repair', 'new-evidence', 'initial-miss']) {
    const control = finish(second, 'blocked', [finding(), { ...newFinding, origin, reason: '当前业务证据证明规则遗漏', scenario: '新证据揭示另一关键规则遗漏', evidence: [asset('input/new-evidence.md', 'c'.repeat(64))] }]);
    assert.ok(control.findings.some(row => row.id === 'plan.rule-002'));
  }
});

test('a narrow decision-package rereview reuses the passed business-boundary conclusion', () => {
  const first = start();
  const blocked = completePlanReview(first.control, first.binding, result({ plan_review_binding: first.binding, outcome: 'blocked', check_results: [{ check_id: PLAN_BOUNDARIES[0], status: 'passed' }, { check_id: PLAN_BOUNDARIES[1], status: 'blocked' }], findings: [finding()] }), noIO);
  const second = start({ plan_review_control: blocked }, { phase: 'rereview', check_ids: [PLAN_BOUNDARIES[1]], candidate_digest: 'b'.repeat(64), task_ref: 'reviews/narrow/task.json', target_finding_ids: ['plan.rule-001'], resolution_evidence: [asset('input/fix.md', 'b'.repeat(64))] });
  const converged = completePlanReview(second.control, second.binding, result({ plan_review_binding: second.binding, check_results: [{ check_id: PLAN_BOUNDARIES[1], status: 'passed' }], findings: [finding({ status: 'closed', evidence: [asset('input/fix.md', 'b'.repeat(64))], reason: '决策包已承接当前规则与测试场景' })] }), noIO);
  assert.equal(converged.status, 'converged');
  assert.equal(converged.attempts.length, 2);
  assert.deepEqual(converged.attempts[1].check_ids, [PLAN_BOUNDARIES[1]]);
  assert.doesNotThrow(() => assertPlanReviewEntry(converged, noIO));
});

test('same blocking evidence cannot be repackaged as progress, and scopes cannot reset a cycle', () => {
  const blocked = finish(start());
  assert.throws(() => planReviewRequest({ feature_id: 'feature.demo', plan_review_control: blocked }, request({ phase: 'rereview', candidate_digest: 'b'.repeat(64), task_ref: 'reviews/retry/task.json', target_finding_ids: ['plan.rule-001'], resolution_evidence: [asset()] }), noIO), /PLAN_REVIEW|progress|进展|新.*证据/);
  assert.throws(() => planReviewRequest({ feature_id: 'feature.demo', plan_review_control: blocked }, request({ scope_digest: 'f'.repeat(64), task_ref: 'reviews/reset/task.json' }), noIO), /PLAN_REVIEW|scope|范围/);
});

test('same repair evidence in basis and resolution supports dispatch and completion while conflicting digests block', () => {
  const blocked = finish(start()), fix = asset('input/repair-proof.md', 'b'.repeat(64));
  const next = { phase: 'rereview', candidate_digest: 'b'.repeat(64), task_ref: 'reviews/second/task.json',
    basis: [asset(), fix], target_finding_ids: ['plan.rule-001'], resolution_evidence: [{ ...fix, digest: `sha256:${fix.digest}` }] };
  const second = start({ plan_review_control: blocked }, next);
  assert.equal(second.control.attempts.at(-1).status, 'dispatched');
  const completed = completePlanReview(second.control, second.binding, result({ result_ref: 'reviews/second/result.json', result_digest: 'c'.repeat(64),
    plan_review_binding: second.binding, findings: [finding({ status: 'closed', evidence: [fix], reason: '修正规则与验收场景，并用本次新增修复证据关闭原问题' })] }), noIO);
  assert.equal(completed.status, 'converged');
  assert.equal(completed.attempts.length, 2);
  assert.throws(() => start({ plan_review_control: blocked }, { ...next, resolution_evidence: [{ ...fix, digest: 'c'.repeat(64) }] }), /PLAN_REVIEW_EVIDENCE_|冲突|摘要/);
});

test('first-round no-progress diagnosis preserves the second regular round', () => {
  const blocked = finish(start());
  assert.throws(() => planReviewRequest({ feature_id: 'feature.demo', plan_review_control: blocked }, request({ phase: 'rereview', candidate_digest: 'b'.repeat(64), task_ref: 'reviews/second/task.json', target_finding_ids: ['plan.rule-001'], resolution_evidence: [asset()] }), noIO), /PLAN_REVIEW_NO_PROGRESS/);
  const diagnosed = diagnosePlanReview(blocked, { ref: 'reviews/diagnosis.json', digest, finding_ids: ['plan.rule-001'], resolution_evidence: [asset('input/new-fix.md', 'b'.repeat(64))], completed_at: '2026-10-05T01:00:00Z' }, noIO);
  assert.equal(diagnosed.status, 'active');
  assert.equal(diagnosed.attempts.length, 1);
  const second = start({ plan_review_control: diagnosed }, { phase: 'rereview', candidate_digest: 'b'.repeat(64), task_ref: 'reviews/second/task.json', target_finding_ids: ['plan.rule-001'], resolution_evidence: [asset('input/new-fix.md', 'b'.repeat(64))] });
  const control = finish(second, 'passed', [finding({ status: 'closed', evidence: [asset('input/new-fix.md', 'b'.repeat(64))], reason: '主控补齐新修复证据后关闭' })]);
  assert.equal(control.status, 'converged');
  assert.equal(control.attempts.length, 2);
  assert.equal(control.attempts[1].phase, 'rereview');
});

test('a closed finding needs changed behavior or invalid closure evidence before reopening', () => {
  const other = finding({ id: 'plan.rule-002', scenario: '另一必要业务规则仍待修正' });
  const blocked = finish(start(), 'blocked', [finding(), other]);
  const second = start({ plan_review_control: blocked }, { phase: 'rereview', candidate_digest: 'b'.repeat(64), task_ref: 'reviews/second/task.json', target_finding_ids: ['plan.rule-001', 'plan.rule-002'], resolution_evidence: [asset('input/fix.md', 'b'.repeat(64))] });
  const closed = finish(second, 'blocked', [finding({ status: 'closed', evidence: [asset('input/fix.md', 'b'.repeat(64))], reason: '修正流程已明确并验证' }), other]);
  assert.equal(closed.findings.find(row => row.id === 'plan.rule-001').status, 'closed');
  const diagnosed = diagnosePlanReview(closed, { ref: 'reviews/diagnosis.json', digest, finding_ids: ['plan.rule-002'], resolution_evidence: [asset('input/closure.md', 'c'.repeat(64))], completed_at: '2026-10-05T01:00:00Z' }, noIO);
  const third = start({ plan_review_control: diagnosed }, { phase: 'exception', candidate_digest: 'c'.repeat(64), task_ref: 'reviews/third/task.json', target_finding_ids: ['plan.rule-002'], resolution_evidence: [asset('input/closure.md', 'c'.repeat(64))] });
  assert.throws(() => finish(third, 'blocked', [finding({ origin: 'repair', status: 'open' }), other]), /PLAN_REVIEW|重开|reopen|闭合|关闭/);
});

test('rereview can target a closed finding with repair regression evidence without resetting its cycle', () => {
  const closed = finding({ status: 'closed', reason: '首轮已核验此规则及关闭证据' });
  const open = finding({ id: 'plan.rule-002', scenario: '另一必要业务规则仍待修正' });
  const first = finish(start(), 'blocked', [closed, open]);
  const fix = asset('input/repair-proof.md', 'b'.repeat(64));
  const regression = asset('input/repair-regression.md', 'c'.repeat(64));
  const second = start({ plan_review_control: first }, { phase: 'rereview', candidate_digest: 'b'.repeat(64),
    task_ref: 'reviews/second/task.json', target_finding_ids: [closed.id, open.id], resolution_evidence: [fix, regression] });
  const repaired = { ...open, status: 'closed', evidence: [fix], reason: '另一规则已修复，并有本轮验证证据' };
  const reopened = { ...closed, origin: 'repair', status: 'open', evidence: [regression],
    reopen_reason: 'behavior-changed', reason: '修复另一规则时改变相关行为，本轮证据证明原规则出现回归' };
  const withoutReason = { ...reopened }; delete withoutReason.reopen_reason;
  assert.throws(() => finish(second, 'blocked', [withoutReason, repaired]), /PLAN_REVIEW_REOPEN_UNJUSTIFIED/);
  assert.throws(() => finish(second, 'blocked', [{ ...reopened, evidence: closed.evidence }, repaired]), /PLAN_REVIEW_REOPEN_UNJUSTIFIED/);
  const completed = finish(second, 'blocked', [reopened, repaired]);
  assert.equal(completed.cycle_id, first.cycle_id);
  assert.equal(completed.status, 'diagnosis-required');
  assert.equal(completed.findings.find(row => row.id === closed.id).status, 'open');
  assert.match(completed.findings.find(row => row.id === closed.id).history.at(-1).reason, /behavior-changed/);
  assert.equal(completed.findings.find(row => row.id === open.id).status, 'closed');
  assert.equal(completed.attempts.length, 2);
  const summary = summarizePlanReview(completed, noIO);
  assert.equal(summary.professional_attempts, 2);
  assert.equal(summary.remaining_regular, 0);
  assert.deepEqual(summary.unresolved_findings, [closed.id]);
  assert.throws(() => planReviewRequest({ feature_id: 'feature.demo', plan_review_control: completed }, request({
    phase: 'rereview', candidate_digest: 'd'.repeat(64), task_ref: 'reviews/third/task.json',
    target_finding_ids: [closed.id], resolution_evidence: [asset('input/third-proof.md', 'd'.repeat(64))]
  }), noIO), /PLAN_REVIEW_DIAGNOSIS_REQUIRED/);
});

test('prepare CLI dry-run writes no checkpoint, task, directory or transaction receipt', t => {
  const f = fixture(t), before = f.read(f.checkpointRef);
  const dry = run([...prepareArgs(f), '--dry-run'], f.root);
  assert.equal(dry.status, 0, dry.stderr);
  const preview = JSON.parse(dry.stdout);
  assert.deepEqual(f.read(f.checkpointRef), before);
  assert.equal(fs.existsSync(path.join(f.root, f.options.outputDir)), false);
  assert.equal(fs.existsSync(path.join(f.root, '.yss/asset-transactions')), false);
  assert.equal(preview.execution_authorization, 'not-granted');
});

test('failed package preparation reserves no review attempt', t => {
  const f = fixture(t), before = f.read(f.checkpointRef);
  assert.throws(() => prepareReviewPackage({ ...f.options, roleId: 'role.frontend-engineer' }), /REVIEW_CAPABILITY_MISSING|能力/);
  assert.deepEqual(f.read(f.checkpointRef), before);
  assert.equal(f.reload().plan_review_control.attempts.length, 0);
  assert.equal(fs.existsSync(path.join(f.root, f.options.outputDir)), false);
});

test('transactional preparation persists one reservation and task renaming returns the original task', t => {
  const f = fixture(t), prepared = prepareReviewPackage(f.options);
  assert.equal(prepared.decision, 'pending');
  assert.equal(f.reload().plan_review_control.attempts.length, 1);
  const renamed = prepareReviewPackage({ ...f.options, taskId: 'synthetic.renamed', outputDir: 'docs/.scratch/feature.demo/reviews/renamed' });
  assert.equal(renamed.task_ref, prepared.task_ref);
  assert.equal(f.reload().plan_review_control.attempts.length, 1);
  assert.equal(fs.existsSync(path.join(f.root, 'docs/.scratch/feature.demo/reviews/renamed')), false);
  const tx = path.join(f.root, '.yss/asset-transactions');
  const receipts = fs.readdirSync(tx).filter(name => /^[a-f0-9]{64}\.json$/.test(name)).map(name => JSON.parse(fs.readFileSync(path.join(tx, name))));
  assert.ok(receipts.some(row => row.status === 'applied' && row.changes.some(change => change.ref === f.checkpointRef)));
  assert.equal(fs.existsSync(path.join(tx, 'active.json')), false);
  assert.equal(fs.existsSync(path.join(tx, 'lock')), false);
});

test('concurrent prepare CLI processes leave one valid reservation with no partial task publication', async t => {
  const f = fixture(t);
  const results = await Promise.all([
    runAsync(prepareArgs(f), f.root),
    runAsync(prepareArgs(f, { taskId: 'synthetic.concurrent', outputDir: 'docs/.scratch/feature.demo/reviews/concurrent' }), f.root)
  ]);
  assert.ok(results.some(row => row.status === 0), JSON.stringify(results));
  for (const row of results) if (row.status !== 0) assert.match(row.stderr, /lock|锁|EEXIST|DRIFT|并发|PLAN_REVIEW/);
  assert.equal(f.reload().plan_review_control.attempts.length, 1);
  const tasks = [f.options.outputDir, 'docs/.scratch/feature.demo/reviews/concurrent'].filter(ref => fs.existsSync(path.join(f.root, ref, 'task.json')));
  assert.equal(tasks.length, 1);
  const task = JSON.parse(f.read(path.posix.join(tasks[0], 'task.json')));
  assert.doesNotThrow(() => validateReviewTaskBinding(task, { root: f.root }));
});

test('business subject and basis drift block current tasks while CLI and log metadata preserve their binding', t => {
  const f = fixture(t), prepared = prepareReviewPackage(f.options);
  const task = JSON.parse(f.read(prepared.task_ref));
  f.write('scripts/metadata.txt', 'CLI metadata revision 2\n');
  f.write('docs/.scratch/feature.demo/operation.log', '重启后恢复相同专业任务\n');
  f.reload(); f.checkpoint.verification.operation_note = '纯进度信息不修改业务审查依据'; f.save();
  assert.doesNotThrow(() => validateReviewTaskBinding(task, { root: f.root }));
  const originalEvidence = f.read('input/business-evidence.md');
  f.write('input/business-evidence.md', '业务规则已改变，需要重新绑定当前依据\n');
  assert.throws(() => validateReviewTaskBinding(task, { root: f.root }), /REVIEW_BINDING_STALE|PLAN_REVIEW|摘要|依据/);
  f.write('input/business-evidence.md', originalEvidence);
  f.changeSubject();
  assert.throws(() => validateReviewTaskBinding(task, { root: f.root }), /REVIEW_BINDING_STALE|PLAN_REVIEW|摘要|主体/);
});

test('real CLI dispatch and complete transactions bind approval consumption to the converged attempt and source consumer', async t => {
  const f = fixture(t), prepared = prepareReviewPackage(f.options), task = JSON.parse(f.read(prepared.task_ref));
  const controlArgs = command => [path.join(ROOT, 'scripts/plan-review-control'), command, '--root', f.root, '--checkpoint', f.checkpointRef];
  const beforeDispatch = run(controlArgs('check'), f.root);
  assert.equal(beforeDispatch.status, 1); assert.match(beforeDispatch.stderr, /PLAN_REVIEW_ENTRY_BLOCKED|未收敛/);
  const dispatch = run([...controlArgs('dispatch'), '--task', prepared.task_ref], f.root);
  assert.equal(dispatch.status, 0, dispatch.stderr);
  assert.equal(f.reload().plan_review_control.attempts[0].status, 'dispatched');
  const bundle = parseDocument(String(f.read(prepared.bundle_ref))).toJS();
  assert.throws(() => validateApprovalRecordFile(path.join(f.root, prepared.bundle_ref), { root: f.root, checkpoint: f.checkpoint }), /APPROVAL_CURRENT_INVALID|approved/);
  for (const row of bundle.reviews) row.decision = 'approved';
  const approvedRef = 'docs/.scratch/feature.demo/reviews/approved-bundle.json'; f.write(approvedRef, bundle);
  assert.throws(() => validateApprovalRecordFile(path.join(f.root, approvedRef), { root: f.root, checkpoint: f.checkpoint }), /PLAN_REVIEW|未收敛|APPROVAL_CURRENT_INVALID/);
  const resultRef = 'docs/.scratch/feature.demo/reviews/initial/result.json';
  f.write(resultRef, { synthetic_fixture: true, plan_review_binding: task.review_context.plan_review_binding, outcome: 'passed', check_results: PLAN_BOUNDARIES.map(check_id => ({ check_id, status: 'passed' })), findings: [] });
  const complete = run([...controlArgs('complete'), '--task', prepared.task_ref, '--input', resultRef], f.root);
  assert.equal(complete.status, 0, complete.stderr);
  assert.equal(f.reload().plan_review_control.status, 'converged');
  const check = run(controlArgs('check'), f.root); assert.equal(check.status, 0, check.stderr);
  for (const row of bundle.reviews) {
    const original = f.checkpoint.checks[row.gate_id];
    Object.assign(original, { status: 'approved', approval_ref: approvedRef, basis: [...original.basis, f.asset(original.subject_ref), f.asset(approvedRef)] });
  }
  f.save();
  assert.doesNotThrow(() => validateApprovalRecordFile(path.join(f.root, approvedRef), { root: f.root, checkpoint: f.checkpoint }));
  const repeated = run([...controlArgs('complete'), '--task', prepared.task_ref, '--input', resultRef], f.root);
  assert.equal(repeated.status, 1); assert.match(repeated.stderr, /PLAN_REVIEW_NOT_DISPATCHED|已消费/);
  assert.equal(f.reload().plan_review_control.attempts.length, 1);
  assert.equal(f.checkpoint.gates['gate.plan-approved'], undefined, '专业通过不批准完整 Plan 或代替用户回复');
  const plan = buildPlanFixture(f.root);
  plan.state.plan_review_control = f.checkpoint.plan_review_control;
  plan.review.drafter_principal_ref = 'synthetic.plan-author';
  plan.review.impacts.domain_strategy = true; plan.review.impacts.stage_decision = true;
  for (const boundary of PLAN_BOUNDARIES) {
    const row = f.checkpoint.checks[boundary];
    plan.review.internal_checks[boundary] = { ...row, evidence_refs: [...row.evidence_refs, row.subject_ref, approvedRef] };
  }
  for (const ref of [...new Set(PLAN_BOUNDARIES.flatMap(id => plan.review.internal_checks[id].evidence_refs))]) {
    if (!plan.review.basis.some(row => row.ref === ref)) plan.review.basis.push({ ref, digest: decisionDigest(f.read(ref)) });
  }
  localizeSyntheticPlanSource(plan);
  const aggregateRef = 'docs/.scratch/feature.demo/plan-approval.json';
  f.write(aggregateRef, {
    schema_version: 2, gate_id: 'gate.plan-approved', decision: 'approved', actor_kind: 'digital-human',
    role_id: bundle.role_id, runtime_id: bundle.runtime_id, principal_ref: bundle.principal_ref, drafter_principal_ref: plan.review.drafter_principal_ref,
    subject_ref: plan.state.plan_review_ref, subject_digest: decisionDigest(f.read('review.json')), approval_scope: [plan.state.feature_id],
    basis: plan.review.basis.map(row => ({ ...row, digest: row.digest.replace(/^sha256:/, '') })), evidence_refs: plan.review.basis.map(row => row.ref), user_decision_ref: plan.state.plan_user_decision_ref,
    review_bundle_ref: approvedRef, review_session_id: bundle.review_session_id, review_task_ref: bundle.review_task_ref,
    review_task_digest: bundle.review_task_digest, capability_ids: bundle.capability_ids, plan_review_binding: bundle.plan_review_binding
  });
  plan.state.plan_approval_ref = aggregateRef;
  const reviewBytes = f.read('review.json'), replyBytes = fs.readFileSync(plan.approval.ref);
  assert.equal(assertPlanSpecEntry(plan.state, { root: f.root }).result, 'allowed');
  assert.equal(assertPlanSpecEntry(plan.state, { root: f.root }).result, 'allowed', 'same complete Plan approval is reusable');
  assert.equal(plan.approval.record.responses.length, 1);
  assert.deepEqual(f.read('review.json'), reviewBytes);
  assert.deepEqual(fs.readFileSync(plan.approval.ref), replyBytes);
  assert.equal(f.reload().plan_review_control.attempts.length, 1, 'aggregate entry consumes the same combined professional attempt');
  const source = syntheticPlanSourceContext(plan, aggregateRef);
  Object.assign(f.checkpoint, plan.state);
  f.checkpoint.gates['gate.plan-approved'] = source.gate; f.save();
  const aggregate = JSON.parse(f.read(aggregateRef));
  const rolesDoc = parseDocument(String(f.read('.template-spec/agents/digital-human-roles.yaml'))).toJS();
  const consume = binding => sourceApproval(aggregate, rolesDoc, f.root, binding);
  await assert.doesNotReject(consume(source.binding));
  for (const [mutate, reason] of [
    [context => { context.subject_ref = f.checkpoint.checks[PLAN_BOUNDARIES[0]].subject_ref; context.subject_digest = f.asset(context.subject_ref).digest; }, /当前消费主体不匹配/],
    [context => { context.approval_scope = ['feature.unrelated']; }, /当前消费范围或作者不匹配/],
    [context => { context.drafter_principal_ref = 'synthetic.unrelated-author'; }, /当前消费范围或作者不匹配/],
    [context => { context.basis = [...context.basis, f.asset('input/origin-checkpoint.json')]; }, /当前消费依据不匹配/]
  ]) {
    const binding = structuredClone(source.binding); mutate(binding.approval_context);
    await assert.rejects(consume(binding), reason);
  }
  const checkpointBytes = f.read(f.checkpointRef);
  const invalidOwner = JSON.parse(checkpointBytes); delete invalidOwner.plan_review_control;
  f.write(f.checkpointRef, invalidOwner);
  await assert.rejects(consume(source.binding), /任务缺少当前周期归属/);
  f.write(f.checkpointRef, checkpointBytes);
  const invalidAttemptOwner = JSON.parse(checkpointBytes);
  invalidAttemptOwner.plan_review_control.attempts[0].checkpoint_ref = 'docs/.scratch/feature.unrelated/checkpoint.json';
  f.write(f.checkpointRef, invalidAttemptOwner);
  await assert.rejects(consume(source.binding), /任务缺少当前周期归属/);
  f.write(f.checkpointRef, checkpointBytes);
  await assert.doesNotReject(consume(source.binding));
  assert.deepEqual(f.read('review.json'), reviewBytes);
  assert.deepEqual(fs.readFileSync(plan.approval.ref), replyBytes);
  await assertReadonlySourceContextConsumption(f.root, () => consume(source.binding));
  const { collectSourceClosure } = await import('../../../../scripts/lib/strategic-handoff.mjs');
  assert.equal(typeof collectSourceClosure, 'function', 'export and open share a callable readonly source-closure collector');
  const handoffRef = 'docs/.scratch/feature.demo/synthetic-source-handoff.json';
  const config = { approvals: { plan: { record_ref: aggregateRef } }, additional_files: [f.checkpointRef] };
  const handoff = { schema_version: 5, handoff_id: 'synthetic.plan-source', ui_baseline_kind: 'prototype', synthetic_fixture: true,
    source: { plan_record_ref: { persisted_ref: 'plan.md' } }, evidence_and_version_digests: [], package_export: config };
  // This payload exercises the real collector, not Handoff schema approval.
  f.write(handoffRef, handoff);
  const captured = collectSourceClosure(f.root, handoffRef, handoff, config);
  const schemaRef = '.template-spec/process/schemas/plan-review-control.schema.json';
  const policyRef = f.checkpoint.plan_review_control.policy_ref;
  const required = [f.checkpointRef, aggregateRef, task.review_context.candidate_ref, prepared.task_ref, resultRef,
    f.checkpoint.plan_review_control.provenance.source_ref, policyRef, schemaRef,
    '.template-spec/process/lifecycle-registry.yaml', '.template-spec/agents/yss-skill-registry.yaml'];
  for (const ref of required) {
    assert.ok(captured.has(ref), `source closure omitted ${ref}`);
    assert.deepEqual(captured.get(ref), f.read(ref), `source closure preserves original bytes for ${ref}`);
  }
  assert.ok([...captured.keys()].every(ref => !ref.includes('#')), 'policy fragments bind their actual source file, not a filesystem path with an anchor');
  const replayRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'yss-plan-source-replay-')));
  t.after(() => fs.rmSync(replayRoot, { recursive: true, force: true }));
  for (const [ref, bytes] of captured) {
    const file = path.join(replayRoot, ref === 'CONTEXT.md' ? 'source-context.snapshot.md' : ref);
    fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes);
  }
  assert.equal(fs.existsSync(path.join(replayRoot, 'CONTEXT.md')), false);
  const replayRecord = JSON.parse(fs.readFileSync(path.join(replayRoot, aggregateRef)));
  const replayRoles = parseDocument(fs.readFileSync(path.join(replayRoot, '.template-spec/agents/digital-human-roles.yaml'), 'utf8')).toJS();
  const replay = () => withSourceContextSnapshot(replayRoot, () => sourceApproval(replayRecord, replayRoles, replayRoot, source.binding));
  await assert.doesNotReject(replay(), 'collector bytes alone support a portable readonly Plan source replay');
  for (const ref of [resultRef, policyRef, schemaRef]) {
    const file = path.join(replayRoot, ref), bytes = fs.readFileSync(file); fs.unlinkSync(file);
    try { await assert.rejects(replay(), `missing source closure dependency must block: ${ref}`); }
    finally { fs.writeFileSync(file, bytes); }
  }
  await assert.doesNotReject(replay());
});

test('new Plan source with no professional checks consumes v1 approval through its unique checkpoint owner', async t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'yss-na-plan-source-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const plan = buildPlanFixture(root); localizeSyntheticPlanSource(plan);
  const source = syntheticPlanSourceContext(plan);
  const checkpointRef = 'docs/.scratch/feature.demo/checkpoint.json';
  const checkpoint = { ...plan.state, checks: {}, gates: { 'gate.plan-approved': source.gate } };
  plan.write(checkpointRef, checkpoint);
  const record = JSON.parse(fs.readFileSync(path.resolve(root, plan.state.plan_approval_ref)));
  const rolesDoc = parseDocument(fs.readFileSync(path.join(root, '.template-spec/agents/digital-human-roles.yaml'), 'utf8')).toJS();
  assert.equal(record.schema_version, 1);
  assert.equal(checkpoint.plan_review_control.attempts.length, 0);
  assert.equal(assertPlanSpecEntry(checkpoint, { root }).result, 'allowed');
  const consume = binding => sourceApproval(record, rolesDoc, root, binding);
  const approvalBytes = fs.readFileSync(path.resolve(root, plan.state.plan_approval_ref));
  const decisionBytes = fs.readFileSync(plan.approval.ref);
  await assert.doesNotReject(consume(source.binding));
  const missingOwner = { ...source.binding }; delete missingOwner.approval_ref;
  await assert.rejects(consume(missingOwner), /独立批准引用以定位 checkpoint/);
  await assert.rejects(consume({ ...source.binding, approval_ref: 'unregistered-approval.json' }), /APPROVAL_CONTEXT_REQUIRED.*找到 0 个/);
  const unrelated = structuredClone(source.binding); unrelated.approval_context.approval_scope = ['feature.unrelated'];
  await assert.rejects(consume(unrelated), /当前消费范围或作者不匹配/);
  plan.write('docs/.scratch/feature.demo/duplicate-checkpoint.json', checkpoint);
  await assert.rejects(consume(source.binding), /APPROVAL_CONTEXT_REQUIRED.*找到 2 个/);
  fs.unlinkSync(path.join(root, 'docs/.scratch/feature.demo/duplicate-checkpoint.json'));
  const invalidCheckpoint = structuredClone(checkpoint); delete invalidCheckpoint.plan_review_control;
  plan.write(checkpointRef, invalidCheckpoint);
  await assert.rejects(consume(source.binding), /PLAN_REVIEW_CONTROL_REQUIRED/);
  plan.write(checkpointRef, checkpoint);
  await assert.doesNotReject(consume(source.binding));
  assert.deepEqual(fs.readFileSync(path.resolve(root, plan.state.plan_approval_ref)), approvalBytes);
  assert.deepEqual(fs.readFileSync(plan.approval.ref), decisionBytes);
  await assertReadonlySourceContextConsumption(root, () => consume(source.binding));
});

test('lifecycle status projects counts, open issues, diagnosis and remaining budgets without writes', t => {
  const f = fixture(t), first = start(), blocked = finish(first);
  const second = start({ plan_review_control: blocked }, { phase: 'rereview', candidate_digest: 'b'.repeat(64), task_ref: 'reviews/second/task.json', target_finding_ids: ['plan.rule-001'], resolution_evidence: [asset('input/fix.md', 'b'.repeat(64))] });
  // This fixture projects pure synthetic control state; it does not assert current approval.
  f.checkpoint.plan_review_control = finish(second); f.save();
  const before = f.read(f.checkpointRef), status = lifecycleStatus({ root: f.root, checkpointRef: f.checkpointRef });
  assert.deepEqual(f.read(f.checkpointRef), before);
  assert.equal(status.plan_review.professional_attempts, 2);
  assert.equal(status.plan_review.remaining_regular, 0);
  assert.equal(status.plan_review.remaining_exception, 1);
  assert.deepEqual(status.plan_review.unresolved_findings, ['plan.rule-001']);
  assert.equal(status.plan_review.status, 'diagnosis-required');
  assert.match(status.plan_review.next_condition, /诊断/);
});

test('legacy seven reviews and unknown history cannot initialize a zero-round cycle', () => {
  const old = { feature_id: 'feature.demo', gates: {}, checks: {}, review_history: Array.from({ length: 7 }, (_, index) => ({ review_task_ref: `legacy/review-${index}.json` })) };
  assert.throws(() => planReviewRequest(old, request(), noIO), /PLAN_REVIEW|adopt|接入|history|历史/);
  assert.throws(() => initializePlanReview(old, { feature_id: 'feature.demo', scope_ids: ['feature.demo'], scope_digest: digest, provenance: { kind: 'new-feature', source_ref: 'input/scope.md', source_digest: digest } }, noIO), /PLAN_REVIEW|历史|history|new-feature/);
  const adopted = adoptPlanReview(old, { feature_id: 'feature.demo', scope_ids: ['feature.demo'], scope_digest: digest, history_count: null, history_evidence: [asset()], classification: { professional: null, clarification: 0, machine: 0 } }, noIO);
  assert.match(JSON.stringify(summarizePlanReview(adopted, noIO)), /unknown|待核验|diagnos|诊断/);
  assert.throws(() => planReviewRequest({ ...old, plan_review_control: adopted }, request(), noIO), /PLAN_REVIEW|history|历史|unknown|诊断/);
  const seven = adoptPlanReview(old, { feature_id: 'feature.demo', scope_ids: ['feature.demo'], scope_digest: digest, history_count: 7, history_evidence: [asset()], classification: { professional: 7, clarification: 0, machine: 0 } }, noIO);
  const summary = summarizePlanReview(seven, noIO);
  assert.equal(summary.professional_attempts, 7);
  assert.match(JSON.stringify(summary), /diagnos|诊断/);
  const mapped = { feature_id: 'feature.demo', checks: { [PLAN_BOUNDARIES[0]]: { status: 'approved', approval_ref: 'legacy/approval.json' } }, gates: {} };
  assert.throws(() => initializePlanReview(mapped, { feature_id: 'feature.demo', scope_ids: ['feature.demo'], scope_digest: digest, provenance: { kind: 'new-feature', source_ref: 'input/scope.md', source_digest: digest } }, noIO), /PLAN_REVIEW_HISTORY_ADOPTION_REQUIRED/);
});

test('unknown legacy history can be reconciled without changing its cycle or clearing seven rounds', () => {
  const cp = { feature_id: 'feature.demo' }, identity = { feature_id: cp.feature_id, scope_ids: [cp.feature_id], scope_digest: digest };
  const unknown = adoptPlanReview(cp, { ...identity, history_count: null, history_evidence: [asset('legacy/original.md')] }, noIO);
  const input = { ...identity, history_count: 7, history_evidence: [asset('legacy/classification.json')], classification: { professional: 7, clarification: 3, machine: 9 } };
  const reconciled = reconcilePlanReviewHistory(unknown, input, noIO), summary = summarizePlanReview(reconciled, noIO);
  assert.equal(reconciled.cycle_id, unknown.cycle_id);
  assert.equal(summary.professional_attempts, 7);
  assert.equal(summary.remaining_regular, 0); assert.equal(summary.remaining_exception, 0);
  assert.ok(reconciled.history_evidence.some(row => row.ref === 'legacy/original.md'));
  assert.equal(reconciled.status, 'diagnosis-required');
  assert.throws(() => reconcilePlanReviewHistory(reconciled, { ...input, history_count: 0, classification: { professional: 0, clarification: 3, machine: 9 } }, noIO), /PLAN_REVIEW_HISTORY_REQUIRED/);
  assert.throws(() => planReviewRequest({ feature_id: cp.feature_id, plan_review_control: reconciled }, request(), noIO), /PLAN_REVIEW_BUDGET_EXHAUSTED/);
});

test('seven-round legacy recovery reuses verified original conclusions without an eighth review', () => {
  const input = {
    feature_id: 'feature.demo', scope_ids: ['feature.demo'], scope_digest: digest, history_count: 7,
    history_evidence: PLAN_BOUNDARIES.map((id, index) => asset(`legacy/approval-${index}.json`)),
    classification: { professional: 7, clarification: 3, machine: 9 },
    history_conclusions: PLAN_BOUNDARIES.map((check_id, index) => ({ check_id, approval_ref: `legacy/approval-${index}.json`, approval_digest: digest, subject_ref: `legacy/subject-${index}.json`, subject_digest: digest, approval_scope: ['feature.demo'], basis: [asset('legacy/business-evidence.md')] }))
  };
  const adopted = adoptPlanReview({ feature_id: 'feature.demo' }, input, noIO);
  assert.throws(() => assertPlanReviewEntry(adopted, noIO), /PLAN_REVIEW_ENTRY_BLOCKED/);
  const diagnosed = diagnosePlanReview(adopted, { ref: 'legacy/diagnosis.json', digest, finding_ids: [`history:${adopted.cycle_id}`], resolution_evidence: [asset('legacy/closure-verification.md', 'b'.repeat(64))], completed_at: '2026-10-05T01:00:00Z' }, noIO);
  const observed = [];
  const result = assertPlanReviewEntry(diagnosed, { ...noIO, verifyHistoricalApproval: conclusion => { observed.push(conclusion.check_id); return { decision: 'approved', result: 'verified-synthetic-original' }; } });
  assert.equal(result.historical_reuse, true);
  assert.deepEqual(observed, PLAN_BOUNDARIES);
  assert.equal(diagnosed.history_count, 7); assert.equal(diagnosed.attempts.length, 0);
  assert.equal(summarizePlanReview(diagnosed, noIO).remaining_regular, 0);
  assert.throws(() => planReviewRequest({ feature_id: 'feature.demo', plan_review_control: diagnosed }, request(), noIO), /PLAN_REVIEW_BUDGET_EXHAUSTED/);
  assert.throws(() => assertPlanReviewEntry(diagnosed, { ...noIO, verifyHistoricalApproval: () => ({ decision: 'rejected', result: 'blocked' }) }), /PLAN_REVIEW_ENTRY_BLOCKED/);
  assert.throws(() => assertPlanReviewEntry({ ...diagnosed, history_count: '7' }, noIO), /PLAN_REVIEW_CONTROL_INVALID/);
});

test('Plan to Spec still blocks missing Context, critical answers, and real user approval', t => {
  for (const [name, mutate, pattern] of [
    ['Context', f => fs.rmSync(path.join(f.root, 'CONTEXT.md')), /Context|CONTEXT|ENOENT|依据/],
    ['critical answer', f => { f.review.open_items.push({ id: 'synthetic-critical', critical: true, runnable_blocker: false, status: 'open', evidence_refs: ['plan.md'] }); f.reapprove(); }, /关键问题|未解决/],
    ['real reply', f => { f.approval.record.responses = []; f.approval.save(); }, /user-decision-response-required/]
  ]) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-plan-entry-control-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const f = buildPlanFixture(root); mutate(f);
    assert.throws(() => assertPlanSpecEntry(f.state, { root }), pattern, name);
  }
});

test('Spec, Design and implementation review preparation does not consume Plan review budget', t => {
  for (const [boundaries, roleId, workUnitId] of [
    [['gate.spec-baseline-approved'], 'role.product-manager', 'work-unit.spec-synthesis'],
    [['check.prototype-reviewed'], 'role.frontend-engineer', 'work-unit.prototype-design-v2'],
    [['check.frontend-implementation-verified'], 'role.test-engineer', 'work-unit.frontend-implementation-verification']
  ]) {
    const f = fixture(t, { boundaries });
    const options = { ...f.options, roleId, workUnitId }; delete options.reviewPhase;
    const before = f.read(f.checkpointRef), prepared = prepareReviewPackage(options);
    assert.equal(prepared.decision, 'pending');
    assert.deepEqual(f.read(f.checkpointRef), before);
    assert.equal(f.reload().plan_review_control, undefined);
  }
});
