import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {verificationPreflight,validateVerificationReportDirectory} from '../.template-source/scripts/lib/verification-preflight.mjs';
import {PIN_FILE,platformKey} from '../.template-source/scripts/lib/yss-cli-pin.mjs';
test('日常 Node 检查无需 Python 或无关子模块环境',()=>{
 const result=verificationPreflight({root:process.cwd(),nodeVersion:'v24.21.0',environment:{},plan:{strategy:'daily-necessary',commands:[{command:'node --test .template-source/tooling/node/test/plan-spec-quality.test.mjs'}]},probe:()=>{throw new Error('不应探测未选工具');}});
 assert.equal(result.status,'passed',JSON.stringify(result.errors));
 assert.deepEqual(result.observations.map(row=>row.name),['node']);
});
test('仅检查 WorkBuddy 投影脚本语法不要求执行脚本所需的 Vue 工具链',async t=>{
 const {addVerificationExecutionTasks}=await import('../.template-source/scripts/lib/verification-execution-plan.mjs');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'workbuddy-syntax-preflight-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const file='.workbuddy/skills/yss-prototype-stage/scripts/build-shadcn-vue-prototype.mjs';
 fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});
 fs.copyFileSync('.agents/skills/yss-prototype-stage/scripts/build-shadcn-vue-prototype.mjs',path.join(root,file));
 const preflightFile='.template-source/scripts/lib/verification-preflight.mjs';
 fs.mkdirSync(path.dirname(path.join(root,preflightFile)),{recursive:true});
 fs.copyFileSync(preflightFile,path.join(root,preflightFile));
 const compiled=addVerificationExecutionTasks({strategy:'daily-necessary',source_requirement:'current',requested_profile:'fast',effective_profile:'fast',commands:[],changed_files:[file],syntax_files:[]},{root});
 assert.ok(compiled.commands.some(task=>task.kind==='syntax'&&task.command.endsWith(`'${file}'`)));
 const preflight=compiled.commands.find(task=>task.kind==='preflight');
 const child=spawnSync('/bin/sh',['-c',preflight.command],{cwd:root,env:{},encoding:'utf8'});
 assert.equal(child.status,0,child.stderr||child.stdout);
 const result=JSON.parse(child.stdout);
 assert.equal(result.status,'passed',JSON.stringify(result.errors));
 assert.deepEqual(result.observations.map(row=>row.name),['node']);
});
test('日常所选 Schema 检查仍必须具备 Python 环境',()=>{
 const result=verificationPreflight({root:process.cwd(),nodeVersion:'v24.21.0',plan:{strategy:'daily-necessary',commands:[{command:'node --test tests/schema.test.mjs',resources:['python-jsonschema']}]},probe:()=>({status:1,stderr:'missing Python'})});
 assert.equal(result.status,'failed');assert.deepEqual(result.errors.map(row=>row.name),['python-jsonschema']);
});
test('日常 Python 语法检查不要求 jsonschema',()=>{
 const result=verificationPreflight({root:process.cwd(),nodeVersion:'v24.21.0',plan:{strategy:'daily-necessary',commands:[{command:'python3 -c ast'}]},probe:(file,args)=>{assert.equal(file,'python3');assert.ok(!args[1].includes('jsonschema'));return {status:0,stdout:JSON.stringify({version:[3,12],executable:'/fixture/python'})};}});
 assert.equal(result.status,'passed');assert.deepEqual(result.observations.map(row=>row.name),['node','python']);
});
test('日常所选 Go 与原生消费者缺实际工具时提前拒绝',()=>{
 const base={root:process.cwd(),nodeVersion:'v24.21.0',environment:{}};
 const go=verificationPreflight({...base,plan:{strategy:'daily-necessary',commands:[{command:'go test ./...'}]},probe:(file,args)=>{assert.equal(file,'go');assert.deepEqual(args,['version']);return {status:1,stderr:'missing go'};}});
 assert.deepEqual(go.errors.map(row=>row.name),['go']);
 const native=verificationPreflight({...base,plan:{strategy:'daily-necessary',commands:[{command:'node --test tests/cli-retirement.test.mjs',resources:['native-cli']}]},probe:()=>assert.fail('不应启动无关工具')});
 assert.deepEqual(native.errors.map(row=>row.name),['native-cli']);assert.match(native.errors[0].error,/YSS_NATIVE_BINARY/);
});
test('仅选定原型时要求Vue，缺项在昂贵场景前失败',()=>{
  const probe=(file,args)=>({status:0,stdout:file==='python3'?JSON.stringify({version:[3,12],jsonschema:'4.0',executable:'/fixture/python'}):'',stderr:''});
  const base={root:process.cwd(),nodeVersion:'v24.1.0',environment:{},probe};
  assert.equal(verificationPreflight({...base,plan:{commands:[{command:'node simple-test'}]}}).status,'passed');
  const result=verificationPreflight({...base,plan:{commands:[{command:'scripts/verify-yss-prototype-contract-scenarios'}]}});
  assert.equal(result.status,'failed');assert.match(result.errors[0].error,/YSS_VUE_TOOLCHAIN/);
  assert.equal(verificationPreflight({...base,nodeVersion:'v22.0.0',plan:{commands:[]}}).status,'failed');
});
test('报告目录拒绝仓内、已有目录和符号链接逃逸',t=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'verification-preflight-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const root=path.join(temp,'root');fs.mkdirSync(root);
  assert.throws(()=>validateVerificationReportDirectory(root,path.join(root,'report')),/仓库外/);
  assert.throws(()=>validateVerificationReportDirectory(root,root),/新目录/);
  fs.symlinkSync(root,path.join(temp,'link'));
  assert.throws(()=>validateVerificationReportDirectory(root,path.join(temp,'link/report')),/仓库外/);
  assert.equal(validateVerificationReportDirectory(root,path.join(temp,'new')),path.join(temp,'new'));
});

