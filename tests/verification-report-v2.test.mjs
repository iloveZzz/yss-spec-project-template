import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createVerificationReport, finalizeVerificationReport,saveVerificationReport,verificationInputDigest } from '../scripts/lib/verification-report.mjs';
import {collectReleaseSources} from '../.template-source/scripts/lib/verification-artifacts.mjs';
import {platformKey} from '../.template-source/scripts/lib/yss-cli-pin.mjs';
import { validateVerificationReport,validateLegacyReport,compileExpectedVerificationPlan,validateBaselineReport,assertNativeMigrationCommands } from '../.template-source/scripts/lib/verification-report-validator.mjs';
import {addVerificationExecutionTasks,compileTaskExecution} from '../.template-source/scripts/lib/verification-execution-plan.mjs';
import {validateJsonSchema} from '../scripts/lib/json-schema.mjs';
import {validateMaintenanceVerificationEvidence} from '../scripts/lib/maintenance-intensity.mjs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {ROOT} from '../scripts/lib/template-verification.mjs';

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'verification-v2-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const plan = { effective_profile: 'release', source_requirement: 'committed', strategy: 'release', selection: {effective: 'legacy', omitted: []}, policy_digest: 'a'.repeat(64), gates: [{id: 'G04', selected: true, check_ids: ['check.syntax']}], commands: [{id: 'check.syntax', task_id: 'syntax.0', command: 'node --check source.mjs', gate_ids: ['G04']}] };
  const invocation = {command: 'scripts/verify-template', args: ['--report-dir', directory]};
  const report = createVerificationReport(plan, {root: directory, inputDigest: 'b'.repeat(64), scope: {kind: 'complete-candidate'}, concurrency: 1, invocation});
  const stdoutFile = path.join(directory, 'stdout.log'), stderrFile = path.join(directory, 'stderr.log');
  fs.writeFileSync(stdoutFile, 'parsed\n'); fs.writeFileSync(stderrFile, '');
  report.results.push({index: 0, ...plan.commands[0], code: 0, actual_exit_code: 0, actual_exit_signal: null, actual_exit_code_observed: true, stdoutFile, stderrFile,log_digests:{stdoutFile:createHash('sha256').update(fs.readFileSync(stdoutFile)).digest('hex'),stderrFile:createHash('sha256').update(fs.readFileSync(stderrFile)).digest('hex')}, duration_ms: 1});
  finalizeVerificationReport(report, {status: 'passed', wallMs: 1, repositoryMode: 'template-source'});
  report.input_after_sha256 = report.input_sha256; report.input_drift = false;
  report.final_exit = {code: 0, signal: null, observed: true};
 const sources={kind:'template-release-sources',families:['spec'],entries:[{namespace:'candidate-release',family:'spec',cli_commit:'1'.repeat(40),template_commit:'2'.repeat(40),core_commit:'3'.repeat(40),package_name:'yss',version:'1.0.0',template_version:'git:'+'2'.repeat(40),source_contract_version:2,protocol_version:1,snapshot_hash:'4'.repeat(64),manifest_hash:'5'.repeat(64),bundle_hash:'6'.repeat(64),binary_sha256:'7'.repeat(64)}]};
  report.sources_manifest=structuredClone(sources);
  const options = {expectedSourcesManifest:sources, root: directory, reportDirectory: directory, expectedPlan: plan, expectedInvocation: invocation, currentInputDigest: report.input_sha256, observedExitCode: 0};
  return {directory, plan, report, options};
}

test('原生发行集成消费现役 sync 升级与回滚轨迹，缺任何实际阶段均拒绝',()=>{
 const calls=[
  {args:['sync','--plan']},{args:['sync','--apply']},
  {args:['sync','--plan']},{args:['sync','--apply']},
  {args:['sync','--plan']},{args:['rollback','--apply']},
 ];
 assert.doesNotThrow(()=>assertNativeMigrationCommands(calls));
 for(let index=0;index<calls.length;index++)assert.throws(()=>assertNativeMigrationCommands(calls.filter((_,i)=>i!==index)),/原生迁移/);
 assert.throws(()=>assertNativeMigrationCommands([...calls.slice(0,-1),{args:['rollback','--plan']}]),/原生迁移/);
 assert.throws(()=>assertNativeMigrationCommands([{args:['migrate','plan']},{args:['migrate','plan']},{args:['migrate','apply']},{args:['migrate','rollback']}]),/原生迁移/);
});

test('完整 v2 报告按独立期望台账核验', t => {
  const f = fixture(t);
  assert.equal(f.report.schema_version, 2);
  assert.equal(validateVerificationReport(f.report, f.options).status, 'passed');
  f.report.plan.commands = []; f.report.results = [];
  assert.throws(() => validateVerificationReport(f.report, f.options), /任务|task/);
});

test('历史 v1 日志必须逐项绑定摘要且拒绝篡改',t=>{
 const f=fixture(t),report=structuredClone(f.report);report.schema_version=1;report.plan.syntax_files=[];
 const original=report.results[0];report.results.push({...original,index:1,group:'postchecks',command:JSON.stringify(['git','diff','--check'])});
 const options={directory:f.directory,expectedPlan:{commands:f.plan.commands,syntax_files:[]}};
 assert.doesNotThrow(()=>validateLegacyReport(report,options));
 for(const mutate of [r=>delete r.results[0].log_digests,r=>delete r.results[1].log_digests.stderrFile,r=>r.results[0].log_digests.stdoutFile='f'.repeat(64)]){
  const changed=structuredClone(report);mutate(changed);assert.throws(()=>validateLegacyReport(changed,options),/摘要/);
 }
});
test('必跑责任报告按独立编译任务拒绝漏项、丢 Gate 和执行篡改',t=>{
 const f=fixture(t),head=spawnSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).stdout.trim();
 const compiled=compileExpectedVerificationPlan({root:ROOT,args:['--profile','release','--base',head],reportDirectory:f.directory});
 const required=compiled.commands.find(row=>row.id==='check.daily-execution');assert.ok(required);assert.equal(required.source_requirement,'committed');
 // Isolate one policy-derived task in the existing synthetic report fixture.
 const task={...required,depends_on:[]};
 f.plan.commands=[task];f.plan.gates=task.gate_ids.map(id=>({id,selected:true,check_ids:[task.id]}));
 f.report.root=ROOT;f.options.root=ROOT;f.report.plan=structuredClone(f.plan);
 Object.assign(f.report.results[0],task,{actual_execution:task.execution});
 finalizeVerificationReport(f.report,{status:'passed',wallMs:1,repositoryMode:'template-source'});
 assert.equal(validateVerificationReport(f.report,f.options).status,'passed');
 for(const mutate of [
  report=>{report.plan.commands=[];report.results=[];},
  report=>report.plan.commands[0].gate_ids=[],
  report=>report.results[0].actual_execution.args=['--test','other.test.mjs'],
 ]){const report=structuredClone(f.report);mutate(report);assert.throws(()=>validateVerificationReport(report,f.options));}
});
test('日常 limited 报告不能成为正式发布证据',t=>{
 const f=fixture(t);const daily=createVerificationReport({...f.plan,requested_profile:'fast'},{root:f.directory,inputDigest:f.report.input_sha256,scope:{kind:'complete-candidate'}});
 assert.equal(daily.scope.kind,'limited');f.report.scope.kind=daily.scope.kind;
 assert.throws(()=>validateVerificationReport(f.report,f.options),/验证范围不是完整候选/);
});

