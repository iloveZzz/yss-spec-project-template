import {makeRoot} from '../helpers/yss-instance.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fixture, context } from '../../scripts/fixtures/strategic-handoff/fixture.mjs';
import { composeProfileTree } from '../../scripts/lib/profile-tree.mjs';
import { exportBundle, finalizeDelivery, importBundle } from '../helpers/legacy-strategic-handoff-fixture.mjs';
import { assertImportReceipt, inspectSource, openBundle, openDelivery } from '../../scripts/lib/strategic-handoff.mjs';
import { read, json, hash, digest } from '../../scripts/lib/strategic-handoff-io.mjs';
const setupV4=async (t,options={})=>{const base=mkdtempSync(path.join(tmpdir(),'handoff-v4-test-'));t.after(()=>rmSync(base,{recursive:true,force:true}));const source=path.join(base,'source');mkdirSync(source);return{base,source,...await fixture(source,{handoffVersion:4,...options})};};
const setupV5=async (t,options={})=>{const base=mkdtempSync(path.join(tmpdir(),'handoff-v5-test-'));t.after(()=>rmSync(base,{recursive:true,force:true}));const source=path.join(base,'source');mkdirSync(source);return{base,source,...await fixture(source,{handoffVersion:5,...options})};};
test('固定目录和 ZIP 可通过生产验包器脱离源仓读取',async t=>{
 const f=await setupV4(t);const output=path.join(f.base,'package'),evidenceRoot=makeRoot('handoff-read-evidence-');
 const result=await exportBundle({sourceRoot:f.source,handoffRef:'handoff.yaml',output,zip:true,evidenceRoot});
 rmSync(f.source,{recursive:true});
 for(const bundle of [output,`${output}.zip`])assert.equal(await openBundle(bundle,b=>b.manifest.bundle_digest,{evidenceRoot}),result.bundle_digest);
});
test('v5 固定交付通过生产读取器核验来源与摘要',async t=>{
 const f=await setupV5(t);
 const first=await finalizeDelivery({sourceRoot:f.source,handoffRef:'handoff.yaml',zip:true,evidenceRoot:f.source});
 const delivery=first.delivery;
 const opened=await openDelivery(delivery,d=>({record:d.record,verification:d.verification,readme:readFileSync(path.join(d.packageRoot,'README.md'),'utf8')}),{evidenceRoot:f.source});
 assert.equal(opened.record.schema_version,1);assert.equal(opened.record.status,'packaged');assert.equal(opened.record.handoff.schema_version,5);
 assert.equal(opened.verification.result,'verified');assert.equal(opened.verification.bundle_digest,opened.record.bundle_digest);
 assert.match(opened.readme,/backend-technical-design/);
});
test('v5 固定交付和 Receipt v3 通过生产消费者来源绑定核验',async t=>{
 const f=await setupV5(t);const finalized=await finalizeDelivery({sourceRoot:f.source,handoffRef:'handoff.yaml',evidenceRoot:f.source});
 const recordBytes=readFileSync(path.join(finalized.delivery,'delivery-record.json'));
 for(const profileId of ['harness.backend-delivery']){
  const target=path.join(f.base,profileId);mkdirSync(path.join(target,'.template-spec/process'),{recursive:true});
  cpSync(path.join(composeProfileTree('backend'),'.template-spec/process'),path.join(target,'.template-spec/process'),{recursive:true});
  writeFileSync(path.join(target,'yss-project.yaml'),'schema_version: 1\nrepository_mode: project-instance\n');writeFileSync(path.join(target,'CONTEXT.md'),context);
  const imported=await importBundle({bundle:finalized.delivery,targetRoot:target,evidenceRoot:f.source});const receipt=read(path.join(target,imported.receipt_ref));
  assert.equal(receipt.schema_version,3);assert.equal(receipt.ready_for_agent,false);assert.equal(receipt.source_delivery_record_sha256,hash(recordBytes));
  assert.deepEqual(readFileSync(path.join(target,receipt.source_delivery_record_ref)),recordBytes);
  await openDelivery(finalized.delivery, bundle=>assertImportReceipt(target,receipt,bundle,'backend-technical-design'),{evidenceRoot:f.source});
 }
});
test('v4 来源路由必须与影响矩阵一致；未知版本 fail closed',async t=>{
 const f=await setupV4(t),run=()=>inspectSource(f.source,'handoff.yaml');
 const backendRoute=f.handoff.consumer_routes.find(route=>route.capability==='backend-technical-design');backendRoute.activation='not-applicable';backendRoute.reason='伪造不适用';backendRoute.evidence_refs=['evidence/offline.log'];f.sign();
 await assert.rejects(run,/路由.*影响|影响.*路由/);
 f.handoff.schema_version=99;f.sign();
 await assert.rejects(run,error=>error.code==='CAPABILITY');
});
test('消费者反馈按源摘要裁决，amend 与 blocking defer 保持阻断',async t=>{
 const {verifyConsumerFeedback,verifyFeedbackAdjudication}=await import('../../scripts/lib/strategic-feedback.mjs');
 const f=await setupV4(t),output=path.join(f.base,'package');await exportBundle({sourceRoot:f.source,handoffRef:'handoff.yaml',output});
 const sourceRule=await openBundle(output,b=>b.indexes.rules[0]);
 const target=path.join(f.base,'target');mkdirSync(path.join(target,'.template-spec/process'),{recursive:true});writeFileSync(path.join(target,'yss-project.yaml'),'schema_version: 1\nrepository_mode: project-instance\n');writeFileSync(path.join(target,'CONTEXT.md'),context);writeFileSync(path.join(target,'.template-spec/process/harness-profile.yaml'),json({schema_version:2,profile_id:'harness.backend-delivery',handoff:{consumer_capabilities:['backend-technical-design']}}));
 const imported=await importBundle({bundle:output,targetRoot:target}),receipt=read(path.join(target,imported.receipt_ref));writeFileSync(path.join(target,'feedback-evidence.md'),'Synthetic consumer feedback evidence.');writeFileSync(path.join(target,'feedback-approval.md'),'Synthetic adjudication approval evidence.');
 const feedback={schema_version:1,feedback_id:'consumer-feedback.supplier-rule',status:'submitted',import_receipt_ref:imported.receipt_ref,bundle:{id:receipt.bundle_id,version:receipt.version,digest:receipt.bundle_digest},route_id:'route.backend',source:{id:sourceRule.rule_id,digest:sourceRule.source_digest},issue_type:'rule-conflict',severity:'blocking',suggestion:'补充材料有效期规则',raised_by:'role.backend-agent',evidence_refs:['feedback-evidence.md'],created_at:'2026-09-11T00:00:00Z'};
 writeFileSync(path.join(target,'feedback.json'),json(feedback));assert.equal((await verifyConsumerFeedback({root:target,feedbackRef:'feedback.json'})).result,'feedback-verified');
 const baseAdjudication={schema_version:1,adjudication_id:'feedback-adjudication.supplier-rule',status:'approved',feedback:{ref:'feedback.json',digest:hash(readFileSync(path.join(target,'feedback.json')))},decision:'keep',reason:'当前规则已覆盖该约束',owner:'role.product-manager',return_work_unit:'work-unit.business-boundary-and-rules-design',target_version:'v1',approval_ref:'feedback-approval.md',evidence_refs:['feedback-approval.md'],decided_at:'2026-09-11T01:00:00Z'};
 writeFileSync(path.join(target,'adjudication.json'),json(baseAdjudication));assert.equal((await verifyFeedbackAdjudication({root:target,adjudicationRef:'adjudication.json'})).may_continue,true);
 writeFileSync(path.join(target,'feedback.json'),json({...feedback,suggestion:'changed'}));await assert.rejects(()=>verifyFeedbackAdjudication({root:target,adjudicationRef:'adjudication.json'}),/digest 已失效/);writeFileSync(path.join(target,'feedback.json'),json(feedback));
 const amend={...baseAdjudication,decision:'amend',reason:'需要修改战略规则',target_version:'v2'};writeFileSync(path.join(target,'adjudication.json'),json(amend));assert.equal((await verifyFeedbackAdjudication({root:target,adjudicationRef:'adjudication.json'})).requires_new_handoff,true);
 const defer={...baseAdjudication,decision:'defer',reason:'下一版本处理',target_version:'v2',risk:'当前切片可能违反材料有效期',verification_plan:'新增场景回归并重发交接'};delete defer.approval_ref;writeFileSync(path.join(target,'adjudication.json'),json(defer));assert.equal((await verifyFeedbackAdjudication({root:target,adjudicationRef:'adjudication.json'})).result,'blocked');
});
test('规则遗漏、摘要漂移、批准不匹配和离线资源丢失阻断来源验证',async t=>{
 const f=await setupV4(t);const run=()=>inspectSource(f.source,'handoff.yaml');
 const text=readFileSync(path.join(f.source,'source/strategy.yaml'));f.put('source/strategy.yaml',{...f.strategy,traceability_version:undefined});
 await assert.rejects(run,error=>error.code==='HANDOFF_SOURCE_STALE'||/traceability_version/.test(error.message));writeFileSync(path.join(f.source,'source/strategy.yaml'),text);
 const approved=read(path.join(f.source,'approvals/spec_ref.yaml'));f.put('approvals/spec_ref.yaml',{...approved,artifact_bindings:[]});await assert.rejects(run,error=>error.code==='HANDOFF_APPROVAL');f.put('approvals/spec_ref.yaml',approved);
 const roles=read(path.join(f.source,'.template-spec/agents/digital-human-roles.yaml'));f.put('.template-spec/agents/digital-human-roles.yaml',{...roles,user_decision_policy:{...roles.user_decision_policy,gates:['gate.domain-strategy-approved']}});await assert.rejects(run,/user-decision|升级/);f.put('.template-spec/agents/digital-human-roles.yaml',roles);
 const sourceBytes=readFileSync(path.join(f.source,'prototype-src/main.js'));f.put('prototype-src/main.js','changed');await assert.rejects(run,error=>error.code==='HANDOFF_PREVIEW'&&error.message.includes('源码或锁文件批准摘要'));writeFileSync(path.join(f.source,'prototype-src/main.js'),sourceBytes);
 const verification=read(path.join(f.source,'evidence/offline.json'));f.put('evidence/offline.json',{...verification,command:'changed'});await assert.rejects(run,error=>error.code==='CONTRACT_STALE'&&error.message.includes('evidence/offline.json'));f.put('evidence/offline.json',verification);
 f.put('preview/index.html','<img src="missing.png">');await assert.rejects(run,error=>error.code==='HANDOFF_SOURCE_STALE'&&error.message.includes('prototype_ref'));
});
test('篡改 payload、重新封摘要后的虚构规则索引、额外文件均拒绝',async t=>{
 const f=await setupV4(t),output=path.join(f.base,'package'),evidenceRoot=makeRoot('handoff-package-evidence-');t.after(()=>rmSync(evidenceRoot,{recursive:true,force:true}));await exportBundle({sourceRoot:f.source,handoffRef:'handoff.yaml',output,evidenceRoot});
 const spec=path.join(output,'payload/files/source/spec.md'),bytes=readFileSync(spec);writeFileSync(spec,'tampered');await assert.rejects(()=>openBundle(output,()=>null,{evidenceRoot}),/摘要/);writeFileSync(spec,bytes);
 writeFileSync(path.join(output,'extra.txt'),'extra');await assert.rejects(()=>openBundle(output,()=>null,{evidenceRoot}),/未登记/);rmSync(path.join(output,'extra.txt'));
 const manifest=read(path.join(output,'manifest.json'));const idx=Buffer.from(json([]));writeFileSync(path.join(output,'indexes/rules.json'),idx);const row=manifest.files.find(x=>x.path==='indexes/rules.json');row.sha256=hash(idx);row.size_bytes=idx.length;delete manifest.bundle_digest;manifest.bundle_digest=digest(manifest);writeFileSync(path.join(output,'manifest.json'),json(manifest));await assert.rejects(()=>openBundle(output,()=>null,{evidenceRoot}),error=>error.code==='HANDOFF_INDEX');
});
test('ZIP 路径穿越和重复条目拒绝',async t=>{
 const f=await setupV4(t);
 for(const names of [['../escape'],['manifest.json','manifest.json']]){
  const zip=path.join(f.base,'bad.zip');rmSync(zip,{force:true});const py='import zipfile,json,sys; z=zipfile.ZipFile(sys.argv[1],"w"); [z.writestr(n,"x") for n in json.loads(sys.argv[2])]; z.close()';assert.equal(spawnSync('python3',['-c',py,zip,JSON.stringify(names)]).status,0);await assert.rejects(()=>openBundle(zip,()=>null),/ZIP/);
 }
});

