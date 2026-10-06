import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadVerificationProfiles, planTemplateVerification, ROOT} from '../scripts/lib/template-verification.mjs';
import {loadLegacyManifest, compileVerificationCheck, validateGateConfiguration,validateSupplementalChecks} from '../.template-source/scripts/lib/verification-gates.mjs';

test('冻结台账保留 117 个旧检查及 115 条语法责任，每项都有 Gate 去向', () => {
  const manifest = loadLegacyManifest(ROOT), config = loadVerificationProfiles();
  assert.equal(manifest.commands.length, 117);
  assert.equal(manifest.syntax_files.length, 115);
  assert.equal(new Set(manifest.syntax_files).size, 103);
  assert.equal(new Set(manifest.commands.map(row => row.task_id)).size, 117);
  assert.equal(config.gates.length, 20);
  assert.equal(config.legacy_coverage.length, 117);
  assert.ok(config.legacy_coverage.every(row => row.gate_ids.length > 0));
  assert.doesNotThrow(() => validateGateConfiguration(config, manifest));
});

test('核心改动与未审计 Gate 不得借发布 profile 名称裁剪冻结全量', () => {
  const config = loadVerificationProfiles();
  config.profiles.release = {always_groups:['hygiene']};
  const plan = planTemplateVerification({profile:'release', changedFiles:['scripts/lib/template-verification.mjs'], config});
  assert.equal(plan.strategy, 'legacy-full');
  assert.equal(plan.commands.filter(row => row.task_id?.startsWith('legacy.')).length, 117);
  assert.ok(plan.fallback_reasons.includes('core-policy-change'));
});

test('统一编译入口对前置检查也实施 committed 要求', () => {
  const raw = {id:'check.bound',run:'scripts/check-bound',require_committed_for:['candidate','release'],depends_on:[]};
  assert.equal(compileVerificationCheck(raw,{group:'fixture',profile:'candidate'}).command, 'scripts/check-bound --require-committed');
  assert.equal(compileVerificationCheck(raw,{group:'fixture',profile:'fast'}).command, 'scripts/check-bound');
});

test('未知路径在任何发布规划执行昂贵工作前失败', () => {
  for(const profile of ['fast','candidate','release'])assert.throws(() => planTemplateVerification({profile,changedFiles:['new-unregistered/domain.js']}), /UNKNOWN_VERIFICATION_PATH/);
});

test('展示编号不能充当机器主键，重复 display_id 和 Gate 依赖错误计划阶段拒绝',()=>{
  const manifest=loadLegacyManifest(ROOT);
  for(const mutate of [c=>c.gates[0].id='G01',c=>c.gates[1].display_id='G01']) {
    const config=loadVerificationProfiles(),original=config.gates[0].id;mutate(config);
    // 保持引用闭包，使非法主键的精确拒绝不被补充检查的悬空引用提前遮住。
    if(config.gates[0].id!==original)for(const check of config.supplemental_checks)check.gate_ids=check.gate_ids.map(id=>id===original?config.gates[0].id:id);
    assert.throws(()=>validateGateConfiguration(config,manifest),/GATE_REGISTRY_INVALID/);
  }
  const unknown=loadVerificationProfiles();unknown.gates[0].depends_on=['check.unregistered'];assert.throws(()=>validateGateConfiguration(unknown,manifest),/未知/);
  const cycle=loadVerificationProfiles();cycle.gates[0].impact_dependencies=[cycle.gates[1].id];cycle.gates[1].impact_dependencies=[cycle.gates[0].id];assert.throws(()=>validateGateConfiguration(cycle,manifest),/循环/);
});

test('保守闭包保留共享 helper、fixture、lock、混合变更及 Spec raw 检查全部 117',()=>{
  for(const changedFiles of [['scripts/fixtures/frontend-delivery/scenarios.mjs'],['skills-lock.json'],['scripts/lib/json-schema.mjs'],['README.md','.agents/skills/yss-research/SKILL.md']]) {
    const plan=planTemplateVerification({profile:'release',changedFiles});
    assert.equal(plan.shadow_commands.filter(row=>row.task_id?.startsWith('legacy.')).length,117);
    assert.ok(plan.shadow_commands.some(row=>row.gate_ids.includes('check.verification-spec-cli')));
  }
});

test('Gate 前置依赖传播到具体任务并阻断依赖循环',()=>{
  const config=loadVerificationProfiles(),consumer=config.gates.find(g=>g.display_id==='G06'),producer=config.gates.find(g=>g.display_id==='G09');
  consumer.depends_on=[producer.id];
  const plan=planTemplateVerification({profile:'release',changedFiles:['README.md'],config});
  const prior=plan.shadow_commands.filter(row=>row.gate_ids.includes(producer.id));
  assert.ok(prior.length);
  assert.ok(plan.shadow_commands.filter(row=>row.gate_ids.includes(consumer.id)).every(row=>prior.every(dep=>row.depends_on.includes(dep.task_id))));
});

