import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {localBackendTerminalFixture,registerLocalBackendFeature} from '../scripts/fixtures/backend-delivery/local-terminal-fixture.mjs';
import * as producer from '../scripts/lib/backend-delivery.mjs';
import {completeBackendDelivery,verifyBackendDeliveryTerminal} from '../scripts/lib/backend-delivery-terminal.mjs';
import {validateBackendReview} from '../scripts/lib/backend-review.mjs';
import {normalizeSliceContract,readSliceContract,selectSliceWorkUnit,selectedSliceWorkUnit,sourceSliceContract} from '../scripts/lib/slice-contract.mjs';
import {baselineFixture} from '../scripts/fixtures/existing-ui-baseline/fixture.mjs';

function localFixture(t,options) {const f=localBackendTerminalFixture(options);t.after(f.cleanup);return f;}

test('普通材料离线后按当前本端合同复验后端终点，不触发交接或扩大授权',async t=>{
  const materialRoot=fs.mkdtempSync(path.join(os.tmpdir(),'backend-material-'));
  t.after(()=>fs.rmSync(materialRoot,{recursive:true,force:true}));
  const sourceRef=path.join(materialRoot,'说明.txt');
  fs.writeFileSync(sourceRef,'提交申请时校验必填材料；缺少材料拒绝提交。\n');
  const f=localFixture(t),{checkpointRef,terminal}=registerLocalBackendFeature(f);
  f.write('.work/local/material-notes.md',`来源（信息引用）：${sourceRef}\n${fs.readFileSync(sourceRef,'utf8')}`);
  const completed=await completeBackendDelivery(f.root,terminal,{checkpointRef});
  assert.equal(completed.result,'backend-delivered');
  fs.rmSync(materialRoot,{recursive:true});
  const verified=await verifyBackendDeliveryTerminal(f.root,{checkpointRef});
  assert.equal(verified.result,'backend-delivered');
  assert.equal(verified.business_completed,false);
  assert.equal(verified.release_authorized,false);
  assert.equal(fs.existsSync(path.join(f.root,'docs/deliveries/strategic')),false);
});

test('本地后端证据复用批准Slice、独立审查与构建部署，不生成战略交接包',async t=>{
  const f=localFixture(t);
  assert.equal((await producer.inspectLocalBackendDelivery(f.root,'local-delivery.json')).delivery.delivery_mode,'local-evidence');
  await assert.rejects(()=>producer.exportBackendDelivery({sourceRoot:f.root,deliveryRef:'local-delivery.json',output:path.join(f.root,'external-package')}),/本地证据.*外部交付/);
  assert.equal(fs.existsSync(path.join(f.root,'external-package')),false);
  f.delivery.scope.source_ids=['AC-unknown'];f.verification();
  await assert.rejects(()=>producer.inspectLocalBackendDelivery(f.root,'local-delivery.json'),/Spec|验收/);
});

test('无API后端范围消费批准的不适用原始依据，缺依据或伪造空接口不能达成',async t=>{
  const f=localFixture(t,{apiRequired:false});
  assert.equal(f.delivery.openapi.mode,'not-applicable');assert.deepEqual(f.delivery.scope.operation_ids,[]);
  assert.equal((await producer.inspectLocalBackendDelivery(f.root,'local-delivery.json')).delivery.delivery_mode,'local-evidence');
  const {checkpointRef,terminal}=registerLocalBackendFeature(f);
  assert.equal((await completeBackendDelivery(f.root,terminal,{checkpointRef})).result,'backend-delivered');
  fs.rmSync(path.join(f.root,f.delivery.openapi.ref));
  await assert.rejects(()=>producer.inspectLocalBackendDelivery(f.root,'local-delivery.json'));
});

