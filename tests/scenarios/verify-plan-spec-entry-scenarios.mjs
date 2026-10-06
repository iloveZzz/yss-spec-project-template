import assert from 'node:assert/strict';
import { validateNextRoute } from '../../scripts/lib/lifecycle-transition.mjs';
import { queryLifecycleContext } from '../../scripts/lib/lifecycle-context-query.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildPlanFixture } from '../../scripts/fixtures/user-decision/plan-fixture.mjs';
import { assertPlanSpecEntry, assertPlanCheckpoint } from '../../scripts/lib/plan-spec-entry.mjs';
import { readFileSync } from 'node:fs';
import { decisionDigest } from '../../scripts/lib/user-decision.mjs';
import { buildPlanReviewFixture, completeSyntheticPlanReview } from '../../scripts/fixtures/plan-review-control/build-fixture.mjs';

// These replies are synthetic fixtures, never evidence for a real Plan approval.
function verifyClarificationEntryBoundaries(temp) {
  const deferred = () => ({ id: 'q-detail', critical: false, runnable_blocker: false, status: 'deferred', noncritical_reason: '不影响目标、MVP 或关键规则', owner: 'test-only.requirements-owner', resolution_point: 'Spec 评审前', downstream_recipient: 'test-only.spec-owner', evidence_refs: ['plan.md'] });
  const cases = [
    ['非关键 open 仍阻断', f => f.review.open_items.push({ id: 'q-open', critical: false, runnable_blocker: false, status: 'open', evidence_refs: ['plan.md'] }), /未解决/],
    ['grill_exit 仍 pending', f => f.review.checks.grill_exit.status = 'pending', /检查未通过: grill_exit/],
    ['resolved 缺证据', f => f.review.open_items.push({ id: 'q-resolved', critical: true, runnable_blocker: false, status: 'resolved', evidence_refs: [] }), /缺少当前依据/],
    ['resolved 引用未绑定证据', f => { f.write('unbound-evidence.md', '模拟澄清证据'); f.review.open_items.push({ id: 'q-resolved', critical: true, runnable_blocker: false, status: 'resolved', evidence_refs: ['unbound-evidence.md'] }); }, /缺少当前依据/],
    ['resolved 依据摘要漂移', f => { f.write('resolution.md', '已确认旧结论'); f.review.basis.push({ ref: 'resolution.md', digest: decisionDigest(readFileSync(path.join(f.root, 'resolution.md'))) }); f.review.open_items.push({ id: 'q-resolved', critical: true, runnable_blocker: false, status: 'resolved', evidence_refs: ['resolution.md'] }); f.write('resolution.md', '用户纠正后的新结论'); }, /依据缺失、重复或已变更/],
    ['延期缺当前证据', f => f.review.open_items.push({ ...deferred(), evidence_refs: [] }), /缺少当前依据/],
    ['纠正后重新打开关键问题', f => { f.review.open_items.push({ id: 'q-corrected', critical: true, runnable_blocker: false, status: 'resolved', evidence_refs: ['plan.md'] }); f.review.open_items[0].status = 'open'; }, /未解决/],
    ['完整关键延期仍阻断', f => f.review.open_items.push({ ...deferred(), critical: true }), /未解决/],
    ['完整执行阻塞延期仍阻断', f => f.review.open_items.push({ ...deferred(), runnable_blocker: true }), /未解决/],
  ];
  for (const field of ['noncritical_reason', 'owner', 'resolution_point', 'downstream_recipient']) {
    for (const absent of [true, false]) cases.push([`延期 ${field} ${absent ? '缺失' : '空白'}`, f => { const item = deferred(); if (absent) delete item[field]; else item[field] = '  '; f.review.open_items.push(item); }, new RegExp(`延期项缺少 ${field}`)]);
  }
  for (const [name, mutate, expected] of cases) {
    const f = buildPlanFixture(path.join(temp, `clarification-${name}`));
    mutate(f); f.reapprove();
    assert.throws(() => assertPlanSpecEntry(f.state, { root: f.root }), expected, name);
    process.stdout.write(`PASS 澄清入口拒绝: ${name}\n`);
  }

  const f = buildPlanFixture(path.join(temp, 'combined-final-confirmation'));
  const summary = '共同理解：目标为小范围修订；MVP 为当前功能；非目标为新增业务边界；关键规则保持现状；验收例子为既有流程可执行；关键未决项已解决；非关键细节按责任人与解决时点延期；剩余不确定性明确。';
  f.write('clarification.md', `${summary}\n解决证据：原始决策回复和当前 Plan。\n`);
  const summaryAsset = { ref: 'clarification.md', digest: decisionDigest(readFileSync(path.join(f.root, 'clarification.md'))) };
  f.review.basis.push(summaryAsset);
  f.review.checks.grill_exit.evidence_refs = ['clarification.md'];
  f.review.open_items = [{ id: 'q-rule', critical: true, runnable_blocker: false, status: 'resolved', evidence_refs: ['clarification.md'] }, deferred()];
  const item = f.approval.record.request.items[0];
  item.title = '确认共同理解与完整 Plan 审阅包';
  item.changes = summary;
  item.basis = [{ ...summaryAsset, ref: path.join(f.root, summaryAsset.ref), version: 'v1' }];
  item.risks = ['非关键细节须在 Spec 评审前解决'];
  item.recommendation = '确认上述共同理解并批准当前完整 Plan 审阅包';
  item.next_actions = ['入口检查通过后进入 Spec'];
  f.reapprove();
  const reviewBytes = readFileSync(f.state.plan_review_ref);
  const digestBeforeReply = decisionDigest(reviewBytes);
  f.approval.record.responses = [];
  f.approval.save();
  assert.equal(f.review.checks.grill_exit.status, 'passed');
  assert.throws(() => assertPlanSpecEntry(f.state, { root: f.root }), /user-decision-response-required/, '材料就绪不能替代最终回复');
  f.approval.respond({ text: '确认上述共同理解，并批准本次完整 Plan 审阅包及已列明延期项，入口检查通过后进入 Spec。' });
  f.approval.save();
  assert.equal(f.approval.record.responses.length, 1, '共同理解和 Plan 批准合并一条原始回复');
  assert.equal(assertPlanSpecEntry(f.state, { root: f.root }).result, 'allowed');
  assert.deepEqual(readFileSync(f.state.plan_review_ref), reviewBytes, '回复单独保存，完整审阅包不回写');
  assert.equal(f.approval.record.request.items[0].subject.digest, digestBeforeReply, '回复绑定当前固定审阅包');
  assert.equal(assertPlanSpecEntry(f.state, { root: f.root }).result, 'allowed', '同一批准可复验，不要求重问');
  process.stdout.write('PASS 合并最终确认、非关键延期、固定摘要和批准复用\n');

  const completePresentation = JSON.parse(readFileSync(f.approval.record.request.presented_source.ref, 'utf8')).messages[0].text;
  f.approval.record.request.presented_source = f.approval.capture('presentation', 'agent.orchestrator', 'digital-human', '2026-09-05T01:02:00Z', completePresentation.replace(summary, '共同理解未展示'));
  f.approval.save();
  assert.throws(() => assertPlanSpecEntry(f.state, { root: f.root }), /user-decision-presentation-mismatch/, '未完整展示共同理解不能合并批准');
  f.approval.present(); f.approval.save();
  assert.equal(assertPlanSpecEntry(f.state, { root: f.root }).result, 'allowed');
  f.review.internal_checks['check.domain-strategy-approved'].reason += ' 用户纠正了当前理解';
  f.save();
  assert.throws(() => assertPlanSpecEntry(f.state, { root: f.root }), /user-decision-stale/, '旧包批准不能绑定纠正后的包');
}

