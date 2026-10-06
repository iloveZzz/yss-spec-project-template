import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fixture } from '../../../../scripts/fixtures/strategic-handoff/fixture.mjs';
import { finalizeDelivery } from '../../../../scripts/lib/strategic-handoff.mjs';
import { consumerEntry } from '../../../../scripts/lib/strategic-handoff-routing.mjs';
import { materializeTestPlugin } from '../scripts/tooling-fixture.mjs';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
test('consumer mapping preserves dedicated backend identity and rejects unknown wire IDs or out-of-profile targets', t => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), 'consumer-entry-policy-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const source = path.join(ROOT, 'submodules/yss-harness-backend-agent');
  for (const ref of ['.template-spec/process/harness-profile.yaml', '.template-spec/process/lifecycle-registry.yaml', '.agents/skills/harness-orchestrator/references/orchestration-contract.yaml']) {
    fs.mkdirSync(path.dirname(path.join(dir, ref)), { recursive: true });
    fs.copyFileSync(path.join(source, ref), path.join(dir, ref));
  }
  assert.equal(consumerEntry(dir, 'backend-technical-design', 'work-unit.technical-design').target_work_unit, 'work-unit.technical-design');
  assert.throws(() => consumerEntry(dir, 'backend-technical-design', 'work-unit.technical-analysis'), /unmapped/);
  assert.throws(() => consumerEntry(dir, 'backendTechnicalDesign', 'work-unit.technical-design'), /unmapped/);
  fs.writeFileSync(path.join(dir, '.template-spec/process/harness-profile.yaml'), JSON.stringify({ profile_id: 'harness.backend-delivery', lifecycle: { allowed_work_units: [] } }));
  assert.throws(() => consumerEntry(dir, 'backend-technical-design', 'work-unit.technical-design'), /outside-profile/);
});

