import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hash } from '../../lib/strategic-handoff-io.mjs';
import { normalizeSliceContract } from '../../lib/slice-contract.mjs';

function fixture() {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'slice-v3-'));
  const basis={};
  for(const name of ['spec','ticket','engineering_baseline','implementation_repository','architecture_review','build_architecture_checklist','no_api_impact_record']) {
    const ref=`${name}.md`,text=`# ${name}\nAC-1: 有效输入成功，非法输入拒绝。\n`;
    fs.writeFileSync(path.join(root,ref),text);basis[name]={ref,digest:hash(text)};
  }
  const contract={schema_version:3,contract_id:'contract.test',contract_version:'v1',slice_id:'slice.test',status:'draft',basis,
    scope:{impacted_areas:[],implementation_path_policy:'external-repository-native',project_roots:[root],allowed_write_paths:['src']},
    applicability:{frontend:{status:'not-applicable',reason:'无 UI 变化'},backend:{status:'not-applicable',reason:'无后端变化'},api:{status:'not-applicable',reason:'无接口变化'},cross_repo:{status:'not-applicable',reason:'单仓'}},
    resolution:{required_capabilities:['contract.request-validation'],required_skills:['yss-validation'],recipe_ids:[],conditions:[],registry_digest:'a'.repeat(64),compiler_contract_digest:'b'.repeat(64)},
    acceptance:{'AC-1':{source:'ticket',locator:'AC-1'}},
    verification:{test:{command:'pnpm test',cwd:root,expected_evidence:['test.log'],test_seams:['validate'],acceptance_refs:['AC-1']}},
    work_units:[{id:'validate',behavior:'校验输入',role_id:'role.backend-engineer',primary_skill:'yss-validation',tdd_mode:'behavior-tdd',verification_refs:['test'],acceptance_refs:['AC-1']}]
  };
  return {root,contract,cleanup:()=>fs.rmSync(root,{recursive:true,force:true})};
}
export {fixture};

test('v3 inherits constraints once and refuses task scope expansion and omitted acceptance',()=>{
  const f=fixture();try {
    const n=normalizeSliceContract(f.contract,{root:f.root});
    assert.deepEqual(n.common.allowed_write_paths,['src']);
    assert.deepEqual(n.work_units[0].allowed_write_paths,['src']);
    assert.deepEqual(n.work_units[0].work_unit.verification_commands,['pnpm test']);
    assert.equal(n.frontend.status,'not-applicable');
    assert.equal(f.contract.common,undefined);
    const escape=structuredClone(f.contract);escape.work_units[0].allowed_write_paths=['src-other'];
    assert.throws(()=>normalizeSliceContract(escape,{root:f.root}),/写范围/);
    const missing=structuredClone(f.contract);missing.verification.test.acceptance_refs=[];
    assert.throws(()=>normalizeSliceContract(missing,{root:f.root}),/验收|acceptance_refs/);
  }finally{f.cleanup();}
});

