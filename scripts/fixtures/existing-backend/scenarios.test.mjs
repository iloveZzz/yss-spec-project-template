import test from 'node:test';
import assert from 'node:assert/strict';
import {validateArchitectureIdentity, verifyArchitectureEvidence} from '../../lib/backend-architecture.mjs';
import {loadSkillRegistry} from '../../lib/skill-registry.mjs';
const registry=loadSkillRegistry();
const identity=family=>({schema_version:2,source_kind:'existing-registration',architecture_family:family,architecture_profile:family==='domain-driven'?'existing-domain-driven-maven':'existing-layered-mvc-maven',repository_id:'sample-repo',project_id:'sample',source_digest:`sha256:${'a'.repeat(64)}`,build_units_digest:`sha256:${'b'.repeat(64)}`});
for(const family of ['domain-driven','layered-mvc'])test(`${family}: existing identity has no fabricated generator or H2 claim`,()=>{assert.equal(validateArchitectureIdentity(identity(family),registry).architecture_family,family);});
test('existing original evidence cannot be replaced by three matching objects',()=>{const id=identity('domain-driven');assert.throws(()=>verifyArchitectureEvidence(id,{engineering_baseline:id,repository_registration:id,manifest:id},{root:process.cwd(),registry}),/ARCH_EVIDENCE_REF/);});
test('unknown source, profile and disguised generator fail closed',()=>{assert.throws(()=>validateArchitectureIdentity({...identity('domain-driven'),source_kind:'invented'},registry));assert.throws(()=>validateArchitectureIdentity({...identity('domain-driven'),generator_skill:'made-up'},registry));assert.throws(()=>validateArchitectureIdentity({...identity('domain-driven'),architecture_profile:'layered-mvc-service'},registry));});

import fs from 'node:fs';
import path from 'node:path';
import {fixture} from './fixture.mjs';
import {compileDefaultImplementationContract,evaluateContractFreshness,loadCompilerContract} from '../../lib/implementation-contract-compiler.mjs';
for(const family of ['domain-driven','layered-mvc'])test(`${family}: compiles a real on-disk existing Git/Maven identity; input changes stale`,()=>{
 const f=fixture(family);try{
  const resolution=compileDefaultImplementationContract({root:f.root,recipeIds:[family==='domain-driven'?'backend.ddd-http-api':'backend.mvc-http-api'],architecture_identity:f.identity,architecture_evidence:f.bindings});
  assert.equal(resolution.architecture_identity.generator_skill,undefined);assert.equal(resolution.required_skills.includes('yss-domain'),false);
  assert.deepEqual(resolution.architecture_evidence,f.bindings);
  const contract={schema_version:2,resolution};const current={root:f.root,registry,compilerContract:loadCompilerContract()};
  assert.equal(evaluateContractFreshness(contract,current).freshness,'current');
  fs.appendFileSync(path.join(f.project,'src/main/java/Example.java'),'// legitimate edit needs output validation\n');
  assert.equal(evaluateContractFreshness(contract,current).freshness,'stale');
  assert.throws(()=>verifyArchitectureEvidence(f.identity,f.bindings,{root:f.root,registry,execution:{approved:true,allowed_write_paths:['src/main/java']}}),/EXECUTION_CONTEXT_UNTRUSTED/);
  assert.throws(()=>verifyArchitectureEvidence(f.identity,f.bindings,{root:f.root,registry,execution:{approved:true,allowed_write_paths:['src/test']}}),/EXECUTION_CONTEXT_UNTRUSTED/);
 }finally{f.cleanup();}
});
test('existing profiles resolve concrete Web and Application execution references',()=>{
 for(const family of ['domain-driven','layered-mvc']){
  const profile=family==='domain-driven'?'existing-domain-driven-maven':'existing-layered-mvc-maven';
  for(const skill of ['yss-web-controller','yss-application']){
   assert.equal(fs.existsSync(path.join(process.cwd(),'.agents/skills',skill,'references/profiles',`${profile}.md`)),true,`${skill} must document ${profile}`);
  }
  const f=fixture(family);try{
   const resolution=compileDefaultImplementationContract({root:f.root,recipeIds:[family==='domain-driven'?'backend.ddd-http-api':'backend.mvc-http-api'],architecture_identity:f.identity,architecture_evidence:f.bindings});
   assert.equal(resolution.skill_profiles['yss-web-controller'],profile);
   assert.equal(resolution.skill_profiles['yss-application'],undefined,'HTTP recipes do not add an unused Application skill');
  }finally{f.cleanup();}
 }
});
test('raw evidence drift, self-review, missing source files and actual POM conflicts are rejected',()=>{
 for(const fault of ['baseline','self-review','missing-file','pom']){const f=fixture();try{
  if(fault==='baseline')fs.appendFileSync(path.join(f.root,'baseline.json'),' ');
  if(fault==='self-review'){f.review.principal_ref=f.baseline.author;f.baseline.boundary_review=f.write('review.json',f.review);f.bindings.engineering_baseline=f.write('baseline.json',f.baseline);}
  if(fault==='missing-file')fs.unlinkSync(path.join(f.project,'src/main/java/Example.java'));
  if(fault==='pom')fs.writeFileSync(path.join(f.project,'pom.xml'),'<project><artifactId>different</artifactId></project>');
  assert.throws(()=>verifyArchitectureEvidence(f.identity,f.bindings,{root:f.root,registry}),undefined,fault);
 }finally{f.cleanup();}}
});