test('backend plugin receives Handoff v5 without bypassing engineering or implementation gates', async t => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), 'design-consumption-test-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const plugin = path.join(dir, 'plugin/yss-backend-delivery'), target = path.join(dir, 'backend-governance');
  const run = (file, args) => spawnSync(process.execPath, [file, ...args], { encoding: 'utf8', timeout: 120000, maxBuffer: 32 * 1024 * 1024 });
  const ok = r => { assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };
  materializeTestPlugin({ sourceRoot: ROOT, output: plugin, build: () => ok(run(path.join(ROOT, '.template-source/plugins/yss-backend-delivery/build.mjs'), ['--output', plugin])) });
  const call = (command, args = []) => run(path.join(plugin, 'scripts/plugin.mjs'), [command, ...args]);
  const put = (ref, data) => { const file = path.join(dir, ref); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data)); return file; };
  const plan = ok(call('project-plan', ['--target-dir', target, '--project-name', '合成接收验证', '--business-domain', '测试', '--team-size', '1', '--issue-tracker', 'github']));
  ok(call('project-apply', ['--plan', put('plan.json', plan)]));
  const source = path.join(dir, 'synthetic-source'); fs.mkdirSync(source);
  await fixture(source, { handoffVersion: 5 });
  const delivery = await finalizeDelivery({ sourceRoot: source, handoffRef: 'handoff.yaml', zip: true });
  let receipt;
  await t.test('formal directory import selects only backend responsibility and maps wire entry', () => {
    const result = ok(call('project-import-design', ['--target-dir', target, '--bundle', delivery.delivery]));
    receipt = result.import_receipt_ref;
    assert.equal(result.next_work_unit, 'work-unit.technical-analysis');
    assert.equal(result.source_work_unit, 'work-unit.technical-design');
    assert.equal(result.ready_for_agent, false);
    const saved = JSON.parse(fs.readFileSync(path.join(target, receipt)));
    assert.equal(saved.schema_version, 3);
    assert.deepEqual(saved.selected_consumer_capabilities, ['backend-technical-design']);
    assert.equal(saved.status, 'pending-context-reconciliation');
    assert.equal(fs.existsSync(path.join(target, path.dirname(receipt), 'consumer-status-index-draft.json')), false);
  });
  await t.test('reuse and duplicate import reverify immutable source without approving it', () => {
    const input = put('reuse.json', { import_receipt_ref: receipt });
    const first = fs.readFileSync(path.join(target, receipt));
    const result = ok(call('project-entry', ['--target-dir', target, '--mode', 'reuse', '--input', input]));
    assert.equal(result.next_work_unit, 'work-unit.technical-analysis');
    assert.equal(result.ready_for_agent, false);
    assert.ok(result.design.pending.includes('engineering-design-and-consumption'));
    ok(call('project-import-design', ['--target-dir', target, '--bundle', delivery.delivery]));
    assert.deepEqual(fs.readFileSync(path.join(target, receipt)), first);
  });
  await t.test('transport ZIP imports into another governance root with the existing v2 receipt contract', () => {
    const zipTarget = path.join(dir, 'ZIP 接收端');
    const zipPlan = ok(call('project-plan', ['--target-dir', zipTarget, '--project-name', 'ZIP 验证', '--business-domain', '测试', '--team-size', '1', '--issue-tracker', 'github']));
    ok(call('project-apply', ['--plan', put('zip-plan.json', zipPlan)]));
    const imported = ok(call('project-import-design', ['--target-dir', zipTarget, '--bundle', path.join(delivery.delivery, 'package.zip')]));
    const saved = JSON.parse(fs.readFileSync(path.join(zipTarget, imported.import_receipt_ref)));
    assert.equal(saved.schema_version, 2);
    assert.equal(imported.next_work_unit, 'work-unit.technical-analysis');
    assert.equal(imported.ready_for_agent, false);
    const resumed = ok(call('project-entry', ['--target-dir', zipTarget, '--mode', 'reuse', '--input', put('zip-reuse.json', { import_receipt_ref: imported.import_receipt_ref })]));
    assert.equal(resumed.design.bundle_digest, imported.bundle_digest);
  });
  await t.test('tampered receipt and package cannot be resumed', () => {
    const ref = path.join(target, receipt), original = fs.readFileSync(ref), saved = JSON.parse(original);
    fs.writeFileSync(ref, JSON.stringify({ ...saved, bundle_digest: `sha256:${'0'.repeat(64)}` }));
    assert.equal(call('project-entry', ['--target-dir', target, '--mode', 'reuse', '--input', path.join(dir, 'reuse.json')]).status, 1);
    fs.writeFileSync(ref, original);
    const record = path.join(target, path.dirname(receipt), 'source-delivery-record.json'), bytes = fs.readFileSync(record);
    fs.appendFileSync(record, ' ');
    assert.equal(call('project-entry', ['--target-dir', target, '--mode', 'reuse', '--input', path.join(dir, 'reuse.json')]).status, 1);
    fs.writeFileSync(record, bytes);
  });
  await t.test('UI-only package is rejected before any import write', async () => {
    const ui = path.join(dir, 'ui-only'); fs.mkdirSync(ui);
    await fixture(ui, { handoffVersion: 5, impacts: { ui: true, frontend: true, api: false, data: false, backend: false, cross_repo: false, high_risk: false } });
    const packaged = await finalizeDelivery({ sourceRoot: ui, handoffRef: 'handoff.yaml' });
    const result = call('project-import-design', ['--target-dir', target, '--bundle', packaged.delivery]);
    assert.equal(result.status, 1); assert.match(result.stderr, /backend-consumer-route-not-active/);
  });
  await t.test('native public upgrade retains imported receipt and business data', () => {
    const bindingFile = path.join(target, '.yss-backend-plugin.json');
    const binding = JSON.parse(fs.readFileSync(bindingFile));
    fs.writeFileSync(bindingFile, JSON.stringify({ ...binding, plugin_version: 'previous-fixture' }));
    const before = fs.readFileSync(path.join(target, receipt));
    const migration = ok(call('project-upgrade-plan', ['--target-dir', target]));
    assert.equal(migration.kind, 'upgrade');
    ok(call('project-upgrade-apply', ['--plan', put('migration.json', migration)]));
    assert.deepEqual(fs.readFileSync(path.join(target, receipt)), before);
    ok(call('project-entry', ['--target-dir', target, '--mode', 'reuse', '--input', path.join(dir, 'reuse.json')]));
  });
});
