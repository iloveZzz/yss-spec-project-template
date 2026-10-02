import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runCommand, runCommandSync } from '../.template-source/cli-core/command-runner.mjs';
import { runCommandToFiles, runGroups } from '../scripts/lib/template-verification-runner.mjs';
import { beginRuntimeRun } from '../.template-source/cli-core/runtime-store.mjs';
import { observeReadOnlyIntake } from '../scripts/lib/read-only-intake.mjs';
import { generateTaskPackageDefaults, validateTaskPackage } from '../scripts/lib/task-package.mjs';

function fixture(t) {
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'yss-runtime-integration-'));
  t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  const root=path.join(base,'repo');fs.mkdirSync(root);
  assert.equal(spawnSync('git',['init','-q',root]).status,0);
  fs.writeFileSync(path.join(root,'yss-project.yaml'),'schema_version: 1\nrepository_mode: template-source\n');
  fs.writeFileSync(path.join(root,'CONTEXT.md'),'只读研究\n');
  return {base,root};
}
const stubSession=runDir=>({runDir,rows:[],recordCommand(row){this.rows.push(row);}});
let scriptSequence = 0;
function nodeCommand(directory, source, args = []) {
  const script = path.join(directory, `command-fixture-${scriptSequence++}.cjs`);
  fs.writeFileSync(script, source);
  const quote = value => process.platform === 'win32' ? `"${value.replaceAll('"', '""')}"` : `'${value.replaceAll("'", "'\\''")}'`;
  return [process.execPath, script, ...args].map(quote).join(' ');
}
async function waitFor(predicate, timeout = 5000) {
  const started = performance.now();
  while (!predicate()) {
    if (performance.now() - started > timeout) throw Error('process observation timeout');
    await new Promise(resolve => setTimeout(resolve, 25));
  }
}

test('shared async and sync runners record redacted results without changing actual exits',async t=>{
  const {base}=fixture(t),session=stubSession(base);
  const code='console.log(process.env.TEST_TOKEN);process.exit(7)';
  const result=await runCommand(process.execPath,['-e',code],{env:{...process.env,TEST_TOKEN:'secret-value'},runtimeSession:session});
  assert.equal(result.status,7);assert.equal(result.stdout,'[REDACTED:TEST_TOKEN]\n');
  assert.equal(result.actual_exit_code,7);assert.equal(result.actual_exit_code_observed,true);
  assert.equal(session.rows[0].status,7);assert.equal(session.rows[0].stdout,undefined);
  assert.equal(fs.readFileSync(session.rows[0].stdoutFile,'utf8'),result.stdout);
  const sync=runCommandSync(process.execPath,['-e','console.log("secret-value");process.exit(9)'],{secrets:['secret-value'],runtimeSession:session});
  assert.equal(sync.status,9);assert.equal(sync.stdout,'[REDACTED]\n');
  assert.equal(sync.actual_exit_code,9);assert.equal(sync.actual_exit_code_observed,true);assert.equal(session.rows[1].actual_exit_code,9);
  assert.equal(session.rows[1].status,9);assert.ok(!JSON.stringify(session.rows).includes('secret-value'));
});

test('registration errors retain command exit and logs, and timeout/cancellation keep runner semantics',async t=>{
  const {base}=fixture(t),session={runDir:base,recordCommand(){throw Error('locked storage');}};
  const result=await runCommand(process.execPath,['-e','console.log("once");process.exit(6)'],{runtimeSession:session});
  assert.equal(result.status,6);assert.match(result.storageError,/locked storage/);
  assert.equal(fs.readFileSync(path.join(base,'command-0.stdout'),'utf8'),'once\n');
  const timeout=await runCommand(process.execPath,['-e','setInterval(()=>{},100)'],{timeoutMs:50,runtimeSession:session});
  assert.equal(timeout.status,124);assert.equal(timeout.termination,'timeout');
  if(process.platform!=='win32'){assert.equal(timeout.actual_exit_code,null);assert.equal(timeout.actual_exit_code_observed,false);assert.match(timeout.actual_exit_signal,/^SIG(?:TERM|KILL)$/);}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),50);
  try {const cancelled=await runCommand(process.execPath,['-e','setInterval(()=>{},100)'],{signal:controller.signal,runtimeSession:session});assert.equal(cancelled.status,1);assert.equal(cancelled.termination,'cancelled');}finally{clearTimeout(timer);}
});