test('preparation reuses Ticket facts, renders persisted YAML and refuses source drift', async()=>{
  const {prepareSliceImplementationContract}=await import('../../lib/slice-contract-preparation.mjs');
  const {renderSliceContractView}=await import('../../lib/slice-contract-views.mjs');
  const {stringify}=await import('../../vendor/yaml.mjs');
  const f=fixture();try {
    const {basis,scope,applicability,acceptance,verification,work_units,contract_id,contract_version,slice_id}=f.contract;
    const compatibleWorkUnits=structuredClone(work_units);compatibleWorkUnits[0].primary_skill='alibaba-java-code-style';
    const ticket={contract_id,contract_version,slice_id,scope,applicability,acceptance,verification,work_units:compatibleWorkUnits};
    fs.writeFileSync(path.join(f.root,'ticket.md'),`---\nslice_implementation:\n${stringify(ticket).split('\n').filter(Boolean).map(line=>'  '+line).join('\n')}\n---\n# 验收\nAC-1: 有效输入成功，非法输入拒绝。\n`);
    const input={root:f.root,ticket_ref:'ticket.md',sources:Object.fromEntries(Object.entries(basis).map(([key,b])=>[key,{ref:b.ref,...(key==='ticket'?{version:'v1'}:{})}])),refinements:{required_capabilities:['quality.java-code-style']}};
    const prepared=prepareSliceImplementationContract(input);
    assert.equal(prepared.slice_contract.status,'ready-for-lifecycle-review',JSON.stringify(prepared.report));
    assert.equal(prepared.slice_contract.resolution.reason_chains,undefined);
    assert.equal(prepared.slice_contract.readiness,undefined);
    const componentBlocked=prepareSliceImplementationContract({...input,refinements:{required_capabilities:['contract.request-validation']}});
    assert.equal(componentBlocked.slice_contract.status,'blocked');
    assert.ok(componentBlocked.report.blockers.some(b=>b.code==='component-platform-binding-required'&&b.reason.startsWith('component-capability: component-platform-binding-required:')));
    fs.writeFileSync(path.join(f.root,'checkpoint.json'),JSON.stringify({artifacts:{'artifact.spec':{ref:'spec.md'}}}));
    const inferred={...input,checkpoint_ref:'checkpoint.json',sources:{...input.sources}};delete inferred.sources.spec;
    assert.equal(prepareSliceImplementationContract(inferred).slice_contract.status,'ready-for-lifecycle-review');
    fs.writeFileSync(path.join(f.root,'checkpoint.json'),JSON.stringify({artifacts:{'artifact.spec':{ref:'engineering_baseline.md'}}}));
    assert.ok(prepareSliceImplementationContract({...input,checkpoint_ref:'checkpoint.json'}).report.blockers.some(b=>b.reason==='conflict'));
    assert.equal(prepareSliceImplementationContract({...input,refinements:{...input.refinements,unknown_constraint:'must preserve'}}).slice_contract.status,'blocked');
    fs.writeFileSync(path.join(f.root,'versioned.yaml'),'version: v2\n');
    assert.ok(prepareSliceImplementationContract({...input,sources:{...input.sources,versioned:{ref:'versioned.yaml',version:'v1'}}}).report.blockers.some(b=>b.reason.includes('来源版本冲突')));
    fs.writeFileSync(path.join(f.root,'slice.yaml'),stringify({slice_contract:prepared.slice_contract}));
    const view=renderSliceContractView('slice.yaml',{root:f.root,unit_id:'validate'});
    assert.equal(view.read_only,true);
    assert.deepEqual(view.task.allowed_write_paths,['src']);
    assert.ok(view.markdown.includes('AC-1'));
    assert.equal(view.binding.digest,hash(fs.readFileSync(path.join(f.root,'slice.yaml'))));
    fs.appendFileSync(path.join(f.root,'spec.md'),'changed');
    assert.throws(()=>renderSliceContractView('slice.yaml',{root:f.root}),/stale/);
  }finally{f.cleanup();}
});

