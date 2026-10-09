import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fixture} from '../scripts/fixtures/strategic-handoff/fixture.mjs';
import {collectSourceClosure} from '../scripts/lib/strategic-handoff.mjs';

test('推进意图不能成为冻结战略包的批准或交付证据', async t => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'yss-progression-evidence-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const source=await fixture(root);
  const ref='progression-target.json';
  fs.writeFileSync(path.join(root,ref),JSON.stringify({schema_version:1,kind:'lifecycle-progression-target',target:'spec-approved'}));
  const config={...source.handoff.package_export,additional_files:[ref]};
  assert.throws(()=>collectSourceClosure(root,'handoff.yaml',source.handoff,config),/推进目标.*证据/);
  assert.equal(collectSourceClosure(root,'handoff.yaml',source.handoff,source.handoff.package_export).has(ref),false);
});
