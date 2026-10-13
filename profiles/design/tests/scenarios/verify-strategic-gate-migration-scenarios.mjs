#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { composeProfileTree } from '../../../../scripts/lib/profile-tree.mjs';

const profileRoot = composeProfileTree('design');
const { applyStrategicGateMigration, findStrategicGateMigrationIssues, inspectStrategicGateMigration } = await import(pathToFileURL(path.join(profileRoot, 'scripts/lib/strategic-gate-migration.mjs')));
const { validateJsonSchema } = await import(pathToFileURL(path.join(profileRoot, 'scripts/lib/json-schema.mjs')));

const temp = mkdtempSync(path.join(tmpdir(), 'strategic-gate-migration-'));
const put = (root, ref, value) => { const file = path.join(root, ref); mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`); return file; };
const oldCheckpoint = (workRoot) => ({ repository_mode: 'project-instance', status: 'routing', gates: {
  'gate.domain-strategy-approved': { status: 'approved', approval_ref: `${workRoot}/demo/domain-approval.json`, subject_ref: `${workRoot}/demo/plan.md`, evidence_refs: [`${workRoot}/demo/domain-approval.json`] },
  'gate.stage-decision-package-approved': { status: 'approved', approval_ref: `${workRoot}/demo/stage-approval.json`, subject_ref: `${workRoot}/demo/plan.md`, evidence_refs: [`${workRoot}/demo/stage-approval.json`] },
  'gate.spec-baseline-approved': { status: 'approved', approval_ref: `${workRoot}/demo/spec-approval.json` },
  'gate.user-confirmation': { status: 'approved', approval_ref: `${workRoot}/demo/ui-approval.json`, evidence_refs: [`${workRoot}/demo/prototype.html`] },
  'gate.strategic-design-handoff-approved': { status: 'approved', approval_ref: `${workRoot}/demo/handoff-approval.json` }
}, blockers: [] });
function fixture(root, workRoot) {
  put(root, '.template-spec/agents/issue-tracker.md', `---\ntracker:\n  platform: local-markdown\n  root: ${workRoot}\n---\n`);
  put(root, `${workRoot}/demo/checkpoint.json`, oldCheckpoint(workRoot));
  put(root, `${workRoot}/demo/plan-review.json`, { schema_version: 1, kind: 'plan-entry-review', feature_id: 'demo', gates: { 'gate.domain-strategy-approved': { status: 'approved', approval_ref: `${workRoot}/demo/domain-approval.json`, evidence_refs: [`${workRoot}/demo/plan.md`] } } });
  put(root, `${workRoot}/demo/domain-approval.json`, { schema_version: 1, gate_id: 'gate.domain-strategy-approved', decision: 'approved', actor_kind: 'digital-human' });
  put(root, `${workRoot}/demo/domain-approval-v2.json`, { schema_version: 2, gate_id: 'gate.domain-strategy-approved', decision: 'approved', actor_kind: 'digital-human' });
  put(root, `${workRoot}/demo/user-decision.json`, { schema_version: 1, kind: 'user-decision', decision: 'approved', raw_reply: '同意' });
  put(root, `${workRoot}/demo/verification.json`, { schema_version: 1, kind: 'verification', result: 'passed', evidence: 'original bytes' });
  put(root, `${workRoot}/demo/plan.md`, 'plan');
  put(root, 'docs/deliveries/strategic/demo/v1/delivery.json', { gate_id: 'gate.domain-strategy-approved' });
}

try {
 for (const workRoot of ['.work', 'docs/custom-work', 'docs/.scratch']) {
  const project = path.join(temp, workRoot.replaceAll('/', '-'), 'project'); fixture(project, workRoot);
  const checkpoint = path.join(project, `${workRoot}/demo/checkpoint.json`);
  const before = readFileSync(checkpoint);
  const frozen = readFileSync(path.join(project, 'docs/deliveries/strategic/demo/v1/delivery.json'));
  const plan = inspectStrategicGateMigration({ root: project, feature: 'demo' });
  assert.doesNotThrow(() => validateJsonSchema(plan, path.join(profileRoot, '.template-spec/process/schemas/strategic-gate-migration-plan.schema.json')));
  assert.equal(readFileSync(checkpoint).equals(before), true, '计划生成必须零写入');
  assert.deepEqual(plan.blockers, []);
  assert.deepEqual(plan.reapproval_required, ['gate.plan-approved', 'gate.product-design-approved', 'gate.spec-baseline-approved']);
  assert.equal(plan.historical_evidence.length, 2);
  const immutableRefs = ['domain-approval.json', 'domain-approval-v2.json', 'user-decision.json', 'verification.json'].map(name => `${workRoot}/demo/${name}`);
  const immutableBytes = immutableRefs.map(ref => readFileSync(path.join(project, ref)));
  assert.equal(findStrategicGateMigrationIssues({ root: project }).length > 0, true);
  for (const ref of ['../outside.json', 'docs/unrelated.json', '.template-spec/agents/issue-tracker.md', `${workRoot}/other/checkpoint.json`]) {
    const forged = structuredClone(plan); forged.operations[0].ref = ref;
    assert.throws(() => applyStrategicGateMigration(forged, { root: project }), /ref|WORK_LAYOUT|迁移范围|输入绑定/);
    assert.equal(readFileSync(checkpoint).equals(before), true, '范围拒绝必须发生在任何写入前');
  }
  const missingConfig = structuredClone(plan); missingConfig.inputs = missingConfig.inputs.filter(x => x.ref !== '.template-spec/agents/issue-tracker.md');
  assert.throws(() => applyStrategicGateMigration(missingConfig, { root: project }), /配置绑定/);
  const wrongBinding = structuredClone(plan); wrongBinding.operations[0].input_digest = '0'.repeat(64);
  assert.throws(() => applyStrategicGateMigration(wrongBinding, { root: project }), /输入绑定/);
  const duplicateOperation = structuredClone(plan); duplicateOperation.operations.push(duplicateOperation.operations[0]);
  assert.throws(() => applyStrategicGateMigration(duplicateOperation, { root: project }), /重复/);
  const rewriteHistory = structuredClone(plan), historicalRef = plan.historical_evidence[0].ref;
  rewriteHistory.historical_evidence = [];
  rewriteHistory.operations.push({ ...plan.operations[0], ref: historicalRef, input_digest: plan.inputs.find(x => x.ref === historicalRef).digest });
  assert.throws(() => applyStrategicGateMigration(rewriteHistory, { root: project }), /历史证据/);
  for (const ref of immutableRefs) {
    const forged = structuredClone(plan); forged.historical_evidence = [];
    forged.operations.push({ ...plan.operations[0], ref, input_digest: plan.inputs.find(input => input.ref === ref).digest });
    assert.throws(() => applyStrategicGateMigration(forged, { root: project }), /历史证据/);
    assert.equal(readFileSync(checkpoint).equals(before), true, '不可变证据拒绝必须零写入');
  }
  const arbitraryOutput = structuredClone(plan);
  const changedOutput = JSON.parse(Buffer.from(arbitraryOutput.operations[0].output, 'base64'));
  changedOutput.status = 'unauthorized-output';
  const outputBytes = Buffer.from(JSON.stringify(changedOutput));
  arbitraryOutput.operations[0].output = outputBytes.toString('base64');
  arbitraryOutput.operations[0].output_digest = createHash('sha256').update(outputBytes).digest('hex');
  assert.throws(() => applyStrategicGateMigration(arbitraryOutput, { root: project }), /受支持的迁移结果/);
  const recoveryLink = checkpoint + '.strategic-gate-migration.bak';
  symlinkSync(path.join(temp, 'missing-backup'), recoveryLink);
  assert.throws(() => applyStrategicGateMigration(plan, { root: project }), /恢复文件已存在/);
  assert.equal(readFileSync(checkpoint).equals(before), true);
  rmSync(recoveryLink);
  assert.equal(applyStrategicGateMigration(plan, { root: project }).result, 'applied');
  assert.equal(applyStrategicGateMigration(plan, { root: project }).result, 'already-applied');
  immutableRefs.forEach((ref, index) => assert.deepEqual(readFileSync(path.join(project, ref)), immutableBytes[index], ref));
  const migrated = JSON.parse(readFileSync(checkpoint, 'utf8'));
  assert.equal(migrated.gates['gate.plan-approved'].status, 'ready-for-human');
  assert.equal(migrated.gates['gate.spec-baseline-approved'].status, 'ready-for-human');
  assert.equal(migrated.gates['gate.product-design-approved'].status, 'ready-for-human');
  assert.equal(migrated.gates['gate.strategic-design-handoff-approved'].status, 'stale');
  assert.equal(migrated.checks['check.domain-strategy-approved'].historical_approval_ref.endsWith('domain-approval.json'), true);
  assert.equal(readFileSync(path.join(project, `${workRoot}/demo/domain-approval.json`), 'utf8').includes('gate.domain-strategy-approved'), true);
  assert.equal(readFileSync(path.join(project, 'docs/deliveries/strategic/demo/v1/delivery.json')).equals(frozen), true);
  assert.deepEqual(findStrategicGateMigrationIssues({ root: project }), []);

  const drift = path.join(temp, workRoot.replaceAll('/', '-'), 'drift'); fixture(drift, workRoot); const driftPlan = inspectStrategicGateMigration({ root: drift });
  writeFileSync(path.join(drift, `${workRoot}/demo/plan.md`), 'changed');
  const driftBefore = readFileSync(path.join(drift, `${workRoot}/demo/checkpoint.json`));
  assert.throws(() => applyStrategicGateMigration(driftPlan, { root: drift }), /输入摘要漂移/);
  assert.equal(readFileSync(path.join(drift, `${workRoot}/demo/checkpoint.json`)).equals(driftBefore), true, '漂移失败必须原子保持');

  const unknown = path.join(temp, workRoot.replaceAll('/', '-'), 'unknown'); fixture(unknown, workRoot); const value = oldCheckpoint(workRoot); value.gates['gate.unknown-old'] = { status: 'approved' };
  put(unknown, `${workRoot}/demo/checkpoint.json`, value);
  const unknownPlan = inspectStrategicGateMigration({ root: unknown });
  assert.match(unknownPlan.blockers.join('\n'), /未知 gate/);
  assert.throws(() => applyStrategicGateMigration(unknownPlan, { root: unknown }), /存在阻塞/);

  const duplicate = path.join(temp, workRoot.replaceAll('/', '-'), 'duplicate'); fixture(duplicate, workRoot); const duplicateValue = oldCheckpoint(workRoot); duplicateValue.checks = { 'check.domain-strategy-approved': { status: 'passed' } };
  put(duplicate, `${workRoot}/demo/checkpoint.json`, duplicateValue);
  assert.match(inspectStrategicGateMigration({ root: duplicate }).blockers.join('\n'), /重复迁移目标/);
  const configDrift = path.join(temp, 'config-drift-' + workRoot.replaceAll('/', '-')); fixture(configDrift, workRoot);
  const configPlan = inspectStrategicGateMigration({ root: configDrift });
  put(configDrift, '.template-spec/agents/issue-tracker.md', '---\ntracker:\n  platform: local-markdown\n  root: changed-work\n---\n');
  assert.throws(() => applyStrategicGateMigration(configPlan, { root: configDrift }), /输入摘要漂移/);
  assert.equal(JSON.parse(readFileSync(path.join(configDrift, workRoot, 'demo/checkpoint.json'))).gates['gate.domain-strategy-approved'].status, 'approved');
  const linkProject = path.join(temp, 'symlink-' + workRoot.replaceAll('/', '-')); fixture(linkProject, workRoot);
  const linkPlan = inspectStrategicGateMigration({ root: linkProject, feature: 'demo' });
  const linkFile = path.join(linkProject, workRoot, 'demo/checkpoint.json');
  const outside = put(temp, 'outside.json', oldCheckpoint(workRoot));
  const outsideBytes = readFileSync(outside); rmSync(linkFile); symlinkSync(outside, linkFile);
  assert.throws(() => applyStrategicGateMigration(linkPlan, { root: linkProject }), /symlink/);
  assert.equal(readFileSync(outside).equals(outsideBytes), true);
  console.log('战略门禁迁移场景通过：零写入、摘要漂移、原子失败、幂等、未知 ID、历史保留和重新确认');
 }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
