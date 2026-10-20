// Synthetic business and user messages; installation, checks and transactions are real.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {readingLocation} from '../../lib/reading-view-policy.mjs';
import {lifecycleStatus} from '../../lib/lifecycle-status.mjs';
import {installedFixture} from './installed-fixture.mjs';
import {stageGatesFixture} from '../../lib/testing/stage-gates-fixture.mjs';
import {stageContentFixture} from '../../lib/testing/stage-content-fixture.mjs';
import {parseContextContract,resolveContextTermRefs} from '../../lib/context-contract.mjs';
import {parseAsset} from '../../lib/structured-assets.mjs';
import {digest} from '../../lib/strategic-handoff-io.mjs';
import {finalizeDelivery,importBundle} from '../../lib/strategic-handoff.mjs';

test('installed four-stage Spec records one Plan decision, stops at Spec and exports without a fifth approval',async()=>{
 const f=installedFixture('spec'),receiver=installedFixture('backend'),s=stageGatesFixture({existingRoot:f.root});
 const {root,write,read,asset,run}=f,cpRef='.work/feature-demo/checkpoint.json',feature='feature.demo';
 const doc=ref=>parseAsset(read(ref)),bound=ref=>({...asset(ref),digest:'sha256:'+asset(ref).digest,version:'v1'});
 const save=(ref,gate)=>{
  const before=read(cpRef),input=read(ref),out=path.join(path.dirname(root),gate+'.plan.json');
  run('plan-'+gate,['lifecycle','decision','plan','--checkpoint',cpRef,'--input',ref,'--out',out]);
  assert.deepEqual(read(cpRef),before);assert.deepEqual(read(ref),input);
  run('apply-'+gate,['lifecycle','decision','apply','--plan',out]);
  const after=read(cpRef);run('retry-'+gate,['lifecycle','decision','apply','--plan',out]);assert.deepEqual(read(cpRef),after);
  return doc(cpRef).gates[gate].record_ref;
 };
 try {
  const ids=s.doc('.template-spec/process/lifecycle-registry.yaml').gates.map(g=>g.id);
  assert.equal(ids.length,4);assert.ok(ids.includes('gate.implementation-admitted'));
  const skill='.agents/skills/yss-stage-decision';
  if(!fs.existsSync(path.join(root,skill,'SKILL.md'))){const out=path.join(path.dirname(root),'skills.plan.json');run('skill-plan',['skills','ensure','yss-stage-decision','--plan','--out',out]);run('skill-apply',['skills','--apply','--plan-file',out]);}
  const handoffData=JSON.parse(fs.readFileSync(new URL('./handoff-data.json',import.meta.url)));write('CONTEXT.md',handoffData.assets['CONTEXT.md']);
  stageContentFixture(s,{ui:false});
  write('plan.md','# 方案\n当前范围只实现输入校验；无 UI。\n');
  const context=parseContextContract({root});
  write('reconciliation.json',{schema_version:1,repository_mode:'project-instance',stage:'stage.spec-architecture',work_unit:'work-unit.spec-synthesis',status:'reconciled',context_snapshot:{context_ref:context.context_ref,context_schema_version:context.context_schema_version,document_digest:context.document_digest,referenced_terms_digest:resolveContextTermRefs(context,[]).referenced_terms_digest,term_refs:[]},changes:{added:[],updated:[],deprecated:[]},unresolved_terms:[],evidence_refs:['CONTEXT.md']});
  write(cpRef,{schema_version:2,repository_mode:'project-instance',feature_id:feature,mode:'orchestrate',status:'running',stage:'stage.plan',artifacts:{},checks:{},gates:{},context_reconciliation:{status:'reconciled',ref:'reconciliation.json',evidence_refs:['reconciliation.json']},next_work_unit:'work-unit.plan-requirements',ticket_sync:{},verification:{},human_review:{},git_checkpoint:{},blockers:[],rollback:[]});
  write('.work/feature-demo/map.md',`---\ncheckpoint_ref: ${cpRef}\n---\n# TEST feature\n`);
  const checkpointBefore=read(cpRef);
  assert.deepEqual(readingLocation(root,cpRef),{feature,base:'.work/feature-demo',directory:'.work/feature-demo/reading'});
  const displayed=lifecycleStatus({root,checkpointRef:cpRef});
  assert.equal(displayed.execution_authorization,'not-evaluated');
  assert.equal(displayed.presentation.execution_allowed,false);
  assert.equal(displayed.plan_review,undefined);
  assert.equal(displayed.diagnostics.some(row=>row.code.startsWith('plan-review-control')),false);
  assert.deepEqual(read(cpRef),checkpointBefore);
  const argvByCheck=Object.fromEntries([['domain-strategy','domain.json','check.domain-strategy-approved'],['stage-decision-package','stage-decision.json','check.stage-decision-package-approved']].map(([kind,ref,id])=>[id,[process.execPath,path.join(root,skill,'scripts/validate-'+kind+'.mjs'),path.join(root,ref),'--root',root]]));
  write('evidence/discovery-supplier.md','TEST business source: 供应商提交材料，失败保留输入；本场景无 UI。');
  write('evidence/discovery-compliance.md','TEST business source: 只允许当前准入有效的供应商合作，失效状态拒绝。');
  const reviewedArgv=argvByCheck['check.domain-strategy-approved'],reviewed=spawnSync(reviewedArgv[0],reviewedArgv.slice(1),{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024,timeout:120000});assert.equal(reviewed.status,0,reviewed.stderr);
  write('evidence/domain-strategy-review.json',{phase:'execution',argv:reviewedArgv,exit_code:reviewed.status,executed_at:new Date().toISOString(),result:'passed',input_bindings:[asset('domain.json')],stdout:reviewed.stdout,stderr:reviewed.stderr,blocking_findings:[]});
  write('source-evidence-map.json',{'evidence.discovery.supplier':'evidence/discovery-supplier.md','evidence.discovery.compliance':'evidence/discovery-compliance.md','evidence.domain-strategy-review.supplier':'evidence/domain-strategy-review.json'});
  s.record({subjectRef:'domain.json',extraAssets:['stage-decision.json','plan.md','source-evidence-map.json','evidence/discovery-supplier.md','evidence/discovery-compliance.md','evidence/domain-strategy-review.json'],argvByCheck});
  const pending=doc('stage.json');pending.outcome='ready-for-human';delete pending.authorization;write('pending-stage.json',pending);
  const pendingPlan=path.join(path.dirname(root),'pending-stage.plan.json');
  run('pending-plan',['lifecycle','decision','plan','--checkpoint',cpRef,'--input','pending-stage.json','--out',pendingPlan]);
  run('pending-apply',['lifecycle','decision','apply','--plan',pendingPlan]);
  run('pending-checkpoint-is-readable',['lifecycle','verify','--checkpoint',cpRef,'--profile','spec']);
  run('pending-grants-no-entry',['contract','verify','--kind','plan-entry','--file',cpRef],'STAGE_PENDING');
  const planRef=save('stage.json','gate.plan-approved');
  run('Plan-entry',['contract','verify','--kind','plan-entry','--file',cpRef]);
  // An explicit old-policy mapping preserves the original checkpoint and reply.
  const oldRef='.work/feature-demo/old-checkpoint.json',newRef='.work/feature-demo/migrated-checkpoint.json';
  const old={...doc(cpRef),schema_version:1,gates:{}};write(oldRef,old);
  const sourcePolicy=JSON.parse(fs.readFileSync(new URL('./legacy-spec-policy.json',import.meta.url))).policy;
  write('original-policy.json',sourcePolicy);
  const decisionRef=doc(planRef).authorization.ref,originalReply=read(decisionRef),originalCheckpoint=read(oldRef);
  write('migration.json',{schema_version:1,target_checkpoint_ref:newRef,source_policy_ref:'original-policy.json',source_policy_digest:asset('original-policy.json').digest,stage_sources:[{gate_id:'gate.plan-approved',asset_refs:['domain.json','stage-decision.json','plan.md'],decision_refs:[decisionRef],evidence_refs:['check.domain-strategy-approved.execution.json','check.stage-decision-package-approved.execution.json']}]});
  const migrationPlan=path.join(path.dirname(root),'migration.plan.json');
  const migration=run('explicit-migration-plan',['lifecycle','decision','migrate-plan','--checkpoint',oldRef,'--input','migration.json','--out',migrationPlan]);
  assert.match(migration.options.unresolved_gates,/gate.spec-baseline-approved/);
  assert.deepEqual(read(oldRef),originalCheckpoint);
  run('explicit-migration-apply',['lifecycle','decision','apply','--plan',migrationPlan]);
  assert.deepEqual(read(oldRef),originalCheckpoint);assert.deepEqual(read(decisionRef),originalReply);
  assert.deepEqual(Object.keys(doc(newRef).gates),['gate.plan-approved']);

  for(const [kind,ref] of [['domain-strategy','domain.json'],['stage-decision-package','stage-decision.json']]){
   const r=spawnSync(process.execPath,[path.join(root,skill,'scripts/validate-'+kind+'.mjs'),path.join(root,ref),'--root',root,'--mode','stage','--checkpoint',cpRef],{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  }
  const data=handoffData;
  for(const [ref,bytes] of Object.entries(data.assets))if(ref!=='CONTEXT.md'&&!/strategy|stage/.test(ref))write(ref,bytes);
  for(const ref of ['source/spec.md','source/business-tickets/BT-001.md']) {
    let bytes=read(ref).toString().replaceAll('source/strategy.yaml','domain.json').replaceAll('source/stage.yaml','stage-decision.json');
    for(const [oldRef,newRef] of [['source/strategy.yaml','domain.json'],['source/stage.yaml','stage-decision.json']])bytes=bytes.replaceAll(digest(JSON.parse(data.assets[oldRef])),digest(doc(newRef)));
    if(ref.endsWith('BT-001.md')) {const parts=bytes.split('---'); const ticket=JSON.parse(parts[1]);ticket.source_refs=[];bytes='---\n'+JSON.stringify(ticket)+'\n---'+parts.slice(2).join('---');}
    write(ref,bytes);
  }
  const ticketSet=doc('source/tickets.yaml');ticketSet.spec.digest='sha256:'+asset('source/spec.md').digest;for(const ticket of ticketSet.tickets)ticket.digest='sha256:'+asset(ticket.ref).digest;write('source/tickets.yaml',ticketSet);
  // The original business fixture carries a review reference; draft mode needs
  // no future review. Formal packaging below supplies a real self-check.
  const outputs=['source/spec.md','source/tickets.yaml','source/business-tickets/BT-001.md'];
  write('spec-input.json',{feature_id:feature,scope:{impacted_areas:['backend']},status:'draft'});
  const cp=doc(cpRef);Object.assign(cp,{stage:'stage.spec-architecture',next_work_unit:'work-unit.spec-synthesis',artifacts:Object.fromEntries(Object.entries({'artifact.spec':'source/spec.md','artifact.plan':'plan.md','artifact.domain-strategy':'domain.json','artifact.stage-decision-package':'stage-decision.json','artifact.business-ticket-set':'source/tickets.yaml'}).map(([id,ref])=>[id,{ref,status:"ready-for-human",evidence_refs:[]}]))});write(cpRef,cp);
  const prep=f.draftTask({taskRef:'spec-prepare.json',unit:'work-unit.spec-synthesis',stage:'stage.spec-architecture',impacts:['backend'],featureId:feature,checkpointRef:cpRef,inputs:['spec-input.json'],paths:outputs,outputs});f.finishTask(prep);run('Spec-preparation',['contract','verify','--kind','task','--file',prep.provenance.task_ref]);
  const argv=[process.env.YSS_NATIVE_BINARY,'contract','verify','--kind','business-tickets','--mode','draft','--file','source/tickets.yaml','--root',root,'--json'];
  const check=spawnSync(argv[0],argv.slice(1),{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024,timeout:120000});assert.equal(check.status,0,check.stdout);
  write('business-check.json',{phase:'execution',tool:'node',task_ref:prep.provenance.task_ref,identity:prep.provenance.identity,candidate_digest:asset('source/tickets.yaml').digest,scope:[feature],argv,cwd:root,exit_code:check.status,executed_at:new Date().toISOString(),result:'passed',blocking_findings:[],stdout:check.stdout,stderr:check.stderr});
  write('source/business-review.yaml',{schema_version:2,kind:'business-ticket-review',result:'passed',subject_ref:'source/tickets.yaml',subject_digest:'sha256:'+asset('source/tickets.yaml').digest,basis:[asset(prep.provenance.task_ref)],assessment:{mode:'self-check',provenance:{...prep.provenance,execution_ref:'business-check.json'}},evidence:[bound('business-check.json')]});
  run('business-formal',['contract','verify','--kind','business-tickets','--mode','formal','--file','source/tickets.yaml']);
  s.record({gateId:'gate.spec-baseline-approved',subjectRef:'source/spec.md',extraAssets:['source/tickets.yaml',...outputs.slice(2),'stage-decision.json'],argvByCheck:{'check.artifact-consistency-analyzed':argv},notApplicable:{'check.prototype-reviewed':'已核对当前范围，无 UI 影响。','check.prototype-verified':'已核对当前范围，无 UI 影响。'}});
  const specRef=save('stage.json','gate.spec-baseline-approved');
  write('.work/feature-demo/progression-target.json',{schema_version:1,kind:'lifecycle-progression-target',feature_id:feature,checkpoint_ref:cpRef,target:'spec-approved',intent_source:'TEST only Spec requested',consumers:[]});
  const reached=run('Spec-only-target',['lifecycle','target','--checkpoint',cpRef]);assert.equal(reached.progression.status,'reached',JSON.stringify(reached));
  assert.equal(doc(cpRef).gates['gate.implementation-admitted'],undefined);
  assert.equal(fs.existsSync(path.join(root,'prototype.html')),false);
  const handoff=structuredClone(data.handoff);handoff.package_export.approvals={};handoff.package_export.reference_map=doc('source-evidence-map.json');
  for(const [key,source] of Object.entries(handoff.source)){
   const plan=['domain_strategy_ref','stage_decision_package_ref'].includes(key);
   if(plan){const ref=key==='domain_strategy_ref'?'domain.json':'stage-decision.json';source.persisted_ref=ref;source.digest=digest(doc(ref));const d=doc(ref);source.id=d.domain_strategy_id||d.stage_decision_id;source.version=d.domain_version||d.package_version;}
   else source.digest='sha256:'+asset(source.persisted_ref).digest;
   delete source.approval_context;
   handoff.package_export.approvals[key]={record_ref:plan?planRef:specRef,gate_id:plan?'gate.plan-approved':'gate.spec-baseline-approved',digest_kind:plan?'canonical-json':'sha256-bytes'};
  }
  handoff.package_export.approvals.handoff={record_ref:specRef,gate_id:'gate.spec-baseline-approved',digest_kind:'sha256-bytes'};
  write('handoff.json',handoff);
  const delivery=await finalizeDelivery({sourceRoot:root,handoffRef:'handoff.json',evidenceRoot:root});
  const transport=path.join(path.dirname(root),'transport');fs.cpSync(delivery.delivery,transport,{recursive:true});const offline=root+'.offline';fs.renameSync(root,offline);
  let imported;try{imported=await importBundle({bundle:transport,targetRoot:receiver.root,evidenceRoot:receiver.root});}finally{fs.renameSync(offline,root);}
  assert.equal(JSON.parse(receiver.read(imported.receipt_ref)).status,'pending-context-reconciliation');
  assert.equal(JSON.parse(receiver.read(imported.receipt_ref)).ready_for_agent,false);
 }finally {f.cleanup();receiver.cleanup();}
});
