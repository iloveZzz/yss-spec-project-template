import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { gunzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { projectOperations as api } from '../../../plugins/yss-backend-delivery/project.mjs';
import { migrationApply } from '../../../plugins/yss-backend-delivery/migration.mjs';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const SOURCE = path.join(ROOT, '.template-source/plugins/yss-backend-delivery');
test('single entry and explicit M4 migration preserve project assets and fail closed', async t => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), 'yss-entry-migration-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const plugin = path.join(dir, 'plugin/yss-backend-delivery'), target = path.join(dir, 'project');
  const run = (file, args) => spawnSync(process.execPath, [file, ...args], { cwd: dir, encoding: 'utf8', timeout: 120000, maxBuffer: 32 * 1024 * 1024 });
  const ok = result => { assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout); };
  ok(run(path.join(SOURCE, 'build.mjs'), ['--output', plugin]));
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
  // Restore the exact M4 overlay over the identical pinned CLI base, then bind its registered digest.
  const legacy = JSON.parse(fs.readFileSync(path.join(SOURCE, 'legacy-m4.json')));
  const overlay = JSON.parse(gunzipSync(fs.readFileSync(path.join(ROOT, '.template-source/tooling/node/fixtures/plugin-migration/m4-overlay.json.gz'))));
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
  for (const file of overlay.files) {
    const dest = path.join(target, file.ref); fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(file.content, 'base64')); fs.chmodSync(dest, file.mode);
  }
  fs.writeFileSync(path.join(target, 'skills-lock.json'), Buffer.from(cliFiles.get('template/skills-lock.json').content, 'base64'));
  const receiptPath = path.join(target, '.yss-plugin.json'), receipt = JSON.parse(fs.readFileSync(receiptPath));
  Object.assign(receipt, { plugin: legacy.plugin, cli: legacy.cli, plugin_bundle_sha256: legacy.bundle_digest, core_digest: api.digest(legacy.binding) });
  fs.writeFileSync(receiptPath, JSON.stringify(receipt));
  const metadataPath = path.join(target, '.yss-template.json');
  api.withLegacyCli(plugin, oldCli => {
    const oldTarget = path.join(dir, 'legacy-baseline');
    const init = run(oldCli.bin, ['--project-name', '迁移机制测试', '--business-domain', '合成测试', '--team-size', '3',
      '--issue-tracker', 'github', '--no-example-docs', '--target-dir', oldTarget]);
    assert.equal(init.status, 0, init.stderr);
    fs.copyFileSync(path.join(oldTarget, '.yss-template.json'), metadataPath);
  });
  const lockRefresh = run(path.join(target, 'scripts/update-skill-lock'), []);
  assert.equal(lockRefresh.status, 0, lockRefresh.stderr || lockRefresh.stdout);
  const originalReceipt = fs.readFileSync(receiptPath);
  const business = put('project/docs/business-note.txt', 'Preserve user-owned business and approval evidence');
  const migration = () => command('project-migration-plan', ['--target-dir', target]);
  await t.test('unknown identity, drift and completed projects reject migration', () => {
    fs.writeFileSync(receiptPath, JSON.stringify({ ...receipt, plugin_bundle_sha256: 'unknown' }));
    assert.equal(migration().status, 1); fs.writeFileSync(receiptPath, originalReceipt);
    const scope = path.join(target, '.yss-execution-scope.yaml'), bytes = fs.readFileSync(scope);
    fs.appendFileSync(scope, '# drift'); assert.equal(migration().status, 1); fs.writeFileSync(scope, bytes);
    const terminal = put('project/.yss-backend-delivery.json', {});
    assert.equal(migration().status, 1); fs.rmSync(terminal);
  });
  let preview = ok(migration());
  await t.test('preview is read-only and stale plans cannot apply', () => {
    assert.deepEqual(fs.readFileSync(receiptPath), originalReceipt);
    assert.ok(preview.changes.some(change => change.ref === '.yss-plugin.json'));
    const file = put('migration.json', preview);
    fs.appendFileSync(business, '\nconcurrent edit');
    assert.equal(command('project-migration-apply', ['--plan', file]).status, 1);
    assert.match(fs.readFileSync(business, 'utf8'), /concurrent edit/);
  });
  preview = ok(migration());
  await t.test('verification failure rolls back original bytes without discarding the backup', () => {
    api.withCli(plugin, cli => {
      let checks = 0;
      assert.throws(() => migrationApply(plugin, preview, cli, { ...api, projectCheck(...args) {
        if (++checks === 4) throw new Error('synthetic-final-verification-failure');
        return api.projectCheck(...args);
      } }), /synthetic-final-verification-failure; rollback_conflicts=\[\]/);
    });
    assert.deepEqual(fs.readFileSync(receiptPath), originalReceipt);
    assert.ok(fs.existsSync(path.join(preview.backup_path, 'plan.json')));
    fs.renameSync(preview.backup_path, `${preview.backup_path}-failed-attempt`);
  });
  await t.test('known M4 source migrates and retains all original business evidence', () => {
    const before = fs.readFileSync(business);
    const result = ok(command('project-migration-apply', ['--plan', put('migration-current.json', preview)]));
    assert.equal(result.result, 'migrated'); assert.equal(result.ready_for_agent, false);
    assert.deepEqual(fs.readFileSync(business), before);
    assert.equal(result.binding.plugin, 'yss-backend-delivery');
    assert.equal(result.binding.migration.from_plugin, 'yss-plan-to-backend');
    ok(command('project-check', ['--target-dir', target]));
    assert.equal(command('project-migration-apply', ['--plan', path.join(dir, 'migration-current.json')]).status, 1);
  });
});
