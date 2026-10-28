import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {runGroups} from '../scripts/lib/template-verification-runner.mjs';
import {createVerificationReport,finalizeVerificationReport,saveVerificationReport,verificationInputDigest,createVerificationInputObserver} from '../scripts/lib/verification-report.mjs';
import {intakeSnapshot} from '../scripts/lib/read-only-intake.mjs';
test('actual logs, deduplication, failures and wall time are distinct',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'report-'));const commands=[{group:'a',command:'node -e "console.log(123)"'},{group:'b',command:'node -e "console.log(123)"'},{group:'a',command:'node -e "process.exit(7)"'},{group:'a',command:'node -e "process.exit(99)"'},{group:'b',command:'ignored',when:'project-instance'}];
 const plan={groups:['a','b'],commands,selection:{omitted:[],effective:'shadow'}};const report=createVerificationReport(plan,{root:dir,inputDigest:'x',concurrency:2,scope:{kind:'limited'}});
 try{await runGroups(plan,'template-source',2,{cwd:dir,logRoot:dir,onResult:row=>{report.results.push(row);saveVerificationReport(dir,report);assert.ok(JSON.parse(fs.readFileSync(path.join(dir,'report.json'))).metrics.unique_commands>0,'partial reports must preserve observed execution counts');}});finalizeVerificationReport(report,{status:'failed',wallMs:123,repositoryMode:'template-source'});saveVerificationReport(dir,report);
 const saved=JSON.parse(fs.readFileSync(path.join(dir,'report.json')));assert.equal(saved.metrics.unique_commands,2);assert.equal(saved.metrics.reused_commands,1);assert.equal(saved.metrics.wall_ms,123);assert.equal(saved.metrics.runtime_tokens,null);assert.equal(saved.results.find(x=>x.code===7).code,7);assert.deepEqual(saved.unexecuted.map(x=>x.reason),['failure-or-interruption']);assert.deepEqual(saved.not_applicable.map(x=>({command:x.command,reason:x.reason})),[{command:'ignored',reason:'repository-mode'}]);assert.equal(saved.environment.repository_mode,'template-source');assert.ok(saved.metrics.output_bytes>0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('interruption preserves partial execution and marks remaining checks',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cancel-')),controller=new AbortController();const plan={groups:['a'],commands:[{group:'a',command:'node -e "setTimeout(()=>{},10000)"'},{group:'a',command:'never'}],selection:{omitted:[],effective:'shadow'}};const report=createVerificationReport(plan,{root:dir});const timer=setTimeout(()=>controller.abort(),100);
 try{await runGroups(plan,'template-source',1,{cwd:dir,logRoot:dir,signal:controller.signal,onResult:r=>report.results.push(r)});finalizeVerificationReport(report,{status:'interrupted',wallMs:100,repositoryMode:'template-source'});assert.equal(report.results[0].code,130);assert.equal(report.unexecuted.length,1);}finally{clearTimeout(timer);fs.rmSync(dir,{recursive:true,force:true});}
});
test('verification ignores only Git-ignored tool state and still detects source drift',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'verification-input-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,stdio:'pipe'});
 const write=(ref,content)=>{fs.mkdirSync(path.dirname(path.join(root,ref)),{recursive:true});fs.writeFileSync(path.join(root,ref),content);};
 try{
  git('init','-q');git('config','user.email','fixture@example.invalid');git('config','user.name','fixture');
  write('.gitignore','.codegraph/\n.idea/\n*.ignored\n');write('source.js','current');git('add','.');git('commit','-qm','fixture');
  write('.codegraph/codegraph.db','index-1');write('.idea/workspace.xml','ide-1');write('authority.ignored','authority-1');write('new-source.js','new-1');
  const observer=createVerificationInputObserver(root),before=observer.digest(),intakeBefore=intakeSnapshot(root);
  assert.equal(before,verificationInputDigest(root));
  write('.codegraph/codegraph.db','index-2');write('.idea/workspace.xml','ide-2');
  assert.equal(observer.digest(),before);assert.notDeepEqual(intakeSnapshot(root),intakeBefore,'ordinary read-only intake still observes ignored tool files');
  write('authority.ignored','authority-2');const authorityChanged=observer.digest();assert.notEqual(authorityChanged,before);assert.equal(authorityChanged,verificationInputDigest(root));
  write('new-source.js','new-2');assert.notEqual(observer.digest(),authorityChanged);
  write('.codegraph/tracked.json','tracked-1');git('add','-f','.codegraph/tracked.json');git('commit','-qm','tracked tool source');
  const trackedBefore=observer.digest();write('.codegraph/tracked.json','tracked-2');assert.notEqual(observer.digest(),trackedBefore);
  const sourceBefore=observer.digest();git('add','new-source.js');assert.notEqual(observer.digest(),sourceBefore,'index changes invalidate input identity even if file bytes are unchanged');
  const indexBefore=observer.digest();git('commit','-qm','index change');assert.notEqual(observer.digest(),indexBefore,'HEAD changes invalidate input identity');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('成功终端分开门禁、语法及其他任务并显示真实 wall time',async()=>{
 const {formatVerificationSummary}=await import('../scripts/lib/verification-report.mjs');
 const report={plan:{commands:[{id:'a'},{id:'b',kind:'syntax'},{id:'c',kind:'syntax'},{id:'d',kind:'preflight'}]},gate_results:[{status:'passed'},{status:'passed'}],metrics:{wall_ms:1234}};
 assert.match(formatVerificationSummary(report),/逻辑检查 1 项（2 个门禁）.*语法检查 2 项.*其他任务 1 项.*1\.23 秒/);
});
test('成功日志只留原始文件，失败日志仍回放到终端',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'summary-logs-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const ok=path.join(dir,'ok'),bad=path.join(dir,'bad');fs.writeFileSync(ok,'SUCCESS-RAW-ONLY');fs.writeFileSync(bad,'FAILURE-VISIBLE');
 const runner=path.resolve('scripts/lib/template-verification-runner.mjs');
 const output=execFileSync(process.execPath,['--input-type=module','-e',`import {printResults} from ${JSON.stringify(runner)};await printResults([{group:'checks',results:[{code:0,command:'success',stdoutFile:${JSON.stringify(ok)}},{code:7,command:'failure',stdoutFile:${JSON.stringify(bad)}}]}]);`],{encoding:'utf8'});
 assert.ok(!output.includes('SUCCESS-RAW-ONLY'));assert.ok(output.includes('FAILURE-VISIBLE'));assert.equal(fs.readFileSync(ok,'utf8'),'SUCCESS-RAW-ONLY');
});