test('历史战略消费绑定不再作为当前验证', async () => {
 const {verifyConsumption}=await import('../../scripts/lib/strategic-handoff-consumption.mjs');
 await assert.rejects(()=>verifyConsumption({strategic_handoff:{}}),/legacy-strategic-handoff-unsupported/);
});

test('源规则必须稳定可追溯，关键场景不能遗漏结果',async t=>{
 const {extractTraceability}=await import('../../scripts/lib/strategic-handoff-rules.mjs');const f=await setupV4(t);
 for(const mutate of [s=>delete s.traceability_version,s=>s.scenarios[0].rule_refs=['rule.missing'],s=>delete s.scenarios[0].success_results,s=>s.invariants[0].rule_ref='rule.missing',s=>s.rule_catalog.push({...s.rule_catalog[0]})]){const s=structuredClone(f.strategy);mutate(s);assert.throws(()=>extractTraceability(s));}
});
test('旧战略 CLI 明确不支持新的离线导出', () => {
 const cli=path.resolve(import.meta.dirname,'../../scripts/strategic-handoff');
 const result=spawnSync(process.execPath,[cli,'export'],{encoding:'utf8'});
 assert.notEqual(result.status,0);assert.match(result.stderr,/legacy-strategic-handoff-unsupported/);
});
