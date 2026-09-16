import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pilotFixture} from './pilot-fixture.mjs';
import {prepareSliceImplementationContract,persistSliceDraft} from '../../lib/slice-contract-preparation.mjs';
import {readSliceContract} from '../../lib/slice-contract.mjs';
import {renderSliceContractView} from '../../lib/slice-contract-views.mjs';

test('frozen Ticket keeps tracker updates outside the requirement binding and rejects changed requirements',()=>{
 const f=pilotFixture();try {
  const prepared=prepareSliceImplementationContract({root:f.root,ticket_ref:f.ticket,sources:{...f.sources,ticket:{ref:f.ticket,version:'v1'}},refinements:f.refinements});
  assert.equal(prepared.slice_contract.ticket_policy?.mode,'frozen-requirements');
  assert.equal(prepared.slice_contract.status,'ready-for-lifecycle-review',JSON.stringify(prepared.report));
  persistSliceDraft(prepared,'round2.yaml',{root:f.root});
  const before=readSliceContract('round2.yaml',{root:f.root}).binding;
  f.write('task-progress.json',{status:'active',acceptance_results:{'AC-1':'passed'}});
  assert.deepEqual(readSliceContract('round2.yaml',{root:f.root}).binding,before);
  const view=renderSliceContractView('round2.yaml',{root:f.root});
  assert.equal(view.ticket_state.owner,'tracker-or-task-package');
  fs.appendFileSync(path.join(f.root,f.ticket),'\n新增需求。');
  assert.throws(()=>readSliceContract('round2.yaml',{root:f.root}),/stale/);
 }finally{f.cleanup();}
});

test('low risk applicability comes from lifecycle rules; frontend existing baseline cannot hide UI changes',()=>{
 const f=pilotFixture();try {
  const sources={...f.sources};delete sources.architecture_review;
  const input={root:f.root,ticket_ref:f.ticket,sources,refinements:{...f.refinements,scope:{...f.refinements.scope,risk_level:'low'}}};
  const prepared=prepareSliceImplementationContract(input);
  assert.equal(prepared.slice_contract.status,'ready-for-lifecycle-review',JSON.stringify(prepared.report));
  assert.equal(prepared.slice_contract.applicability.checks['check.architecture-reviewed'].status,'not-applicable');
  assert.equal(prepareSliceImplementationContract({...input,refinements:{...input.refinements,scope:{...input.refinements.scope,risk_level:'high'}}}).slice_contract.status,'blocked');
 }finally{f.cleanup();}
});

test('preparation reports independent missing sources together and blocked drafts remain diagnostic-only',()=>{
 const f=pilotFixture();try {
  const result=prepareSliceImplementationContract({root:f.root,ticket_ref:f.ticket,sources:{...f.sources,spec:{ref:'absent-spec.md'},engineering_baseline:{ref:'absent-baseline.yaml'}},refinements:f.refinements});
  assert.equal(result.slice_contract.status,'blocked');
  assert.ok(result.report.blockers.some(b=>b.field==='basis.spec'&&b.code==='SLICE_SOURCE_UNREADABLE'));
  assert.ok(result.report.blockers.some(b=>b.field==='basis.engineering_baseline'&&b.code==='SLICE_SOURCE_UNREADABLE'));
  assert.ok(result.report.blockers.every(b=>b.responsibility&&b.recovery&&b.code));
  assert.ok(result.report.checks.some(c=>c.result==='not-executed'));
  persistSliceDraft(result,'blocked.yaml',{root:f.root});
  const view=renderSliceContractView('blocked.yaml',{root:f.root});
  assert.equal(view.diagnostic_only,true);
  assert.equal(view.binding.digest.length,71);
  assert.equal(view.blockers.length,result.report.blockers.length);
 }finally{f.cleanup();}
});

