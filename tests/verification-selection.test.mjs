import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {planTemplateVerification,loadVerificationProfiles,ROOT} from '../scripts/lib/template-verification.mjs';
import {resolveVerificationScope} from '../scripts/lib/verification-report.mjs';
import {spawnSync} from 'node:child_process';
import './verification-gates.test.mjs';
import './verification-baseline.test.mjs';
import './verification-qualification.test.mjs';
const pilot='.agents/skills/yss-research/SKILL.md';
const pilotConfig=()=>loadVerificationProfiles();
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
 assert.ok(plan.commands.every(x=>!x.command.includes('--test')&&!x.command.includes('run-scenarios')&&!x.command.includes('upstream-skill-source')));
 assert.ok(plan.commands.every(x=>x.selection_reason.includes('SKILL.md')&&x.selection_reason.includes('错误')));
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
