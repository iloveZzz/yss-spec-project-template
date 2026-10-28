import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { composeProfileTree } from '../scripts/lib/profile-tree.mjs';
import { shipped } from '../scripts/lib/profile-distribution.mjs';
import { parse } from '../scripts/vendor/yaml.mjs';

const root = path.resolve(import.meta.dirname, '..');
const policy = JSON.parse(fs.readFileSync(path.join(root, 'profiles/backend/.template-source/distribution/bundle-profile.json'), 'utf8')).manifest;
const read = ref => fs.readFileSync(path.join(composeProfileTree('backend'), ref), 'utf8');

test('Backend governed distributes blank decision template while excluding historical role authority', () => {
  const template = '.template-spec/process/templates/user-decision-template.yaml';
  assert.equal(shipped(template, policy), true, 'governed decision guidance must have its template');
  assert.equal(shipped('.template-spec/agents/digital-human-roles.yaml', policy), false);
  const document = parse(read(template));
  assert.equal(document.kind, 'user-decision');
  assert.deepEqual(document.responses, [], 'a template must not fabricate user approval');
  assert.equal(shipped('.template-spec/process/plan-migration.md', policy), true, 'Backend current Plan migration must be distributable');
});

test('Backend governed guidance does not require an excluded historical role table', () => {
  for (const ref of [
    '.template-spec/process/agent-entry-policy.md',
    '.template-spec/user-guide/产品生命周期工作流.md',
    '.template-spec/templates/subagent-task-package-template.md',
    '.template-spec/templates/vertical-slice-ticket-template.md',
    '.agents/skills/harness-orchestrator/references/user-decisions.md',
  ]) {
    assert.equal(shipped(ref, policy), true, `${ref} must be distributed`);
    assert.doesNotMatch(read(ref), /\.template-spec\/agents\/digital-human-roles\.yaml/, `${ref} requires excluded role table`);
  }
  const contract = parse(read('.template-spec/process/orchestration/domain/review.yaml'));
  assert.equal(contract.user_decision_evidence.policy_ref, '.template-spec/process/orchestration/domain/review.yaml#user_decision_policy');
  assert.equal(contract.user_decision_policy.agent_generated_user_response, 'forbidden');
  assert.equal(contract.user_decision_evidence.response_absent, 'paused-human-gate');
});

test('Backend governed entry uses the explicit governed initializer', () => {
  assert.match(read('.template-spec/process/agent-entry-policy.md'), /yss init --profile backend --installation governed --root/);
});
