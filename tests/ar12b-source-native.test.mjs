import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {attachSliceApproval} from '../scripts/fixtures/backend-delivery/approval-fixture.mjs';
import {prepareReviewPackage} from '../scripts/lib/review-package.mjs';
import {approvalExpectedFromTask} from '../scripts/lib/review-capabilities.mjs';
import {contextBinary} from '../scripts/lib/native-context.mjs';
import {makeRoot} from './helpers/yss-instance.mjs';
import {buildDecisionFixture} from '../scripts/lib/testing/user-decision-fixture.mjs';
import {fixture as handoffFixture} from '../scripts/fixtures/strategic-handoff/fixture.mjs';
import {parse as parseYaml} from '../scripts/vendor/yaml.mjs';
import {acceptValidationDependencies,withValidationPhase} from '../scripts/lib/validation-phase.mjs';
import {approvedSpecFixture,bindLocalPlanHandoff} from '../scripts/fixtures/spec-baseline/fixture.mjs';

const {binary}=contextBinary();
function run(root,args){
  const result=spawnSync(binary,[...args,'--root',root,'--json'],{encoding:'utf8',maxBuffer:32*1024*1024});
  assert.equal(result.error,undefined);assert.equal(result.signal,null);
  return {...result,envelope:JSON.parse(result.stdout)};
}
test('准备态决定检查只消费该领域，并交回实际权威文件与目录观测',t=>{
  const root=makeRoot('ar12b-source-native-');t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  assert.equal(spawnSync('git',['init','--quiet',root],{encoding:'utf8'}).status,0);
  fs.mkdirSync(path.join(root,'node_modules'));
  const empty=path.join(root,'empty-directory');fs.mkdirSync(empty);
  fs.writeFileSync(path.join(root,'state.json'),JSON.stringify({repository_mode:'project-instance',status:'routing',mode:'route'}));
  const result=run(root,['contract','verify','--kind','checkpoint-user-decisions','--file','state.json']);
  assert.equal(result.status,0,JSON.stringify(result.envelope));
  const report=result.envelope.result;assert.equal(report.execution_authorization,'not-evaluated');assert.deepEqual(report.git_inputs||[],[]);
  const dependencies=report.validation_dependencies;assert.equal(dependencies.schema_version,1);
  for(const ref of ['CONTEXT.md','state.json','.template-spec/agents/digital-human-roles.yaml'])assert.ok(dependencies.files.some(row=>row.file===path.join(root,ref)&&/^[a-f0-9]{64}$/.test(row.digest)),ref);
  assert.ok(dependencies.observations.some(row=>row.file===root&&row.kind==='directory'&&row.value.includes('state.json')));
  assert.ok(dependencies.observations.some(row=>row.file===path.join(root,'state.json')&&row.kind==='stat'&&row.value.type==='file'&&Number.isInteger(row.value.permissions)));
  assert.ok(dependencies.observations.some(row=>row.file===path.join(root,'.yss/asset-transactions/active.json')&&row.kind==='exists'&&row.value===false));
  // Same directory members do not imply the same observed authority path.
  const saved=fs.mkdtempSync(path.join(os.tmpdir(),'ar12b-path-identity-'));
  t.after(()=>fs.rmSync(saved,{recursive:true,force:true}));
  const phase=action=>withValidationPhase({root,purpose:'native-readset-replay',readOnly:true},()=>{acceptValidationDependencies(dependencies);action();});
  assert.doesNotThrow(()=>phase(()=>{}));
  for(const name of ['.git','node_modules']){
    const boundary=path.join(root,name),permissions=fs.statSync(boundary).mode&0o7777;
    assert.ok(dependencies.observations.some(row=>row.file===boundary&&row.kind==='stat'&&row.value.type==='directory'));
    assert.ok(!dependencies.files.some(row=>row.file.startsWith(boundary+path.sep)));
    assert.throws(()=>phase(()=>fs.chmodSync(boundary,permissions^0o100)),{code:'VALIDATION_INPUT_CHANGED'});
    fs.chmodSync(boundary,permissions);
  }
  assert.ok(dependencies.observations.some(row=>row.file===empty&&row.kind==='stat'&&row.value.type==='directory'));
  fs.renameSync(empty,path.join(saved,'original'));fs.mkdirSync(empty);
  assert.throws(()=>phase(()=>{}),{code:'VALIDATION_INPUT_CHANGED'});
  fs.rmdirSync(empty);fs.renameSync(path.join(saved,'original'),empty);
  const mode=fs.statSync(empty).mode&0o7777;
  assert.throws(()=>phase(()=>fs.chmodSync(empty,mode^0o100)),{code:'VALIDATION_INPUT_CHANGED'});
  fs.chmodSync(empty,mode);
  const unknown=run(root,['contract','verify','--kind','gate-checks','--file','state.json','--gate','gate.unknown']);
  assert.equal(unknown.status,1);assert.equal(unknown.envelope.code,'GATE_UNKNOWN');
  const extra=run(root,['contract','verify','--kind','checkpoint-user-decisions','--file','state.json','--no-reconciliation']);
  assert.equal(extra.status,2);
});

