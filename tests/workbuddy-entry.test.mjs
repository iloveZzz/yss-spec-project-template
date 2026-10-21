import test from 'node:test';
import assert from 'node:assert/strict';
import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseDocument } from '../scripts/vendor/yaml.mjs';
import { shipped } from '../scripts/lib/profile-distribution.mjs';
import { resourceIdentity } from '../scripts/lib/skill-discovery.mjs';
import { composeProfileTree } from '../scripts/lib/profile-tree.mjs';
import { nativeInstalledSkillRefs } from '../scripts/lib/instance-metadata.mjs';

const yaml = ref => parseDocument(readFileSync(ref, 'utf8')).toJS();
for (const prefix of ['', 'profiles/backend/']) {
  test(`WorkBuddy ${prefix || 'Spec'} declares only intended projections and keeps private configuration out`, () => {
    const registry = yaml(prefix + '.template-spec/agents/yss-skill-registry.yaml');
    const lock = JSON.parse(readFileSync(prefix + 'skills-lock.json', 'utf8'));
    const manifest = JSON.parse(readFileSync(prefix + '.template-source/distribution/bundle-profile.json', 'utf8')).manifest;
    const canonicalTree = prefix ? composeProfileTree('backend') : process.cwd();
    const roots = prefix ? ['.workbuddy/skills'] : ['.claude/skills', '.workbuddy/skills'];
    assert.deepEqual(lock.projectionRoots, roots);
    assert.equal(registry.agent_runtime_roots.workbuddy, '.workbuddy/skills');
    assert.equal(shipped('.workbuddy/skills/probe/SKILL.md', manifest), true);
    assert.equal(shipped('.codebuddy/skills/probe/SKILL.md', manifest), false);
    for (const root of ['.codebuddy', '.workbuddy']) for (const ref of ['private.json','settings.json','mcp.json','logs/a','cache/a'].map(ref => `${root}/${ref}`)) assert.equal(shipped(ref, manifest), false, ref);
    for (const [name, entry] of Object.entries(lock.skills.shared)) {
      assert.deepEqual(entry.targets, ['.agents/skills', ...roots]);
      const projection = path.join(prefix, '.workbuddy/skills', name, 'SKILL.md');
      assert.equal(lstatSync(projection).isFile(), true, projection);
      assert.equal(lstatSync(path.dirname(projection)).isSymbolicLink(), false);
      assert.equal(resourceIdentity(path.dirname(projection)).sha256, resourceIdentity(path.join(canonicalTree, '.agents/skills', name)).sha256, `complete resource tree: ${name}`);
    }
  });
}

test('WorkBuddy metadata requires matching roots and non-exempt canonical and projection records', () => {
  const record = { baseline: { type: 'file', digest: 'a'.repeat(64), mode: 0o644 }, lastApplied: { type: 'file', digest: 'a'.repeat(64), mode: 0o644 }, ownership: 'managed' };
  const canonical = '.agents/skills/probe/SKILL.md', projection = '.workbuddy/skills/probe/SKILL.md';
  const metadata = { distribution: { runtimes: ['workbuddy'], installedSkills: ['probe'] }, managedFiles: { [canonical]: record, [projection]: record } };
  const lock = { version: 3, canonicalRoot: '.agents/skills', projectionRoots: ['.workbuddy/skills'], skills: { shared: { probe: { targets: ['.agents/skills', '.workbuddy/skills'] } }, platform: {} } };
  assert.deepEqual(nativeInstalledSkillRefs(metadata, lock), [canonical, projection]);
  for (const invalid of [['workbuddy','workbuddy'], ['codebuddy'], []]) {
    assert.throws(() => nativeInstalledSkillRefs({ ...metadata, distribution: { ...metadata.distribution, runtimes: invalid } }, lock), /INSTANCE_DISTRIBUTION/);
  }
  for (const roots of [['.codebuddy/skills'], ['.workbuddy/skills','.codebuddy/skills']]) assert.throws(() => nativeInstalledSkillRefs(metadata, { ...lock, projectionRoots: roots }), /INSTANCE_DISTRIBUTION/);
  delete metadata.managedFiles[projection];
  assert.throws(() => nativeInstalledSkillRefs(metadata, lock), /必需受管记录/);
});