test('review reads each aliased source once and exposes missing explanations without repeating acceptance',()=>{
 const f=pilotFixture();try {
  persistSliceDraft(f.prepared,'review.yaml',{root:f.root});
  const original=fs.readFileSync,counts=new Map();
  fs.readFileSync=function(file,...args){const key=String(file);counts.set(key,(counts.get(key)||0)+1);return original.call(this,file,...args);};
  let view;try{view=renderSliceContractView('review.yaml',{root:f.root});}finally{fs.readFileSync=original;}
  assert.equal(counts.get(path.join(f.root,'registration.json')),1);
  assert.equal(counts.get(path.join(f.root,'review.yaml')),1);
  assert.match(view.markdown,/关键取舍/);assert.match(view.markdown,/未提供说明/);
  assert.equal(view.markdown.split('## 验收').length,2);
 }finally{f.cleanup();}
});

test('registered cross-repo preparation and approved dispatch keep same-name paths and cwd distinct',async()=>{
 const {crossRepoFixture}=await import('./cross-repo-fixture.mjs');
 const {createApprovedExecutionContext,assertApprovedExecutionContext}=await import('../../lib/approved-execution-context.mjs');
 const {compileSliceTaskPackage}=await import('../../lib/slice-task-package.mjs');
 const {normalizeSliceContract}=await import('../../lib/slice-contract.mjs');
 const f=crossRepoFixture();try {
  const n=normalizeSliceContract(f.contract,{root:f.root});assert.equal(Object.keys(n.repositories).length,2);
  const approved=f.approve();
  assert.throws(()=>createApprovedExecutionContext(approved.binding,{root:f.root}),/work_unit_id/);
  const execution=createApprovedExecutionContext(approved.binding,{root:f.root,work_unit_id:'work-unit.peer'});
  assert.equal(assertApprovedExecutionContext(execution,{root:f.root}).contract.resolution.architecture_identity.repository_id,'synthetic-peer');
  const task=compileSliceTaskPackage(approved.binding,{root:f.root,work_unit_id:'work-unit.peer',task_id:'task.peer',actor_id:'peer.worker',runtime_id:'runtime.generic'});
  assert.match(task.objective,/peer/);
  for(const profile of ['backend','frontend']) {
    const receiver=await import(`../../../submodules/yss-harness-${profile}-agent/scripts/lib/slice-contract.mjs`);
    assert.throws(()=>receiver.readSliceContract(approved.binding.ref,{root:f.root}),/不支持当前来源/);
  }
  const unbound=structuredClone(f.contract);delete unbound.extensions.cross_repo.repository_bindings;
  assert.throws(()=>normalizeSliceContract(unbound,{root:f.root}),/缺少逐仓登记绑定/);
  const bad=structuredClone(f.contract);bad.verification.peer.cwd=f.project;
  assert.throws(()=>normalizeSliceContract(bad,{root:f.root}),/仓库冲突/);
  bad.verification.peer.cwd=f.peer;bad.work_units[1].allowed_write_paths=['outside'];
  assert.throws(()=>normalizeSliceContract(bad,{root:f.root}),/超出|越界/);
  const wrong=structuredClone(f.contract);wrong.extensions.cross_repo.repository_bindings[f.peer].implementation_repository='implementation_repository';
  assert.throws(()=>normalizeSliceContract(wrong,{root:f.root}),/登记冲突/);
 }finally{f.cleanup();}
});

