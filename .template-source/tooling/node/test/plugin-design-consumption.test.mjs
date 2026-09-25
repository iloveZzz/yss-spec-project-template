import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fixture } from '../../../../scripts/fixtures/strategic-handoff/fixture.mjs';
import { finalizeDelivery } from '../../../../scripts/lib/strategic-handoff.mjs';
import { gunzipSync } from 'node:zlib';
import { projectOperations as api } from '../../../plugins/yss-backend-delivery/project.mjs';
import { consumerEntry } from '../../../../scripts/lib/strategic-handoff-routing.mjs';

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
  ok(run(path.join(ROOT, '.template-source/plugins/yss-backend-delivery/build.mjs'), ['--output', plugin]));
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
  await t.test('registered 0.2 project migrates while retaining receipt and business data', () => {
    const legacy = JSON.parse(fs.readFileSync(path.join(plugin, 'assets/legacy-0.2.json')));
    const overlay = JSON.parse(gunzipSync(fs.readFileSync(path.join(ROOT, '.template-source/tooling/node/fixtures/plugin-migration/v02-overlay.json.gz'))));
    const currentBinding = JSON.parse(fs.readFileSync(path.join(plugin, 'assets/project-binding.json')));
    const oldRefs = new Set(legacy.binding.map(x => x.ref));
    for (const item of currentBinding) if (!oldRefs.has(item.ref)) fs.rmSync(path.join(target, item.ref));
    const archive = JSON.parse(gunzipSync(fs.readFileSync(path.join(plugin, 'assets/legacy-cli-package.json.gz'))));
    const cliFiles = new Map(archive.files.map(item => [item.ref, item]));
    const snapshot = JSON.parse(Buffer.from(cliFiles.get('template.snapshot.json').content, 'base64'));
    const oldFiles = new Map(overlay.files.map(item => [item.ref, item]));
    const latest = JSON.parse(fs.readFileSync(path.join(plugin, 'assets/project-binding.json')));
    const legacyRefs = new Set(legacy.binding.map(item => item.ref));
    for (const item of latest) if (!legacyRefs.has(item.ref) && fs.existsSync(path.join(target, item.ref))) fs.rmSync(path.join(target, item.ref));
    for (const item of legacy.binding) {
      if (oldFiles.has(item.ref)) continue;
      const source = cliFiles.get(`template/${snapshot.encodedPaths?.[item.ref] || item.ref}`);
      assert.ok(source, `legacy source missing: ${item.ref}`);
      const file = path.join(target, item.ref); fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.from(source.content, 'base64')); fs.chmodSync(file, source.mode);
    }
    for (const item of overlay.files) { const file = path.join(target, item.ref); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, Buffer.from(item.content, 'base64')); fs.chmodSync(file, item.mode); }
    fs.writeFileSync(path.join(target, 'skills-lock.json'), Buffer.from(cliFiles.get('template/skills-lock.json').content, 'base64'));
    const receiptFile = path.join(target, '.yss-plugin.json'), binding = JSON.parse(fs.readFileSync(receiptFile));
    Object.assign(binding, { plugin: legacy.plugin, cli: legacy.cli, plugin_bundle_sha256: legacy.bundle_digest, core_digest: api.digest(legacy.binding) });
    fs.writeFileSync(receiptFile, JSON.stringify(binding));
    const metadataPath = path.join(target, '.yss-template.json');
    api.withLegacyCli(plugin, oldCli => {
      const oldTarget = path.join(dir, 'legacy-baseline');
      const init = run(oldCli.bin, ['--project-name', '合成接收验证', '--business-domain', '测试', '--team-size', '1',
        '--issue-tracker', 'github', '--no-example-docs', '--target-dir', oldTarget]);
      assert.equal(init.status, 0, init.stderr);
      fs.copyFileSync(path.join(oldTarget, '.yss-template.json'), metadataPath);
    });
    const lockRefresh = run(path.join(target, 'scripts/update-skill-lock'), []);
    assert.equal(lockRefresh.status, 0, lockRefresh.stderr || lockRefresh.stdout);
    const before = fs.readFileSync(path.join(target, receipt));
    const migration = ok(call('project-migration-plan', ['--target-dir', target]));
    assert.equal(migration.from_plugin, 'yss-backend-delivery');
    ok(call('project-migration-apply', ['--plan', put('migration.json', migration)]));
    assert.deepEqual(fs.readFileSync(path.join(target, receipt)), before);
    ok(call('project-entry', ['--target-dir', target, '--mode', 'reuse', '--input', path.join(dir, 'reuse.json')]));
  });
});
