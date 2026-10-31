import {pathToFileURL} from 'node:url';
import {bindSyntheticEvidence} from './evidence-fixture.mjs';
import {composeProfileTree} from '../../lib/profile-tree.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hash } from '../../lib/strategic-handoff-io.mjs';
import { normalizeSliceContract,selectSliceWorkUnit,sourceSliceContract } from '../../lib/slice-contract.mjs';

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

test('v3 accepts registered app project roots and still rejects container roots and traversal',()=>{
  const f=fixture();try {
    for(const policy of ['harness-apps-multi-project','external-repository-native']) {
      for(const projectRoot of ['app/backend/','app/frontend/','app/backend/project1/']) {
        const contract=structuredClone(f.contract);
        contract.scope.implementation_path_policy=policy;
        contract.scope.project_roots=[projectRoot];
        contract.verification.test.cwd=projectRoot;
        assert.equal(normalizeSliceContract(contract,{root:f.root}).common.project_roots[0],projectRoot);
      }
    }
    for(const projectRoot of ['apps/backend/','apps/frontend/','app/backend/../outside']) {
      const contract=structuredClone(f.contract);
      contract.scope.implementation_path_policy='harness-apps-multi-project';
      contract.scope.project_roots=[projectRoot];
      contract.verification.test.cwd=projectRoot;
      assert.throws(()=>normalizeSliceContract(contract,{root:f.root}),/工程|路径/);
    }
  }finally{f.cleanup();}
});

test('registered Harness layouts and external native roots keep scope checks',()=>{
 for(const project of ['app/backend/project1','app/frontend/project1','services/billing','apps/backend/project1']) {
  const f=fixture();try {
   f.contract.scope.implementation_path_policy='harness-apps-multi-project';
   f.contract.scope.project_roots=[project];f.contract.verification.test.cwd=project;
   assert.deepEqual(normalizeSliceContract(f.contract,{root:f.root}).common.project_roots,[project]);
   f.contract.work_units[0].project_root='unregistered';
   assert.throws(()=>normalizeSliceContract(f.contract,{root:f.root}),/登记的 project_root/);
  }finally{f.cleanup();}
 }
 for(const project of ['apps/backend/','services/../billing','services/*','services\\billing','/services/billing']) {
  const f=fixture();try {
   f.contract.scope.implementation_path_policy='harness-apps-multi-project';
   f.contract.scope.project_roots=[project];f.contract.verification.test.cwd=project;
   assert.throws(()=>normalizeSliceContract(f.contract,{root:f.root}),/相对路径|具体项目/);
  }finally{f.cleanup();}
 }
 const f=fixture();try {
  assert.deepEqual(normalizeSliceContract(f.contract,{root:f.root}).common.project_roots,[f.root]);
  f.contract.scope.project_roots=['.'];f.contract.verification.test.cwd='.';
  assert.deepEqual(normalizeSliceContract(f.contract,{root:f.root}).common.project_roots,['.']);
 }finally{f.cleanup();}
});

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
  const {migrateSliceContractV2}=await import('../../lib/slice-contract-preparation.mjs');
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
    // This bare source fixture exercises read-only conversion, not governance writes.
    assert.equal(fs.existsSync(path.join(f.root,'new.yaml')),false);
    assert.deepEqual(fs.readFileSync(path.join(f.root,'old.json')),before);
    old.common.required_skills=['different'];
    const conflict=migrateSliceContractV2(old,{root:f.root,sources:{ticket:{ref:'ticket.md',version:'v1'}},refinements:{contract_version:'v2',acceptance:f.contract.acceptance}});
    assert.equal(conflict.slice_contract.status,'blocked');
    assert.ok(conflict.report.blockers.some(item=>item.reason==='conflict'));
  }finally{f.cleanup();}
});

test('前端子合同已移除（必需会被拒绝）；跨仓扩展保留必需输入与顺序',()=>{
  const f=fixture();try {
    const c=f.contract;
    c.applicability.frontend={status:'required'};
    assert.throws(()=>normalizeSliceContract(c,{root:f.root}),/前端实现已从生命周期移除/);
    c.applicability.frontend={status:'not-applicable',reason:'前端实现已移除'};c.extensions={};
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


test('stage work item cannot be disguised as the implementation contract ticket',()=>{
  const f=fixture();try {
    const bytes='---\nkind: "stage-work-item"\n---\nAC-1: 设计任务验收\n';
    fs.writeFileSync(path.join(f.root,'ticket.md'),bytes);f.contract.basis.ticket.digest=hash(bytes);
    assert.throws(()=>normalizeSliceContract(f.contract,{root:f.root}),/stage-work-item/);
    assert.throws(()=>normalizeSliceContract({schema_version:2,lifecycle_refs:{ticket:'ticket.md'}},{root:f.root}),/stage-work-item/);
  }finally{f.cleanup();}
});

test('single-repository specialist Agent units preserve source and frozen scope',()=>{
 for(const role of ['role.backend-engineer','role.backend-agent']) {
  const f=fixture();try {
   f.contract.work_units[0].role_id=role;f.contract.work_units[0].project_root=f.root;f.contract.work_units[0].allowed_write_paths=['src/owned'];
   const original=structuredClone(f.contract),normalized=normalizeSliceContract(f.contract,{root:f.root}),selected=selectSliceWorkUnit(normalized,'validate');
   assert.deepEqual(selected.common.allowed_write_paths,['src/owned']);assert.deepEqual(selected.common.project_roots,[f.root]);
   assert.deepEqual(sourceSliceContract(selected),original);assert.deepEqual(f.contract,original);
   assert.deepEqual(selected.frontend,{status:'not-applicable'});
   normalized.work_units[0].role_id='role.requirements-manager';assert.throws(()=>selectSliceWorkUnit(normalized,'validate'),/原始合同冲突/);
   f.contract.work_units[0].role_id='role.requirements-manager';assert.throws(()=>selectSliceWorkUnit(normalizeSliceContract(f.contract,{root:f.root}),'validate'),/明确后端角色/);
   f.contract.work_units[0].allowed_write_paths=['outside'];assert.throws(()=>normalizeSliceContract(f.contract,{root:f.root}),/写范围/);
  }finally{f.cleanup();}
 }
});