test('当前报告拒绝挂靠退役源码回执与任务',t=>{
  const f=fixture(t);
  for(const mutate of [
    r=>r.source_test_receipts=[],
    r=>r.source_test_receipts=[{ref:'/old/source-test-receipt.json',sha256:'a'.repeat(64)}],
    r=>r.plan.commands[0].kind='source-test-consumer',
    r=>r.results[0].kind='source-test-consumer',
  ]){const report=structuredClone(f.report);mutate(report);assert.throws(()=>validateVerificationReport(report,f.options));}
});

test('迁移场景报告绑定当前独立映射，拒绝旧argv和自改执行tuple',t=>{
  const f=fixture(t),ref='tests/scenarios/verify-context-contract-scenarios.mjs';
  fs.mkdirSync(path.join(f.directory,'tests/scenarios'),{recursive:true});fs.writeFileSync(path.join(f.directory,ref),'console.log("mapped current source");\n');
  const task={id:'check.context',task_id:'legacy.context',command:'scripts/verify-context-contract-scenarios',gate_ids:['G04']};
  f.plan.commands=[task];f.report.plan=structuredClone(f.plan);
  const execution=compileTaskExecution(task,{root:f.report.root}),actual=spawnSync(execution.file,execution.args,{cwd:execution.cwd,encoding:'utf8'});
  assert.equal(actual.status,0,actual.stderr);
  const row=f.report.results[0];Object.assign(row,task,{actual_execution:execution});
  fs.writeFileSync(row.stdoutFile,actual.stdout);fs.writeFileSync(row.stderrFile,actual.stderr);
  row.log_digests={stdoutFile:createHash('sha256').update(actual.stdout).digest('hex'),stderrFile:createHash('sha256').update(actual.stderr).digest('hex')};
  finalizeVerificationReport(f.report,{status:'passed',wallMs:1,repositoryMode:'template-source'});
  assert.equal(validateVerificationReport(f.report,f.options).status,'passed');
  for(const mutate of [
    r=>delete r.results[0].actual_execution,
    r=>r.results[0].actual_execution.args=['scripts/verify-context-contract-scenarios'],
    r=>r.results[0].actual_execution.cwd='/other-root',
    r=>r.results[0].actual_execution.file='/other-node',
    r=>r.results[0].actual_execution.requested_command='node unapproved.mjs',
    r=>r.results[0].actual_execution.environment={NODE_OPTIONS:'--import unapproved.mjs'},
    r=>r.results[0].actual_execution.source_consumer_ref='/old/source-test-receipt.json',
    r=>r.results[0].actual_execution.source_receipt_sha256='a'.repeat(64),
  ]){const report=structuredClone(f.report);mutate(report);assert.throws(()=>validateVerificationReport(report,f.options),/实际|argv|tuple|source_consumer_ref|source_receipt_sha256/);}
  fs.rmSync(path.join(f.directory,ref));
  assert.throws(()=>validateVerificationReport(f.report,f.options),/RETIRED_SCRIPT_TARGET_MISSING/);
});

test('G20 等待监督 close 并结合全局完整性，普通 Gate 保持独立结论',t=>{
 const f=fixture(t),id='check.verification-final-integrity';f.plan.gates.push({id,selected:true,check_ids:['check.syntax']});f.report.plan=structuredClone(f.plan);
 const gate=report=>report.gate_results.find(row=>row.id===id),ordinary=report=>report.gate_results.find(row=>row.id==='G04');
 f.report.final_exit={code:null,signal:null,observed:false};finalizeVerificationReport(f.report,{status:'passed',wallMs:1,repositoryMode:'template-source'});assert.equal(gate(f.report).status,'failed');assert.equal(ordinary(f.report).status,'passed');
 f.report.final_exit={code:0,signal:null,observed:true};saveVerificationReport(f.directory,f.report);assert.equal(gate(f.report).status,'passed');assert.equal(gate(JSON.parse(fs.readFileSync(path.join(f.directory,'report.json')))).status,'passed');
 for(const mutate of [report=>report.final_exit.code=1,report=>report.final_exit.observed=false,report=>report.final_exit.signal='SIGTERM',report=>report.status='failed',report=>report.input_drift=true,report=>report.input_after_sha256='c'.repeat(64),report=>report.results[0].actual_exit_code_observed=false]){
  const report=structuredClone(f.report);mutate(report);saveVerificationReport(f.directory,report);assert.equal(gate(report).status,'failed');assert.equal(ordinary(report).status,'passed');assert.equal(gate(JSON.parse(fs.readFileSync(path.join(f.directory,'report.json')))).status,'failed');
 }
 const missing=structuredClone(f.report);missing.plan.commands.push({id:'check.missing',task_id:'missing.0',command:'node --check missing.mjs',gate_ids:[]});missing.unexecuted=[];saveVerificationReport(f.directory,missing);assert.equal(gate(missing).status,'failed');assert.equal(ordinary(missing).status,'passed');
 finalizeVerificationReport(missing,{status:'passed',wallMs:1,repositoryMode:'template-source'});assert.equal(missing.unexecuted.length,1);assert.equal(gate(missing).status,'failed');assert.equal(ordinary(missing).status,'passed');
});

test('未执行台账包括明确跳过及缺结果，保留原因并排除已启动中断',t=>{
 const f=fixture(t),gateId='check.verification-final-integrity';
 const extra=(id)=>({id:`check.${id}`,task_id:id,command:`node --check ${id}.mjs`,gate_ids:[gateId]});
 f.report.plan.commands.push(...['cancelled','dependent','started','missing'].map(extra));
 f.report.plan.gates.push({id:gateId,selected:true,check_ids:[]});
 for(const [task_id,termination,skipped]of [['cancelled','cancelled',true],['dependent','dependency-failed',true],['started','cancelled',false]]) {
  const task=f.report.plan.commands.find(row=>row.task_id===task_id);
  f.report.results.push({...task,index:f.report.plan.commands.indexOf(task),code:130,skipped,termination,actual_exit_code:null,actual_exit_signal:skipped?null:'SIGTERM',actual_exit_code_observed:false});
 }
 const unfinalized=structuredClone(f.report);unfinalized.status='running';unfinalized.unexecuted=[];saveVerificationReport(f.directory,unfinalized);assert.deepEqual(unfinalized.unexecuted,[]);
 unfinalized.status='interrupted';unfinalized.final_exit={code:null,signal:'SIGKILL',observed:false};unfinalized.input_drift=null;
 saveVerificationReport(f.directory,unfinalized);
 const expected=[{task_id:'cancelled',reason:'cancelled'},{task_id:'dependent',reason:'dependency-failed'},{task_id:'missing',reason:'failure-or-interruption'}];
 assert.deepEqual(unfinalized.unexecuted.map(({task_id,reason})=>({task_id,reason})),expected);
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.directory,'report.json'))).unexecuted,unfinalized.unexecuted);
 finalizeVerificationReport(f.report,{status:'interrupted',wallMs:1,repositoryMode:'template-source'});
 assert.deepEqual(f.report.unexecuted.map(({task_id,reason})=>({task_id,reason})),expected);
 assert.equal(f.report.gate_results.find(row=>row.id===gateId).status,'failed');
 assert.equal(f.report.gate_results.find(row=>row.id==='G04').status,'passed');
});

