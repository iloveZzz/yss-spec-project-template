import test from 'node:test';
import assert from 'node:assert/strict';
import {loadVerificationProfiles, planTemplateVerification, ROOT} from '../scripts/lib/template-verification.mjs';
import {compileVerificationCheck, validateGateConfiguration,validateSupplementalChecks} from '../.template-source/scripts/lib/verification-gates.mjs';

test('AR16：现役仅 fast 与 release，退役 profile 不授予执行', () => {
  assert.deepEqual(Object.keys(loadVerificationProfiles().profiles), ['fast', 'release']);
  for (const profile of ['candidate', 'legacy-full']) assert.throws(() => planTemplateVerification({profile}), /未知核验 profile/);
  const release = planTemplateVerification({profile:'release', changedFiles:[]});
  assert.equal(release.strategy, 'release');
  assert.equal(release.source_requirement, 'committed');
  assert.equal(release.selection.omitted.length, 0);
});

test('完整 release 不允许策略缩成部分组，未知路径在执行前拒绝',()=>{
  const config=loadVerificationProfiles();config.profiles.release={always_groups:['hygiene']};
  assert.throws(()=>planTemplateVerification({profile:'release',config}),/RELEASE_REQUIRES_ALL_GROUPS/);
  for(const profile of ['fast','release'])assert.throws(()=>planTemplateVerification({profile,changedFiles:['new-unregistered/domain.js']}),/UNKNOWN_VERIFICATION_PATH/);
});
test('统一编译入口对 release 前置检查实施 committed 要求',()=>{
  const raw={id:'check.bound',run:'scripts/check-bound',require_committed_for:['release'],depends_on:[]};
  assert.equal(compileVerificationCheck(raw,{group:'fixture',profile:'release'}).command,'scripts/check-bound --require-committed');
  assert.equal(compileVerificationCheck(raw,{group:'fixture',profile:'fast'}).command,'scripts/check-bound');
});
test('Gate 主键、展示编号、责任引用和执行域非法及依赖环全部拒绝',()=>{
  for(const mutate of [c=>c.gates[0].id='G01',c=>c.gates[1].display_id='G01',c=>c.gates[0].execution_scope='unknown',c=>c.gates[0].check_ids.push('check.unknown')]){
    const config=loadVerificationProfiles();mutate(config);assert.throws(()=>validateGateConfiguration(config),/GATE_REGISTRY_INVALID/);
  }
  const missing=loadVerificationProfiles();missing.gates.find(g=>g.id==='check.verification-skills').check_ids=[];assert.throws(()=>validateGateConfiguration(missing),/GATE_CHECK_BINDING_MISSING/);
  const unknown=loadVerificationProfiles();unknown.gates[0].depends_on=['check.unknown'];assert.throws(()=>validateGateConfiguration(unknown),/未知/);
  const cycle=loadVerificationProfiles();cycle.gates[0].impact_dependencies=[cycle.gates[1].id];cycle.gates[1].impact_dependencies=[cycle.gates[0].id];assert.throws(()=>validateGateConfiguration(cycle),/循环/);
});
test('完整 release 与变化范围无关，所有当前检查保留稳定身份和 Gate 责任',()=>{
  const config=loadVerificationProfiles(),count=Object.values(config.groups).reduce((n,group)=>n+group.commands.length,0);
  for(const changedFiles of [[],['skills-lock.json'],['scripts/lib/json-schema.mjs'],['README.md','.agents/skills/yss-research/SKILL.md']]){
    const plan=planTemplateVerification({profile:'release',changedFiles});assert.equal(plan.commands.length,count);assert.ok(plan.commands.every(task=>task.gate_ids.length));
    assert.equal(new Set(plan.commands.map(task=>task.task_id)).size,count);
  }
});
test('重复 check ID 只允许完全等价多 occurrence，错配在执行前拒绝',()=>{
  const original=loadVerificationProfiles(),first=original.groups.hygiene.commands[0];
  original.groups.hygiene.commands.push(structuredClone(first));assert.doesNotThrow(()=>planTemplateVerification({profile:'release',config:original}));
  for(const mutate of [row=>row.run+=' --altered',row=>row.when='project-instance',row=>row.depends_on=['check.unknown'],row=>row.resources=['different']]){
    const config=loadVerificationProfiles(),copy=structuredClone(first);mutate(copy);config.groups.hygiene.commands.push(copy);assert.throws(()=>planTemplateVerification({profile:'release',config}),/检查 ID 冲突/);
  }
});
test('Gate 前置依赖传播到具体任务，补充检查继续绑定 committed 和稳定ID',()=>{
  const config=loadVerificationProfiles(),consumer=config.gates.find(g=>g.display_id==='G06'),producer=config.gates.find(g=>g.display_id==='G09');consumer.depends_on=[producer.id];
  const plan=planTemplateVerification({profile:'release',config}),prior=plan.commands.filter(task=>task.gate_ids.includes(producer.id));assert.ok(prior.length);
  assert.ok(plan.commands.filter(task=>task.gate_ids.includes(consumer.id)).every(task=>prior.every(dep=>task.depends_on.includes(dep.task_id))));
  assert.deepEqual(plan.supplemental_checks,config.supplemental_checks);assert.deepEqual(planTemplateVerification({changedFiles:['README.md']}).supplemental_checks,[]);
});
test('补充检查拒绝 task/check 冲突、未知 Gate、空命令和错误 committed 规则',()=>{
  for(const mutate of [c=>c.supplemental_checks[0].task_id='release.0',c=>c.supplemental_checks[0].id=c.groups.hygiene.commands[0].id,c=>c.supplemental_checks[0].gate_ids=['check.unknown'],c=>c.supplemental_checks[0].run='',c=>c.supplemental_checks[0].source_requirement='current',c=>c.supplemental_checks[0].require_committed_for=['release'],c=>c.supplemental_checks.push(structuredClone(c.supplemental_checks[0]))]){
    const config=loadVerificationProfiles();mutate(config);assert.throws(()=>planTemplateVerification({profile:'release',config}),/SUPPLEMENTAL_CHECK_INVALID/);
  }
});
