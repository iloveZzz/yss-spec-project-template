import {installLegacySpecPolicy} from '../../lib/testing/legacy-spec-policy.mjs';
import {installedFixture} from './installed-fixture.mjs';
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
const installed=process.env.YSS_REVIEW_PUBLISH_ONLY?installedFixture('spec'):null;
const root=installed?.root||fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'task3b-native-'))),results=installed?.calls||[];
const write=(ref,value)=>{fs.mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});fs.writeFileSync(path.join(root,ref),typeof value==='string'?value:JSON.stringify(value));};
const run=(label,args,expected='OK')=>{const argv=[...args,'--root',root,...(args[1]==='view'?['--profile','spec']:[]),'--json'],r=spawnSync(bin,argv,{encoding:'utf8'});results.push({label,argv:[bin,...argv],exit:r.status,stdout:r.stdout,stderr:r.stderr});const parsed=JSON.parse(r.stdout);assert.equal(parsed.code,expected,`${label}: ${parsed.code}: ${JSON.stringify(parsed.result.diagnostics||parsed.result.message)}`);return parsed;};
scenarios:try{
 if(!installed) {
 fs.cpSync(path.join(source,'.template-spec/process'),path.join(root,'.template-spec/process'),{recursive:true});
 write('yss-project.yaml',{schema_version:2,repository_mode:'project-instance'});
 write('.template-spec/process/harness-profile.yaml',{schema_version:3,profile_id:'harness.spec-template',status:'active',required_capabilities:['role-independent-governance-v1'],lifecycle:{},execution:{}});
 fs.copyFileSync(path.join(source,'CONTEXT.md'),path.join(root,'CONTEXT.md'));
 }
 installLegacySpecPolicy(root);
 const policies=loadOrchestrationContract(ref=>fs.readFileSync(path.join(root,ref)),'.template-spec/process/orchestration-contract.yaml');
 if(!process.env.YSS_TASK_PRODUCER_ONLY&&!process.env.YSS_REVIEW_PRODUCER_ONLY&&!process.env.YSS_REVIEW_PUBLISH_ONLY)for(const [unit,route] of Object.entries(policies.value.work_unit_routes)){
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
 const task={schema_version:3,task_id:'TASK-1',profile:'spec',policy:{ref:'.template-spec/process/orchestration-contract.yaml',version:2,digest:policies.digest},work_unit_id:'work-unit.spec-synthesis',stage_id:'stage.spec-architecture',execution_state:'Drafter',workflow_status:'not-started',objective:'起草当前Spec',acceptance:['明确范围'],inputs:['input.json'],input_bindings:[bound],baseline,provenance,skill_source:selected,allowed_write_paths:['drafts'],forbidden_actions:['user-approval','ready-for-agent'],expected_outputs:['drafts/spec.mjs'],expected_evidence_files:['drafts/check.json'],verification_commands:['node --check drafts/spec.mjs'],verification_results:[],contract:{contract_id:'contract.draft',contract_version:'v1',kind:'lifecycle-work-unit',status:'issued',contract_ref:'input.json',lifecycle_ref:'input.json'},convergence:{parent_work_unit:'work-unit.spec-synthesis',convergence_ref:'input.json'},downstream_consumers:['work-unit.technical-analysis']};
 process.env.YSS_NATIVE_BINARY=bin;
 const {generateTaskPackageDefaults}=await import('../../lib/task-package.mjs');
 const draftInputs={...structuredClone(task),skill_source:{impacts:['wording']},baseline:{repository_root:root,commit}};
 const produced=generateTaskPackageDefaults(undefined,draftInputs,{root});
 assert.equal(produced.schema_version,3);assert.equal(produced.profile,'spec');assert.deepEqual(produced.baseline,baseline);assert.deepEqual(produced.skill_source,selected);
 assert.equal(produced.workflow_status,'not-started');assert.equal(produced.result,undefined);assert.equal(produced.actor_id,undefined);assert.equal(produced.role_id,undefined);assert.equal(fs.existsSync(path.join(root,'task.json')),false);
 assert.throws(()=>generateTaskPackageDefaults('role.product-manager',draftInputs,{root}),/role|岗位|旧/);
 const missing=structuredClone(draftInputs);delete missing.provenance;
 assert.throws(()=>generateTaskPackageDefaults(undefined,missing,{root}),/provenance|来源/);
 if(process.env.YSS_TASK_PRODUCER_ONLY){console.log('role-independent task producer uses native selection and actual baseline, without identity registry or future execution');break scenarios;}
 write('dispatch.json',{phase:'dispatch',dispatched_at:new Date().toISOString(),tool:provenance.tool,task_ref:provenance.task_ref,identity:provenance.identity,candidate:bound,input_bindings:task.input_bindings,baseline,scope:task.allowed_write_paths,expected_outputs:task.expected_outputs});write('task.json',task);
 run('task3-draft-dispatch',['contract','verify','--kind','task','--file','task.json']);
 task.execution_state='Reviewer';task.review_context={candidate:bound,policy:task.policy,check_ids:selected.check_ids,approval_scope:selected.check_ids,basis:[bound],review:{mode:'self-check',provenance}};write('task.json',task);run('task3-selfcheck-needs-completed-source',['contract','verify','--kind','task','--file','task.json'],'TASK_REVIEW');delete task.review_context;
 task.execution_state='Worker';write('task.json',task);run('worker-needs-slice',['contract','verify','--kind','task','--file','task.json'],'TASK_CONTRACT');task.execution_state='Drafter';write('drafts/spec.mjs','export const value = 1;' );task.workflow_status='active';write('task.json',task);run('dispatch-is-not-execution',['contract','verify','--kind','task','--file','task.json'],'EVIDENCE_EXECUTION');
 // Complete the same real task with current Go-computed output candidate and actual execution facts.
 task.workflow_status='not-started';write('task.json',task);
 const candidate=run('draft-output-candidate',['contract','verify','--kind','task-candidate','--file','task.json']).result.coverage.task_candidate.candidate;
 assert.notEqual(candidate.digest,bound.digest);
 const executed_at=new Date().toISOString(),execution=spawnSync(process.execPath,['--check','drafts/spec.mjs'],{cwd:root,encoding:'utf8'});
 results.push({label:'actual-draft-check',argv:[process.execPath,'--check','drafts/spec.mjs'],cwd:root,exit:execution.status,stdout:execution.stdout,stderr:execution.stderr});assert.equal(execution.status,0);
 const actual={phase:'execution',tool:provenance.tool,task_ref:provenance.task_ref,identity:provenance.identity,command:'node --check drafts/spec.mjs',exit_code:execution.status,executed_at,stdout:execution.stdout,stderr:execution.stderr,candidate_digest:candidate.digest,input_bindings:task.input_bindings,baseline,scope:task.allowed_write_paths,expected_outputs:task.expected_outputs,result:'passed',blocking_findings:[]};
 write('dispatch.json',actual);write('drafts/check.json',{status:'reconciled'});
 task.workflow_status='resolved';task.verification_status='executed';task.verification_results=[{command:actual.command,status:'passed',exit_code:0,executed_at,candidate_digest:candidate.digest,evidence_ref:'dispatch.json',evidence_digest:hash(fs.readFileSync(path.join(root,'dispatch.json')))}];
 task.result={result_schema:'workflow-execution-result-v1',work_unit:task.work_unit_id,workflow_reference:'input.json',result:'completed',skill:selected.skills[0],changed_files:['drafts/check.json','drafts/spec.mjs'],context_reconciliation:{status:'reconciled',ref:'drafts/check.json'},evidence_refs:['drafts/check.json'],deferred_seams:[],drift:[],violation:[],new_impacts:[],stale_candidates:[],next_route:'work-unit.technical-analysis',blocking_signals:[]};
 write('task.json',task);
 run('task3-actual-completion',['contract','verify','--kind','task','--file','task.json']);
 // The actual completed draft feeds the existing review package entry without role/runtime fields.
 const candidateAsset={ref:'drafts/spec.mjs',digest:hash(fs.readFileSync(path.join(root,'drafts/spec.mjs')))};
 write('review-checkpoint.json',{gates:{'gate.spec-baseline-approved':{status:'pending',subject_ref:candidateAsset.ref,subject_digest:candidateAsset.digest,approval_scope:['drafts'],basis:[bound,{ref:'task.json',digest:hash(fs.readFileSync(path.join(root,'task.json')))}]}}});
 const reviewTask={...structuredClone(task),task_id:'REVIEW-1',workflow_status:'not-started',verification_status:'not-executed',verification_results:[],execution_state:'Reviewer',allowed_write_paths:['reviews'],expected_outputs:['review report'],expected_evidence_files:['reviews/result.json'],baseline:{repository_root:root,commit},skill_source:{impacts:['wording']},provenance:{...provenance,task_ref:'review-package/task.json',execution_ref:'review-dispatch.json'},inputs:['input.json','task.json'],input_bindings:[bound,{ref:'task.json',digest:hash(fs.readFileSync(path.join(root,'task.json')))}]};delete reviewTask.result;
 reviewTask.review_context={candidate:candidateAsset,policy:task.policy,check_ids:selected.check_ids,approval_scope:['drafts'],basis:reviewTask.input_bindings,review:{mode:'self-check',provenance:reviewTask.provenance}};
 write('review-input.json',{task:reviewTask});
 const {buildReviewPackage}=await import('../../lib/review-package.mjs');
 const reviewPackage=buildReviewPackage({root,checkpointRef:'review-checkpoint.json',checkIds:['gate.spec-baseline-approved'],reviewInputRef:'review-input.json',outputDir:'review-package'});
 assert.equal(reviewPackage.task.schema_version,3);assert.equal(reviewPackage.bundle.schema_version,3);assert.equal(reviewPackage.bundle.reviews[0].decision,'pending');assert.equal(reviewPackage.task.role_id,undefined);assert.equal(reviewPackage.subject_ref,candidateAsset.ref);assert.equal(fs.existsSync(path.join(root,'review-package')),false);
 if(process.env.YSS_REVIEW_PUBLISH_ONLY){
  const pending=reviewPackage.task,p=pending.provenance;
  write(p.execution_ref,{phase:'dispatch',dispatched_at:new Date().toISOString(),tool:p.tool,task_ref:p.task_ref,identity:p.identity,candidate:pending.review_context.candidate,input_bindings:pending.input_bindings,baseline:pending.baseline,scope:pending.allowed_write_paths,expected_outputs:pending.expected_outputs});
  const {prepareReviewPackage}=await import('../../lib/review-package.mjs');
  const published=prepareReviewPackage({root,checkpointRef:'review-checkpoint.json',checkIds:['gate.spec-baseline-approved'],reviewInputRef:'review-input.json',outputDir:'review-package'});
  assert.equal(published.decision,'pending');assert.equal(published.execution_authorization,'not-granted');
  run('actual-published-pending-task',['contract','verify','--kind','task','--file','review-package/task.json']);
  const checkpointBefore=fs.readFileSync(path.join(root,'review-checkpoint.json')),taskBefore=fs.readFileSync(path.join(root,'review-package/task.json'));
  assert.throws(()=>prepareReviewPackage({root,checkpointRef:'review-checkpoint.json',checkIds:['gate.spec-baseline-approved'],reviewInputRef:'review-input.json',outputDir:'review-package'}),/不得覆盖历史证据/);
  assert.deepEqual(fs.readFileSync(path.join(root,'review-package/task.json')),taskBefore);
  const invalid=structuredClone(reviewTask);invalid.provenance.task_ref='failed-package/task.json';invalid.provenance.execution_ref='missing-dispatch.json';invalid.review_context.review.provenance=invalid.provenance;
  write('invalid-review-input.json',{task:invalid});
  assert.throws(()=>prepareReviewPackage({root,checkpointRef:'review-checkpoint.json',checkIds:['gate.spec-baseline-approved'],reviewInputRef:'invalid-review-input.json',outputDir:'failed-package'}),/INPUT/);
  assert.equal(fs.existsSync(path.join(root,'failed-package')),false);assert.deepEqual(fs.readFileSync(path.join(root,'review-checkpoint.json')),checkpointBefore);
  console.log('actual installed no-role pending review publication verified');break scenarios;
 }
 if(process.env.YSS_REVIEW_PRODUCER_ONLY){console.log('role-independent review package reuses the completed draft and keeps pending authority');break scenarios;}
 run('completion-ref-override-refused',['contract','verify','--kind','task','--file','task.json','--task-ref','task.json'],'TASK_ORIGIN');
 write('drafts/spec.mjs','export const value = 2;' );run('output-drift-refused',['contract','verify','--kind','task','--file','task.json'],'EVIDENCE_CANDIDATE');write('drafts/spec.mjs','export const value = 1;' );
 task.verification_results[0].status='not-run';write('task.json',task);run('not-run-cannot-complete',['contract','verify','--kind','task','--file','task.json'],'SCHEMA');task.verification_results[0].status='passed';write('task.json',task);
 const normalized=run('slice4-draft',['contract','verify','--kind','slice-draft','--file','slice.json']);assert.equal(normalized.result.coverage.slice_draft.execution_allowed,false);
 for(const view of ['review','task','full'])run(`slice4-${view}`,['contract','view','--kind','slice','--file','slice.json','--view',view,...(view==='task'?['--unit','validate']:[])]);
 run('slice4-preflight-preview',['contract','verify','--kind','slice-preflight','--file','slice.json']);
 run('slice4-execution-result-needs-task',['contract','verify','--kind','slice-execution-result','--file','task.json'],'TASK_RESULT');
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
 const {inspectSliceContract}=await import('../../lib/slice-execution-preflight.mjs');
 assert.equal(inspectSliceContract('slice.json',{root}).report.execution_allowed,false);
 const {validateExecutionResult}=await import('../../lib/implementation-contract-compiler.mjs');
 assert.throws(()=>validateExecutionResult({schema_version:2},contract,{root}),/TASK_RESULT: Slice4结果需要/);
 const {compileSliceTaskPackage}=await import('../../lib/slice-task-package.mjs');
 assert.throws(()=>compileSliceTaskPackage({ref:'slice.json'},{root}),/CAPABILITY|尚缺原生|尚未激活/);
 const {createApprovedExecutionContext}=await import('../../lib/approved-execution-context.mjs');
 assert.throws(()=>createApprovedExecutionContext({ref:'slice.json'},{root}),/CAPABILITY|尚缺原生|尚未激活/);

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
}finally{if(process.env.YSS_DRAFT_RECEIPT)fs.writeFileSync(process.env.YSS_DRAFT_RECEIPT,JSON.stringify({binary:bin,digest:hash(fs.readFileSync(bin)),pinned:false,root,results},null,2));if(installed)installed.cleanup();else fs.rmSync(root,{recursive:true,force:true});}
