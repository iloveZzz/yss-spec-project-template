import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {composeProfileTree} from '../scripts/lib/profile-tree.mjs';
import {shipped} from '../scripts/lib/profile-distribution.mjs';
import {parse} from '../scripts/vendor/yaml.mjs';

const root = path.resolve(import.meta.dirname, '..');

test('Spec and Backend delivery guidance names existing process documents', () => {
  const backend = composeProfileTree('backend', {root});
  const manifest = JSON.parse(readFileSync(path.join(root, 'profiles/backend/.template-source/distribution/bundle-profile.json'), 'utf8')).manifest;
  for (const [base, ref] of [
    [root, '.agents/skills/yss-implementation-contract-compiler/SKILL.md'],
    [root, '.agents/skills/yss-implementation-contract-compiler/references/slice-implementation-contract-v2.md'],
    [backend, '.agents/skills/yss-implementation-contract-compiler/SKILL.md'],
    [backend, '.agents/skills/harness-orchestrator/SKILL.md'],
  ]) {
    const text = readFileSync(path.join(base, ref), 'utf8');
    for (const target of new Set(text.match(/\.template-spec\/process\/[A-Za-z0-9/_-]+\.md/g) ?? [])) {
      assert.ok(existsSync(path.join(base, target)), `${ref} references missing ${target}`);
      if (base === backend) assert.ok(shipped(target, manifest), `${ref} references undistributed ${target}`);
    }
  }
});

test('Backend plan migration resolves to Backend policy, not Spec stage gates', () => {
  const backend = composeProfileTree('backend', {root});
  const planning = parse(readFileSync(path.join(backend, '.template-spec/process/orchestration/domain/planning.yaml'), 'utf8'));
  const migration = path.join(backend, planning.planning.migration_policy);
  assert.ok(existsSync(migration), `missing migration policy ${migration}`);
  const text = readFileSync(migration, 'utf8');
  assert.doesNotMatch(text, /stage-gates-v1|Spec 四阶段门禁/);
  assert.match(text, /不继承|不能.*旧批准|不.*旧批准/);
});
