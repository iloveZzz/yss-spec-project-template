import test from 'node:test';
import assert from 'node:assert/strict';
import {installedFixture} from '../scripts/fixtures/role-independent-draft/installed-fixture.mjs';
import {usesStageGates,verifyStageResult} from '../scripts/lib/stage-result.mjs';
import {assertNativeCapabilities} from '../scripts/lib/native-evidence.mjs';
import {withValidationPhase} from '../scripts/lib/validation-phase.mjs';
import {approvalExpectationForBoundAsset,assertApprovedGateHasValidApproval,assertCurrentApproval,validateApprovalRecord} from '../scripts/lib/native-approval.mjs';
import {spawnSync} from 'node:child_process';

test('Backend 3.0 uses its own policy and refuses missing stage authority',()=>{
 const f=installedFixture('backend');
 try {
  assert.equal(usesStageGates(f.root),false);
  assert.throws(()=>verifyStageResult({root:f.root,gateId:'gate.plan-approved'}),/STAGE_CHECKPOINT/);
  assert.throws(()=>verifyStageResult({root:f.root,gateId:'gate.plan-approved',checkpoint:{gates:{}}}),/STAGE_PENDING/);
  assert.throws(()=>assertNativeCapabilities(['unimplemented-stage-test-v99']),/NATIVE_CAPABILITY/);


  // Test-only data is verified by the installed native CLI; it is not human approval.
  f.write('input.json',{scope:{impacted_areas:['wording']},status:'draft'});
  const design={title:'synthetic design',approval_scope:['drafts'],basis:[f.asset('input.json')]};
  f.write('drafts/design.json',design);
  f.write('reconciliation.json',{status:'reconciled'});
  const draft=f.draftTask({taskRef:'draft-task.json',unit:'work-unit.technical-design',stage:'stage.technical-design',impacts:['wording'],inputs:['input.json'],outputs:['drafts/design.json'],paths:['drafts']});
  f.finishTask(draft);
  f.run('current-drafter',['contract','verify','--kind','task','--file','draft-task.json']);
  const candidate=f.asset('drafts/design.json');
  const review=f.draftTask({taskRef:'review-task.json',unit:'work-unit.technical-design',stage:'stage.technical-design',impacts:['wording'],inputs:['input.json','draft-task.json'],outputs:['reviews/result.json'],paths:['reviews']});
  review.execution_state='Reviewer';
  review.review_context={candidate,policy:review.policy,check_ids:review.skill_source.check_ids,approval_scope:['drafts'],basis:[f.asset('draft-task.json'),f.asset('input.json')],review:{mode:'self-check',provenance:review.provenance}};
  f.write('reviews/result.json',{result:'passed',synthetic:true});
  f.finishTask(review,{candidate,scope:['drafts']});
  f.run('current-reviewer',['contract','verify','--kind','task','--file','review-task.json']);
  const record={schema_version:3,gate_id:'check.design-reviewed',decision:'approved',actor_kind:'agent',subject_ref:candidate.ref,subject_digest:candidate.digest,approval_scope:['drafts'],basis:review.review_context.basis,evidence_refs:[review.provenance.execution_ref],review_task_ref:'review-task.json',review_task_digest:f.asset('review-task.json').digest,check_ids:review.skill_source.check_ids,policy:review.policy,review:review.review_context.review};
  const expected={boundary:record.gate_id,subject_ref:candidate.ref,subject_digest:candidate.digest,approval_scope:['drafts'],basis:record.basis};
  f.write('approval.json',record);f.write('expected.json',expected);
  assert.throws(()=>validateApprovalRecord(record,{root:f.root,requireApproved:true}),/APPROVAL_CONTEXT_REQUIRED/);
  assert.throws(()=>assertApprovedGateHasValidApproval('check.architecture-reviewed',{status:'approved',approval_ref:'approval.json'},{root:f.root}),/APPROVAL_CURRENT_INVALID/);
  const verify=()=>spawnSync(process.env.YSS_NATIVE_BINARY,['evidence','verify','--kind','approval','--root',f.root,'--file','approval.json','--expected','expected.json','--require-approved','--json'],{encoding:'utf8',maxBuffer:64*1024*1024});
  const current=verify();assert.equal(current.status,0,current.stderr||current.error?.message);
  const rejected=(result,reason,code,message)=>{assert.equal(result.status,1,`${reason}: ${result.error?.message||result.stderr}`);const body=JSON.parse(result.stdout);assert.equal(body.status,'error');assert.equal(body.code,code);assert.ok(body.result.diagnostics.some(row=>row.code===code&&message.test(row.message)),reason);};
  const state={status:'approved',subject_ref:candidate.ref,subject_digest:candidate.digest,approval_ref:'approval.json',approval_scope:['drafts'],basis:[...record.basis,f.asset(candidate.ref),f.asset('approval.json')]};
  for(const mode of [{history:true},{requireApproved:false}]){
   assert.doesNotThrow(()=>assertApprovedGateHasValidApproval(record.gate_id,state,{root:f.root,...mode}));
   f.write('approval.json',{...record,subject_digest:'0'.repeat(64)});
   assert.throws(()=>assertApprovedGateHasValidApproval(record.gate_id,state,{root:f.root,...mode}),/EVIDENCE_BINDING|APPROVAL_CURRENT_INVALID/);
   f.write('approval.json',record);
  }
  for(const ref of ['progression-target.json','nested/PROGRESSION-TARGET.JSON']){
   f.write(ref,record);
   assert.throws(()=>assertCurrentApproval({...record,basis:[...record.basis,f.asset(ref)]},expected,{root:f.root}),/PROGRESSION_EVIDENCE/);
   assert.throws(()=>assertCurrentApproval(record,{...expected,basis:[...expected.basis,f.asset(ref)]},{root:f.root}),/APPROVAL_CURRENT_INVALID/);
   assert.throws(()=>assertApprovedGateHasValidApproval(record.gate_id,{...state,approval_ref:ref},{root:f.root}),/推进目标.*不能作为批准或交付证据/);
   assert.throws(()=>assertCurrentApproval({...record,subject_ref:ref,subject_digest:f.asset(ref).digest},{...expected,subject_ref:ref},{root:f.root}),/PROGRESSION_EVIDENCE/);
  }
  const inputBefore=f.read('input.json');
  try {
   assert.throws(()=>withValidationPhase({root:f.root,purpose:'approval-readset'},()=>{validateApprovalRecord(record,{root:f.root,requireApproved:true,expected});f.write('input.json','changed after approval validation');}),/VALIDATION_INPUT_CHANGED/);
  } finally {f.write('input.json',inputBefore);}
  const structuredBinding={ref:candidate.ref,digest:candidate.digest};
  const structuredExpected=approvalExpectationForBoundAsset(record.gate_id,structuredBinding,{root:f.root,scope:['drafts']});
  assert.equal(structuredExpected.subject_digest,candidate.digest);
  assert.deepEqual(structuredExpected.basis,[f.asset('input.json')]);
  assert.doesNotThrow(()=>validateApprovalRecord(record,{root:f.root,requireApproved:true,expected:structuredExpected}));
  f.write(candidate.ref,{...design,title:'different'});
  structuredBinding.digest=f.asset(candidate.ref).digest;
  assert.throws(()=>validateApprovalRecord({...record,subject_digest:structuredBinding.digest},{root:f.root,requireApproved:true,expected:structuredExpected}),/APPROVAL_CURRENT_INVALID/);
  f.write(candidate.ref,{...design,approval_scope:['drafts','other']});
  structuredBinding.digest=f.asset(candidate.ref).digest;
  assert.throws(()=>approvalExpectationForBoundAsset(record.gate_id,structuredBinding,{root:f.root,scope:['drafts']}),/APPROVAL_CURRENT_INVALID/);
  f.write(candidate.ref,design);
  const binding={ref:'draft-task.json',digest:f.asset('draft-task.json').digest,approval_context:{subject_ref:candidate.ref,subject_digest:candidate.digest,approval_scope:['drafts'],basis:[f.asset('draft-task.json')]}};
  const boundExpected=approvalExpectationForBoundAsset(record.gate_id,binding,{root:f.root});
  const verifyBound=value=>validateApprovalRecord(value,{root:f.root,requireApproved:true,expected:boundExpected});
  assert.doesNotThrow(()=>verifyBound(record));
  const automatic={...binding,approval_context:{...binding.approval_context,basis:[]}};
  const automaticExpected=approvalExpectationForBoundAsset(record.gate_id,automatic,{root:f.root});
  assert.deepEqual(automaticExpected.basis,[f.asset('draft-task.json')]);
  assert.doesNotThrow(()=>validateApprovalRecord(record,{root:f.root,requireApproved:true,expected:automaticExpected}));
  assert.throws(()=>verifyBound({...record,approval_scope:['drafts','other']}),/APPROVAL_CURRENT_INVALID/);
  assert.throws(()=>verifyBound({...record,subject_ref:'input.json',subject_digest:f.asset('input.json').digest}),/APPROVAL_CURRENT_INVALID/);
  f.write('approval.json',{...record,basis:[]});
  rejected(verify(),'missing basis','SCHEMA',/\/basis.*minItems/);
  f.write('approval.json',{...record,review:{mode:'independent-review',provenance:review.provenance}});
  rejected(verify(),'missing independence','SCHEMA',/\/review.*missing property 'independence'/);
  const forged={...review.provenance,identity:{status:'available',principal_ref:'synthetic.same-actor',session_ref:'synthetic.same-session'}};
  f.write('approval.json',{...record,review:{mode:'independent-review',provenance:review.provenance,independence:{implementation:forged,reviewer:forged,implementation_context_ref:'draft-task.json',reviewer_context_ref:'review-task.json',evidence:f.asset(review.provenance.execution_ref),candidate,scope:['drafts'],readonly:true}}});
  rejected(verify(),'independent review not bound to the reviewed candidate','APPROVAL_REVIEW',/批准未绑定实际审查的候选、检查和范围/);
  f.write('approval.json',record);
  f.write('drafts/design.json',{title:'changed'});
  rejected(verify(),'stale subject','EVIDENCE_BINDING',/摘要不符: drafts\/design\.json/);
  f.write('legacy-approval.json',{schema_version:1,gate_id:'gate.release-ready',decision:'approved',actor_kind:'biological-human',role_id:'role.biological-human',runtime_id:'runtime.generic',principal_ref:'test-only.person'});
  const legacy=f.read('legacy-approval.json');
  f.run('legacy-history-needs-original-policy',['evidence','verify','--kind','approval','--file','legacy-approval.json','--history'],'HISTORY_SOURCE_MISSING');
  f.run('legacy-approval-cannot-authorize',['evidence','verify','--kind','approval','--file','legacy-approval.json','--require-approved'],'APPROVAL_VERSION');
  assert.deepEqual(f.read('legacy-approval.json'),legacy);
  f.write('raw.txt','raw asset');
  assert.throws(()=>approvalExpectationForBoundAsset(record.gate_id,{ref:'raw.txt'},{root:f.root}),/APPROVAL_CONTEXT_REQUIRED/);
  f.write('drafts/design.json',design);
  f.write('draft-task.json',{changed:true});
  binding.digest=f.asset('draft-task.json').digest;
  assert.throws(()=>approvalExpectationForBoundAsset(record.gate_id,binding,{root:f.root}),/APPROVAL_CURRENT_INVALID/);
  automatic.digest=binding.digest;
  const changedExpected=approvalExpectationForBoundAsset(record.gate_id,automatic,{root:f.root});
  assert.throws(()=>validateApprovalRecord(record,{root:f.root,requireApproved:true,expected:changedExpected}),/EVIDENCE_BINDING|TASK_/);

 } finally { f.cleanup(); }
});