test('来源与 Spec 基线公开视图复用真实批准夹具，输出闭包并拒绝篡改包',async t=>{
  const seed=makeRoot('ar12b-source-seed-');
  const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'ar12b-approved-source-')));
  const output=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'ar12b-baseline-output-')));
  t.after(()=>{for(const dir of [root,seed,output])fs.rmSync(dir,{recursive:true,force:true});});
  const fixture=await approvedSpecFixture(root,{nativeSeed:seed});
  bindLocalPlanHandoff({root,...fixture.strategic},{plan:fixture.plan,state:fixture.state});
  fixture.plan.write(fixture.checkpointRef,fixture.state);
  const source=run(root,['handoff','verify','--kind','source','--file','handoff.yaml']);
  assert.equal(source.status,0,JSON.stringify(source.envelope));
  assert.deepEqual(source.envelope.result.git_inputs||[],[]);
  const handoff=source.envelope.result.coverage.handoff_source;
  assert.equal(handoff.handoff.handoff_id,fixture.strategic.handoff.handoff_id);
  assert.ok(handoff.closure.some(row=>row.ref==='CONTEXT.md'));
  assert.ok(handoff.closure.every(row=>typeof row.ref==='string'&&/^sha256:[a-f0-9]{64}$/.test(row.digest)));
  const rolesFile=path.join(root,'.template-spec/agents/digital-human-roles.yaml'),rolesBytes=fs.readFileSync(rolesFile);
  const versionless=parseYaml(rolesBytes.toString());delete versionless.user_decision_policy.schema_version;
  fs.writeFileSync(rolesFile,JSON.stringify(versionless));
  const versionDenied=run(root,['handoff','verify','--kind','source','--file','handoff.yaml']);
  assert.equal(versionDenied.status,2);assert.equal(versionDenied.envelope.code,'HANDOFF_POLICY_CAPABILITY');
  fs.writeFileSync(rolesFile,rolesBytes);
  const rawDigest=bytes=>'sha256:'+createHash('sha256').update(bytes).digest('hex');
  const ownerBytes=fs.readFileSync(path.join(root,fixture.checkpointRef));
  const ownerBinding={ref:fixture.state.plan_review_ref,approval_ref:fixture.state.plan_approval_ref,approval_context:fixture.state.gates['gate.plan-approved'],checkpoint_ref:fixture.checkpointRef,checkpoint_digest:rawDigest(ownerBytes)};
  const consumeOwner=binding=>{fs.writeFileSync(path.join(root,'bound-plan-source.json'),JSON.stringify(binding));return run(root,['handoff','verify','--kind','source-approval','--file','bound-plan-source.json','--gate','gate.plan-approved']);};
  const owner=consumeOwner(ownerBinding);assert.equal(owner.status,0,JSON.stringify(owner.envelope));
  const otherOwner=structuredClone(fixture.state);otherOwner.gates['gate.plan-approved'].approval_ref='another-approval.json';
  const otherBytes=Buffer.from(JSON.stringify(otherOwner));fs.writeFileSync(path.join(root,'wrong-owner.json'),otherBytes);
  const wrong=consumeOwner({...ownerBinding,checkpoint_ref:'wrong-owner.json',checkpoint_digest:rawDigest(otherBytes)});
  assert.equal(wrong.status,1);assert.equal(wrong.envelope.code,'HANDOFF_PLAN_OWNER_REQUIRED');
  fs.unlinkSync(path.join(root,'wrong-owner.json'));
  for(const checkpoint_digest of [undefined,'sha256:'+'0'.repeat(64)]){
    const stale=consumeOwner({...ownerBinding,checkpoint_digest});assert.equal(stale.status,1);assert.equal(stale.envelope.code,'HANDOFF_PLAN_OWNER_REQUIRED');
  }
  fs.unlinkSync(path.join(root,'bound-plan-source.json'));
  const baseline=run(root,['handoff','verify','--kind','spec-baseline','--checkpoint',fixture.checkpointRef]);
  assert.equal(baseline.status,0,JSON.stringify(baseline.envelope));
  assert.deepEqual(baseline.envelope.result.git_inputs||[],[]);
  const inspected=baseline.envelope.result.coverage.spec_baseline_source;
  assert.equal(inspected.source.feature_id,fixture.state.feature_id);
  assert.ok(inspected.closure.some(row=>row.ref===fixture.checkpointRef));
  const destination=path.join(output,'package');
  const exported=run(root,['handoff','export','--kind','spec-baseline','--checkpoint',fixture.checkpointRef,'--out',destination]);
  assert.equal(exported.status,0,JSON.stringify(exported.envelope));
  const verify=()=>run(root,['handoff','verify','--kind','spec-baseline','--package',destination]);
  const valid=verify();assert.equal(valid.status,0,JSON.stringify(valid.envelope));
  assert.equal(valid.envelope.result.coverage.spec_baseline_package.source_prefix,'payload/files');
  const payload=path.join(destination,'payload/files',inspected.source.spec_ref);
  assert.ok(valid.envelope.result.validation_dependencies.files.some(row=>row.file===payload));
  fs.chmodSync(payload,0o644);
  fs.appendFileSync(payload,'\nchanged after approval\n');
  const denied=verify();assert.equal(denied.status,1);assert.equal(denied.envelope.code,'SPEC_BASELINE_DIGEST');
});