test('template runner registration preserves failed command and shared execution reuse',async t=>{
  const {base}=fixture(t),session=stubSession(base);
  const result=await runCommandToFiles(nodeCommand(base,'process.exit(5)'),{cwd:base,logRoot:base,sequence:0,runtimeSession:session});
  assert.equal(result.code,5);assert.equal(session.rows[0].exit_code,5);
  const plan={groups:['a','b'],commands:[{id:'a',group:'a',command:'same'},{id:'b',group:'b',command:'same'}]};
  let calls=0;
  const groups=await runGroups(plan,'template-source',2,{cwd:base,logRoot:base,runtimeSession:session,execute:async(command,options)=>{calls++;assert.equal(options.runtimeSession,session);return{command,code:0,duration_ms:1};}});
  assert.equal(calls,1);assert.equal(groups.flatMap(x=>x.results).filter(x=>x.reused).length,1);
  const failedSession={recordCommand(){throw Error('broken DB');}};
  const preserved=await runCommandToFiles(nodeCommand(base,'process.exit(8)'),{cwd:base,logRoot:base,sequence:1,runtimeSession:failedSession});
  assert.equal(preserved.code,8);assert.match(preserved.storageError,/broken DB/);
  const normal130=await runCommandToFiles(nodeCommand(base,'process.exit(130)'),{cwd:base,logRoot:base,sequence:2,runtimeSession:session});
  assert.equal(normal130.code,130);assert.equal(normal130.termination,null);assert.equal(normal130.actual_exit_code,130);assert.equal(normal130.actual_exit_code_observed,true);assert.equal(session.rows.at(-1).termination,null);
});

test('SQLite session records actual command and keeps ordinary terminal logs outside source tree',async t=>{
  const {base,root}=fixture(t);
  const session=beginRuntimeRun({root,kind:'integration-test',home:path.join(base,'runtime'),input:{fixed:'input'}});
  try {
    const result=await runCommand(process.execPath,['-e','console.log("stored")'],{cwd:root,runtimeSession:session});
    session.registerFiles(session.runDir);session.finish({status:'passed',exitCode:result.status,report:{kind:'integration-test',result}});
    assert.equal(result.status,0);assert.ok(!session.runDir.startsWith(root+path.sep));
    assert.equal(fs.readFileSync(path.join(session.runDir,'command-0.stdout'),'utf8'),'stored\n');
    assert.ok(fs.existsSync(path.join(session.runDir,'report.json')));
  } finally {session.close();}
});

test('group results commit commands and events atomically, preserve reuse and never repeat failed registration',async t=>{
  const {base,root}=fixture(t),session=beginRuntimeRun({root,kind:'atomic-group-test',home:path.join(base,'runtime')});
  try {
    const counter=path.join(base,'executed.txt');
    const command=nodeCommand(base,`require('node:fs').appendFileSync(${JSON.stringify(counter)},'once\\n');console.log('atomic-log')`);
    const groups=await runGroups({groups:['a','b'],commands:[{id:'a',group:'a',command},{id:'b',group:'b',command}]},'template-source',2,{cwd:root,logRoot:session.runDir,runtimeSession:session,runtimeEvent:'check-result'});
    assert.equal(groups.flatMap(group=>group.results).filter(row=>row.reused).length,1);
    assert.equal(fs.readFileSync(counter,'utf8'),'once\n');
    assert.equal(session.store.db.prepare('SELECT count(*) AS n FROM commands').get().n,1);
    assert.equal(session.store.db.prepare("SELECT count(*) AS n FROM events WHERE type='check-result'").get().n,2);
    const events=session.store.db.prepare('SELECT value_json FROM events').all().map(row=>JSON.parse(row.value_json));
    assert.deepEqual(events.map(row=>row.command_id),['a','a']);assert.ok(events.every(row=>!('command' in row)&&!('stdoutFile' in row)&&!('stderrFile' in row)));
    assert.equal(session.store.db.prepare('SELECT count(*) AS n FROM run_files').get().n,2);
    session.store.db.exec(`CREATE TRIGGER fail_event BEFORE INSERT ON events WHEN NEW.type='fail-result' AND instr(NEW.value_json,'"reused":false')>0 BEGIN SELECT RAISE(ABORT,'injected event failure'); END`);
    const failedCommand=nodeCommand(base,`require('node:fs').appendFileSync(${JSON.stringify(counter)},'failed-once\\n');console.log('retained');process.exit(7)`);
    const failed=await runGroups({groups:['failure','reuse'],commands:[{id:'fail',group:'failure',command:failedCommand},{id:'never',group:'failure',command:'must-not-execute'},{id:'reused-fail',group:'reuse',command:failedCommand}]},'template-source',2,{cwd:root,logRoot:path.join(session.runDir,'failure'),runtimeSession:session,runtimeEvent:'fail-result'});
    const row=failed[0].results[0];
    assert.equal(failed[0].results.length,1);assert.equal(row.code,7);assert.equal(row.actual_exit_code,7);assert.match(row.storageError,/injected event failure/);
    assert.equal(fs.readFileSync(counter,'utf8'),'once\nfailed-once\n');assert.equal(fs.readFileSync(row.stdoutFile,'utf8'),'retained\n');
    assert.equal(session.store.db.prepare('SELECT count(*) AS n FROM commands').get().n,1);
    assert.equal(session.store.db.prepare('SELECT count(*) AS n FROM events').get().n,3);
    const failedEvent=JSON.parse(session.store.db.prepare("SELECT value_json FROM events WHERE type='fail-result'").get().value_json);
    assert.equal(failedEvent.reused,true);assert.equal(failedEvent.command,failedCommand);assert.equal(failedEvent.stdoutFile,row.stdoutFile);assert.match(failedEvent.storageError,/injected event failure/);assert.equal('command_id' in failedEvent,false);
    session.finish({status:'failed',exitCode:row.code,report:{groups,failed}});
  } finally {session.close();}
});

