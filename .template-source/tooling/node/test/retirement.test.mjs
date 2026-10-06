import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileDigest, digest } from '../../../../scripts/lib/read-only-intake.mjs';
import { loadSkillRegistry, resolveSkillForNewUse } from '../../../../scripts/lib/skill-registry.mjs';
const root = path.resolve(import.meta.dirname, '../../../..');
test('retired entries reject new use without mutating the registry', () => {
  const registry = loadSkillRegistry(), before = JSON.stringify(registry);
  for (const id of ['wait-what', 'grill-with-docs', 'to-questionnaire', 'improve-codebase-architecture']) {
    assert.throws(() => resolveSkillForNewUse(registry, id), error => error.code === 'skill-retired');
  }
  assert.equal(JSON.stringify(registry), before);
});
test('legacy initializer rejects before creating or overwriting a target', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'retirement-'));
  try {
    const target = path.join(temp, 'project');
    const run = () => spawnSync(process.execPath, [path.join(root, 'scripts/instantiate-harness'), '--target', target], {encoding:'utf8'});
    assert.equal(run().status, 1); assert.equal(fs.existsSync(target), false);
    fs.mkdirSync(target); fs.writeFileSync(path.join(target, 'sentinel'), 'user-owned');
    const result=run(); assert.equal(result.status, 1); assert.match(result.stderr, /yss init --root <新目录> --profile backend/); assert.match(result.stderr, /yss init --root <新目录> --profile frontend/);
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
