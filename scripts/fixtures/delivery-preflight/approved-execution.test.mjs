import test from 'node:test';
import assert from 'node:assert/strict';
import {appendFileSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {approvedFixture} from './approved-execution-fixture.mjs';
import {createApprovedExecutionContext} from '../../lib/approved-execution-context.mjs';
import {verifyArchitectureEvidence} from '../../lib/backend-architecture.mjs';
import {validateTechnicalDesign} from '../../../.agents/skills/yss-technical-design/scripts/validate-technical-design.mjs';
import {enforceTechnicalDesign} from '../../lib/technical-design-boundary.mjs';
import {compileDefaultImplementationContract,evaluateContractFreshness,loadCompilerContract} from '../../lib/implementation-contract-compiler.mjs';
import {loadSkillRegistry} from '../../lib/skill-registry.mjs';
import {preflightDelivery} from '../../lib/delivery-preflight.mjs';

for(const family of ['domain-driven','layered-mvc'])test(`synthetic ${family}: only original local approval permits a bounded implementation delta`,async()=>{
 const f=approvedFixture(family);try{
  const execution=createApprovedExecutionContext(f.binding,{root:f.root,contract:f.contract});
  appendFileSync(path.join(f.project,'src/main/java/Example.java'),'// permitted implementation output\n');
  assert.throws(()=>verifyArchitectureEvidence(f.identity,f.bindings,{root:f.root,execution:{approved:true,allowed_write_paths:['src']}}),/EXECUTION_CONTEXT_UNTRUSTED/);
  assert.deepEqual(verifyArchitectureEvidence(f.identity,f.bindings,{root:f.root,execution}).changed_files,['src/main/java/Example.java']);
  const recompiled=compileDefaultImplementationContract({root:f.root,recipeIds:[family==='domain-driven'?'backend.ddd-http-api':'backend.mvc-http-api'],slice_id:f.contract.slice_id,architecture_identity:f.identity,architecture_evidence:f.bindings,...(f.technical_design?{technical_design:f.technical_design}:{}),approved_slice:f.binding});
  assert.equal(recompiled.freshness,'current');
  const current={root:f.root,registry:loadSkillRegistry(),compilerContract:loadCompilerContract(),approved_slice:f.binding,readOnly:true};
  assert.equal(evaluateContractFreshness(f.contract,current).freshness,'current');
  assert.equal(evaluateContractFreshness(f.contract,{...current,approved_slice:undefined},{approved:true,allowed_write_paths:['src']}).freshness,'stale');
  if(f.design){
   assert.equal((await validateTechnicalDesign(f.design,{root:f.root,sliceRef:f.contract.slice_id,execution,readOnly:true})).status,'approved');
   enforceTechnicalDesign({...f.contract.resolution,slice_id:f.contract.slice_id},{root:f.root,execution,readOnly:true});
   const input={schema_version:1,governance_root:f.root,delivery_kind:'backend-delivery',scope:{repository_id:f.identity.repository_id,project_id:f.identity.project_id,slice_id:f.contract.slice_id,operation_ids:['syntheticOperation']},architecture_identity:f.identity,architecture_bindings:f.bindings,assets:{slice_contract:f.binding,technical_design:f.technical_design}};
   for(const stage of ['build','export','accept']){
    const out=await preflightDelivery(input,{stage});
    for(const key of ['architecture','technical_design','slice_contract','slice_contract.execution'])assert.equal(out.checks.find(c=>c.code===key)?.status,'ready',JSON.stringify(out.checks));
   }
  }
 }finally{f.cleanup();}
});

test('synthetic: approved status, fake countersignature and missing required source proof cannot establish permission',()=>{
 const f=approvedFixture();try{
  assert.throws(()=>createApprovedExecutionContext({...f.binding,approval_ref:undefined},{root:f.root}),/EXECUTION_APPROVAL_REQUIRED/);
  const sourceApproval=structuredClone(f.sliceApproval);
  f.write('checkpoint.json',{schema_version:1,gate_id:'gate.slice-contract-approved',decision:'approved',actor_kind:'orchestrator',role_id:'role.harness-orchestrator',runtime_id:'runtime.generic',principal_ref:'synthetic-untrusted-orchestrator'});
  assert.throws(()=>createApprovedExecutionContext(f.binding,{root:f.root}),/EXECUTION_APPROVAL_PROTOCOL|会签|actor_kind/);
  f.write(f.binding.approval_ref,sourceApproval);
  if(f.approvalProtocol==='checkpoint') {
   f.decision.record.responses=[];f.decision.save();
   assert.throws(()=>createApprovedExecutionContext(f.binding,{root:f.root}),/user-decision-response-required/);
  } else {
   f.write(f.binding.approval_ref,{...sourceApproval,artifact_bindings:[]});
   assert.throws(()=>createApprovedExecutionContext(f.binding,{root:f.root}),/EXECUTION_APPROVAL_SCOPE/);
  }
 }finally{f.cleanup();}
});

test('synthetic: out-of-scope edits, replaced source basis and stale approved contract bytes are rejected',()=>{
 const f=approvedFixture();try{
  const execution=createApprovedExecutionContext(f.binding,{root:f.root});
  appendFileSync(path.join(f.project,'pom.xml'),'\n<!-- out of approved scope -->');
  assert.throws(()=>verifyArchitectureEvidence(f.identity,f.bindings,{root:f.root,execution}),/ARCH_SOURCE_OUT_OF_SCOPE/);
  // The context is revalidated against original bytes at each boundary, not cached as approved.
  appendFileSync(path.join(f.root,'slice.json'),' ');
  assert.throws(()=>createApprovedExecutionContext(f.binding,{root:f.root}),/EXECUTION_CONTRACT_STALE/);
  assert.throws(()=>verifyArchitectureEvidence(f.identity,f.bindings,{root:f.root,execution}),/EXECUTION_CONTRACT_STALE/);
 }finally{f.cleanup();}
});

test('synthetic: a self-consistent replacement original reference cannot reuse the previous approval',()=>{
 const f=approvedFixture();try{
  const execution=createApprovedExecutionContext(f.binding,{root:f.root});
  appendFileSync(path.join(f.project,'src/main/java/Example.java'),'// permitted output still tied to its original inputs\n');
  const replacement=f.write('registration-copy.json',f.registration);
  assert.throws(()=>verifyArchitectureEvidence(f.identity,{...f.bindings,repository_registration:replacement},{root:f.root,execution}),/EXECUTION_INPUT_REPLACED/);
 }finally{f.cleanup();}
});

test('synthetic: technical-design CLI rejects caller-invented execution JSON',()=>{
 const f=approvedFixture();try{
  const cli=new URL('../../../.agents/skills/yss-technical-design/scripts/validate-technical-design.mjs',import.meta.url);
  const out=spawnSync(process.execPath,[cli.pathname,path.join(f.root,'technical-design.json'),'--root',f.root,'--execution','{"approved":true}'],{encoding:'utf8'});
  assert.equal(out.status,1);assert.match(out.stderr,/execution/);
 }finally{f.cleanup();}
});

test('synthetic existing v2 rejects serialized array sections and absent required source references before approval',async()=>{
 const f=approvedFixture();try{
  const cases=[
   contract=>{contract.lifecycle_refs=[];},
   contract=>{contract.readiness=[];},
   contract=>{delete contract.lifecycle_refs.ticket;},
   contract=>{contract.lifecycle_refs.engineering_baseline=' ';},
   contract=>{contract.readiness.blockers={};},
   contract=>{contract.readiness.stale_inputs=null;},
   contract=>{delete contract.readiness.not_applicable;},
  ];
  for(const mutate of cases){
   const contract=structuredClone(f.contract);mutate(contract);
   const binding={...f.binding,...f.write('invalid-slice.json',contract)};
   assert.throws(()=>createApprovedExecutionContext(binding,{root:f.root}),error=>error.code==='EXECUTION_CONTRACT_INVALID');
   const input={schema_version:1,governance_root:f.root,scope:{repository_id:f.identity.repository_id,project_id:f.identity.project_id,slice_id:f.contract.slice_id,operation_ids:['syntheticOperation']},architecture_identity:f.identity,assets:{slice_contract:binding}};
   const result=await preflightDelivery(input,{stage:'build'});
   assert.equal(result.exit_code,1);
   assert.ok(result.checks.some(item=>item.code==='EXECUTION_CONTRACT_INVALID'&&item.source===binding.ref&&item.status==='conflict'),JSON.stringify(result));
  }
 }finally{f.cleanup();}
});

test('synthetic historical delivery v1 minimal Slice fixture retains its existing approval semantics',async()=>{
 const f=approvedFixture('domain-driven',{withDesign:false});try{
  const {attachSliceApproval}=await import('../backend-delivery/approval-fixture.mjs');
  const {verifySliceContractApproval}=await import('../../lib/approved-execution-context.mjs');
  f.write('legacy-slice.json',{schema_version:2,contract_id:'contract.historical',contract_version:'v1',slice_id:'slice.historical',status:'approved'});
  const {binding}=attachSliceApproval(f.root,'legacy-slice.json');
  assert.equal(verifySliceContractApproval(binding,{root:f.root}).contract.contract_id,'contract.historical');
 }finally{f.cleanup();}
});