test('read-only intake SQLite preserves original run: evidence and repository observation',async t=>{
  const {base,root}=fixture(t),home=path.join(base,'runtime'),runDir=path.join(base,'evidence');
  const prior=process.env.YSS_RUNTIME_HOME;process.env.YSS_RUNTIME_HOME=home;t.after(()=>{if(prior===undefined)delete process.env.YSS_RUNTIME_HOME;else process.env.YSS_RUNTIME_HOME=prior;});
  const task=generateTaskPackageDefaults('role.requirements-manager',{
    schema_version:2,task_id:'sqlite-intake-test',work_unit_id:'work-unit.entry-triage',actor_id:'researcher',runtime_id:'runtime.generic',execution_state:'Explorer',workflow_status:'active',
    contract:{kind:'read-only-intake',contract_id:'intake-contract',contract_version:1,status:'issued',contract_ref:'CONTEXT.md'},
    inputs:['CONTEXT.md'],objective:'只读研究',allowed_write_paths:[],forbidden_actions:['写入仓库'],expected_outputs:['来源和结论'],expected_evidence_files:[],verification_commands:[],verification_results:[],verification_status:'not-executed',downstream_consumers:['root'],convergence:{parent_work_unit:'work-unit.entry-triage',convergence_ref:'chat-root'}
  });
  const result=await observeReadOnlyIntake(task,{root,runDir,runtimeStore:'sqlite',command:process.execPath,args:['-e','console.log("observed")']});
  assert.equal(result.workflow_status,'resolved');assert.equal(result.verification_results[0].evidence_ref,'run:execution.json');
  assert.equal(validateTaskPackage(result,{root,runDir}),result);
});

test('verification plan does not create runtime database or requested report directory',t=>{
  const {base}=fixture(t),home=path.join(base,'runtime'),reportDir=path.join(base,'reports');
  const script=path.resolve(import.meta.dirname,'../scripts/run-template-verification');
  const result=spawnSync(process.execPath,[script,'--profile','fast','--changed-file','README.md','--plan','--json','--runtime-store','sqlite','--report-dir',reportDir],{encoding:'utf8',env:{...process.env,YSS_RUNTIME_HOME:home}});
  assert.equal(result.status,0,result.stderr);assert.ok(JSON.parse(result.stdout).commands);
  assert.equal(fs.existsSync(reportDir),false);assert.equal(fs.existsSync(home),false);
});

