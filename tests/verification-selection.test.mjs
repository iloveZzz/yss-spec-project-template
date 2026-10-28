import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {planTemplateVerification,loadVerificationProfiles,ROOT} from '../scripts/lib/template-verification.mjs';
import {resolveVerificationScope} from '../scripts/lib/verification-report.mjs';
import {spawnSync} from 'node:child_process';
import {compileTaskExecution,addVerificationExecutionTasks} from '../.template-source/scripts/lib/verification-execution-plan.mjs';
const pilot='.agents/skills/yss-research/SKILL.md';
const pilotConfig=()=>loadVerificationProfiles();
test('初始化入口、Backend 策略和跨端引用变更运行同一个完整分发检查',()=>{
 const impacted=[
  'tests/spec-initial-entry.test.mjs',
  'tests/backend-decision-distribution.test.mjs',
  'tests/backend-handoff-reference.test.mjs',
  'tests/skills-reference-imports.test.mjs',
  '.template-source/distribution/bundle-profile.json',
  'profiles/backend/.template-source/distribution/bundle-profile.json',
  'profiles/backend/.template-spec/process/plan-migration.md',
  '.agents/skills/yss-implementation-contract-compiler/SKILL.md'
 ];
 for(const file of impacted){
  const checks=planTemplateVerification({changedFiles:[file]}).commands.filter(item=>item.id==='check.initialization-reference-boundaries');
  assert.equal(checks.length,1,file);
  for(const testFile of impacted.slice(0,4))assert.ok(checks[0].command.includes(testFile),`${file}: ${testFile}`);
 }
 assert.equal(planTemplateVerification({changedFiles:['README.md']}).commands.some(item=>item.id==='check.initialization-reference-boundaries'),false);
});
test('设计工具和身份回归测试变更均选择真实设计工具检查',()=>{
 for(const file of ['.agents/skills/yss-design-system/scripts/design-md.mjs','.workbuddy/skills/yss-design-system/scripts/design-md.mjs','.template-source/tooling/node/test/design-md.test.mjs']){
  const checks=planTemplateVerification({changedFiles:[file]}).commands.filter(item=>item.id==='check.design-md-instance-identity');
  assert.equal(checks.length,1,file);
  assert.ok(checks[0].command.includes('.template-source/tooling/node/test/design-md.test.mjs'),file);
 }
 const research = planTemplateVerification({changedFiles:['.agents/skills/yss-research/scripts/lib/competitive-analysis.mjs']});
 assert.ok(research.commands.some(item=>item.id==='check.initialization-reference-boundaries'), '已登记技能脚本变化需检查引用闭包');
});
test('竞品证据测试和维护收尾依赖各自选中实际场景',()=>{
 for(const [file,id] of [
  ['.agents/skills/yss-research/tests/competitive-scenarios.test.mjs','check.competitive-evidence-scenarios'],
  ['scripts/fixtures/lifecycle-core/research-competitive.test.mjs','check.competitive-completion-scenarios'],
  ['scripts/lib/source-context-snapshot.mjs','check.competitive-completion-scenarios']
 ])assert.equal(planTemplateVerification({changedFiles:[file]}).commands.filter(item=>item.id===id).length,1,file);
});
test('候选专用检查缺少候选时显式失败且日常选择只验证其保护',()=>{
 const ref='scripts/fixtures/initialization-reference-closure/verify-candidate.mjs';
 const plan=planTemplateVerification({changedFiles:[ref]});
 assert.ok(plan.commands.some(item=>item.id==='check.daily-selection'));
 assert.ok(!plan.commands.some(item=>item.command.includes(ref)), '候选验收不能在未提供候选时自动执行');
 const environment={...process.env};
 delete environment.NODE_TEST_CONTEXT;
 for(const key of ['YSS_NATIVE_BINARY','YSS_NATIVE_BINARY_SHA256','YSS_CANDIDATE_TREE','YSS_CANDIDATE_COMMIT','YSS_CANDIDATE_AUDIT_ROOT'])delete environment[key];
 const child=spawnSync(process.execPath,['--test',ref],{cwd:ROOT,env:environment,encoding:'utf8'});
 assert.notEqual(child.status,0);
 assert.match(`${child.stdout}${child.stderr}`,/candidate acceptance requires YSS_NATIVE_BINARY/);
});
test('后端终点场景拆分后 slow 和 release 保留两组完整检查及原单项预算',()=>{
 const files=['tests/backend-delivery-terminal.test.mjs','tests/backend-delivery-business-terminal.test.mjs'];
 const ids=['check.backend-delivery-terminal','check.backend-delivery-business-terminal'];
 for(const changed of [...files,'scripts/fixtures/backend-delivery/local-terminal-fixture.mjs','scripts/lib/backend-delivery-terminal.mjs','scripts/lib/backend-delivery.mjs']) {
  for(const options of [{includeSlow:true},{includeSlow:'only'},{profile:'release'}]) {
   const plan=planTemplateVerification({changedFiles:[changed],...options});
   const tasks=plan.commands.filter(row=>ids.includes(row.id));
   assert.deepEqual(tasks.map(row=>row.id).sort(),[...ids].sort(),`${changed}: ${JSON.stringify(options)}`);
   for(const [index,id] of ids.entries()) {
    const task=tasks.find(row=>row.id===id);
    assert.ok(task.command.includes(files[index]),task.command);
    assert.equal(task.timeout_ms,options.profile==='release'?1800000:300000);
   }
  }
 }
});
test('删除的 Design 插件测试选择现役插件边界检查',()=>{
 const plan=planTemplateVerification({changedFiles:[
  '.template-source/tooling/node/test/product-design-plugin.test.mjs',
  '.template-source/tooling/node/scripts/test-with-plugin-clis.mjs',
 ]});
 assert.equal(plan.commands.filter(row=>row.id==='check.plugin-supported-scope').length,1);
});
test('交接分发脚本选择实际离线兼容链',()=>{
 const plan=planTemplateVerification({changedFiles:['.template-source/scripts/verify-strategic-handoff-distribution.mjs']});
 const checks=plan.commands.filter(row=>row.id==='check.strategic-handoff-distribution');
 assert.equal(checks.length,1);
 assert.ok(checks[0].resources.includes('native-cli'));
 assert.ok(checks[0].resources.includes('repo-root-evidence'));
});
test('分诊回放入口选择离线行为测试',()=>{
 for(const ref of ['.template-source/scripts/replay-lifecycle-triage','tests/lifecycle-triage-replay.test.mjs']) {
  const plan=planTemplateVerification({changedFiles:[ref]});
  assert.equal(plan.commands.filter(row=>row.id==='check.lifecycle-triage-replay').length,1,ref);
 }
});
const releaseRequired=['check.release-profile-consumers','check.daily-execution','check.verification-script-retirement','check.daily-preflight','check.verification-report-v2','check.verification-artifacts','check.legacy-coverage','check.yss-cli-pin'];
test('本地 Codex 配置移出跟踪仍选择现有 hook 检查，未知相邻路径继续拒绝', () => {
 const plan=planTemplateVerification({changedFiles:['.codex/settings.local.json']});
 assert.equal(plan.commands.filter(row=>row.id==='check.agent-hook').length,1);
 assert.throws(()=>planTemplateVerification({changedFiles:['.codex/unregistered-local.json']}),/UNKNOWN_VERIFICATION_PATH/);
});
test('发布必跑唯一覆盖保留空差异、策略及 pin 的完整责任',t=>{
 const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'required-selection-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 for(const [index,changedFiles]of [[],['.template-source/process/template-verification-profiles.yaml'],['.template-source/distribution/yss-cli-pin.json']].entries()){
  const p=planTemplateVerification({profile:'release',changedFiles});assert.equal(p.source_requirement,'committed');
  for(const id of releaseRequired){assert.equal(p.commands.filter(x=>x.id===id).length,1,id);assert.equal(p.commands.find(x=>x.id===id).source_requirement,'committed',id);}
  const compiled=addVerificationExecutionTasks(p,{root:ROOT,reportDir:path.join(directory,String(index))});
  for(const ref of ['legacy-coverage','yss-cli-pin','verification-gates','verification-baseline','verification-qualification','verification-delivery-run','legacy-verification','verification-execution','verification-script-retirement','verification-preflight','verification-report-v2','verification-artifacts']){
   const target=path.join(ROOT,'tests',ref+'.test.mjs');
   assert.equal(compiled.commands.filter(row=>row.execution?.args?.some(arg=>path.resolve(ROOT,arg)===target)).length,1,`${changedFiles}: ${ref}`);
  }
 }
 const fast=planTemplateVerification({changedFiles:['README.md']});assert.ok(fast.commands.every(x=>!releaseRequired.includes(x.id)));
 const legacy=planTemplateVerification({changedFiles:['tests/verification-selection.test.mjs'],selection:'legacy'}),shadow=planTemplateVerification({changedFiles:['tests/verification-selection.test.mjs'],selection:'shadow'});
 assert.deepEqual(legacy.commands,shadow.commands);
 for(const id of ['check.release-profile-consumers','check.daily-report'])assert.ok(legacy.commands.some(row=>row.id===id),id);
 const release=planTemplateVerification({profile:'release',changedFiles:[]});
 assert.ok(release.commands.find(row=>row.id==='check.yss-cli-pin').gate_ids.includes('check.verification-lifecycle'));
 for(const id of releaseRequired.slice(0,6))assert.ok(release.commands.find(row=>row.id===id).gate_ids.includes('check.verification-final-integrity'),id);
 assert.ok(release.commands.find(row=>row.id==='check.release-profile-consumers').gate_ids.includes('check.verification-distribution'));
});
test('发布必跑唯一覆盖拒绝非法显式清单，缺字段保留旧规则',()=>{
 for(const value of [null,'check.x',[''],[1],[releaseRequired[0],releaseRequired[0]],['check.not-registered']]){
  const config=loadVerificationProfiles();config.profiles.release.required_checks=value;
  assert.throws(()=>planTemplateVerification({profile:'release',config}),/RELEASE_REQUIRED_CHECKS_INVALID/);
  assert.doesNotThrow(()=>planTemplateVerification({changedFiles:['README.md'],config}));
 }
 const config=loadVerificationProfiles();delete config.profiles.release.required_checks;
 assert.doesNotThrow(()=>planTemplateVerification({profile:'release',config}));
});
test('产物消费者实际执行来源收集且不依赖旧名称',t=>{
 const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'artifact-selection-')));
 t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const marker=path.join(directory,'source-collection-ran');
 const plan=planTemplateVerification({changedFiles:['tests/verification-artifacts.test.mjs']});
 const consumers=plan.commands.map(task=>compileTaskExecution(task,{root:ROOT})).filter(execution=>execution?.args.some(arg=>arg.endsWith('/verification-artifacts.test.mjs')));
 assert.equal(consumers.length,1);
 const environment={...process.env};delete environment.NODE_TEST_CONTEXT;
 for(const execution of consumers){
  const args=execution.args.map((arg,index)=>{
   if(!arg.endsWith('.test.mjs'))return arg;
   const file=path.join(directory,`${index}.test.mjs`);
   fs.writeFileSync(file,arg.endsWith('/verification-artifacts.test.mjs')?`import test from 'node:test';import fs from 'node:fs';test('发行来源收集：固定二进制与源码提交必须与固定文件一致，不要求 Bundle 绑定本次模板，也不接受装配输入',()=>fs.writeFileSync(${JSON.stringify(marker)},'ran'));`:'');
   return file;
  });
  const child=spawnSync(execution.file,args,{cwd:execution.cwd,env:environment,encoding:'utf8'});
  assert.equal(child.status,0,child.stderr||child.stdout);
 }
 assert.equal(fs.existsSync(marker),true,'登记的参数必须实际执行来源收集场景');
 for(const ref of ['tests/verification-artifacts.test.mjs','.template-source/scripts/lib/verification-artifacts.mjs']){
  const p=planTemplateVerification({changedFiles:[ref]}),checks=p.commands.filter(x=>x.id==='check.verification-artifacts');
  assert.equal(checks.length,1);assert.deepEqual(checks[0].resources,['native-cli','go']);
 }
 assert.ok(!plan.commands.some(x=>x.id==='check.template-release-sources'));
 for(const ref of ['.template-source/contracts/spec-backend-direct-consumption-design.md','.template-source/contracts/harness-hardening-v1.md'])assert.ok(planTemplateVerification({changedFiles:[ref]}).commands.some(x=>x.id==='check.doc-facts'));
 assert.ok(!planTemplateVerification({changedFiles:['README.md']}).commands.some(x=>x.id==='check.verification-artifacts'));
 assert.throws(()=>planTemplateVerification({changedFiles:['tests/new-unregistered-audit.test.mjs']}),/UNKNOWN_VERIFICATION_PATH/);
});
test('CI共享仓根交接运输的检查使用同一互斥资源',()=>{
 const plan=planTemplateVerification({includeSlow:true,changedFiles:['scripts/fixtures/role-independent-draft/handoff-chain.test.mjs','tests/scenarios/verify-strategic-handoff-package-scenarios.mjs','scripts/fixtures/business-tickets/handoff.test.mjs','tests/scenarios/verify-existing-ui-baseline-scenarios.mjs']});
 for(const id of ['check.role-independent-formal-current','check.strategic-handoff-package-scenarios','check.work-layout-tickets','check.existing-ui-baseline-scenarios'])assert.ok(plan.commands.find(check=>check.id===id)?.resources.includes('repo-root-evidence'),id);
});
test('Plan审查测试唯一归属保留触发与门禁，耗时组在fast明确延后',()=>{
 const files=['scripts/lib/plan-review-control.mjs','scripts/lib/review-package.mjs','scripts/lib/work-layout.mjs','scripts/fixtures/plan-review-control/build-fixture.mjs'];
 for(const file of files){
  const plan=planTemplateVerification({includeSlow:true,changedFiles:[file]});
  for(const name of ['plan-review-control','review-capabilities']){
   const owners=plan.commands.filter(row=>row.command.includes(`/${name}.test.mjs`));
   assert.equal(owners.length,1,`${file}: ${name}`);
   assert.ok(loadVerificationProfiles().gates.find(row=>row.id==='check.verification-approval').check_ids.includes(owners[0].id));
  }
 }
 for(const [id,file] of [
  ['check.role-independent-formal-current','scripts/fixtures/role-independent-draft/handoff-chain.test.mjs'],
  ['check.plan-review-control-unit','.template-source/tooling/node/test/plan-review-control.test.mjs'],
  ['check.plugin-scope-terminal','.template-source/tooling/node/test/plugin-terminal.test.mjs'],
  ...['check.cli-content-identity','check.cli-content-identity-rest','check.cli-content-identity-install'].map(id=>[id,'.template-source/distribution/yss-cli-pin.json']),
  ['check.plan-spec-entry-scenarios','tests/scenarios/verify-plan-spec-entry-scenarios.mjs'],
  ['check.backend-scaffold-direct-generation','scripts/lib/standalone-backend-scaffold.mjs'],
  ['check.backend-delivery-terminal','scripts/lib/backend-delivery.mjs'],
  ['check.scaffold-contract-consumers','scripts/lib/implementation-contract-compiler.mjs']
 ]){
  const fast=planTemplateVerification({changedFiles:[file]});
  assert.equal(fast.commands.some(row=>row.id===id),false,id);
  assert.ok(fast.selection.omitted.some(row=>row.id===id&&row.reason==='deferred-slow-check'),id);
  assert.ok(planTemplateVerification({profile:'release',changedFiles:[file]}).commands.some(row=>row.id===id),id);
 }

});
test('日常新设计与计划只登记文档消费者',()=>{
 for(const ref of ['.template-source/contracts/spec-backend-direct-consumption-design.md','.template-source/contracts/harness-hardening-v1.md']){
  const plan=planTemplateVerification({changedFiles:[ref]});
  assert.equal(plan.effective_profile,'fast');
  assert.ok(plan.commands.some(row=>row.id==='check.doc-facts'),ref);
  assert.ok(plan.commands.every(row=>!row.id.includes('release')),ref);
 }
 for(const ref of ['.template-spec/process/orchestration/entry/request-triage.yaml','.agents/skills/yss-product-lifecycle/references/conditional-guidance.md']){
  assert.ok(planTemplateVerification({changedFiles:[ref]}).commands.some(row=>row.id==='check.specialist-business-inputs'),ref);
 }
});
test('路由与推进意图测试按自身输入选择，发布路由检查必选且不重复',()=>{
 for(const [file,id]of [['tests/native-consumer-routing.test.mjs','check.native-consumer-routing'],['tests/progression-target-evidence.test.mjs','check.progression-target-evidence']]){
  const plan=planTemplateVerification({changedFiles:[file]});assert.equal(plan.commands.filter(row=>row.id===id).length,1);
 }
 const release=planTemplateVerification({profile:'release',changedFiles:[]});
 assert.equal([...release.commands,...release.supplemental_checks].filter(row=>row.id==='check.native-consumer-routing').length,1);
 assert.ok(release.commands.find(row=>row.id==='check.native-consumer-routing').gate_ids.includes('check.verification-spec-cli'));
});
test('日常 Skill 文本只选择一致性检查，不启动无关场景或发布准备',()=>{
 const plan=planTemplateVerification({changedFiles:['.agents/skills/yss-cache/SKILL.md']});
 assert.equal(plan.effective_profile,'fast');
 assert.equal(plan.selection.effective,'allowlist');
 assert.ok(plan.commands.some(x=>x.command==='scripts/sync-skills --check'));
 const skillConsumers = new Set(['check.public-skill-export','check.retired-skill-ids','check.distribution-hygiene']);
 assert.ok(plan.commands.every(x=>skillConsumers.has(x.id)||(!x.command.includes('--test')&&!x.command.includes('run-scenarios')&&!x.command.includes('upstream-skill-source'))));
 for (const id of skillConsumers) assert.equal(plan.commands.filter(item=>item.id===id).length,1,id);
 assert.ok(plan.commands.every(x=>skillConsumers.has(x.id)||(x.selection_reason.includes('SKILL.md')&&x.selection_reason.includes('错误'))));
});
test('日常核心验证器保持 fast，缺映射和依赖错误在执行前拒绝',()=>{
 const plan=planTemplateVerification({changedFiles:['scripts/lib/json-schema.mjs']});
 assert.equal(plan.effective_profile,'fast');
 assert.ok(plan.commands.some(item=>item.command.includes('schema-rejection.test.mjs')));
 assert.ok(planTemplateVerification({changedFiles:['scripts/lib/user-decision-core.mjs']}).commands.some(item=>item.id==='check.go-validator-replay'),'用户决定调用必须选择原生消费者回放');
 assert.throws(()=>planTemplateVerification({changedFiles:['.agents/skills/yss-cache/scripts/unmapped.mjs']}),/INCOMPLETE_VERIFICATION_INPUTS/,'技能树一致性不能掩盖缺失的脚本行为映射');
 const incomplete=loadVerificationProfiles();incomplete.profiles.fast.checks[0].inputs_complete=false;
 assert.throws(()=>planTemplateVerification({changedFiles:['.agents/skills/yss-cache/SKILL.md'],config:incomplete}),/INCOMPLETE_VERIFICATION_INPUTS/);
 const duplicate=loadVerificationProfiles();duplicate.groups.skills.commands[0].id='check.skill-projection-identity';
 assert.throws(()=>planTemplateVerification({changedFiles:['.agents/skills/yss-cache/SKILL.md'],config:duplicate}),/检查 ID 冲突/);
 const config=loadVerificationProfiles();
 config.profiles.fast.checks.find(item=>item.id==='check.schema-runtime').depends_on=['missing'];
 assert.throws(()=>planTemplateVerification({changedFiles:['scripts/lib/json-schema.mjs'],config}),/未知检查依赖/);
 const original=planTemplateVerification({profile:'release',changedFiles:[pilot]});
 assert.equal(original.strategy,'release');assert.equal(original.selection.effective,'impact');assert.ok(original.commands.some(task=>task.command==='scripts/sync-skills --check'));
 assert.ok(original.commands.length<Object.values(loadVerificationProfiles().groups).reduce((sum,group)=>sum+group.commands.length,0));
});
test('日常检查选择包含明确消费者和前置，legacy与shadow保持原组范围',()=>{
 const config=loadVerificationProfiles();
 const check=config.profiles.fast.checks.find(item=>item.id==='check.schema-runtime');
 check.depends_on=['check.skill-projection-identity'];
 const selected=planTemplateVerification({changedFiles:['scripts/lib/json-schema.mjs'],config});
 assert.ok(selected.commands.some(item=>item.id==='check.skill-projection-identity'&&item.selection_reason.startsWith('dependency-of:')));
 const legacy=planTemplateVerification({changedFiles:[pilot],selection:'legacy'});
 const shadow=planTemplateVerification({changedFiles:[pilot],selection:'shadow'});
 assert.deepEqual(legacy.commands,shadow.commands);
 assert.ok(legacy.commands.length>planTemplateVerification({changedFiles:[pilot]}).commands.length);
 const repeated=loadVerificationProfiles();repeated.groups.hygiene.commands.push(structuredClone(repeated.groups.hygiene.commands[0]));
 const occurrences=planTemplateVerification({changedFiles:[pilot],selection:'legacy',config:repeated}).commands;
 assert.equal(new Set(occurrences.map(item=>item.task_id)).size,occurrences.length,'恢复原组范围也必须保留重复任务的独立身份');
 assert.ok(planTemplateVerification({changedFiles:['scripts/lib/user-decision.mjs'],selection:'legacy'}).commands.length>0);
 const executable='.agents/skills/yss-research/scripts/lib/evidence.mjs';
 const retired=executable.replace('.agents/','.codex/');
 assert.ok(planTemplateVerification({changedFiles:[retired]}).commands.some(item=>item.id==='check.claude-entry'),'已删除的投影根路径必须由检查登记，避免复活后无人发现');
});
test('目标意图的候选当前性及其消费者必须选择真实 Git 边界检查', () => {
 for (const ref of ['scripts/lib/implementation-candidate-current.mjs', 'scripts/lib/backend-review.mjs', 'scripts/lib/backend-standards-coverage.mjs', 'scripts/lib/existing-backend-architecture.mjs', 'tests/implementation-candidate-current.test.mjs']) {
  const plan = planTemplateVerification({changedFiles: [ref],selection:'legacy',config:pilotConfig()});
  assert.ok(plan.commands.some(item => item.id === 'check.implementation-candidate-current'), ref);
 }
});

