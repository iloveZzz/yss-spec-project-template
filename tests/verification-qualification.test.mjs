import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync,spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateQualification, qualificationPerformance,qualificationRunEvidence,validateQualificationPlanLedger,validateQualificationReportEvidence,measureQualificationRun,collectQualificationCounterexamples,validateQualificationCounterexamples,QUALIFICATION_COUNTEREXAMPLE_REGISTRY} from '../.template-source/scripts/lib/verification-qualification.mjs';
import {runQualification,runQualificationWithSignals} from '../.template-source/scripts/qualify-template-verification.mjs';
import {compileQualificationPlans} from '../.template-source/scripts/lib/verification-qualification-plan.mjs';
import {addVerificationExecutionTasks,compileTaskExecution} from '../.template-source/scripts/lib/verification-execution-plan.mjs';
import {loadVerificationProfiles,ROOT} from '../scripts/lib/template-verification.mjs';
import {createVerificationReport,finalizeVerificationReport,verificationInputDigest} from '../scripts/lib/verification-report.mjs';
import {runCommandToFiles} from '../scripts/lib/template-verification-runner.mjs';
import {installedTreeDigest,prepareCliSourceConsumer} from '../.template-source/scripts/lib/verification-artifacts.mjs';
import {executeVerificationPlan} from '../.template-source/scripts/lib/template-verification-worker.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
// The fixed collector still owns its registry; these are real bounded TAP files,
// not the production suites or a complete Gate qualification run.
function counterexampleFixture(t,{firstBody=''}={}) {
  const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'qualification-corpus-process-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const root=path.join(directory,'root'),output=path.join(directory,'evidence'),startedFile=path.join(directory,'started.log'),marker=path.join(directory,'pids.json');fs.mkdirSync(root);fs.mkdirSync(output);
  const files=[...new Set(QUALIFICATION_COUNTEREXAMPLE_REGISTRY.map(row=>row.file))],source_files={};
  for(const [index,file]of files.entries()) {
    const cases=QUALIFICATION_COUNTEREXAMPLE_REGISTRY.filter(row=>row.file===file),target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});
    const source=`import test from 'node:test';import fs from 'node:fs';import {spawn} from 'node:child_process';\nfs.appendFileSync(${JSON.stringify(startedFile)},${JSON.stringify(file+'\n')});\n`+cases.map((row,caseIndex)=>`test(${JSON.stringify(row.name)},async()=>{${index===0&&caseIndex===0?firstBody.replaceAll('__MARKER__',JSON.stringify(marker)):''}});`).join('\n');
    fs.writeFileSync(target,source);source_files[file]=hash(fs.readFileSync(target));
  }
  return {directory,root,output,startedFile,marker,files,bindings:{source_files}};
}

test('资格反例收集异步监督真实TAP且固定消费者阳性仍有效',async t=>{
  const f=counterexampleFixture(t),pending=collectQualificationCounterexamples({root:f.root,directory:f.output});
  assert.equal(typeof pending?.then,'function','collector must yield to the persistent signal handler');
  const corpus=await pending;assert.equal(corpus.status,'passed');assert.deepEqual(fs.readFileSync(f.startedFile,'utf8').trim().split('\n'),f.files);
  assert.equal(validateQualificationCounterexamples({root:f.root,directory:f.output,corpus,bindings:f.bindings}).valid,true);
  for(const suite of corpus.suites){assert.deepEqual(suite.actual_close,{code:0,signal:null,observed:true});assert.equal(suite.stdout_sha256,hash(fs.readFileSync(path.join(f.output,suite.stdout_ref))));assert.equal(suite.stderr_sha256,hash(fs.readFileSync(path.join(f.output,suite.stderr_ref))));}
  const cancelled=structuredClone(corpus);cancelled.suites[0].termination='cancelled';assert.ok(validateQualificationCounterexamples({root:f.root,directory:f.output,corpus:cancelled,bindings:f.bindings}).reasons.includes('qualification-counterexample-process-failed'));
  for(const mutate of [row=>row.kill_errors=['EPERM actual group cleanup'],row=>row.error='cleanup error',row=>row.storageError='log write error']) {
    const tampered=structuredClone(corpus);mutate(tampered.suites[0]);assert.deepEqual(tampered.suites[0].actual_close,{code:0,signal:null,observed:true});assert.ok(validateQualificationCounterexamples({root:f.root,directory:f.output,corpus:tampered,bindings:f.bindings}).reasons.includes('qualification-counterexample-process-failed'));
  }
  for(const mutate of [row=>delete row.actual_execution,row=>row.actual_execution.cwd='/different/source',row=>row.actual_execution.args=row.actual_execution.args.filter(arg=>arg!=='--test-concurrency=1'),row=>row.actual_execution.environment={NODE_OPTIONS:'--unapproved'}]) {
    const tampered=structuredClone(corpus);mutate(tampered.suites[0]);assert.ok(validateQualificationCounterexamples({root:f.root,directory:f.output,corpus:tampered,bindings:f.bindings}).reasons.includes('qualification-counterexample-execution-mismatch'));
  }
});

test('资格反例消费者绑定独立root，同改两处cwd或缺少上下文均拒绝',async t=>{
  const f=counterexampleFixture(t),corpus=await collectQualificationCounterexamples({root:f.root,directory:f.output});
  const options={root:f.root,directory:f.output,corpus,bindings:f.bindings};assert.equal(validateQualificationCounterexamples(options).valid,true);
  assert.ok(validateQualificationCounterexamples({...options,root:undefined}).reasons.includes('qualification-counterexample-root-context-missing'));
  const tampered=structuredClone(corpus);for(const suite of tampered.suites){suite.cwd='/another/execution-root';suite.actual_execution.cwd='/another/execution-root';}
  assert.ok(validateQualificationCounterexamples({...options,corpus:tampered}).reasons.includes('qualification-counterexample-execution-root-mismatch'));
  assert.ok(validateQualificationCounterexamples({...options,root:f.directory}).reasons.includes('qualification-counterexample-execution-root-mismatch'));
  // The explicit historical execution root differs from the evaluating source
  // checkout (ROOT); reading retained evidence need not relocate old execution.
  assert.notEqual(f.root,ROOT);assert.equal(validateQualificationCounterexamples(options).valid,true);
});

const longCounterexampleBody=`const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit'});let stopping=false;child.once('exit',()=>{if(stopping)process.exit(0);});process.on('SIGTERM',()=>{stopping=true;child.kill('SIGTERM');});fs.writeFileSync(__MARKER__,JSON.stringify({suite:process.pid,descendant:child.pid}));console.log('actual active counterexample');await new Promise(()=>{});`;
async function waitForFile(file,timeoutMs=10000) {const deadline=Date.now()+timeoutMs;while(!fs.existsSync(file)&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,10));assert.ok(fs.existsSync(file),file);}
async function assertProcessesClosed(pids) {for(const pid of Object.values(pids)){const deadline=Date.now()+2000;while(Date.now()<deadline){try{process.kill(pid,0);await new Promise(resolve=>setTimeout(resolve,10));}catch(error){assert.equal(error.code,'ESRCH');break;}}assert.throws(()=>process.kill(pid,0),error=>error.code==='ESRCH');}}

