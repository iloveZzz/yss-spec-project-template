import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { installedFixture } from './installed-fixture.mjs';

function snapshot(root) {
  const entries = [];
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isSymbolicLink()) entries.push([path.relative(root, file), 'link', fs.readlinkSync(file)]);
      else if (entry.isFile()) entries.push([path.relative(root, file), fs.statSync(file).mode & 0o777, createHash('sha256').update(fs.readFileSync(file)).digest('hex')]);
      else throw new Error(`Unexpected file type: ${file}`);
    }
  }
  visit(root);
  return entries;
}

test('Spec 3 initializes the current workflow, rejects obsolete lifecycle and ensures design skill independently', () => {
  const f = installedFixture('spec');
  try {
    const meta = JSON.parse(f.read('.yss.json'));
    assert.equal(meta.schemaVersion, 5);
    assert.equal(meta.distribution.installation, 'governed');
    assert.equal(meta.distribution.specWorkflow, 'matt-spec-v1');
    assert.deepEqual(meta.distribution.installedStages, []);
    assert.equal(fs.existsSync(path.join(f.root, '.template-spec/process/orchestration/domain/stage-gates.yaml')), false);
    f.run('obsolete-lifecycle', ['lifecycle', 'status'], 'SPEC_COMMAND_NOT_APPLICABLE');

    const design = path.join(f.root, '.agents/skills/yss-design-system/SKILL.md');
    const prototype = path.join(f.root, '.agents/skills/yss-prototype-stage');
    const workbuddyDesign = path.join(f.root, '.workbuddy/skills/yss-design-system/SKILL.md');
    const workbuddyPrototype = path.join(f.root, '.workbuddy/skills/yss-prototype-stage');
    assert.equal(fs.existsSync(design), false);
    assert.equal(fs.existsSync(prototype), false);
    assert.equal(fs.existsSync(workbuddyDesign), false);
    assert.equal(fs.existsSync(workbuddyPrototype), false);
    const plan = path.join(path.dirname(f.root), 'design-skill.plan.json');
    const before = snapshot(f.root);
    const preview = f.run('design-plan', ['skills', 'ensure', 'yss-design-system', '--plan', '--out', plan]);
    assert.ok(preview.stats.changed > 0);
    assert.equal(preview.stats.conflicts, 0);
    assert.deepEqual(snapshot(f.root), before, 'plan must not modify project files');
    f.run('design-apply', ['skills', '--apply', '--plan-file', plan]);
    assert.equal(fs.existsSync(design), true);
    assert.equal(fs.existsSync(prototype), false);
    assert.equal(fs.existsSync(workbuddyDesign), true);
    assert.equal(fs.existsSync(workbuddyPrototype), false);
    assert.ok(JSON.parse(f.read('.yss.json')).distribution.installedSkills.includes('yss-design-system'));

    const installed = snapshot(f.root);
    const repeatPlan = path.join(path.dirname(f.root), 'design-skill-repeat.plan.json');
    const repeat = f.run('design-repeat-plan', ['skills', 'ensure', 'yss-design-system', '--plan', '--out', repeatPlan]);
    assert.equal(repeat.stats.changed, 0);
    assert.equal(repeat.stats.conflicts, 0);
    assert.deepEqual(snapshot(f.root), installed, 'repeated plan must not modify project files');
    f.run('design-repeat-apply', ['skills', '--apply', '--plan-file', repeatPlan]);
    assert.deepEqual(snapshot(f.root), installed, 'repeated ensure must not change project files');
  } finally {
    f.cleanup();
  }
});
