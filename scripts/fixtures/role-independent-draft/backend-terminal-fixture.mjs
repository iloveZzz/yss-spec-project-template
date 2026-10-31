import {usesStageGates} from '../../lib/stage-result.mjs';
// Synthetic delivery fixtures reuse an actual closed Worker; never business acceptance.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
import {hash} from './installed-fixture.mjs';import {readSliceContract} from '../../lib/slice-contract.mjs';import {compileStandardsCoverage} from '../../lib/backend-standards-coverage.mjs';import {validateBackendReview} from '../../lib/backend-review.mjs';import {backendDeliveryBasis} from '../../lib/backend-delivery.mjs';import {verifyBackendDeliveryTerminal} from '../../lib/backend-delivery-terminal.mjs';
export async function backendTerminalFixture(f) {
 const {root,write,read,asset,run}=f,stage=JSON.parse(read('worker-stage.json'));
 const {project,sliceRef,sliceBinding,cpRef,feature,changed}=stage,prepared={slice_contract:JSON.parse(read(sliceRef))},worker=JSON.parse(read('worker.json')),provenance=worker.provenance,log=JSON.parse(read(provenance.execution_ref)),candidate={ref:sliceRef,digest:log.candidate_digest},cp=JSON.parse(read(cpRef));
 const stageMode=usesStageGates(root);
 const versioned=ref=>({...asset(ref),digest:'sha256:'+asset(ref).digest});
 const e={source:JSON.parse(read('manifest.json')).source,git:(...args)=>execFileSync('git',['-C',project,...args],{encoding:'utf8'}).trim()};
 const complete=name=>{stage.completed??={};stage.completed[name]=true;write('worker-stage.json',stage);};
  if(!stage.completed?.['backend-review']){
  const normalized=readSliceContract(sliceRef,{root}).contract;
  const actualSkills=stageMode?normalized.resolution.required_skills:['yss-repository','yss-web-controller'];
  const coverage=compileStandardsCoverage({root,projectRoot:project,contract:normalized,scope_kind:'change',comparison_ref:e.source.base_commit,actual_skills:actualSkills});write('backend-coverage.json',coverage);assert.deepEqual(coverage.issues,[]);assert.deepEqual(coverage.findings.filter(f=>f.status!=='resolved'),[]);
  const codeCandidate=e.git('rev-parse','HEAD^{tree}');
  const input={scope_kind:'change',slice_contract_ref:sliceRef,approval_ref:cpRef,work_unit_id:worker.work_unit_id,project_root:project,review_mode:'committed',review_base_ref:e.source.base_commit,implementation_candidate_ref:e.git('rev-parse','HEAD'),candidate_digest:codeCandidate,actual_skill_impacts:actualSkills,implementation_candidate:stageMode?run('actual-backend-review-candidate',['contract','verify','--kind','task-candidate','--file','worker.json']).coverage.task_candidate.candidate:candidate,basis:[asset('worker.json')],standards_coverage_ref:'backend-coverage.json',standards_coverage_digest:asset('backend-coverage.json').digest};
  const backendReview={skill:'code-review',result:'completed',contract_digest:'sha256:'+asset(sliceRef).digest,candidate_digest:codeCandidate,assessment:{mode:'self-check',provenance},axes:{Standards:'passed',Spec:'passed'},findings:[],constraint_results:coverage.constraints.map(rule=>({axis:'Standards',skill:rule.skill,constraint_id:rule.constraint_id,constraint:'Synthetic rule-consumption protocol evidence',status:rule.applicability==='required'?'passed':'not-applicable',reason:'Synthetic fixture has no such behavior',applicability_basis:rule.applicability_basis,rule_ref:rule.rule_ref,rule_digest:rule.rule_digest,code_ref:changed+':1',evidence_ref:provenance.execution_ref,evidence_digest:asset(provenance.execution_ref).digest,review_notes:'Synthetic semantic-review protocol evidence; not actual product standards acceptance.'})),verification_results:[{command:log.command,executed_at:log.executed_at,exit_code:0,candidate_digest:codeCandidate,evidence_ref:provenance.execution_ref,evidence_digest:asset(provenance.execution_ref).digest}]};
  write('backend-review.json',backendReview);const state={review_input:input,review_result_ref:'backend-review.json'};write('backend-state.json',state);
  run('actual-current-backend-review',['contract','verify','--kind','backend-review','--file','backend-state.json']);assert.equal(validateBackendReview(state,{root}).status,'passed');complete('backend-review');
  }
  if(!stageMode) {
  if(!fs.existsSync(path.join(root,'fresh-task-v2.json'))){
  const fresh=f.draftTask({taskRef:'fresh-task-v2.json',unit:'work-unit.verification',stage:'stage.verification',impacts:['backend'],checkpointRef:cpRef,featureId:feature,inputs:['input.json','worker.json','slice-result.json',provenance.execution_ref],paths:['fresh-reports-v2'],outputs:['fresh-reports-v2/report.json']});
  fresh.execution_state='Verifier';fresh.review_context={candidate:asset('slice-result.json'),policy:fresh.policy,check_ids:fresh.skill_source.check_ids,approval_scope:worker.allowed_write_paths,basis:fresh.input_bindings,review:{mode:'self-check',provenance:fresh.provenance}};
  write('fresh-reports-v2/report.json',{result:'passed',subject:asset('slice-result.json'),behavior_log:asset(provenance.execution_ref)});f.finishTask(fresh,{scope:worker.allowed_write_paths,candidate:fresh.review_context.candidate});
  }
  const fresh=JSON.parse(read('fresh-task-v2.json'));
  if(!stage.completed?.['fresh-task-v2'])run('actual-fresh-verification-task',['contract','verify','--kind','task','--file',fresh.provenance.task_ref]);complete('fresh-task-v2');
  const freshRecord={schema_version:3,gate_id:'gate.fresh-verification-passed',decision:'approved',actor_kind:'agent',subject_ref:'slice-result.json',subject_digest:asset('slice-result.json').digest,approval_scope:worker.allowed_write_paths,basis:fresh.input_bindings,evidence_refs:[fresh.provenance.execution_ref],review_task_ref:fresh.provenance.task_ref,review_task_digest:asset(fresh.provenance.task_ref).digest,check_ids:fresh.skill_source.check_ids,policy:fresh.policy,review:fresh.review_context.review};write('fresh-approval.json',freshRecord);
  cp.artifacts['artifact.spec']={...versioned('spec.md'),status:'draft',evidence_refs:['spec.md']};cp.gates['gate.fresh-verification-passed']={status:'approved',reason:'实际当前命令通过；合成业务验收结论仅验证协议',subject_ref:'slice-result.json',subject_digest:asset('slice-result.json').digest,approval_scope:worker.allowed_write_paths,basis:[...fresh.input_bindings,asset('fresh-approval.json')],approval_ref:'fresh-approval.json',evidence_refs:['fresh-approval.json','slice-result.json'],evidence:{'evidence.fresh-verification':['slice-result.json'],'evidence.test-verification':[provenance.execution_ref]}};write(cpRef,cp);
  } else {assert.equal(fs.existsSync(path.join(root,'fresh-approval.json')),false);assert.equal(cp.gates['gate.fresh-verification-passed'],undefined);}
  write('.template-spec/agents/issue-tracker.md','---\ntracker:\n  platform: local-markdown\n  root: .work\n---\n');write('.work/engineering/map.md','---\ncheckpoint_ref: '+cpRef+'\n---\n# Synthetic feature\n');
  write('data.md','Synthetic local delivery data; no live service or deployment qualification.');
  const delivery={schema_version:1,delivery_mode:'local-evidence',delivery_id:'backend-delivery.worker',version:'v1',status:'verified',scope:{slice_id:prepared.slice_contract.slice_id,source_ids:['AC-1'],operation_ids:[]},openapi:{mode:'not-applicable',...versioned('no-api-impact.json'),reason:'无HTTP变化'},slice_contract:sliceBinding,build:{source_commit:e.git('rev-parse','HEAD'),artifact_digest:'sha256:'+hash(fs.readFileSync(path.join(project,'results/boundary.jar')))},environment:{id:'synthetic-local',base_url:'http://127.0.0.1:1',deployment_id:'fixture-v1',revision_path:'/version',revision_pointers:{deployment_id:'/deployment_id',source_commit:'/source_commit',openapi_digest:'/openapi_digest',artifact_digest:'/artifact_digest',test_data_digest:'/test_data_digest'},test_data:versioned('data.md')},verification:{},supporting_files:[]};
  for(const [key,kind] of [['contract','backend-contract'],['deployment','backend-deployment']]){write(key+'-verification.json',{schema_version:1,kind,subject_digest:backendDeliveryBasis(delivery),results:[{command:log.command,executed_at:log.executed_at,exit_code:0,evidence:[versioned(provenance.execution_ref)]}],operation_ids:[],coverage:['success','failure'].map(outcome=>({source_id:'AC-1',outcome}))});delivery.verification[key]=versioned(key+'-verification.json');}write('local-delivery.json',delivery);
  const terminalRef='.work/engineering/backend-delivery.json';write(terminalRef,{schema_version:1,kind:'backend-delivery-terminal',delivery_mode:'local-evidence',checkpoint_ref:cpRef,delivery:versioned('local-delivery.json'),review_state:versioned('backend-state.json'),business_completed:false,release_authorized:false,downstream:{owner:'synthetic-fixture',ticket_ref:'test-only:unified-acceptance',verification_plan:'真实项目另行完成业务与部署验收',target_version:'v1'}});
  const terminal=run('actual-backend-local-terminal',['contract','verify','--kind','backend-delivery-terminal','--file',terminalRef,'--checkpoint',cpRef]);assert.equal(terminal.coverage.result,'backend-delivered');assert.equal(terminal.coverage.business_completed,false);assert.equal(terminal.coverage.release_authorized,false);
  assert.equal((await verifyBackendDeliveryTerminal(root,{checkpointRef:cpRef,assetRef:terminalRef})).result,'backend-delivered');
  if(!stageMode){
   const gate='gate.fresh-verification-passed',partial={profile_id:'harness.backend-delivery',gates:{[gate]:structuredClone(cp.gates[gate])}};
   write('partial-gate.json',partial);
   run('partial-current-gate',['contract','verify','--kind','gate-checks','--file','partial-gate.json','--gate',gate]);
   run('partial-is-not-checkpoint',['evidence','verify','--kind','approval','--file','fresh-approval.json','--checkpoint','partial-gate.json','--gate',gate,'--require-approved'],'SCHEMA');
   partial.gates[gate].approval_scope=['other'];write('partial-gate.json',partial);
   run('partial-gate-wrong-scope',['contract','verify','--kind','gate-checks','--file','partial-gate.json','--gate',gate],'APPROVAL_CURRENT_INVALID');
   const completed={repository_mode:'project-instance',status:'completed',gates:{[gate]:{status:'approved'}}};
   const checkDecisions=(label,state,code='OK')=>{write('completed-decisions.json',state);run(label,['contract','verify','--kind','checkpoint-user-decisions','--file','completed-decisions.json'],code);};
   checkDecisions('completed-current-terminal',completed);
   checkDecisions('completed-pending-terminal',{...completed,gates:{[gate]:{status:'pending'}}},'LIFECYCLE_CONTROL');
   checkDecisions('completed-missing-terminal',{...completed,gates:{}},'LIFECYCLE_CONTROL');
   checkDecisions('completed-stale-gate',{...completed,gates:{...completed.gates,'gate.slice-contract-approved':{status:'stale'}}},'LIFECYCLE_CONTROL');
  }

}
