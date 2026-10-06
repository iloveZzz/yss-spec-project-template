import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { generateTaskPackageDefaults, validateTaskPackage } from '../scripts/lib/task-package.mjs';
import { observeReadOnlyIntake, intakeEvidencePath, intakeSnapshot, createIntakeSnapshotObserver, fileDigest, digest } from '../scripts/lib/read-only-intake.mjs';

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
test('snapshots hash mixed file lengths exactly and observe fresh file, link and mode changes', t=>{
 const {root}=fixture(t);
 const bytes=[Buffer.alloc(1048609, 91), Buffer.alloc(0), Buffer.from('短文件'), Buffer.alloc(1048576, 7)];
 bytes.forEach((value,i)=>fs.writeFileSync(path.join(root,`${i}.bin`),value));
 fs.writeFileSync(path.join(root,'.gitignore'),'ignored.bin\n');
 fs.writeFileSync(path.join(root,'ignored.bin'),'ignored');
 fs.writeFileSync(path.join(root,'deleted.bin'),'tracked');
 assert.equal(spawnSync('git',['add','deleted.bin'],{cwd:root}).status,0);
 fs.unlinkSync(path.join(root,'deleted.bin'));
 fs.symlinkSync('0.bin',path.join(root,'link'));
 fs.symlinkSync('absent',path.join(root,'broken'));
 const child=path.join(root,'child');fs.mkdirSync(child);
 const git=args=>assert.equal(spawnSync('git',args,{cwd:child}).status,0);
 git(['init','-q']);fs.writeFileSync(path.join(child,'nested'),'nested');git(['add','.']);
 git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgSign=false','commit','-qm','synthetic fixture']);
 assert.equal(spawnSync('git',['add','child'],{cwd:root}).status,0);
 const observer=createIntakeSnapshotObserver(),before=observer.snapshot(root);
 assert.deepEqual(before,intakeSnapshot(root));
 bytes.forEach((value,i)=>assert.equal(before.files[`${i}.bin`].digest,digest(value)));
 assert.equal(before.files['ignored.bin'].digest,digest('ignored'));
 assert.equal(before.files['deleted.bin'],null);
 assert.equal(before.files.link.digest,digest('0.bin'));
 assert.equal(before.files.broken.digest,digest('absent'));
 assert.equal(before.files.child.files.files.nested.digest,digest('nested'));
 fs.writeFileSync(path.join(root,'0.bin'),'new');
 fs.writeFileSync(path.join(root,'ignored.bin'),'changed');
 fs.chmodSync(path.join(root,'2.bin'),0o755);
 fs.unlinkSync(path.join(root,'link'));fs.symlinkSync('2.bin',path.join(root,'link'));
 fs.writeFileSync(path.join(child,'nested'),'changed nested');
 const after=observer.snapshot(root);
 assert.deepEqual(after,intakeSnapshot(root),'memo must preserve ordinary byte snapshot including ignored files and child repositories');
 assert.equal(after.files['0.bin'].digest,digest('new'));
 assert.equal(after.files['ignored.bin'].digest,digest('changed'));
 assert.equal(after.files['2.bin'].mode & 0o777,0o755);
 assert.equal(after.files.link.digest,digest('2.bin'));
 assert.equal(after.files.child.files.files.nested.digest,digest('changed nested'));
 assert.deepEqual(after.files['1.bin'],before.files['1.bin']);
 assert.throws(()=>fileDigest(path.join(root,'absent')),error=>error.code==='ENOENT');
});
test('run-local memo avoids unchanged byte reads but invalidates same-size rewrites with restored mtime',t=>{
 const {root}=fixture(t),file=path.join(root,'CONTEXT.md'),observer=createIntakeSnapshotObserver();
 const before=observer.snapshot(root),hashed=observer.metrics.hashed_files,bytes=observer.metrics.hashed_bytes;
 assert.deepEqual(observer.snapshot(root),before);
 assert.equal(observer.metrics.hashed_files,hashed);assert.equal(observer.metrics.hashed_bytes,bytes);
 assert.equal(observer.metrics.reused_files,hashed);
 const stat=fs.statSync(file),content=fs.readFileSync(file);content[0]^=1;
 fs.writeFileSync(file,content);fs.utimesSync(file,stat.atime,stat.mtime);
 const after=observer.snapshot(root);
 assert.notDeepEqual(after,before);assert.deepEqual(after,intakeSnapshot(root));
 assert.equal(observer.metrics.hashed_files,hashed+1);
 const separate=createIntakeSnapshotObserver();separate.snapshot(root);
 assert.equal(separate.metrics.hashed_files,hashed,'new observer starts with fresh reads');
 const strict=createIntakeSnapshotObserver({reuseUnchanged:false});strict.snapshot(root);strict.snapshot(root);
 assert.equal(strict.metrics.hashed_files,hashed*2);assert.equal(strict.metrics.reused_files,0);
});
test('metadata-only changes and identical-byte replacements preserve byte identity',t=>{
 const {root}=fixture(t),file=path.join(root,'CONTEXT.md'),observer=createIntakeSnapshotObserver();
 const before=observer.snapshot(root),bytes=fs.readFileSync(file);
 fs.utimesSync(file,new Date(),new Date(Date.now()+10000));
 assert.deepEqual(observer.snapshot(root),before);
 const replacement=path.join(root,'replacement');fs.writeFileSync(replacement,bytes);fs.renameSync(replacement,file);
 assert.deepEqual(observer.snapshot(root),before);
 fs.unlinkSync(file);assert.notDeepEqual(observer.snapshot(root),before);
 fs.writeFileSync(file,bytes);assert.deepEqual(observer.snapshot(root),before);
 assert.equal(observer.metrics.reused_files,4);
});
for (const [mode, snapshot] of [
 ['memo', root=>createIntakeSnapshotObserver().snapshot(root)],
 ['fresh observer', root=>createIntakeSnapshotObserver({reuseUnchanged:false}).snapshot(root)],
 ['independent snapshot', root=>intakeSnapshot(root)],
]) test(`a file changing during its first digest is rejected by ${mode}`,t=>{
 const {root}=fixture(t),file=path.join(root,'CONTEXT.md'),original=fs.readSync;
 let changed=false;
 t.mock.method(fs,'readSync',(...args)=>{
  const count=original(...args);
  if(count&&!changed){changed=true;fs.appendFileSync(file,'change');}
  return count;
 });
 assert.throws(()=>snapshot(root),/读取期间文件变化/);
});
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
test('read-only intake can explicitly use fresh bytes for unreliable metadata',async t=>{
 const {temp,root,task}=fixture(t),runDir=path.join(temp,'fresh');
 const result=await observeReadOnlyIntake(task,{root,runDir,reuseUnchanged:false});
 const observation=JSON.parse(fs.readFileSync(path.join(runDir,'observation.json'),'utf8'));
 assert.equal(observation.input_observation_metrics.method,'fresh-bytes');
 assert.equal(observation.input_observation_metrics.snapshots,2);
 assert.equal(observation.input_observation_metrics.reused_files,0);
 assert.equal(validateTaskPackage(result,{root,runDir}),result);
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