test('批准主体路径等价仅限同一 authority 视图，跨根或越界仍拒绝',t=>{
  const root=makeRoot('ar12b-decision-ref-');
  const outside=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'ar12b-decision-outside-')));
  t.after(()=>{for(const dir of [root,outside])fs.rmSync(dir,{recursive:true,force:true});});
  const fixture=buildDecisionFixture(path.join(root,'decision'));
  const relative=path.relative(root,fixture.requirement.subject_ref);
  const requirements='requirements.json';
  const check=(subjectRef,extra=[])=>{
    fs.writeFileSync(path.join(root,requirements),JSON.stringify([{...fixture.requirement,subject_ref:subjectRef}]));
    return run(root,['evidence','verify','--kind','user-decision','--file',path.relative(root,fixture.ref),'--requirements',requirements,...extra]);
  };
  const valid=check(relative);assert.equal(valid.status,0,JSON.stringify(valid.envelope));
  assert.equal(valid.envelope.result.coverage.user_decision_result.validated[0].item_id,'decision.demo');
  const externalSubject=path.join(outside,relative);fs.mkdirSync(path.dirname(externalSubject),{recursive:true});
  fs.copyFileSync(fixture.requirement.subject_ref,externalSubject);
  const outsideRef=check(externalSubject);assert.equal(outsideRef.status,2);assert.equal(outsideRef.envelope.code,'PATH');
  const escaped=check('../'+path.basename(outside)+'/'+relative);assert.notEqual(escaped.status,0);
  const crossView=check('run:'+relative,['--run-dir',outside]);assert.equal(crossView.status,1);assert.equal(crossView.envelope.code,'user-decision-subject-mismatch');
  const twin='same-bytes.md';fs.copyFileSync(fixture.requirement.subject_ref,path.join(root,twin));
  const distinct=check(twin);assert.equal(distinct.status,1);assert.equal(distinct.envelope.code,'user-decision-subject-mismatch');
});