test('资格反例收集中断实际进程组与后代，保留partial且后续套件未启动',async t=>{
  for(const signalName of ['SIGINT','SIGTERM']) {
    const f=counterexampleFixture(t,{firstBody:longCounterexampleBody}),entry=path.join(f.directory,'collect.mjs'),outcome=path.join(f.directory,'outcome.json'),partial=path.join(f.output,'partial.json');
    const url=new URL('../.template-source/scripts/lib/verification-qualification.mjs',import.meta.url).href;
    fs.writeFileSync(entry,`import fs from 'node:fs';import {collectQualificationCounterexamples} from ${JSON.stringify(url)};const controller=new AbortController();const onInt=()=>controller.abort('SIGINT'),onTerm=()=>controller.abort('SIGTERM');process.on('SIGINT',onInt);process.on('SIGTERM',onTerm);try{const corpus=await collectQualificationCounterexamples({root:${JSON.stringify(f.root)},directory:${JSON.stringify(f.output)},signal:controller.signal,onProgress:value=>fs.writeFileSync(${JSON.stringify(partial)},JSON.stringify(value))});fs.writeFileSync(${JSON.stringify(outcome)},JSON.stringify(corpus));process.exitCode=corpus.status==='interrupted'?130:1;}finally{process.off('SIGINT',onInt);process.off('SIGTERM',onTerm);}`);
    const parent=spawn(process.execPath,[entry],{stdio:['ignore','pipe','pipe']}),closed=new Promise(resolve=>parent.once('close',(code,signal)=>resolve({code,signal})));let stderr='';parent.stderr.on('data',bytes=>stderr+=bytes);parent.stdout.resume();t.after(()=>{if(parent.exitCode===null)parent.kill('SIGKILL');});
    await waitForFile(f.marker);const active=JSON.parse(fs.readFileSync(partial));assert.equal(active.status,'running');assert.equal(active.active_suite.file,f.files[0]);assert.equal(active.suites.length,0);
    parent.kill(signalName);assert.deepEqual(await closed,{code:130,signal:null},stderr);
    const corpus=JSON.parse(fs.readFileSync(outcome));assert.equal(corpus.status,'interrupted');assert.equal(corpus.suites.length,1);assert.equal(corpus.suites[0].termination,'cancelled');assert.deepEqual(corpus.unexecuted_suites,f.files.slice(1));assert.deepEqual(fs.readFileSync(f.startedFile,'utf8').trim().split('\n'),[f.files[0]]);
    assert.deepEqual(JSON.parse(fs.readFileSync(partial)),corpus);const suite=corpus.suites[0];assert.equal(suite.source_sha256,f.bindings.source_files[suite.file]);assert.equal(suite.command,process.execPath);assert.equal(suite.cwd,f.root);assert.equal(suite.args.at(-1),f.files[0]);
    for(const stream of ['stdout','stderr'])assert.equal(suite[stream+'_sha256'],hash(fs.readFileSync(path.join(f.output,suite[stream+'_ref']))));assert.match(fs.readFileSync(path.join(f.output,suite.stdout_ref),'utf8'),/actual active counterexample/);
    assert.equal(validateQualificationCounterexamples({root:f.root,directory:f.output,corpus,bindings:f.bindings}).valid,false);await assertProcessesClosed(JSON.parse(fs.readFileSync(f.marker)));
  }
});

test('资格反例收集真实超时停止后续套件，原始close与日志不能授予资格',async t=>{
  const f=counterexampleFixture(t,{firstBody:longCounterexampleBody}),partial=path.join(f.output,'partial.json'),corpus=await collectQualificationCounterexamples({root:f.root,directory:f.output,timeoutMs:300,onProgress:value=>fs.writeFileSync(partial,JSON.stringify(value))});
  assert.equal(corpus.status,'failed');assert.equal(corpus.suites.length,1);assert.equal(corpus.suites[0].status,124);assert.equal(corpus.suites[0].termination,'timeout');assert.equal(corpus.suites[0].timeout_ms,300);assert.deepEqual(corpus.unexecuted_suites,f.files.slice(1));assert.deepEqual(fs.readFileSync(f.startedFile,'utf8').trim().split('\n'),[f.files[0]]);assert.deepEqual(JSON.parse(fs.readFileSync(partial)),corpus);
  const suite=corpus.suites[0];assert.ok(suite.actual_close.code!==null||suite.actual_close.signal!==null);for(const stream of ['stdout','stderr'])assert.equal(suite[stream+'_sha256'],hash(fs.readFileSync(path.join(f.output,suite[stream+'_ref']))));assert.equal(validateQualificationCounterexamples({root:f.root,directory:f.output,corpus,bindings:f.bindings}).valid,false);await assertProcessesClosed(JSON.parse(fs.readFileSync(f.marker)));
});

test('资格反例收集边界取消与真实失败不会启动后续套件',async t=>{
  for(const boundary of ['before','active','closed','failed']) {
    const f=counterexampleFixture(t,{firstBody:boundary==='failed'?'throw Error("actual counterexample assertion failure")':''}),controller=new AbortController();if(boundary==='before')controller.abort('before-collection');
    const corpus=await collectQualificationCounterexamples({root:f.root,directory:f.output,signal:controller.signal,onProgress:async value=>{
      if(boundary==='active'&&value.active_suite)controller.abort('before-spawn');
      if(boundary==='closed'&&value.suites.length===1&&value.status==='running')controller.abort('between-suites');
    }});
    assert.equal(corpus.status,boundary==='failed'?'failed':'interrupted');assert.equal(corpus.active_suite,undefined);assert.equal(validateQualificationCounterexamples({root:f.root,directory:f.output,corpus,bindings:f.bindings}).valid,false);
    if(['before','active'].includes(boundary)){assert.equal(corpus.suites.length,0);assert.equal(fs.existsSync(f.startedFile),false);assert.deepEqual(corpus.unexecuted_suites,f.files);}
    else {assert.equal(corpus.suites.length,1);assert.deepEqual(fs.readFileSync(f.startedFile,'utf8').trim().split('\n'),[f.files[0]]);assert.deepEqual(corpus.unexecuted_suites,f.files.slice(1));}
  }
});

