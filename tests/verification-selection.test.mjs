import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {planTemplateVerification,loadVerificationProfiles,ROOT} from '../scripts/lib/template-verification.mjs';
import {selectionBindings} from '../scripts/lib/verification-selection.mjs';
import {resolveVerificationScope} from '../scripts/lib/verification-report.mjs';
import {spawnSync} from 'node:child_process';
import './verification-gates.test.mjs';
import './verification-baseline.test.mjs';
import './verification-qualification.test.mjs';
const pilot='.agents/skills/yss-research/SKILL.md';
test('目标意图的候选当前性及其消费者必须选择真实 Git 边界检查', () => {
 for (const ref of ['scripts/lib/implementation-candidate-current.mjs', 'scripts/lib/backend-review.mjs', 'scripts/lib/backend-standards-coverage.mjs', 'scripts/lib/existing-backend-architecture.mjs', 'tests/implementation-candidate-current.test.mjs']) {
  const plan = planTemplateVerification({changedFiles: [ref]});
  assert.ok(plan.commands.some(item => item.id === 'check.implementation-candidate-current'), ref);
 }
});
test('shadow executes exactly legacy; explains unrelated scenario exclusions',()=>{
 const legacy=planTemplateVerification({changedFiles:[pilot],selection:'legacy'}),shadow=planTemplateVerification({changedFiles:[pilot],selection:'shadow'});
 assert.deepEqual(shadow.commands,legacy.commands);assert.equal(shadow.selection.eligible,true);assert.equal(shadow.selection.omitted.length,2);
 assert.ok(shadow.selection.candidate.some(x=>x.command.includes('yss-research/tests')));assert.ok(shadow.selection.candidate.some(x=>x.command.includes('verify-skill-governance')));
 assert.equal(planTemplateVerification({changedFiles:[pilot],selection:'allowlist'}).selection.effective,'shadow');
});
test('unknown, mixed, executable, core, projection outside pilot, lock and release fail safe',()=>{
 assert.throws(()=>planTemplateVerification({changedFiles:['mystery'],selection:'allowlist'}),/UNKNOWN_VERIFICATION_PATH/);
 for(const files of [[pilot,'scripts/contract'],['.agents/skills/yss-research/scripts/x.mjs'],[pilot,'.codex/skills/yss-ui/SKILL.md'],['skills-lock.json'],['.agents/skills/yss-research/references/approval.yaml']]){
 const plan=planTemplateVerification({changedFiles:files,selection:'allowlist'});assert.equal(plan.selection.effective,'shadow');assert.deepEqual(plan.commands,plan.selection.baseline);
 }
 const p=planTemplateVerification({profile:'release',changedFiles:[pilot],selection:'allowlist'});assert.equal(p.selection.eligible,false);
});
test('path sets cover add delete rename untracked; candidate and release cannot hide actual paths',()=>{
 const actual=[pilot,'.agents/skills/yss-research/references/deleted.md','.agents/skills/yss-research/references/new.md','unknown-untracked'];
 for(const profile of ['candidate','release'])assert.deepEqual(resolveVerificationScope({profile,explicit:[pilot],actual}).files,[...actual].sort());
 assert.equal(resolveVerificationScope({profile:'fast',explicit:[pilot],actual}).kind,'limited');
 assert.throws(()=>planTemplateVerification({changedFiles:actual}),/UNKNOWN_VERIFICATION_PATH/);
});
test('dependency closure and cycles/unknown dependency fail closed',()=>{
 const config=loadVerificationProfiles();const skipped=config.groups.skills.commands.find(x=>x.inputs_complete);const retained=config.groups['research-evidence'].commands[0];retained.depends_on=[skipped.id];
 const p=planTemplateVerification({changedFiles:[pilot],config});assert.ok(p.selection.candidate.some(x=>x.id===skipped.id&&x.selection_reason.startsWith('dependency-of:')));
 skipped.depends_on=[retained.id];assert.throws(()=>planTemplateVerification({changedFiles:[pilot],config}),/循环/);
 skipped.depends_on=['missing'];assert.throws(()=>planTemplateVerification({changedFiles:[pilot],config}),/未知检查依赖/);
});
test('qualification binds configuration and source bytes; no automatic expansion',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'selection-'));
 try{const config=loadVerificationProfiles();config.allowlist.qualification_inputs=[];config.allowlist.qualification_ref='qualification.json';
 delete config.gate_policy;
 const evidence={kind:'verification-allowlist-qualification',status:'passed',negative_cases_passed:true,related_failures_omitted:0,unique_commands:{baseline:3,candidate:2},timing:{baseline_samples:[30,32,31],candidate_samples:[20,22,21]},bindings:selectionBindings(root,config)};
 fs.writeFileSync(path.join(root,'qualification.json'),JSON.stringify(evidence));assert.equal(planTemplateVerification({changedFiles:[pilot],selection:'allowlist',config,root}).selection.effective,'shadow');
 config.groups.skills.commands[0].run+=' --changed';assert.equal(planTemplateVerification({changedFiles:[pilot],selection:'allowlist',config,root}).selection.effective,'shadow');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('missing dependency declaration retains the original check',()=>{const config=loadVerificationProfiles();const check=config.groups.skills.commands.find(x=>x.inputs_complete);delete check.depends_on;assert.ok(planTemplateVerification({changedFiles:[pilot],config}).selection.candidate.some(x=>x.id===check.id));});

test('Schema 和 phase 变化升级完整验证，业务票源码选择合同测试', () => {
  for (const file of ['scripts/lib/json-schema.mjs', 'scripts/lib/validation-phase.mjs']) {
    const plan = planTemplateVerification({ changedFiles: [file] });
    assert.equal(plan.effective_profile, 'release', file);
    assert.ok(plan.commands.some(item => item.command.includes('schema-rejection.test.mjs')));
  }
  const plan = planTemplateVerification({ changedFiles: ['scripts/lib/business-tickets.mjs'] });
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
