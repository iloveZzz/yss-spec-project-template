import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateApprovalRecordFile, validateApprovalRecord, assertApprovedGateHasValidApproval, assertCheckpointApprovals} from '../../../../scripts/lib/approval-record.mjs';
import {assertCurrentApproval, approvalExpectationFromSubject} from '../../../../scripts/lib/approval-current.mjs';
import {loadDigitalHumanRoles} from '../../../../scripts/lib/digital-human-roles.mjs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {ROOT, loadRegistry} from '../../../../scripts/lib/lifecycle-registry.mjs';
import {prepareReviewPackage} from '../../../../scripts/lib/review-package.mjs';
import {approvalExpectedFromTask} from '../../../../scripts/lib/review-capabilities.mjs';
import {parseDocument} from '../../../../scripts/vendor/yaml.mjs';
import {readFileSync as snapshotRead} from '../../../../scripts/lib/validation-phase.mjs';
import {sourceApproval} from '../../../../scripts/lib/strategic-handoff.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture(run) {
 const root = mkdtempSync(path.join(tmpdir(), 'yss-current-approval-'));
 const save = (ref, value) => writeFileSync(path.join(root, ref), typeof value === 'string' ? value : JSON.stringify(value));
 const asset = ref => ({ref,digest:digest(readFileSync(path.join(root,ref)))});
 try {
  save('evidence.txt','command exited 0');
  save('subject.json',{gate_id:'check.design-reviewed',basis:[asset('evidence.txt')],drafter_principal_ref:'synthetic.drafter'});
  const record={schema_version:1,gate_id:'check.design-reviewed',decision:'approved',actor_kind:'digital-human',role_id:'role.test-engineer',runtime_id:'runtime.generic',principal_ref:'synthetic.reviewer',drafter_principal_ref:'synthetic.drafter',subject_ref:'subject.json',subject_digest:asset('subject.json').digest,approval_scope:['slice.current'],basis:[asset('evidence.txt')],evidence_refs:['evidence.txt']};
  save('approval.json',record);
  const expected={boundary:'check.design-reviewed',subject_ref:'subject.json',approval_scope:['slice.current'],basis:[asset('evidence.txt')],drafter_principal_ref:'synthetic.drafter'};
  run({root,save,asset,record,expected,file:path.join(root,'approval.json')});
 } finally {rmSync(root,{recursive:true,force:true});}
}
test('current approval without consumer context is rejected; explicit history cannot authorize execution',()=>fixture(f=>{
 assert.throws(()=>validateApprovalRecordFile(f.file,{root:f.root,requireApproved:true}),/APPROVAL_CONTEXT_REQUIRED/);
 const history=validateApprovalRecordFile(f.file,{root:f.root,history:true});
 assert.equal(history.execution_authorization,'not-evaluated');
}));

test('current gate assertion cannot opt into history or a non-approved validation mode',()=>fixture(f=>{
  const state={status:'approved',subject_ref:f.record.subject_ref,approval_ref:'approval.json',approval_scope:f.record.approval_scope,basis:f.record.basis,drafter_principal_ref:f.record.drafter_principal_ref};
  const options={root:f.root,rolesDoc:loadDigitalHumanRoles()};
  for(const mode of [{history:true},{requireApproved:false}]) {
    assert.doesNotThrow(()=>assertApprovedGateHasValidApproval(f.record.gate_id,state,{...options,...mode}));
    f.save('approval.json',{...f.record,subject_digest:'0'.repeat(64)});
    assert.throws(()=>assertApprovedGateHasValidApproval(f.record.gate_id,state,{...options,...mode}),/APPROVAL_CURRENT_INVALID/);
    f.save('approval.json',f.record);
  }
}));

test('approval cannot substitute a subject different from the consumer frozen digest',()=>fixture(f=>{
 assert.throws(()=>validateApprovalRecordFile(f.file,{root:f.root,expected:{...f.expected,subject_digest:'0'.repeat(64)}}),/当前主体摘要|消费.*摘要/);
}));