test('原生消费者的二进制必须与固定文件一致，本地联调可显式覆盖且 CI 不接受',t=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'verification-pin-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
  const write=(name,bytes)=>{const file=path.join(temp,name);fs.writeFileSync(file,bytes,{mode:0o755});return file;};
  const pinned=write('pinned','pinned bytes'),other=write('other','other bytes');
  fs.mkdirSync(path.join(temp,'.template-source/distribution'),{recursive:true});
  fs.writeFileSync(path.join(temp,PIN_FILE),JSON.stringify({schema_version:1,repository:'https://example.test/yss-cli.git',version:'1.3.5',commit:'c'.repeat(40),go_version:'1.27.1',build:'go build',binaries:{[platformKey()]:{sha256:sha('pinned bytes')}}}));
  const run=(binary,extra={})=>verificationPreflight({root:temp,nodeVersion:'v24.21.0',environment:{YSS_NATIVE_BINARY:binary,...extra},plan:{strategy:'daily-necessary',commands:[{command:'node --test tests/cli-retirement.test.mjs',resources:['native-cli']}]},probe:()=>assert.fail('不应启动无关工具')});
  const ok=run(pinned);
  assert.equal(ok.status,'passed',JSON.stringify(ok.errors));assert.equal(ok.observations.find(item=>item.name==='native-cli').observed.pin.pinned,true);
  const bad=run(other);
  assert.deepEqual(bad.errors.map(item=>item.name),['native-cli']);assert.match(bad.errors[0].error,/与固定版本不符/);
  const local=run(other,{YSS_NATIVE_BINARY_OVERRIDE:'1'});
  assert.equal(local.status,'passed');assert.equal(local.observations.find(item=>item.name==='native-cli').observed.pin.pinned,false);
  const ci=run(other,{YSS_NATIVE_BINARY_OVERRIDE:'1',CI:'true'});
  assert.match(ci.errors[0].error,/CI 不接受覆盖/);
});