test('AR12b 薄适配与来源依赖选择真实入口回放，退役规则选择来源约束检查',()=>{
 for(const ref of ['.template-source/distribution/bundle-profile.json','profiles/design/.template-source/distribution/bundle-profile.json','profiles/backend/.template-source/distribution/bundle-profile.json','tests/ar12b-retirement.test.mjs']){
  assert.ok(planTemplateVerification({changedFiles:[ref]}).commands.some(row=>row.id==='check.ar12b-retirement'),ref);
 }
});


test('path sets cover add delete rename untracked; candidate and release cannot hide actual paths',()=>{
 const actual=[pilot,'.agents/skills/yss-research/references/deleted.md','.agents/skills/yss-research/references/new.md','unknown-untracked'];
 for(const profile of ['release'])assert.deepEqual(resolveVerificationScope({profile,explicit:[pilot],actual}).files,[...actual].sort());
 assert.equal(resolveVerificationScope({profile:'fast',explicit:[pilot],actual}).kind,'limited');
 assert.throws(()=>planTemplateVerification({changedFiles:actual}),/UNKNOWN_VERIFICATION_PATH/);
});



test('正式 Schema 和 phase 变化仍执行完整合同，业务票源码选择合同测试', () => {
  for (const file of ['scripts/lib/json-schema.mjs', 'scripts/lib/validation-phase.mjs']) {
    const plan = planTemplateVerification({ profile:'release', changedFiles: [file] });
    assert.equal(plan.effective_profile, 'release', file);
    assert.ok(plan.commands.some(item => item.command.includes('schema-rejection.test.mjs')));
  }
  const plan = planTemplateVerification({ profile:'release',changedFiles: ['scripts/lib/business-tickets.mjs'] });
  assert.ok(plan.commands.some(item => item.command.includes('fixtures/business-tickets/')));
});

