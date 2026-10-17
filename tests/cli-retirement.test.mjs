import {loadOrchestrationContract} from '../scripts/lib/orchestration-contract.mjs';
import {dailyStartStats} from '../scripts/lib/harness-metrics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {NATIVE_PROFILES, nativeBinary, nativeDigest, decodeNative, runNative, initializeNative, applyNative, inspectNative} from '../.template-source/scripts/lib/native-yss.mjs';
import {readYssCliPin, verifyPinnedBinary} from '../.template-source/scripts/lib/yss-cli-pin.mjs';

// FR-002：根仓不再用 submodule 固定 yss-cli，由 .template-source/distribution/yss-cli-pin.json 固定版本、提交与各平台摘要。
test('固定的 yss 二进制与固定文件一致：摘要、版本号和构建提交',t=>{
  const root=path.resolve(import.meta.dirname,'..'),pin=readYssCliPin(root);
  assert.ok(pin,'仓库必须带 yss-cli 固定文件');
  const verified=verifyPinnedBinary({digest:nativeBinary().digest,pin});
  if(!verified.pinned){t.diagnostic('本地覆盖（YSS_NATIVE_BINARY_OVERRIDE=1）：二进制未固定，不能当作固定版本通过');return;}
  const reported=runNative(['version']).result;
  assert.equal(reported.version,pin.version,'二进制自报版本与固定文件不一致');
  assert.equal(reported.cliCommit,pin.commit,'二进制的构建提交与固定文件不一致');
  assert.equal(reported.sourceState,'committed','固定的二进制必须来自已提交的 yss-cli 源码');
});

const scratch=t=>{const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'yss-native-consumer-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};
const put=(root,ref,bytes,mode=0o644)=>{const file=path.join(root,ref);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes,{mode});return file;};
const tree=root=>{
  if(!fs.existsSync(root))return [];
  return fs.readdirSync(root,{recursive:true}).sort().map(ref=>{const file=path.join(root,ref),stat=fs.lstatSync(file);return [ref,stat.isDirectory()?'directory':stat.isSymbolicLink()?'symlink':'file',stat.mode&0o777,stat.isFile()?nativeDigest(fs.readFileSync(file)):stat.isSymbolicLink()?fs.readlinkSync(file):null];});
};

test('消费版本化 envelope 并拒绝伪成功、错误码替换和未知协议',()=>{
  const ok={outputVersion:1,protocolVersion:1,command:'sync',profile:'spec',status:'ok',code:'OK',result:{}};
  assert.equal(decodeNative({stdout:JSON.stringify(ok),status:0},'sync').code,'OK');
  for(const invalid of [{...ok,protocolVersion:99},{...ok,status:'applied'},{...ok,code:'INPUT_DRIFT'}])assert.throws(()=>decodeNative({stdout:JSON.stringify(invalid),status:0},'sync'));
  assert.throws(()=>decodeNative({stdout:JSON.stringify(ok),status:1},'sync'),/退出码/);
  assert.throws(()=>decodeNative({stdout:JSON.stringify({...ok,status:'error',code:'INPUT_DRIFT'}),status:1},'sync','CONFLICT'),/错误码/);
});

test('二进制固定输入拒绝链接及摘要漂移',t=>{
  const root=scratch(t),binary=put(root,'yss','fixed bytes',0o755);
  assert.equal(nativeBinary({YSS_NATIVE_BINARY:binary}).digest,nativeDigest('fixed bytes'));
  assert.throws(()=>nativeBinary({YSS_NATIVE_BINARY:binary,YSS_NATIVE_BINARY_SHA256:'0'.repeat(64)}),/摘要漂移/);
  fs.symlinkSync(binary,path.join(root,'alias'));
  assert.throws(()=>nativeBinary({YSS_NATIVE_BINARY:path.join(root,'alias')}),/普通文件/);
});

