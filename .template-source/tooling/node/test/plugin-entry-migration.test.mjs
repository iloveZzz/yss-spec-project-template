import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { materializeTestPlugin } from '../scripts/tooling-fixture.mjs';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const SOURCE = path.join(ROOT, '.template-source/plugins/yss-backend-delivery');
test('single entry and explicit M4 migration preserve project assets and fail closed', async t => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), 'yss-entry-migration-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const plugin = path.join(dir, 'plugin/yss-backend-delivery'), target = path.join(dir, 'project');
  const run = (file, args) => spawnSync(process.execPath, [file, ...args], { cwd: dir, encoding: 'utf8', timeout: 120000, maxBuffer: 32 * 1024 * 1024 });
  const ok = result => { assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout); };
  materializeTestPlugin({ sourceRoot: ROOT, output: plugin, build: () => ok(run(path.join(SOURCE, 'build.mjs'), ['--output', plugin])) });
  const command = (name, args = []) => run(path.join(plugin, 'scripts/plugin.mjs'), [name, ...args]);
  const put = (ref, value) => { const file = path.join(dir, ref); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); return file; };
  const plan = ok(command('project-plan', ['--target-dir', target, '--project-name', '迁移机制测试', '--business-domain', '合成测试', '--team-size', '3', '--issue-tracker', 'github']));
  ok(command('project-apply', ['--plan', put('init.json', plan)]));
  await t.test('entry hands off to the bound local orchestrator without granting stage approval', () => {
    const entry = ok(command('project-entry', ['--target-dir', target, '--mode', 'new']));
    assert.equal(entry.result, 'project-local-handoff'); assert.equal(entry.next_work_unit, 'work-unit.plan-requirements');
    assert.equal(entry.effective_orchestrator, path.join(target, '.agents/skills/yss-product-lifecycle/SKILL.md'));
    assert.equal(entry.execution_started, false); assert.equal(entry.ready_for_agent, false);
    put('project/docs/synthetic-spec.md', 'Unapproved synthetic Spec');
    const reuse = ok(command('project-entry', ['--target-dir', target, '--mode', 'reuse', '--input', put('reuse.json', { artifact_refs: ['docs/synthetic-spec.md'] })]));
    assert.equal(reuse.next_work_unit, 'work-unit.entry-triage'); assert.equal(reuse.stage_verification_required, true);
    assert.equal(command('project-entry', ['--target-dir', target, '--mode', 'resume']).status, 1);
    assert.equal(command('project-entry', ['--target-dir', target, '--mode', 'reuse', '--input', put('bad.json', { artifact_refs: ['../outside'] })]).status, 1);
    assert.deepEqual(fs.readdirSync(path.join(plugin, 'skills')), ['backend-delivery']);
  });
  // Historical M4/v0.2/installed-plugin coverage is exercised by the recovery
  // archive matrix in plugins/*/tests/native.test.mjs; no legacy executor is bundled.
  const receiptPath = path.join(target, '.yss-backend-plugin.json');
  const current = JSON.parse(fs.readFileSync(receiptPath));
  const previous = Buffer.from(JSON.stringify({ ...current, plugin_version: 'prior-native-binding-fixture' }));
  fs.writeFileSync(receiptPath, previous);
  const business = put('project/docs/business-note.txt', 'Preserve user-owned business and approval evidence');
  const migration = () => command('project-upgrade-plan', ['--target-dir', target]);
  await t.test('unknown legacy identity and completed projects reject upgrades without writes', () => {
    const foreign = put('project/.yss-plugin.json', { plugin: 'yss-backend-delivery', plugin_bundle_sha256: '0'.repeat(64), business_execution_ready: false, execution_owner: 'project-local-yss-product-lifecycle' });
    assert.equal(migration().status, 1); fs.rmSync(foreign);
    const terminal = put('project/.yss-backend-delivery.json', {});
    assert.equal(migration().status, 1); fs.rmSync(terminal);
    assert.deepEqual(fs.readFileSync(receiptPath), previous);
  });
  let preview = ok(migration());
  await t.test('upgrade preview is read-only and concurrent binding changes cannot apply', () => {
    assert.deepEqual(fs.readFileSync(receiptPath), previous);
    assert.ok(preview.preview.result.changes.some(change => change.path === '.yss-backend-plugin.json'));
    const file = put('migration.json', preview);
    const edited = Buffer.from(JSON.stringify({ ...JSON.parse(previous), note: 'concurrent edit' }));
    fs.writeFileSync(receiptPath, edited);
    assert.equal(command('project-upgrade-apply', ['--plan', file]).status, 1);
    assert.deepEqual(fs.readFileSync(receiptPath), edited);
    fs.writeFileSync(receiptPath, previous);
  });
  preview = ok(migration());
  await t.test('public whole-transaction rollback restores original metadata and binding bytes', () => {
    const metadata = fs.readFileSync(path.join(target, '.yss.json'));
    ok(command('project-upgrade-apply', ['--plan', put('migration-current.json', preview)]));
    ok(command('project-check', ['--target-dir', target]));
    ok(command('project-rollback', ['--target-dir', target, '--apply']));
    assert.deepEqual(fs.readFileSync(receiptPath), previous);
    assert.deepEqual(fs.readFileSync(path.join(target, '.yss.json')), metadata);
    assert.ok(fs.existsSync(path.join(target, '.yss', 'transactions')), 'durable recovery journal remains available');
  });
  await t.test('reviewed public upgrade retains business evidence and replayed plan is rejected', () => {
    const before = fs.readFileSync(business);
    const saved = put('migration-final.json', ok(migration()));
    const result = ok(command('project-upgrade-apply', ['--plan', saved]));
    assert.equal(result.result, 'applied'); assert.equal(result.ready_for_agent, false);
    assert.deepEqual(fs.readFileSync(business), before);
    assert.equal(result.check.binding.plugin, 'yss-backend-delivery');
    ok(command('project-check', ['--target-dir', target]));
    assert.equal(command('project-upgrade-apply', ['--plan', saved]).status, 1);
  });
});