test('single, bundle, helper and checkpoint consume the same strict current binding',()=>fixture(f=>{
 const rolesDoc=loadDigitalHumanRoles(),checkId=f.expected.boundary,gateId='gate.slice-contract-approved';
 const registry={gates:[{id:gateId,requires_checks:[checkId],evidence:['evidence.contract-approval']}],checks:[{id:checkId,evidence:['evidence.fresh-verification']}]};
 const state={gates:{},checks:{}};
 const bundle=()=>({schema_version:1,kind:'review-bundle',bundle_id:'review-bundle.current',task_id:'task.current',work_unit_id:'work-unit.code-review',review_session_id:'session.current',role_id:f.record.role_id,runtime_id:f.record.runtime_id,principal_ref:f.record.principal_ref,reviews:[f.record]});
 const refresh=()=>{
  f.save('approval.json',f.record);f.save('bundle.json',bundle());
  const basis=['evidence.txt','subject.json','approval.json'].map(f.asset);
  state.checks[checkId]={status:'approved',applicable:true,subject_ref:'subject.json',approval_ref:'approval.json',approval_scope:['slice.current'],drafter_principal_ref:'synthetic.drafter',basis,evidence:{'evidence.fresh-verification':['evidence.txt']}};
  state.gates[gateId]={status:'approved',basis,evidence:{'evidence.contract-approval':['evidence.txt']}};
 };
 const options={root:f.root,rolesDoc,registry,expected:f.expected};
 const paths=[()=>assertCurrentApproval(f.record,f.expected,options),()=>validateApprovalRecord(f.record,options),()=>validateApprovalRecordFile(f.file,options),()=>validateApprovalRecordFile(path.join(f.root,'bundle.json'),options),()=>assertApprovedGateHasValidApproval(checkId,state.checks[checkId],options),()=>assertCheckpointApprovals(state,path.join(f.root,'checkpoint.json'),options)];
 refresh();for(const verify of paths)assert.doesNotThrow(verify);
 for(const mutate of [record=>record.drafter_principal_ref=record.principal_ref,record=>record.subject_digest='0'.repeat(64),record=>record.approval_scope=['slice.other'],record=>delete record.basis]) {
  const original=structuredClone(f.record);mutate(f.record);
  if(!f.record.basis) {f.save('subject.json',{gate_id:checkId});f.record.subject_digest=f.asset('subject.json').digest;}
  refresh();for(const verify of paths)assert.throws(verify,/APPROVAL_CURRENT_INVALID/);
  Object.assign(f.record,original);f.save('subject.json',{gate_id:checkId,basis:original.basis,drafter_principal_ref:'synthetic.drafter'});
 }
}));

test('current approval still requires the original human reply and current decision assets',async()=>{
 const {buildDecisionFixture}=await import('../../../../scripts/lib/testing/user-decision-fixture.mjs');
 fixture(f=>{
  f.save('subject.json',{gate_id:'gate.spec-baseline-approved',basis:[f.asset('evidence.txt')]});
  const decision=buildDecisionFixture(path.join(f.root,'decision'),{boundary:'gate.spec-baseline-approved',scope:['slice.current'],subjectRef:path.join(f.root,'subject.json')});
  const record={...f.record,gate_id:'gate.spec-baseline-approved',role_id:'role.product-manager',subject_ref:decision.requirement.subject_ref,subject_digest:f.asset('subject.json').digest,user_decision_ref:decision.ref};
  const expected={...f.expected,boundary:record.gate_id,subject_ref:decision.requirement.subject_ref};
  assert.doesNotThrow(()=>validateApprovalRecord(record,{root:f.root,expected}));
  delete record.user_decision_ref;assert.throws(()=>validateApprovalRecord(record,{root:f.root,expected}),/user-decision/);
  record.user_decision_ref=decision.ref;f.save('subject.json',{gate_id:record.gate_id,basis:[f.asset('evidence.txt')],changed:true});record.subject_digest=f.asset('subject.json').digest;
  assert.throws(()=>validateApprovalRecord(record,{root:f.root,expected}),/user-decision-stale/);
 });
});
test('history CLI reads an incomplete v2 draft, current CLI cannot grant approval',()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
 const script=path.join(root,'scripts/verify-approval-record'),draft=path.join(root,'.template-spec/templates/approval-record-template.json');
 const history=spawnSync(process.execPath,[script,'--history',draft],{encoding:'utf8'});
 assert.equal(history.status,0,history.stderr);assert.match(history.stdout,/not-evaluated/);
 const current=spawnSync(process.execPath,[script,'--require-approved',draft],{encoding:'utf8'});
 assert.equal(current.status,1);assert.match(current.stderr,/approved|APPROVAL_CONTEXT_REQUIRED/);
 const conflict=spawnSync(process.execPath,[script,'--history','--checkpoint',draft,draft],{encoding:'utf8'});
 assert.equal(conflict.status,1);assert.match(conflict.stderr,/不能用于当前/);
});