test('资格反例收集首次group SIGTERM EPERM保留错误并后备清理真实后代，后续套件不启动',async t=>{
  const f=counterexampleFixture(t,{firstBody:longCounterexampleBody}),entry=path.join(f.directory,'collect-eperm.mjs'),outcome=path.join(f.directory,'outcome.json'),attemptsFile=path.join(f.directory,'kill-attempts.json'),partial=path.join(f.output,'partial.json'),url=new URL('../.template-source/scripts/lib/verification-qualification.mjs',import.meta.url).href;
  fs.writeFileSync(entry,`import fs from 'node:fs';import {collectQualificationCounterexamples} from ${JSON.stringify(url)};const controller=new AbortController(),nativeKill=process.kill.bind(process),attempts=[];let injected=false;process.kill=(pid,signal)=>{const deny=!injected&&pid<0&&signal==='SIGTERM';attempts.push({pid,signal,injected:deny});fs.writeFileSync(${JSON.stringify(attemptsFile)},JSON.stringify(attempts));if(deny){injected=true;throw Object.assign(new Error('EPERM first group SIGTERM'),{code:'EPERM'});}return nativeKill(pid,signal);};const abort=()=>controller.abort('SIGINT');process.on('SIGINT',abort);try{const corpus=await collectQualificationCounterexamples({root:${JSON.stringify(f.root)},directory:${JSON.stringify(f.output)},signal:controller.signal,onProgress:value=>fs.writeFileSync(${JSON.stringify(partial)},JSON.stringify(value))});fs.writeFileSync(${JSON.stringify(outcome)},JSON.stringify(corpus));process.exitCode=corpus.status==='interrupted'?130:1;}finally{process.kill=nativeKill;process.off('SIGINT',abort);}`);
  const parent=spawn(process.execPath,[entry],{stdio:['ignore','pipe','pipe']}),closed=new Promise(resolve=>parent.once('close',(code,signal)=>resolve({code,signal})));let stderr='';parent.stderr.on('data',bytes=>stderr+=bytes);parent.stdout.resume();
  // Every PID/group below belongs to this bounded fixture. Red runs must clean
  // the still-active process tree too; their raw close is never fabricated.
  t.after(()=>{if(parent.exitCode===null)parent.kill('SIGKILL');if(fs.existsSync(attemptsFile))for(const row of JSON.parse(fs.readFileSync(attemptsFile)).filter(row=>row.pid<0)){try{process.kill(row.pid,'SIGKILL');}catch(error){if(error.code!=='ESRCH')throw error;}}});
  await waitForFile(f.marker);parent.kill('SIGINT');const close=await closed;assert.deepEqual(close,{code:130,signal:null},stderr);
  const corpus=JSON.parse(fs.readFileSync(outcome)),suite=corpus.suites[0],attempts=JSON.parse(fs.readFileSync(attemptsFile));assert.equal(corpus.status,'interrupted');assert.equal(corpus.suites.length,1);assert.equal(suite.code,130);assert.equal(suite.termination,'cancelled');assert.notEqual(suite.actual_close.code,130);assert.equal(suite.actual_close.observed,Number.isInteger(suite.actual_close.code));assert.ok(suite.actual_close.observed||suite.actual_close.signal!==null);assert.match(suite.error,/EPERM first group SIGTERM/);assert.deepEqual(suite.kill_errors,['EPERM first group SIGTERM']);
  // Node's test leader may handle the fallback SIGTERM and exit normally; its
  // raw close stays distinct from the supervision code. Close still cleans the
  // group even when the one-second escalation timer is no longer necessary.
  assert.equal(attempts[0].injected,true);assert.ok(attempts.some(row=>row.pid===attempts[0].pid&&row.signal==='SIGKILL'&&!row.injected),'post-close group cleanup must run');assert.deepEqual(fs.readFileSync(f.startedFile,'utf8').trim().split('\n'),[f.files[0]]);assert.deepEqual(corpus.unexecuted_suites,f.files.slice(1));assert.deepEqual(JSON.parse(fs.readFileSync(partial)),corpus);
  assert.equal(suite.actual_execution.file,process.execPath);assert.equal(suite.actual_execution.cwd,f.root);assert.ok(suite.actual_execution.args.includes('--test-concurrency=1'));for(const stream of ['stdout','stderr'])assert.equal(suite[stream+'_sha256'],hash(fs.readFileSync(path.join(f.output,suite[stream+'_ref']))));assert.equal(validateQualificationCounterexamples({root:f.root,directory:f.output,corpus,bindings:f.bindings}).valid,false);
  const pids=JSON.parse(fs.readFileSync(f.marker));pids.leader=-attempts[0].pid;await assertProcessesClosed(pids);
});

test('资格反例收集真实exit0不能覆盖关闭group SIGKILL EPERM且不启动后续套件',async t=>{
  const f=counterexampleFixture(t),entry=path.join(f.directory,'collect-cleanup-eperm.mjs'),outcome=path.join(f.directory,'outcome.json'),attemptsFile=path.join(f.directory,'kill-attempts.json'),url=new URL('../.template-source/scripts/lib/verification-qualification.mjs',import.meta.url).href;
  fs.writeFileSync(entry,`import fs from 'node:fs';import {collectQualificationCounterexamples} from ${JSON.stringify(url)};const nativeKill=process.kill.bind(process),attempts=[];let injected=false;process.kill=(pid,signal)=>{const deny=!injected&&pid<0&&signal==='SIGKILL';attempts.push({pid,signal,injected:deny});fs.writeFileSync(${JSON.stringify(attemptsFile)},JSON.stringify(attempts));if(deny){injected=true;throw Object.assign(new Error('EPERM post-close group SIGKILL'),{code:'EPERM'});}return nativeKill(pid,signal);};try{const corpus=await collectQualificationCounterexamples({root:${JSON.stringify(f.root)},directory:${JSON.stringify(f.output)}});fs.writeFileSync(${JSON.stringify(outcome)},JSON.stringify(corpus));process.exitCode=corpus.status==='failed'?1:0;}finally{process.kill=nativeKill;}`);
  const parent=spawn(process.execPath,[entry],{stdio:['ignore','pipe','pipe']}),closed=new Promise(resolve=>parent.once('close',(code,signal)=>resolve({code,signal})));parent.stdout.resume();parent.stderr.resume();t.after(()=>{if(parent.exitCode===null)parent.kill('SIGKILL');});assert.deepEqual(await closed,{code:1,signal:null});
  const corpus=JSON.parse(fs.readFileSync(outcome)),suite=corpus.suites[0];assert.equal(corpus.status,'failed');assert.equal(corpus.suites.length,1);assert.equal(suite.code,1);assert.equal(suite.status,1);assert.deepEqual(suite.actual_close,{code:0,signal:null,observed:true});assert.equal(suite.termination,null);assert.deepEqual(suite.kill_errors,['EPERM post-close group SIGKILL']);assert.match(suite.error,/EPERM post-close group SIGKILL/);assert.deepEqual(fs.readFileSync(f.startedFile,'utf8').trim().split('\n'),[f.files[0]]);assert.deepEqual(corpus.unexecuted_suites,f.files.slice(1));assert.equal(validateQualificationCounterexamples({root:f.root,directory:f.output,corpus,bindings:f.bindings}).valid,false);
  assert.equal(JSON.parse(fs.readFileSync(attemptsFile))[0].injected,true);for(const stream of ['stdout','stderr'])assert.equal(suite[stream+'_sha256'],hash(fs.readFileSync(path.join(f.output,suite[stream+'_ref']))));assert.match(fs.readFileSync(path.join(f.output,suite.stdout_ref),'utf8'),/^ok /m);
});
async function observedProof(t) {
  const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'qualification-observed-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const proof={schema_version:1,kind:'template-verification-qualification',scope:'pilot',status:'passed',bindings:{fixture:'source-bytes'},pairs:[],negative_cases:[],route_cases:[]};
  async function execute(name,side,{failure=false,reused=false,missing=false}={}) {
    const output=path.join(directory,name);fs.mkdirSync(output);
    const measured=await measureQualificationRun({directory,reference:`${name}.measurement.json`,execute:async()=>{
    const source=failure?'console.error("refusal");process.exit(7)':`Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,${side==='legacy'?500:5});console.log("observed")`;
    const startedAt=new Date().toISOString(),start=performance.now(),result=spawnSync(process.execPath,['-e',source],{encoding:'utf8'}),wallMs=Math.round(performance.now()-start);
    assert.equal(result.status,failure?7:0);assert.equal(result.signal,null);
    const stdoutFile=path.join(output,'stdout.log'),stderrFile=path.join(output,'stderr.log');fs.writeFileSync(stdoutFile,result.stdout);fs.writeFileSync(stderrFile,result.stderr);
    const task={id:'check.fixture',task_id:'legacy.fixture',group:'fixture',command:`node -e ${source}`,gate_ids:['check.fixture-gate']};
    const row={...task,index:0,code:result.status,actual_exit_code:result.status,actual_exit_signal:null,actual_exit_code_observed:true,stdoutFile,stderrFile,duration_ms:wallMs};
    const report={schema_version:2,kind:'template-verification-report',purpose:'qualification',experimental:true,status:failure?'failed':'passed',started_at:startedAt,finished_at:new Date().toISOString(),metrics:{wall_ms:wallMs},plan:{strategy:side==='legacy'?'legacy-reference':'qualification-shadow',commands:[task]},environment:{node:process.version,platform:process.platform,arch:process.arch,cpus:2,load_average:[Math.random()],concurrency:side==='legacy'?1:2,tooling_mode:side==='legacy'?'legacy':'optimized'},input_sha256:'bound-input',input_after_sha256:'bound-input',input_drift:false,results:[row],unexecuted:[],final_exit:{code:result.status,signal:null,observed:true}};
    if(reused){const duplicate={...task,task_id:'legacy.duplicate'};report.plan.commands.push(duplicate);report.results.push({...row,...duplicate,index:1,reused:true,reused_from:{task_id:row.task_id},actual_exit_code:null,actual_exit_code_observed:false});}
    if(missing){const expensive={...task,task_id:'legacy.unexecuted',command:'expensive pending'};report.plan.commands.push(expensive);report.unexecuted.push({...expensive,reason:'preflight-failed'});}
    const reportFile=path.join(output,'report.json');fs.writeFileSync(reportFile,JSON.stringify(report));
    return {reportFile,observed:true,code:result.status,signal:result.signal};
    }});
    return {...qualificationRunEvidence(measured.result,{directory,wallMs:measured.wall_ms}),measurement:measured.measurement};
  }
  for(let index=0;index<5;index++) {
    const pair={pair_id:`actual.${index}`,order:index%2?['candidate','legacy']:['legacy','candidate']};
    for(const side of pair.order)pair[side]=await execute(`${index}-${side}`,side,{reused:index===0});
    proof.pairs.push(pair);
  }
  proof.negative_cases.push({category:'environment-missing',covered_old_ids:['legacy.fixture'],expected_gate_ids:['check.fixture-gate'],legacy:await execute('negative-legacy','legacy',{failure:true,missing:true}),candidate:await execute('negative-candidate','candidate',{failure:true,missing:true})});
  const reportFile=path.join(directory,'qualification.json'),save=()=>fs.writeFileSync(reportFile,JSON.stringify(proof));save();
  const validate=()=>validateQualification({root:directory,config:{},reportFile,expectedBindings:proof.bindings,scope:'pilot'});
  return {directory,proof,reportFile,save,validate};
}

