import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pilotFixture} from '../slice-contract-v3/pilot-fixture.mjs';
import {readSliceContract} from '../../lib/slice-contract.mjs';
import {validateBackendReview} from '../../lib/backend-review.mjs';
import {captureMaintenanceCandidate} from '../../lib/maintenance-candidate.mjs';
import {validateNextRoute} from '../../lib/lifecycle-transition.mjs';
import {compileStandardsCoverage} from '../../lib/backend-standards-coverage.mjs';
import path from 'node:path';
import {treeHash} from '../../lib/skill-supply-chain.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
function fixture() {
 const f=pilotFixture(); const {binding}=f.approve();
 const contract=readSliceContract(binding.ref,{root:f.root}).contract;
 const candidate=captureMaintenanceCandidate({root:f.project,outputDir:'.template-source/evidence/maintenance/review'});
 const tree=candidate.candidate_digest;
 const input={scope_kind:'change',slice_contract_ref:binding.ref,approval_ref:binding.approval_ref,project_root:f.project,review_mode:'worktree',candidate_snapshot_ref:candidate.manifest_ref,implementation_candidate_ref:'working-tree',candidate_digest:tree,implementation_actor_id:'implementer',implementation_instance_id:'worker-session',actual_skill_impacts:[]};
 f.write('checks.log','Synthetic mechanism evidence, not certification.');
 const record={skill:'code-review',result:'completed',contract_digest:binding.digest,candidate_digest:tree,reviewer:{actor_id:'reviewer',runtime_id:'runtime.generic',instance_id:'review-session'},implementer:{actor_id:'implementer',runtime_id:'runtime.generic',instance_id:'worker-session'},axes:{Standards:'passed',Spec:'passed'},findings:[],constraint_results:[],verification_results:[{command:'synthetic-check',executed_at:new Date().toISOString(),exit_code:0,candidate_digest:tree,evidence_ref:'checks.log',evidence_digest:sha(fs.readFileSync(`${f.root}/checks.log`))}]};
 for(const skill of new Set([...contract.resolution.required_skills,'yss-cache'])) {
  fs.cpSync(new URL(`../../../.agents/skills/${skill}`,import.meta.url),path.join(f.root,'.agents/skills',skill),{recursive:true});
 }
 f.write('skills-lock.json',{version:3,skills:{shared:Object.fromEntries([...contract.resolution.required_skills,'yss-cache'].map(skill=>[skill,{effectiveHash:treeHash(path.join(f.root,'.agents/skills',skill))}]))}});
 const coverage=compileStandardsCoverage({root:f.root,projectRoot:f.project,contract,scope_kind:'change',comparison_ref:f.git('rev-parse','HEAD')});
 f.write('coverage.json',coverage);input.standards_coverage_ref='coverage.json';input.standards_coverage_digest=sha(fs.readFileSync(`${f.root}/coverage.json`));
 for(const rule of coverage.constraints)record.constraint_results.push({axis:'Standards',skill:rule.skill,constraint_id:rule.constraint_id,constraint:'Synthetic concrete rule verification',status:rule.applicability==='required'?'passed':'not-applicable',reason:'Synthetic fixture contains no such behavior',applicability_basis:rule.applicability_basis,rule_ref:rule.rule_ref,rule_digest:rule.rule_digest,code_ref:'src/main/java/web/Boundary.java:1',evidence_ref:'checks.log',evidence_digest:record.verification_results[0].evidence_digest,review_notes:'Synthetic full-text semantic protocol evidence; not a real independent review.'});
 const state={review_input:input,review_result_ref:'review-result.json'};
 const save=()=>f.write(state.review_result_ref,record);save();
 return {...f,record,state,save};
}
test('independent Standards and Spec record covers every applicable skill',()=>{
 const f=fixture();try{assert.equal(validateBackendReview(f.state,{root:f.root}).status,'passed');}finally{f.cleanup();}
});
for(const [name,mutate] of [
 ['omitted skill',f=>f.record.constraint_results=[]],
 ['self review',f=>f.record.reviewer.instance_id='worker-session'],
 ['stale candidate',f=>f.record.candidate_digest='0'.repeat(40)],
 ['missing rule evidence',f=>delete f.record.constraint_results[0].rule_ref],
 ['tests green but standards violation',f=>f.record.constraint_results[0].status='failed'],
 ['stale verification bytes',f=>f.write('checks.log','changed')]
]) test(`review refuses ${name}`,()=>{
 const f=fixture();try{mutate(f);f.save();assert.throws(()=>validateBackendReview(f.state,{root:f.root}),/backend-review/);}finally{f.cleanup();}
});
test('workflow cannot complete review without persisted review inputs',()=>{
 const result=validateNextRoute('work-unit.code-review','work-unit.release-and-retrospective',{});
 assert.equal(result.result,'blocked');assert.ok(result.blocking_signals.includes('backend-review-incomplete'));
});
test('actual impact skills cannot be marked not-applicable',()=>{
 const f=fixture();try{
  f.state.review_input.actual_skill_impacts.push('yss-cache');
  f.record.constraint_results.push({...f.record.constraint_results[0],skill:'yss-cache',status:'not-applicable',reason:'claimed no need'});f.save();
  assert.throws(()=>validateBackendReview(f.state,{root:f.root}),/coverage stale|unresolved|cannot be waived/);
 }finally{f.cleanup();}
});

test('untracked executable mode is part of candidate identity',()=>{
 const f=fixture();try{
  fs.chmodSync(`${f.project}/mvnw`,0o755);
  assert.throws(()=>validateBackendReview(f.state,{root:f.root}),/mode\/kind stale/);
 }finally{f.cleanup();}
});
