import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {localBackendTerminalFixture,registerLocalBackendFeature} from '../scripts/fixtures/backend-delivery/local-terminal-fixture.mjs';
import * as producer from '../scripts/lib/backend-delivery.mjs';
import {completeBackendDelivery,verifyBackendDeliveryTerminal} from '../scripts/lib/backend-delivery-terminal.mjs';
import {authorizeBackendDelivery,scopedNextRoutes} from '../scripts/lib/lifecycle-execution-scope.mjs';
import {validateBackendReview} from '../scripts/lib/backend-review.mjs';
import {normalizeSliceContract,readSliceContract,selectSliceWorkUnit,selectedSliceWorkUnit,sourceSliceContract} from '../scripts/lib/slice-contract.mjs';
import {baselineFixture} from '../scripts/fixtures/existing-ui-baseline/fixture.mjs';

function localFixture(t,options) {const f=localBackendTerminalFixture(options);t.after(f.cleanup);return f;}

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

for(const mixed of [false,true])for(const explicit of [false,true])test(`本地业务主线${explicit?'显式business目标':'默认无sidecar'}消费${mixed?'混合':'后端'}Slice的真实后端证据`,async t=>{
  const f=localFixture(t,{mixed}),{checkpointRef,target,terminal}=registerLocalBackendFeature(f);
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

for(const milestone of ['backend-deliverable','frontend-accepted'])test(`完整Spec工程短目标 ${milestone} 保留混合Slice；永久后端职责、缺当前门禁或条件政策仍拒绝`,async t=>{
  const f=localFixture(t,{mixed:true}),{checkpointRef,target,terminal}=registerLocalBackendFeature(f);
  f.write('.work/local/progression-target.json',{...target,target:milestone});
  const approvedBefore=fs.readFileSync(path.join(f.root,f.binding.ref));
  const checkpointBefore=fs.readFileSync(path.join(f.root,checkpointRef));
  assert.equal(authorizeBackendDelivery({root:f.root,checkpointRef}).local_scope,'business');
  const completed=await completeBackendDelivery(f.root,terminal,{checkpointRef});
  assert.equal(completed.business_completed,false);assert.equal(completed.release_authorized,false);
  assert.deepEqual(fs.readFileSync(path.join(f.root,f.binding.ref)),approvedBefore);
  assert.deepEqual(fs.readFileSync(path.join(f.root,checkpointRef)),checkpointBefore);
  assert.equal(readSliceContract(f.binding.ref,{root:f.root}).contract.frontend.status,'required');
  fs.rmSync(path.join(f.root,completed.terminal_ref));
  f.write('.work/local/progression-target.json',target);
  f.write('.yss-execution-scope.yaml',{schema_version:1,scope_id:'plan-to-backend'});
  await assert.rejects(()=>producer.inspectLocalBackendDelivery(f.root,'local-delivery.json',{checkpointRef}),/后端.*前端|后端.*Slice/);
  fs.rmSync(path.join(f.root,'.yss-execution-scope.yaml'));
  f.write('.work/local/progression-target.json',{...target,target:'business-accepted'});
  const checkpoint=JSON.parse(fs.readFileSync(path.join(f.root,checkpointRef)));
  f.write(checkpointRef,{...checkpoint,gates:{...checkpoint.gates,'gate.slice-contract-approved':{status:'pending'}}});
  assert.throws(()=>authorizeBackendDelivery({root:f.root,checkpointRef}),/Slice|批准|门禁/);
  f.write(checkpointRef,checkpoint);
  const ref='.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml';
  const policy=fs.readFileSync(path.join(f.root,ref),'utf8');
  f.write(ref,policy.replace('backend-delivery: backend-api-data-impact','backend-delivery: unknown-impact'));
  assert.throws(()=>authorizeBackendDelivery({root:f.root,checkpointRef}),/业务|政策|职责/);
  f.write(ref,policy);
  f.write('.template-spec/process/harness-profile.yaml',{schema_version:2,profile_id:'harness.frontend-delivery'});
  assert.throws(()=>authorizeBackendDelivery({root:f.root,checkpointRef}),/身份|Profile/);
});

test('混合Slice后端审查必须显式选择当前批准后端工作单元及登记工程',t=>{
  const f=localFixture(t,{mixed:true});
  delete f.state.review_input.work_unit_id;
  assert.throws(()=>validateBackendReview(f.state,{root:f.root}),/backend work_unit_id required/);
  f.state.review_input.work_unit_id='work-unit.unknown';
  assert.throws(()=>validateBackendReview(f.state,{root:f.root}),/approved backend work unit/);
  f.state.review_input.work_unit_id='work-unit.slice-backend';
  f.state.review_input.project_root='.';
  assert.throws(()=>validateBackendReview(f.state,{root:f.root}),/selected backend project/);
});

test('单仓职责选择只收窄已冻结工作单元，保留完整原始批准且调用方不能伪造选择',t=>{
  const f=localFixture(t,{mixed:true}),loaded=readSliceContract(f.binding.ref,{root:f.root});
  const selected=selectSliceWorkUnit(loaded.contract,'work-unit.slice-backend');
  assert.equal(selected.frontend.status,'not-applicable');
  assert.equal(loaded.contract.frontend.status,'required');
  assert.equal(sourceSliceContract(selected),loaded.raw);
  assert.deepEqual(selected.common.project_roots,[f.project]);
  assert.deepEqual(selected.common.allowed_write_paths,selected.work_units[0].allowed_write_paths);
  assert.equal(selected.work_units.length,1);
  assert.equal(selectedSliceWorkUnit(selected).role_id,'role.backend-engineer');
  assert.equal(selectedSliceWorkUnit({...selected}),null);
  assert.equal(selectedSliceWorkUnit(loaded.contract),null);
  assert.throws(()=>selectSliceWorkUnit({...loaded.contract},'work-unit.slice-backend'),/正规化的原始合同/);
  assert.throws(()=>selectSliceWorkUnit(loaded.contract,'work-unit.unknown'),/work_unit_id/);
  const unit=loaded.contract.work_units[0],role=unit.role_id,paths=unit.allowed_write_paths;
  unit.role_id='role.frontend-engineer';
  assert.throws(()=>selectSliceWorkUnit(loaded.contract,unit.id),/原始合同冲突/);
  unit.role_id=role;unit.allowed_write_paths=['outside'];
  assert.throws(()=>selectSliceWorkUnit(loaded.contract,unit.id),/原始合同冲突/);
  unit.allowed_write_paths=paths;
});

test('本地既有UI输入仅真实nativeSpec政策可省外部Receipt，基线原始证据仍核验',t=>{
  const f=localFixture(t);registerLocalBackendFeature(f);
  const baseline=baselineFixture(path.join(f.root,'existing-ui'));
  const raw=structuredClone(f.contract);
  raw.applicability.frontend={status:'required',baseline_kind:'existing-ui-baseline',ui_change:'none'};
  raw.extensions.frontend={visual_baseline_case_ids:['submit']};
  raw.basis.existing_ui_baseline=f.file('existing-ui/existing-ui-baseline.json');
  assert.equal(normalizeSliceContract(raw,{root:f.root}).frontend.status,'required');
  assert.equal(raw.basis.frontend_delivery,undefined);
  const ref='.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml';
  const policy=fs.readFileSync(path.join(f.root,ref),'utf8');
  f.write(ref,policy.replace('native-spec-current-feature-approved-assets','unsupported-local-policy'));
  assert.throws(()=>normalizeSliceContract(raw,{root:f.root}),/CAPABILITY: 不支持的本地前端输入政策/);
  f.write(ref,policy);
  const metadata=JSON.parse(fs.readFileSync(path.join(f.root,'.yss.json')));
  f.write('.yss.json',{...metadata,profile:'frontend',profileId:'harness.frontend-delivery'});
  assert.throws(()=>normalizeSliceContract(raw,{root:f.root}),/frontend_delivery/);
  f.write('.yss.json',metadata);
  fs.appendFileSync(path.join(f.root,'existing-ui/source/src/App.vue'),'changed');
  assert.throws(()=>normalizeSliceContract(raw,{root:f.root}),/既有 UI 基线不可消费/);
  assert.equal(baseline.data.ui_change,'none');
});