test('CI 文档计划保留 schema 前置但不准备无关重工具',async()=>{
 const {verificationToolRequirements,validateVerificationToolRequirements}=await import('../.template-source/scripts/lib/verification-preflight.mjs');
 const {planTemplateVerification}=await import('../scripts/lib/template-verification.mjs');
 assert.equal(typeof verificationToolRequirements,'function');assert.equal(typeof validateVerificationToolRequirements,'function');
 const requirements=verificationToolRequirements(planTemplateVerification({changedFiles:['README.md'],ciGuards:true}));
 assert.deepEqual(requirements,{schema_version:1,python:'jsonschema',go:false,native_cli:false,tooling:false,vue:false});
 for(const bad of [null,[],{}, {...requirements,extra:true},{...requirements,go:1},{...requirements,tooling:'false'},{...requirements,python:'no'},{...requirements,schema_version:2}])assert.throws(()=>validateVerificationToolRequirements(bad));
 for(const field of Object.keys(requirements)){const bad={...requirements};delete bad[field];assert.throws(()=>validateVerificationToolRequirements(bad));}
 assert.deepEqual(validateVerificationToolRequirements(requirements),requirements);
 const base={schema_version:1,python:'none',go:false,native_cli:false,tooling:false,vue:false};
 const daily=commands=>({strategy:'daily-necessary',commands});
 for(const [task,changes]of [[{command:'go test ./...'},{go:true}],[{command:'node --test report.test.mjs',resources:['go']},{go:true}],[{command:'python3 -c ast'},{python:'runtime'}],[{command:'node schema',resources:['python-jsonschema']},{python:'jsonschema'}],[{command:'pnpm --dir .template-source/tooling/node test'},{tooling:true}],[{command:'node native',resources:['native-cli']},{native_cli:true}],[{command:'scripts/verify-existing-ui-baseline-scenarios'},{vue:true}]])assert.deepEqual(verificationToolRequirements(daily([task])),{...base,...changes});
 assert.equal(verificationToolRequirements({commands:[]}).python,'jsonschema');
 assert.equal(verificationToolRequirements(planTemplateVerification({changedFiles:['scripts/lib/verification-selection.mjs'],ciGuards:true})).go,true,'报告测试实际构建 Go fixture');
 const cli=planTemplateVerification({changedFiles:['tests/cli-retirement.test.mjs']});assert.equal(verificationToolRequirements(cli).native_cli,true);
});

test('实例漂移的 CI 计划要求原生工具',async()=>{
 const {verificationToolRequirements}=await import('../.template-source/scripts/lib/verification-preflight.mjs');
 const {planTemplateVerification}=await import('../scripts/lib/template-verification.mjs');
 for(const ref of ['tests/native-instance-drift.test.mjs','tests/instance-metadata.test.mjs','scripts/lib/instance-metadata.mjs']){
  const plan=planTemplateVerification({changedFiles:[ref],ciGuards:true});
  assert.equal(plan.commands.filter(row=>row.id==='check.instance-metadata').length,1,ref);
  const needs=verificationToolRequirements(plan,{reportValidation:true});
  assert.equal(needs.native_cli,true,ref);
  assert.equal(needs.tooling,false,ref);assert.equal(needs.vue,false,ref);
  const preflight=verificationPreflight({root:path.resolve(import.meta.dirname,'..'),plan,nodeVersion:'v24.21.0',environment:{},probe:file=>{
   assert.equal(file,'python3');
   return {status:0,stdout:JSON.stringify({version:[3,12],jsonschema:'4.23.0',executable:'/fixture/python'})};
  }});
  assert.deepEqual(preflight.errors.map(row=>row.name),['native-cli'],ref);
 }
});

test('报告 v2 的 CI 路由声明冻结计划编译所需原生 CLI',async t=>{
 const {verificationToolRequirements}=await import('../.template-source/scripts/lib/verification-preflight.mjs');
 const {planTemplateVerification}=await import('../scripts/lib/template-verification.mjs');
 const root=path.resolve(import.meta.dirname,'..'),directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'report-v2-tools-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 for(const ref of ['tests/verification-report-v2.test.mjs','.template-source/scripts/lib/template-verification-worker.mjs']){
  const selected=planTemplateVerification({changedFiles:[ref],ciGuards:true});
  const commands=selected.commands.filter(row=>row.id==='check.verification-report-v2');assert.equal(commands.length,1,ref);
  // Isolate this consumer so another selected native check cannot hide its dependency.
  const plan={...selected,commands},needs=verificationToolRequirements(plan,{reportValidation:true});
  assert.deepEqual(needs,{schema_version:1,python:'jsonschema',go:true,native_cli:true,tooling:false,vue:false},ref);
  const missing=verificationPreflight({root,plan,nodeVersion:'v24.21.0',environment:{},probe:file=>{
   if(file==='python3')return {status:0,stdout:JSON.stringify({version:[3,12],jsonschema:'4.23.0',executable:'/fixture/python'})};
   assert.equal(file,'go');return {status:0,stdout:'go version go1.27.1 linux/amd64'};
  }});
  assert.equal(missing.status,'failed');assert.deepEqual(missing.errors.map(row=>row.name),['native-cli']);
  const requirements=path.join(directory,'requirements.json');fs.writeFileSync(requirements,JSON.stringify(needs));
  const setup=spawnSync(path.join(root,'scripts/ci-setup'),['--dry-run','--requirements-file',requirements],{cwd:root,env:{...process.env,CI:''},encoding:'utf8'});
  assert.equal(setup.status,0,setup.stderr);assert.match(setup.stdout,/构建 yss/);assert.match(setup.stdout,/Go：/);assert.doesNotMatch(setup.stdout,/pnpm --dir \.template-source\/tooling\/node install/);
 }
});