test('MVC v3 requires real approval bindings and independent review before execution',async()=>{
  const {pilotFixture}=await import('./pilot-fixture.mjs');
  const {createApprovedExecutionContext,assertApprovedExecutionContext}=await import('../../lib/approved-execution-context.mjs');
  const {validateExecutionResult,loadCompilerContract}=await import('../../lib/implementation-contract-compiler.mjs');
  const {loadSkillRegistry}=await import('../../lib/skill-registry.mjs');
  const f=pilotFixture();try{
    const approved=f.approve();
    const context=createApprovedExecutionContext(approved.binding,{root:f.root});
    assert.deepEqual(assertApprovedExecutionContext(context,{root:f.root}).allowed_write_paths,['src/main/java']);
    const responseCount=approved.decision.record.responses.length;
    const originalDecision=fs.readFileSync(approved.decision.ref);
    createApprovedExecutionContext(approved.binding,{root:f.root});
    assert.equal(approved.decision.record.responses.length,responseCount);
    assert.deepEqual(fs.readFileSync(approved.decision.ref),originalDecision);
    const authoritative=fs.readFileSync(path.join(f.root,approved.binding.ref));
    fs.appendFileSync(path.join(f.root,approved.binding.ref),'\n# changed bytes\n');
    assert.throws(()=>createApprovedExecutionContext(approved.binding,{root:f.root}));
    const changedBinding={...approved.binding,digest:hash(fs.readFileSync(path.join(f.root,approved.binding.ref)))};
    assert.throws(()=>createApprovedExecutionContext(changedBinding,{root:f.root}));
    fs.writeFileSync(path.join(f.root,approved.binding.ref),authoritative);
    assert.throws(()=>assertApprovedExecutionContext({kind:'approved-slice-execution-context'},{root:f.root}),/UNTRUSTED/);
    const {compileSliceTaskPackage,assertSliceV3TaskPackage}=await import('../../lib/task-package.mjs');
    const task=compileSliceTaskPackage(approved.binding,{root:f.root,work_unit_id:'work-unit.slice-backend',task_id:'task.synthetic',actor_id:'synthetic.worker',runtime_id:'runtime.generic'});
    assert.deepEqual(task.verification_commands,['./mvnw test']);
    assert.ok(task.forbidden_actions.includes('不得绕过持久化约束'));
    assert.throws(()=>assertSliceV3TaskPackage({...task,verification_commands:[]},f.contract,{root:f.root}),/遗漏/);

    const result={schema_version:2,status:'implemented',work_unit_id:'work-unit.slice-backend',architecture_identity:f.identity,consumed_contract:{contract_id:f.contract.contract_id,contract_version:f.contract.contract_version,registry_digest:f.contract.resolution.registry_digest,compiler_contract_digest:f.contract.resolution.compiler_contract_digest,component_bindings_digest:f.contract.resolution.component_bindings_digest},changed_files:[{path:'src/main/java/Example.java'}],evidence_files:[{path:'results/test.log'}],verification_results:[{command:'./mvnw test',cwd:f.project,exit_code:0,executed_at:'2026-09-16T00:00:00Z'}],new_impacts:[]};
    f.write('results/test.log','Synthetic actual-exit-code mechanism evidence; not a Maven run.');
    const current={root:f.root,registry:loadSkillRegistry(),compilerContract:loadCompilerContract(),approved_slice:approved.binding};
    assert.equal(validateExecutionResult(result,f.contract,current).status,'accepted');
    assert.equal(validateExecutionResult({...result,evidence_files:[]},f.contract,current).status,'blocked');
    assert.equal(validateExecutionResult({...result,changed_files:[{path:'src/main/java-escape/Bad.java'}]},f.contract,current).status,'blocked');
    const review={...approved.review,principal_ref:approved.review.drafter_principal_ref};f.write('v3-review.json',review);
    assert.throws(()=>createApprovedExecutionContext(approved.binding,{root:f.root}),/INDEPENDENT/);
    f.write('v3-review.json',approved.review);
    approved.decision.record.responses=[];approved.decision.save();
    assert.throws(()=>createApprovedExecutionContext(approved.binding,{root:f.root}),/response-required/);
  }finally{f.cleanup();}
});

test('backend and frontend receiving distributions read the same authoritative v3 constraints',async()=>{
  const {pilotFixture}=await import('./pilot-fixture.mjs');
  const {stringify}=await import('../../vendor/yaml.mjs');
  const {execFileSync}=await import('node:child_process');
  const f=pilotFixture();try {
    f.write('receiver.yaml',stringify({slice_contract:f.contract}));
    for(const profile of ['backend','frontend']) {
      const receiver=new URL(`../../../submodules/yss-harness-${profile}-agent/`,import.meta.url);
      const {readSliceContract}=await import(new URL('scripts/lib/slice-contract.mjs',receiver));
      const actual=readSliceContract('receiver.yaml',{root:f.root}).contract;
      assert.deepEqual(actual.common,normalizeSliceContract(f.contract,{root:f.root}).common);
      const view=JSON.parse(execFileSync(process.execPath,[new URL('scripts/slice-contract',receiver).pathname,'view','receiver.yaml','--root',f.root,'--json'],{encoding:'utf8'}));
      assert.equal(view.binding.id,f.contract.contract_id);
      assert.equal(view.read_only,true);
    }
  }finally{f.cleanup();}
});

