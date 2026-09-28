import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { generateTaskPackageDefaults, validateTaskPackage } from '../scripts/lib/task-package.mjs';
import { observeReadOnlyIntake, intakeEvidencePath } from '../scripts/lib/read-only-intake.mjs';

function fixture(t) {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'yss-intake-test-')); t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const root=path.join(temp,'repo');fs.mkdirSync(root);assert.equal(spawnSync('git',['init','-q',root]).status,0);
  fs.writeFileSync(path.join(root,'yss-project.yaml'),'schema_version: 1\nrepository_mode: template-source\n');
  fs.writeFileSync(path.join(root,'CONTEXT.md'),'研究词汇\n');
  const task=generateTaskPackageDefaults('role.requirements-manager',{
    schema_version:2,task_id:'intake-test',work_unit_id:'work-unit.entry-triage',actor_id:'researcher',runtime_id:'runtime.generic',execution_state:'Explorer',workflow_status:'active',
    contract:{kind:'read-only-intake',contract_id:'intake-contract',contract_version:1,status:'issued',contract_ref:'CONTEXT.md'},
    inputs:['CONTEXT.md'],objective:'只读研究',allowed_write_paths:[],forbidden_actions:['写入仓库','批准或流转'],expected_outputs:['来源和结论'],expected_evidence_files:[],verification_commands:[],verification_results:[],verification_status:'not-executed',downstream_consumers:['root'],convergence:{parent_work_unit:'work-unit.entry-triage',convergence_ref:'chat-root'}
  }); return {temp,root,task};
}
test('read-only v2 requires no checkpoint and preserves v1 constraints', t=>{
 const {root,task}=fixture(t);assert.equal(validateTaskPackage(task,{root}),task);
 for(const modify of [x=>x.schema_version=1,x=>x.execution_state='Worker',x=>x.execution_state='Reviewer',x=>x.stage_id='stage.verification-release-retrospective',x=>x.contract.kind='slice-implementation',x=>x.work_unit_id='work-unit.ssot-update',x=>x.allowed_write_paths=['docs'],x=>x.contract.maintenance_ref='fake.yaml']) {
  const bad=structuredClone(task);modify(bad);assert.throws(()=>validateTaskPackage(bad,{root}));
 }
});
test('observed completion with no command is explicitly not-executed',async t=>{
 const {temp,root,task}=fixture(t),runDir=path.join(temp,'run');const result=await observeReadOnlyIntake(task,{root,runDir});
 assert.equal(result.verification_status,'not-executed');assert.equal(result.result.next_route,null);
 assert.equal(validateTaskPackage(result,{root,runDir}),result);
 const wrongUnit=structuredClone(result);wrongUnit.result.work_unit='work-unit.slice-implementation';assert.throws(()=>validateTaskPackage(wrongUnit,{root,runDir}),/原分诊工作单元/);
 const forged=structuredClone(result);forged.result.next_route='work-unit.ssot-update';assert.throws(()=>validateTaskPackage(forged,{root,runDir}));
 fs.writeFileSync(path.join(root,'later.md'),'change');assert.throws(()=>validateTaskPackage(result,{root,runDir}),/实际差异/);
});
test('real execution logs validate; source refs cannot impersonate a command log',async t=>{
 const {temp,root,task}=fixture(t),runDir=path.join(temp,'run');const result=await observeReadOnlyIntake(task,{root,runDir,command:process.execPath,args:['-e','console.log("observed")']});
 assert.equal(validateTaskPackage(result,{root,runDir}),result);
 result.verification_results[0].evidence_ref='CONTEXT.md';assert.throws(()=>validateTaskPackage(result,{root,runDir}),/真实运行日志/);
});
test('runner detects additions, modifications and deletions despite empty changed_files',async t=>{
 const {temp,root,task}=fixture(t);
 for(const [i,code] of ["require('fs').writeFileSync('new.md','new')","require('fs').writeFileSync('CONTEXT.md','changed')","require('fs').unlinkSync('new.md')"].entries()){
  const runDir=path.join(temp,`run-${i}`);const result=await observeReadOnlyIntake(task,{root,runDir,command:process.execPath,args:['-e',code]});
  assert.equal(result.workflow_status,'failed');assert.deepEqual(result.result.changed_files,[]);
  result.workflow_status='resolved';result.result.result='completed';result.result.violation=[];result.result.blocking_signals=[];
  assert.throws(()=>validateTaskPackage(result,{root,runDir}),/实际差异/);
 }
});
test('runtime evidence rejects traversal, absolute paths, and symlink escape', t=>{
 const {temp,root}=fixture(t),runDir=path.join(temp,'run');fs.mkdirSync(runDir);fs.symlinkSync(path.join(root,'CONTEXT.md'),path.join(runDir,'escape'));
 for(const ref of ['run:../repo/CONTEXT.md','run:/etc/hosts','run:escape']) assert.throws(()=>intakeEvidencePath(ref,{root,runDir}),/越界/);
});

test('declared verification cannot be silently replaced; ignored changes are observed',async t=>{
 const {temp,root,task}=fixture(t);task.verification_commands=['required check'];await assert.rejects(observeReadOnlyIntake(task,{root,runDir:path.join(temp,'bad'),command:process.execPath,args:['-e','']}),/执行命令与声明/);
 task.verification_commands=[];fs.writeFileSync(path.join(root,'.gitignore'),'ignored.txt\n');const result=await observeReadOnlyIntake(task,{root,runDir:path.join(temp,'ignored'),command:process.execPath,args:['-e',"require('fs').writeFileSync('ignored.txt','new')"]});assert.equal(result.workflow_status,'failed');
});
test('exit code and stream bytes must match the recorded execution',async t=>{
 const {temp,root,task}=fixture(t),runDir=path.join(temp,'run');const result=await observeReadOnlyIntake(task,{root,runDir,command:process.execPath,args:['-e','console.log(1)']});
 const forged=structuredClone(result);forged.verification_results[0].exit_code=7;assert.throws(()=>validateTaskPackage(forged,{root,runDir}),/exit_code/);fs.appendFileSync(path.join(runDir,'stdout.log'),'extra');assert.throws(()=>validateTaskPackage(result,{root,runDir}),/日志摘要/);
});
