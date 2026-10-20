import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {stageGatesFixture} from '../../lib/testing/stage-gates-fixture.mjs';
import {semanticDigest} from '../../lib/structured-assets.mjs';
import {parse} from '../../vendor/yaml.mjs';
import {verifyStageResult} from '../../lib/stage-result.mjs';
const source=path.resolve(import.meta.dirname,'../../..');
function admissionFixture(f) {
 const {root,write,asset}=f;
 const registryRef='.template-spec/agents/yss-skill-registry.yaml',compilerRef='.agents/skills/yss-implementation-contract-compiler/references/compiler-contract.yaml';
 for(const ref of [registryRef,compilerRef])write(ref,fs.readFileSync(path.join(source,ref),'utf8'));
 const basis={};for(const name of ['spec','ticket','engineering_baseline','implementation_repository','architecture_review','build_architecture_checklist','no_api_impact_record']){const ref=`${name}.md`;write(ref,`---\nkind: implementation-ticket\n---\n# ${name}\nAC-1: 有效输入成功，非法输入拒绝。\n`);basis[name]={...asset(ref),digest:"sha256:"+asset(ref).digest};}
 const contract={schema_version:4,contract_id:'contract.test',contract_version:'v1',slice_id:'slice.test',status:'approved',basis,scope:{impacted_areas:['domain'],implementation_path_policy:'external-repository-native',project_roots:[root],allowed_write_paths:['src']},applicability:Object.fromEntries(['frontend','backend','api','cross_repo'].map(k=>[k,{status:'not-applicable',reason:'本场景无该交付影响'}])),resolution:{required_capabilities:['contract.request-validation'],required_skills:['yss-validation'],recipe_ids:[],conditions:[],registry_digest:semanticDigest(parse(f.read(registryRef).toString())).slice(7),compiler_contract_digest:semanticDigest(parse(f.read(compilerRef).toString())).slice(7)},acceptance:{'AC-1':{source:'ticket',locator:'AC-1'}},verification:{test:{command:'node check-input',cwd:root,expected_evidence:['test.log'],test_seams:['validate'],acceptance_refs:['AC-1']}},work_units:[{id:'validate',behavior:'校验输入',check_ids:['gate.delivery-accepted'],primary_skill:'yss-validation',tdd_mode:'behavior-tdd',verification_refs:['test'],acceptance_refs:['AC-1']}]};
 write('spec.md','---\ncontent_profile: plan-spec-v1\n---\n## 功能需求\n| ID | 需求 |\n|---|---|\n| FR-1 | 当前输入校验 |\n## 验收标准\n| ID | 需求引用 |\n|---|---|\n| AC-1 | FR-1 |\n');basis.spec={...asset('spec.md'),digest:'sha256:'+asset('spec.md').digest};
 write('slice.json',contract);
 const {result:spec}=f.record({gateId:'gate.spec-baseline-approved',subjectRef:'spec.md'});write('spec-stage.json',spec);
 const checks=f.stage.gates.find(g=>g.id==='gate.implementation-admitted').checks.map(id=>{
  const argv=[process.execPath,'-e',"JSON.parse(require('fs').readFileSync('slice.json'))"];
  const run=spawnSync(argv[0],argv.slice(1),{cwd:root,encoding:'utf8'});assert.equal(run.status,0,run.stderr);
  const ref=id+'.execution.json';write(ref,{phase:'execution',argv,exit_code:0,executed_at:new Date().toISOString(),input_bindings:[asset('slice.json')],check_ids:[id],result:'passed',blocking_findings:[]});
  return {id,result:'passed',inputs:[asset('slice.json')],evidence:[asset(ref)]};
 });
 const result={schema_version:1,kind:'stage-result',gate_id:'gate.implementation-admitted',feature_id:'feature.demo',scope:['feature.demo'],assets:[asset('slice.json')],checks,outcome:'approved',blocking_findings:[],authorization:{kind:'stage',...asset('spec-stage.json')},provenance:{tool:'node',execution_ref:checks[0].evidence[0].ref}};
 write('admission.json',result);
 write('checkpoint.json',{schema_version:2,feature_id:'feature.demo',gates:{'gate.spec-baseline-approved':{record_ref:'spec-stage.json',record_digest:asset('spec-stage.json').digest},'gate.implementation-admitted':{record_ref:'admission.json',record_digest:asset('admission.json').digest}}});
 return {contract,result};
}
test('current authorized Slice admits automatically and changed contract or API basis refuses',()=>{
 const f=stageGatesFixture();try {
  const {contract}=admissionFixture(f);
  assert.equal(verifyStageResult({root:f.root,checkpointRef:'checkpoint.json',gateId:'gate.implementation-admitted',assetRef:'slice.json'}).status,'approved');
  contract.scope.allowed_write_paths.push('outside');f.write('slice.json',contract);
  assert.throws(()=>verifyStageResult({root:f.root,checkpointRef:'checkpoint.json',gateId:'gate.implementation-admitted',assetRef:'slice.json'}));
 }finally{f.cleanup();}
});
test('compilation can run before admission and cannot authorize business execution',()=>{
 const f=stageGatesFixture();try {
  admissionFixture(f);f.write('checkpoint.json',{schema_version:2,feature_id:'feature.demo',gates:{}});
  const run=spawnSync(process.env.YSS_NATIVE_BINARY,['contract','verify','--kind','slice-draft','--root',f.root,'--file','slice.json','--json'],{encoding:'utf8'});
  assert.equal(run.status,0,run.stdout);assert.equal(JSON.parse(run.stdout).result.coverage.slice_draft.execution_allowed,false);
  const implementation=spawnSync(process.env.YSS_NATIVE_BINARY,['contract','verify','--kind','slice','--root',f.root,'--file','slice.json','--checkpoint','checkpoint.json','--json'],{encoding:'utf8'});
  assert.equal(implementation.status,1);assert.match(implementation.stdout,/STAGE_PENDING/);
 }finally{f.cleanup();}
});