test('current expected author must come from the consumer, never only from the approval record',()=>fixture(f=>{
 const expected={...f.expected};delete expected.drafter_principal_ref;
 assert.throws(()=>validateApprovalRecord(f.record,{root:f.root,expected}),/APPROVAL_CONTEXT_REQUIRED/);
}));

test('current validation rechecks the input snapshot before returning success',()=>fixture(f=>{
 let changed=false;
 const read=file=>{
  const bytes=snapshotRead(file);
  if(file===path.join(f.root,'evidence.txt')&&!changed) {changed=true;writeFileSync(file,'drift during validation');}
  return bytes;
 };
 assert.throws(()=>validateApprovalRecordFile(f.file,{root:f.root,expected:f.expected,read}),/VALIDATION_INPUT_CHANGED/);
}));

test('derived current expectation freezes the subject version used for scope and author',()=>fixture(f=>{
 f.save('subject.json',{approval_scope:['slice.current'],basis:f.expected.basis,drafter_principal_ref:'synthetic.drafter'});
 const expected=approvalExpectationFromSubject(f.record.gate_id,'subject.json',{root:f.root});
 f.save('subject.json',{approval_scope:['slice.changed'],basis:f.expected.basis,drafter_principal_ref:'synthetic.changed-author'});
 f.record.subject_digest=f.asset('subject.json').digest;
 assert.throws(()=>validateApprovalRecord(f.record,{root:f.root,expected}),/当前主体摘要/);
}));