test('template streams and registered commands redact environment secrets, including split chunks',async t=>{
  const {base}=fixture(t),session=stubSession(base),secret='chunked-secret-token';
  const script='process.stdout.write(process.env.TEST_TOKEN.slice(0,7));setTimeout(()=>process.stdout.write(process.env.TEST_TOKEN.slice(7)),10)';
  const command=nodeCommand(base,script);
  const result=await runCommandToFiles(command,{cwd:base,environment:{...process.env,TEST_TOKEN:secret},logRoot:base,sequence:10,runtimeSession:session});
  assert.equal(result.code,0);assert.equal(fs.readFileSync(result.stdoutFile,'utf8'),'[REDACTED]');
  assert.ok(!JSON.stringify(session.rows).includes(secret));
  const withLiteral=nodeCommand(base,'console.log(process.argv[2])',[secret]);
  const literal=await runCommandToFiles(withLiteral,{cwd:base,environment:{...process.env,TEST_TOKEN:secret},logRoot:base,sequence:11,runtimeSession:session});
  assert.ok(!literal.command.includes(secret));assert.ok(!JSON.stringify(session.rows).includes(secret));
  const controller=new AbortController(),events=[];session.recordEvent=(type,value)=>events.push({type,value});
  const cancelled=await runGroups({groups:['owner','waiting'],commands:[{id:'owner',group:'owner',command:'first',resources:['one']},{id:'waiting',group:'waiting',command:withLiteral,resources:['one']}]},'template-source',2,{
    cwd:base,environment:{...process.env,TEST_TOKEN:secret},runtimeSession:session,runtimeEvent:'check-result',signal:controller.signal,
    execute:async command=>{assert.equal(command,'first');await new Promise(resolve=>setTimeout(resolve,20));controller.abort();return{command,code:0,duration_ms:20};}
  });
  const skipped=cancelled.flatMap(group=>group.results).find(row=>row.skipped);
  assert.ok(skipped);assert.equal(skipped.actual_exit_code_observed,false);
  assert.ok(!JSON.stringify({cancelled,events,rows:session.rows}).includes(secret));
});

test('disk write errors retain the actual exit and report incomplete logs',async t=>{
  const {base,root}=fixture(t);
  const template=await runCommandToFiles(nodeCommand(base,'process.exit(11)'),{cwd:root,logRoot:base,sequence:'missing/12'});
  assert.equal(template.code,11);assert.ok(template.storageError);
  const directory=path.join(base,'logs');fs.mkdirSync(directory);
  const session=stubSession(directory);
  const result=await runCommand(process.execPath,['-e',`require('fs').rmSync(${JSON.stringify(directory)},{recursive:true});console.log('preserved');process.exit(13)`],{cwd:root,runtimeSession:session});
  assert.equal(result.status,13);assert.equal(result.stdout,'preserved\n');assert.ok(result.storageError);
});

test('pre-cancelled commands do not execute and are registered without changing cancellation semantics',async t=>{
  const {base}=fixture(t),session=stubSession(base),controller=new AbortController();controller.abort();
  const result=await runCommand(process.execPath,['-e',`require('fs').writeFileSync(${JSON.stringify(path.join(base,'must-not-exist'))},'bad')`],{signal:controller.signal,runtimeSession:session});
  assert.equal(result.status,1);assert.equal(result.termination,'cancelled');assert.equal(session.rows.length,1);
  const template=await runCommandToFiles('must-not-execute',{signal:controller.signal,logRoot:base,sequence:1,runtimeSession:session});
  assert.equal(template.code,130);assert.equal(template.skipped,true);assert.equal(session.rows.length,2);
  assert.equal(template.actual_exit_code,null);assert.equal(template.actual_exit_code_observed,false);
  assert.equal(fs.existsSync(path.join(base,'must-not-exist')),false);
});

test('template cancellation closes descendant processes and inherited log pipes',async t=>{
  const {base}=fixture(t),session=stubSession(base),controller=new AbortController();
  const ready=path.join(base,'descendant-ready.json');
  const childSource=`require('node:fs').writeFileSync(${JSON.stringify(ready)},JSON.stringify({pid:process.pid}));setInterval(()=>{},1000)`;
  const parentSource=`require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(childSource)}],{stdio:'inherit'});setInterval(()=>{},1000)`;
  const pending=runCommandToFiles(nodeCommand(base,parentSource),{cwd:base,logRoot:base,sequence:50,signal:controller.signal,runtimeSession:session});
  let pid,timeout;
  const alive=()=>{try{process.kill(pid,0);return true;}catch(error){if(error.code==='ESRCH')return false;throw error;}};
  try {
    await waitFor(()=>fs.existsSync(ready));pid=JSON.parse(fs.readFileSync(ready,'utf8')).pid;
    controller.abort();
    const result=await Promise.race([pending,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('cancelled logs stayed open')),5000);})]);
    assert.equal(result.code,130);assert.equal(session.rows[0].termination,'cancelled');
    await waitFor(()=>!alive());
  } finally {
    clearTimeout(timeout);controller.abort();
    if(pid&&alive())process.kill(pid,'SIGKILL');
  }
});

