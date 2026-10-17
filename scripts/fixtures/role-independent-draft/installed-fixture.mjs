import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function installedFixture(profile='spec') {
 const binary=process.env.YSS_NATIVE_BINARY;
 assert.ok(binary&&path.isAbsolute(binary),'current native candidate required');
 const scratch=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'role-free-chain-'))),root=path.join(scratch,profile),calls=[];
 const write=(ref,value)=>{const file=path.join(root,ref);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value));};
 const read=ref=>fs.readFileSync(path.join(root,ref));
 const asset=ref=>({ref,digest:hash(read(ref))});
 const run=(label,args,expected='OK')=>{
  const argv=[...args,'--root',root,'--json'],r=spawnSync(binary,argv,{encoding:'utf8',maxBuffer:64*1024*1024});
  calls.push({label,argv:[binary,...argv],exit_code:r.status,stdout:r.stdout,stderr:r.stderr});
  const d=JSON.parse(r.stdout);assert.equal(d.code,expected,`${label}: ${JSON.stringify(d.result.diagnostics||d.result.message)}`);assert.equal(r.status===0,expected==='OK');return d.result;
 };
 const git=(...args)=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
 run('actual-install',['init','--profile',profile]);
 assert.equal(JSON.parse(read('.yss.json')).schemaVersion,4);
 assert.equal(fs.existsSync(path.join(root,'.template-spec/agents/digital-human-roles.yaml')),false);
 git('init','-q');git('-c','user.name=test','-c','user.email=test@example.invalid','commit','--allow-empty','-qm','base');
 const commit=git('rev-parse','HEAD');
 function draftTask({taskRef,unit='work-unit.plan-requirements',impacts=['wording'],inputs=['input.json'],outputs=['drafts/subject.json'],paths=['drafts'],checkpointRef,featureId,stage='stage.plan'}) {
  write('selection.json',{work_unit_id:unit,impacts});
  const selected=run('actual-selection-'+taskRef,['contract','verify','--kind','task-selection','--file','selection.json']).coverage.task_selection;
  write('baseline-input.json',{repository_root:root,commit,allowed_write_paths:paths});
  const baseline=run('actual-baseline-'+taskRef,['contract','verify','--kind','task-baseline','--file','baseline-input.json']).coverage.task_baseline.baseline;
  return {schema_version:3,task_id:taskRef.replaceAll('/','.'),profile,policy:{ref:selected.policy_ref,digest:selected.policy_digest,version:2},...(featureId?{feature_id:featureId}:{}),...(checkpointRef?{checkpoint_ref:checkpointRef}:{}),work_unit_id:unit,stage_id:stage,execution_state:'Drafter',workflow_status:'not-started',verification_status:'not-executed',objective:'验证实际准备与复核协议',acceptance:['当前范围与证据一致'],inputs,input_bindings:inputs.map(asset),baseline,provenance:{tool:'node',task_ref:taskRef,execution_ref:taskRef.replace(/\.json$/,'.execution.json'),identity:{status:'unavailable',reason:'Node test process has no stable agent/session identifier'}},skill_source:selected,allowed_write_paths:paths,forbidden_actions:['user-approval','ready-for-agent'],expected_outputs:outputs,expected_evidence_files:[taskRef.replace(/\.json$/,'.execution.json')],verification_commands:['node validate-current-output'],verification_results:[],contract:{contract_id:'contract.fixture',contract_version:'v1',kind:'lifecycle-work-unit',status:'issued',contract_ref:inputs[0],lifecycle_ref:inputs[0]},convergence:{parent_work_unit:unit,convergence_ref:inputs[0]},downstream_consumers:['work-unit.spec-synthesis']};
 }
 function finishTask(task,{changedFiles=task.expected_outputs,scope,candidate,executionRef=task.provenance.execution_ref}={}) {
  const taskRef=task.provenance.task_ref;
  write(taskRef,task);
  candidate??=run('actual-candidate-'+taskRef,['contract','verify','--kind','task-candidate','--file',taskRef]).coverage.task_candidate.candidate;
  const argv=[process.execPath,'-e',`for(const ref of ${JSON.stringify(task.expected_outputs)})require('fs').readFileSync(ref)`];
  const r=spawnSync(argv[0],argv.slice(1),{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  const log={...(['Reviewer','Verifier'].includes(task.execution_state)?{readonly:true}:{}),phase:'execution',tool:task.provenance.tool,task_ref:taskRef,identity:task.provenance.identity,command:task.verification_commands[0],argv,exit_code:r.status,executed_at:new Date().toISOString(),stdout:r.stdout,stderr:r.stderr,candidate_digest:candidate.digest,input_bindings:task.input_bindings,baseline:task.baseline,scope:scope||task.allowed_write_paths,expected_outputs:task.expected_outputs,result:'passed',blocking_findings:[]};
  write(executionRef,log);
  task.workflow_status='resolved';task.verification_status='executed';
  task.verification_results=[{command:log.command,status:'passed',exit_code:0,executed_at:log.executed_at,candidate_digest:candidate.digest,evidence_ref:executionRef,evidence_digest:asset(executionRef).digest}];
  task.result={result_schema:'workflow-execution-result-v1',work_unit:task.work_unit_id,workflow_reference:task.contract.contract_ref,result:'completed',skill:task.skill_source.skills[0],changed_files:changedFiles,context_reconciliation:{status:'reconciled',ref:'reconciliation.json'},evidence_refs:[executionRef,'reconciliation.json'],deferred_seams:[],drift:[],violation:[],new_impacts:[],stale_candidates:[],next_route:'work-unit.spec-synthesis',blocking_signals:[]};
  write(taskRef,task);return {task,candidate,log};
 }
 const cleanup=()=>{if(process.env.YSS_CHAIN_RECEIPT)fs.writeFileSync(process.env.YSS_CHAIN_RECEIPT,JSON.stringify({binary,sha256:hash(fs.readFileSync(binary)),pinned:false,root,calls},null,2));fs.rmSync(scratch,{recursive:true,force:true});};
 return {root,write,read,asset,run,git,commit,draftTask,finishTask,cleanup,calls};
}