test('cross-repo execution result rejects same-name evidence substitution and missing joint dependencies',async()=>{
 const {crossRepoFixture}=await import('./cross-repo-fixture.mjs');
 const {validateExecutionResult,loadCompilerContract}=await import('../../lib/implementation-contract-compiler.mjs');
 const {loadSkillRegistry}=await import('../../lib/skill-registry.mjs');
 const f=crossRepoFixture();try {
  const {binding}=f.approve(),current={root:f.root,approved_slice:binding,registry:loadSkillRegistry(),compilerContract:loadCompilerContract()};
  f.write('peer/results/test.log','synthetic peer result');f.write('project/results/test.log','synthetic source result');f.write('project/results/joint.log','synthetic joint result');
  const result={schema_version:2,status:'implemented',work_unit_id:'work-unit.peer',architecture_identity:f.contract.basis.peer_registration?JSON.parse(fs.readFileSync(path.join(f.root,'peer-registration.json'),'utf8')).architecture_identity:undefined,consumed_contract:{contract_id:f.contract.contract_id,contract_version:f.contract.contract_version,registry_digest:f.contract.resolution.registry_digest,compiler_contract_digest:f.contract.resolution.compiler_contract_digest},changed_files:[{path:'src/main/java/Example.java',project_root:f.peer}],evidence_files:[{path:'results/test.log',project_root:f.peer}],verification_results:[{command:'./mvnw test',cwd:f.peer,exit_code:0,executed_at:'2026-09-16T00:00:00Z'}],new_impacts:[]};
  const accepted=validateExecutionResult(result,f.contract,current);assert.equal(accepted.status,'accepted',JSON.stringify(accepted));
  assert.ok(validateExecutionResult({...result,changed_files:[{path:'src/main/java/Example.java',project_root:f.project}]},f.contract,current).blockers.includes('changed-file-repository-mismatch'));
  assert.ok(validateExecutionResult({...result,evidence_files:[{path:'results/test.log',project_root:f.project}]},f.contract,current).blockers.includes('expected-evidence-missing'));
  const joint={...result,work_unit_id:'work-unit.slice-backend',architecture_identity:f.identity,changed_files:[],evidence_files:[{path:'results/test.log',project_root:f.project},{path:'results/joint.log',project_root:f.project}],verification_results:[{command:'./mvnw test',cwd:f.project,exit_code:0,executed_at:'2026-09-16T00:00:00Z'},{command:'node integration.mjs',cwd:f.project,dependency_roots:[f.peer],exit_code:0,executed_at:'2026-09-16T00:00:00Z'}]};
  assert.equal(validateExecutionResult(joint,f.contract,current).status,'accepted');
  delete joint.verification_results[1].dependency_roots;
  assert.ok(validateExecutionResult(joint,f.contract,current).blockers.includes('verification-coverage-or-cwd-missing'));
 }finally{f.cleanup();}
});

test('existing UI baseline is fully verified and cannot replace new UI design evidence',async()=>{
 const {baselineFixture}=await import('../existing-ui-baseline/fixture.mjs');
 const {normalizeSliceContract}=await import('../../lib/slice-contract.mjs');
 const f=pilotFixture();try {
  const baseline=baselineFixture(path.join(f.root,'existing-ui'));
  f.contract.basis.existing_ui_baseline=f.write('existing-ui/existing-ui-baseline.json',baseline.data);
  f.contract.basis.frontend_delivery=f.write('frontend-acceptance.json',{});
  f.contract.applicability.frontend={status:'required',baseline_kind:'existing-ui-baseline',ui_change:'none'};
  f.contract.extensions.frontend={visual_baseline_case_ids:['submit']};
  assert.equal(normalizeSliceContract(f.contract,{root:f.root}).frontend.status,'required');
  const changed=structuredClone(f.contract);changed.scope.impacted_areas.push('ui');
  assert.throws(()=>normalizeSliceContract(changed,{root:f.root}),/UI 变化/);
  changed.scope.impacted_areas=[];changed.applicability.frontend={status:'required',baseline_kind:'prototype',ui_change:'required'};
  assert.throws(()=>normalizeSliceContract(changed,{root:f.root}),/requirement_freeze/);
  fs.appendFileSync(path.join(f.root,'existing-ui/source/src/App.vue'),'changed');
  assert.throws(()=>normalizeSliceContract(f.contract,{root:f.root}),/既有 UI 基线不可消费/);
 }finally{f.cleanup();}
});

test('preparation blocks compiler basis changes during a single invocation',async()=>{
 const {syncBuiltinESMExports}=await import('node:module');
 const f=pilotFixture(),original=fs.readFileSync;let reads=0;
 try {
  fs.readFileSync=function(file,...args){const value=original.call(this,file,...args);if(String(file).endsWith('/references/compiler-contract.yaml')&&++reads>1){const changed=String(value)+'\nconcurrent_fixture_change: true\n';return typeof value==='string'?changed:Buffer.from(changed);}return value;};syncBuiltinESMExports();
  const result=prepareSliceImplementationContract({root:f.root,ticket_ref:f.ticket,sources:f.sources,refinements:f.refinements});
  assert.equal(result.slice_contract.status,'blocked');assert.ok(result.report.blockers.some(b=>b.code==='SLICE_INPUT_CONFLICT'&&b.reason.includes('编译规则来源冲突')));
 }finally{fs.readFileSync=original;syncBuiltinESMExports();f.cleanup();}
});