for(const profile of NATIVE_PROFILES)test(`${profile}: 内容来源、预演、幂等同步与用户资产保护`,t=>{
  nativeBinary();const base=scratch(t),target=path.join(base,profile);
  const first=runNative(['init','--profile',profile,'--root',target,'--plan','--out',path.join(base,'init.json')]).result;
  assert.equal(fs.existsSync(target),false,'保存计划不能初始化项目');assert.ok(first.stats.changed>10);
  runNative(['init','--profile',profile,'--root',target,'--apply','--plan-file',path.join(base,'init.json')]);
  const metadata=JSON.parse(fs.readFileSync(path.join(target,'.yss.json'))),inspection=inspectNative(profile);
  assert.equal(metadata.profile,profile);assert.equal(metadata.protocolVersion,1);assert.equal(metadata.templateCommit,inspection.templateCommit);assert.equal(metadata.snapshotHash,inspection.sourceSnapshotHash);
  assert.match(fs.readFileSync(path.join(target,'yss-project.yaml'),'utf8'),/repository_mode:\s*project-instance/);
  for(const ref of ['.template-source','submodules','.github'])assert.equal(fs.existsSync(path.join(target,ref)),false);
  fs.appendFileSync(path.join(target,'CONTEXT.md'),'\n用户自定义备注：保留当前业务词汇。\n');
  const context=fs.readFileSync(path.join(target,'CONTEXT.md'));
  put(target,'src/business.txt','dirty business',0o600);put(target,'.github/workflows/user.yml','name: User\n',0o644);put(target,'.git/index','staged index',0o600);
  const protectedModes=['src/business.txt','.git/index'].map(ref=>fs.statSync(path.join(target,ref)).mode&0o777);
  const before=tree(target),preview=runNative(['sync','--root',target]).result;
  assert.equal(preview.stats.conflicts,0);assert.deepEqual(tree(target),before,'同步预演不能写入');
  applyNative('sync',profile,target,path.join(base,'sync.json'));
  assert.deepEqual(fs.readFileSync(path.join(target,'CONTEXT.md')),context);assert.equal(fs.readFileSync(path.join(target,'src/business.txt'),'utf8'),'dirty business');assert.equal(fs.readFileSync(path.join(target,'.git/index'),'utf8'),'staged index');assert.equal(fs.readFileSync(path.join(target,'.github/workflows/user.yml'),'utf8'),'name: User\n');
  assert.deepEqual(['src/business.txt','.git/index'].map(ref=>fs.statSync(path.join(target,ref)).mode&0o777),protectedModes);
  const repeated=runNative(['sync','--root',target]).result;assert.equal(repeated.stats.changed,0);assert.equal(repeated.stats.conflicts,0);
  const initialized=tree(target);runNative(['init','--profile',profile,'--root',target],{expectedCode:'CONFLICT'});assert.deepEqual(tree(target),initialized);
  runNative(['sync','--root',target,'--force'],{expectedCode:'ARGUMENT'});assert.deepEqual(tree(target),initialized);
});

test('已移除前端 Profile 的旧版和原生实例明确拒绝维护且保留全部文件',t=>{
  const base=scratch(t);
  for(const identity of ['legacy','native']) {
    const root=path.join(base,identity);
    if(identity==='legacy')put(root,'.yss-harness-frontend.json','{"metadataSchemaVersion":2,"profileId":"harness.frontend-delivery"}\n');
    else put(root,'.yss.json',JSON.stringify({schemaVersion:3,protocolVersion:1,profile:'frontend',profileId:'harness.frontend-delivery'}));
    put(root,'src/business.txt','未提交的业务内容',0o600);put(root,'.git/index','staged index',0o600);
    const before=tree(root);
    for(const args of [['sync'],['sync','--plan','--out',path.join(base,`${identity}-sync.json`)],['doctor'],['diff']]) {
      const result=runNative([...args,'--root',root],{expectedCode:'IDENTITY'});
      assert.match(JSON.stringify(result),/前端 Profile 已移除/);
      assert.deepEqual(tree(root),before,`${identity}: ${args.join(' ')} 不得修改用户文件、权限或暂存区`);
    }
    assert.equal(fs.existsSync(path.join(base,`${identity}-sync.json`)),false);
  }
});