test('project-ci optional SQLite registration preserves stdout JSON and original check exit',t=>{
  const {base,root}=fixture(t),script=path.resolve(import.meta.dirname,'../scripts/project-ci'),home=path.join(base,'runtime');
  const env={...process.env,YSS_RUNTIME_HOME:home};
  const off=spawnSync(process.execPath,[script,'check','--root',root,'--json','--runtime-store','off'],{encoding:'utf8',env});
  assert.equal(fs.existsSync(home),false);
  const sqlite=spawnSync(process.execPath,[script,'check','--root',root,'--json','--runtime-store','sqlite'],{encoding:'utf8',env});
  assert.equal(sqlite.status,off.status,sqlite.stderr);assert.deepEqual(JSON.parse(sqlite.stdout),JSON.parse(off.stdout));
  assert.ok(fs.existsSync(home));
});

test('template cancellation closes log pipes after the parent has exited',async t=>{
  const {base}=fixture(t),controller=new AbortController();
  const ready=path.join(base,'orphan-ready.json'),parentReady=path.join(base,'parent-ready.json');
  const childSource=`const fs=require('node:fs'),ready=${JSON.stringify(ready)};fs.writeFileSync(ready+'.tmp',JSON.stringify({pid:process.pid}));fs.renameSync(ready+'.tmp',ready);setTimeout(()=>process.exit(0),15000);setInterval(()=>{},1000)`;
  const parentSource=`const fs=require('node:fs'),ready=${JSON.stringify(parentReady)};fs.writeFileSync(ready+'.tmp',JSON.stringify({pid:process.pid}));fs.renameSync(ready+'.tmp',ready);require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(childSource)}],{stdio:'inherit'});process.exit(0)`;
  const pending=runCommandToFiles(nodeCommand(base,parentSource),{cwd:base,logRoot:base,sequence:51,signal:controller.signal});
  let pid,timeout;
  const alive=processId=>{try{process.kill(processId,0);return true;}catch(error){if(error.code==='ESRCH')return false;throw error;}};
  try {
    await waitFor(()=>fs.existsSync(ready)&&fs.existsSync(parentReady));
    pid=JSON.parse(fs.readFileSync(ready,'utf8')).pid;
    const parentPid=JSON.parse(fs.readFileSync(parentReady,'utf8')).pid;
    await waitFor(()=>!alive(parentPid));
    assert.equal(alive(pid),true,'descendant must still hold the inherited pipes');
    controller.abort();
    const result=await Promise.race([pending,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('orphaned descendant kept cancelled logs open')),5000);})]);
    assert.equal(result.code,130);
    assert.equal(result.actual_exit_code,0);assert.equal(result.actual_exit_code_observed,true);
    await waitFor(()=>!alive(pid));
  } finally {
    clearTimeout(timeout);controller.abort();
    // A failed platform regression must not leave this test's owned process alive.
    let cleanupError,cleanupTimeout;
    if(pid&&alive(pid)) {
      if(process.platform==='win32') {
        const cleanup=spawnSync('taskkill',['/PID',String(pid),'/T','/F'],{windowsHide:true,encoding:'utf8',timeout:2000});
        if((cleanup.error||cleanup.status!==0)&&alive(pid))cleanupError=Error(`owned descendant cleanup failed: ${cleanup.error?.message||cleanup.stderr||cleanup.status}`);
      } else try {process.kill(pid,'SIGKILL');}catch(error){if(error.code!=='ESRCH')cleanupError=error;}
    }
    try {
      await Promise.race([pending,new Promise((_,reject)=>{cleanupTimeout=setTimeout(()=>reject(Error('test cleanup did not close log pipes')),2000);})]);
      if(cleanupError)throw cleanupError;
    } finally {clearTimeout(cleanupTimeout);}
  }
});