test('只读 Handoff v3/v4 使用完整旧来源政策，缺项和未知能力拒绝且不放宽普通审批',async t=>{
  for(const version of [3,4]){
    const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),`ar12b-legacy-v${version}-`)));
    const fixture=await handoffFixture(root,{handoffVersion:version});
    t.after(()=>{for(const dir of [root,fixture.nativeSeed])if(dir)fs.rmSync(dir,{recursive:true,force:true});});
    const rolesFile=path.join(root,'.template-spec/agents/digital-human-roles.yaml'),original=fs.readFileSync(rolesFile),roles=parseYaml(original.toString());
    const source=()=>run(root,['handoff','verify','--kind','source','--file','handoff.yaml']);
    const valid=source();assert.equal(valid.status,0,JSON.stringify(valid.envelope));assert.deepEqual(fs.readFileSync(rolesFile),original);
    const missing=structuredClone(roles);delete missing.user_decision_policy.gates;fs.writeFileSync(rolesFile,JSON.stringify(missing));
    const missingResult=source();assert.equal(missingResult.status,2);assert.equal(missingResult.envelope.code,'HANDOFF_POLICY_CAPABILITY');
    const unknown=structuredClone(roles);unknown.user_decision_policy.required_capabilities=['unknown-future-source-policy'];fs.writeFileSync(rolesFile,JSON.stringify(unknown));
    const unknownResult=source();assert.equal(unknownResult.status,2);assert.equal(unknownResult.envelope.code,'HANDOFF_POLICY_CAPABILITY');
    fs.writeFileSync(rolesFile,original);fs.writeFileSync(path.join(root,'state.json'),JSON.stringify({repository_mode:'project-instance',status:'routing',mode:'route'}));
    const ordinary=run(root,['contract','verify','--kind','checkpoint-user-decisions','--file','state.json']);
    assert.equal(ordinary.status,2);assert.equal(ordinary.envelope.code,'CAPABILITY');
  }
});


test('v2 批准仅在 review_context 真正缺席时补任务上下文，显式错误类型必须拒绝',t=>{
  const root=makeRoot('ar12b-review-context-');t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const write=(ref,value)=>{fs.mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});fs.writeFileSync(path.join(root,ref),typeof value==='string'?value:JSON.stringify(value));};
  const read=ref=>parseYaml(fs.readFileSync(path.join(root,ref),'utf8'));
  const asset=ref=>({ref,digest:createHash('sha256').update(fs.readFileSync(path.join(root,ref))).digest('hex')});
  const boundary='check.openapi-draft-reviewed',registry=read('.template-spec/process/lifecycle-registry.yaml'),rolesDoc=read('.template-spec/agents/digital-human-roles.yaml');
  write('input/subject.json',{kind:'review-context-fixture'});write('input/evidence.txt','actual review evidence');
  const state={status:'pending',applicable:true,subject_ref:'input/subject.json',subject_digest:asset('input/subject.json').digest,approval_scope:['slice.context'],drafter_principal_ref:'synthetic.author',basis:[asset('input/evidence.txt')],evidence_refs:['input/evidence.txt']};
  write('input/checkpoint.json',{schema_version:1,repository_mode:'project-instance',mode:'audit',status:'routing',stage:'stage.system-data-engineering',artifacts:{},checks:{[boundary]:state},gates:{},context_reconciliation:{status:'pending',ref:null,evidence_refs:[]},next_work_unit:null,ticket_sync:{},verification:{},human_review:{},git_checkpoint:{},blockers:[],rollback:[]});
  const prepared=prepareReviewPackage({root,registry,checkpointRef:'input/checkpoint.json',checkIds:[boundary],roleId:'role.test-engineer',runtimeId:'runtime.generic',actorId:'agent.synthetic-reviewer',reviewerPrincipalRef:'synthetic.reviewer',drafterPrincipalRef:'synthetic.packet-owner',implementationActorId:'agent.synthetic-worker',taskId:'context-types',reviewSessionId:'session.context',workUnitId:'work-unit.technical-analysis',outputDir:'reviews/context'});
  const record={...read(prepared.bundle_ref).reviews[0],decision:'approved'};write('approval.json',record);
  const expected=approvalExpectedFromTask(read(prepared.task_ref),{root,rolesDoc,registry,boundary,reviewTaskRef:prepared.task_ref,reviewTaskDigest:prepared.task_digest});
  const verify=value=>{write('expected.json',value);return run(root,['evidence','verify','--kind','approval','--file','approval.json','--expected','expected.json']);};
  const valid=verify(expected);assert.equal(valid.status,0,JSON.stringify(valid.envelope));
  const absent={...expected};delete absent.review_context;
  const inferred=verify(absent);assert.equal(inferred.status,0,JSON.stringify(inferred.envelope));
  for(const review_context of [false,[],"invalid",null,0,{}]){
    const denied=verify({...expected,review_context});assert.equal(denied.status,1,JSON.stringify({review_context,envelope:denied.envelope}));assert.equal(denied.envelope.code,'APPROVAL_CONTEXT_REQUIRED');
  }
});


