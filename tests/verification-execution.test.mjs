import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runGroups, runCommandToFiles } from '../scripts/lib/template-verification-runner.mjs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {executeVerificationPlan,addVerificationExecutionTasks,validateVerificationArguments,prepareVerificationPlan} from '../.template-source/scripts/lib/template-verification-worker.mjs';
import {assertQualificationExecutionContract} from '../.template-source/scripts/lib/verification-report-validator.mjs';

const quote = value => `'${String(value).replaceAll("'", "'\\''")}'`;
const node = source => `${quote(process.execPath)} -e ${quote(source)}`;
const temporary = t => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verification-execution-')); t.after(() => fs.rmSync(dir, {recursive:true,force:true})); return dir; };
const fixtureRoot=t=>{
  const directory=temporary(t),root=path.join(directory,'root');fs.mkdirSync(path.join(root,'scripts'),{recursive:true});
  fs.writeFileSync(path.join(root,'scripts/repository-mode'),'console.log("template-source");\n');
  fs.mkdirSync(path.join(root,'.template-source/scripts/lib'),{recursive:true});
  fs.copyFileSync(new URL('../.template-source/scripts/lib/verification-preflight.mjs',import.meta.url),path.join(root,'.template-source/scripts/lib/verification-preflight.mjs'));
  const git=(...args)=>execFileSync('git',args,{cwd:root,stdio:'pipe'});
  git('init','-q');git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture');
  return {directory,root};
};
test('前置失败跳过依赖，继续同组及跨组独立检查并保留真实退出', async t => {
  const dir = temporary(t);
  const plan = {strategy:'qualified-gates',groups:['checks'],commands:[
    {id:'check.failure',task_id:'failure',group:'checks',command:node('process.exit(7)')},
    {id:'check.dependent',task_id:'dependent',group:'checks',command:node('process.exit(99)'),depends_on:['check.failure']},
    {id:'check.independent',task_id:'independent',group:'checks',command:node('console.log("independent")')},
  ]};
  const rows = (await runGroups(plan,'template-source',2,{cwd:dir,logRoot:dir})).flatMap(group => group.results);
  assert.equal(rows.find(row => row.task_id==='failure').actual_exit_code,7);
  assert.equal(rows.find(row => row.task_id==='dependent').skipped,true);
  assert.equal(rows.find(row => row.task_id==='dependent').termination,'dependency-failed');
  assert.equal(rows.find(row => row.task_id==='independent').code,0);
});
test('真实进程超时返回124并保留最终观测，后续独立检查完成', async t => {
  const dir = temporary(t);
  const row = await runCommandToFiles(node('process.on("SIGTERM",()=>{});setInterval(()=>{},1000)'),{cwd:dir,logRoot:dir,sequence:0,timeoutMs:150});
  assert.equal(row.code,124); assert.equal(row.termination,'timeout');
  assert.equal(row.actual_exit_code_observed,false); assert.equal(row.actual_exit_signal,'SIGKILL');
  const recovered = await runCommandToFiles(node('console.log("recovered")'),{cwd:dir,logRoot:dir,sequence:1});
  assert.equal(recovered.actual_exit_code,0); assert.equal(recovered.actual_exit_code_observed,true);
});
test('进程组清理错误不能被真实退出0覆盖',async t=>{
  const dir=temporary(t);
  const row=await runCommandToFiles(node('console.log("done")'),{cwd:dir,logRoot:dir,sequence:0,terminateProcess:()=>{throw new Error('EPERM group cleanup');}});
  assert.equal(row.code,1);assert.equal(row.actual_exit_code,0);assert.equal(row.actual_exit_code_observed,true);assert.match(row.error,/EPERM/);assert.ok(row.kill_errors.length);
});
test('两路内部tooling独占外层预算，同资源检查互斥', async () => {
  let active=0,peak=0,toolingActive=false;
  const execute = async command => { if(command==='tooling')assert.equal(active,0); else assert.equal(toolingActive,false); active++; peak=Math.max(peak,active); toolingActive=command==='tooling'; await new Promise(resolve=>setTimeout(resolve,20)); active--; if(command==='tooling')toolingActive=false; return {command,code:0,duration_ms:20}; };
  const plan={strategy:'qualified-gates',groups:['a','b','c'],commands:[
    {id:'tooling',group:'a',command:'tooling',kind:'tooling'},
    {id:'other',group:'b',command:'other',resources:['shared']},
    {id:'last',group:'c',command:'last',resources:['shared']},
  ]};
  await runGroups(plan,'template-source',2,{cwd:'/fixture',environment:{YSS_TOOLING_CONCURRENCY:'2'},execute});
  assert.equal(peak,1);
});
test('未知依赖和循环在执行任何命令前拒绝', async () => {
  const options={cwd:'/fixture',execute:()=>assert.fail('must not execute')};
  await assert.rejects(()=>runGroups({strategy:'qualified-gates',groups:['a'],commands:[{id:'a',group:'a',command:'a',depends_on:['missing']}]},'template-source',1,options),/未知.*依赖/);
  await assert.rejects(()=>runGroups({strategy:'qualified-gates',groups:['a'],commands:[{id:'a',group:'a',command:'a',depends_on:['b']},{id:'b',group:'a',command:'b',depends_on:['a']}]},'template-source',1,options),/循环/);
});
test('依赖出现在后方时先执行前置，lane仍保持单个活跃任务',async()=>{
  const calls=[];
  const plan={strategy:'qualified-gates',groups:['one'],commands:[{id:'consumer',group:'one',command:'consumer',depends_on:['producer']},{id:'producer',group:'one',command:'producer'}]};
  await runGroups(plan,'template-source',2,{cwd:'/fixture',environment:{},execute:async command=>{calls.push(command);return {command,code:0};}});
  assert.deepEqual(calls,['producer','consumer']);
});
test('DAG仅复用成功结果，失败命令的另一occurrence真实重新执行',async()=>{
  let executions=0;
  const plan={strategy:'qualified-gates',groups:['one'],commands:[{id:'check.one',task_id:'one',group:'one',command:'same'},{id:'check.two',task_id:'two',group:'one',command:'same'}]};
  const rows=(await runGroups(plan,'template-source',1,{cwd:'/fixture',environment:{},execute:async command=>({command,code:executions++===0?7:0})})).flatMap(group=>group.results);
  assert.equal(executions,2);assert.equal(rows[0].code,7);assert.equal(rows[1].code,0);assert.equal(rows[1].reused,false);
});
test('重复check ID依赖按唯一task occurrence匹配，歧义引用在执行前拒绝',async t=>{
  const directory=temporary(t),counter=path.join(directory,'count');
  const code=`const f=require('node:fs'),p=${JSON.stringify(counter)},n=f.existsSync(p)?Number(f.readFileSync(p))+1:1;f.writeFileSync(p,String(n));console.log(n);process.exit(n===1?7:0);`;
  const plan={strategy:'qualified-gates',groups:['one'],commands:[
    {id:'check.shared',task_id:'legacy.001',group:'one',command:node(code)},
    {id:'check.shared',task_id:'legacy.002',group:'one',command:node(code)},
    {id:'check.blocked',task_id:'blocked',group:'one',command:node('process.exit(99)'),depends_on:['legacy.001']},
    {id:'check.allowed',task_id:'allowed',group:'one',command:node('console.log("allowed")'),depends_on:['legacy.002']},
  ]};
  const rows=(await runGroups(plan,'template-source',2,{cwd:directory,logRoot:path.join(directory,'failed-logs')})).flatMap(group=>group.results);
  assert.equal(rows.find(row=>row.task_id==='blocked').termination,'dependency-failed');assert.equal(rows.find(row=>row.task_id==='allowed').actual_exit_code,0);assert.equal(fs.readFileSync(counter,'utf8'),'2');
  const ambiguous=structuredClone(plan);ambiguous.commands[2].depends_on=['check.shared'];
  await assert.rejects(()=>runGroups(ambiguous,'template-source',2,{cwd:directory,environment:{},execute:()=>assert.fail('ambiguous plan must not execute')}),/引用不明确/);
  const successful=structuredClone(plan);successful.commands=successful.commands.filter(task=>task.task_id!=='blocked');
  for(const task of successful.commands.filter(task=>task.id==='check.shared'))task.command=node(code.replace('process.exit(n===1?7:0);','process.exit(0);'));
  const reused=(await runGroups(successful,'template-source',2,{cwd:directory,logRoot:path.join(directory,'passed-logs')})).flatMap(group=>group.results).find(row=>row.task_id==='legacy.002');
  assert.equal(reused.reused,true);assert.equal(reused.reused_from.task_id,'legacy.001');assert.equal(fs.readFileSync(counter,'utf8'),'3');
});
test('新DAG复用绑定不同前置occurrence与资源，相同argv真实分别执行',async t=>{
  const directory=temporary(t),counter=path.join(directory,'count'),command=node(`const f=require('node:fs'),p=${JSON.stringify(counter)},n=f.existsSync(p)?Number(f.readFileSync(p))+1:1;f.writeFileSync(p,String(n));`);
  const plan={strategy:'qualified-gates',groups:['one'],commands:[
    {id:'check.pre-a',task_id:'pre.a',group:'one',command:node('console.log("a")')},
    {id:'check.pre-b',task_id:'pre.b',group:'one',command:node('console.log("b")')},
    {id:'check.same',task_id:'same.a',group:'one',command,depends_on:['pre.a']},
    {id:'check.same',task_id:'same.b',group:'one',command,depends_on:['pre.b']},
    {id:'check.same',task_id:'same.resource',group:'one',command,depends_on:['pre.a'],resources:['shared']},
  ]};
  const rows=(await runGroups(plan,'template-source',2,{cwd:directory,logRoot:directory})).flatMap(group=>group.results);
  assert.equal(fs.readFileSync(counter,'utf8'),'3');assert.ok(rows.filter(row=>row.id==='check.same').every(row=>row.actual_exit_code===0&&row.reused===false));
});
test('真实CLI可独立加载纯台账并生成完整计划',t=>{
  const root=fileURLToPath(new URL('..',import.meta.url)),entry=fileURLToPath(new URL('../scripts/run-template-verification',import.meta.url));
  const plan=JSON.parse(execFileSync(process.execPath,[entry,'--profile','legacy-full','--plan','--json','--report-dir',path.join(temporary(t),'report')],{cwd:root,encoding:'utf8',timeout:10000}));
  assert.equal(plan.commands[0].kind,'preflight');assert.ok(plan.commands.every(row=>row.id.startsWith('check.')));assert.equal(plan.strategy,'legacy-reference');
});
test('报告参数完整性独立于来源校验，显式legacy-full不能忽略缺配对或坏摘要',t=>{
  const base='a'.repeat(40),digest='b'.repeat(64);
  for(const report of ['baseline-report','qualification-report']){
    assert.throws(()=>validateVerificationArguments({profile:'legacy-full',base,[report]:'unavailable.json'}),/必须成对提供/);
    assert.throws(()=>validateVerificationArguments({profile:'legacy-full',base,[`${report}-sha256`]:digest}),/必须成对提供/);
    assert.throws(()=>validateVerificationArguments({profile:'legacy-full',base,[report]:'unavailable.json',[`${report}-sha256`]:'123'}),/64 位 SHA-256/);
    assert.throws(()=>validateVerificationArguments({profile:'legacy-full',base,[report]:'',[`${report}-sha256`]:digest}),/不能为空/);
  }
  assert.throws(()=>validateVerificationArguments({'baseline-report':'unavailable.json','baseline-report-sha256':digest}),/需要 --base/);
  assert.equal(validateVerificationArguments({profile:'legacy-full',base}).base,base);
  const root=fileURLToPath(new URL('..',import.meta.url)),entry=fileURLToPath(new URL('../scripts/run-template-verification',import.meta.url));
  for(const args of [['--baseline-report','unavailable.json'],['--qualification-report-sha256',digest],['--qualification-report','unavailable.json','--qualification-report-sha256','bad']]){
    const reportDir=path.join(temporary(t),'report');
    assert.throws(()=>execFileSync(process.execPath,[entry,'--profile','legacy-full','--plan','--json','--report-dir',reportDir,...args],{cwd:root,stdio:'pipe',timeout:10000}),error=>error.status===1&&/必须成对提供|64 位 SHA-256/.test(error.stderr.toString()));
    assert.equal(fs.existsSync(reportDir),false);
  }
});
test('仅提供base仍支持完整回退，显式legacy参考覆盖不被裁剪',t=>{
  const root=fileURLToPath(new URL('..',import.meta.url)),entry=fileURLToPath(new URL('../scripts/run-template-verification',import.meta.url));
  const base=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  for(const profile of ['release','legacy-full']){
    const plan=JSON.parse(execFileSync(process.execPath,[entry,'--profile',profile,'--base',base,'--plan','--json','--report-dir',path.join(temporary(t),'report')],{cwd:root,encoding:'utf8',timeout:10000}));
    assert.equal(plan.strategy,profile==='release'?'legacy-full':'legacy-reference');
    assert.equal(plan.commands.filter(task=>task.task_id?.startsWith('legacy.')).length,117);
    if(profile==='legacy-full')assert.equal(plan.commands.filter(task=>task.kind==='syntax').length,115);
  }
});
test('显式legacy拒绝非祖先、错误报告摘要、符号链接及失败独立assessment',async t=>{
  const fixture=fixtureRoot(t),tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:fixture.root,encoding:'utf8'}).trim();
  const nonAncestor=execFileSync('git',['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit-tree',tree],{cwd:fixture.root,input:'separate fixture history\n',encoding:'utf8'}).trim();
  await assert.rejects(()=>prepareVerificationPlan(['--profile','legacy-full','--base',nonAncestor,'--plan'],fixture.root),/BASELINE_NOT_ANCESTOR/);
  const root=fileURLToPath(new URL('..',import.meta.url)),entry=fileURLToPath(new URL('../scripts/run-template-verification',import.meta.url)),base=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const directory=fs.realpathSync(temporary(t)),file=path.join(directory,'untrusted.json'),link=path.join(directory,'linked.json');fs.writeFileSync(file,'{}\n');fs.symlinkSync(file,link);
  const digest=createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  for(const [args,expected]of [
    [['--baseline-report',file,'--baseline-report-sha256','0'.repeat(64)],/BASELINE_REPORT_DIGEST_MISMATCH/],
    [['--qualification-report',file,'--qualification-report-sha256','0'.repeat(64)],/QUALIFICATION_REPORT_DIGEST_MISMATCH/],
    [['--baseline-report',link,'--baseline-report-sha256',digest],/BASELINE_REPORT_PATH_INVALID/],
    [['--qualification-report',link,'--qualification-report-sha256',digest],/QUALIFICATION_REPORT_PATH_INVALID/],
    [['--baseline-report',file,'--baseline-report-sha256',digest],/BASELINE_REPORT_INVALID/],
    [['--qualification-report',file,'--qualification-report-sha256',digest],/QUALIFICATION_REPORT_INVALID/],
  ])assert.throws(()=>execFileSync(process.execPath,[entry,'--profile','legacy-full','--base',base,'--plan','--json',...args],{cwd:root,stdio:'pipe',timeout:10000}),error=>error.status===1&&expected.test(error.stderr.toString()));
});
test('qualified执行参数必须匹配实跑资格合同，shadow执行保持独立',()=>{
  const plan={strategy:'qualified-gates',qualification:{valid:true,bindings:{execution_contract:{concurrency:2,tooling_mode:'optimized',test_concurrency:2}}}};
  assert.doesNotThrow(()=>assertQualificationExecutionContract(plan,{concurrency:2,toolingMode:'optimized',testConcurrency:2}));
  for(const actual of [{concurrency:1,toolingMode:'optimized',testConcurrency:1},{concurrency:2,toolingMode:'legacy',testConcurrency:1},{concurrency:2,toolingMode:'optimized',testConcurrency:1}])assert.throws(()=>assertQualificationExecutionContract(plan,actual),error=>error.code==='QUALIFICATION_EXECUTION_CONTRACT_MISMATCH');
  assert.doesNotThrow(()=>assertQualificationExecutionContract({strategy:'qualification-shadow'},{concurrency:1,toolingMode:'legacy',testConcurrency:1}));
});
test('监督父进程观察worker close后持久化退出，失败报告保留真实任务日志',async t=>{
  const {directory,root}=fixtureRoot(t);
  const plan={strategy:'qualified-gates',requested_profile:'candidate',effective_profile:'candidate',source_requirement:'current',required_files:[],syntax_files:[],groups:['check'],selection:{effective:'legacy',omitted:[]},commands:[{id:'check.real',task_id:'check.real',group:'check',command:node('process.exit(7)')}]};
  const outcome=await executeVerificationPlan({root,plan,reportDir:path.join(directory,'report'),purpose:'qualification'});
  assert.equal(outcome.code,1);assert.equal(outcome.observed,true);
  const report=JSON.parse(fs.readFileSync(outcome.reportFile));assert.deepEqual(report.final_exit,{code:1,signal:null,observed:true});
  assert.equal(report.purpose,'qualification');assert.equal(report.status,'failed');
  assert.equal(report.environment.test_concurrency,1);
  const failed=report.results.find(row=>row.id==='check.real');assert.equal(failed.actual_exit_code,7);assert.equal(failed.actual_exit_code_observed,true);assert.ok(fs.existsSync(failed.stdoutFile));
});
test('监督中断拒绝成功并保留实际 close 与日志',async t=>{
  const {directory,root}=fixtureRoot(t),marker=path.join(directory,'child-pid'),controller=new AbortController();
  const plan={strategy:'qualified-gates',requested_profile:'candidate',effective_profile:'candidate',source_requirement:'current',required_files:[],groups:['check'],selection:{effective:'legacy',omitted:[]},commands:[{id:'check.wait',task_id:'wait',group:'check',command:node(`require('node:fs').writeFileSync(${JSON.stringify(marker)},String(process.pid));setInterval(()=>{},1000);`)}]};
  const execution=executeVerificationPlan({root,plan,reportDir:path.join(directory,'report'),purpose:'qualification',signal:controller.signal});
  const deadline=Date.now()+10000;while(!fs.existsSync(marker)&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,10));
  assert.ok(fs.existsSync(marker));const pid=Number(fs.readFileSync(marker,'utf8'));controller.abort();
  const outcome=await execution;assert.equal(outcome.code,130);assert.equal(outcome.observed,true);assert.equal(outcome.report.status,'interrupted');assert.deepEqual(outcome.report.final_exit,{code:130,signal:null,observed:true});
  const cancelled=outcome.report.results.find(row=>row.task_id==='wait');assert.equal(cancelled.code,130);assert.equal(cancelled.termination,'cancelled');assert.ok(fs.existsSync(cancelled.stdoutFile));assert.ok(fs.existsSync(cancelled.stderrFile));assert.ok(cancelled.log_digests.stdoutFile);
  assert.throws(()=>process.kill(pid,0),error=>error.code==='ESRCH');
});
test('新语法台账去重仍逐路径node --check，参考计时保留原始重复',()=>{
  const plan={groups:['check'],commands:[],syntax_files:['scripts/a.mjs','scripts/a.mjs'],effective_profile:'release',selection:{effective:'legacy',omitted:[]}};
  const compiled=addVerificationExecutionTasks(plan,{root:process.cwd()});
  assert.equal(compiled.commands.filter(row=>row.kind==='syntax').length,1);assert.ok(compiled.commands.every(row=>row.id.startsWith('check.')));
  assert.equal(addVerificationExecutionTasks(plan,{root:process.cwd(),reference:true}).commands.filter(row=>row.kind==='syntax').length,2);
});
test('扩展名为空的changed脚本仅Node shebang进入node语法台账',t=>{
  const root=temporary(t);fs.mkdirSync(path.join(root,'scripts'));
  const files={'scripts/node-entry':'#!/usr/bin/env node\nconsole.log(1);\n','scripts/node-flags':'#!/usr/bin/env -S node --no-warnings\nconsole.log(1);\n','scripts/bash-entry':'#!/bin/bash\nprintf test\n','scripts/no-shebang':'console.log(1);\n','scripts/module.mjs':'console.log(1);\n'};
  for(const [file,bytes]of Object.entries(files))fs.writeFileSync(path.join(root,file),bytes);
  const plan=addVerificationExecutionTasks({commands:[],groups:[],effective_profile:'release',syntax_files:[],changed_files:Object.keys(files)},{root});
  const syntax=plan.commands.filter(task=>task.kind==='syntax').map(task=>task.command);
  assert.equal(syntax.length,3);assert.ok(syntax.some(command=>command.endsWith("'scripts/node-entry'")));assert.ok(syntax.some(command=>command.endsWith("'scripts/node-flags'")));assert.ok(syntax.some(command=>command.endsWith("'scripts/module.mjs'")));
});
test('新增风险回归进入非参考台账并重建Gate覆盖，冻结reference不附加',()=>{
  const gateId='check.verification-final-integrity',raw={id:'check.verification-optimization-regressions',task_id:'supplemental.optimization-regressions',run:'node --test tests/verification-execution.test.mjs',group:'verification-optimization',when:'template-source',gate_ids:[gateId],depends_on:[],source_requirement:'committed'};
  const input={commands:[],groups:[],requested_profile:'release',effective_profile:'release',syntax_files:[],supplemental_checks:[raw],gates:[{id:gateId,selected:true,check_ids:['stale'],task_ids:['stale']}]};
  const compiled=addVerificationExecutionTasks(input,{root:process.cwd()}),task=compiled.commands.find(row=>row.task_id===raw.task_id),gate=compiled.gates[0];
  assert.equal(task.command,raw.run);assert.equal(task.group,'postchecks');assert.equal(task.source_requirement,'committed');assert.ok(task.depends_on.includes('check.verification-environment'));assert.ok(gate.check_ids.includes(raw.id));assert.ok(gate.task_ids.includes(raw.task_id));assert.ok(!gate.task_ids.includes('stale'));
  const reference=addVerificationExecutionTasks(input,{root:process.cwd(),reference:true});assert.ok(!reference.commands.some(row=>row.task_id===raw.task_id));assert.deepEqual(reference.gates,[]);
});
test('准备和主检查使用独立日志，完成依赖可跨phase且finally实际清理',async t=>{
  const {directory,root}=fixtureRoot(t);
  const plan={strategy:'qualified-gates',requested_profile:'candidate',effective_profile:'candidate',source_requirement:'current',required_files:[],groups:['artifact-preparation','check','cleanup'],selection:{effective:'legacy',omitted:[]},commands:[
    {id:'check.prepare',task_id:'prepare',group:'artifact-preparation',kind:'artifact-prepare',command:node('console.log("prepared")')},
    {id:'check.consume',task_id:'consume',group:'check',depends_on:['check.prepare'],command:node('console.log("consumed")')},
    {id:'check.cleanup',task_id:'cleanup',group:'cleanup',kind:'cleanup',command:node('console.log("cleaned")')},
  ]};
  const outcome=await executeVerificationPlan({root,plan,reportDir:path.join(directory,'report'),purpose:'qualification'});
  assert.equal(outcome.code,0);assert.equal(outcome.report.status,'passed');assert.deepEqual(outcome.report.unexecuted,[]);
  const rows=Object.fromEntries(outcome.report.results.map(row=>[row.task_id,row]));
  assert.notEqual(rows.prepare.stdoutFile,rows.consume.stdoutFile);assert.match(fs.readFileSync(rows.prepare.stdoutFile,'utf8'),/prepared/);assert.match(fs.readFileSync(rows.consume.stdoutFile,'utf8'),/consumed/);
  assert.equal(rows.cleanup.actual_exit_code,0);assert.equal(rows.cleanup.actual_exit_code_observed,true);assert.ok(outcome.report.results.indexOf(rows.cleanup)>outcome.report.results.indexOf(rows.consume));
  const failedPlan=structuredClone(plan);failedPlan.commands[0].command=node('process.exit(7)');
  const failed=await executeVerificationPlan({root,plan:failedPlan,reportDir:path.join(directory,'failed-report'),purpose:'qualification'});
  assert.equal(failed.code,1);assert.equal(failed.report.results.find(row=>row.task_id==='prepare').actual_exit_code,7);
  assert.equal(failed.report.results.find(row=>row.task_id==='cleanup').actual_exit_code,0);assert.ok(!failed.report.results.some(row=>row.task_id==='consume'));
});
test('缺Vue的真实preflight子进程失败，昂贵任务未启动且父close落失败报告',async t=>{
  const {directory,root}=fixtureRoot(t);
  const plan={strategy:'qualified-gates',requested_profile:'candidate',effective_profile:'candidate',source_requirement:'current',required_files:[],groups:['expensive'],selection:{effective:'legacy',omitted:[]},commands:[{id:'expensive',task_id:'expensive',group:'expensive',command:'scripts/verify-yss-prototype-contract-scenarios'}]};
  const outcome=await executeVerificationPlan({root,plan,reportDir:path.join(directory,'report'),purpose:'qualification',environment:{...process.env,YSS_VUE_TOOLCHAIN:''}});
  assert.equal(outcome.code,1);assert.equal(outcome.report.results.length,1);
  const failure=outcome.report.results[0];assert.equal(failure.task_id,'check.verification-environment');assert.equal(failure.actual_exit_code,1);assert.equal(failure.actual_exit_code_observed,true);
  assert.match(outcome.report.error,/YSS_VUE_TOOLCHAIN/);assert.ok(outcome.report.unexecuted.some(row=>row.task_id==='expensive'));
});
