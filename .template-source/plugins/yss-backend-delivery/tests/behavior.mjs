import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { historicalProject } from './historical.mjs';
import { inventory, restoreHistoricalBridge } from './recovery-only.mjs';
import { nativeBinaryPath } from '../runtime.mjs';

export function behavior(build, name, profile) {
  const binary = process.env.YSS_PLUGIN_TEST_BINARY;
  assert.ok(binary, 'YSS_PLUGIN_TEST_BINARY must identify the fixed tested binary');
  const parent = realpathSync(mkdtempSync(path.join(process.env.YSS_PLUGIN_TEST_ROOT || tmpdir(), `plugin-${profile}-`)));
  const plugin = path.join(parent, name), target = path.join(parent, 'project');
  const receipt = profile === 'design' ? '.yss-product-design-plugin.json' : '.yss-backend-plugin.json';
  const read = ref => readFileSync(path.join(target, ref));
  const run = (args, expected = 0) => {
    const result = spawnSync(process.execPath, [path.join(plugin, 'scripts/plugin.mjs'), ...args], { encoding: 'utf8', timeout: 120000, maxBuffer: 128 * 1024 * 1024 });
    assert.equal(result.status, expected, result.stderr || result.stdout);
    return JSON.parse(expected === 0 ? result.stdout : result.stderr.trim().split('\n').at(-1));
  };
  const save = value => { const file = path.join(parent, 'plan.json'); writeFileSync(file, JSON.stringify(value)); return file; };
  try {
    const built = build({ output: plugin, binary });
    assert.equal(built.release_ready, false);
    assert.ok(existsSync(path.join(plugin, nativeBinaryPath())));
    assert.equal(existsSync(path.join(plugin, 'assets/cli')), false);
    assert.equal(existsSync(path.join(plugin, 'assets/cli-package.json.gz')), false);
    const planned = run(['project-plan', '--target-dir', target, '--project-name', '原生插件验收', '--business-domain', '治理交付', '--issue-tracker', 'github']);
    assert.equal(existsSync(target), false, '预演不得创建项目目录');
    assert.ok(planned.preview.result.changes.some(item => item.path === receipt));
    const saved = save(planned);
    run(['project-bind-apply', '--plan', saved], 1);
    assert.equal(existsSync(target), false, '错误apply入口不得写入');
    run(['project-apply', '--plan', saved]);
    assert.equal(run(['project-check', '--target-dir', target]).result, 'binding-matched');
    const originalMetadata = read('.yss.json');
    const originalReceipt = read(receipt);
    assert.equal(JSON.parse(originalReceipt).business_execution_ready, false);
    const contextFile = path.join(target, 'CONTEXT.md'), validContext = read('CONTEXT.md');
    writeFileSync(contextFile, '无合同的词汇文档\n'); run(['project-check', '--target-dir', target], 1);
    assert.equal(read('CONTEXT.md').toString(), '无合同的词汇文档\n', 'Context校验失败不能自动重写业务词汇');
    writeFileSync(contextFile, validContext);
    assert.equal(run(['project-check', '--target-dir', target]).result, 'binding-matched');
    if (profile === 'spec') {
      const scope = read('.yss-execution-scope.yaml'), file = path.join(target, '.yss-execution-scope.yaml');
      rmSync(file); run(['project-check', '--target-dir', target], 1);
      writeFileSync(file, 'schema_version: 1\nscope_id: unrestricted\n');
      run(['project-check', '--target-dir', target], 1); writeFileSync(file, scope);
      assert.equal(run(['project-check', '--target-dir', target]).result, 'binding-matched');
    }
    writeFileSync(path.join(target, 'business.txt'), '客户业务资产\n');
    const observed = read(receipt);
    run(['project-recover', '--target-dir', target]);
    run(['project-rollback', '--target-dir', target]);
    assert.deepEqual(read(receipt), observed, '只读恢复/回退不得改变绑定');
    rmSync(path.join(target, receipt));
    const bind = run(['project-bind-plan', '--target-dir', target]);
    assert.equal(existsSync(path.join(target, receipt)), false);
    run(['project-bind-apply', '--plan', save(bind)]);
    assert.equal(run(['project-check', '--target-dir', target]).result, 'binding-matched');
    run(['project-rollback', '--target-dir', target, '--apply']);
    assert.equal(existsSync(path.join(target, receipt)), false, '绑定回退应删除本次绑定');
    assert.deepEqual(read('.yss.json'), originalMetadata, '绑定回退恢复原身份字节');
    assert.equal(read('business.txt').toString(), '客户业务资产\n');
    const rebind = run(['project-bind-plan', '--target-dir', target]);
    run(['project-bind-apply', '--plan', save(rebind)]);
    const previous = JSON.parse(read(receipt)); previous.plugin_version = 'older-fixture-version';
    const previousBytes = Buffer.from(JSON.stringify(previous)); writeFileSync(path.join(target, receipt), previousBytes);
    run(['project-check', '--target-dir', target], 1);
    const upgrade = run(['project-upgrade-plan', '--target-dir', target]);
    assert.deepEqual(read(receipt), previousBytes, '升级预演应保留旧绑定');
    run(['project-upgrade-apply', '--plan', save(upgrade)]);
    assert.equal(run(['project-check', '--target-dir', target]).result, 'binding-matched');
    run(['project-rollback', '--target-dir', target, '--apply']);
    assert.deepEqual(read(receipt), previousBytes, '升级回退恢复旧绑定原字节');
    const stale = run(['project-upgrade-plan', '--target-dir', target]);
    writeFileSync(path.join(target, receipt), JSON.stringify({ ...previous, note: '用户并发修改' }));
    run(['project-upgrade-apply', '--plan', save(stale)], 1);
    assert.equal(JSON.parse(read(receipt)).note, '用户并发修改');
    const pinned = path.join(plugin, built.native.binaryPath), before = readFileSync(pinned);
    writeFileSync(pinned, Buffer.concat([before, Buffer.from('tampered')]));
    run(['project-check', '--target-dir', target], 1);
    writeFileSync(pinned, before);
    return { profile, initialized: true, bind: true, upgrade: true, rollback: true, readonly_recovery: true, stale_plan_rejected: true };
  } finally { rmSync(parent, { recursive: true, force: true }); }
}

