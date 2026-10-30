import test from 'node:test';
import assert from 'node:assert/strict';
import {installedFixture} from '../scripts/fixtures/role-independent-draft/installed-fixture.mjs';
import {usesStageGates,verifyStageResult} from '../scripts/lib/stage-result.mjs';
import {assertNativeCapabilities} from '../scripts/lib/native-evidence.mjs';
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
  f.write('drafts/design.json',{title:'synthetic design'});
  f.write('reconciliation.json',{status:'reconciled'});
  const draft=f.draftTask({taskRef:'draft-task.json',unit:'work-unit.technical-design',stage:'stage.technical-design',impacts:['wording'],inputs:['input.json'],outputs:['drafts/design.json'],paths:['drafts']});
  f.finishTask(draft);
  f.run('current-drafter',['contract','verify','--kind','task','--file','draft-task.json']);
  const candidate=f.asset('drafts/design.json');
  const review=f.draftTask({taskRef:'review-task.json',unit:'work-unit.technical-design',stage:'stage.technical-design',impacts:['wording'],inputs:['input.json','draft-task.json'],outputs:['reviews/result.json'],paths:['reviews']});
  review.execution_state='Reviewer';
  review.review_context={candidate,policy:review.policy,check_ids:review.skill_source.check_ids,approval_scope:['drafts'],basis:[f.asset('draft-task.json')],review:{mode:'self-check',provenance:review.provenance}};
  f.write('reviews/result.json',{result:'passed',synthetic:true});
  f.finishTask(review,{candidate,scope:['drafts']});
  f.run('current-reviewer',['contract','verify','--kind','task','--file','review-task.json']);
  const record={schema_version:3,gate_id:'check.design-reviewed',decision:'approved',actor_kind:'agent',subject_ref:candidate.ref,subject_digest:candidate.digest,approval_scope:['drafts'],basis:[f.asset('draft-task.json')],evidence_refs:[review.provenance.execution_ref],review_task_ref:'review-task.json',review_task_digest:f.asset('review-task.json').digest,check_ids:review.skill_source.check_ids,policy:review.policy,review:review.review_context.review};
  const expected={boundary:record.gate_id,subject_ref:candidate.ref,subject_digest:candidate.digest,approval_scope:['drafts'],basis:record.basis};
  f.write('approval.json',record);f.write('expected.json',expected);
  const verify=()=>spawnSync(process.env.YSS_NATIVE_BINARY,['evidence','verify','--kind','approval','--root',f.root,'--file','approval.json','--expected','expected.json','--require-approved','--json'],{encoding:'utf8',maxBuffer:64*1024*1024});
  const current=verify();assert.equal(current.status,0,current.stderr||current.error?.message);
  const rejected=(result,reason,code,message)=>{assert.equal(result.status,1,`${reason}: ${result.error?.message||result.stderr}`);const body=JSON.parse(result.stdout);assert.equal(body.status,'error');assert.equal(body.code,code);assert.ok(body.result.diagnostics.some(row=>row.code===code&&message.test(row.message)),reason);};
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

 } finally { f.cleanup(); }
});
