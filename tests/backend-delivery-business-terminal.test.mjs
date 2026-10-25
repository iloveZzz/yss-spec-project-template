import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {localBackendTerminalFixture,registerLocalBackendFeature} from '../scripts/fixtures/backend-delivery/local-terminal-fixture.mjs';
import * as producer from '../scripts/lib/backend-delivery.mjs';
import {completeBackendDelivery,verifyBackendDeliveryTerminal} from '../scripts/lib/backend-delivery-terminal.mjs';
import {authorizeBackendDelivery,scopedNextRoutes} from '../scripts/lib/lifecycle-execution-scope.mjs';

function localFixture(t) {const f=localBackendTerminalFixture();t.after(f.cleanup);return f;}

// Keep these expensive current-evidence scenarios in their own bounded command.
// The assertions are shared by default and explicit business-target cases.
for(const explicit of [false,true])test(`本地业务主线${explicit?'显式business目标':'默认无sidecar'}消费后端Slice的真实后端证据`,async t=>{
  const f=localFixture(t),{checkpointRef,target,terminal}=registerLocalBackendFeature(f);
  const targetRef=path.join(f.root,'.work/local/progression-target.json');
  if(explicit)f.write('.work/local/progression-target.json',{...target,target:'business-accepted'});else fs.rmSync(targetRef);
  const checkpointBefore=fs.readFileSync(path.join(f.root,checkpointRef));
  assert.equal(authorizeBackendDelivery({root:f.root,checkpointRef}).local_scope,'business');
  assert.deepEqual(scopedNextRoutes('work-unit.implementation-review',['work-unit.backend-delivery'],{root:f.root,checkpointRef}),['work-unit.backend-delivery']);
  await assert.rejects(()=>completeBackendDelivery(f.root,{...terminal,delivery_mode:undefined},{checkpointRef}),/本地|业务/);
  const result=await completeBackendDelivery(f.root,terminal,{checkpointRef});
  assert.equal(result.business_completed,false);assert.equal(result.release_authorized,false);
  assert.equal((await verifyBackendDeliveryTerminal(f.root,{checkpointRef})).result,'backend-delivered');
  const savedTerminal=fs.readFileSync(path.join(f.root,result.terminal_ref));
  for(const shortTarget of ['spec-approved','product-design-completed']) {
    f.write('.work/local/progression-target.json',{...target,target:shortTarget});
    assert.equal((await verifyBackendDeliveryTerminal(f.root,{checkpointRef})).result,'backend-delivered');
    assert.deepEqual(fs.readFileSync(path.join(f.root,result.terminal_ref)),savedTerminal);
  }
  if(explicit)f.write('.work/local/progression-target.json',{...target,target:'business-accepted'});else fs.rmSync(targetRef);
  assert.deepEqual(fs.readFileSync(path.join(f.root,checkpointRef)),checkpointBefore);
  assert.equal(fs.existsSync(targetRef),explicit);
  await assert.rejects(()=>producer.exportBackendDelivery({sourceRoot:f.root,deliveryRef:'local-delivery.json',output:path.join(f.root,'self-package')}),/本地证据.*外部交付/);
  assert.equal(fs.existsSync(path.join(f.root,'self-package')),false);
});