test('conditional contracts and source bindings never turn missing information into not-applicable',()=>{
  const f=fixture();try{
    for(const mutate of [
      c=>{c.applicability.frontend={status:'required'};},
      c=>{c.applicability.backend={status:'required'};c.extensions={backend:{affected_layers:['application'],design_refs:['pointer:/design']}};},
      c=>{delete c.applicability.api.reason;},
      c=>{c.basis.spec='ticket';c.basis.ticket='spec';},
      c=>{c.scope.allowed_write_paths=['../production'];},
      c=>{c.work_units.push(structuredClone(c.work_units[0]));},
      c=>{c.verification.test.cwd='/unregistered';},
      c=>{c.resolution.unrecognized_constraint='hidden';},
    ]){const changed=structuredClone(f.contract);mutate(changed);assert.throws(()=>normalizeSliceContract(changed,{root:f.root}));}
    fs.appendFileSync(path.join(f.root,'spec.md'),'changed');
    assert.throws(()=>normalizeSliceContract(f.contract,{root:f.root}),/stale/);
  }finally{f.cleanup();}
});

test('explicit v2 migration preserves effective scope, rejects conflicts and never inherits approval',async()=>{
  const {migrateSliceContractV2,persistSliceDraft}=await import('../../lib/slice-contract-preparation.mjs');
  const {compileDefaultImplementationContract}=await import('../../lib/implementation-contract-compiler.mjs');
  const f=fixture();try {
    const resolution=compileDefaultImplementationContract({requiredCapabilities:['quality.java-code-style']});
    const old={schema_version:2,contract_id:'contract.test',contract_version:'v1',slice_id:'slice.test',status:'approved',lifecycle_refs:Object.fromEntries(Object.entries(f.contract.basis).map(([k,v])=>[k,v.ref])),readiness:{blockers:[],stale_inputs:[],not_applicable:Object.entries(f.contract.applicability).map(([item,v])=>({item,reason:v.reason}))},resolution,common:{...f.contract.scope,required_skills:resolution.required_skills,required_capabilities:resolution.required_capabilities,verification_commands:['pnpm test'],expected_evidence_files:['test.log']},frontend:{status:'not-applicable',component_test_seams:['validate']},backend:{status:'not-applicable'},contract:{api_impact:false,no_api_impact_ref:'no_api_impact_record.md'},cross_repo:{repositories:[]},work_units:[{id:'validate',role_id:'role.backend-engineer',runtime_id:'runtime.generic',contract_id:'contract.test',contract_version:'v1',workflow_status:'active',work_unit:{behavior:'校验输入',primary_skill:'alibaba-java-code-style',tdd_mode:'behavior-tdd',allowed_write_paths:['src'],expected_evidence:['test.log'],verification_commands:['pnpm test']}}]};
    fs.writeFileSync(path.join(f.root,'old.json'),JSON.stringify(old));const before=fs.readFileSync(path.join(f.root,'old.json'));
    const migrated=migrateSliceContractV2(old,{root:f.root,sources:{ticket:{ref:'ticket.md',version:'v1'}},refinements:{contract_version:'v2',acceptance:f.contract.acceptance}});
    assert.equal(migrated.slice_contract.status,'ready-for-lifecycle-review',JSON.stringify(migrated.report.blockers));
    assert.equal(migrated.report.migration.approval_inherited,false);
    const n=normalizeSliceContract(migrated.slice_contract,{root:f.root});
    assert.deepEqual(n.common.allowed_write_paths,old.common.allowed_write_paths);
    assert.deepEqual(n.common.required_skills,old.common.required_skills);
    assert.deepEqual(n.work_units[0].work_unit.verification_commands,['pnpm test']);
    assert.equal(migrated.slice_contract.work_units[0].workflow_status,undefined);
    persistSliceDraft(migrated,'new.yaml',{root:f.root});
    assert.throws(()=>persistSliceDraft(migrated,'new.yaml',{root:f.root}),/EEXIST/);
    assert.deepEqual(fs.readFileSync(path.join(f.root,'old.json')),before);
    old.common.required_skills=['different'];
    const conflict=migrateSliceContractV2(old,{root:f.root,sources:{ticket:{ref:'ticket.md',version:'v1'}},refinements:{contract_version:'v2',acceptance:f.contract.acceptance}});
    assert.equal(conflict.slice_contract.status,'blocked');
    assert.ok(conflict.report.blockers.some(item=>item.reason==='conflict'));
  }finally{f.cleanup();}
});

