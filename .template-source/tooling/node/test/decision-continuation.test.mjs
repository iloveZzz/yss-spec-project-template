import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildDecisionFixture, buildImplementationFixture } from '../../../../scripts/fixtures/user-decision/build-fixture.mjs';
import { buildPlanFixture } from '../../../../scripts/fixtures/user-decision/plan-fixture.mjs';
import { assertPlanSpecEntry } from '../../../../scripts/lib/plan-spec-entry.mjs';
import { assertUserDecisionRequirement, assertWorkUnitUserDecision, assertImplementationDecision, decisionDigest } from '../../../../scripts/lib/user-decision.mjs';
import { validateApprovalRecord, validateApprovalRecordFile, assertCheckpointUserDecisions } from '../../../../scripts/lib/approval-record.mjs';
import { loadDigitalHumanRoles } from '../../../../scripts/lib/digital-human-roles.mjs';

// Synthetic approvals only; never used to capture a real user's decision.
function fixture(run, boundary = 'gate.engineering-contract-approved') {
  const root = mkdtempSync(path.join(tmpdir(), 'yss-continuation-'));
  try {
    const save = (name, data) => { const ref = path.join(root, name); writeFileSync(ref, typeof data === 'string' ? data : JSON.stringify(data)); return ref; };
    const asset = ref => ({ ref, version: 'v1', digest: decisionDigest(readFileSync(ref)) });
    const before = asset(save('approved-snapshot.md', '已批准范围：只读查询，遵守现有 API 和质量基线。'));
    const external = { status: 'confirmed', requirements: [] };
    const externalRef = save('external.json', external);
    const subject = asset(save('candidate.json', { gate_id: boundary, change: '范围内工程细化' }));
    const decisionBasis = Object.fromEntries(['business_scope', 'acceptance', 'contract_commitments', 'authorization', 'risk_acceptance', 'quality', 'external_commitments'].map(key => [key, [`frozen:${key}`]]));
    const mandate = { schema_version: 1, kind: 'delivery-authorization', basis: [before], external_policy: asset(externalRef), targets: [{ boundary, subject_ref: subject.ref, scope: ['feature.demo'], decision_basis: decisionBasis }] };
    const mandateRef = save('mandate.json', mandate);
    const source = buildDecisionFixture(root, { boundary: 'delivery-scope', subjectRef: mandateRef });
    const basis = [asset(save('verification.txt', 'pnpm test exited 0 (synthetic fixture)'))];
    const review = { decision: 'approved', role_id: ['gate.spec-baseline-approved', 'gate.plan-approved'].includes(boundary) ? 'role.product-manager' : 'role.test-engineer', runtime_id: 'runtime.generic', principal_ref: 'synthetic.reviewer', drafter_principal_ref: 'synthetic.worker', classification: 'implementation-detail', material_changes: [], findings: [], boundary, scope: ['feature.demo'], subject, basis, decision_basis: decisionBasis, reason: '对照原授权，当前差异不改变已批准的决定依据', comparison: { before, after: subject } };
    const reviewRef = save('review.json', review);
    const proof = { schema_version: 1, kind: 'approved-scope-continuation-v1', boundary, scope: ['feature.demo'], subject, basis, source: source.requirement, review: asset(reviewRef) };
    const proofRef = save('continuation.json', proof);
    const requirement = { boundary, subject_ref: subject.ref, scope: ['feature.demo'], continuation_ref: proofRef };
    const refresh = () => { save('review.json', review); proof.review = asset(reviewRef); save('continuation.json', proof); };
    const approveMandate = () => { save('external.json', external); mandate.external_policy = asset(externalRef); save('mandate.json', mandate); source.record.request.items[0].subject = asset(mandateRef); source.present(); source.record.responses = []; source.respond(); source.save(); };
    const verify = () => assertUserDecisionRequirement(requirement);
    run({ root, save, asset, source, mandate, external, subject, basis, review, proof, requirement, refresh, approveMandate, verify });
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test('ordinary engineering work reuses explicit authorization through public approval and CLI', () => fixture(f => {
  assert.equal(f.verify().continued, true);
  validateApprovalRecord({ schema_version: 1, gate_id: f.requirement.boundary, decision: 'approved', actor_kind: 'digital-human', role_id: 'role.test-engineer', runtime_id: 'runtime.generic', principal_ref: 'synthetic.reviewer', drafter_principal_ref: 'synthetic.worker', subject_ref: f.subject.ref, approval_scope: f.requirement.scope, continuation_ref: f.requirement.continuation_ref }, { requireApproved: true });
  assertWorkUnitUserDecision('work-unit.technical-analysis', { user_decisions: [f.requirement] });
  assertCheckpointUserDecisions({ repository_mode: 'project-instance', status: 'running', stage_trace: { completed_work_unit: 'work-unit.technical-analysis' }, human_review: { user_decisions: [f.requirement] } });
  const input = f.save('requirement.json', f.requirement);
  const cli = spawnSync('node', [fileURLToPath(new URL('../../../../scripts/verify-user-decision', import.meta.url)), '--continuation', input], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr);
}));
test('product design can continue after independent review without a repeated human reply', () => fixture(f => {
  validateApprovalRecord({ schema_version: 1, gate_id: f.requirement.boundary, decision: 'approved', actor_kind: 'digital-human', role_id: 'role.test-engineer', runtime_id: 'runtime.generic', principal_ref: 'synthetic.reviewer', drafter_principal_ref: 'synthetic.worker', subject_ref: f.subject.ref, approval_scope: f.requirement.scope, continuation_ref: f.requirement.continuation_ref }, { requireApproved: true });
}, 'gate.product-design-approved'));
test('source approval continuation is verified by all three dedicated receivers', () => fixture(f => {
  const record = { schema_version: 1, gate_id: f.requirement.boundary, decision: 'approved', actor_kind: 'digital-human', role_id: 'role.test-engineer', runtime_id: 'runtime.generic', principal_ref: 'synthetic.reviewer', drafter_principal_ref: 'synthetic.worker', subject_ref: f.subject.ref, approval_scope: f.requirement.scope, continuation_ref: f.requirement.continuation_ref };
  const input = f.save('source-approval.json', { record, roles: loadDigitalHumanRoles() });
  for (const profile of ['design', 'backend', 'frontend']) {
    const moduleUrl = new URL(`../../../../submodules/yss-harness-${profile}-agent/scripts/lib/strategic-handoff.mjs`, import.meta.url).href;
    const code = `import {readFileSync} from 'node:fs'; import {sourceApproval} from ${JSON.stringify(moduleUrl)}; const {record,roles}=JSON.parse(readFileSync(process.argv[1])); await sourceApproval(record,roles,process.argv[2]);`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', code, input, f.root], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${profile}: ${result.stderr}`);
    const revoked = structuredClone(f.source.record); revoked.responses = [];
    writeFileSync(f.source.ref, JSON.stringify(revoked));
    const rejected = spawnSync(process.execPath, ['--input-type=module', '-e', code, input, f.root], { encoding: 'utf8' });
    assert.notEqual(rejected.status, 0, `${profile} accepted missing source approval`);
    f.source.save();
  }
}, 'gate.product-design-approved'));
test('Plan entry consumes continuation and still blocks incomplete checks', () => fixture(f => {
  const plan = buildPlanFixture(path.join(f.root, 'plan'));
  const subject = f.asset(plan.state.plan_review_ref);
  f.requirement.subject_ref = subject.ref; f.mandate.targets[0].subject_ref = subject.ref;
  f.proof.subject = subject; f.review.subject = subject; f.review.comparison.after = subject;
  f.approveMandate(); f.refresh();
  delete plan.state.plan_user_decision_ref; plan.state.plan_continuation_ref = f.requirement.continuation_ref;
  assert.equal(assertPlanSpecEntry(plan.state, { root: plan.root }).result, 'allowed');
  Object.values(plan.review.checks)[0].status = 'pending'; plan.save();
  assert.throws(() => assertPlanSpecEntry(plan.state, { root: plan.root }), /检查未通过/);
}, 'gate.plan-approved'));
test('implementation continuation preserves contract, repository and write-path checks', () => fixture(f => {
  const implementation = buildImplementationFixture(path.join(f.root, 'implementation'), 'feature.demo');
  const subject = f.asset(implementation.requirement.subject_ref);
  f.requirement.subject_ref = subject.ref; f.mandate.targets[0].subject_ref = subject.ref;
  const manifest = JSON.parse(readFileSync(subject.ref));
  f.mandate.targets[0].implementation_limits = { 'feature.demo': { repositories: manifest.slices[0].repositories, allowed_write_paths: manifest.slices[0].allowed_write_paths } };
  f.proof.subject = subject; f.review.subject = subject; f.review.comparison.after = subject;
  f.approveMandate(); f.refresh();
  implementation.state.user_decisions = [f.requirement];
  assert.doesNotThrow(() => assertImplementationDecision(implementation.state));
  writeFileSync(implementation.state.slice_contract_ref, 'changed contract');
  assert.throws(() => assertImplementationDecision(implementation.state), /stale/);
  manifest.slices[0].allowed_write_paths = ['src/**', 'production/**'];
  writeFileSync(subject.ref, JSON.stringify(manifest));
  f.proof.subject = f.asset(subject.ref); f.review.subject = f.proof.subject; f.review.comparison.after = f.proof.subject; f.refresh();
  assert.throws(() => assertImplementationDecision(implementation.state), /写路径超出/);
}, 'implementation-scope'));
test('no reply and revoked source authorization cannot continue', () => fixture(f => {
  f.source.record.responses = []; f.source.save(); assert.throws(f.verify, /response-required/);
  f.source.respond({ decision: 'revoked', text: '撤回同意' }); f.source.save(); assert.throws(f.verify, /not-approved/);
}));
test('new scope, new target and side effects cannot inherit authorization', () => fixture(f => {
  f.requirement.scope.push('new.scope'); assert.throws(f.verify, /范围不匹配/); f.requirement.scope.pop();
  f.requirement.boundary = 'release'; assert.throws(f.verify, /延续边界/);
}));
test('material changes and unclassified changes require a decision', () => fixture(f => {
  f.review.material_changes = ['acceptance']; f.refresh(); assert.throws(f.verify, /实质变化/);
  f.review.material_changes = []; f.review.classification = 'unknown'; f.refresh(); assert.throws(f.verify, /未知/);
}));
test('new risk, quality reduction or changed authorization cannot be labelled cosmetic', () => {
  for (const field of ['risk_acceptance', 'quality', 'authorization', 'contract_commitments']) fixture(f => {
    f.review.decision_basis = { ...f.review.decision_basis, [field]: ['changed'] }; f.refresh(); assert.throws(f.verify, /实质变化/);
  });
});
test('self review, wrong expertise, missing comparisons and stale verification block', () => fixture(f => {
  f.review.principal_ref = f.review.drafter_principal_ref; f.refresh(); assert.throws(f.verify, /独立/);
  f.review.principal_ref = 'synthetic.reviewer'; f.review.role_id = 'role.requirements-manager'; f.refresh(); assert.throws(f.verify, /能力/);
  f.review.role_id = 'role.test-engineer'; delete f.review.comparison; f.refresh(); assert.throws(f.verify, /前后差异/);
  writeFileSync(f.basis[0].ref, 'different result'); assert.throws(f.verify, /过期/);
}));
test('external policy unknown, missing approvals and changed policy cannot be waived', () => fixture(f => {
  f.external.status = 'unconfirmed'; f.approveMandate(); assert.throws(f.verify, /尚未确认/);
  f.external.status = 'confirmed'; f.external.requirements = [{ id: 'client-signoff', boundaries: [f.requirement.boundary], principals: ['person.requester'] }]; f.approveMandate(); assert.throws(f.verify, /强制审批缺失/);
  const reply = buildDecisionFixture(path.join(f.root, 'external'), { boundary: f.requirement.boundary, subjectRef: f.subject.ref });
  f.proof.external_decisions = [{ obligation_id: 'client-signoff', principal_ref: 'person.requester', requirement: reply.requirement }]; f.refresh(); assert.equal(f.verify().continued, true);
  f.save('external.json', { status: 'confirmed', requirements: [] }); assert.throws(f.verify, /过期/);
}));
test('suggestions do not block, unresolved defects and missing evidence do', () => fixture(f => {
  f.review.findings = [{ id: 'suggestion.1', kind: 'suggestion', reason: 'future cleanup', follow_up: 'backlog/1' }]; f.refresh(); assert.equal(f.verify().continued, true);
  for (const kind of ['requirement-violation', 'missing-evidence', 'important-risk']) {
    f.review.findings = [{ id: 'finding.1', kind, reason: 'not resolved', status: 'open' }]; f.refresh(); assert.throws(f.verify, /未解决/);
  }
}));
test('formatting refresh requires new current review but not another source reply', () => fixture(f => {
  const originalReply = JSON.stringify(f.source.record.responses);
  f.save('candidate.json', '{\n  "gate_id": "gate.engineering-contract-approved",\n  "change": "范围内工程细化"\n}\n');
  assert.throws(f.verify, /过期/);
  f.proof.subject = f.asset(f.subject.ref); f.review.subject = f.proof.subject; f.review.comparison.after = f.proof.subject; f.review.classification = 'presentation-only'; f.refresh();
  assert.equal(f.verify().continued, true); assert.equal(JSON.stringify(f.source.record.responses), originalReply);
}));
test('older receivers without continuation capability reject rather than silently approve', () => fixture(f => {
  const rolesDoc = loadDigitalHumanRoles(); delete rolesDoc.user_decision_policy.continuation;
  assert.throws(() => assertUserDecisionRequirement(f.requirement, { rolesDoc }), /延续边界/);
}));
test('one review bundle retains explicit per-check outcomes and rejects duplicates', () => fixture(f => {
  const record = id => ({ schema_version: 1, gate_id: id, decision: 'approved', actor_kind: 'digital-human', role_id: 'role.test-engineer', runtime_id: 'runtime.generic', principal_ref: 'synthetic.reviewer', drafter_principal_ref: 'synthetic.worker', subject_ref: f.subject.ref, subject_digest: f.subject.digest.slice(7) });
  const bundle = { schema_version: 1, kind: 'review-bundle', reviews: [record('check.design-reviewed'), record('check.architecture-reviewed')] };
  const ref = f.save('bundle.json', bundle); assert.equal(validateApprovalRecordFile(ref, { requireApproved: true }).length, 2);
  bundle.reviews[1].decision = 'rejected'; f.save('bundle.json', bundle); assert.throws(() => validateApprovalRecordFile(ref, { requireApproved: true }), /必须为 approved/);
  bundle.reviews[1] = bundle.reviews[0]; f.save('bundle.json', bundle); assert.throws(() => validateApprovalRecordFile(ref), /重复/);
  bundle.reviews = []; f.save('bundle.json', bundle); assert.throws(() => validateApprovalRecordFile(ref), /不能为空/);
}));
