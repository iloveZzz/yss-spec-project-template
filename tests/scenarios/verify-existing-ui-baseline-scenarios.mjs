import { test } from 'node:test';
import { attachSliceApproval, attachArtifactApproval } from '../../scripts/fixtures/backend-delivery/approval-fixture.mjs';
import { backendProfileTerminalFixture } from '../../scripts/fixtures/backend-delivery/backend-profile-terminal-fixture.mjs';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readFileSync, writeFileSync,copyFileSync,cpSync,existsSync,statSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import {pathToFileURL} from 'node:url';
import { baselineFixture, handoffFixture } from '../../scripts/fixtures/existing-ui-baseline/fixture.mjs';
import { validateExistingUiBaseline } from '../../scripts/lib/existing-ui-baseline.mjs';
import { exportBundle,openBundle,importBundle,inspectSource,finalizeDelivery } from '../../scripts/lib/strategic-handoff.mjs';
import { read,json,hash,digest,treeDigest,schema,ROOT } from '../../scripts/lib/strategic-handoff-io.mjs';
import { loadDeliveryProfile } from '../../scripts/lib/harness-execution-scope.mjs';
import { context } from '../../scripts/fixtures/strategic-handoff/fixture.mjs';
const root=t=>{const root=mkdtempSync(path.join(tmpdir(),'existing-ui-test-'));t.after(()=>rmSync(root,{recursive:true,force:true}));return root;};
function installedProfile(side,target) {
 const seed=process.env[`YSS_DELIVERY_TEST_${side.toUpperCase()}_ROOT`];
 if(!seed)return false;
 cpSync(seed,target,{recursive:true,force:false,filter:(source,destination)=>!existsSync(destination)||statSync(source).isDirectory()});
 return true;
}
const deliveryLibrary=(side,file)=>import(pathToFileURL(path.join(process.env[`YSS_DELIVERY_TEST_${side.toUpperCase()}_ROOT`]||ROOT,'scripts/lib',file)));
function frontendAuthority(target) {
 if(installedProfile('frontend',target))return;
 const candidate=path.join(ROOT,'submodules/yss-harness-frontend-agent'),authority=existsSync(path.join(candidate,'.template-spec/process/harness-profile.yaml'))?candidate:ROOT;
 for(const ref of ['.template-spec/process/harness-profile.yaml','.template-spec/process/lifecycle-registry.yaml','.agents/skills/harness-orchestrator/references/orchestration-contract.yaml']){mkdirSync(path.dirname(path.join(target,ref)),{recursive:true});copyFileSync(path.join(authority,ref),path.join(target,ref));}
}
function useCustomRouteIds(f) {
 const ids={'route.backend':'route.custom-backend','route.frontend':'route.custom-frontend','route.coordination':'route.custom-coordination'};
 for(const route of f.handoff.consumer_routes){route.route_id=ids[route.route_id];route.dependencies=(route.dependencies||[]).map(id=>ids[id]);}
 f.save();
}
test('既有 UI 验证真实文件闭包并拒绝源码/锁文件/构建/API/截图篡改',t=>{
 const base=root(t),f=baselineFixture(base),validate=()=>validateExistingUiBaseline(f.data,{bundleRoot:base});assert.deepEqual(validate().errors,[]);
 for(const file of ['source/src/App.vue','source/pnpm-lock.yaml','build/index.html','api/openapi.json','api/response.json','images/submit.png','actions.txt','evidence/build.log']){
   const p=path.join(base,file),original=readFileSync(p);writeFileSync(p,'tampered');assert(validate().errors.length,file);writeFileSync(p,original);
 }
 f.put('unbound.txt','unapproved extra payload');assert.match(validate().errors.join(' '),/未绑定/);
});
test('既有 UI 拒绝未知版本、UI 变更和自洽但跨来源 capture',t=>{
 const base=root(t),f=baselineFixture(base),check=()=>validateExistingUiBaseline(f.data,{bundleRoot:base}).errors;
 for(const [key,value]of [['schema_version',2],['source_kind','generated'],['ui_change','changed']]){const old=f.data[key];f.data[key]=value;assert(check().length);f.data[key]=old;}
 const capture=read(path.join(base,'capture.json'));capture.cases[0].actions={...capture.cases[0].actions,digest:`sha256:${'9'.repeat(64)}`};f.put('capture.json',capture);f.data.capture=f.binding('capture.json');assert.match(check().join(' '),/动作绑定/);
});
test('Handoff v5 既有基线从源导出、离线只读验包、前端导入 v2 预检草案',async t=>{
 const base=root(t),source=path.join(base,'source');mkdirSync(source);const f=await handoffFixture(source),output=path.join(base,'package');
 useCustomRouteIds(f);
 const result=await exportBundle({sourceRoot:source,handoffRef:'handoff.yaml',output,zip:true});const before=treeDigest(base,'package');
 assert.equal(await openBundle(output,b=>b.manifest.bundle_digest,{readOnly:true}),result.bundle_digest);assert.equal(treeDigest(base,'package'),before);
 await assert.rejects(()=>openBundle(`${output}.zip`,()=>null,{readOnly:true}),/readonly-extraction-required/);
 const delivered=await finalizeDelivery({sourceRoot:source,handoffRef:'handoff.yaml'}),wrapper=path.join(base,'delivery');cpSync(delivered.delivery,wrapper,{recursive:true});
 rmSync(source,{recursive:true});assert.equal(await openBundle(output,b=>b.handoff.ui_baseline_kind),'existing-ui-baseline');
 const target=path.join(base,'target');mkdirSync(target);writeFileSync(path.join(target,'yss-project.yaml'),'schema_version: 1\nrepository_mode: project-instance\n');writeFileSync(path.join(target,'CONTEXT.md'),context);
 await assert.rejects(()=>importBundle({bundle:output,targetRoot:target}),/delivery wrapper/);
 const imported=await importBundle({bundle:wrapper,targetRoot:target}),receipt=read(path.join(target,imported.receipt_ref));assert.equal(receipt.schema_version,3);
 const preflight=read(path.join(target,path.dirname(imported.receipt_ref),'frontend-strategic-preflight-draft.json'));assert.equal(preflight.schema_version,2);assert.equal(preflight.ui_baseline_kind,'existing-ui-baseline');assert.match(preflight.ui_baseline_ref,/existing-ui-baseline.json$/);assert.equal(preflight.backend_dependency.route_id,'route.custom-backend');
});
test('Handoff v5 原型仍验证离线原型；v4 原版本保持，未知版本拒绝',async t=>{
 const base=root(t),source=path.join(base,'source');mkdirSync(source);const f=await handoffFixture(source,{kind:'prototype'}),output=path.join(base,'package');await exportBundle({sourceRoot:source,handoffRef:'handoff.yaml',output});assert.equal(await openBundle(output,b=>b.handoff.ui_baseline_kind,{readOnly:true}),'prototype');
 f.handoff.schema_version=99;f.sign();await assert.rejects(()=>inspectSource(source,'handoff.yaml'),/未知 schema_version/);
});
test('真实用户决定必须覆盖既有 manifest 当前原字节；结构批准不能代替',async t=>{
 const base=root(t),source=path.join(base,'source');mkdirSync(source);const f=await handoffFixture(source);await inspectSource(source,'handoff.yaml');
 const file=path.join(source,'approvals/existing-ui.json'),approval=read(file);delete approval.user_decision_ref;f.put('approvals/existing-ui.json',approval);await assert.rejects(()=>inspectSource(source,'handoff.yaml'),/user-decision/);
});
test('重算包内摘要不能复用旧用户批准；UI=true 不能走既有分支',async t=>{
 const base=root(t),source=path.join(base,'source');mkdirSync(source);const f=await handoffFixture(source),file=path.join(source,'existing-ui/existing-ui-baseline.json');
 writeFileSync(file,`${readFileSync(file,'utf8')}\n`);const next=hash(readFileSync(file));f.handoff.source.existing_ui_baseline_ref.digest=next;const approval=read(path.join(source,'approvals/existing-ui.json'));approval.artifact_bindings[0].digest=next;f.put('approvals/existing-ui.json',approval);f.save();await assert.rejects(()=>inspectSource(source,'handoff.yaml'),/user-decision|变化|digest|摘要/);
 f.stage.impact_assessment.ui=true;f.put('source/stage.yaml',f.stage);await assert.rejects(()=>inspectSource(source,'handoff.yaml'),/UI 影响/);
});
test('前端 v2 预检与 v3 接收实际执行；跨类型、悬空 case、协议降级拒绝',async t=>{
 const {verifyFrontendStrategicPreflight,verifyFrontendDelivery}=await deliveryLibrary('frontend','frontend-delivery.mjs');
 const base=root(t),source=path.join(base,'source'),target=path.join(base,'target');mkdirSync(source);mkdirSync(target);
 const f=await handoffFixture(source,{backend:false}),output=(await finalizeDelivery({sourceRoot:source,handoffRef:'handoff.yaml'})).delivery;
 const put=(ref,value)=>{mkdirSync(path.dirname(path.join(target,ref)),{recursive:true});writeFileSync(path.join(target,ref),typeof value==='string'?value:json(value));};
 put('yss-project.yaml','schema_version: 1\nrepository_mode: project-instance\n');put('CONTEXT.md',context);
 frontendAuthority(target);
 const imported=await importBundle({bundle:output,targetRoot:target}),receipt=read(path.join(target,imported.receipt_ref)),route=receipt.routes.find(route=>route.capability==='frontend-engineering-design');
 const preflightRef=route.artifact_refs.find(ref=>ref.endsWith('frontend-strategic-preflight-draft.json')),traceRef=route.artifact_refs.find(ref=>ref.endsWith('frontend-traceability-draft.json')),preflight=read(path.join(target,preflightRef)),trace=read(path.join(target,traceRef));
 put('reconciliation.json',{schema_version:1,repository_mode:'project-instance',stage:'stage.frontend-engineering-design',work_unit:'work-unit.frontend-engineering-design',status:'reconciled',context_snapshot:f.snapshot,changes:{added:['Global/Supplier'],updated:[],deprecated:[]},unresolved_terms:[],evidence_refs:['CONTEXT.md']});
 preflight.status='verified';preflight.context_reconciliation_ref='reconciliation.json';put(preflightRef,preflight);
 assert.equal((await verifyFrontendStrategicPreflight({root:target,preflightRef,readOnly:true})).result,'preflight-verified');
 assert.equal(receipt.schema_version,3);
 const originalReceipt=readFileSync(path.join(target,imported.receipt_ref)),downgrade={...receipt,schema_version:2};for(const key of ['source_delivery_record_ref','source_delivery_record_sha256','ready_for_agent'])delete downgrade[key];put(imported.receipt_ref,downgrade);await assert.rejects(()=>verifyFrontendStrategicPreflight({root:target,preflightRef,readOnly:true}),/协议版本/);writeFileSync(path.join(target,imported.receipt_ref),originalReceipt);
 const recordFile=path.join(target,receipt.source_delivery_record_ref),recordBytes=readFileSync(recordFile),record=read(recordFile);record.source_assets[0].digest=`sha256:${'0'.repeat(64)}`;put(receipt.source_delivery_record_ref,record);put(imported.receipt_ref,{...receipt,source_delivery_record_sha256:hash(readFileSync(recordFile))});await assert.rejects(()=>verifyFrontendStrategicPreflight({root:target,preflightRef,readOnly:true}),/来源资产/);writeFileSync(recordFile,recordBytes);writeFileSync(path.join(target,imported.receipt_ref),originalReceipt);
 put('cases.md','SYNTHETIC acceptance mapping for both outcomes.');const cases=['success','failure'].map(outcome=>({case_id:`accept-${outcome}`,source_ids:['rule.complete','scenario.submit'],outcome,operation_ids:[],baseline_case_ids:['submit'],evidence_ref:'cases.md',evidence_digest:hash(readFileSync(path.join(target,'cases.md')))}));
 for(const row of trace.rows)Object.assign(row,{disposition:'mapped',frontend_case_refs:cases.map(item=>item.case_id),dependency_status:'known',dependent_slice_refs:['slice.ui'],evidence_refs:['cases.md']});
 const acceptance={schema_version:3,status:'accepted',slice_id:'slice.ui',ui_baseline_kind:'existing-ui-baseline',strategic_preflight:{ref:preflightRef,digest:hash(readFileSync(path.join(target,preflightRef)))},backend_dependency:preflight.backend_dependency,strategic_handoff:{import_receipt_ref:imported.receipt_ref,bundle_digest:receipt.bundle_digest,route_id:trace.route_id,context_reconciliation_ref:'reconciliation.json',rows:trace.rows},frontend_cases:cases};
 const run=()=>{put('acceptance.json',acceptance);return verifyFrontendDelivery({root:target,acceptanceRef:'acceptance.json',sliceRef:'slice.ui'});};assert.equal((await run()).result,'inputs-verified');
 const dependency=structuredClone(acceptance.backend_dependency);acceptance.backend_dependency.reason='未经批准的替代依据';await assert.rejects(run,/后端不适用依据.*战略预检/);acceptance.backend_dependency=dependency;
 acceptance.ui_baseline_kind='prototype';await assert.rejects(run,/基线类型/);acceptance.ui_baseline_kind='existing-ui-baseline';
 acceptance.frontend_cases[0].baseline_case_ids=['unknown'];await assert.rejects(run,/悬空/);acceptance.frontend_cases[0].baseline_case_ids=['submit'];
 acceptance.schema_version=2;delete acceptance.ui_baseline_kind;for(const item of acceptance.frontend_cases){item.visual_case_ids=item.baseline_case_ids;delete item.baseline_case_ids;}await assert.rejects(run,/协议版本不匹配/);
});
test('自洽摘要不能掩盖 build/source、API operation 与截图 viewport 冲突',t=>{
 const base=root(t),f=baselineFixture(base),check=()=>validateExistingUiBaseline(f.data,{bundleRoot:base}).errors.join(' ');
 const manifest=read(path.join(base,'source-manifest.json'));manifest.project_id='other';f.put('source-manifest.json',manifest);f.data.source.manifest=f.binding('source-manifest.json');assert.match(check(),/源码身份/);manifest.project_id=f.data.source.project_id;f.put('source-manifest.json',manifest);f.data.source.manifest=f.binding('source-manifest.json');
 const build=read(path.join(base,'build.json'));build.source_commit='2'.repeat(40);f.put('build.json',build);f.data.build=f.binding('build.json');assert.match(check(),/当前源码/);build.source_commit=f.data.source.source_commit;f.put('build.json',build);f.data.build=f.binding('build.json');
 const api=read(path.join(base,'api/exchange.json'));api.exchanges[0].operation_id='anotherOperation';f.put('api/exchange.json',api);f.data.cases[0].api=f.binding('api/exchange.json');const capture=read(path.join(base,'capture.json'));capture.cases=f.data.cases;f.put('capture.json',capture);f.data.capture=f.binding('capture.json');assert.match(check(),/operation/);
 api.exchanges[0].operation_id='submitSupplier';f.put('api/exchange.json',api);f.data.cases[0].api=f.binding('api/exchange.json');f.data.cases[0].viewport.width=500;capture.cases=f.data.cases;f.put('capture.json',capture);f.data.capture=f.binding('capture.json');assert.match(check(),/viewport/);
});
test('v5 既有基线与后端交付联合接收会执行真实 HTTP 五字段探测',async t=>{
 const {createServer}=await import('node:http');const {once}=await import('node:events');
 const {backendDeliveryBasis,inspectBackendDelivery,exportBackendDelivery,openBackendDelivery,importBackendDelivery}=await deliveryLibrary('backend','backend-delivery.mjs');
 const {verifyFrontendDelivery}=await deliveryLibrary('frontend','frontend-delivery.mjs');
 const base=root(t),source=path.join(base,'source'),frontend=path.join(base,'frontend');let backend=path.join(base,'backend');for(const dir of [source,backend,frontend])mkdirSync(dir);
 const put=(root,ref,value)=>{mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});writeFileSync(path.join(root,ref),typeof value==='string'?value:json(value));};
 const f=await handoffFixture(source);useCustomRouteIds(f);for(const dir of [backend,frontend]){put(dir,'yss-project.yaml','schema_version: 1\nrepository_mode: project-instance\n');put(dir,'CONTEXT.md',context);}
 const strategic=await finalizeDelivery({sourceRoot:source,handoffRef:'handoff.yaml'});
 frontendAuthority(frontend);
 let observed={},probes=0;const server=createServer((req,res)=>{probes++;res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(observed));});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());
 const nativeSeed=process.env.YSS_DELIVERY_TEST_BACKEND_ROOT;
 let delivery,deliveryRef='delivery.json';
 if(nativeSeed) {
   const current=await backendProfileTerminalFixture({nativeSeed,
     strategicInput:{delivery:strategic.delivery,bundle_digest:strategic.bundle_digest,route_id:'route.custom-backend'},
     openapiBytes:readFileSync(path.join(source,'existing-ui/api/openapi.json')),
     environment:{id:'fixture-local',base_url:`http://127.0.0.1:${server.address().port}`,deployment_id:'fixture-v1'}});
   t.after(current.cleanup);rmSync(backend,{recursive:true});backend=current.root;delivery=current.delivery;deliveryRef=current.deliveryRef;
   assert.equal(read(path.join(backend,delivery.slice_contract.ref)).slice_contract.schema_version,3);
   assert.equal(current.result.result,'backend-delivered');assert.equal(current.result.business_completed,false);
 }else {
   installedProfile('backend',backend);cpSync(strategic.delivery,path.join(backend,'strategy-package'),{recursive:true});
   const dedicated=['harness.backend-delivery','harness.frontend-delivery'].includes(loadDeliveryProfile()?.profile_id);
   const roles=read(path.join(dedicated?ROOT:source,'.template-spec/agents/digital-human-roles.yaml'));if(!dedicated){for(const gate of ['gate.openapi-frozen']){roles.gate_policy.biological_human=(roles.gate_policy.biological_human||[]).filter(item=>item!==gate);roles.gate_policy.digital_human_review=(roles.gate_policy.digital_human_review||[]).filter(item=>item.gate!==gate);roles.gate_policy.digital_human_review.push({gate,countersigners:['role.product-manager']});}roles.gate_policy.orchestrator=[...(roles.gate_policy.orchestrator||[]),'gate.slice-contract-approved'];}put(backend,'.template-spec/agents/digital-human-roles.yaml',roles);
   put(backend,'api.json',read(path.join(source,'existing-ui/api/openapi.json')));put(backend,'slice.json',{schema_version:2,contract_id:'contract.backend',contract_version:'v1',slice_id:'slice.submit',status:'approved'});put(backend,'data.txt','SYNTHETIC data setup');put(backend,'test.log','SYNTHETIC successful and failed business cases');
   const file=ref=>({ref,digest:hash(readFileSync(path.join(backend,ref)))});
   const apiApproval=attachArtifactApproval(backend,'api.json','api.fixture',dedicated?'gate.openapi-freeze-confirmed':'gate.openapi-frozen');
   const sliceApproval=attachSliceApproval(backend,'slice.json');
   delivery={schema_version:1,delivery_id:'backend-delivery.fixture',version:'v1',status:'verified',strategic_bundle_ref:'strategy-package',strategic_bundle_digest:strategic.bundle_digest,strategic_route_id:'route.custom-backend',scope:{slice_id:'slice.submit',source_ids:['rule.complete','scenario.submit'],operation_ids:['submitSupplier']},openapi:apiApproval.binding,slice_contract:sliceApproval.binding,build:{source_commit:'a'.repeat(40),artifact_digest:`sha256:${'b'.repeat(64)}`},environment:{id:'fixture-local',base_url:`http://127.0.0.1:${server.address().port}`,deployment_id:'fixture-v1',revision_path:'/version',revision_pointers:{deployment_id:'/deployment_id',source_commit:'/source_commit',openapi_digest:'/openapi_digest',artifact_digest:'/artifact_digest',test_data_digest:'/test_data_digest'},test_data:file('data.txt')},verification:{},supporting_files:[...sliceApproval.supportingFiles,...apiApproval.supportingFiles]};
   for(const [name,kind]of [['contract','backend-contract'],['deployment','backend-deployment']]){put(backend,`${name}.json`,{schema_version:1,kind,subject_digest:backendDeliveryBasis(delivery),results:[{command:'synthetic-maintenance-test',executed_at:new Date().toISOString(),exit_code:0,evidence:[file('test.log')]}],operation_ids:['submitSupplier'],coverage:[{source_id:'scenario.submit',outcome:'success'},{source_id:'scenario.submit',outcome:'failure'}]});delivery.verification[name]=file(`${name}.json`);}put(backend,deliveryRef,delivery);
 }
 const sliceId=delivery.scope.slice_id;
 observed={deployment_id:delivery.environment.deployment_id,source_commit:delivery.build.source_commit,openapi_digest:delivery.openapi.digest,artifact_digest:delivery.build.artifact_digest,test_data_digest:delivery.environment.test_data.digest};
 await t.test('v5 后端生产不能用裸 package 丢失正式交付记录',async()=>{
   put(backend,'bare-delivery.json',{...delivery,strategic_bundle_ref:'strategy-package/package'});
   await assert.rejects(()=>inspectBackendDelivery(backend,'bare-delivery.json'),/v5.*delivery wrapper/);
 });
 const sourceRecord=readFileSync(path.join(backend,'strategy-package/delivery-record.json'));
 await t.test('推进目标不得通过 supporting_files 进入后端交付证据',async()=>{
   put(backend,'.work/supplier/progression-target.json',{schema_version:1,target:'business-accepted'});
   put(backend,'intent-delivery.json',{...delivery,supporting_files:[...delivery.supporting_files,'.work/supplier/progression-target.json']});
   await assert.rejects(()=>exportBackendDelivery({sourceRoot:backend,deliveryRef:'intent-delivery.json',output:path.join(base,'intent-package')}),/推进目标.*不能作为.*交付证据/);
   assert.equal(existsSync(path.join(base,'intent-package')),false);
 });
 const output=path.join(base,'backend-package');await exportBackendDelivery({sourceRoot:backend,deliveryRef,output,zip:true});
 await t.test('自洽清单摘要也不能把推进目标带入后端包',async()=>{
   const changed=path.join(base,'intent-manifest-package');cpSync(output,changed,{recursive:true});
   const ref='.work/supplier/PROGRESSION-TARGET.JSON',name=`payload/files/${ref}`,bytes=Buffer.from(json({schema_version:1,target:'business-accepted'}));
   put(changed,name,bytes.toString());const {bundle_digest,...body}=read(path.join(changed,'manifest.json'));
   body.files.push({path:name,original_ref:ref,size_bytes:bytes.length,sha256:hash(bytes)});put(changed,'manifest.json',{...body,bundle_digest:digest(body)});
   await assert.rejects(()=>openBackendDelivery(changed,()=>null),/推进目标.*不能作为.*交付证据/);
 });
 rmSync(source,{recursive:true});rmSync(backend,{recursive:true});
 await openBackendDelivery(`${output}.zip`,bundle=>assert.deepEqual(readFileSync(path.join(bundle.source,'strategy-package/delivery-record.json')),sourceRecord));
 const imported=await importBackendDelivery({bundle:`${output}.zip`,targetRoot:frontend});
 const acceptanceDraft=read(path.join(frontend,imported.acceptance_ref));assert.equal(acceptanceDraft.schema_version,3);assert.equal(acceptanceDraft.ui_baseline_kind,'existing-ui-baseline');assert.equal(acceptanceDraft.backend_dependency.route_id,'route.custom-backend');
 const backendReceipt=read(path.join(frontend,imported.receipt_ref));const strategicRef='docs/handoffs/strategic-design-handoff.supplier/v1/import-receipt.json',receipt=read(path.join(frontend,strategicRef)),route=receipt.routes.find(item=>item.capability==='frontend-engineering-design');
 assert.equal(receipt.schema_version,3);assert.equal(receipt.ready_for_agent,false);assert.deepEqual(readFileSync(path.join(frontend,receipt.source_delivery_record_ref)),sourceRecord);
 const preflightRef=route.artifact_refs.find(ref=>ref.endsWith('frontend-strategic-preflight-draft.json')),traceRef=route.artifact_refs.find(ref=>ref.endsWith('frontend-traceability-draft.json')),preflight=read(path.join(frontend,preflightRef)),trace=read(path.join(frontend,traceRef));
 put(frontend,'reconciliation.json',{schema_version:1,repository_mode:'project-instance',stage:'stage.frontend-engineering-design',work_unit:'work-unit.frontend-engineering-design',status:'reconciled',context_snapshot:f.snapshot,changes:{added:['Global/Supplier'],updated:[],deprecated:[]},unresolved_terms:[],evidence_refs:['CONTEXT.md']});preflight.status='verified';preflight.context_reconciliation_ref='reconciliation.json';put(frontend,preflightRef,preflight);
 put(frontend,'cases.md','SYNTHETIC frontend mapping');const cases=['success','failure'].map(outcome=>({case_id:`accept-${outcome}`,source_ids:['rule.complete','scenario.submit'],outcome,operation_ids:['submitSupplier'],baseline_case_ids:['submit'],evidence_ref:'cases.md',evidence_digest:hash(readFileSync(path.join(frontend,'cases.md')))}));for(const row of trace.rows)Object.assign(row,{disposition:'mapped',frontend_case_refs:cases.map(item=>item.case_id),dependency_status:'known',dependent_slice_refs:[sliceId],evidence_refs:['cases.md']});
 const acceptance={schema_version:3,status:'accepted',slice_id:sliceId,ui_baseline_kind:'existing-ui-baseline',strategic_preflight:{ref:preflightRef,digest:hash(readFileSync(path.join(frontend,preflightRef)))},backend_dependency:preflight.backend_dependency,backend_delivery:{import_receipt_ref:imported.receipt_ref,bundle_digest:backendReceipt.bundle_digest},strategic_handoff:{import_receipt_ref:strategicRef,bundle_digest:receipt.bundle_digest,route_id:trace.route_id,context_reconciliation_ref:'reconciliation.json',rows:trace.rows},frontend_cases:cases};put(frontend,'acceptance.json',acceptance);
 const run=()=>verifyFrontendDelivery({root:frontend,acceptanceRef:'acceptance.json',sliceRef:sliceId});assert.equal((await run()).result,'inputs-verified');assert.equal(probes,1);
 await t.test('有后端依赖不得伪造不适用或替换消费者 route_id',async()=>{
   const missing=structuredClone(acceptance);delete missing.backend_delivery;
   missing.backend_dependency={mode:'not-applicable',route_id:preflight.backend_dependency.route_id,reason:'伪造 UI-only',impact_refs:['impact_assessment.backend'],evidence_refs:['cases.md']};
   missing.frontend_cases.forEach(item=>{item.operation_ids=[];});put(frontend,'missing-backend.json',missing);
   await assert.rejects(()=>verifyFrontendDelivery({root:frontend,acceptanceRef:'missing-backend.json',sliceRef:sliceId}),/后端依赖.*战略预检/);
   const wrong=structuredClone(acceptance);wrong.backend_dependency.route_id='route.other-backend';put(frontend,'wrong-route.json',wrong);
   await assert.rejects(()=>verifyFrontendDelivery({root:frontend,acceptanceRef:'wrong-route.json',sliceRef:sliceId}),/后端依赖.*战略预检/);
 });
 observed={...observed,source_commit:'c'.repeat(40)};await assert.rejects(run,/真实服务版本不匹配/);
});
test('固定 Vite 代理映射保留真实前缀 URL；错误 prefix、未绑定配置与任意 rewrite 拒绝',async t=>{
 const {files}=await import('../../scripts/lib/strategic-handoff-io.mjs');const base=root(t),f=baselineFixture(base);
 f.put('source/vite.config.ts',"const apiBase = env.VITE_API_BASE_URL || '/api'\nconst server = {proxy: {[apiBase]: {target: proxyTarget, changeOrigin: true, rewrite: (path) => path.replace(new RegExp(`^${apiBase}`), '')}}}");
 f.put('source/.env.production.standalone','VITE_API_BASE_URL=/api/quality-v3\n');
 const source=f.data.source;source.digest=treeDigest(base,'source');const manifest=read(path.join(base,source.manifest.ref));manifest.source_digest=source.digest;manifest.files=files(base,'source').map(ref=>({path:ref.slice(7),digest:f.binding(ref).digest}));f.put(source.manifest.ref,manifest);source.manifest=f.binding(source.manifest.ref);
 const build=read(path.join(base,'build.json'));build.source_digest=source.digest;f.put('build.json',build);f.data.build=f.binding('build.json');
 const api=read(path.join(base,'api/exchange.json'));api.source_digest=source.digest;api.build_digest=f.data.build.digest;api.exchanges[0].url='http://127.0.0.1:9999/api/quality-v3/supplier';f.put('api/exchange.json',api);f.data.cases[0].api=f.binding('api/exchange.json');
 const capture=read(path.join(base,'capture.json'));Object.assign(capture,{source_digest:source.digest,build_digest:f.data.build.digest,cases:f.data.cases});f.put('capture.json',capture);f.data.capture=f.binding('capture.json');
 const check=()=>validateExistingUiBaseline(f.data,{bundleRoot:base}).errors;
 assert.match(check().join(' '),/API URL/);f.data.api_route_mapping={kind:'vite-env-prefix-rewrite',config:f.binding('source/vite.config.ts'),environment:f.binding('source/.env.production.standalone'),prefix:'/api/quality-v3',replacement:''};assert.deepEqual(check(),[]);
 f.data.api_route_mapping.prefix='/api/other';assert.match(check().join(' '),/prefix/);f.data.api_route_mapping.prefix='/api/quality-v3';
 f.data.api_route_mapping.config=f.binding('actions.txt');assert.match(check().join(' '),/固定源码/);
 f.data.api_route_mapping.config=f.binding('source/vite.config.ts');f.data.api_route_mapping.replacement='/anything';assert(check().length);
});
test('真实战略专职 policy 使用产品设计聚合门禁；ready-for-human 原字节确认可导出且状态改写失效',async t=>{
 const {dedicatedDesignHandoffFixture}=await import('../../scripts/fixtures/existing-ui-baseline/fixture.mjs');
 const base=root(t),source=path.join(base,'source');mkdirSync(source);const f=await dedicatedDesignHandoffFixture(source);
 assert(f.roles.user_decision_policy.gates.includes('gate.product-design-approved'));assert(!f.roles.user_decision_policy.gates.includes('gate.user-confirmation'));
 assert.equal(f.baseline.data.status,'ready-for-human');assert.equal(f.handoff.package_export.approvals.existing_ui_baseline_ref.gate_id,'gate.product-design-approved');
 const output=path.join(base,'package');await exportBundle({sourceRoot:source,handoffRef:'handoff.yaml',output});assert.equal(await openBundle(output,b=>b.handoff.ui_baseline_kind,{readOnly:true}),'existing-ui-baseline');
 const missingPolicy=structuredClone(f.roles);missingPolicy.user_decision_policy.gates=missingPolicy.user_decision_policy.gates.filter(gate=>gate!=='gate.product-design-approved');f.put('.template-spec/agents/digital-human-roles.yaml',missingPolicy);await assert.rejects(()=>inspectSource(source,'handoff.yaml'),/真实用户决定策略/);f.put('.template-spec/agents/digital-human-roles.yaml',f.roles);
 const approvalRef=path.join(source,'approvals/existing-ui.json'),approval=read(approvalRef),original=structuredClone(approval);delete approval.user_decision_ref;f.put('approvals/existing-ui.json',approval);await assert.rejects(()=>inspectSource(source,'handoff.yaml'),/user-decision/);
 f.baseline.data.status='approved';f.baseline.put('existing-ui-baseline.json',f.baseline.data);const changed=f.baseline.binding('existing-ui-baseline.json').digest;f.handoff.source.existing_ui_baseline_ref.digest=changed;original.artifact_bindings[0].digest=changed;f.put('approvals/existing-ui.json',original);f.put('handoff.yaml',f.handoff);
 await assert.rejects(()=>inspectSource(source,'handoff.yaml'),/user-decision|变化|digest|摘要/);
});
test('既有 UI 全目录作为已验证观测文件集：源删除后可验包，治理悬空引用仍拒绝',async t=>{
 const base=root(t),source=path.join(base,'source');mkdirSync(source);const f=await handoffFixture(source,{sourceDocumentation:true});
 f.handoff.package_export.additional_files.push('missing-governance.md');f.save();await assert.rejects(()=>exportBundle({sourceRoot:source,handoffRef:'handoff.yaml',output:path.join(base,'invalid')}),/文件不可读.*missing-governance/);
 f.handoff.package_export.additional_files=[];f.save();const output=path.join(base,'package');await exportBundle({sourceRoot:source,handoffRef:'handoff.yaml',output});
 rmSync(source,{recursive:true});assert.equal(await openBundle(output,b=>b.handoff.ui_baseline_kind,{readOnly:true}),'existing-ui-baseline');
 const raw=readFileSync(path.join(output,'payload/files/existing-ui/source/README.md'),'utf8');assert.match(raw,/original-source/);
});