for (const unit of ['plan-opportunity', 'plan-requirements', 'domain-strategy-design', 'stage-decision']) {
  for (const state of [undefined, {}, { gates: {}, user_decisions: [] }]) {
    assert.equal(validateNextRoute(`work-unit.${unit}`, 'work-unit.spec-synthesis', state).result, 'blocked', `${unit}: missing Plan review must block`);
  }
}
const query = queryLifecycleContext({ workUnitId: 'work-unit.plan-requirements' });
assert.ok(query.execution.selected.planning);
assert.ok(query.execution.selected.grill_exit);
assert.ok(query.lifecycle.gates.length);
assert.ok(query.execution.plan_checks.every(check => check.status === 'pending'));
const specQuery = queryLifecycleContext({ stageId: 'stage.spec-architecture' });
assert.ok(specQuery.execution.selected.planning);
assert.ok(specQuery.execution.plan_checks.every(check => check.status === 'pending'));
assert.ok(specQuery.lifecycle.gates.some(gate => gate.stage === 'stage.plan'));
const temp = mkdtempSync(path.join(tmpdir(), 'yss-plan-entry-'));
try {
  verifyClarificationEntryBoundaries(temp);
  const mutations = [
    ['缺检查项', f => delete f.review.checks.goals],
    ['默认 pending', f => f.review.checks.goals.status = 'pending'],
    ['检查项不能 N/A', f => f.review.checks.goals.status = 'not-applicable'],
    ['缺证据', f => f.review.checks.goals.evidence_refs = []],
    ['缺影响面', f => delete f.review.impacts.domain_strategy],
    ['缺门禁', f => delete f.review.internal_checks['check.domain-strategy-approved']],
    ['命中门禁不能 N/A', f => f.review.impacts.domain_strategy = true],
    ['N/A 无原因', f => delete f.review.internal_checks['check.domain-strategy-approved'].reason],
    ['关键问题延期', f => f.review.open_items.push({ id: 'q1', critical: true, runnable_blocker: false, status: 'deferred' })],
    ['可执行阻塞延期', f => f.review.open_items.push({ id: 'q1', critical: false, runnable_blocker: true, status: 'deferred' })],
    ['延期未交接', f => f.review.open_items.push({ id: 'q1', critical: false, runnable_blocker: false, status: 'deferred' })],
    ['无回复', f => { f.approval.record.responses = []; f.approval.save(); }],
    ['过期依据', f => f.write('plan.md', '变更后的范围')],
    ['错误范围', f => f.state.feature_id = 'feature.other'],
    ['调和未通过', f => f.review.context_reconciliation_ref = 'plan.md'],
  ];
  const valid = buildPlanFixture(path.join(temp, 'valid'));
  assert.equal(assertPlanSpecEntry(valid.state, { root: valid.root }).result, 'allowed');
  assert.equal(validateNextRoute('work-unit.plan-opportunity', 'work-unit.spec-synthesis', valid.state, { root: valid.root }).result, 'allowed');
  valid.review.open_items = [{ id: 'q-detail', critical: false, runnable_blocker: false, status: 'deferred', noncritical_reason: '不影响范围或关键规则', owner: '测试负责人', resolution_point: 'Spec 评审前', downstream_recipient: '测试需求负责人', evidence_refs: ['plan.md'] }];
  valid.reapprove();
  assert.equal(assertPlanSpecEntry(valid.state, { root: valid.root }).result, 'allowed', '用户确认后的非关键延期可通过');
  // Exercise the registered package/dispatch/completion path with synthetic evidence.
  const reviewFixture = buildPlanReviewFixture(valid.root);
  for (const row of Object.values(reviewFixture.checkpoint.checks)) { row.basis.push(reviewFixture.asset('plan.md')); row.evidence_refs.push('plan.md'); }
  reviewFixture.save();
  const combined = completeSyntheticPlanReview(reviewFixture);
  valid.state.plan_review_control = reviewFixture.checkpoint.plan_review_control;
  valid.state.checks = reviewFixture.checkpoint.checks;
  valid.setAggregateContext(combined);
  const checkDrafter = 'synthetic.plan-author';
  const internalApprovals = new Map();
  for (const [gateId, impact] of Object.entries({ 'check.domain-strategy-approved': 'domain_strategy', 'check.stage-decision-package-approved': 'stage_decision' })) {
    const row = reviewFixture.checkpoint.checks[gateId], approvalRef = combined.approvedRef;
    const record = structuredClone(combined.bundle.reviews.find(review => review.gate_id === gateId));
    internalApprovals.set(gateId, { approvalRef, record });
    valid.review.impacts[impact] = true;
    valid.review.internal_checks[gateId] = { ...row, review_package: true, evidence_refs: [...row.evidence_refs, row.subject_ref, approvalRef] };
    for (const ref of valid.review.internal_checks[gateId].evidence_refs) if (!valid.review.basis.some(asset => asset.ref === ref)) valid.review.basis.push({ ref, digest: decisionDigest(reviewFixture.read(ref)) });
  }
  valid.reapprove();
  assert.equal(assertPlanSpecEntry(valid.state, { root: valid.root }).result, 'allowed', '命中门禁、真实回复来源与当前资产绑定均通过');
  const currentReview = structuredClone(valid.review);
  for (const [gateId, { approvalRef, record }] of internalApprovals) {
    for (const [name, mutate, expected] of [
      ['缺少独立原始依据', gate => { gate.evidence_refs = gate.evidence_refs.filter(ref => [gate.subject_ref, gate.approval_ref].includes(ref)); }, /APPROVAL_CONTEXT_REQUIRED/],
      ['消费范围篡改', gate => { gate.approval_scope = ['feature.other']; }, /会签资产或范围不匹配/],
      ['消费主体摘要过期', gate => { gate.subject_digest = `sha256:${'0'.repeat(64)}`; }, /APPROVAL_CURRENT_INVALID/],
      ['批准依据摘要篡改', (_gate, approval) => { approval.basis[0].digest = '0'.repeat(64); }, /APPROVAL_CURRENT_INVALID|APPROVAL_BUNDLE_INVALID/],
      ['消费起草者篡改', gate => { gate.drafter_principal_ref = 'test-only.other-drafter'; }, /APPROVAL_CURRENT_INVALID/],
      ['批准缺少起草者', (_gate, approval) => { delete approval.drafter_principal_ref; }, /APPROVAL_CURRENT_INVALID|drafter_principal_ref/],
      ['起草者自签', (_gate, approval) => { approval.principal_ref = checkDrafter; }, /APPROVAL_CURRENT_INVALID|APPROVAL_BUNDLE_INVALID/],
    ]) {
      const invalidRecord = structuredClone(record);
      try {
        mutate(valid.review.internal_checks[gateId], invalidRecord);
        const invalidBundle = structuredClone(combined.bundle); invalidBundle.reviews[invalidBundle.reviews.findIndex(row => row.gate_id === gateId)] = invalidRecord;
        reviewFixture.write(approvalRef, invalidBundle);
        for (const row of Object.values(reviewFixture.checkpoint.checks)) row.basis.find(asset => asset.ref === approvalRef).digest = reviewFixture.asset(approvalRef).digest;
        reviewFixture.save();
        // Keep the outer Plan bytes current so this assertion exercises the internal approval boundary.
        valid.review.basis.find(asset => asset.ref === approvalRef).digest = decisionDigest(reviewFixture.read(approvalRef));
        valid.reapprove();
        assert.throws(() => assertPlanSpecEntry(valid.state, { root: valid.root }), expected, `${gateId}: ${name}`);
        process.stdout.write(`PASS 内部批准拒绝: ${gateId}: ${name}\n`);
      } finally {
        reviewFixture.write(approvalRef, combined.bundle);
        for (const row of Object.values(reviewFixture.checkpoint.checks)) row.basis.find(asset => asset.ref === approvalRef).digest = reviewFixture.asset(approvalRef).digest;
        reviewFixture.save();
        Object.assign(valid.review, structuredClone(currentReview));
        valid.reapprove();
      }
    }
  }
  assert.equal(assertPlanSpecEntry(valid.state, { root: valid.root }).result, 'allowed', '反例恢复后两项影响检查仍允许合法进入 Spec');
  valid.review.internal_checks['check.domain-strategy-approved'].approval_scope = ['feature.other']; valid.reapprove();
  assert.throws(() => assertPlanSpecEntry(valid.state, { root: valid.root }), /会签资产或范围不匹配/);
  for (const [name, mutate] of mutations) {
    const f = buildPlanFixture(path.join(temp, name)); mutate(f); f.save();
    assert.throws(() => assertPlanSpecEntry(f.state, { root: f.root }), undefined, name);
  }
  for (const checkpoint of [{ next_work_unit: 'work-unit.spec-synthesis' }, { stage: 'stage.spec-architecture' }, { stage_trace: { completed_work_unit: 'work-unit.spec-synthesis' } }]) {
    assert.throws(() => assertPlanCheckpoint({ repository_mode: 'project-instance', ...checkpoint }), /plan-spec-entry-blocked/);
  }
  const stale = buildPlanFixture(path.join(temp, 'stale-review'));
  stale.review.internal_checks['check.domain-strategy-approved'].reason += ' changed'; stale.save();
  assert.throws(() => assertPlanSpecEntry(stale.state, { root: stale.root }), /user-decision-stale/);
} finally { rmSync(temp, { recursive: true, force: true }); }
process.stdout.write('Plan → Spec 无状态绕过与默认加载检查通过\n');
