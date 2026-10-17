import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileDigest, digest } from '../../../../scripts/lib/read-only-intake.mjs';
import { loadSkillRegistry, resolveSkillForNewUse } from '../../../../scripts/lib/skill-registry.mjs';
import { loadOrchestrationContract } from '../../../../scripts/lib/orchestration-contract.mjs';
const root = path.resolve(import.meta.dirname, '../../../..');
test('git-version instances retire the old orchestration contract only from the exact published source', () => {
  const policy = JSON.parse(fs.readFileSync(path.join(root, '.template-source/distribution/bundle-profile.json')));
  const oldRef = '.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml';
  const rules = policy.upgradePolicy.rules.filter(rule => rule.sourcePath === oldRef);
  const rule = rules.find(rule => rule.from.templateVersion?.startsWith('git:'));
  assert.ok(rule, 'an exact git-version source must be declared');
  assert.deepEqual(rule.from, {
    profile: 'spec',
    templateCommit: '7af9715c6136d1b48e2c731fe92603806d7bf22a',
    sourceSnapshotHash: 'dd5b96979d4bc41206df5334b3974ccb7e8ad009690c4abcfde67d8c9943e3c8',
    bundleHash: '94430d30a1f5ff40766db1f9f250f40de64b68ed8ea0b9477408ff818b0e9e52',
    templateVersion: 'git:7af9715c6136d1b48e2c731fe92603806d7bf22a'
  });
  assert.equal(rule.action, 'delete');
  assert.ok(rules.some(row => row.from.versions?.max === '4.0.5'), 'retain the existing version-range migration');
  assert.equal(fs.existsSync(path.join(root, oldRef)), false);
  const contract = loadOrchestrationContract(ref => fs.readFileSync(path.join(root, ref)), '.template-spec/process/orchestration-contract.yaml');
  assert.ok(contract.refs.length > 1);
  assert.ok(contract.value.work_unit_routes['work-unit.prototype-design-v2']);
});
test('retired entries reject new use without mutating the registry', () => {
  const registry = loadSkillRegistry(), before = JSON.stringify(registry);
  for (const id of ['wait-what', 'grill-with-docs', 'to-questionnaire', 'improve-codebase-architecture']) {
    assert.throws(() => resolveSkillForNewUse(registry, id), error => error.code === 'skill-retired');
  }
  assert.equal(JSON.stringify(registry), before);
});
test('legacy initializer is absent and cannot create or overwrite a target', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'retirement-'));
  try {
    const target = path.join(temp, 'project');
    assert.equal(fs.existsSync(path.join(root, 'scripts/instantiate-harness')), false);
    const run = () => spawnSync(process.execPath, [path.join(root, 'scripts/instantiate-harness'), '--target', target], {encoding:'utf8'});
    assert.equal(run().status, 1); assert.equal(fs.existsSync(target), false);
    fs.mkdirSync(target); fs.writeFileSync(path.join(target, 'sentinel'), 'user-owned');
    const result=run(); assert.equal(result.status, 1); assert.match(result.stderr, /MODULE_NOT_FOUND|Cannot find module/);
    assert.deepEqual(fs.readdirSync(target), ['sentinel']); assert.equal(fs.readFileSync(path.join(target, 'sentinel'), 'utf8'), 'user-owned');
  } finally {fs.rmSync(temp, {recursive:true,force:true});}
});
test('streamed intake hashing preserves the exact digest across chunk boundaries', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'intake-digest-'));
  try {
    for(const size of [0, 17, 1048576, 1048609]) {
      const bytes=Buffer.alloc(size, 123), file=path.join(temp, 'data'); fs.writeFileSync(file, bytes);
      assert.equal(fileDigest(file), digest(bytes));
    }
  } finally {fs.rmSync(temp, {recursive:true,force:true});}
});
