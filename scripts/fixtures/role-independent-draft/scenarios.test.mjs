import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseDocument,stringify} from '../../vendor/yaml.mjs';
import {loadOrchestrationContract} from '../../lib/orchestration-contract.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),source=path.resolve(here,'../../..'),bin=process.env.YSS_NATIVE_BINARY;
assert.ok(bin&&path.isAbsolute(bin),'YSS_NATIVE_BINARY must name the current development binary');
const hash=b=>createHash('sha256').update(b).digest('hex');
const canon=x=>Array.isArray(x)?x.map(canon):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canon(x[k])])):x;
const digest=x=>hash(JSON.stringify(canon(x)));
const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'task3b-native-'))),results=[];
const write=(ref,value)=>{fs.mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});fs.writeFileSync(path.join(root,ref),typeof value==='string'?value:JSON.stringify(value));};
const run=(label,args,expected='OK')=>{const argv=[...args,'--root',root,...(args[1]==='view'?['--profile','spec']:[]),'--json'],r=spawnSync(bin,argv,{encoding:'utf8'});results.push({label,argv:[bin,...argv],exit:r.status,stdout:r.stdout,stderr:r.stderr});const parsed=JSON.parse(r.stdout);assert.equal(parsed.code,expected,`${label}: ${parsed.code}: ${JSON.stringify(parsed.result.diagnostics||parsed.result.message)}`);return parsed;};
try{
 fs.cpSync(path.join(source,'.template-spec/process'),path.join(root,'.template-spec/process'),{recursive:true});
 write('yss-project.yaml',{schema_version:2,repository_mode:'project-instance'});
 write('.template-spec/process/harness-profile.yaml',{schema_version:3,profile_id:'harness.spec-template',status:'active',required_capabilities:['role-independent-governance-v1'],lifecycle:{},execution:{}});
 fs.copyFileSync(path.join(source,'CONTEXT.md'),path.join(root,'CONTEXT.md'));
 const policies=loadOrchestrationContract(ref=>fs.readFileSync(path.join(root,ref)),'.template-spec/process/orchestration-contract.yaml');
 for(const [unit,route] of Object.entries(policies.value.work_unit_routes)){
  write('selection.json',{work_unit_id:unit,impacts:Object.keys(route.impact_check_ids)});
  run('spec-mapping-'+unit,['contract','verify','--kind','task-selection','--file','selection.json']);
 }
 const registryRef='.template-spec/agents/yss-skill-registry.yaml',compilerRef='.agents/skills/yss-implementation-contract-compiler/references/compiler-contract.yaml';
 for(const ref of [registryRef,compilerRef])write(ref,fs.readFileSync(path.join(source,ref),'utf8'));
 const basis={};for(const name of ['spec','ticket','engineering_baseline','implementation_repository','architecture_review','build_architecture_checklist','no_api_impact_record']){const ref=`${name}.md`,text=`---\nkind: implementation-ticket\n---\n# ${name}\nAC-1: 有效输入成功，非法输入拒绝。\n`;write(ref,text);basis[name]={ref,digest:'sha256:'+hash(text)};}
 const contract={schema_version:4,contract_id:'contract.test',contract_version:'v1',slice_id:'slice.test',status:'draft',basis,scope:{impacted_areas:['domain'],implementation_path_policy:'external-repository-native',project_roots:[root],allowed_write_paths:['src']},applicability:Object.fromEntries(['frontend','backend','api','cross_repo'].map(k=>[k,{status:'not-applicable',reason:'本场景无该交付影响'}])),resolution:{required_capabilities:['contract.request-validation'],required_skills:['yss-validation'],recipe_ids:[],conditions:[],registry_digest:digest(parseDocument(fs.readFileSync(path.join(root,registryRef),'utf8')).toJS()),compiler_contract_digest:digest(parseDocument(fs.readFileSync(path.join(root,compilerRef),'utf8')).toJS())},acceptance:{'AC-1':{source:'ticket',locator:'AC-1'}},verification:{test:{command:'pnpm test',cwd:root,expected_evidence:['test.log'],test_seams:['validate'],acceptance_refs:['AC-1']}},work_units:[{id:'validate',behavior:'校验输入',check_ids:['gate.delivery-accepted'],primary_skill:'yss-validation',tdd_mode:'behavior-tdd',verification_refs:['test'],acceptance_refs:['AC-1']}]};
 write('slice.json',contract);
 // Real task3 schema: dispatch has current bindings but no invented execution outputs.
 for(const args of [['init','-q'],['-c','user.name=test','-c','user.email=test@example.invalid','commit','--allow-empty','-qm','base']])assert.equal(spawnSync('git',args,{cwd:root}).status,0);
 const commit=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim();
 write('input.json',{scope:{impacted_areas:['wording']},status:'draft'});
 write('selection.json',{work_unit_id:'work-unit.spec-synthesis',impacts:['wording']});
 const selected=run('draft-selection',['contract','verify','--kind','task-selection','--file','selection.json']).result.coverage.task_selection;
 const bound={ref:'input.json',digest:hash(fs.readFileSync(path.join(root,'input.json')))},baseline={repository_root:root,commit,digest:digest({base_commit:commit,roots:['drafts'],files:[]})};
 const provenance={tool:'codex',task_ref:'task.json',execution_ref:'dispatch.json',identity:{status:'unavailable',reason:'test platform does not expose stable identifiers'}};
 const task={schema_version:3,task_id:'TASK-1',profile:'spec',policy:{ref:'.template-spec/process/orchestration-contract.yaml',version:2,digest:policies.digest},work_unit_id:'work-unit.spec-synthesis',stage_id:'stage.spec-architecture',execution_state:'Drafter',workflow_status:'not-started',objective:'起草当前Spec',acceptance:['明确范围'],inputs:['input.json'],input_bindings:[bound],baseline,provenance,skill_source:selected,allowed_write_paths:['drafts'],forbidden_actions:['user-approval','ready-for-agent'],expected_outputs:['Spec草稿'],expected_evidence_files:['drafts/check.json'],verification_commands:['check draft'],verification_results:[],contract:{contract_id:'contract.draft',contract_version:'v1',kind:'lifecycle-work-unit',status:'issued',contract_ref:'input.json',lifecycle_ref:'input.json'},convergence:{parent_work_unit:'work-unit.spec-synthesis',convergence_ref:'input.json'},downstream_consumers:['work-unit.technical-analysis']};
 write('dispatch.json',{phase:'dispatch',dispatched_at:new Date().toISOString(),tool:provenance.tool,task_ref:provenance.task_ref,identity:provenance.identity,candidate:bound,input_bindings:task.input_bindings,baseline,scope:task.allowed_write_paths});write('task.json',task);
 run('task3-draft-dispatch',['contract','verify','--kind','task','--file','task.json']);
 task.execution_state='Reviewer';task.review_context={candidate:bound,policy:task.policy,check_ids:selected.check_ids,approval_scope:selected.check_ids,basis:[bound],review:{mode:'self-check',provenance}};write('task.json',task);run('task3-selfcheck-dispatch',['contract','verify','--kind','task','--file','task.json']);delete task.review_context;
 task.execution_state='Worker';write('task.json',task);run('worker-not-enabled',['contract','verify','--kind','task','--file','task.json'],'CAPABILITY');task.execution_state='Drafter';task.workflow_status='active';write('task.json',task);run('execution-not-enabled',['contract','verify','--kind','task','--file','task.json'],'CAPABILITY');
 const normalized=run('slice4-draft',['contract','verify','--kind','slice-draft','--file','slice.json']);assert.equal(normalized.result.coverage.slice_draft.execution_allowed,false);
 for(const view of ['review','task','full'])run(`slice4-${view}`,['contract','view','--kind','slice','--file','slice.json','--view',view,...(view==='task'?['--unit','validate']:[])]);
 run('writer-activation',['contract','verify','--kind','governance-write','--file','slice.json'],'CAPABILITY');
 contract.work_units[0].check_ids=[];write('slice.json',contract);run('empty-checks',['contract','verify','--kind','slice-draft','--file','slice.json'],'SCHEMA');
 contract.work_units[0].check_ids=['gate.delivery-accepted'];contract.work_units[0].allowed_write_paths=['outside'];write('slice.json',contract);run('scope-escape',['contract','verify','--kind','slice-draft','--file','slice.json'],'PATH');
 delete contract.work_units[0].allowed_write_paths;contract.schema_version=3;delete contract.work_units[0].check_ids;contract.work_units[0].role_id='role.backend-engineer';write('slice.json',contract);run('slice3-original-reader',['contract','view','--kind','slice','--file','slice.json','--view','task','--unit','validate']);
 const legacy=structuredClone(normalized.result.coverage.slice_draft.contract);legacy.schema_version=2;legacy.contract={};legacy.cross_repo={};
 const required=parseDocument(fs.readFileSync(path.join(root,compilerRef),'utf8')).toJS().slice_contract_required;
 for(const [section,fields]of Object.entries(required)){const target=section==='root'?legacy:(legacy[section]??={});for(const key of fields)if(!(key in target))target[key]=section==='lifecycle_refs'?'':[];}
 for(const section of ['common','resolution','backend'])legacy[section].required_skills??=[];
 for(const unit of legacy.work_units){unit.contract_id=legacy.contract_id;unit.contract_version=legacy.contract_version;}
 write('legacy2.json',legacy);run('slice2-original-reader',['contract','view','--kind','slice','--file','legacy2.json','--view','task','--unit','validate']);
 contract.schema_version=4;delete contract.work_units[0].role_id;contract.work_units[0].check_ids=['gate.delivery-accepted'];write('slice.json',contract);write('yss-project.yaml',{schema_version:1,repository_mode:'project-instance'});run('slice4-old-identity-rejected',['contract','view','--kind','slice','--file','slice.json','--view','full'],'IDENTITY');write('yss-project.yaml',{schema_version:2,repository_mode:'project-instance'});
 // Pure Node producer delegates the new semantic decision to the current development binary.
 process.env.YSS_NATIVE_BINARY=bin;
 const {normalizeSliceContract}=await import('../../lib/slice-contract.mjs');
 contract.schema_version=4;delete contract.work_units[0].role_id;contract.work_units[0].check_ids=['gate.delivery-accepted'];write('slice.json',contract);
 assert.equal(normalizeSliceContract(contract,{root}).schema_version,4);
 const {prepareSliceImplementationContract,persistSliceDraft}=await import('../../lib/slice-contract-preparation.mjs');
 const {basis:ignored,...facts}=contract;delete facts.schema_version;delete facts.status;delete facts.resolution;
 facts.work_units=[{...contract.work_units[0],primary_skill:'alibaba-java-code-style'}];delete facts.work_units[0].check_ids;
 write('ticket.md',`---\nversion: v1\nslice_implementation:\n${stringify(facts).split('\n').filter(Boolean).map(line=>'  '+line).join('\n')}\n---\n# 验收\nAC-1: 有效输入成功，非法输入拒绝。\n`);
 const prepared=prepareSliceImplementationContract({root,ticket_ref:'ticket.md',sources:Object.fromEntries(Object.entries(contract.basis).map(([key,b])=>[key,{ref:b.ref,...(key==='ticket'?{version:'v1'}:{})}])),refinements:{required_capabilities:['quality.java-code-style']}});
 assert.equal(prepared.slice_contract.schema_version,4);assert.equal(prepared.slice_contract.status,'ready-for-lifecycle-review',JSON.stringify(prepared.report.blockers));assert.deepEqual(prepared.slice_contract.work_units[0].check_ids,['gate.delivery-accepted']);
 assert.throws(()=>persistSliceDraft(prepared,'saved.yaml',{root}),/CAPABILITY|尚未|未启用/);assert.equal(fs.existsSync(path.join(root,'saved.yaml')),false);
 fs.cpSync(path.join(source,'profiles/backend/.template-spec/process'),path.join(root,'.template-spec/process'),{recursive:true});
 write('.template-spec/process/harness-profile.yaml',{schema_version:3,profile_id:'harness.backend-delivery',status:'active',required_capabilities:['role-independent-governance-v1'],lifecycle:{},execution:{}});
 const backend=loadOrchestrationContract(ref=>fs.readFileSync(path.join(root,ref)),'.template-spec/process/orchestration-contract.yaml');
 for(const [unit,route] of Object.entries(backend.value.work_unit_routes)){
  write('selection.json',{work_unit_id:unit,impacts:Object.keys(route.impact_check_ids)});
  run('backend-mapping-'+unit,['contract','verify','--kind','task-selection','--file','selection.json']);
 }
 console.log('Slice4 native draft/views, malformed checks/scope, legacy3 view, activation guard passed');
}finally{if(process.env.YSS_DRAFT_RECEIPT)fs.writeFileSync(process.env.YSS_DRAFT_RECEIPT,JSON.stringify({binary:bin,digest:hash(fs.readFileSync(bin)),pinned:false,root,results},null,2));fs.rmSync(root,{recursive:true,force:true});}