export function legacyMigration(build, name, profile, archived = false, history = null) {
  const source = process.env[profile === 'spec' ? 'YSS_PLUGIN_LEGACY_SPEC' : 'YSS_PLUGIN_LEGACY_DESIGN'];
  const archivedPlugin = process.env.YSS_PLUGIN_LEGACY_ARCHIVE_ROOT ? path.join(process.env.YSS_PLUGIN_LEGACY_ARCHIVE_ROOT, name) : null;
  const parent = realpathSync(mkdtempSync(path.join(process.env.YSS_PLUGIN_TEST_ROOT || tmpdir(), `legacy-plugin-${profile}-`)));
  const plugin = path.join(parent, name), target = path.join(parent, 'project');
  assert.ok(process.env.YSS_PLUGIN_TEST_BINARY, 'YSS_PLUGIN_TEST_BINARY required');
  assert.ok(archived || history ? archivedPlugin : source, 'fixed legacy recovery input required');
  const oldBin = source ? path.join(source, 'bin', profile === 'spec' ? 'create-yss-spec.js' : 'create-yss-harness-design.js') : null;
  let passed = false;
  try {
    build({ output: plugin, binary: process.env.YSS_PLUGIN_TEST_BINARY });
    const oldRun = (args, file = oldBin) => {
      const r = spawnSync(process.execPath, [file, ...args], { encoding: 'utf8', timeout: 120000, maxBuffer: 128 * 1024 * 1024 });
      assert.equal(r.status, 0, r.stderr || r.stdout); return r.stdout;
    };
    if (history) historicalProject(parent, target, history);
    else if (archived) {
      const oldEntry = path.join(archivedPlugin, 'scripts/plugin.mjs');
      const init = oldRun(['project-plan', '--target-dir', target, '--project-name', '真实归档插件迁移', '--business-domain', '治理', '--team-size', '1', '--issue-tracker', 'github'], oldEntry);
      const oldPlan = path.join(parent, 'legacy-plan.json'); writeFileSync(oldPlan, init);
      oldRun(['project-apply', '--plan', oldPlan], oldEntry);
    } else oldRun([...(profile === 'design' ? ['init'] : []), '--target-dir', target, '--project-name', '旧身份转换', '--business-domain', '治理', '--team-size', '1', '--issue-tracker', 'github', ...(profile === 'spec' ? ['--agent-runtime', 'codex'] : [])]);
    const oldMetadata = profile === 'spec' ? '.yss-template.json' : '.yss-harness-design.json';
    const before = readFileSync(path.join(target, oldMetadata));
    const legacy = archived || history ? readFileSync(path.join(target, '.yss-plugin.json')) : null;
    const context = readFileSync(path.join(target, 'CONTEXT.md'));
    writeFileSync(path.join(target, 'business.txt'), '旧业务资产');
    const run = args => {
      const result = spawnSync(process.execPath, [path.join(plugin, 'scripts/plugin.mjs'), ...args], { encoding: 'utf8', timeout: 120000, maxBuffer: 128 * 1024 * 1024 });
      assert.equal(result.status, 0, result.stderr || result.stdout); return JSON.parse(result.stdout);
    };
    const plan = run(['project-migration-plan', '--target-dir', target]);
    assert.equal(existsSync(path.join(target, '.yss.json')), false);
    const saved = path.join(parent, 'plan.json'); writeFileSync(saved, JSON.stringify(plan));
    run(['project-migration-apply', '--plan', saved]);
    assert.equal(run(['project-check', '--target-dir', target]).result, 'binding-matched');
    assert.deepEqual(readFileSync(path.join(target, oldMetadata)), before);
    if (legacy) assert.deepEqual(readFileSync(path.join(target, '.yss-plugin.json')), legacy);
    assert.deepEqual(readFileSync(path.join(target, 'CONTEXT.md')), context);
    run(['project-rollback', '--target-dir', target, '--apply']);
    assert.equal(existsSync(path.join(target, '.yss.json')), false);
    assert.equal(existsSync(path.join(target, profile === 'spec' ? '.yss-backend-plugin.json' : '.yss-product-design-plugin.json')), false);
    assert.deepEqual(readFileSync(path.join(target, oldMetadata)), before);
    if (legacy) assert.deepEqual(readFileSync(path.join(target, '.yss-plugin.json')), legacy);
    assert.deepEqual(readFileSync(path.join(target, 'CONTEXT.md')), context);
    assert.equal(readFileSync(path.join(target, 'business.txt'), 'utf8'), '旧业务资产');
    if (history) {
      const beforeAttempt = inventory(target);
      assert.throws(() => restoreHistoricalBridge(parent, target), /later edits block recovery/);
      assert.deepEqual(inventory(target), beforeAttempt, 'later business files block the first-stage restore without writes');
      // The extra native-stage business marker was not in the historical bridge
      // fixture. Its preservation is checked above; remove only our own marker
      // before proving the exact pre-bridge inventory can be restored.
      rmSync(path.join(target, 'business.txt'));
      const bridge = JSON.parse(readFileSync(path.join(parent, 'historical-bridge-plan.json')));
      const backup = path.join(bridge.backup_path, 'before/.yss-template.json'), backupBytes = readFileSync(backup);
      writeFileSync(backup, Buffer.concat([backupBytes, Buffer.from('\ncorrupt-backup')]));
      const beforeCorruptAttempt = inventory(target);
      assert.throws(() => restoreHistoricalBridge(parent, target));
      assert.deepEqual(inventory(target), beforeCorruptAttempt, 'all archive bytes must pass before any first-stage write');
      writeFileSync(backup, backupBytes);
      const recovery = restoreHistoricalBridge(parent, target);
      assert.equal(recovery.result, 'restored');
      const original = JSON.parse(readFileSync(path.join(parent, 'historical-original.json')));
      assert.deepEqual(readFileSync(path.join(target, '.yss-template.json')), Buffer.from(original.metadata, 'base64'));
      assert.deepEqual(readFileSync(path.join(target, '.yss-plugin.json')), Buffer.from(original.receipt, 'base64'));
      assert.deepEqual(readFileSync(path.join(target, 'CONTEXT.md')), context);
    }
    passed = true;
  } catch (error) { error.message += '\nlegacy fixture: ' + parent; throw error; }
  finally { if (passed || !process.env.YSS_PLUGIN_RETAIN_FAILED) rmSync(parent, { recursive: true, force: true }); }
}