test('只有 passed 布尔值与虚构时间数组不能授予资格', t => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'qualification-contract-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const reportFile=path.join(root,'qualification.json');fs.writeFileSync(reportFile,JSON.stringify({kind:'verification-allowlist-qualification',status:'passed',negative_cases_passed:true,related_failures_omitted:0,timing:{baseline_samples:[100,101,102,103,104],candidate_samples:[10,11,12,13,14]}}));
  assert.equal(validateQualification({root,config:{},reportFile,expectedBindings:{}}).valid,false);
});

test('配对性能验收要求至少五轮、20% 中位降幅与最慢样本不回退', () => {
  assert.throws(()=>qualificationPerformance([100,100,100],[10,10,10]),/five/);
  assert.equal(qualificationPerformance([100,100,100,100,100],[79,80,80,80,100]).passed,true);
  assert.equal(qualificationPerformance([100,100,100,100,100],[79,80,80,80,101]).passed,false);
  assert.equal(qualificationPerformance([100,100,100,100,100],[79,81,81,81,100]).passed,false);
});

test('真实五对进程与失败日志建立 pilot 资格，负载观测变化和同轮复用不伪造退出',async t=>{
  const f=await observedProof(t);assert.deepEqual(f.validate().reasons,[]);assert.equal(f.validate().valid,true);
  const run=f.proof.negative_cases[0].candidate,file=path.join(f.directory,run.report_ref),report=JSON.parse(fs.readFileSync(file));
  report.unexecuted[0].command='forged pending';fs.writeFileSync(file,JSON.stringify(report));run.report_sha256=hash(fs.readFileSync(file));f.save();
  assert.ok(f.validate().reasons.includes('qualification-run-task-missing'));
});

test('配对顺序、瞬时真实退出、结果及日志被篡改均不能继承资格',async t=>{
  const f=await observedProof(t);
  f.proof.pairs[1].order=['legacy','candidate'];f.save();assert.ok(f.validate().reasons.includes('qualification-pair-order-invalid'));
  f.proof.pairs[1].order=['candidate','legacy'];
  const run=f.proof.pairs[1].candidate,file=path.join(f.directory,run.report_ref),report=JSON.parse(fs.readFileSync(file));
  const finalExit=report.final_exit;delete report.final_exit;fs.writeFileSync(file,JSON.stringify(report));run.report_sha256=hash(fs.readFileSync(file));f.save();assert.ok(f.validate().reasons.includes('qualification-close-binding-mismatch'));
  report.final_exit={...finalExit,observed:false};fs.writeFileSync(file,JSON.stringify(report));run.report_sha256=hash(fs.readFileSync(file));f.save();assert.ok(f.validate().reasons.includes('qualification-close-binding-mismatch'));
  report.final_exit=finalExit;
  report.results[0].actual_exit_code_observed=false;fs.writeFileSync(file,JSON.stringify(report));run.report_sha256=hash(fs.readFileSync(file));f.save();assert.ok(f.validate().reasons.includes('qualification-task-close-not-observed'));
  report.results[0].actual_exit_code_observed=true;report.results=[];fs.writeFileSync(file,JSON.stringify(report));run.report_sha256=hash(fs.readFileSync(file));f.save();assert.ok(f.validate().reasons.includes('qualification-run-task-missing'));
  report.results=[{...report.plan.commands[0],index:0,code:0,actual_exit_code:0,actual_exit_code_observed:true,actual_exit_signal:null,stdoutFile:path.join(path.dirname(file),'stdout.log'),stderrFile:path.join(path.dirname(file),'stderr.log')}];fs.writeFileSync(file,JSON.stringify(report));run.report_sha256=hash(fs.readFileSync(file));f.save();fs.appendFileSync(report.results[0].stdoutFile,'tampered');assert.ok(f.validate().reasons.includes('qualification-evidence-digest-mismatch'));
});

