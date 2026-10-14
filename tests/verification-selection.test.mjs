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
 assert.ok(planTemplateVerification({changedFiles:['tests/strategic-handoff-readonly.test.mjs']}).commands.some(row=>row.id==='check.strategic-handoff-readonly'));
 for(const ref of ['scripts/lib/native-approval.mjs','scripts/lib/native-evidence.mjs','scripts/lib/validation-phase.mjs','tests/ar12b-source-native.test.mjs']){
  const plan=planTemplateVerification({changedFiles:[ref]});
  assert.ok(plan.commands.some(row=>row.id==='check.ar12b-source-native'),ref);
 }
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