test('v2 未选中项和不适用记录独立于选中未执行台账',t=>{
 const f=fixture(t),omitted={id:'check.unselected',task_id:'unselected',command:'node --check unselected.mjs',reason:'declared-inputs-unaffected'},notApplicable={gate_id:'check.unaffected',reason:'declared-inputs-unaffected'};
 f.report.plan.selection={effective:'allowlist',omitted:[omitted]};f.report.plan.not_applicable=[notApplicable];f.report.not_applicable=[notApplicable];
 finalizeVerificationReport(f.report,{status:'passed',wallMs:1,repositoryMode:'template-source'});saveVerificationReport(f.directory,f.report);
 assert.deepEqual(f.report.unexecuted,[]);assert.deepEqual(f.report.plan.selection.omitted,[omitted]);assert.deepEqual(f.report.not_applicable,[notApplicable]);
 const selected={id:'check.selected',task_id:'selected',command:'node --check selected.mjs'};f.report.plan.commands.push(selected);
 finalizeVerificationReport(f.report,{status:'failed',wallMs:1,repositoryMode:'template-source'});saveVerificationReport(f.directory,f.report);
 assert.deepEqual(f.report.unexecuted,[{...selected,reason:'failure-or-interruption'}]);assert.deepEqual(f.report.plan.selection.omitted,[omitted]);assert.deepEqual(f.report.not_applicable,[notApplicable]);
});

test('实际仓库模式排除不适用任务，未知模式不能依据自述隐藏缺项',t=>{
 const f=fixture(t),gateId='check.verification-final-integrity',outside={id:'check.product',task_id:'product',command:'node --check product.mjs',when:'project-instance',gate_ids:[gateId]};
 f.report.plan.commands.push(outside);f.report.plan.gates.push({id:gateId,selected:true,check_ids:['check.syntax',outside.id]});
 finalizeVerificationReport(f.report,{status:'passed',wallMs:1,repositoryMode:'template-source'});saveVerificationReport(f.directory,f.report);
 assert.deepEqual(f.report.unexecuted,[]);assert.deepEqual(f.report.not_applicable,[{...outside,reason:'repository-mode'}]);assert.equal(f.report.environment.repository_mode,'template-source');assert.equal(f.report.gate_results.find(row=>row.id===gateId).status,'passed');
 const withoutFinalize=structuredClone(f.report);withoutFinalize.unexecuted=[];saveVerificationReport(f.directory,withoutFinalize);assert.deepEqual(withoutFinalize.unexecuted,[]);assert.equal(withoutFinalize.gate_results.find(row=>row.id===gateId).status,'passed');
 for(const mode of [undefined,'unknown']){
  const unknown=structuredClone(f.report);unknown.environment.repository_mode=mode;unknown.unexecuted=[];
  saveVerificationReport(f.directory,unknown);assert.deepEqual(unknown.unexecuted,[{id:outside.id,task_id:outside.task_id,command:outside.command,reason:'failure-or-interruption'}]);assert.equal(unknown.gate_results.find(row=>row.id===gateId).status,'failed');
 }
});

test('真实轻量 worker 的依赖失败、中断及 SIGKILL 终态保存登记未启动任务', {timeout:20000},async t=>{
 const {executeVerificationPlan}=await import('../.template-source/scripts/lib/template-verification-worker.mjs');
 const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'report-unexecuted-worker-'))),root=path.join(directory,'root');
 t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'scripts'),{recursive:true});fs.writeFileSync(path.join(root,'scripts/repository-mode'),'console.log("template-source");\n');
 fs.mkdirSync(path.join(root,'.template-source/scripts/lib'),{recursive:true});fs.copyFileSync(new URL('../.template-source/scripts/lib/verification-preflight.mjs',import.meta.url),path.join(root,'.template-source/scripts/lib/verification-preflight.mjs'));
 for(const args of [['init','-q'],['add','.'],['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture']]){const row=spawnSync('git',args,{cwd:root,encoding:'utf8'});assert.equal(row.status,0,row.stderr);}
 const quote=value=>`'${String(value).replaceAll("'","'\\''")}'`,node=source=>`${quote(process.execPath)} -e ${quote(source)}`,gateId='check.verification-final-integrity';
 const plan=commands=>({strategy:'release',requested_profile:'diagnostic',effective_profile:'diagnostic',source_requirement:'current',required_files:[],syntax_files:[],groups:['artifact-preparation','checks'],selection:{effective:'legacy',omitted:[]},gates:[{id:gateId,selected:true,check_ids:[]}],commands:commands.map(task=>({...task,group:task.group||'checks',gate_ids:[gateId]}))});
 const schema=JSON.parse(fs.readFileSync(new URL('../.template-source/process/schemas/template-verification-report.schema.json',import.meta.url)));
 const resultRowsSchema=path.join(directory,'result-rows.schema.json');
 fs.writeFileSync(resultRowsSchema,JSON.stringify({$schema:schema.$schema,$defs:schema.$defs,...schema.properties.results}));
 const assertSkippedLogs=(outcome,taskIds)=>{
  const report=JSON.parse(fs.readFileSync(outcome.reportFile));
  assert.equal(report.purpose,'diagnostic');
  // Validate real diagnostic results against the unchanged production row contract.
  validateJsonSchema(report.results,resultRowsSchema);
  const skipped=report.results.filter(row=>row.skipped===true);
  assert.deepEqual(skipped.map(row=>row.task_id).sort(),[...taskIds].sort());
  const paths=report.results.flatMap(row=>[row.stdoutFile,row.stderrFile]);
  assert.equal(new Set(paths).size,paths.length,'phase-local sequences must not overwrite logs');
  for(const row of skipped){
   assert.notEqual(row.code,0);assert.equal(row.actual_exit_code,null);assert.equal(row.actual_exit_signal,null);assert.equal(row.actual_exit_code_observed,false);assert.equal(row.duration_ms,0);assert.equal(row.reused,false);assert.equal(row.actual_execution,undefined);
   assert.equal(report.unexecuted.find(task=>task.task_id===row.task_id)?.reason,row.termination);
   for(const key of ['stdoutFile','stderrFile']){
    assert.ok(fs.statSync(row[key]).isFile());assert.equal(fs.readFileSync(row[key],'utf8'),'');
    assert.equal(row.log_digests[key],createHash('sha256').update(fs.readFileSync(row[key])).digest('hex'));
   }
  }
 };
 const unstartedMarker=path.join(directory,'must-not-start'),unstarted=node(`require('node:fs').writeFileSync(${JSON.stringify(unstartedMarker)},'started');process.exit(99);`);
 const failed=await executeVerificationPlan({root,plan:plan([
  {id:'check.prepare-failure',task_id:'prepare-failure',kind:'artifact-prepare',group:'artifact-preparation',command:node('process.exit(7)')},
  {id:'check.prepare-dependent',task_id:'prepare-dependent',kind:'artifact-prepare',group:'artifact-preparation',command:unstarted,depends_on:['prepare-failure']},
  {id:'check.failure',task_id:'failure',command:node('process.exit(7)')},
  {id:'check.dependent',task_id:'dependent',command:unstarted,depends_on:['failure']},
  {id:'check.independent',task_id:'independent',command:node('console.log("independent")')},
 ]),reportDir:path.join(directory,'failed-report'),purpose:'diagnostic'});
 assert.equal(failed.code,1);assert.deepEqual(failed.report.unexecuted.map(({task_id,reason})=>({task_id,reason})),['prepare-dependent','dependent'].map(task_id=>({task_id,reason:'dependency-failed'})));
 assert.equal(failed.report.results.find(row=>row.task_id==='failure').actual_exit_code,7);assert.equal(failed.report.results.find(row=>row.task_id==='independent').actual_exit_code,0);assert.equal(failed.report.gate_results.find(row=>row.id===gateId).status,'failed');
 assert.equal(fs.existsSync(unstartedMarker),false);assertSkippedLogs(failed,['prepare-dependent','dependent']);
 const marker=path.join(directory,'started'),controller=new AbortController();t.after(()=>controller.abort());
 const execution=executeVerificationPlan({root,plan:plan([
  {id:'check.wait',task_id:'wait',command:node(`require('node:fs').writeFileSync(${JSON.stringify(marker)},String(process.pid));setInterval(()=>{},1000);`)},
  {id:'check.pending',task_id:'pending',command:unstarted,depends_on:['wait']},
 ]),reportDir:path.join(directory,'interrupted-report'),purpose:'diagnostic',signal:controller.signal});
 const deadline=Date.now()+10000;while(!fs.existsSync(marker)&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,10));
 assert.ok(fs.existsSync(marker),'真实 wait 任务必须先启动');controller.abort();const interrupted=await execution;
 assert.equal(interrupted.code,130);assert.equal(interrupted.report.status,'interrupted');
 assert.deepEqual(interrupted.report.unexecuted.map(({task_id,reason})=>({task_id,reason})),['pending','post.git-diff-check'].map(task_id=>({task_id,reason:'cancelled'})));
 const started=interrupted.report.results.find(row=>row.task_id==='wait');assert.notEqual(started.skipped,true);assert.equal(started.termination,'cancelled');assert.equal(started.actual_exit_code_observed,false);assert.ok(started.actual_exit_signal);
 assert.equal(interrupted.report.gate_results.find(row=>row.id===gateId).status,'failed');
 assert.equal(fs.existsSync(unstartedMarker),false);assertSkippedLogs(interrupted,['pending','post.git-diff-check']);
 const killedMarker=path.join(directory,'killed-task-pid'),forcedController=new AbortController();t.after(()=>forcedController.abort());
 const forcedExecution=executeVerificationPlan({root,plan:plan([
  {id:'check.completed',task_id:'completed',command:node('console.log("completed before kill")')},
  {id:'check.kill-wait',task_id:'kill-wait',command:node(`require('node:fs').writeFileSync(${JSON.stringify(killedMarker)},String(process.pid));setInterval(()=>{},1000);`)},
  {id:'check.kill-pending',task_id:'kill-pending',command:node('process.exit(99)'),depends_on:['kill-wait']},
 ]),reportDir:path.join(directory,'killed-report'),purpose:'diagnostic',signal:forcedController.signal});
 const killedDeadline=Date.now()+10000;while(!fs.existsSync(killedMarker)&&Date.now()<killedDeadline)await new Promise(resolve=>setTimeout(resolve,10));
 assert.ok(fs.existsSync(killedMarker));let workerPid,current=Number(fs.readFileSync(killedMarker,'utf8'));
 for(let index=0;index<10;index++){const parent=Number(spawnSync('ps',['-p',String(current),'-o','ppid='],{encoding:'utf8'}).stdout.trim());if(parent===process.pid){workerPid=current;break;}assert.ok(parent>1);current=parent;}
 assert.ok(workerPid>1);forcedController.abort();process.kill(workerPid,'SIGKILL');const forced=await forcedExecution;
 assert.equal(forced.code,130);assert.deepEqual(forced.report.final_exit,{code:null,signal:'SIGKILL',observed:false});assert.equal(forced.report.status,'interrupted');assert.equal(forced.report.finished_at,undefined);
 assert.equal(forced.report.results.find(row=>row.task_id==='completed').actual_exit_code,0);
 assert.deepEqual(forced.report.unexecuted.map(({task_id,reason})=>({task_id,reason})),['kill-wait','kill-pending','post.git-diff-check'].map(task_id=>({task_id,reason:'failure-or-interruption'})));
 assert.equal(forced.report.gate_results.find(row=>row.id===gateId).status,'failed');assert.deepEqual(JSON.parse(fs.readFileSync(forced.reportFile)).unexecuted,forced.report.unexecuted);
 assertSkippedLogs(forced,[]);
});

