import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {planTemplateVerification,loadVerificationProfiles,ROOT} from '../scripts/lib/template-verification.mjs';
import {resolveVerificationScope} from '../scripts/lib/verification-report.mjs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {compileTaskExecution,addVerificationExecutionTasks,resolveVerificationSource} from '../.template-source/scripts/lib/verification-execution-plan.mjs';
const inheritedSlow=process.env.YSS_VERIFY_SLOW;
delete process.env.YSS_VERIFY_SLOW;
test.after(()=>{if(inheritedSlow!==undefined)process.env.YSS_VERIFY_SLOW=inheritedSlow;});
const pilot='.agents/skills/yss-research/SKILL.md';
const pilotConfig=()=>loadVerificationProfiles();
test('CI 离线计划保留独立检查并明确延后工具和传递消费者',()=>{
 const mk=(name,run,resources=[],depends_on=[])=>({id:`check.${name}`,run,resources,depends_on,inputs_complete:true,input_patterns:['change.txt'],failure_mode:`${name} failure`,group:'test'});
 const checks=[mk('native','node native.mjs',['native-cli']),mk('plugin','node plugin.mjs',['plugin-candidate']),mk('committed','node committed.mjs',['plugin-committed']),mk('pnpm','pnpm test'),mk('go','go test ./...'),mk('vue','node tests/design-prototype-animation.test.mjs'),mk('dependent','node dependent.mjs',[],['check.native']),mk('transitive','node downstream.mjs',[],['check.dependent']),mk('offline','node offline.mjs')];
 const config={schema_version:1,profiles:{fast:{checks},release:{}},groups:{test:{commands:checks}},routing:[{patterns:['change.txt'],groups:['test']}],gates:[],syntax_files:[],required_files:[]};
 const plan=planTemplateVerification({config,changedFiles:['change.txt'],ciOffline:true});
 assert.deepEqual(plan.commands.map(x=>x.id),['check.offline']);
 const omitted=Object.fromEntries(plan.selection.omitted.filter(x=>x.reason==='deferred-ci-offline').map(x=>[x.id,x.deferred_reason]));
 for(const id of checks.slice(0,-1).map(x=>x.id))assert.ok(omitted[id],id);
 assert.match(omitted['check.dependent'],/check.native/);assert.match(omitted['check.transitive'],/check.dependent/);
 assert.equal(plan.selection.ci_offline,true);assert.equal(plan.selection.qualified,false);
 const normal=planTemplateVerification({config,changedFiles:['change.txt']});assert.equal(normal.commands.length,checks.length);
 for(const options of [{profile:'release'},{includeSlow:true},{includeSlow:'only'},{ciGuards:true},{selection:'legacy'},{selection:'shadow'}])assert.throws(()=>planTemplateVerification({config,changedFiles:['change.txt'],ciOffline:true,...options}),/CI_OFFLINE_FAST_ONLY/);
 assert.throws(()=>planTemplateVerification({config,changedFiles:['unknown.txt'],ciOffline:true}),/UNKNOWN_VERIFICATION_PATH|INCOMPLETE_VERIFICATION_INPUTS/);
});
test('离线选项由执行器与报告消费者独立重建并拒绝扩大范围',async t=>{
 const {selectVerificationInputs}=await import('../.template-source/scripts/lib/template-verification-worker.mjs');
 const {compileExpectedVerificationPlan}=await import('../.template-source/scripts/lib/verification-report-validator.mjs');
 const {verificationToolRequirements}=await import('../.template-source/scripts/lib/verification-preflight.mjs');
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'offline-plan-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'.template-source/process'),{recursive:true});
 fs.copyFileSync(path.join(ROOT,'.template-source/process/template-verification-profiles.yaml'),path.join(root,'.template-source/process/template-verification-profiles.yaml'));
 fs.writeFileSync(path.join(root,'yss-project.yaml'),'schema_version: 1\nrepository_mode: template-source\n');
 const git=(...args)=>{const r=spawnSync('git',['-c','user.name=test','-c','user.email=test@example.invalid','-c','commit.gpgsign=false',...args],{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
 git('init','-q');git('add','.');git('commit','-qm','base');const head=git('rev-parse','HEAD');
 const args=['--profile','fast','--base',head,'--changed-file','tests/scenarios/verify-user-decision-scenarios.mjs','--ci-offline'];
 const selected=await selectVerificationInputs(args,root,{environment:{...process.env,YSS_VERIFY_SLOW:''}});
 const rebuilt=compileExpectedVerificationPlan({root,args,environment:{...process.env,YSS_VERIFY_SLOW:''}});
 assert.deepEqual(selected.plan.selection.omitted,rebuilt.selection.omitted);
 assert.deepEqual(selected.plan.selection.candidate.map(row=>row.id),rebuilt.selection.candidate.map(row=>row.id));
 assert.equal(selected.plan.selection.ci_offline,true);
 assert.ok(selected.plan.selection.omitted.some(row=>row.reason==='deferred-ci-offline'));
 const needs=verificationToolRequirements(selected.plan);
 for(const key of ['native_cli','plugin_candidate','go','tooling','vue','design_vue'])assert.ok(!needs[key],key);
 for(const extra of [['--checkpoint','x'],['--task-package','x']]){
  await assert.rejects(selectVerificationInputs([...args,...extra],root),/CI_OFFLINE_EXPLICIT_INPUTS_REFUSED/);
  assert.throws(()=>compileExpectedVerificationPlan({root,args:[...args,...extra]}),/CI_OFFLINE_EXPLICIT_INPUTS_REFUSED/);
 }
 await assert.rejects(selectVerificationInputs(['--profile','release','--base',head,'--ci-offline'],root),/CI_OFFLINE_FAST_ONLY/);
 assert.throws(()=>compileExpectedVerificationPlan({root,args:['--profile','release','--base',head,'--ci-offline']}),/CI_OFFLINE_FAST_ONLY/);
 await assert.rejects(selectVerificationInputs(args,root,{environment:{...process.env,YSS_VERIFY_SLOW:'only'}}),/CI_OFFLINE_FAST_ONLY/);
});
test('退役覆盖率测试的真实删除差异选择发行消费者并拒绝未知相邻路径',async t=>{
 const {selectVerificationInputs}=await import('../.template-source/scripts/lib/template-verification-worker.mjs');
 const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'retired-coverage-selection-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const git=(...args)=>{const r=spawnSync('git',['-c','user.name=t','-c','user.email=t@example.invalid','-c','commit.gpgsign=false',...args],{cwd:directory,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
 fs.mkdirSync(path.join(directory,'.template-source/process'),{recursive:true});fs.mkdirSync(path.join(directory,'tests'));
 fs.copyFileSync(path.join(ROOT,'.template-source/process/template-verification-profiles.yaml'),path.join(directory,'.template-source/process/template-verification-profiles.yaml'));
 fs.writeFileSync(path.join(directory,'tests/legacy-coverage.test.mjs'),'retired');
 git('init','-q');git('add','.');git('commit','-qm','base');const base=git('rev-parse','HEAD');
 git('rm','-q','tests/legacy-coverage.test.mjs');git('commit','-qm','retire');
 for(const profile of ['fast','release']){
  const {scope,plan}=await selectVerificationInputs(['--profile',profile,'--base',base],directory);
  assert.deepEqual(scope.files,['tests/legacy-coverage.test.mjs']);
  assert.ok(plan.commands.some(row=>row.id==='check.release-profile-consumers'),profile);
 }
 fs.mkdirSync(path.join(directory,'tests'),{recursive:true});fs.writeFileSync(path.join(directory,'tests/legacy-coverage-unknown.test.mjs'),'unknown');
 await assert.rejects(selectVerificationInputs(['--profile','release','--base',base],directory),/UNKNOWN_VERIFICATION_PATH/);
});
test('可信发行来源登记的变更选择报告与发行消费者核验',()=>{
 const file='.template-source/process/trusted-verification-releases.json';
 for(const profile of ['fast','release']){
  const plan=planTemplateVerification({profile,changedFiles:[file]});
  for(const id of ['check.release-profile-consumers','check.verification-report-v2'])assert.ok(plan.commands.some(task=>task.id===id),`${profile}: ${id}`);
 }
});
test('相同的现役场景只执行一次并合并其发布 Gate',()=>{
 for(const [scenario,gates] of [
  ['verify-repository-scope-scenarios.mjs',['check.verification-implementation','check.verification-cli-core','check.verification-spec-cli']],
 ]){
  const file=`tests/scenarios/${scenario}`;
  const plan=planTemplateVerification({profile:'release',changedFiles:[file]});
  const checks=plan.commands.filter(task=>task.command===`node ${file}`);
  assert.equal(checks.length,1,scenario);
  for(const gate of gates)assert.ok(checks[0].gate_ids.includes(gate),`${scenario}: ${gate}`);
 }
});
test('现役检查、必需文件与语法清单直接使用已迁移的场景路径',()=>{
 const config=loadVerificationProfiles();
 const active=[...Object.values(config.groups).flatMap(group=>group.commands.map(task=>typeof task==='string'?task:task.run)),...config.required_files,...config.syntax_files];
 for(const entry of active){
  for(const match of entry.matchAll(/scripts\/verify-[a-z0-9-]+-scenarios/g)){
   const ref=match[0],target=resolveVerificationSource(ref);
   assert.ok(!fs.existsSync(path.join(ROOT,target)),`${entry} 应直接引用 ${target}`);
  }
  for(const ref of ['scripts/lib/api-contract-decision.test.mjs','scripts/lib/legacy-backend-scaffold-audit.test.mjs','scripts/verify-subagent-task-package','.template-source/tooling/node/scripts/design-md.mjs'])assert.ok(!entry.includes(ref),`${entry} 应直接引用 ${resolveVerificationSource(ref)}`);
 }
});
test('Skill 投影与锁在两个分组使用同一检查身份，并保留发布 Gate 与 CI 守卫',async()=>{
 const ids=['check.skill-projection-identity','check.skill-lock-current'];
 const config=loadVerificationProfiles();
 for(const group of ['skills','drift-identity']){
  for(const id of ids)assert.equal(config.groups[group].commands.filter(task=>task.id===id).length,1,`${group}: ${id}`);
 }
 for(const file of ['.template-source/scripts/manage-profile-skills.mjs','scripts/lib/drift-report.mjs']){
  const grouped=planTemplateVerification({changedFiles:[file],selection:'legacy'});
  for(const id of ids)assert.equal(grouped.commands.filter(task=>task.id===id).length,1,`${file}: ${id}`);
 }
 const release=planTemplateVerification({profile:'release',changedFiles:['.agents/skills/yss-cache/SKILL.md']});
 for(const id of ids){
  const tasks=release.commands.filter(task=>task.id===id);
  assert.equal(tasks.length,1,id);
  assert.ok(tasks[0].gate_ids.includes('check.verification-skills'),id);
 }
 const {ciVerificationCheckIds}=await import('../scripts/lib/ci-gate.mjs');
 for(const id of ids)assert.ok(ciVerificationCheckIds().includes(id),id);
});
test('前端入口退役后分组模式不运行已删除场景，当前拒绝保护仍被选择',()=>{
 const file='scripts/verify-frontend-scaffold-generator-scenarios';
 for(const selection of ['legacy','shadow']){
  const plan=planTemplateVerification({changedFiles:[file],selection});
  assert.ok(!plan.commands.some(task=>['check.ad648590e5e06103','check.842384deeb868cce'].includes(task.id)));
 }
 assert.ok(planTemplateVerification({changedFiles:[file]}).commands.some(task=>task.id==='check.frontend-removed'));
});
test('退役用户决定夹具的变更选择当前批准合同检查',()=>{
 for(const file of ['scripts/verify-user-decision-scenarios','tests/scenarios/verify-user-decision-scenarios.mjs'])for(const profile of ['fast','release']){
  const plan=planTemplateVerification({profile,changedFiles:[file]});
  const checks=plan.commands.filter(task=>task.id==='check.backend-governance-contract');
  assert.equal(checks.length,1,`${profile}: ${file}`);
  assert.ok(checks[0].command.includes('scripts/fixtures/role-independent-draft/approval.test.mjs'));
  assert.ok(!plan.commands.some(task=>task.id==='check.user-decision-scenarios'));
  if(profile==='release')assert.ok(checks[0].gate_ids.includes('check.verification-approval'));
 }
});
test('生命周期现役场景直接运行真实路径，文件变化命中检查和原有 Gate',()=>{
 const cases=[
  ['context-contract','check.b5ec80cdc570194f','check.verification-lifecycle'],
  ['business-language','check.c959490d7a86d5c9','check.verification-lifecycle'],
  ['script-performance','check.7752ee8d6f74f638','check.verification-lifecycle'],
 ];
 for(const [name,id,gate] of cases){
  const file=`tests/scenarios/verify-${name}-scenarios.mjs`,command=`node ${file}`;
  for(const options of [{},{profile:'release'},{selection:'legacy'}]){
   const plan=planTemplateVerification({...options,changedFiles:[file]});
   const tasks=plan.commands.filter(task=>task.id===id);
   assert.equal(tasks.length,1,`${name}: ${JSON.stringify(options)}`);
   assert.equal(tasks[0].command,command,name);
   if(options.profile==='release')assert.ok(tasks[0].gate_ids.includes(gate),name);
  }
 }
});
test('生命周期组保留现役场景，退役 Plan→Spec 夹具由当前安装验证覆盖',()=>{
 const group=loadVerificationProfiles().groups.lifecycle.commands;
 for(const [id,name] of [
  ['check.b5ec80cdc570194f','context-contract'],
  ['check.c959490d7a86d5c9','business-language'],['check.fbcca7d04b9634fc','context-reconciliation'],
  ['check.7752ee8d6f74f638','script-performance'],['check.14755c909a41ebee','plan-requirements-context'],
  ['check.cca7321527c13629','lifecycle-context-query'],['check.aafa7bdc8a88bf84','lifecycle-operator'],
  ['check.0c8201229a241875','lifecycle'],
 ])assert.equal(group.find(task=>task.id===id)?.run,`node tests/scenarios/verify-${name}-scenarios.mjs`,id);
 const file='tests/scenarios/verify-plan-spec-entry-scenarios.mjs';
 const plan=planTemplateVerification({profile:'release',changedFiles:[file]});
 assert.ok(!plan.commands.some(task=>task.id==='check.plan-spec-entry-scenarios'));
 assert.ok(plan.commands.some(task=>task.id==='check.spec-stage-installed'));
});
test('修复的 Context 调和、Plan 需求与生命周期场景按真实路径选择',()=>{
 for(const [name,id,gate,slow] of [
  ['context-reconciliation','check.fbcca7d04b9634fc','check.verification-lifecycle',true],
  ['plan-requirements-context','check.14755c909a41ebee','check.verification-plan-spec',true],
  ['lifecycle','check.0c8201229a241875','check.verification-lifecycle',false],
 ]){
  const file=`tests/scenarios/verify-${name}-scenarios.mjs`,fast=planTemplateVerification({changedFiles:[file]});
  if(slow){assert.ok(!fast.commands.some(task=>task.id===id),name);assert.ok(fast.selection.omitted.some(task=>task.id===id&&task.reason==='deferred-slow-check'),name);}
  else assert.equal(fast.commands.filter(task=>task.id===id).length,1,name);
  for(const options of [{includeSlow:true},{profile:'release'},{selection:'legacy'}]){
   const plan=planTemplateVerification({...options,changedFiles:[file]}),tasks=plan.commands.filter(task=>task.id===id);
   assert.equal(tasks.length,1,`${name}: ${JSON.stringify(options)}`);
   assert.equal(tasks[0].command,`node ${file}`,name);
   if(slow)assert.ok(tasks[0].resources.includes('native-cli'),name);
   else assert.ok(tasks[0].resources.includes('python-jsonschema'),name);
   if(options.profile==='release')assert.ok(tasks[0].gate_ids.includes(gate),name);
  }
 }
});
test('设计技能许可文件变化选择真实安装闭包验证',()=>{
 for(const root of ['.agents/skills/yss-design-system','.workbuddy/skills/yss-design-system']) {
  for(const relative of ['LICENSE','THIRD-PARTY-NOTICES.md','scripts/vendor/yaml.LICENSE']) {
   const file=`${root}/${relative}`;
   const plan=planTemplateVerification({changedFiles:[file]});
   assert.deepEqual(plan.unknown_files,[],file);
   assert.ok(plan.commands.some(row=>row.id==='check.initialization-reference-boundaries'),file);
  }
 }
});
test('内部验证默认 fast 与显式 slow 各自生效',()=>{
 const file='scripts/fixtures/role-independent-draft/worker-chain.test.mjs';
 assert.ok(!planTemplateVerification({changedFiles:[file]}).commands.some(row=>row.id==='check.role-independent-formal-current'));
 assert.ok(planTemplateVerification({changedFiles:[file],includeSlow:true}).commands.some(row=>row.id==='check.role-independent-formal-current'));
});
test('退役旧切片视图夹具后仍选择真实 Backend 切片覆盖',()=>{
 const retired='scripts/fixtures/role-independent-draft/slice-reading.test.mjs';
 const plan=planTemplateVerification({profile:'release',changedFiles:[retired]});
 assert.deepEqual(plan.unknown_files,[]);
 assert.equal(plan.commands.filter(row=>row.id==='check.role-independent-formal-current').length,1);
 assert.ok(plan.commands.some(row=>row.id==='check.role-independent-draft'));
});
test('退役旧审批消费测试后仍选择当前绑定与门禁检查',()=>{
 for(const file of ['.template-source/tooling/node/test/approval-consumption.test.mjs','.template-source/tooling/node/test/approval-current.test.mjs']){
  const plan=planTemplateVerification({profile:'release',changedFiles:[file]});
  assert.deepEqual(plan.unknown_files,[]);
  const ids=['check.backend-governance-contract',...(file.endsWith('approval-consumption.test.mjs')?['check.role-independent-formal-current']:[])];
  for(const id of ids){
   const checks=plan.commands.filter(row=>row.id===id);
   assert.equal(checks.length,1,id);
   assert.ok(checks[0].gate_ids.includes('check.verification-distribution'),id);
  }
  assert.ok(!plan.commands.some(row=>row.id==='check.profile-consumers-approval-consumption'));
 }
});
test('迁移生命周期门禁反例后仍选择真实 Backend 验证',()=>{
 for(const file of ['.template-source/tooling/node/test/lifecycle-controls.test.mjs','.template-source/tooling/node/test/lifecycle-progression.test.mjs']){
  const plan=planTemplateVerification({profile:'release',changedFiles:[file]});
  assert.deepEqual(plan.unknown_files,[]);
  assert.equal(plan.commands.filter(row=>row.id==='check.role-independent-formal-current').length,1,file);
  if(file.endsWith('lifecycle-controls.test.mjs'))assert.equal(plan.commands.filter(row=>row.id==='check.backend-governance-contract').length,1,file);
 }
});
test('授权延续变化选择真实 Backend 安装实例验证',()=>{
 for(const file of ['scripts/fixtures/role-independent-draft/approval.test.mjs','scripts/fixtures/role-independent-draft/professional-plan-fixture.mjs','scripts/lib/native-user-decision.mjs','scripts/lib/review-package.mjs']){
  const plan=planTemplateVerification({profile:'release',changedFiles:[file]});
  const checks=plan.commands.filter(row=>row.id==='check.backend-governance-contract');
  assert.equal(checks.length,1,file);
  assert.ok(checks[0].command.includes('scripts/fixtures/role-independent-draft/approval.test.mjs'),file);
  assert.ok(checks[0].gate_ids.includes('check.verification-approval'),file);
 }
});
test('PR 离线计划延后现役原生批准与脚手架检查',()=>{
 const files=['scripts/fixtures/role-independent-draft/approval.test.mjs','tests/project-ci.test.mjs','scripts/fixtures/backend-scaffold/platform-scenarios.test.mjs','tests/contract-review-preparation.test.mjs'];
 const plan=planTemplateVerification({changedFiles:files,ciOffline:true});
 for(const id of ['check.backend-governance-contract','check.work-layout-project-ci','check.backend-platform-mechanisms','check.contract-review-preparation']){
  assert.ok(plan.selection.omitted.some(row=>row.id===id&&row.reason==='deferred-ci-offline'),id);
  assert.ok(!plan.commands.some(row=>row.id===id),id);
 }
});
test('结构化资产离线检查保留，原生实例检查延后至发行',()=>{
 const changedFiles=['scripts/fixtures/structured-assets/assets-native.integration.mjs'];
 const offline=planTemplateVerification({changedFiles,ciOffline:true});
 assert.ok(offline.commands.some(row=>row.id==='check.structured-assets'));
 assert.ok(offline.selection.omitted.some(row=>row.id==='check.structured-assets-native'&&row.reason==='deferred-ci-offline'));
 const release=planTemplateVerification({profile:'release',changedFiles});
 assert.ok(release.commands.some(row=>row.id==='check.structured-assets-native'));
});
test('阶段决策离线检查保留，真实上下文场景延后',()=>{
 const changedFiles=['.agents/skills/yss-stage-decision/scripts/validate-domain-strategy.mjs'];
 const offline=planTemplateVerification({changedFiles,ciOffline:true});
 assert.ok(offline.commands.some(row=>row.id==='check.work-layout-design-fixtures'));
 assert.ok(offline.selection.omitted.some(row=>row.id==='check.work-layout-stage-native'&&row.reason==='deferred-ci-offline'));
 assert.ok(planTemplateVerification({profile:'release',changedFiles}).commands.some(row=>row.id==='check.work-layout-stage-native'));
});
test('Backend 查询快照只由实际执行的消费者测试覆盖',()=>{
 for(const file of ['scripts/lib/lifecycle-context-query-core.mjs','profiles/backend/scripts/lib/lifecycle-context-query.mjs']){
  const plan=planTemplateVerification({profile:'release',changedFiles:[file]});
  const checks=plan.commands.filter(row=>row.id==='check.profile-consumers-efficiency-distribution');
  assert.equal(checks.length,1,file);
  assert.ok(checks[0].command.includes('tests/efficiency-distribution.test.mjs'));
  assert.ok(!plan.commands.some(row=>row.id==='check.lifecycle-query-profile-snapshot'));
  assert.ok(checks[0].gate_ids.includes('check.verification-distribution'));
 }
});
test('API 决定仅执行现役测试并保留治理与实现职责',()=>{
 for(const file of ['scripts/lib/api-contract-decision.mjs','scripts/fixtures/contract-efficiency/api-v2.test.mjs']){
  const plan=planTemplateVerification({profile:'release',changedFiles:[file]});
  const checks=plan.commands.filter(row=>row.id==='check.1ebcb1124ce67eb1');
  assert.equal(checks.length,1,file);
  assert.ok(checks[0].command.includes('tests/api-contract-decision.test.mjs'));
  for(const gate of ['check.verification-implementation','check.verification-governance-syntax'])assert.ok(checks[0].gate_ids.includes(gate));
  assert.ok(!plan.commands.some(row=>row.id==='check.work-layout-api'));
 }
});
test('选择测试忽略外部慢档环境但保留显式 slow',()=>{
 for(const value of ['1','only']){
  const env={...process.env,YSS_VERIFY_SLOW:value};delete env.NODE_TEST_CONTEXT;
  const result=spawnSync(process.execPath,['--test','--test-name-pattern=^内部验证默认 fast',fileURLToPath(import.meta.url)],{env,encoding:'utf8',timeout:120000});
  assert.equal(result.status,0,`${value}: ${result.stderr||result.stdout}`);
 }
});
test('新 Spec 真实安装与已退役入口选择当前验证，保留其他阶段检查',()=>{
 const current='scripts/fixtures/role-independent-draft/spec-v3-installed.test.mjs';
 const retired='scripts/fixtures/role-independent-draft/stage-gates-installed.test.mjs';
 for(const file of [current,retired,'.template-source/distribution/bundle-profile.json','.template-source/distribution/yss-cli-pin.json','scripts/fixtures/role-independent-draft/installed-fixture.mjs']){
  const plan=planTemplateVerification({changedFiles:[file]});
  const checks=plan.commands.filter(row=>row.id==='check.spec-stage-installed');
  assert.equal(checks.length,1,file);
  assert.ok(checks[0].command.includes(current),file);
  assert.ok(checks[0].resources.includes('native-cli'),file);
  if(file===current||file===retired)assert.ok(!plan.commands.some(row=>row.id==='check.spec-stage-gates'),file);
 }
});
test('旧 Spec 退出测试退役后选择现行 Backend 合同及共享校验',()=>{
 for(const file of ['scripts/fixtures/role-independent-draft/stage-gates-plan.test.mjs','scripts/fixtures/role-independent-draft/stage-gates-delivery.test.mjs','scripts/fixtures/role-independent-draft/stage-gates-handoff.test.mjs','scripts/fixtures/role-independent-draft/stage-gates-worker.test.mjs','scripts/fixtures/role-independent-draft/installed-fixture.mjs','tests/stage-gates-contract.test.mjs','tests/stage-result-native.test.mjs','tests/backend-governance-contract.test.mjs','tests/backend-stage-routing.test.mjs','scripts/lib/stage-result.mjs','scripts/lib/native-evidence.mjs','scripts/lib/structured-assets.mjs','scripts/lib/json-schema.mjs','.template-source/distribution/bundle-profile.json','.template-source/distribution/yss-cli-pin.json','.template-spec/process/schemas/stage-result.schema.json']){
  const checks=planTemplateVerification({changedFiles:[file]}).commands.filter(row=>row.id==='check.backend-governance-contract');
  assert.equal(checks.length,1,file);
  assert.ok(checks[0].command.includes('tests/backend-governance-contract.test.mjs'),file);
  assert.ok(checks[0].command.includes('tests/backend-stage-routing.test.mjs'),file);
  assert.ok(checks[0].resources.includes('native-cli'),file);
 }
});
test('退役 Spec 四阶段实现入口选择当前真实安装检查',()=>{
 const file='scripts/fixtures/role-independent-draft/stage-gates-worker.test.mjs';
 const plan=planTemplateVerification({changedFiles:[file]});
 assert.equal(fs.existsSync(path.join(ROOT,file)),false);
 assert.equal(plan.commands.filter(row=>row.id==='check.spec-stage-installed').length,1);
 assert.ok(!plan.commands.some(row=>['check.spec-stage-gates','check.spec-stage-worker'].includes(row.id)));
});
test('CLI 安装测试新名称在两个入口精确归组且不会重复执行',()=>{
 const title='Spec 3.0 按需补装设计技能并保留项目文件';
 const backend='Backend 3.0 日常路线拒绝前端声明与实际前端文件';
 for(const name of ['drift-identity','cli-sync']){
  const commands=loadVerificationProfiles().groups[name].commands;
  const install=commands.find(row=>row.id==='check.cli-content-identity-install').run;
  const rest=commands.find(row=>row.id==='check.cli-content-identity-rest').run;
  const include=install.match(/--test-name-pattern='([^']+)'/);
  const excludes=[...rest.matchAll(/--test-skip-pattern='([^']+)'/g)];
  assert.ok(include,name);
  assert.ok(new RegExp(include[1]).test(title),name);
  assert.ok(excludes.some(([,pattern])=>new RegExp(pattern).test(title)),name);
  assert.ok(!excludes.some(([,pattern])=>new RegExp(pattern).test(backend)),name);
  for(const group of ['check.cli-content-identity','check.cli-content-identity-install','check.cli-content-identity-sync']){
   const expression=commands.find(row=>row.id===group).run.match(/--test-name-pattern='([^']+)'/);
   assert.ok(expression&&!new RegExp(expression[1]).test(backend),`${name}: ${group}`);
  }
 }
});
test('退役旧 Spec 集成后仍按受影响输入选择当前执行前置与生命周期测试',()=>{
 for(const [file,id] of [['scripts/lib/slice-execution-preflight.mjs','check.role-independent-draft'],['scripts/lib/lifecycle-readiness.mjs','check.backend-governance-contract']]){
  assert.ok(planTemplateVerification({changedFiles:[file]}).commands.some(row=>row.id===id),file);
 }
});
test('CLI 身份测试文件变更时 fast 覆盖所有分组',()=>{
 for(const file of ['tests/cli-retirement.test.mjs','.template-source/distribution/yss-cli-pin.json']){
  const plan=planTemplateVerification({changedFiles:[file]});
  for(const suffix of ['','-install','-sync','-rest']){
   const id=`check.cli-content-identity${suffix}`;
   assert.equal(plan.commands.filter(row=>row.id===id).length,1,`${file}: ${id}`);
   assert.ok(plan.commands.find(row=>row.id===id).resources.includes('native-cli'),id);
  }
 }
});
test('分发和真实安装变更的 release 检查绑定对应治理风险',()=>{
 const files=['.template-source/distribution/bundle-profile.json','scripts/fixtures/role-independent-draft/spec-v3-installed.test.mjs','tests/backend-stage-routing.test.mjs'];
 const plan=planTemplateVerification({profile:'release',changedFiles:files});
 for(const [id,gates] of [
  ['check.schema-generations',['check.verification-governance-syntax']],
  ['check.workbuddy-skills',['check.verification-skills']],
  ['check.backend-governance-contract',['check.verification-governance-syntax','check.verification-lifecycle','check.verification-approval']],
  ['check.spec-stage-installed',['check.verification-lifecycle','check.verification-spec-cli']],
  ['check.role-independent-formal-current',['check.verification-lifecycle','check.verification-approval','check.verification-strategic-contract']]
 ]){
  const check=plan.commands.find(row=>row.id===id);
  assert.ok(check,id);
  for(const gate of gates)assert.ok(check.gate_ids.includes(gate),`${id}: ${gate}`);
 }
 assert.ok(plan.commands.every(check=>check.gate_ids.length));
});
test('退役旧 Spec 链后 release 保留真实 Backend 交付链及原治理范围',()=>{
 for(const file of ['scripts/fixtures/role-independent-draft/formal-plan.test.mjs','scripts/fixtures/role-independent-draft/professional-plan.test.mjs','scripts/fixtures/role-independent-draft/handoff-chain.test.mjs','scripts/fixtures/role-independent-draft/worker-chain.test.mjs','scripts/lib/slice-task-package.mjs']){
  const plan=planTemplateVerification({profile:'release',changedFiles:[file]});
  const check=plan.commands.find(row=>row.id==='check.role-independent-formal-current');
  assert.ok(check,file);
  assert.ok(check.command.includes('scripts/fixtures/role-independent-draft/worker-chain.test.mjs'),file);
  for(const retired of ['formal-plan.test.mjs','professional-plan.test.mjs','handoff-chain.test.mjs'])assert.ok(!check.command.includes(retired),retired);
  for(const gate of ['check.verification-lifecycle','check.verification-approval','check.verification-strategic-contract'])assert.ok(check.gate_ids.includes(gate),gate);
  assert.ok(check.resources.includes('native-cli')&&check.resources.includes('repo-root-evidence'),file);
 }
});
test('Backend 阶段跟踪和状态反馈的真实依赖触发当前验证',()=>{
 const tracking=['scripts/lib/stage-tracking-migration.mjs','scripts/lib/stage-tracking.mjs','scripts/fixtures/role-independent-draft/installed-fixture.mjs','.template-source/distribution/yss-cli-pin.json','.template-source/distribution/bundle-profile.json','.template-spec/process/schemas/stage-tracking.schema.json'];
 for(const file of tracking){
  const plan=planTemplateVerification({changedFiles:[file]});
  for(const id of ['check.work-layout-stage-tracking']){
   const check=plan.commands.find(row=>row.id===id);
   assert.ok(check,file+': '+id);
   assert.ok(check.resources.includes('native-cli'),id);
  }
 }
 for(const file of ['scripts/lib/profile-tree.mjs','profiles/backend/.template-spec/process/harness-profile.yaml','scripts/lib/lifecycle-presentation.mjs']){
  const plan=planTemplateVerification({changedFiles:[file]});
  assert.ok(plan.commands.find(row=>row.id==='check.lifecycle-status-feedback')?.resources.includes('native-cli'),file);
 }
 const plan=planTemplateVerification({profile:'release',changedFiles:[...tracking,'scripts/lib/profile-tree.mjs']});
 for(const [id,gates] of [
  ['check.work-layout-stage-tracking',['check.verification-governance-syntax','check.verification-lifecycle','check.verification-distribution']],
  ['check.lifecycle-status-feedback',['check.verification-lifecycle']]
 ]){
  const check=plan.commands.find(row=>row.id===id);assert.ok(check,id);
  for(const gate of gates)assert.ok(check.gate_ids.includes(gate),`${id}: ${gate}`);
 }
 assert.equal(plan.commands.filter(row=>row.command.includes('scripts/fixtures/stage-tracking/tracking.test.mjs')).length,1);
});
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
 for(const file of ['.agents/skills/yss-design-system/scripts/design-md.mjs','.workbuddy/skills/yss-design-system/scripts/design-md.mjs','.template-source/tooling/node/test/design-md.test.mjs','.agents/skills/yss-design-system/scripts/vendor/yaml.mjs','.workbuddy/skills/yss-design-system/scripts/vendor/yaml.mjs']){
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
test('旧终点夹具退出后选择当前 Backend 合同及真实批准链',()=>{
 for(const file of ['tests/backend-delivery-terminal.test.mjs','tests/backend-delivery-business-terminal.test.mjs','scripts/fixtures/backend-delivery/local-terminal-fixture.mjs']){
  const plan=planTemplateVerification({profile:'release',changedFiles:[file]});
  for(const id of ['check.backend-governance-contract','check.role-independent-formal-current'])assert.equal(plan.commands.filter(row=>row.id===id).length,1,`${file}: ${id}`);
  assert.ok(!plan.commands.some(row=>['check.backend-delivery-terminal','check.backend-delivery-business-terminal'].includes(row.id)));
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
const releaseRequired=['check.release-profile-consumers','check.daily-execution','check.verification-script-retirement','check.daily-preflight','check.verification-report-v2','check.verification-artifacts','check.yss-cli-pin'];
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
  for(const ref of ['yss-cli-pin','verification-gates','verification-baseline','verification-qualification','verification-delivery-run','legacy-verification','verification-execution','verification-script-retirement','verification-preflight','verification-report-v2','verification-artifacts']){
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
 const plan=planTemplateVerification({includeSlow:true,changedFiles:['scripts/fixtures/role-independent-draft/handoff-chain.test.mjs','tests/scenarios/verify-strategic-handoff-package-scenarios.mjs','scripts/fixtures/business-tickets/handoff.test.mjs']});
 for(const id of ['check.role-independent-formal-current','check.strategic-handoff-package-scenarios','check.work-layout-tickets'])assert.ok(plan.commands.find(check=>check.id===id)?.resources.includes('repo-root-evidence'),id);
});
test('Plan审查测试唯一归属保留触发与门禁，耗时组在fast明确延后',()=>{
 const files=['scripts/lib/plan-review-control.mjs','scripts/lib/review-package.mjs','scripts/lib/work-layout.mjs','scripts/fixtures/plan-review-control/build-fixture.mjs'];
 for(const file of files){
  const plan=planTemplateVerification({includeSlow:true,changedFiles:[file]});
  for(const name of ['plan-review-control']){
   const owners=plan.commands.filter(row=>row.command.includes(`/${name}.test.mjs`));
   assert.equal(owners.length,1,`${file}: ${name}`);
   assert.ok(loadVerificationProfiles().gates.find(row=>row.id==='check.verification-approval').check_ids.includes(owners[0].id));
  }
 }
 for(const [id,file] of [
  ['check.role-independent-formal-current','scripts/fixtures/role-independent-draft/handoff-chain.test.mjs'],
  ['check.plan-review-control-unit','.template-source/tooling/node/test/plan-review-control.test.mjs'],
  ['check.plugin-scope-terminal','.template-source/tooling/node/test/plugin-scope.test.mjs'],
  ['check.backend-scaffold-direct-generation','scripts/lib/standalone-backend-scaffold.mjs'],
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
 for(const [file,id]of [['tests/native-consumer-routing.test.mjs','check.native-consumer-routing'],['.template-source/tooling/node/test/lifecycle-progression.test.mjs','check.profile-consumers-lifecycle-progression']]){
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
 const duplicate=loadVerificationProfiles();duplicate.groups.skills.commands[0].run='scripts/sync-skills --changed';
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
 const plan=planTemplateVerification({changedFiles:['.template-source/cli-core/work-layout.mjs'],ciGuards:true});
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
 for(const [keep,old] of [['check.structured-assets','check.work-layout-assets']]){
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
test('真实 Backend 审查事务在 slow 与 release 中使用足够的超时预算',()=>{
 const file='.template-source/tooling/node/test/plan-review-control.test.mjs';
 for(const options of [{includeSlow:true},{profile:'release'}]){
  const plan=planTemplateVerification({changedFiles:[file],...options});
  const check=plan.commands.find(row=>row.id==='check.plan-review-control-unit');
  assert.ok(check,JSON.stringify(options));
  assert.equal(check.timeout_ms,1800000,JSON.stringify(options));
  assert.ok(check.resources.includes('native-cli'));
 }
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

test('Matt closure documents select doc facts without incomplete inputs',()=>{
 for(const kind of ['design','plan']) {
  const file=`.template-source/contracts/2026-10-29-matt-skills-integration-closure-${kind}.md`;
  assert.ok(planTemplateVerification({changedFiles:[file]}).commands.some(x=>x.id==='check.doc-facts'));
 }
});

test('设计原型来源与素材变更选择独立安装和引用检查', () => {
 for (const ref of ['.agents/skills/yss-design-system/assets/prototype/registry-manifest.json','.agents/skills/yss-design-system/assets/prototype/package.json','.agents/skills/yss-design-system/assets/prototype/vite.config.ts','.agents/skills/yss-design-system/assets/prototype/pnpm-lock.yaml','.agents/skills/yss-design-system/assets/prototype/SHADCN-LICENSE.txt','.agents/skills/yss-design-system/scripts/verify-prototype-source.mjs']) {
  const checks = planTemplateVerification({changedFiles:[ref]}).commands;
  assert.ok(checks.some(item => item.id === 'check.initialization-reference-boundaries'), ref);
 }
});

test('退役企业示例素材和导出器的变更选择独立安装及引用检查', () => {
 for (const root of ['.agents/skills/yss-design-system', '.workbuddy/skills/yss-design-system']) {
  for (const ref of [`${root}/assets/enterprise-craft/index.html`, `${root}/scripts/export-craft-examples.mjs`]) {
   const plan = planTemplateVerification({changedFiles:[ref]});
   assert.deepEqual(plan.unknown_files, [], ref);
   assert.ok(plan.commands.some(item => item.id === 'check.initialization-reference-boundaries'), ref);
  }
 }
});

test('设计原型动画依赖与指南变化选择动画构建验证', () => {
 const paths = ['tests/design-prototype-animation.test.mjs'];
 for (const root of ['.agents/skills/yss-design-system', '.workbuddy/skills/yss-design-system']) {
  paths.push(`${root}/assets/prototype/package.json`, `${root}/assets/prototype/pnpm-lock.yaml`, `${root}/assets/prototype/vite.config.ts`, `${root}/references/shadcn-vue-prototype.md`);
 }
 for (const file of paths) {
  const plan = planTemplateVerification({changedFiles:[file]});
  assert.deepEqual(plan.unknown_files, [], file);
  const check = plan.commands.find(item => item.id === 'check.design-prototype-animation');
  assert.ok(check, file);
  assert.ok(check.command.includes('tests/design-prototype-animation.test.mjs'), file);
 }
});

test('设计原型动画门禁缺少工具链或使用过期工具链时明确失败', t => {
 const env = {...process.env};
 delete env.YSS_DESIGN_PROTOTYPE_TOOLCHAIN;
 delete env.NODE_TEST_CONTEXT;
 const args = ['--test', 'tests/design-prototype-animation.test.mjs'];
 const missing = spawnSync(process.execPath, args, {cwd: ROOT, env, encoding: 'utf8'});
 assert.notEqual(missing.status, 0);
 assert.match(missing.stdout + missing.stderr, /缺少原型构建工具链.*pnpm install --frozen-lockfile/);
 const stale = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-animation-stale-'));
 t.after(() => fs.rmSync(stale, {recursive: true, force: true}));
 fs.writeFileSync(path.join(stale, 'package.json'), '{}');
 const wrong = spawnSync(process.execPath, args, {cwd: ROOT, env: {...env, YSS_DESIGN_PROTOTYPE_TOOLCHAIN: stale}, encoding: 'utf8'});
 assert.notEqual(wrong.status, 0);
 assert.match(wrong.stdout + wrong.stderr, /package.json 与当前技能不一致/);
 const source = path.join(ROOT, '.agents/skills/yss-design-system/assets/prototype');
 for (const file of ['package.json', 'pnpm-lock.yaml']) fs.copyFileSync(path.join(source, file), path.join(stale, file));
 fs.mkdirSync(path.join(stale, 'node_modules/.pnpm'), {recursive: true});
 fs.writeFileSync(path.join(stale, 'node_modules/.pnpm/lock.yaml'), 'stale');
 const wrongInstalled = spawnSync(process.execPath, args, {cwd: ROOT, env: {...env, YSS_DESIGN_PROTOTYPE_TOOLCHAIN: stale}, encoding: 'utf8'});
 assert.notEqual(wrongInstalled.status, 0);
 assert.match(wrongInstalled.stdout + wrongInstalled.stderr, /已安装依赖锁与当前技能不一致/);
});

test('插件候选来源或执行器变化选择全部真实插件消费者',()=>{
 for(const file of ['.template-source/scripts/plugin-candidate.mjs','.template-source/scripts/lib/plugin-candidate.mjs']){
  const selected=planTemplateVerification({changedFiles:[file]}).commands;
  for(const id of ['check.plugin-entry-migration','check.plugin-backend-profile','check.plugin-supported-scope']){
   const check=selected.find(row=>row.id===id);
   assert.ok(check,`${file}: ${id}`);
   assert.ok(check.resources.includes('plugin-candidate'),`${id} must identify candidate evidence`);
  }
 }
});

test('插件发行计划缺少已提交的独立候选输入时拒绝',t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'candidate-release-plan-')); t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const plan=planTemplateVerification({profile:'release',changedFiles:['.template-source/scripts/plugin-candidate.mjs']});
 assert.throws(()=>addVerificationExecutionTasks(plan,{root:ROOT,reportDir:directory,environment:{}}),/committed plugin/i);
});
