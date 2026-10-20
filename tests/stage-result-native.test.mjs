import test from 'node:test';
import assert from 'node:assert/strict';
import {stageGatesFixture} from '../scripts/lib/testing/stage-gates-fixture.mjs';
import {verifyStageResult} from '../scripts/lib/stage-result.mjs';
import {assertNativeCapabilities} from '../scripts/lib/native-evidence.mjs';
test('native stage result consumes one decision and rejects stale evidence',()=>{
 const f=stageGatesFixture();try {
  f.record();
  assert.equal(verifyStageResult({root:f.root,gateId:'gate.plan-approved',recordRef:'stage.json'}).status,'approved');
  f.write('subject.md','changed');
  assert.throws(()=>verifyStageResult({root:f.root,gateId:'gate.plan-approved',recordRef:'stage.json'}));
 }finally{f.cleanup();}
});
test('missing native stage capability fails explicitly',()=>{
 assert.throws(()=>assertNativeCapabilities(['unimplemented-stage-test-v99']),/NATIVE_CAPABILITY/);
});
test('stage refuses unrelated inputs even with a passing bound execution',()=>{
 const f=stageGatesFixture();try {
  const {result}=f.record();f.write('unrelated.txt','unrelated current bytes');
  for(const check of result.checks){check.inputs=[f.asset('unrelated.txt')];const ref=check.evidence[0].ref,log=f.doc(ref);log.input_bindings=check.inputs;f.write(ref,log);check.evidence=[f.asset(ref)];}
  f.write('stage.json',result);assert.throws(()=>verifyStageResult({root:f.root,gateId:'gate.plan-approved',recordRef:'stage.json'}),/STAGE_CHECK_SCOPE/);
 }finally{f.cleanup();}
});
test('bound explicit independent review cannot be omitted from provenance',()=>{
 const f=stageGatesFixture();try {
  const {result}=f.record();
  f.write('review-message.json',{source_kind:'session-export',messages:[{actor_kind:'biological-human',id:'R1',principal_ref:'human',original_ref:'chat:R1',sent_at:'2026-01-01T00:00:00Z',text:'请独立复核 subject.md'}]});
  f.write('review-requirement.json',{kind:'review-requirement',mode:'independent-review',scope:['subject.md'],source:{kind:'session-export',ref:'review-message.json',digest:'sha256:'+f.asset('review-message.json').digest,message_id:'R1'}});
  for(const check of result.checks){check.inputs=[...check.inputs,f.asset('review-requirement.json')];const ref=check.evidence[0].ref,log=f.doc(ref);log.input_bindings=check.inputs;f.write(ref,log);check.evidence=[f.asset(ref)];}
  f.write('stage.json',result);assert.throws(()=>verifyStageResult({root:f.root,gateId:'gate.plan-approved',recordRef:'stage.json'}),/STAGE_REVIEW/);
 }finally{f.cleanup();}
});
