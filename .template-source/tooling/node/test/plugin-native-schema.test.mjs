import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { build } from '../../../plugins/yss-backend-delivery/build.mjs';
import { nativeBinary, inspectNative } from '../../../scripts/lib/native-yss.mjs';
import { treeInventory } from '../scripts/tooling-fixture.mjs';

test('known native Bundle4/5 initialize matching governed metadata without weakening project checks', t => {
  const { binary } = nativeBinary(), snapshot = inspectNative('backend');
  assert.ok([4, 5].includes(snapshot.schemaVersion));
  t.diagnostic(`real Bundle schema ${snapshot.schemaVersion}, template ${snapshot.templateCommit}`);
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), 'plugin-native-schema-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const plugin = path.join(dir, 'yss-backend-delivery'), target = path.join(dir, 'project');
  build({ binary, output: plugin });
  const call = (command, args = []) => spawnSync(process.execPath, [path.join(plugin, 'scripts/plugin.mjs'), command, ...args],
    { cwd: dir, encoding: 'utf8', timeout: 120000, maxBuffer: 32 * 1024 * 1024 });
  const ok = result => { assert.equal(result.status, 0, result.stderr || result.stdout); return JSON.parse(result.stdout); };
  const plan = ok(call('project-plan', ['--target-dir', target, '--project-name', '原生版本合同', '--business-domain', '合成验证', '--issue-tracker', 'github']));
  assert.equal(fs.existsSync(target), false);
  const planFile = path.join(dir, 'plan.json'); fs.writeFileSync(planFile, JSON.stringify(plan));
  assert.equal(ok(call('project-apply', ['--plan', planFile])).ready_for_agent, false);
  const metadataFile = path.join(target, '.yss.json'), original = fs.readFileSync(metadataFile), metadata = JSON.parse(original);
  assert.equal(metadata.schemaVersion, snapshot.schemaVersion);
  assert.equal(metadata.templateCommit, snapshot.templateCommit);
  assert.equal(metadata.snapshotHash, snapshot.sourceSnapshotHash);
  assert.equal(metadata.manifestHash, snapshot.manifestHash);
  assert.equal(metadata.templateSourceState, 'committed');
  if (snapshot.schemaVersion === 5) assert.equal(metadata.distribution.installation, 'governed');
  assert.match(fs.readFileSync(path.join(target, 'yss-project.yaml'), 'utf8'), /repository_mode: project-instance/);
  fs.writeFileSync(path.join(target, 'user-note.txt'), '用户保留文件', { mode: 0o600 });
  const before = treeInventory(target);
  assert.equal(ok(call('project-check', ['--target-dir', target])).result, 'binding-matched');
  assert.deepEqual(treeInventory(target), before);
  for (const [key, value] of [
    ['schemaVersion', 999], ['schemaVersion', snapshot.schemaVersion === 4 ? 5 : 4], ['profile', 'spec'],
    ['templateCommit', '0'.repeat(40)], ['snapshotHash', '0'.repeat(64)], ['manifestHash', '0'.repeat(64)], ['templateSourceState', 'unknown'],
    ...(snapshot.schemaVersion === 5 ? [['distribution', { ...metadata.distribution, installation: 'skills' }]] : [])
  ]) {
    try {
      fs.writeFileSync(metadataFile, JSON.stringify({ ...metadata, [key]: value }));
      const changed = treeInventory(target);
      assert.equal(call('project-check', ['--target-dir', target]).status, 1, key);
      assert.deepEqual(treeInventory(target), changed, `${key} rejection must be read-only`);
    } finally { fs.writeFileSync(metadataFile, original); }
  }
  const skill = path.join(target, '.agents/skills/harness-orchestrator/SKILL.md'), mode = fs.statSync(skill).mode & 0o777;
  try {
    fs.chmodSync(skill, 0o755);
    const changed = treeInventory(target);
    assert.equal(call('project-check', ['--target-dir', target]).status, 1);
    assert.deepEqual(treeInventory(target), changed, 'permission rejection must be read-only');
  } finally { fs.chmodSync(skill, mode); }
});