test('显式资格报告和摘要必须成对且字节吻合，过期来源才回退全量',t=>{
  const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'qualification-parameters-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const reportFile=path.join(directory,'qualification.json'),proof={schema_version:1,kind:'template-verification-qualification',scope:'gates',status:'passed',bindings:{policy_digest:'old-source'}};
  fs.writeFileSync(reportFile,JSON.stringify(proof));const digest=createHash('sha256').update(fs.readFileSync(reportFile)).digest('hex');
  const plan=options=>planTemplateVerification({profile:'release',changedFiles:['README.md'],...options});
  for(const profile of ['fast','candidate','release']) {
    assert.throws(()=>plan({profile,qualificationReport:reportFile}),/PARAMETERS_INCOMPLETE/);
    assert.throws(()=>plan({profile,qualificationReportDigest:digest}),/PARAMETERS_INCOMPLETE/);
    assert.throws(()=>plan({profile,qualificationReport:reportFile,qualificationReportDigest:'abc'}),/DIGEST_INVALID/);
    assert.throws(()=>plan({profile,qualificationReport:reportFile,qualificationReportDigest:'0'.repeat(64)}),/DIGEST_MISMATCH/);
  }
  const stale=plan({qualificationReport:reportFile,qualificationReportDigest:digest});
  assert.equal(stale.strategy,'legacy-full');assert.ok(stale.qualification.reasons.includes('qualification-source-binding-stale'));
  assert.equal(plan({base:'11d88fb0ae6e4213bff6b4c5af4de03fd1aa2f1c'}).strategy,'legacy-full');
});

test('现役四项补充检查按稳定ID登记，九个风险suite及冻结117保持',()=>{
  const config=loadVerificationProfiles(),expected=['tests/verification-gates.test.mjs','tests/verification-baseline.test.mjs','tests/verification-qualification.test.mjs','tests/verification-execution.test.mjs','tests/verification-preflight.test.mjs','tests/verification-report-v2.test.mjs','tests/verification-artifacts.test.mjs','tests/verification-delivery-run.test.mjs','tests/legacy-verification.test.mjs'];
  assert.deepEqual(config.supplemental_checks.map(item=>item.id).sort(),['check.native-instance-drift','check.native-profile-asset-consumption','check.native-consumer-routing','check.verification-optimization-regressions'].sort());
  assert.deepEqual(config.supplemental_checks.map(item=>item.task_id).sort(),['supplemental.native-instance-drift','supplemental.native-profile-asset-consumption','supplemental.native-consumer-routing','supplemental.optimization-regressions'].sort());
  assert.ok(config.supplemental_checks.every(item=>item.when==='template-source'&&item.source_requirement==='committed'));
  const check=config.supplemental_checks.find(item=>item.id==='check.verification-optimization-regressions');
  assert.equal(check.id,'check.verification-optimization-regressions');assert.equal(check.task_id,'supplemental.optimization-regressions');assert.deepEqual(check.run.split(' ').slice(2),expected);assert.deepEqual(check.gate_ids,['check.verification-final-integrity']);
  for(const ref of expected){assert.ok(config.required_files.includes(ref));assert.ok(config.syntax_files.includes(ref));assert.ok(config.gate_policy.qualification_inputs.includes(ref));}
  for(const profile of ['fast','candidate','release'])assert.deepEqual(planTemplateVerification({profile,changedFiles:['README.md']}).supplemental_checks,config.supplemental_checks);
  assert.equal(loadLegacyManifest(ROOT).commands.length,117);
});

test('补充检查拒绝 task/check 冲突、未知 Gate、空命令和错误 committed 规则',()=>{
  const manifest=loadLegacyManifest(ROOT);
  for(const mutate of [c=>c.supplemental_checks[0].task_id=manifest.commands[0].task_id,c=>c.supplemental_checks[0].id=manifest.commands[0].id,c=>c.supplemental_checks[0].gate_ids=['check.unknown-gate'],c=>c.supplemental_checks[0].run='',c=>c.supplemental_checks[0].source_requirement='current',c=>c.supplemental_checks[0].require_committed_for=['release'],c=>c.supplemental_checks.push(structuredClone(c.supplemental_checks[0]))]) {
    const config=loadVerificationProfiles();mutate(config);
    assert.throws(()=>validateSupplementalChecks(config,manifest),/SUPPLEMENTAL_CHECK_INVALID/);
    assert.throws(()=>planTemplateVerification({profile:'release',changedFiles:['README.md'],config}),/SUPPLEMENTAL_CHECK_INVALID/);
  }
});