test('资格计时只消费完整 callback 单调时钟回执，不能孤立放大或缩短真实时长',async t=>{
  const f=await observedProof(t);assert.equal(f.validate().valid,true);
  const run=f.proof.pairs[0].legacy,original=run.wall_ms;
  const boundMeasurement=run.measurement;delete run.measurement;f.save();assert.ok(f.validate().reasons.includes('qualification-evidence-reference-invalid'));run.measurement=boundMeasurement;
  run.wall_ms*=10;f.save();assert.ok(f.validate().reasons.includes('qualification-measurement-duration-mismatch'));
  run.wall_ms=1;f.save();assert.ok(f.validate().reasons.includes('qualification-measurement-duration-mismatch'));
  run.wall_ms=original;
  const reference=run.measurement,receiptFile=path.join(f.directory,reference.ref),bytes=fs.readFileSync(receiptFile),receipt=JSON.parse(bytes);
  receipt.wall_ms=1;receipt.finished_monotonic_ns=String(BigInt(receipt.started_monotonic_ns)+1000000n);receipt.finished_at=new Date(Date.parse(receipt.started_at)+1).toISOString();
  fs.writeFileSync(receiptFile,JSON.stringify(receipt));run.measurement={...reference,sha256:hash(fs.readFileSync(receiptFile))};run.wall_ms=1;f.save();
  assert.ok(f.validate().reasons.includes('qualification-measurement-shorter-than-supervision'));
  fs.writeFileSync(receiptFile,bytes);run.measurement=reference;run.wall_ms=original;f.save();assert.equal(f.validate().valid,true);
  f.proof.pairs[1].legacy=structuredClone(f.proof.pairs[0].legacy);f.save();assert.ok(f.validate().reasons.includes('qualification-measurement-order-invalid'));
});

test('缺少可信 bootstrap baseline 时资格 driver 在创建输出和执行前拒绝',async t=>{
  const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'qualification-bootstrap-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const output=path.join(directory,'evidence');let executed=false;
  await assert.rejects(()=>runQualification({root:directory,config:{},output,executePairSide:async()=>{executed=true;}}),/bootstrap-baseline-invalid/);
  assert.equal(executed,false);assert.equal(fs.existsSync(output),false);
});

function qualificationDriverFixture(t) {
  const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'qualification-driver-stop-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const root=path.join(directory,'root');fs.mkdirSync(path.join(root,'scripts'),{recursive:true});fs.writeFileSync(path.join(root,'scripts/repository-mode'),'console.log("template-source");\n');
  fs.mkdirSync(path.join(root,'.template-source/scripts/lib'),{recursive:true});fs.copyFileSync(new URL('../.template-source/scripts/lib/verification-preflight.mjs',import.meta.url),path.join(root,'.template-source/scripts/lib/verification-preflight.mjs'));
  for(const args of [['init','-q'],['add','.'],['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture']]){const result=spawnSync('git',args,{cwd:root,encoding:'utf8'});assert.equal(result.status,0,result.stderr);}
  const commit=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim();
  const plan={strategy:'qualified-gates',requested_profile:'candidate',effective_profile:'candidate',source_requirement:'current',required_files:[],syntax_files:[],groups:['check'],selection:{effective:'legacy',omitted:[]},representative_commit:commit,commands:[]};
  return {directory,root,plan};
}
test('资格driver全部真实正对完成后负例阶段改变helper仍被完整输入终检拒绝',async t=>{
  const f=qualificationDriverFixture(t),helper=path.join(f.root,'schemas/shared-helper.json');fs.mkdirSync(path.dirname(helper));fs.writeFileSync(helper,'{"version":1}\n');
  for(const args of [['add','.'],['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','bound helper']])assert.equal(spawnSync('git',args,{cwd:f.root,encoding:'utf8'}).status,0);
  const commit=spawnSync('git',['rev-parse','HEAD'],{cwd:f.root,encoding:'utf8'}).stdout.trim(),started=[],quote=value=>`'${String(value).replaceAll("'","'\\''")}'`;
  const makePlans=({changedFiles=[]})=>Object.fromEntries(['legacy','candidate'].map(side=>{
    const source=changedFiles.includes('negative-case')?'console.error("actual negative refusal");process.exit(7)':`Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,${side==='legacy'?120:1});console.log("actual paired process")`;
    const task={id:'check.fixture',task_id:'legacy.fixture',group:'check',gate_ids:['check.fixture-gate'],command:`${quote(process.execPath)} -e ${quote(source)}`};
    return [side,{...f.plan,strategy:side==='legacy'?'legacy-reference':'qualification-shadow',representative_commit:commit,commands:[task]}];
  }));
  const execute=async options=>{
    started.push(path.basename(options.reportDir));fs.mkdirSync(options.reportDir);const start=performance.now(),input=verificationInputDigest(f.root),report=createVerificationReport(options.plan,{root:f.root,inputDigest:input,concurrency:options.concurrency});
    report.purpose='qualification';report.experimental=true;report.environment.tooling_mode=options.toolingMode;
    const task=options.plan.commands[0],row=await runCommandToFiles(task.command,{cwd:f.root,logRoot:options.reportDir,sequence:0,signal:options.signal});report.results=[{...task,...row,index:0}];
    report.input_after_sha256=verificationInputDigest(f.root);report.input_drift=report.input_after_sha256!==input;finalizeVerificationReport(report,{status:row.code===0?'passed':'failed',wallMs:Math.round(performance.now()-start),repositoryMode:'template-source'});report.final_exit={code:row.actual_exit_code,signal:row.actual_exit_signal,observed:row.actual_exit_code_observed};
    const reportFile=path.join(options.reportDir,'report.json');fs.writeFileSync(reportFile,JSON.stringify(report));
    if(path.basename(options.reportDir)==='negative.0-candidate')fs.appendFileSync(helper,'actual post-pair source drift\n');
    return {report,reportFile,code:row.code,signal:row.actual_exit_signal,observed:row.actual_exit_code_observed};
  };
  const result=await runQualification({root:f.root,config:{},bindings:{fixture:'actual-process-input-final-check'},scope:'pilot',output:path.join(f.directory,'evidence'),makePlans,executePairSide:execute,negativeCases:[{id:'negative',category:'environment-missing',changed_files:['negative-case'],covered_old_ids:['legacy.fixture'],expected_gate_ids:['check.fixture-gate']}]});
  assert.equal(result.proof.pairs.length,5);assert.equal(result.proof.negative_cases.length,1);assert.equal(started.length,12);assert.equal(result.status,'failed');assert.deepEqual(result.proof.errors,['qualification-input-drift']);assert.equal(result.proof.performance,null);
  for(const pair of result.proof.pairs)for(const side of pair.order){assert.deepEqual(pair[side].actual_close,{code:0,signal:null,observed:true});assert.ok(fs.existsSync(path.join(path.dirname(result.reportFile),pair[side].report_ref)));}
  assert.equal(validateQualification({root:f.root,config:{},reportFile:result.reportFile,expectedBindings:result.proof.bindings,scope:'pilot'}).valid,false);
});
test('资格配对一侧真实失败立即停止，保留partial pair且候选侧未启动',async t=>{
  const f=qualificationDriverFixture(t),started=[],quote=value=>`'${String(value).replaceAll("'","'\\''")}'`;
  f.plan.commands=[{id:'check.fail',task_id:'fixture.failure',group:'check',command:`${quote(process.execPath)} -e ${quote('console.error("actual legacy failure");process.exit(7)')}`}];
  const result=await runQualification({root:f.root,config:{},bindings:{fixture:'bounded-process'},scope:'pilot',output:path.join(f.directory,'evidence'),
    makePlans:()=>({legacy:f.plan,candidate:f.plan}),executePairSide:async options=>{started.push(options.side);return executeVerificationPlan(options);}});
  assert.deepEqual(started,['legacy']);assert.equal(result.status,'failed');assert.equal(result.proof.pairs.length,0);
  const partial=result.proof.active_pair;assert.equal(partial.status,'failed');assert.equal(partial.candidate,undefined);assert.equal(partial.legacy.actual_close.code,1);
  const report=JSON.parse(fs.readFileSync(path.join(path.dirname(result.reportFile),partial.legacy.report_ref)));assert.equal(report.results.find(row=>row.task_id==='fixture.failure').actual_exit_code,7);
  assert.equal(report.final_exit.observed,true);assert.ok(fs.existsSync(report.results.find(row=>row.task_id==='fixture.failure').stderrFile));
});