test('选中的 Schema 行为测试能发现全部接受的错误实现', t => {
  const plan = planTemplateVerification({ changedFiles: ['scripts/lib/json-schema.mjs'] });
  const selected = plan.commands.find(item => item.command.includes('schema-rejection.test.mjs'));
  assert.ok(selected, '必须选择实际拒绝行为测试');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'selection-mutant-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const ref of ['scripts/lib/json-schema.mjs', 'scripts/lib/validation-phase.mjs', 'scripts/lib/source-context-snapshot.mjs', 'scripts/fixtures/contract-efficiency/schema-rejection.test.mjs']) {
    fs.mkdirSync(path.dirname(path.join(root, ref)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, ref), path.join(root, ref));
  }
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const run = () => spawnSync(process.execPath, ['--test', 'scripts/fixtures/contract-efficiency/schema-rejection.test.mjs'], { cwd: root, env, encoding: 'utf8' });
  const initial = run();
  assert.equal(initial.status, 0, `${initial.stdout}${initial.stderr}`);
  const file = path.join(root, 'scripts/lib/json-schema.mjs'), original = fs.readFileSync(file, 'utf8');
  const changed = original.replace('return jobs.map((_,i)=>structuredClone(cached.get(i)));', "return jobs.map(() => ({valid: true, error: ''}));");
  assert.notEqual(changed, original);
  fs.writeFileSync(file, changed);
  assert.notEqual(run().status, 0, '错误实现必须被实际测试拒绝');
  fs.writeFileSync(file, original);
  assert.equal(run().status, 0);
});