test('本地终点按当前功能登记，目标改变后可只读复验；缺审查/部署和错误checkpoint拒绝',async t=>{
  const f=localFixture(t),{checkpointRef,target,terminal}=registerLocalBackendFeature(f);
  const before=fs.readFileSync(path.join(f.root,checkpointRef));
  const missingReview={...terminal,review_state:{ref:'missing-review.json',digest:`sha256:${'0'.repeat(64)}`}};
  await assert.rejects(()=>completeBackendDelivery(f.root,missingReview,{checkpointRef}));
  const deployment=fs.readFileSync(path.join(f.root,'deployment.json'));fs.rmSync(path.join(f.root,'deployment.json'));
  await assert.rejects(()=>completeBackendDelivery(f.root,terminal,{checkpointRef}));fs.writeFileSync(path.join(f.root,'deployment.json'),deployment);
  await assert.rejects(()=>completeBackendDelivery(f.root,{...terminal,checkpoint_ref:'.work/other/checkpoint.json'},{checkpointRef}),/checkpoint|功能/);
  const review=structuredClone(f.record);f.record.reviewer.actor_id=f.record.implementer.actor_id;f.save();
  await assert.rejects(()=>completeBackendDelivery(f.root,terminal,{checkpointRef}),/independent|独立/);
  Object.assign(f.record,review);f.save();
  const failedDeployment=JSON.parse(deployment);failedDeployment.results[0].exit_code=1;
  f.write('deployment.json',failedDeployment);f.delivery.verification.deployment=f.file('deployment.json');f.write('local-delivery.json',f.delivery);
  await assert.rejects(()=>completeBackendDelivery(f.root,{...terminal,delivery:f.file('local-delivery.json')},{checkpointRef}),/schema|后端验证失败/);
  fs.writeFileSync(path.join(f.root,'deployment.json'),deployment);f.delivery.verification.deployment=f.file('deployment.json');f.write('local-delivery.json',f.delivery);
  const checkpoint=JSON.parse(before),approvedSlice=fs.readFileSync(path.join(f.root,f.binding.ref));
  assert.equal(checkpoint.gates['gate.slice-contract-approved'].subject_ref,f.binding.ref);
  fs.writeFileSync(path.join(f.root,'other-slice.yaml'),approvedSlice);
  try {
    assert.deepEqual(fs.readFileSync(path.join(f.root,'other-slice.yaml')),approvedSlice);
    f.write(checkpointRef,{...checkpoint,human_review:{...checkpoint.human_review,implementation:{...checkpoint.human_review.implementation,slice_contract_ref:'other-slice.yaml'}}});
    await assert.rejects(()=>completeBackendDelivery(f.root,terminal,{checkpointRef}),{
      name:'TypeError',message:'execution-scope-blocked: 本地业务交付需要当前 checkpoint 的 Slice 批准门禁'
    });
  } finally {
    fs.rmSync(path.join(f.root,'other-slice.yaml'));fs.writeFileSync(path.join(f.root,checkpointRef),before);
  }
  assert.deepEqual(fs.readFileSync(path.join(f.root,f.binding.ref)),approvedSlice);
  const completed=await completeBackendDelivery(f.root,terminal,{checkpointRef});
  assert.equal(completed.business_completed,false);assert.equal(completed.release_authorized,false);
  assert.equal(fs.existsSync(path.join(f.root,'.yss-backend-delivery.json')),false);
  assert.deepEqual(fs.readFileSync(path.join(f.root,checkpointRef)),before);
  const terminalBefore=fs.readFileSync(path.join(f.root,completed.terminal_ref));
  f.write('.work/local/progression-target.json',{...target,target:'business-accepted'});
  assert.equal((await verifyBackendDeliveryTerminal(f.root,{checkpointRef})).result,'backend-delivered');
  assert.deepEqual(fs.readFileSync(path.join(f.root,checkpointRef)),before);
  assert.deepEqual(fs.readFileSync(path.join(f.root,completed.terminal_ref)),terminalBefore);
});

test('前端实现已移除：Slice 合同声明前端子合同或前端适用性必需被拒绝',t=>{
  const f=localFixture(t);registerLocalBackendFeature(f);
  const raw=structuredClone(f.contract);
  assert.equal(normalizeSliceContract(raw,{root:f.root}).frontend.status,'not-applicable');
  raw.applicability.frontend={status:'required'};
  assert.throws(()=>normalizeSliceContract(raw,{root:f.root}),/前端实现已从生命周期移除/);
  const withExtension=structuredClone(f.contract);
  withExtension.extensions={...withExtension.extensions,frontend:{visual_baseline_case_ids:['case.synthetic']}};
  assert.throws(()=>normalizeSliceContract(withExtension,{root:f.root}),/前端实现已从生命周期移除|不适用时不得保存空子合同/);
});