test('frontend and cross-repository extensions preserve required inputs and order',()=>{
  const f=fixture();try {
    const c=f.contract;
    c.applicability.frontend={status:'required'};
    for(const key of ['requirement_freeze','low_fidelity_review','prototype_review','prototype_profile_decision','prototype_deliverable','prototype_deliverable_verification','prototype_confirmation','visual_baseline','state_matrix'])c.basis[key]='spec';
    c.extensions={frontend:{visual_baseline_case_ids:['case.main'],component_test_seams:['validate'],e2e_paths:['submit']}};
    const n=normalizeSliceContract(c,{root:f.root});assert.deepEqual(n.frontend.visual_baseline_case_ids,['case.main']);
    delete c.basis.visual_baseline;assert.throws(()=>normalizeSliceContract(c,{root:f.root}),/visual_baseline/);c.basis.visual_baseline='spec';
    c.applicability.cross_repo={status:'required'};c.scope.project_roots.push(path.join(f.root,'second'));c.work_units[0].project_root=f.root;
    c.extensions.cross_repo={delivery_order:['backend','frontend'],integration_verification:['joint-e2e'],rollback_order:['frontend','backend']};
    assert.deepEqual(normalizeSliceContract(c,{root:f.root}).cross_repo.rollback_order,['frontend','backend']);
    delete c.extensions.cross_repo.rollback_order;assert.throws(()=>normalizeSliceContract(c,{root:f.root}),/rollback_order/);
  }finally{f.cleanup();}
});

test('diff reports byte changes, array order and unknown upstream history without granting continuation',async()=>{
  const {diffSliceContracts}=await import('../../lib/slice-contract-views.mjs');
  const {stringify}=await import('../../vendor/yaml.mjs');
  const f=fixture();try {
    const bytes=stringify({slice_contract:f.contract});fs.writeFileSync(path.join(f.root,'before.yaml'),bytes);fs.writeFileSync(path.join(f.root,'after.yaml'),'# format\n'+bytes);
    const same=diffSliceContracts('before.yaml','after.yaml',{root:f.root});assert.equal(same.category,'presentation-only');assert.equal(same.bytes_changed,true);assert.equal(same.approval_reusable,false);
    f.contract.scope.allowed_write_paths=['other','src'];fs.writeFileSync(path.join(f.root,'after.yaml'),stringify({slice_contract:f.contract}));
    const changed=diffSliceContracts('before.yaml','after.yaml',{root:f.root});assert.ok(changed.changes.some(x=>x.path==='scope.allowed_write_paths'));
    fs.appendFileSync(path.join(f.root,'spec.md'),'changed');assert.ok(diffSliceContracts('before.yaml','after.yaml',{root:f.root}).source_checks.every(x=>x.result==='unknown-or-stale'));
    fs.writeFileSync(path.join(f.root,'after.yaml'),'slice_contract: {schema_version: 3, schema_version: 2}');assert.throws(()=>diffSliceContracts('before.yaml','after.yaml',{root:f.root}),/YAML/);
  }finally{f.cleanup();}
});

test('DDD design remains a single bound source with its slice-specific invariants visible',()=>{
  const f=fixture();try {
    const c=f.contract;const identity={architecture_family:'domain-driven',architecture_profile:'target-domain-model'};
    const design={design:{aggregate_catalog:[{id:'Order',invariants:['不能重复提交']}],transaction:'一次提交同一事务'}};
    for(const [key,value]of Object.entries({technical_design:design,repository_registration:{architecture_identity:identity},manifest:{architecture_identity:identity},backend_repository:{root:f.root},maven_wrapper:{command:'./mvnw'}})) {
      const ref=`${key}.json`,bytes=JSON.stringify(value);fs.writeFileSync(path.join(f.root,ref),bytes);c.basis[key]={ref,digest:hash(bytes),version:'v1'};
    }
    c.applicability.backend={status:'required'};c.resolution.architecture_identity=identity;
    c.extensions={backend:{affected_layers:['domain','application'],design_refs:['pointer:/design/aggregate_catalog'],constraints:{invariant_refs:['Order.不能重复提交']}}};
    const n=normalizeSliceContract(c,{root:f.root});assert.equal(n.resolution.architecture_identity.architecture_family,'domain-driven');
    assert.deepEqual(n.backend.constraints.invariant_refs,['Order.不能重复提交']);
    assert.equal(c.backend,undefined);
    c.extensions.backend.design_refs=['pointer:/missing'];assert.throws(()=>normalizeSliceContract(c,{root:f.root}),/定位缺失/);
  }finally{f.cleanup();}
});
