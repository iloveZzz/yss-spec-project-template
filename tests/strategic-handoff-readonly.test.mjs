import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {syncBuiltinESMExports} from 'node:module';
import {fixture} from '../scripts/fixtures/strategic-handoff/fixture.mjs';
import {exportBundle,openBundle} from '../scripts/lib/strategic-handoff.mjs';
import {files,hash,read,json,digest} from '../scripts/lib/strategic-handoff-io.mjs';

test('legacy v4 原始交接布局只读复验保留所有原字节且不创建临时源',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'handoff-readonly-v4-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  await fixture(root,{handoffVersion:4,technicalDesign:true});
  const output=path.join(root,'package');
  const exported=await exportBundle({sourceRoot:root,handoffRef:'handoff.yaml',output});
  const inventory=()=>files(output).map(ref=>({ref,hash:hash(fs.readFileSync(path.join(output,ref))),mode:fs.lstatSync(path.join(output,ref)).mode}));
  const before=inventory(),mkdtemp=fs.mkdtempSync;
  fs.mkdtempSync=()=>{throw new Error('Readonly verification created a temporary source');};syncBuiltinESMExports();
  try {
    assert.equal(await openBundle(output,bundle=>bundle.manifest.bundle_digest,{readOnly:true}),exported.bundle_digest);
  }finally{fs.mkdtempSync=mkdtemp;syncBuiltinESMExports();}
  assert.deepEqual(inventory(),before);
  const original=path.join(output,'handoff.yaml'),backup=path.join(root,'handoff-backup.yaml');
  fs.renameSync(original,backup);fs.symlinkSync(backup,original);
  try{await assert.rejects(()=>openBundle(output,()=>null,{readOnly:true}),/symlink/);}
  finally{fs.unlinkSync(original);fs.renameSync(backup,original);}
  assert.deepEqual(inventory(),before);
  // A rehashed manifest cannot choose a different alias for an original source.
  const manifest=read(path.join(output,'manifest.json')),handoff=manifest.files.find(row=>row.original_ref==='handoff.yaml');
  fs.renameSync(path.join(output,handoff.path),path.join(output,'relocated-handoff.yaml'));handoff.path='relocated-handoff.yaml';
  const {bundle_digest,...body}=manifest;manifest.bundle_digest=digest(body);fs.writeFileSync(path.join(output,'manifest.json'),json(manifest));
  await assert.rejects(()=>openBundle(output,()=>null,{readOnly:true}),/readonly-source-layout-required/);
});
