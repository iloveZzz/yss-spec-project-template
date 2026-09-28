import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {pilotFixture} from '../slice-contract-v3/pilot-fixture.mjs';
import {bindSyntheticEvidence} from '../slice-contract-v3/evidence-fixture.mjs';
import {validateExecutionResult,loadCompilerContract} from '../../lib/implementation-contract-compiler.mjs';
import {loadSkillRegistry} from '../../lib/skill-registry.mjs';
test('current completion rejects legacy, unrelated, tampered, stale and uncovered execution evidence',()=>{
 const f=pilotFixture();try{
  const {binding}=f.approve(),current={root:f.root,approved_slice:binding,registry:loadSkillRegistry(),compilerContract:loadCompilerContract()};
  f.write('results/test.log','Synthetic actual result fixture');
  const result={schema_version:2,status:'implemented',work_unit_id:'work-unit.slice-backend',architecture_identity:f.identity,consumed_contract:{contract_id:f.contract.contract_id,contract_version:f.contract.contract_version,registry_digest:f.contract.resolution.registry_digest,compiler_contract_digest:f.contract.resolution.compiler_contract_digest,component_bindings_digest:f.contract.resolution.component_bindings_digest},changed_files:[{path:'src/main/java/Example.java'}],verification_results:[{command:'./mvnw test',cwd:f.project,exit_code:0,executed_at:'2026-09-28T00:00:00Z'}],new_impacts:[]};
  bindSyntheticEvidence(result,f.contract,current);
  const run=r=>validateExecutionResult(r,f.contract,current);
  assert.equal(run(result).status,'accepted');
  assert.ok(run({...result,evidence_binding_version:undefined}).blockers.includes('legacy-evidence-binding-missing'));
  for(const mutate of [r=>r.evidence_files[0].behavior_ref='unrelated',r=>r.evidence_files[0].digest='sha256:'+ '0'.repeat(64),r=>r.verification_results[0].acceptance_refs=[],r=>r.verification_results[0].verification_id='other',r=>r.consumed_contract.contract_digest='wrong',r=>r.verification_results[0].cwd='wrong']){
   const r=structuredClone(result);mutate(r);assert.equal(run(r).status,'blocked');
  }
  const bytes=fs.readFileSync(path.join(f.root,'results/test.log'));f.write('results/test.log','Unrelated new log');assert.ok(run(result).blockers.includes('evidence-digest-mismatch'));f.write('results/test.log',bytes.toString());
  const wrongRoot=structuredClone(result);wrongRoot.source_bindings[0].project_root=f.root;assert.ok(run(wrongRoot).blockers.includes('execution-source-repository-mismatch'));
  const deleted=structuredClone(result);deleted.source_bindings[0]={...deleted.source_bindings[0],deleted:true,digest:null};assert.ok(run(deleted).blockers.includes('execution-source-drift'));
  fs.unlinkSync(path.join(f.project,'src/main/java/Example.java'));assert.equal(run(deleted).status,'accepted');
  fs.writeFileSync(path.join(f.project,'src/main/java/Example.java'),'changed after verification');assert.ok(run(result).blockers.includes('execution-source-drift'));
 }finally{f.cleanup();}
});