test('资格入口持久处理中断，真实legacy和后代关闭后不启动candidate并保留原始证据',async t=>{
  for(const signalName of ['SIGINT','SIGTERM']) {
    const f=qualificationDriverFixture(t),marker=path.join(f.directory,'legacy-pids.json'),startedFile=path.join(f.directory,'started.json'),outcomeFile=path.join(f.directory,'outcome.json'),entry=path.join(f.directory,'driver.mjs'),quote=value=>`'${String(value).replaceAll("'","'\\''")}'`;
    const source=`const fs=require('node:fs'),{spawn}=require('node:child_process');const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});child.once('exit',()=>process.exit(130));process.on('SIGTERM',()=>child.kill('SIGTERM'));process.on('SIGINT',()=>child.kill('SIGTERM'));console.log('actual legacy long process');fs.writeFileSync(${JSON.stringify(marker)},JSON.stringify({pid:process.pid,descendant:child.pid}));setInterval(()=>{},1000);`;
    f.plan.commands=[{id:'check.wait',task_id:'fixture.wait',group:'check',command:`${quote(process.execPath)} -e ${quote(source)}`}];
    const driverUrl=new URL('../.template-source/scripts/qualify-template-verification.mjs',import.meta.url).href,workerUrl=new URL('../.template-source/scripts/lib/template-verification-worker.mjs',import.meta.url).href;
    fs.writeFileSync(entry,`import fs from 'node:fs';import {runQualificationWithSignals} from ${JSON.stringify(driverUrl)};import {executeVerificationPlan} from ${JSON.stringify(workerUrl)};
const started=[],before={SIGINT:process.listenerCount('SIGINT'),SIGTERM:process.listenerCount('SIGTERM')},plan=${JSON.stringify(f.plan)};
const result=await runQualificationWithSignals({root:${JSON.stringify(f.root)},config:{},bindings:{fixture:'bounded-process'},scope:'pilot',output:${JSON.stringify(path.join(f.directory,'evidence'))},makePlans:()=>({legacy:plan,candidate:plan}),executePairSide:async options=>{started.push(options.side);fs.writeFileSync(${JSON.stringify(startedFile)},JSON.stringify(started));return executeVerificationPlan(options);}});
fs.writeFileSync(${JSON.stringify(outcomeFile)},JSON.stringify({result,before,after:{SIGINT:process.listenerCount('SIGINT'),SIGTERM:process.listenerCount('SIGTERM')}}));process.exitCode=result.status==='interrupted'?130:1;
`);
    const child=spawn(process.execPath,[entry],{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',data=>stdout+=data);child.stderr.on('data',data=>stderr+=data);
    t.after(()=>{try{child.kill('SIGTERM');}catch{}});
    const closed=new Promise(resolve=>child.once('close',(code,signal)=>resolve({code,signal}))),deadline=Date.now()+10000;
    while(!fs.existsSync(marker)&&Date.now()<deadline&&child.exitCode===null)await new Promise(resolve=>setTimeout(resolve,10));
    assert.ok(fs.existsSync(marker),stderr);const pids=JSON.parse(fs.readFileSync(marker));child.kill(signalName);
    const close=await Promise.race([closed,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('qualification interrupt close timeout')),10000);timer.unref();})]);
    assert.deepEqual(close,{code:130,signal:null},stderr);const {result,before,after}=JSON.parse(fs.readFileSync(outcomeFile));assert.deepEqual(after,before);
    assert.deepEqual(JSON.parse(fs.readFileSync(startedFile)),['legacy']);assert.equal(result.status,'interrupted');assert.equal(result.proof.pairs.length,0);assert.equal(result.proof.active_pair.status,'interrupted');assert.equal(result.proof.active_pair.candidate,undefined);assert.deepEqual(result.proof.active_pair.unexecuted_sides,['candidate']);assert.equal(result.proof.interruption_reason,signalName);
    const run=result.proof.active_pair.legacy,reportFile=path.join(path.dirname(result.reportFile),run.report_ref),report=JSON.parse(fs.readFileSync(reportFile));
    assert.equal(run.report_sha256,hash(fs.readFileSync(reportFile)));assert.deepEqual(run.actual_close,report.final_exit);assert.equal(report.status,'interrupted');assert.equal(report.final_exit.observed,true);assert.equal(report.final_exit.code,130);
    const row=report.results.find(item=>item.task_id==='fixture.wait');assert.ok(row);for(const ref of [row.stdoutFile,row.stderrFile]){assert.ok(fs.existsSync(ref));assert.equal(run.log_digests[ref],hash(fs.readFileSync(ref)));}
    assert.ok(fs.existsSync(path.join(path.dirname(result.reportFile),run.measurement.ref)));assert.ok(stdout.includes('actual legacy long process'));
    for(const pid of Object.values(pids)){const until=Date.now()+1000;while(Date.now()<until){try{process.kill(pid,0);await new Promise(resolve=>setTimeout(resolve,10));}catch(error){assert.equal(error.code,'ESRCH');break;}}assert.throws(()=>process.kill(pid,0),error=>error.code==='ESRCH');}
  }
});

test('资格worker真实SIGKILL的未观察退出仍保留partial原始报告和close且不能授予资格',async t=>{
  const f=qualificationDriverFixture(t),marker=path.join(f.directory,'task-pid'),controller=new AbortController(),started=[],quote=value=>`'${String(value).replaceAll("'","'\\''")}'`;
  f.plan.commands=[{id:'check.wait',task_id:'fixture.wait',group:'check',command:`${quote(process.execPath)} -e ${quote(`console.log('actual forced-close task');require('node:fs').writeFileSync(${JSON.stringify(marker)},String(process.pid));setInterval(()=>{},1000);`)}`}];
  let workerPid,taskPid;
  const result=await runQualificationWithSignals({root:f.root,config:{},bindings:{fixture:'bounded-process'},scope:'pilot',signal:controller.signal,output:path.join(f.directory,'evidence'),makePlans:()=>({legacy:f.plan,candidate:f.plan}),executePairSide:async options=>{
    started.push(options.side);const execution=executeVerificationPlan(options),deadline=Date.now()+10000;
    while(!fs.existsSync(marker)&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,10));assert.ok(fs.existsSync(marker));taskPid=Number(fs.readFileSync(marker));
    let current=taskPid;for(let index=0;index<10;index++){const parent=Number(spawnSync('ps',['-p',String(current),'-o','ppid='],{encoding:'utf8'}).stdout.trim());if(parent===process.pid){workerPid=current;break;}assert.ok(parent>1);current=parent;}
    assert.ok(workerPid>1);controller.abort('forced-worker-close');process.kill(workerPid,'SIGKILL');return execution;
  }});
  assert.deepEqual(started,['legacy']);assert.equal(result.status,'interrupted');assert.equal(result.proof.pairs.length,0);
  const run=result.proof.active_pair.legacy;assert.equal(run.diagnostic,true);assert.equal(run.execution_outcome.observed,false);assert.deepEqual(run.actual_close,{code:null,signal:'SIGKILL',observed:false});
  const reportFile=path.join(path.dirname(result.reportFile),run.report_ref),report=JSON.parse(fs.readFileSync(reportFile));assert.deepEqual(report.final_exit,run.actual_close);assert.equal(run.report_sha256,hash(fs.readFileSync(reportFile)));
  assert.ok(report.results.length);for(const row of report.results)for(const ref of [row.stdoutFile,row.stderrFile])if(ref){assert.ok(fs.existsSync(ref));assert.equal(run.log_digests[ref],hash(fs.readFileSync(ref)));}
  const rawLogs=fs.readdirSync(path.join(path.dirname(reportFile),'logs')).filter(ref=>/\.(?:stdout|stderr)$/.test(ref));assert.ok(rawLogs.length>=4);for(const ref of rawLogs){const file=path.join(path.dirname(reportFile),'logs',ref);assert.equal(run.log_digests[file],hash(fs.readFileSync(file)));}
  assert.equal(result.proof.active_pair.candidate,undefined);assert.deepEqual(result.proof.active_pair.unexecuted_sides,['candidate']);
  assert.equal(validateQualification({root:f.root,config:{},reportFile:result.reportFile,expectedBindings:result.proof.bindings,scope:'pilot'}).valid,false);
  for(const pid of [workerPid,taskPid]){const until=Date.now()+1000;while(Date.now()<until){try{process.kill(pid,0);await new Promise(resolve=>setTimeout(resolve,10));}catch(error){assert.equal(error.code,'ESRCH');break;}}assert.throws(()=>process.kill(pid,0),error=>error.code==='ESRCH');}
});