test('CI 空变化仍必跑守卫且每个 ID 只出现一次，拒绝失效绑定', async () => {
 const {ciVerificationCheckIds,STEPS}=await import('../scripts/lib/ci-gate.mjs');
 assert.equal(typeof ciVerificationCheckIds,'function');
 const ids=ciVerificationCheckIds();
 assert.deepEqual(ids,['check.skill-projection-identity','check.skill-lock-current','check.9f66238a57e457bf','check.022dccdddca70b70']);
 const plan=planTemplateVerification({changedFiles:[],ciGuards:true});
 for(const id of ids){assert.equal(plan.commands.filter(x=>x.id===id).length,1);assert.equal(plan.commands.find(x=>x.id===id).selection_reason,'ci-required');}
 for(const id of ids)assert.equal(planTemplateVerification({changedFiles:['.agents/skills/yss-domain/SKILL.md'],ciGuards:true}).commands.find(x=>x.id===id).selection_reason,'ci-required');
 assert.equal(planTemplateVerification({changedFiles:[]}).commands.length,0);
 for(const options of [{profile:'release'},{includeSlow:'only'},{selection:'legacy'},{selection:'shadow'}])assert.throws(()=>planTemplateVerification({...options,ciGuards:true}),/CI_GUARDS_FAST_ONLY/);
 const missing=loadVerificationProfiles();missing.profiles.fast.checks=missing.profiles.fast.checks.filter(x=>x.id!==ids[0]);
 assert.throws(()=>planTemplateVerification({config:missing,ciGuards:true}),/CI_GUARD_BINDING/);
 const wrong=loadVerificationProfiles();wrong.profiles.fast.checks.find(x=>x.id===ids[0]).run='scripts/verify-doc-facts';
 assert.throws(()=>planTemplateVerification({config:wrong,ciGuards:true}),/CI_GUARD_BINDING/);
 assert.deepEqual(STEPS.filter(x=>x.verification_check_id).map(x=>x.command.join(' ')).sort(),plan.commands.filter(x=>ids.includes(x.id)).map(x=>x.command).sort());
});