test('v2 schema 与 fresh consumer 拒绝实际退出、Gate、日志、invocation 和漂移缺陷',t=>{
 const f=fixture(t),schema=path.resolve(import.meta.dirname,'../.template-source/process/schemas/template-verification-report.schema.json');
 validateJsonSchema(f.report,schema);
 for(const mutate of [r=>r.final_exit.observed=false,r=>r.results[0].actual_exit_code_observed=false,r=>r.gate_results=[],r=>r.plan.gates=[],r=>r.input_drift=true,r=>r.invocation.args=[],r=>r.results[0].stdoutFile=path.join(f.directory,'missing.log'),r=>r.results[0].log_digests={},r=>r.unexecuted=[{id:'syntax.0',reason:'failure-or-interruption'}],r=>r.purpose='qualification']){
  const report=structuredClone(f.report);mutate(report);assert.throws(()=>validateVerificationReport(report,f.options));
 }
 const currentSource=structuredClone(f.report);currentSource.plan.source_requirement='current';assert.throws(()=>validateVerificationReport(currentSource,f.options),/committed/);
 const malformed=structuredClone(f.report);malformed.final_exit.observed='yes';assert.throws(()=>validateJsonSchema(malformed,schema));
 const sources=structuredClone(f.options.expectedSourcesManifest);
 f.report.sources_manifest=structuredClone(sources);validateVerificationReport(f.report,{...f.options,expectedSourcesManifest:sources});
 f.report.sources_manifest.entries[0].template_commit='4'.repeat(40);assert.throws(()=>validateVerificationReport(f.report,{...f.options,expectedSourcesManifest:sources}),/来源/);
 f.report.sources_manifest=structuredClone(sources);
 assert.throws(()=>validateVerificationReport(f.report,{...f.options,expectedFamilies:['spec','design','backend']}),/家族/);
});