test('独立资格编译器拒绝成对删除 syntax、preflight、prepare、cleanup 与 Gate 台账',t=>{
  const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'qualification-ledger-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const commit=spawnSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).stdout.trim(),config=loadVerificationProfiles(),proof={baseline:{base_sha:commit},representative_commit:commit,representative_changed_files:['README.md']};
  const plans=compileQualificationPlans({root:ROOT,config,changedFiles:['README.md'],commit});
  for(const side of ['legacy','candidate']) {
    const plan=addVerificationExecutionTasks(plans[side],{root:ROOT,reportDir:directory,purpose:'qualification',reference:side==='legacy',fixedCommit:commit}),report={root:ROOT,plan};
    const validate=value=>validateQualificationPlanLedger({root:ROOT,config,proof,report:value,reportDirectory:directory,side});
    assert.equal(validate(report).valid,true);
    for(const kind of ['syntax','preflight','artifact-prepare','cleanup']) {
      const tampered=structuredClone(report),removed=tampered.plan.commands.find(task=>task.kind===kind);assert.ok(removed,kind);
      tampered.plan.commands=tampered.plan.commands.filter(task=>task.task_id!==removed.task_id);tampered.results=[];
      assert.ok(validate(tampered).reasons.includes('qualification-independent-plan-ledger-mismatch'),kind);
    }
    if(side==='candidate') {
      const removed=plan.commands.find(task=>task.task_id==='supplemental.optimization-regressions');assert.ok(removed);
      const tampered=structuredClone(report);tampered.plan.commands=tampered.plan.commands.filter(task=>task.task_id!==removed.task_id);tampered.results=[];assert.equal(validate(tampered).valid,false);
    }else assert.ok(!plan.commands.some(task=>task.task_id==='supplemental.optimization-regressions'));
    if(side==='candidate'){const tampered=structuredClone(report);tampered.plan.gates=[];assert.equal(validate(tampered).valid,false);}
    const drifted=structuredClone(report);drifted.plan.changed_files=[];assert.equal(validate(drifted).valid,false);
    for(const mutate of [r=>r.plan.source_requirement='current',r=>r.plan.tooling.test_concurrency=4]){const tampered=structuredClone(report);mutate(tampered);assert.equal(validate(tampered).valid,false);}
    const source=plan.commands.find(task=>task.task_id==='legacy.010'),batch=plan.commands.find(task=>task.execution&&!task.execution.source_consumer_ref);assert.ok(source);assert.ok(batch);
    for(const [id,mutate]of [
      [source.task_id,task=>delete task.execution],
      [source.task_id,task=>task.execution.cwd='/different/consumer'],
      [source.task_id,task=>task.execution.environment.YSS_SPEC_TEMPLATE_REF='f'.repeat(40)],
      [source.task_id,task=>task.execution.environment.YSS_SPEC_TEMPLATE_REPO='/different/source'],
      [batch.task_id,task=>task.execution.args=task.execution.args.filter(arg=>arg!=='--test-concurrency=1')],
      [batch.task_id,task=>task.resources=['unapproved-resource']],
      [batch.task_id,task=>task.timeout_ms=1],
      [batch.task_id,task=>task.lane='unapproved-lane'],
      [batch.task_id,task=>task.source_requirement='current'],
      [batch.task_id,task=>task.depends_on=[]],
    ]) {
      const tampered=structuredClone(report);mutate(tampered.plan.commands.find(task=>task.task_id===id));
      assert.ok(validate(tampered).reasons.includes('qualification-independent-plan-ledger-mismatch'),`${side}:${id}:${mutate}`);
    }
    // Historical roots may differ; reportDirectory stays the observed retained slot.
    const historical=JSON.parse(JSON.stringify(report).replaceAll(ROOT,'/retained/historical-source'));
    assert.equal(validate(historical).valid,true);
  }
});