test('仅实施编排文档变化也准备 checkpoint 的原生依赖',async t=>{
 const {verificationToolRequirements}=await import('../.template-source/scripts/lib/verification-preflight.mjs');
 const {planTemplateVerification}=await import('../scripts/lib/template-verification.mjs');
 const plan=planTemplateVerification({changedFiles:['.template-spec/process/subagent-collaboration.md','.agents/skills/yss-product-lifecycle/references/orchestration.md'],ciGuards:true});
 assert.equal(plan.commands.filter(row=>row.id==='check.daily-checkpoint').length,1);
 assert.deepEqual(plan.commands.filter(row=>row.id!=='check.daily-checkpoint'&&row.resources?.includes('native-cli')),[],'不得由其他原生消费者掩盖 checkpoint 的缺失声明');
 await t.test('CI 工具准备选择原生 CLI',()=>{
  assert.deepEqual(verificationToolRequirements(plan,{reportValidation:true}),{schema_version:1,python:'jsonschema',go:false,native_cli:true,tooling:false,vue:false});
 });
 await t.test('未配置原生 CLI 时预检拒绝',()=>{
  const result=verificationPreflight({root:path.resolve(import.meta.dirname,'..'),plan,nodeVersion:'v24.21.0',environment:{},probe:file=>{
   assert.equal(file,'python3');
   return {status:0,stdout:JSON.stringify({version:[3,12],jsonschema:'4.23.0',executable:'/fixture/python'})};
  }});
  assert.equal(result.status,'failed');
  assert.deepEqual(result.errors.map(row=>row.name),['native-cli']);
  assert.match(result.errors[0].error,/YSS_NATIVE_BINARY/);
 });
});

test('准备后的原生执行 tuple 消费显式环境而非父进程环境',async t=>{
 const {compileTaskExecution}=await import('../.template-source/scripts/lib/verification-execution-plan.mjs');
 const temp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'ci-compiled-environment-')));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const binary=path.join(temp,'yss');fs.writeFileSync(binary,'fixture bytes');
 const environment={YSS_NATIVE_BINARY:binary,YSS_NATIVE_BINARY_SHA256:createHash('sha256').update('fixture bytes').digest('hex')};
 const execution=compileTaskExecution({command:'scripts/verify-context-contract'},{root:path.resolve(import.meta.dirname,'..'),environment});assert.equal(execution.file,binary);
});


test('CI 报告消费单独声明 schema 前置',async()=>{
 const {verificationToolRequirements}=await import('../.template-source/scripts/lib/verification-preflight.mjs');
 const empty={strategy:'daily-necessary',commands:[]};
 assert.equal(verificationToolRequirements(empty).python,'none');
 assert.equal(verificationToolRequirements(empty,{reportValidation:true}).python,'jsonschema');
});

test('slow 检查本身声明 schema 前置',async()=>{
 const {verificationToolRequirements}=await import('../.template-source/scripts/lib/verification-preflight.mjs');
 const {planTemplateVerification}=await import('../scripts/lib/template-verification.mjs');
 const slow=planTemplateVerification({includeSlow:'only'});
 assert.equal(verificationToolRequirements(slow).python,'jsonschema');
 assert.equal(slow.commands.find(x=>x.id==='check.profile-consumers-review-capabilities').resources.includes('python-jsonschema'),true);
});

test('维护审查的实际场景输入声明 Go',async()=>{
 const {verificationToolRequirements}=await import('../.template-source/scripts/lib/verification-preflight.mjs');
 const {planTemplateVerification}=await import('../scripts/lib/template-verification.mjs');
 const workflow=planTemplateVerification({changedFiles:['tests/scenarios/verify-maintenance-review-workflow-scenarios.mjs']});
 assert.equal(verificationToolRequirements(workflow).go,true);assert.equal(verificationToolRequirements(workflow).native_cli,false);
});