test('one v2 capability task strictly binds different per-check subjects across single, bundle, helper, checkpoint, source and CLI',async t=>{
 const root=mkdtempSync(path.join(tmpdir(),'yss-current-v2-'));
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 const write=(ref,value)=>{mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});writeFileSync(path.join(root,ref),typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value));};
 const asset=ref=>({ref,digest:digest(readFileSync(path.join(root,ref)))});
 const rolesDoc=loadDigitalHumanRoles(),sourceRegistry=loadRegistry(),checkIds=['check.openapi-draft-reviewed','check.engineering-baseline-accepted'],gateId='gate.slice-contract-approved';
 const live={...sourceRegistry,gates:sourceRegistry.gates.map(gate=>gate.id===gateId?{...gate,requires_checks:checkIds,evidence:['evidence.contract-approval']}:gate),checks:sourceRegistry.checks.map(check=>checkIds.includes(check.id)?{...check,requires_checks:[],evidence:[`evidence.synthetic-${checkIds.indexOf(check.id)}`]}:check)};
 write('.template-spec/agents/digital-human-roles.yaml',readFileSync(path.join(ROOT,'.template-spec/agents/digital-human-roles.yaml')));
 write('.template-spec/process/lifecycle-registry.yaml',live);
 write('.template-spec/agents/yss-skill-registry.yaml',readFileSync(path.join(ROOT,'.template-spec/agents/yss-skill-registry.yaml')));
 write('yss-project.yaml','schema_version: 1\nrepository_mode: project-instance\n');
 const base={schema_version:1,repository_mode:'project-instance',mode:'audit',status:'routing',stage:'stage.system-data-engineering',artifacts:{},gates:{},checks:{},context_reconciliation:{status:'pending',ref:null,evidence_refs:[]},next_work_unit:null,ticket_sync:{},verification:{},human_review:{},git_checkpoint:{},blockers:[],rollback:[]};
 for(const [i,id]of checkIds.entries()) {
  write(`input/subject-${i}.json`,{kind:'synthetic-current-subject',index:i});write(`input/evidence-${i}.txt`,`synthetic actual command evidence ${i}`);
  base.checks[id]={status:'pending',applicable:true,subject_ref:`input/subject-${i}.json`,subject_digest:asset(`input/subject-${i}.json`).digest,approval_scope:[`scope-${i}`],drafter_principal_ref:`synthetic.author-${i}`,basis:[asset(`input/evidence-${i}.txt`)],evidence_refs:[`input/evidence-${i}.txt`]};
 }
 write('input/checkpoint.json',base);
 const prepared=prepareReviewPackage({root,registry:live,checkpointRef:'input/checkpoint.json',checkIds,roleId:'role.test-engineer',runtimeId:'runtime.generic',actorId:'agent.synthetic-reviewer',reviewerPrincipalRef:'synthetic.reviewer',drafterPrincipalRef:'synthetic.packet-owner',implementationActorId:'agent.synthetic-worker',taskId:'current-api-baseline',reviewSessionId:'session.current',workUnitId:'work-unit.technical-analysis',outputDir:'reviews/current'});
 const bundle=parseDocument(readFileSync(path.join(root,prepared.bundle_ref),'utf8')).toJS();
 assert.ok(bundle.reviews.every(row=>row.decision==='pending'));
 assert.throws(()=>validateApprovalRecordFile(path.join(root,prepared.bundle_ref),{root}),/必须为 approved/);
 for(const row of bundle.reviews)row.decision='approved';
 const task=JSON.parse(readFileSync(path.join(root,prepared.task_ref)));
 const expected=bundle.reviews.map(row=>approvalExpectedFromTask(task,{root,rolesDoc,registry:live,boundary:row.gate_id,reviewTaskRef:prepared.task_ref,reviewTaskDigest:prepared.task_digest}));
 const consumer=structuredClone(base),registry=live;
 let sameCheckpoint=false;
 const refresh=()=>{
  write('reviews/approved-bundle.json',bundle);
  for(const [i,row]of bundle.reviews.entries()) {
   write(`reviews/approved-${i}.json`,row);
   Object.assign(consumer.checks[row.gate_id],{status:'approved',approval_ref:'reviews/approved-bundle.json',basis:[...base.checks[row.gate_id].basis,asset(base.checks[row.gate_id].subject_ref),asset('reviews/approved-bundle.json')],evidence:{[`evidence.synthetic-${i}`]:base.checks[row.gate_id].evidence_refs}});
  }
  const basis=[...new Map(Object.values(consumer.checks).flatMap(row=>row.basis).map(row=>[row.ref,row])).values()];
  consumer.gates[gateId]={status:'approved',reason:'synthetic strict-equivalence test',basis,evidence_refs:['input/evidence-0.txt'],evidence:{'evidence.contract-approval':['input/evidence-0.txt']}};
  write('reviews/consumer-checkpoint.json',consumer);
  if(sameCheckpoint)write('input/checkpoint.json',consumer);
 };
 refresh();
 const options={root,rolesDoc,registry:live,expected};
 const paths=[()=>validateApprovalRecord(bundle.reviews[0],{...options,expected:expected[0]}),()=>validateApprovalRecordFile(path.join(root,'reviews/approved-0.json'),{...options,expected:expected[0]}),()=>validateApprovalRecordFile(path.join(root,'reviews/approved-bundle.json'),options),()=>assertApprovedGateHasValidApproval(checkIds[0],consumer.checks[checkIds[0]],{root,rolesDoc,registry:live}),()=>assertCheckpointApprovals(consumer,path.join(root,'reviews/consumer-checkpoint.json'),{root,rolesDoc,registry})];
 for(const verify of paths)assert.doesNotThrow(verify);
 const cliArgs=[path.join(ROOT,'scripts/verify-approval-record'),'--require-approved','--root',root,'--checkpoint',path.join(root,'reviews/consumer-checkpoint.json'),path.join(root,'reviews/approved-bundle.json')];
 const cli=spawnSync(process.execPath,cliArgs,{encoding:'utf8'});assert.equal(cli.status,0,cli.stderr);
 for(const [i,row]of bundle.reviews.entries()) {
  const current=base.checks[row.gate_id];
  await assert.doesNotReject(()=>sourceApproval(row,rolesDoc,root,{ref:current.subject_ref,approval_context:current}),`source check ${i}`);
 }
 const profiles=['yss-harness-design-agent','yss-harness-frontend-agent','yss-harness-backend-agent'];
 const isolatedSourceCheck=`const {sourceApproval}=await import(process.argv[1]);
 const input=JSON.parse(process.argv[2]);let verified=0;
 for(const row of input.records){const current=input.checks[row.gate_id];
  try{await sourceApproval(row,input.roles,input.root,{ref:current.subject_ref,approval_context:current});if(input.stale)throw new Error('stale source was accepted');}
  catch(error){if(!input.stale||!/REVIEW_BINDING_STALE|未冻结实际注册表/.test(error.message))throw error;}
  verified++;
 }
 console.log(JSON.stringify({verified,mode:input.stale?'stale-rejected':'current-accepted'}));`;
 const verifyProfiles=stale=>{
  for(const profile of profiles){
   const module=path.join(ROOT,'submodules',profile,'scripts/lib/strategic-handoff.mjs');
   const result=spawnSync(process.execPath,['--input-type=module','-e',isolatedSourceCheck,module,JSON.stringify({records:bundle.reviews,roles:rolesDoc,root,checks:base.checks,stale})],{encoding:'utf8',cwd:root});
   assert.equal(result.status,0,`${profile}: ${result.stderr}`);
   assert.deepEqual(JSON.parse(result.stdout),{verified:2,mode:stale?'stale-rejected':'current-accepted'});
   t.diagnostic(`${profile}: ${result.stdout.trim()}`);
  }
 };
 verifyProfiles(false);
 for(const ref of ['.template-spec/agents/digital-human-roles.yaml','.template-spec/process/lifecycle-registry.yaml','.template-spec/agents/yss-skill-registry.yaml']) {
  const before=readFileSync(path.join(root,ref));
  write(ref,Buffer.concat([before,Buffer.from('\n# byte drift after review\n')]));
  await assert.rejects(()=>sourceApproval(bundle.reviews[0],rolesDoc,root,{ref:base.checks[checkIds[0]].subject_ref,approval_context:base.checks[checkIds[0]]}),/REVIEW_BINDING_STALE|未冻结实际注册表/);
  verifyProfiles(true);
  write(ref,before);
 }
 // Normal checkpoint closure adds the subject and approval to its bound basis.
 // These output bindings must not invalidate the task's unchanged review inputs.
 sameCheckpoint=true;write('input/checkpoint.json',consumer);
 for(const verify of paths)assert.doesNotThrow(verify);
 for(const row of bundle.reviews)await assert.doesNotReject(()=>sourceApproval(row,rolesDoc,root,{ref:base.checks[row.gate_id].subject_ref,approval_context:base.checks[row.gate_id]}));
 const changedInput=structuredClone(consumer);changedInput.checks[checkIds[0]].approval_scope=['scope-new-input'];write('input/checkpoint.json',changedInput);
 for(const verify of paths)assert.throws(verify,/REVIEW_BINDING_STALE|APPROVAL_CURRENT_INVALID/);
 write('input/checkpoint.json',consumer);
 const original=structuredClone(bundle.reviews[0]);
 for(const change of [row=>row.approval_scope=['scope-invented'],row=>row.subject_ref=bundle.reviews[1].subject_ref,row=>row.drafter_principal_ref='synthetic.reviewer',row=>row.review_task_digest='0'.repeat(64),row=>row.capability_ids=['capability.openapi-contract']]) {
  change(bundle.reviews[0]);refresh();for(const verify of paths)assert.throws(verify,/APPROVAL_CURRENT_INVALID|APPROVAL_CONTEXT_REQUIRED|APPROVAL_BUNDLE_INVALID|REVIEW_BINDING_STALE|REVIEW_CAPABILITY_MISSING/);Object.assign(bundle.reviews[0],structuredClone(original));
 }
 for(const [field,value]of [['task_id','task.unbound'],['work_unit_id','work-unit.code-review'],['review_task_digest','0'.repeat(64)],['capability_ids',['capability.openapi-contract']],['basis',[...bundle.basis,asset(bundle.reviews[0].subject_ref)]]]) {
  const before=bundle[field];bundle[field]=value;refresh();for(const verify of paths.slice(2))assert.throws(verify,/APPROVAL_CURRENT_INVALID|APPROVAL_BUNDLE_INVALID|REVIEW_BINDING_STALE/);bundle[field]=before;
 }
 refresh();write('input/evidence-0.txt','changed evidence');for(const verify of paths)assert.throws(verify,/STALE|证据过期/);
 const stale=spawnSync(process.execPath,cliArgs,{encoding:'utf8'});assert.equal(stale.status,1);assert.match(stale.stderr,/STALE|证据过期/);
});
