import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { resourceIdentity, inspectSkill, assessDiscovery, codexCatalog } from '../../../../scripts/lib/skill-discovery.mjs';

function fixture(fn) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'yss-discovery-'));
  try { return fn(root); } finally { rmSync(root, { recursive: true, force: true }); }
}
function skill(root, folder = 'canonical') {
  const directory = path.join(root, folder); mkdirSync(directory);
  const file = path.join(directory, 'SKILL.md'); writeFileSync(file, '---\nname: demo\ndescription: Demo task\n---\nBody\n');
  return file;
}
const expected = { runtime: 'codex', version: 'test', cwd: '/fixture' };
function assess(registered, entries, options = {}) {
  return assessDiscovery({ registered, observation: { ...expected, status: 'observed', entries }, expected, ...options });
}
test('resource equality includes scripts and policy, not just entry bytes', () => fixture((root) => {
  const a = inspectSkill(skill(root)), b = inspectSkill(skill(root, 'projection'));
  assert.equal(a.resource.sha256, b.resource.sha256);
  assert.equal(assess([a], [a, b]).findings[0].code, 'equivalent-resource-duplicates');
  mkdirSync(path.join(root, 'projection/scripts')); writeFileSync(path.join(root, 'projection/scripts/run.sh'), 'changed');
  assert.equal(assess([a], [a, b]).findings[0].code, 'catalog-source-conflict');
}));
test('symlink projection works but cycles and escaping resources cannot establish equality', () => fixture((root) => {
  const file = skill(root); symlinkSync(path.dirname(file), path.join(root, 'projection'));
  assert.equal(inspectSkill(path.join(root, 'projection/SKILL.md')).resource.sha256, inspectSkill(file).resource.sha256);
  symlinkSync(path.dirname(file), path.join(root, 'canonical/cycle'));
  assert.throws(() => resourceIdentity(path.dirname(file)), /cycle/);
  rmSync(path.join(root, 'canonical/cycle')); writeFileSync(path.join(root, 'external'), 'outside');
  symlinkSync(path.join(root, 'external'), path.join(root, 'canonical/escape'));
  assert.equal(inspectSkill(file).status, 'unknown');
}));
test('required selections bind host cwd version dependency closure and effective policy', () => fixture((root) => {
  const a = { ...inspectSkill(skill(root)), dependency_digest: 'deps', effective_policy_digest: 'policy' };
  const selected = { ...a, ...expected, evidence: 'actual-trace:1' };
  assert.equal(assess([a], [a], { required: ['demo'] }).status, 'blocked');
  assert.equal(assess([a], [a], { required: ['demo'], selections: [selected] }).status, 'catalog-observed-only');
  for (const change of [{ version: 'stale' }, { cwd: '/other' }, { dependency_digest: null }, { effective_policy_digest: 'different' }]) {
    assert.equal(assess([a], [a], { required: ['demo'], selections: [{ ...selected, ...change }] }).status, 'blocked');
  }
  assert.equal(assess([a], [a], { required: ['absent'] }).status, 'blocked');
  assert.equal(assess([a], [a], { required: ['demo'], selections: [selected], observation: { ...expected, status: 'unknown' } }).status, 'blocked');
}));
test('unrelated personal entries do not block and selected different resources do', () => fixture((root) => {
  const a = inspectSkill(skill(root)), file = skill(root, 'user');
  writeFileSync(file, '---\nname: demo\ndescription: Different\n---\nDifferent\n');
  assert.equal(assess([a], [{ name: 'unrelated', path: '/not-read' }]).findings.length, 0);
  assert.equal(assess([a], [a], { required: ['demo'], selections: [{ ...expected, name: 'demo', path: file, evidence: 'trace:1' }] }).findings[0].code, 'selected-unregistered-source');
}));
test('actual selections are checked even when not listed as required', () => fixture((root) => {
  const a = inspectSkill(skill(root)), file = skill(root, 'user');
  writeFileSync(file, '---\nname: demo\ndescription: Changed\n---\nChanged\n');
  const selections = [{ ...expected, name: 'demo', path: file, evidence: 'trace:1' }];
  assert.equal(assess([a], [a], { selections }).status, 'blocked');
  assert.equal(assess([a], [a], { selections: [{ ...selections[0], name: 'unregistered' }] }).findings[0].code, 'selected-skill-unregistered');
}));
test('runtime start failure is not an empty successful catalog', async () => {
  await assert.rejects(codexCatalog('/nonexistent-yss-runtime', os.tmpdir(), 100), /ENOENT/);
});
test('malformed catalog and hung host fail closed within the observation deadline', async (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'yss-discovery-host-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const host = path.join(root, 'host');
  writeFileSync(host, '#!/usr/bin/env node\nprocess.stdin.on("data",()=>process.stdout.write("not-json\\n"));\n', { mode: 0o755 });
  await assert.rejects(codexCatalog(host, root, 1000), /JSON|Unexpected/);
  writeFileSync(host, '#!/usr/bin/env node\nprocess.stdin.resume();\n', { mode: 0o755 });
  await assert.rejects(codexCatalog(host, root, 50), /timed out/);
});