test('当前批准依据仅接受同视图绝对相对路径，跨根及同字节异路径拒绝',t=>{
  const root=makeRoot('ar12b-basis-ref-'),outside=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'ar12b-basis-outside-')));
  t.after(()=>{for(const dir of [root,outside])fs.rmSync(dir,{recursive:true,force:true});});
  const write=(ref,value)=>fs.writeFileSync(path.join(root,ref),typeof value==='string'?value:JSON.stringify(value));
  const asset=ref=>({ref,digest:createHash('sha256').update(fs.readFileSync(path.join(root,ref))).digest('hex')});
  write('evidence.txt','actual command evidence');write('subject.json',{gate_id:'check.design-reviewed',basis:[asset('evidence.txt')],drafter_principal_ref:'synthetic.author'});
  const record={schema_version:1,gate_id:'check.design-reviewed',decision:'approved',actor_kind:'digital-human',role_id:'role.test-engineer',runtime_id:'runtime.generic',principal_ref:'synthetic.reviewer',drafter_principal_ref:'synthetic.author',subject_ref:'subject.json',subject_digest:asset('subject.json').digest,approval_scope:['slice.current'],basis:[asset('evidence.txt')],evidence_refs:['evidence.txt']};write('approval.json',record);
  const expected={boundary:record.gate_id,subject_ref:record.subject_ref,approval_scope:record.approval_scope,basis:record.basis,drafter_principal_ref:record.drafter_principal_ref};
  const verify=(ref,extra=[])=>{write('expected.json',{...expected,basis:[{...record.basis[0],ref}]});return run(root,['evidence','verify','--kind','approval','--file','approval.json','--expected','expected.json',...extra]);};
  for(const ref of ['evidence.txt',path.join(root,'evidence.txt')]){const valid=verify(ref);assert.equal(valid.status,0,JSON.stringify(valid.envelope));}
  fs.copyFileSync(path.join(root,'evidence.txt'),path.join(outside,'evidence.txt'));
  const external=verify(path.join(outside,'evidence.txt'));assert.equal(external.status,2);assert.equal(external.envelope.code,'PATH');
  const otherView=verify('run:evidence.txt',['--run-dir',outside]);assert.equal(otherView.status,1);assert.equal(otherView.envelope.code,'APPROVAL_CURRENT_INVALID');
  fs.copyFileSync(path.join(root,'evidence.txt'),path.join(root,'twin.txt'));
  const twin=verify('twin.txt');assert.equal(twin.status,1);assert.equal(twin.envelope.code,'APPROVAL_CURRENT_INVALID');
});