test('无 gitmodules 的维护证据仍独立核验真实来源、command、invocation 和摘要',t=>{
 const f=fixture(t),file=path.join(f.directory,'report.json'),source=path.join(f.directory,'source'),cli=path.join(f.directory,'cli');
 const git=(cwd,...args)=>{const r=spawnSync('git',args,{cwd,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
 const commit=cwd=>{git(cwd,'add','.');git(cwd,'-c','user.name=fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture');return git(cwd,'rev-parse','HEAD');};
 fs.mkdirSync(source);fs.mkdirSync(cli);git(source,'init','-q');git(cli,'init','-q');
 fs.writeFileSync(path.join(source,'yss-project.yaml'),'schema_version: 1\nrepository_mode: template-source\n');const templateCommit=commit(source);
 // Synthetic native identity exercises the real collector and maintenance subprocess, not release qualification.
 fs.writeFileSync(path.join(cli,'go.mod'),'module github.com/iloveZzz/yss-cli\n\ngo 1.27.1\n');fs.copyFileSync(new URL('../.template-source/scripts/tests/fixtures/native-release.go',import.meta.url),path.join(cli,'main.go'));const cliCommit=commit(cli);
 const binary=path.join(f.directory,'yss-fixture'),built=spawnSync('go',['build','-trimpath','-ldflags',`-X main.cliCommit=${cliCommit} -X main.templateCommit=${templateCommit} -X main.designCommit=${templateCommit} -X main.backendCommit=${templateCommit}`,'-o',binary,'.'],{cwd:cli,env:{...process.env,CGO_ENABLED:'0'},encoding:'utf8'});assert.equal(built.status,0,built.stderr);
 const keys=[...new Set(['YSS_NATIVE_BINARY','YSS_NATIVE_BINARY_SHA256','YSS_NATIVE_SOURCE_ROOT','YSS_NATIVE_PIN_FILE','YSS_NATIVE_PIN_SHA256','YSS_NATIVE_BINARY_OVERRIDE',...Object.keys(process.env).filter(key=>key.startsWith('YSS_RELEASE_'))])],previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 t.after(()=>{for(const key of keys)if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];});for(const key of keys)delete process.env[key];
 Object.assign(process.env,{YSS_NATIVE_BINARY:binary,YSS_NATIVE_BINARY_SHA256:createHash('sha256').update(fs.readFileSync(binary)).digest('hex'),YSS_NATIVE_SOURCE_ROOT:fs.realpathSync(cli)});
 const pinFile=path.join(f.directory,'fixture-pin.json');
 fs.writeFileSync(pinFile,JSON.stringify({schema_version:1,repository:'https://example.invalid/yss-cli.git',version:'1.0.0-fixture.1',commit:cliCommit,go_version:'1.27.1',build:'regression-only:synthetic-fixture',binaries:{[platformKey()]:{sha256:process.env.YSS_NATIVE_BINARY_SHA256}}}));
 Object.assign(process.env,{YSS_NATIVE_PIN_FILE:pinFile,YSS_NATIVE_PIN_SHA256:createHash('sha256').update(fs.readFileSync(pinFile)).digest('hex')});
 const sources=collectReleaseSources({root:source,commit:templateCommit});assert.equal(fs.existsSync(path.join(source,'.gitmodules')),false);
 f.report.root=fs.realpathSync(source);f.report.input_sha256=verificationInputDigest(source);f.report.input_after_sha256=f.report.input_sha256;f.report.sources_manifest=structuredClone(sources);
 const evidence={command:'scripts/verify-template',args:['--report-dir',f.directory],exit_code:0,evidence_ref:file};
 f.report.invocation={command:path.join(source,'scripts/run-template-verification'),args:['--profile','release',...evidence.args]};
 const save=()=>{fs.writeFileSync(file,JSON.stringify(f.report));evidence.evidence_digest=createHash('sha256').update(fs.readFileSync(file)).digest('hex');};save();
 // Only the independent execution plan is supplied; sources are recollected by the public consumer.
 assert.equal(validateMaintenanceVerificationEvidence(evidence,{root:source,expectedPlan:f.plan}).verified.status,'passed');
 for(const mutate of [r=>delete r.sources_manifest,r=>r.sources_manifest.entries[0].template_commit='4'.repeat(40),r=>r.sources_manifest.families=['spec']]){
  f.report.sources_manifest=structuredClone(sources);mutate(f.report);save();assert.throws(()=>validateMaintenanceVerificationEvidence(evidence,{root:source,expectedPlan:f.plan}),/来源|家族/);
 }
 f.report.sources_manifest=structuredClone(sources);save();
 assert.throws(()=>validateMaintenanceVerificationEvidence({...evidence,args:[]},{root:source,expectedPlan:f.plan}),/invocation/);
 assert.throws(()=>validateMaintenanceVerificationEvidence({...evidence,evidence_digest:'0'.repeat(64)},{root:source,expectedPlan:f.plan}),/摘要/);
});


test('同轮复用必须具有相同依赖、资源、来源及完整执行输入',t=>{
 const f=fixture(t),first={...f.plan.commands[0],resources:['shared'],source_requirement:'committed',depends_on:[]},second={...first,id:'check.second',task_id:'syntax.1'};
 f.plan.commands=[first,second];f.plan.gates[0].check_ids.push(second.id);f.plan.gates.push({id:'check.verification-final-integrity',selected:true,check_ids:[first.id,second.id]});f.report.plan=structuredClone(f.plan);
 f.report.results[0]={...f.report.results[0],...first};f.report.results.push({...f.report.results[0],...second,index:1,reused:true,reused_from:{task_id:first.task_id,index:0},actual_exit_code:null,actual_exit_signal:null,actual_exit_code_observed:false});
 finalizeVerificationReport(f.report,{status:'passed',wallMs:1,repositoryMode:'template-source'});
 saveVerificationReport(f.directory,f.report);
 assert.deepEqual(f.report.unexecuted,[]);
 assert.equal(f.report.gate_results.find(row=>row.id==='check.verification-final-integrity').status,'passed');
 assert.equal(validateVerificationReport(f.report,f.options).status,'passed');
 for(const change of [{depends_on:['check.change']},{resources:['after']},{source_requirement:'current'},{timeout_ms:10},{lane:'after'},{execution:{requested_command:first.command,file:process.execPath,args:['--check','source.mjs'],cwd:'/different/source',environment:{}}}]){
  const expected=structuredClone(f.plan);Object.assign(expected.commands[1],change);const report=structuredClone(f.report);report.plan=structuredClone(expected);
  if(change.execution)report.results[1].actual_execution=structuredClone(change.execution);
  assert.throws(()=>validateVerificationReport(report,{...f.options,expectedPlan:expected}),/执行输入不等价/);
 }
});

test('批量 Node 测试显式串行，报告必须绑定请求和实际 file argv cwd env',t=>{
 const f=fixture(t);for(const file of ['first.test.mjs','second.test.mjs'])fs.writeFileSync(path.join(f.directory,file),`import test from 'node:test';test('actual pass',()=>{});`);
 f.plan.commands[0].command='node --test first.test.mjs second.test.mjs';const execution=compileTaskExecution(f.plan.commands[0],{root:f.directory,reportDir:f.directory});f.plan.commands[0].execution=execution;
 assert.equal(execution.args.filter(value=>value==='--test-concurrency=1').length,1);const actual=spawnSync(execution.file,execution.args,{cwd:execution.cwd,encoding:'utf8'});assert.equal(actual.status,0,actual.stderr);
 f.report.plan=structuredClone(f.plan);const row=f.report.results[0];Object.assign(row,f.plan.commands[0],{actual_execution:execution});fs.writeFileSync(row.stdoutFile,actual.stdout);fs.writeFileSync(row.stderrFile,actual.stderr);row.log_digests={stdoutFile:createHash('sha256').update(actual.stdout).digest('hex'),stderrFile:createHash('sha256').update(actual.stderr).digest('hex')};
 assert.equal(validateVerificationReport(f.report,f.options).status,'passed');
 for(const mutate of [r=>delete r.results[0].actual_execution,r=>r.results[0].actual_execution.args=r.results[0].actual_execution.args.filter(value=>value!=='--test-concurrency=1'),r=>r.results[0].actual_execution.cwd='/other',r=>r.results[0].actual_execution.environment={YSS_SPEC_TEMPLATE_REPO:'/other'},r=>r.results[0].actual_execution.requested_command='node --test first.test.mjs']){const report=structuredClone(f.report);mutate(report);assert.throws(()=>validateVerificationReport(report,f.options),/实际|argv|tuple/);}
});

test('project-instance 共享消费者与历史 checkpoint 不加载未分发的 source-only validator',async t=>{
 const repository=path.resolve(import.meta.dirname,'..'),directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'maintenance-distribution-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 fs.cpSync(path.join(repository,'scripts'),path.join(directory,'scripts'),{recursive:true});fs.cpSync(path.join(repository,'.template-spec'),path.join(directory,'.template-spec'),{recursive:true});
 fs.copyFileSync(path.join(repository,'CONTEXT.md'),path.join(directory,'CONTEXT.md'));fs.copyFileSync(path.join(repository,'skills-lock.json'),path.join(directory,'skills-lock.json'));
 fs.writeFileSync(path.join(directory,'yss-project.yaml'),'schema_version: 1\nrepository_mode: project-instance\n');
 assert.equal(fs.existsSync(path.join(directory,'.template-source')),false);
 const product=await import(pathToFileURL(path.join(directory,'scripts/lib/task-package.mjs')));assert.equal(typeof product.validateTaskPackage,'function');
 assert.throws(()=>validateMaintenanceVerificationEvidence({},{root:directory}),/project-instance/);
 fs.writeFileSync(path.join(directory,'yss-project.yaml'),'schema_version: 1\nrepository_mode: template-source\n');fs.mkdirSync(path.join(directory,'.template-source/process'),{recursive:true});fs.copyFileSync(path.join(repository,'.template-source/process/maintenance-intensity.yaml'),path.join(directory,'.template-source/process/maintenance-intensity.yaml'));fs.copyFileSync(path.join(repository,'.template-source/process/maintenance-intensity-v1.yaml'),path.join(directory,'.template-source/process/maintenance-intensity-v1.yaml'));
 const maintenance=await import(pathToFileURL(path.join(directory,'scripts/lib/maintenance-intensity.mjs')));
 const checkpoint={schema_version:2,intensity:'L1',classification_reason:'历史文案维护',triggers:['textual-only'],changed_assets:['README.md'],verification_evidence:[{kind:'relevant-check',command:'node --check historical.mjs',result:'pass'},{kind:'final-release-verification',command:'scripts/verify-template',result:'pass'}],review_mode:'self-check',escalation:'none',target_state:'release-ready',current_state:'release-ready',verification_profile:'release',review_round:0,candidate_digest:null};
 assert.equal(maintenance.validateMaintenanceCheckpoint(checkpoint,{history:true}).current_state,'historical-only');
 assert.equal(fs.existsSync(path.join(directory,'.template-source/scripts/lib/verification-report-validator.mjs')),false);
 assert.throws(()=>maintenance.validateMaintenanceCheckpoint(checkpoint),/实际 args/);
});

test('旧 candidate 和 legacy-full 策略不能作为当前报告重新编译',t=>{
 const root=path.resolve(import.meta.dirname,'..'),directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'retired-policy-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const fixedCommit='0abbe49ee4cfd8608beab95243520888228dad41';
 for(const profile of ['candidate','legacy-full','release'])assert.throws(()=>compileExpectedVerificationPlan({root,fixedCommit,args:['--profile',profile,'--report-dir',path.join(directory,'report')]}),/REPORT_SOURCE_UNSUPPORTED/,profile);
});

test('固定报告拒绝 5.0 前产品与无法证明的提交',t=>{
 const root=path.resolve(import.meta.dirname,'..'),directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'report-source-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const old='26036e9752420112aea9e55551483d7a72f1b375',base='4fa7d5785e025c7ba6d95178a41ac1a3ba46792d';
 for(const fixedCommit of [old,'f'.repeat(40)])assert.throws(()=>compileExpectedVerificationPlan({root,fixedCommit,args:['--profile','release','--base',base],reportDirectory:path.join(directory,'report')}),/REPORT_SOURCE_UNSUPPORTED/);
 for(const base of [old,'f'.repeat(40)])assert.match(validateBaselineReport({root,base,reportFile:path.join(directory,'untrusted.json'),expectedDigest:'a'.repeat(64)}).reasons.join('; '),/REPORT_SOURCE_UNSUPPORTED/);
 const isolated=path.join(directory,'unknown-source');fs.mkdirSync(isolated);
 for(const args of [['init','-q'],['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-qm','unknown']])assert.equal(spawnSync('git',args,{cwd:isolated}).status,0);
 const fixedCommit=spawnSync('git',['rev-parse','HEAD'],{cwd:isolated,encoding:'utf8'}).stdout.trim();
 assert.throws(()=>compileExpectedVerificationPlan({root:isolated,fixedCommit,reportDirectory:path.join(directory,'report')}),/REPORT_SOURCE_UNSUPPORTED/);
 assert.throws(()=>compileExpectedVerificationPlan({root:isolated,fixedCommit:'1e49127842c358caf552af8ebec58f438a35c5a6',reportDirectory:path.join(directory,'report')}),/REPORT_SOURCE_UNSUPPORTED/);
 const common=spawnSync('git',['rev-parse','--git-common-dir'],{cwd:root,encoding:'utf8'}).stdout.trim();
 fs.mkdirSync(path.join(isolated,'.git/objects/info'),{recursive:true});
 fs.writeFileSync(path.join(isolated,'.git/objects/info/alternates'),`${fs.realpathSync(path.resolve(root,common,'objects'))}\n`);
 const tree=spawnSync('git',['rev-parse',`${old}^{tree}`],{cwd:isolated,encoding:'utf8'}).stdout.trim();
 const forged=spawnSync('git',['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit-tree',tree,'-p','1e49127842c358caf552af8ebec58f438a35c5a6','-m','old tree with new parent'],{cwd:isolated,encoding:'utf8'});
 assert.equal(forged.status,0,forged.stderr);
 const forgedCommit=forged.stdout.trim();
 assert.equal(spawnSync('git',['merge-base','--is-ancestor','1e49127842c358caf552af8ebec58f438a35c5a6',forgedCommit],{cwd:isolated}).status,0);
 assert.throws(()=>compileExpectedVerificationPlan({root:isolated,fixedCommit:forgedCommit,reportDirectory:path.join(directory,'report')}),/REPORT_SOURCE_UNSUPPORTED/);
});

test('同代固定报告允许按影响选择且拒绝篡改遗漏项',t=>{
 const f=fixture(t);f.plan.selection={effective:'impact',omitted:[{id:'check.unaffected',reason:'outside-release-inputs'}]};
 f.plan.changed_files=['README.md'];f.plan.scope={kind:'complete-candidate',files:['README.md'],explicit_files:[],base:'1'.repeat(40)};
 f.report.plan=structuredClone(f.plan);f.report.scope=structuredClone(f.plan.scope);
 assert.equal(validateVerificationReport(f.report,{...f.options,historical:true}).status,'passed');
 const altered=structuredClone(f.report);altered.plan.selection.omitted=[];
 assert.throws(()=>validateVerificationReport(altered,{...f.options,historical:true}),/选择/);
});

test('经登记的真实执行报告可在不同仓根复验，未登记及篡改拒绝',async t=>{
 const temporary=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'registered-report-')));t.after(()=>fs.rmSync(temporary,{recursive:true,force:true}));
 const original=path.join(temporary,'original'),release=path.join(temporary,'original-release'),fullDir=path.join(release,'full-verification');
 fs.mkdirSync(original);fs.mkdirSync(fullDir,{recursive:true});fs.writeFileSync(path.join(original,'sample.mjs'),'console.log("observed");\n');
 const oldNode=path.join(temporary,'node');fs.copyFileSync(process.execPath,oldNode);fs.chmodSync(oldNode,0o755);assert.notEqual(oldNode,process.execPath);
 const commit='1e49127842c358caf552af8ebec58f438a35c5a6',previous='951710a4097d97188545ecfa43a33f7c14c6e91a';
 const task={id:'check.sample',task_id:'sample',command:'node --test sample.mjs',gate_ids:['G04']};
 const originalTask={...task,execution:compileTaskExecution(task,{root:original,nodePath:oldNode})};
 assert.equal(originalTask.execution.file,oldNode,'历史 Node 路径须参与重编译');
 const plan={effective_profile:'release',source_requirement:'committed',strategy:'release',selection:{effective:'legacy',omitted:[]},policy_digest:'a'.repeat(64),gates:[{id:'G04',selected:true,check_ids:[task.id]}],commands:[originalTask]};
 const args=['--report-dir',fullDir,'--base',previous],invocation={command:path.join(original,'scripts/run-template-verification'),args:['--profile','release',...args]};
 const report=createVerificationReport(plan,{root:original,inputDigest:'b'.repeat(64),scope:{kind:'complete-candidate'},concurrency:1,invocation});
 const result=spawnSync(originalTask.execution.file,originalTask.execution.args,{cwd:original,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
 const stdoutFile=path.join(fullDir,'stdout.log'),stderrFile=path.join(fullDir,'stderr.log');fs.writeFileSync(stdoutFile,result.stdout);fs.writeFileSync(stderrFile,result.stderr);
 report.results.push({index:0,...originalTask,actual_execution:originalTask.execution,code:0,actual_exit_code:0,actual_exit_signal:null,actual_exit_code_observed:true,stdoutFile,stderrFile,log_digests:{stdoutFile:digest(result.stdout),stderrFile:digest(result.stderr)},duration_ms:1});
 finalizeVerificationReport(report,{status:'passed',wallMs:1,repositoryMode:'template-source'});report.input_after_sha256=report.input_sha256;report.input_drift=false;report.final_exit={code:0,signal:null,observed:true};
 const sources={kind:'template-release-sources',families:['spec'],entries:[{namespace:'candidate-release',family:'spec',cli_commit:'1'.repeat(40),template_commit:commit,core_commit:commit,package_name:'yss',version:'3.0.0',template_version:'5.0.0',source_contract_version:2,protocol_version:1,snapshot_hash:'4'.repeat(64),manifest_hash:'5'.repeat(64),bundle_hash:'6'.repeat(64),binary_sha256:'7'.repeat(64)}]};report.sources_manifest=sources;
 const fullFile=path.join(fullDir,'report.json');fs.writeFileSync(fullFile,JSON.stringify(report));fs.writeFileSync(path.join(release,'command.log'),'observed');
 const outer={schema_version:2,kind:'template-release-verification',purpose:'verification',requested_commit:commit,template_commit:commit,status:'passed',cli_families:['spec'],commands:[{command:'scripts/verify-template',args,exit_code:0,actual_exit_code:0,actual_exit_signal:null,actual_exit_code_observed:true,log:'command.log',log_sha256:digest('observed')}],full_verification:{report:fullFile,report_sha256:digest(fs.readFileSync(fullFile))},sources_manifest:sources};
 const bytes=JSON.stringify(outer),outerDigest=digest(bytes);fs.writeFileSync(path.join(release,'report.json'),bytes);
 // Copy the verifier and a test-only reviewed trust registry; no repository trust is changed.
 const isolated=path.join(temporary,'verifier');fs.mkdirSync(path.join(isolated,'.template-source/scripts'),{recursive:true});fs.cpSync(path.join(ROOT,'.template-source/scripts/lib'),path.join(isolated,'.template-source/scripts/lib'),{recursive:true});fs.cpSync(path.join(ROOT,'.template-source/process'),path.join(isolated,'.template-source/process'),{recursive:true});fs.symlinkSync(path.join(ROOT,'scripts'),path.join(isolated,'scripts'),'dir');
 const registryFile=path.join(isolated,'.template-source/process/trusted-verification-releases.json');
 fs.writeFileSync(registryFile,JSON.stringify({schema_version:1,releases:[{version:'5.0.0',commit,reports:[]}]}));
 const verifier=await import(pathToFileURL(path.join(isolated,'.template-source/scripts/lib/verification-report-validator.mjs')));
 const originalOptions={root:ROOT,base:commit,reportFile:path.join(release,'report.json'),expectedDigest:outerDigest,expectedPlan:plan};
 assert.match(verifier.validateBaselineReport(originalOptions).reasons.join(';'),/REPORT_EVIDENCE_UNREGISTERED/,'同仓根也必须拒绝未登记报告');
 fs.writeFileSync(registryFile,JSON.stringify({schema_version:1,releases:[{version:'5.0.0',commit,reports:[outerDigest]}]}));
 const moved=path.join(temporary,'moved-release');fs.renameSync(release,moved);fs.rmSync(original,{recursive:true});
 const expectedPlan={...plan,commands:[{...task,execution:compileTaskExecution(task,{root:ROOT,nodePath:oldNode})}]};
 const options={root:ROOT,base:commit,reportFile:path.join(moved,'report.json'),expectedDigest:outerDigest,expectedPlan};
 assert.deepEqual(verifier.validateBaselineReport(options).reasons,[]);
 assert.equal(validateBaselineReport(options).valid,false,'原登记没有审批该报告');
 const mixed=structuredClone(report);mixed.results[0].actual_execution.file='/unreviewed/bin/node';
 const mixedFile=path.join(moved,'full-verification/report.json');fs.writeFileSync(mixedFile,JSON.stringify(mixed));
 const mixedOuter={...outer,full_verification:{...outer.full_verification,report_sha256:digest(fs.readFileSync(mixedFile))}},mixedBytes=JSON.stringify(mixedOuter),mixedDigest=digest(mixedBytes);
 fs.writeFileSync(registryFile,JSON.stringify({schema_version:1,releases:[{version:'5.0.0',commit,reports:[outerDigest,mixedDigest]}]}));fs.writeFileSync(options.reportFile,mixedBytes);
 assert.match(verifier.validateBaselineReport({...options,expectedDigest:mixedDigest}).reasons.join(';'),/HISTORICAL_NODE_MIXED/,'不得混用历史 Node 可执行文件');
 fs.writeFileSync(mixedFile,JSON.stringify(report));fs.writeFileSync(options.reportFile,bytes);
 const unsigned=structuredClone(outer);delete unsigned.commands[0].log_sha256;
 const unsignedBytes=JSON.stringify(unsigned),unsignedDigest=digest(unsignedBytes);
 fs.writeFileSync(registryFile,JSON.stringify({schema_version:1,releases:[{version:'5.0.0',commit,reports:[outerDigest,unsignedDigest]}]}));
 fs.writeFileSync(options.reportFile,unsignedBytes);
 assert.match(verifier.validateBaselineReport({...options,expectedDigest:unsignedDigest}).reasons.join(';'),/日志摘要缺失/);
 fs.writeFileSync(options.reportFile,bytes);
 fs.writeFileSync(path.join(moved,'full-verification/stdout.log'),'tampered');
 assert.equal(verifier.validateBaselineReport(options).valid,false,'日志篡改必须拒绝');
});

test('Template 5.0 固定策略按原提交重建检查及路径映射',t=>{
 const root=path.resolve(import.meta.dirname,'..'),directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'current-policy-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const fixedCommit='1e49127842c358caf552af8ebec58f438a35c5a6',base='951710a4097d97188545ecfa43a33f7c14c6e91a';
 const plan=compileExpectedVerificationPlan({root,fixedCommit,args:['--profile','release','--base',base],reportDirectory:path.join(directory,'report')});
 assert.equal(plan.strategy,'release');assert.equal(plan.scope.base,base);
 assert.ok(plan.commands.some(row=>row.execution?.requested_command==='scripts/verify-repository-scope-scenarios'&&row.execution.args.at(-1).endsWith('/tests/scenarios/verify-repository-scope-scenarios.mjs')));
 assert.ok(plan.policy_digest&&plan.selection.omitted.length>0);
 const oldNode=path.join(directory,'node');
 const recompiled=compileExpectedVerificationPlan({root,fixedCommit,args:['--profile','release','--base',base],reportDirectory:path.join(directory,'report'),nodePath:oldNode});
 assert.ok(recompiled.commands.find(row=>row.kind==='preflight').command.startsWith(`'${oldNode}' `));
 assert.ok(recompiled.commands.filter(row=>row.execution?.file===oldNode).length>0);
 assert.ok(recompiled.commands.filter(row=>row.kind==='artifact-prepare').every(row=>row.command.startsWith(`'${oldNode}' `)));
});

test('qualified 历史报告不能为当前 release 提供执行许可',t=>{const f=fixture(t);f.plan.strategy='qualified-gates';f.report.plan.strategy='qualified-gates';assert.throws(()=>validateVerificationReport(f.report,f.options),/HISTORICAL_QUALIFIED_BASELINE_REFUSED/);});


test('release 拒绝报告自选变化路径、基线和遗漏集合',t=>{
 const f=fixture(t);f.plan.changed_files=['README.md'];f.plan.selection={effective:'impact',omitted:[]};f.plan.scope={kind:'complete-candidate',files:['README.md'],explicit_files:[],base:'1'.repeat(40)};f.report.plan=structuredClone(f.plan);f.report.scope=structuredClone(f.plan.scope);
 assert.equal(validateVerificationReport(f.report,f.options).status,'passed');
 for(const mutate of [r=>r.plan.changed_files=[],r=>r.scope.base='2'.repeat(40),r=>r.scope.files=[],r=>r.plan.selection.omitted=[{id:'check.syntax'}]]){const report=structuredClone(f.report);mutate(report);assert.throws(()=>validateVerificationReport(report,f.options));}
});

test('干净发行仍从固定基线纳入全部提交差异，显式子集不能隐藏未知输入',t=>{
 const f=fixture(t),root=f.directory,git=(...args)=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
 git('init','-q');fs.writeFileSync(path.join(root,'yss-project.yaml'),'schema_version: 1\nrepository_mode: template-source\n');fs.writeFileSync(path.join(root,'README.md'),'before');git('add','.');git('-c','user.name=t','-c','user.email=t@example.invalid','commit','-qm','previous release');const base=git('rev-parse','HEAD');
 const check={id:'check.example',run:'node -e "process.exit(0)"',group:'checks',input_patterns:['README.md'],inputs_complete:true,depends_on:[],failure_mode:'content behavior'};
 const config={schema_version:1,groups:{checks:{commands:[check]}},profiles:{fast:{checks:[check]},release:{selection:'impact'}},routing:[{patterns:['README.md','unknown.asset'],groups:['checks']}],gates:[],required_files:[],syntax_files:[]};
 fs.writeFileSync(path.join(root,'unknown.asset'),'actual unregistered source');git('add','.');git('-c','user.name=t','-c','user.email=t@example.invalid','commit','-qm','new source');
 assert.throws(()=>compileExpectedVerificationPlan({root,config}),/RELEASE_BASE_REQUIRED/);
 assert.throws(()=>compileExpectedVerificationPlan({root,config,args:['--base',base,'--changed-file','README.md']}),/INCOMPLETE_VERIFICATION_INPUTS.*unknown.asset/);
 config.profiles.fast.checks[0].input_patterns.push('unknown.asset');
 const plan=compileExpectedVerificationPlan({root,config,reportDirectory:path.join(os.tmpdir(),path.basename(root)+'-report'),args:['--base',base,'--changed-file','README.md']});
 assert.deepEqual(plan.changed_files,['README.md','unknown.asset']);assert.equal(plan.scope.base,base);assert.ok(plan.commands.some(task=>task.id==='check.example'));
});

test('limited 仅在独立 fast 期望下显式消费，保留完整失败拒绝',t=>{
 const f=fixture(t);
 Object.assign(f.plan,{requested_profile:'fast',effective_profile:'fast',source_requirement:'current',strategy:'daily-necessary',gates:[]});
 f.plan.commands[0].gate_ids=[];f.plan.scope={kind:'limited',files:[],explicit_files:[],base:null};
 f.report.plan=structuredClone(f.plan);f.report.scope=structuredClone(f.plan.scope);f.report.results[0].gate_ids=[];f.report.sources_manifest=null;
 finalizeVerificationReport(f.report,{status:'passed',wallMs:1,repositoryMode:'template-source'});
 const {expectedSourcesManifest,...options}=f.options;options.requireRelease=false;
 assert.equal(validateVerificationReport(f.report,options).status,'passed');
 assert.throws(()=>validateVerificationReport(f.report,{...options,requireRelease:true}),/完整候选|release/);
 for(const mutate of [r=>r.plan.commands=[],r=>r.results=[],r=>r.purpose='diagnostic',r=>r.invocation.args=[],r=>r.results[0].stdoutFile=path.join(f.directory,'missing.log'),r=>r.results[0].log_digests.stdoutFile='0'.repeat(64),r=>r.final_exit.observed=false,r=>r.input_drift=true]){const report=structuredClone(f.report);mutate(report);assert.throws(()=>validateVerificationReport(report,options));}
});
test('一次失败传播至合并任务的每个 Gate 且保存原始日志',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'merged-gates-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const {runGroups}=await import('../scripts/lib/template-verification-runner.mjs');
 const command='node -e "console.log(\'raw-evidence\');process.exit(7)"';
 const input={strategy:'release',effective_profile:'release',requested_profile:'release',source_requirement:'committed',commands:[{id:'check.primary',task_id:'check.primary',command,group:'checks',depends_on:[],gate_ids:['first'],timeout_ms:1800000}],supplemental_checks:[{id:'check.s',task_id:'supplemental.s',run:command,when:'template-source',source_requirement:'committed',gate_ids:['second'],depends_on:[]}],gates:[{id:'first',selected:true},{id:'second',selected:false}]};
 const compiled=addVerificationExecutionTasks(input,{root:ROOT,reportDir:directory}),task=compiled.commands.find(task=>task.id==='check.primary');
 const plan={...compiled,commands:[{...task,depends_on:[]}]},report=createVerificationReport(plan,{root:ROOT,inputDigest:'fixed-input',scope:{kind:'complete-candidate'},concurrency:1});
 const groups=await runGroups(plan,'template-source',1,{cwd:ROOT,environment:process.env,logRoot:directory,onResult:row=>report.results.push(row)});
 assert.equal(groups.flatMap(group=>group.results).length,1);assert.equal(report.results[0].code,7);
 finalizeVerificationReport(report,{status:'failed',wallMs:1,repositoryMode:'template-source'});saveVerificationReport(directory,report);
 assert.deepEqual(report.gate_results.map(row=>row.status),['failed','failed']);
 assert.match(fs.readFileSync(report.results[0].stdoutFile,'utf8'),/raw-evidence/);assert.equal(report.input_sha256,'fixed-input');
});

test('正式插件报告不能从受审报告本身取得独立来源期望',t=>{
 const f=fixture(t),task=f.plan.commands[0];
 task.id='check.plugin-entry-migration';task.command='plugin-run';task.execution={requested_command:'plugin-run',file:process.execPath,args:[path.join(f.directory,'.template-source/scripts/committed-plugin-run.mjs'),task.id],cwd:f.directory,environment:{YSS_PLUGIN_COMMITTED_SNAPSHOT_SHA256:'a'.repeat(64)}};
 f.plan.gates[0].check_ids=[task.id];f.report.plan=structuredClone(f.plan);Object.assign(f.report.results[0],task,{actual_execution:structuredClone(task.execution)});
 finalizeVerificationReport(f.report,{status:'passed',wallMs:1,repositoryMode:'template-source'});
 assert.throws(()=>validateVerificationReport(f.report,f.options),/independent committed plugin/i);
});