test('工作布局扫描准备独立 CLI 例外所需的固定来源', async () => {
 const {verificationToolRequirements}=await import('../.template-source/scripts/lib/verification-preflight.mjs');
 const plan=planTemplateVerification({changedFiles:['scripts/fixtures/backend-scaffold/design-prerequisites.mjs'],ciGuards:true});
 assert.ok(plan.commands.find(item=>item.id==='check.work-layout-hardcodes').resources?.includes('native-cli'));
 assert.equal(verificationToolRequirements(plan,{reportValidation:true}).native_cli,true);
});

test('原始选择读取提交、index、工作树及中文未跟踪路径且不探测工具', async t => {
 const {selectVerificationInputs}=await import('../.template-source/scripts/lib/template-verification-worker.mjs');
 assert.equal(typeof selectVerificationInputs,'function');
 const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'ci-raw-selection-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const git=(...args)=>{const r=spawnSync('git',['-c','user.name=t','-c','user.email=t@example.invalid','-c','commit.gpgsign=false',...args],{cwd:directory,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
 fs.mkdirSync(path.join(directory,'docs'));fs.mkdirSync(path.join(directory,'.template-source/process'),{recursive:true});
 fs.copyFileSync(path.join(ROOT,'.template-source/process/template-verification-profiles.yaml'),path.join(directory,'.template-source/process/template-verification-profiles.yaml'));
 fs.writeFileSync(path.join(directory,'README.md'),'base');git('init','-q');git('add','.');git('commit','-qm','base');const base=git('rev-parse','HEAD');
 fs.writeFileSync(path.join(directory,'docs/committed.md'),'commit');git('add','.');git('commit','-qm','next');
 fs.writeFileSync(path.join(directory,'docs/staged.md'),'staged');git('add','.');fs.appendFileSync(path.join(directory,'README.md'),'dirty');fs.writeFileSync(path.join(directory,'docs/中文 未跟踪.md'),'new');
 const reportDir=path.join(directory,'would-be-invalid-report');
 const selected=await selectVerificationInputs(['--base',base,'--ci-guards','--report-dir',reportDir],directory,{environment:{PATH:'/no-tools'}});
 assert.deepEqual(selected.scope.files,['README.md','docs/committed.md','docs/staged.md','docs/中文 未跟踪.md']);
 assert.ok(selected.plan.commands.every(x=>x.kind!=='preflight'&&!x.execution));assert.equal(fs.existsSync(reportDir),false);
 const slow=await selectVerificationInputs([],directory,{environment:{YSS_VERIFY_SLOW:'only'}});
 assert.equal(slow.plan.commands.filter(x=>x.id==='check.skill-lock-current').length,0);
 assert.ok(slow.plan.commands.length>0);
});

