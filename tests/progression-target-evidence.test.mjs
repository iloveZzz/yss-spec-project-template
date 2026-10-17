import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {makeRoot} from './helpers/yss-instance.mjs';
import {digest,hash} from '../scripts/lib/strategic-handoff-io.mjs';
import {nativeEvidenceVerify,NEEDS} from '../scripts/lib/native-evidence.mjs';

test('当前 Spec 包入口拒绝把推进意图或其原始路径作为交接证据', t => {
  const root=makeRoot('yss-progression-evidence-','spec');
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'package'));
  const bytes=JSON.stringify({schema_version:1,kind:'lifecycle-progression-target',target:'spec-approved'});
  for(const original of [false,true]) {
    const file={path:original?'intent.json':'progression-target.json',...(original?{original_ref:'progression-target.json'}:{}),sha256:hash(bytes),size_bytes:Buffer.byteLength(bytes)};
    fs.writeFileSync(path.join(root,'package',file.path),bytes);
    const manifest={schema_version:1,bundle_id:'strategic-design-handoff.test',version:'v1',handoff_ref:'handoff.json',previous_bundle:null,files:[file]};
    manifest.bundle_digest=digest(manifest);
    fs.writeFileSync(path.join(root,'package/manifest.json'),JSON.stringify(manifest));
    const result=nativeEvidenceVerify({root,group:'handoff',kind:'package',file:'package',needs:NEEDS.handoffPackage});
    assert.notEqual(result.exitCode,0);assert.equal(result.code,'PROGRESSION_EVIDENCE');assert.match(result.message,/推进目标.*证据/);
  }
});