// These are bounded consumer fixtures, not a complete Gate qualification run.
function qualificationEvidenceFixture(t,{source=false,reuse=false}={}) {
  const base=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'qualification-v2-evidence-')));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  const root=path.join(base,'source'),directory=path.join(base,'report');fs.mkdirSync(root);fs.mkdirSync(directory);
  const run=(file,args,cwd)=>{const result=spawnSync(file,args,{cwd,encoding:'utf8'});assert.equal(result.status,0,result.stderr);return result;};
  let artifact,receipt,manifest,commit;
  if(source) {
    const cli=path.join(root,'submodules/create-yss-spec');fs.mkdirSync(cli,{recursive:true});run('git',['init','-q'],root);run('git',['init','-q'],cli);
    const put=(ref,bytes,mode=0o644)=>{const file=path.join(cli,ref);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes,{mode});};
    put('package.json',JSON.stringify({name:'create-yss-spec',version:'1.0.0'}));put('bin/create-yss-spec.js','fixed public entry',0o755);
    put('tests/sync-fast-smoke.test.js',`const assert=require('node:assert/strict');const snapshot=require('../template.snapshot.json');assert.equal(snapshot.sourceState,'committed');assert.equal(snapshot.templateCommit,process.env.YSS_SPEC_TEMPLATE_REF);`);
    run('git',['add','.'],cli);run('git',['-c','user.name=fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixed CLI'],cli);const cliCommit=run('git',['rev-parse','HEAD'],cli).stdout.trim();
    run('git',['update-index','--add','--cacheinfo',`160000,${cliCommit},submodules/create-yss-spec`],root);run('git',['-c','user.name=fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixed source'],root);commit=run('git',['rev-parse','HEAD'],root).stdout.trim();
    const tuple={namespace:'candidate-release',family:'spec',cli_commit:cliCommit,template_commit:commit,core_commit:commit,package_name:'create-yss-spec',version:'1.0.0'},installed=path.join(directory,'installed');fs.mkdirSync(installed);
    for(const ref of ['package.json','bin/create-yss-spec.js']){fs.mkdirSync(path.dirname(path.join(installed,ref)),{recursive:true});fs.copyFileSync(path.join(cli,ref),path.join(installed,ref));}
    fs.writeFileSync(path.join(installed,'template.snapshot.json'),JSON.stringify({sourceState:'committed',templateCommit:commit,requestedRef:commit}));fs.writeFileSync(path.join(installed,'cli-core.lock.json'),JSON.stringify({sourceState:'committed',sourceRevision:commit}));
    const tarball=path.join(directory,'package.tgz');fs.writeFileSync(tarball,'controlled fixture package');
    artifact={source_tuple:tuple,tarball,tarball_sha256:hash(fs.readFileSync(tarball)),installed_root:installed,snapshot_sha256:hash(fs.readFileSync(path.join(installed,'template.snapshot.json'))),core_lock_sha256:hash(fs.readFileSync(path.join(installed,'cli-core.lock.json'))),installed_tree_sha256:installedTreeDigest(installed)};
    receipt=prepareCliSourceConsumer({root,source:tuple,artifact,directory:path.join(directory,'consumption/source-cli/spec'),run});
    manifest={schema_version:1,kind:'template-release-sources',root_commit:commit,families:['spec'],entries:[tuple]};
  }else fs.writeFileSync(path.join(root,'actual.test.mjs'),`import test from 'node:test';test('actual qualification consumer observation',()=>{});`);
  const first={id:'check.fixture',task_id:source?'legacy.010':'fixture.0',command:source?'node --test submodules/create-yss-spec/tests/sync-fast-smoke.test.js':'node --test actual.test.mjs',gate_ids:['check.fixture-gate'],depends_on:[],resources:['fixture-slot'],timeout_ms:10000,lane:'fixture',source_requirement:'committed'};
  first.execution=compileTaskExecution(first,{root,reportDir:directory,fixedCommit:commit});
  const plan={effective_profile:'release',source_requirement:'committed',strategy:'qualification-shadow',policy_digest:'a'.repeat(64),selection:{effective:'shadow',omitted:[]},gates:[{id:'check.fixture-gate',selected:true,check_ids:[first.id]}],commands:[first]};
  const execution=first.execution,stdoutFile=path.join(directory,'stdout.log'),stderrFile=path.join(directory,'stderr.log');
  const started=performance.now(),observation=spawnSync(execution.file,execution.args,{cwd:execution.cwd,env:{...process.env,...execution.environment},encoding:'utf8'}),wallMs=Math.round(performance.now()-started);
  assert.equal(observation.status,0,observation.stderr);fs.writeFileSync(stdoutFile,observation.stdout);fs.writeFileSync(stderrFile,observation.stderr);
  const invocation={command:'executeVerificationPlan',args:[]},report=createVerificationReport(plan,{root,inputDigest:'b'.repeat(64),concurrency:2,scope:{kind:'complete-candidate'},invocation,sourcesManifest:manifest});report.purpose='qualification';report.experimental=true;
  const row={...first,index:0,code:observation.status,actual_exit_code:observation.status,actual_exit_code_observed:true,actual_exit_signal:observation.signal,actual_execution:structuredClone(execution),stdoutFile,stderrFile,log_digests:{stdoutFile:hash(fs.readFileSync(stdoutFile)),stderrFile:hash(fs.readFileSync(stderrFile))}};
  if(source){fs.writeFileSync(execution.source_consumer_ref,JSON.stringify(receipt));const digest=hash(fs.readFileSync(execution.source_consumer_ref));row.actual_execution.source_receipt_sha256=digest;report.source_test_receipts=[{ref:execution.source_consumer_ref,sha256:digest}];report.artifacts=[artifact];}
  report.results.push(row);
  if(reuse){const second={...first,id:'check.fixture-duplicate',task_id:'fixture.duplicate'};plan.commands.push(second);plan.gates[0].check_ids.push(second.id);report.plan=structuredClone(plan);report.results.push({...row,...second,index:1,reused:true,reused_from:{task_id:first.task_id},actual_exit_code:null,actual_exit_code_observed:false});}
  finalizeVerificationReport(report,{status:'passed',wallMs,repositoryMode:'template-source'});report.input_after_sha256=report.input_sha256;report.input_drift=false;report.final_exit={code:0,signal:null,observed:true};
  return {root,directory,plan,report,receipt,options:{root,expectedPlan:plan,reportDirectory:directory,expectedSourcesManifest:manifest,observedExitCode:observation.status}};
}

test('资格公开消费者拒绝真实 Node 的实际 argv cwd env 与源码回执篡改',t=>{
  for(const source of [false,true]) {
    const f=qualificationEvidenceFixture(t,{source});assert.equal(validateQualificationReportEvidence(f.report,f.options).status,'passed');
    assert.throws(()=>validateQualificationReportEvidence(f.report,{...f.options,observedExitCode:undefined}),/close-not-observed/);
    for(const mutate of [
      r=>delete r.results[0].actual_execution,
      r=>r.results[0].actual_execution.args=r.results[0].actual_execution.args.filter(arg=>arg!=='--test-concurrency=1'),
      r=>r.results[0].actual_execution.cwd='/different/source',
      r=>r.results[0].actual_execution.environment={YSS_SPEC_TEMPLATE_REPO:'/different/source',YSS_SPEC_TEMPLATE_REF:'f'.repeat(40)},
      r=>r.results[0].actual_execution.requested_command='node --test unapproved.test.mjs',
      r=>r.invocation.args=['--unapproved'],
      r=>delete r.final_exit,
    ]){const report=structuredClone(f.report);mutate(report);assert.throws(()=>validateQualificationReportEvidence(report,f.options));}
    if(source) {
      for(const mutate of [r=>r.source_test_receipts=[],r=>r.source_test_receipts[0].sha256='0'.repeat(64),r=>delete r.results[0].actual_execution.source_receipt_sha256]){const report=structuredClone(f.report);mutate(report);assert.throws(()=>validateQualificationReportEvidence(report,f.options),/回执|摘要/);}
      const ref=f.report.source_test_receipts[0].ref,forged={...f.receipt,test_files:{'tests/sync-fast-smoke.test.js':'0'.repeat(64)}};fs.writeFileSync(ref,JSON.stringify(forged));
      const report=structuredClone(f.report),digest=hash(fs.readFileSync(ref));report.source_test_receipts[0].sha256=digest;report.results[0].actual_execution.source_receipt_sha256=digest;
      assert.throws(()=>validateQualificationReportEvidence(report,f.options),/原测试摘要/);
    }
  }
});

test('资格公开消费者复用普通 v2 的完整同轮执行输入等价合同',t=>{
  const f=qualificationEvidenceFixture(t,{reuse:true});assert.equal(validateQualificationReportEvidence(f.report,f.options).status,'passed');
  for(const change of [{depends_on:['different-dependency']},{resources:['different-resource']},{timeout_ms:1},{lane:'different-lane'},{source_requirement:'current'}]) {
    const expected=structuredClone(f.plan);Object.assign(expected.commands[1],change);const report=structuredClone(f.report);report.plan=structuredClone(expected);
    assert.throws(()=>validateQualificationReportEvidence(report,{...f.options,expectedPlan:expected}),/执行输入不等价/);
  }
  const report=structuredClone(f.report);report.results[1].reused_from.task_id='missing-origin';assert.throws(()=>validateQualificationReportEvidence(report,f.options),/实际退出来源/);
});