test('重复登记合并保持输入与 Gate 并集',async()=>{
 const {compileVerificationCheck,compileTaskExecution}=await import('../.template-source/scripts/lib/verification-execution-plan.mjs');
 const {readHistoricalProfiles}=await import('../.template-source/scripts/lib/legacy-verification.mjs');
 const current=loadVerificationProfiles(),historical=readHistoricalProfiles(ROOT,'6f8f19d5a4ee7e62cbb73c9cc9ed0142ff4730c0');
 const definition=(config,id)=>{const raw=config.profiles.fast.checks.find(x=>x.id===id),base=Object.entries(config.groups).flatMap(([group,g])=>g.commands.map(value=>({...(typeof value==='string'?{run:value}:value),group}))).find(x=>x.id===id);return {...base,...raw};};
 for(const [keep,old] of [['check.openapi-validation-scenarios','check.work-layout-openapi-draft-validation'],['check.structured-assets','check.work-layout-assets']]){
  assert.equal(current.profiles.fast.checks.some(x=>x.id===old),false);
  const retained=definition(current,keep),before=[definition(historical,keep),definition(historical,old)];
  assert.ok(historical.profiles.fast.checks.some(x=>x.id===old),'旧策略仍保留旧身份');
  const compiled=before.map(raw=>compileVerificationCheck(raw,{group:raw.group,profile:'fast'}));
  assert.equal(compiled[0].command,compiled[1].command);
  assert.deepEqual(compileTaskExecution(compiled[0],{root:ROOT}),compileTaskExecution(compiled[1],{root:ROOT}));
  for(const field of ['input_patterns','resources','depends_on'])for(const value of new Set(before.flatMap(raw=>raw[field]||[])))assert.ok(retained[field]?.includes(value),`${keep} ${field}: ${value}`);
  for(const gate of historical.gates.filter(g=>g.check_ids.includes(keep)||g.check_ids.includes(old)))assert.ok(current.gates.find(g=>g.id===gate.id).check_ids.includes(keep),gate.id);
  for(const pattern of new Set(before.flatMap(raw=>raw.input_patterns))){
   const file=pattern.replaceAll('**','sample').replaceAll('*','sample');
   const plan=planTemplateVerification({changedFiles:[file]});assert.equal(plan.commands.filter(x=>x.id===keep).length,1,file);assert.equal(plan.commands.some(x=>x.id===old),false);
   const selected=plan.commands.find(x=>x.id===keep);for(const dep of retained.depends_on)assert.ok(plan.commands.some(x=>x.id===dep));
   for(const resource of retained.resources||[])assert.ok(selected.resources.includes(resource));
  }
 }
});

