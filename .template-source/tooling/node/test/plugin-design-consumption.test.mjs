import { composeProfileTree } from '../../../../scripts/lib/profile-tree.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { consumerEntry } from '../../../../scripts/lib/strategic-handoff-routing.mjs';

test('consumer mapping preserves dedicated backend identity and rejects unknown wire IDs or out-of-profile targets', t => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), 'consumer-entry-policy-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const source = composeProfileTree('backend');
  for (const ref of ['.template-spec/process/harness-profile.yaml', '.template-spec/process/lifecycle-registry.yaml', '.template-spec/process/orchestration-contract.yaml', '.template-spec/process/orchestration']) {
    fs.mkdirSync(path.dirname(path.join(dir, ref)), { recursive: true });
    fs.cpSync(path.join(source, ref), path.join(dir, ref), {recursive:true});
  }
  assert.equal(consumerEntry(dir, 'backend-technical-design', 'work-unit.technical-design').target_work_unit, 'work-unit.technical-design');
  assert.throws(() => consumerEntry(dir, 'backend-technical-design', 'work-unit.technical-analysis'), /unmapped/);
  assert.throws(() => consumerEntry(dir, 'backendTechnicalDesign', 'work-unit.technical-design'), /unmapped/);
  fs.writeFileSync(path.join(dir, '.template-spec/process/harness-profile.yaml'), JSON.stringify({ profile_id: 'harness.backend-delivery', lifecycle: { allowed_work_units: [] } }));
  assert.throws(() => consumerEntry(dir, 'backend-technical-design', 'work-unit.technical-design'), /outside-profile/);
});