test('项目内计划输出与后续输入漂移按各自错误码拒绝并保留现场',t=>{
  nativeBinary();const base=scratch(t),target=path.join(base,'project');initializeNative('spec',target);
  put(target,'.git/index','original index');const initial=tree(target);
  runNative(['sync','--root',target,'--plan','--out',path.join(target,'.git/index')],{expectedCode:'PROTECTED'});assert.deepEqual(tree(target),initial);
  const plan=path.join(base,'sync.json');runNative(['sync','--root',target,'--plan','--out',plan]);
  fs.appendFileSync(path.join(target,'CONTEXT.md'),'\n后续用户修改\n');const modified=tree(target);
  runNative(['sync','--root',target,'--apply','--plan-file',plan],{expectedCode:'INPUT_DRIFT'});assert.deepEqual(tree(target),modified);
});

test('Spec 日常路线拒绝前端声明与实际前端文件，保留后端路线',t=>{
  const base=scratch(t),root=path.join(base,'spec');let repo=path.join(base,'implementation');
  const source=path.resolve(import.meta.dirname,'..');
  put(root,'yss-project.yaml','schema_version: 1\nrepository_mode: project-instance\n');
  put(root,'.yss-template.json',JSON.stringify({metadataSchemaVersion:3,templateSource:'github:iloveZzz/yss-spec-project-template'}));
  const orchestration=loadOrchestrationContract(ref=>fs.readFileSync(path.join(source,ref)),'.template-spec/process/orchestration-contract.yaml');
  for(const ref of ['CONTEXT.md','AGENTS.md','.template-spec/agents/issue-tracker.md',...orchestration.refs])put(root,ref,fs.readFileSync(path.join(source,ref)));
  put(root,'facts.md','目标、验收、风险、基线与回滚均为本次测试输入。\n');
  const skill='适用后端技能\n';put(root,'skill.md',skill);
  put(repo,'src/server.js','export const enabled = false;\n');
  const git=(...args)=>{const r=spawnSync('git',args,{cwd:repo,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
  git('init','--quiet');git('add','.');git('-c','user.name=Test','-c','user.email=test@example.invalid','commit','--quiet','-m','baseline');
  const baseline=git('rev-parse','HEAD');
  const record={task_id:'AR12C-DAILY',delivery_path:'daily',formal_bindings:[],goal_ref:'facts.md',acceptance_ref:'facts.md',repository:{root:repo,baseline_sha:baseline,baseline_ref:'facts.md',rollback_ref:'facts.md'},scope:{paths:['src/'],impacts:['backend','no-api'],risk_ref:'facts.md'},skills:[{ref:'skill.md',digest:`sha256:${nativeDigest(skill)}`}],inputs:[],commands:[{argv:['node','--check','src/server.js'],cwd:'.'}],api:{mode:'none',reason:'无 API 变化'}};
  const task=()=>put(root,'task.md',`# 日常任务\n\n<!-- yss-task-evidence -->\n\`\`\`json\n${JSON.stringify(record)}\n\`\`\`\n`);
  const args=action=>['lifecycle',action,'--root',root,'--task','task.md','--implementation-root',repo,'--base',baseline];
  put(repo,'src/server.js','export const enabled = true;\n');task();
  assert.equal(runNative(args('route')).result.delivery_path,'daily');
  const agentProcess=spawnSync(nativeBinary().binary,[...args('route'),'--view','agent','--json'],{encoding:'utf8'});
  assert.equal(agentProcess.status,0,agentProcess.stderr);
  const agent=JSON.parse(agentProcess.stdout).result;
  assert.equal(agent.view,'agent');assert.equal(agent.route,'daily');assert.equal(agent.execution_allowed,false);
  assert.equal(agent.source_digests.orchestration_contract,`sha256:${orchestration.digest}`);
  const budget=dailyStartStats(root,agentProcess.stdout);
  assert.equal(budget.within_budget,true,JSON.stringify(budget));
  t.diagnostic(JSON.stringify(budget));
  for(const scenario of [{impacts:['frontend','no-api']},{impacts:['ui','no-api']},{side:'frontend'},{file:'src/Page.vue'},{file:'src/Page.tsx'},{file:'src/Page.jsx'},{paths:['apps/frontend/']},{file:'apps/frontend/main.js',paths:['apps/']}]) {
    record.scope.impacts=scenario.impacts??['no-api'];record.repository.side=scenario.side??'backend';record.scope.paths=['src/',...(scenario.paths??[])];
    if(scenario.file)put(repo,scenario.file,'前端页面\n');task();
    const before=tree(repo);
    for(const action of ['route','verify-daily']) {
      const result=runNative(args(action),{expectedCode:'FRONTEND_REMOVED'});
      assert.match(JSON.stringify(result),/前端实现已从生命周期移除/);
      assert.notEqual(result.result.delivery_path,'daily');assert.deepEqual(tree(repo),before);
    }
    if(scenario.file)fs.unlinkSync(path.join(repo,scenario.file));
  }
  const frontendRoot=path.join(base,'apps/frontend');fs.mkdirSync(path.dirname(frontendRoot),{recursive:true});fs.renameSync(repo,frontendRoot);repo=frontendRoot;
  record.repository.root=repo;delete record.repository.side;record.scope.impacts=['no-api'];record.scope.paths=['src/'];task();
  for(const action of ['route','verify-daily']) {
    const before=tree(repo),result=runNative(args(action),{expectedCode:'FRONTEND_REMOVED'});
    assert.match(JSON.stringify(result),/前端实现已从生命周期移除/);assert.deepEqual(tree(repo),before);
  }
});

test('公开 Bundle 导出保持完整文件 bytes、mode 和 manifest，拒绝覆盖目录',t=>{
  nativeBinary();const base=scratch(t),out=path.join(base,'export');
  const result=runNative(['bundle','export','--profile','spec','--out',out]).result;
  assert.equal(result.directory,out);const inspection=result.inspection;
  assert.ok([2,3].includes(inspection.schemaVersion),'公开导出使用受支持的固定 Bundle schema');assert.ok(result.files.length>10);
  for(const entry of result.files){const file=path.join(out,entry.path);assert.equal(nativeDigest(fs.readFileSync(file)),entry.digest,entry.path);assert.equal(fs.statSync(file).mode&0o777,entry.mode,entry.path);}
  const before=tree(out);
  runNative(['bundle','export','--profile','spec','--out',out],{expectedCode:'EXISTS'});assert.deepEqual(tree(out),before);
});

test('Spec 原生阶段资源与 Skill 补装通过保存计划完整闭包安装且保留用户词汇',t=>{
 const base=scratch(t),target=path.join(base,'selected');initializeNative('spec',target);
 const context=fs.readFileSync(path.join(target,'CONTEXT.md')),before=tree(target),plan=path.join(base,'assets.json');
 const assets=runNative(['assets','ensure','stage.system-data-engineering','--profile','spec','--root',target,'--plan','--out',plan]).result;
 assert.deepEqual(tree(target),before);assert.ok(assets.changes.some(row=>row.path==='scripts/backend-delivery'));
 runNative(['assets','ensure','stage.system-data-engineering','--profile','spec','--root',target,'--apply','--plan-file',plan]);
 assert.ok(fs.existsSync(path.join(target,'scripts/backend-delivery')));assert.ok(fs.existsSync(path.join(target,'.agents/skills/yss-implementation-contract-compiler/SKILL.md')));
 applyNative('skills','spec',target,path.join(base,'skill.json'),['ensure','yss-tactical-design']);
 assert.ok(fs.existsSync(path.join(target,'.agents/skills/yss-tactical-design/SKILL.md')));assert.ok(fs.existsSync(path.join(target,'scripts/verify-strategic-handoff-consumption')));
 assert.deepEqual(fs.readFileSync(path.join(target,'CONTEXT.md')),context);
 const metadata=JSON.parse(fs.readFileSync(path.join(target,'.yss.json'))),inspection=inspectNative('spec');
 assert.equal(metadata.schemaVersion,inspection.schemaVersion);assert.equal(metadata.bundleSchemaVersion,inspection.schemaVersion);
 const preview=runNative(['sync','--root',target]).result;assert.equal(preview.stats.changed,0);assert.equal(preview.stats.conflicts,0);
});

test('现役 archify 与 yss-research 补装不能绕过 UNPORTED，安装闭包中的真实入口可执行',t=>{
 const base=scratch(t),target=path.join(base,'research');initializeNative('spec',target);
 const context=fs.readFileSync(path.join(target,'CONTEXT.md')),inspection=inspectNative('spec');
 for(const skill of ['archify','yss-research']){
  const requirement=inspection.skillRequirements[skill];assert.ok(requirement,skill);
  assert.equal(requirement.unsupportedReason,undefined,`${skill} 是现役必要能力，UNPORTED 必须阻断`);
  assert.ok(requirement.paths.length>0,`${skill} 不能使用空闭包`);
  const plan=path.join(base,`${skill}.json`),before=tree(target);
  const preview=runNative(['skills','ensure',skill,'--profile','spec','--root',target,'--plan','--out',plan]).result;
  assert.deepEqual(tree(target),before,'保存补装计划不能写入实例');
  assert.ok(preview.changes.length>0 || requirement.paths.every(ref=>fs.existsSync(path.join(target,ref))),'已有完整闭包无需补装；缺失闭包必须生成变更');
  runNative(['skills','ensure',skill,'--profile','spec','--root',target,'--apply','--plan-file',plan]);
  assert.ok(fs.existsSync(path.join(target,'.agents/skills',skill,'SKILL.md')));
 }
 const doctor=spawnSync(process.execPath,['.agents/skills/archify/bin/archify.mjs','doctor'],{cwd:target,encoding:'utf8',timeout:60000});
 assert.equal(doctor.status,0,doctor.stderr);assert.equal(doctor.error,undefined);
 const validator=spawnSync(process.execPath,['.agents/skills/yss-research/scripts/validate-research-package.mjs'],{cwd:target,encoding:'utf8',timeout:60000});
 assert.equal(validator.status,1,validator.stderr);assert.match(validator.stderr,/usage: validate-research-package/);
 assert.doesNotMatch(validator.stderr,/ERR_MODULE_NOT_FOUND|Cannot find module/);
 assert.deepEqual(fs.readFileSync(path.join(target,'CONTEXT.md')),context);
 const preview=runNative(['sync','--root',target]).result;assert.equal(preview.stats.changed,0);assert.equal(preview.stats.conflicts,0);
});

test('按需安装两个后端脚手架包含平台证据且可显式独立生成参考工程', t => {
  const base = scratch(t), target = path.join(base, 'scaffold');
  initializeNative('spec', target);
  for (const skill of ['yss-ddd-scaffold-generator', 'yss-layered-mvc-scaffold-generator']) {
    applyNative('skills', 'spec', target, path.join(base, skill + '.json'), ['ensure', skill]);
    const generated = spawnSync(process.execPath, [`.agents/skills/${skill}/scripts/generate_scaffold.mjs`, '--standalone',
      '--project-name', 'reference-probe', '--base-package', 'com.yss.probe', '--output-dir', path.join(base, skill),
      '--platform-profile', 'spring-boot-3.5-jdk17', '--spring-boot-version', '3.5.16', '--java-version', '17',
      '--group-id', 'com.yss.example', '--project-version', '1.0.0-SNAPSHOT', '--parent-group-id', 'com.yss.cloud',
      '--parent-artifact-id', 'yss-cloud-microservice', '--parent-version', '3.2.0-SNAPSHOT',
      '--yss-components-version', '3.2.0-SNAPSHOT'], {cwd: target, encoding: 'utf8', timeout: 30000});
    assert.equal(generated.status, 0, generated.stderr);
    assert.ok(fs.existsSync(path.join(base, skill, 'reference-probe/examples/reference/openapi.yaml')));
  }
});