test('输入准备只选择真实消费者', async () => {
  for (const ref of ['tests/daily-input-preparation.test.mjs', '.agents/skills/yss-product-lifecycle/references/daily-delivery.md', '.template-spec/process/daily-input-preparation.md', 'profiles/backend/.agents/skills/harness-orchestrator/SKILL.md']) {
    const p = planTemplateVerification({changedFiles: [ref]});
    const checks = p.commands.filter(x => x.id === 'check.daily-input-preparation');
    assert.equal(checks.length, 1, ref);
    assert.ok(checks[0].resources.includes('native-cli'));
  }
  for (const ref of ['.template-source/contracts/spec-backend-direct-consumption-design.md', '.template-source/contracts/harness-hardening-v1.md']) {
    assert.ok(planTemplateVerification({changedFiles: [ref]}).commands.some(x => x.id === 'check.doc-facts'), ref);
  }
  assert.ok(!planTemplateVerification({changedFiles: ['README.md']}).commands.some(x => x.id === 'check.daily-input-preparation'));
  assert.throws(() => planTemplateVerification({changedFiles: ['tests/unregistered-daily-behavior.test.mjs']}), /UNKNOWN_VERIFICATION_PATH/);
  const {composeProfileTree} = await import('../scripts/lib/profile-tree.mjs');
  const ref = '.template-spec/process/daily-input-preparation.md';
  assert.deepEqual(fs.readFileSync(path.join(composeProfileTree('backend', {root: ROOT}), ref)), fs.readFileSync(path.join(ROOT, ref)));
});

test('检查超时：默认值、显式值与非法值', async () => {
  const { compileVerificationCheck } = await import('../.template-source/scripts/lib/verification-gates.mjs');
  assert.equal(compileVerificationCheck({ run: 'node --test x' }, { profile: 'fast' }).timeout_ms, 300000);
  assert.equal(compileVerificationCheck({ run: 'node --test x' }, { profile: 'release' }).timeout_ms, 1800000);
  assert.equal(compileVerificationCheck({ run: 'node --test x', timeout_ms: 0 }, { profile: 'fast' }).timeout_ms, 0);
  assert.equal(compileVerificationCheck({ run: 'node --test x', timeout_ms: 1234 }, { profile: 'fast' }).timeout_ms, 1234);
  assert.throws(() => compileVerificationCheck({ run: 'node --test x', timeout_ms: -1 }, { profile: 'fast' }), /VERIFICATION_TIMEOUT_INVALID/);
});

test('WorkBuddy projection changes route to skill checks while private host configuration remains unknown', () => {
 for (const prefix of ['', 'profiles/backend/']) {
   const ref=`${prefix}.workbuddy/skills/code-review/SKILL.md`;
   const plan=planTemplateVerification({changedFiles:[ref]});
   assert.ok(plan.commands.some(check=>check.id==='check.workbuddy-skills'),ref);
   assert.equal(plan.unknown_files.length,0);
 }
 for (const runtimeRoot of ['.workbuddy', '.codebuddy']) {
  assert.throws(()=>planTemplateVerification({changedFiles:[`${runtimeRoot}/private.json`]}),/UNKNOWN_VERIFICATION_PATH/);
 }
});

test('WorkBuddy executable and structured projections retain canonical behavior checks', () => {
  for (const suffix of ['scripts/lib/evidence.mjs', 'assets/research-evidence.schema.json']) {
   const ref=`.workbuddy/skills/yss-research/${suffix}`;
   const plan=planTemplateVerification({changedFiles:[ref]});
   assert.ok(plan.commands.some(check=>check.id==='check.research-evidence-scenarios'),ref);
  }
});

test('Retired WorkBuddy projection deletion remains covered during root migration', () => {
 for (const prefix of ['', 'profiles/backend/']) {
  const plan=planTemplateVerification({changedFiles:[`${prefix}.codebuddy/skills/code-review/SKILL.md`]});
  assert.ok(plan.commands.some(check=>check.id==='check.workbuddy-skills'));
 }
 const plan=planTemplateVerification({changedFiles:['.codebuddy/skills/yss-research/scripts/lib/evidence.mjs']});
 assert.ok(plan.commands.some(check=>check.id==='check.research-evidence-scenarios'));
});

test('WorkBuddy root generation entrypoints retain projection and idempotence checks', () => {
 for (const ref of ['scripts/sync-skills', 'scripts/update-skill-lock']) {
  const plan=planTemplateVerification({changedFiles:[ref]});
  for (const id of ['check.workbuddy-skills','check.c80aaecf300ddc1f']) {
   assert.ok(plan.commands.some(check=>check.id===id),`${ref}: ${id}`);
  }
 }
});