test('登记扫描只观测 Git 边界身份并保留同名替换和模式漂移拒绝',t=>{
  const root=makeRoot('ar12b-registration-'),home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'ar12b-registration-home-')));
  t.after(()=>{for(const dir of [root,home])fs.rmSync(dir,{recursive:true,force:true});});
  fs.writeFileSync(path.join(root,'yss-project.yaml'),'schema_version: 1\nrepository_mode: template-source\n');
  const maintenance=path.join(home,createHash('sha256').update(root).digest('hex'),'maintenance/checkpoints');fs.mkdirSync(maintenance,{recursive:true});
  fs.writeFileSync(path.join(maintenance,'state.json'),JSON.stringify({repository_mode:'template-source',status:'routing',mode:'route'}));
  const boundary=path.join(root,'.work/cli/.git');fs.mkdirSync(boundary,{recursive:true});fs.writeFileSync(path.join(boundary,'HEAD'),'unchanged internal bytes');
  const result=run(root,['contract','verify','--kind','checkpoint-user-decisions','--file','maintenance:checkpoints/state.json','--home',home]);assert.equal(result.status,0,JSON.stringify(result.envelope));
  const dependencies=result.envelope.result.validation_dependencies;
  assert.ok(dependencies.observations.some(row=>row.file===boundary&&row.kind==='stat'));
  assert.ok(!dependencies.files.some(row=>row.file.startsWith(boundary+'/')));
  assert.ok(!dependencies.observations.some(row=>row.file===boundary&&row.kind==='directory'));
  const phase=action=>withValidationPhase({root,purpose:'registration-boundary-replay',readOnly:true},()=>{acceptValidationDependencies(dependencies);action();});
  assert.doesNotThrow(()=>phase(()=>{}));
  const saved=path.join(home,'original-git');fs.renameSync(boundary,saved);fs.mkdirSync(boundary);fs.copyFileSync(path.join(saved,'HEAD'),path.join(boundary,'HEAD'));
  assert.throws(()=>phase(()=>{}),{code:'VALIDATION_INPUT_CHANGED'});
  fs.rmSync(boundary,{recursive:true});fs.renameSync(saved,boundary);
  const mode=fs.statSync(boundary).mode&0o7777;
  assert.throws(()=>phase(()=>fs.chmodSync(boundary,mode^0o100)),{code:'VALIDATION_INPUT_CHANGED'});fs.chmodSync(boundary,mode);
});


test('历史 v2 独立实施范围核验保留原始绑定，但不能授予完整 Slice 执行资格',t=>{
  const root=makeRoot('ar12b-legacy-scope-','backend');t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  // Match the existing historical v2 fixture's declared pre-business-ticket policy.
  const tracker=path.join(root,'.template-spec/agents/issue-tracker.md');fs.writeFileSync(tracker,fs.readFileSync(tracker,'utf8').replace(/^\s*business_ticket_version:\s*1\s*$/m,''));
  fs.writeFileSync(path.join(root,'legacy-slice.json'),JSON.stringify({schema_version:2,contract_id:'contract.historical',contract_version:'v1',slice_id:'slice.historical',status:'approved'}));
  const {binding}=attachSliceApproval(root,'legacy-slice.json');
  const checkpoint=JSON.parse(fs.readFileSync(path.join(root,binding.approval_ref)));
  const state={...checkpoint.human_review.implementation,user_decisions:checkpoint.human_review.user_decisions};
  const verify=value=>{fs.writeFileSync(path.join(root,'scope-state.json'),JSON.stringify(value));return run(root,['contract','verify','--kind','implementation-scope','--file','scope-state.json']);};
  const valid=verify(state);assert.equal(valid.status,0,JSON.stringify(valid.envelope));
  assert.equal(valid.envelope.result.read_only,true);assert.equal(valid.envelope.result.execution_authorization,'not-evaluated');
  assert.equal(valid.envelope.result.coverage.implementation_scope.result,'passed');
  const full=run(root,['contract','verify','--kind','slice','--file',binding.ref,'--approval-ref',binding.approval_ref]);
  assert.notEqual(full.status,0);assert.equal(full.envelope.code,'CONTRACT_INVALID');
  fs.copyFileSync(path.join(root,binding.ref),path.join(root,'same-bytes-slice.json'));
  const different=verify({...state,slice_contract_ref:'same-bytes-slice.json'});assert.equal(different.status,1);assert.equal(different.envelope.code,'user-decision-subject-mismatch');
  const original=fs.readFileSync(path.join(root,binding.ref));fs.appendFileSync(path.join(root,binding.ref),'\n ');
  const stale=verify(state);assert.equal(stale.status,1);assert.equal(stale.envelope.code,'user-decision-stale');fs.writeFileSync(path.join(root,binding.ref),original);
  const contract=JSON.parse(original),baseline=path.join(root,contract.lifecycle_refs.engineering_baseline);fs.appendFileSync(baseline,'changed');
  const staleBaseline=verify(state);assert.equal(staleBaseline.status,1);assert.equal(staleBaseline.envelope.code,'user-decision-stale');
});