test('WorkBuddy source-only Profile entrypoint selects behavior and syntax checks', t => {
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'profile-skills-selection-'));
 t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const ref='.template-source/scripts/manage-profile-skills.mjs';
 const plan=planTemplateVerification({changedFiles:[ref]});
 for (const id of ['check.workbuddy-skills','check.c80aaecf300ddc1f']) {
  assert.ok(plan.commands.some(check=>check.id===id),`${ref}: ${id}`);
 }
 assert.deepEqual(plan.unknown_files,[]);
 const release=planTemplateVerification({profile:'release',changedFiles:[ref]});
 const compiled=addVerificationExecutionTasks(release,{root:ROOT,reference:true,reportDir:path.join(directory,'report')});
 assert.ok(compiled.commands.some(task=>task.kind==='syntax'&&task.command.endsWith(`'${ref}'`)));
});


const mergedReleaseChecks=['doc-facts','ci-adapters','agent-hook','claude-entry','explicit-invocation','process-glossary','instance-metadata','harness-metrics','skill-lock-readers','work-layout-hardcodes'];
test('条件补充责任在空差异、README及命中普通项时均保留一次执行',t=>{
 const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'merged-release-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const config=loadVerificationProfiles();
 const inputs=mergedReleaseChecks.flatMap(name=>config.profiles.fast.checks.find(x=>x.id===`check.${name}`).input_patterns.filter(ref=>!ref.includes('*')));
 for(const changedFiles of [[],['README.md'],inputs]){
  const plan=addVerificationExecutionTasks(planTemplateVerification({profile:'release',changedFiles}),{root:ROOT,reportDir:directory});
  for(const name of mergedReleaseChecks){
   const definition={...Object.values(config.groups).flatMap(g=>g.commands).find(x=>x.id===`check.${name}`),...config.profiles.fast.checks.find(x=>x.id===`check.${name}`)};
   const tasks=plan.commands.filter(row=>row.command===definition.run);
   assert.equal(tasks.length,1,`${changedFiles}: ${name}`);
   assert.equal(tasks[0].source_requirement,'committed',name);
   assert.ok(tasks[0].gate_ids.includes(name==='instance-metadata'?'check.verification-fixed-source':'check.verification-lifecycle'),name);
  }
 }
 const instance=addVerificationExecutionTasks(planTemplateVerification({profile:'release',changedFiles:[]}),{root:ROOT,repositoryMode:'project-instance',reportDir:directory});
 assert.ok(!instance.commands.some(row=>mergedReleaseChecks.includes(row.id?.replace('check.',''))),'不能扩大 project-instance 空差异必跑集合');
});
test('CLI 身份每组仅执行一次并保留 G01 G12 G13',()=>{
 const plan=planTemplateVerification({profile:'release',changedFiles:['.template-source/distribution/yss-cli-pin.json']});
 for(const suffix of ['','-install','-sync','-rest']){
  const task=plan.commands.find(row=>row.id===`check.cli-content-identity${suffix}`);
  assert.ok(task);assert.equal(plan.commands.filter(row=>row.command===task.command).length,1);
  assert.deepEqual(task.gate_ids.slice().sort(),['check.verification-fixed-source','check.verification-cli-core','check.verification-spec-cli'].sort());
 }
});
test('legacy和shadow仅命中cli-sync组时仍覆盖四组现役CLI身份检查',()=>{
 for(const selection of ['legacy','shadow'])for(const file of ['tests/cli-retirement.test.mjs','tests/native-consumer-routing.test.mjs','.template-spec/user-guide/cli/example.md']){
  const plan=planTemplateVerification({selection,changedFiles:[file]});
  for(const suffix of ['','-install','-sync','-rest'])assert.ok(plan.commands.some(task=>task.id===`check.cli-content-identity${suffix}`),`${selection}: ${file} ${suffix}`);
 }
});
test('Context与Profile两调用合并，WorkBuddy仅在独立效率检查在场时移除重复文件',t=>{
 const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'second-dedup-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const compile=(changedFiles,repositoryMode='template-source')=>addVerificationExecutionTasks(planTemplateVerification({profile:'release',changedFiles}),{root:ROOT,repositoryMode,reportDir:directory});
 const p=compile(['profiles/backend/AGENTS.md']);
 for(const command of ['node --test tests/native-context-retirement.test.mjs','node scripts/verify-profile-distribution']){
  const rows=p.commands.filter(row=>row.command===command);assert.equal(rows.length,1);
  assert.ok(rows[0].gate_ids.includes('check.verification-lifecycle'));assert.ok(rows[0].gate_ids.includes('check.verification-distribution'));
 }
 const overlap=compile(['scripts/sync-skills']);
 const efficiency=overlap.commands.find(x=>x.id==='check.c80aaecf300ddc1f'),workbuddy=overlap.commands.find(x=>x.id==='check.workbuddy-skills');
 assert.ok(workbuddy.depends_on.includes(efficiency.task_id));assert.ok(!workbuddy.command.includes('tests/skill-sync-efficiency.test.mjs'));
 const instance=compile(['scripts/sync-skills'],'project-instance');
 assert.ok(instance.commands.find(x=>x.id==='check.workbuddy-skills').command.includes('tests/skill-sync-efficiency.test.mjs'));
 const extra=compile(['tests/workbuddy-entry.test.mjs']);
 assert.ok(extra.commands.find(x=>x.id==='check.workbuddy-skills').command.includes('tests/skill-sync-efficiency.test.mjs'),'未选独立项仍保留原触发闭包');
});
