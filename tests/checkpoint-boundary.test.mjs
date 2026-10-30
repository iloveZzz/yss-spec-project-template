import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from '../scripts/vendor/yaml.mjs';
import { makeRoot, hasYss } from './helpers/yss-instance.mjs';
import { loadOrchestrationContract } from '../scripts/lib/orchestration-contract.mjs';
import { validateMattContract } from './helpers/scenario-checks.mjs';

const baseline = parse(fs.readFileSync('scripts/fixtures/role-independent-draft/legacy-checkpoint-template.yaml', 'utf8'));
test('旧Matt场景消费者接收无需交接的prototype路由',()=>{
  const contract=loadOrchestrationContract(ref=>fs.readFileSync(ref),'.template-spec/process/orchestration-contract.yaml').value;
  // 旧场景仍检查独立 Plan 确认；本例只更新材料试验路由。
  contract.planning.clarification_policy.convergence.final_confirmation_boundary='gate.plan-approved';
  contract.grill_exit.final_confirmation_boundary='gate.plan-approved';
  assert.doesNotThrow(()=>validateMattContract(contract));
});
test('材料接续不隐式交接，显式handoff仍验证引用',()=>{
  const contract=loadOrchestrationContract(ref=>fs.readFileSync(ref),'.template-spec/process/orchestration-contract.yaml').value;
  assert.equal(contract.work_unit_routes['work-unit.strategic-design-handoff'].applies_when,'unsupported-legacy-only');
  assert.equal(Object.hasOwn(contract.work_unit_routes['work-unit.strategic-design-handoff'], 'post_approval_action'), false);
  // 兼容旧版本策略读取的关系不代表新流程支持旧包。
  assert.equal(contract.progression_target.external_strategic_handoff.trigger,'explicit-user-package-request');
  for(const milestone of ['product-design-completed','backend-deliverable','business-accepted']){
    assert.equal(Object.hasOwn(contract.progression_target.completion_policy[milestone].conditional_required_checks??{},'strategic-handoff-delivery'),false);
  }
  assert.equal(contract.progression_target.completion_policy['business-accepted'].conditional_required_checks['backend-delivery'],'backend-api-data-impact');
  for(const required of [contract.prototype_return_evidence.required,contract.prototype_modes.matt_logic.required]){
    for(const field of ['source_handoff','return_handoff'])assert.equal(required.includes(field),false);
    for(const field of ['prototype_asset_or_run','conclusion','updated_authoritative_asset','remaining_questions'])assert.ok(required.includes(field),field);
  }
  assert.equal(contract.wayfinder_mode.completion_route.includes('handoff'),false);
  assert.equal(contract.grill_exit.facts_resolved_or_routed.runnable_question,'prototype');
});
// 校验在 yss，命令行是薄壳：必须在真实实例里运行，并按「旧实例未启用追踪」处理未跟踪的模板基线。
test('checkpoint CLI 拒绝缺失交接依据，历史只读不作为当前验证', { skip: hasYss ? false : '需要固定版本的 yss' }, t => {
  const dir = makeRoot('checkpoint-boundary-');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, '.template-spec/agents/issue-tracker.md'), '---\ntracker: {platform: local-markdown, root: docs/.scratch}\n---\n');
  const run = (value, args = []) => {
    fs.mkdirSync(path.join(dir, '.work/boundary'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.work/boundary/checkpoint.json'), JSON.stringify(value));
    return spawnSync(process.execPath, ['scripts/verify-lifecycle-checkpoint', ...args, '.work/boundary/checkpoint.json'], { cwd: dir, encoding: 'utf8' });
  };
  assert.equal(run(baseline).status, 0);
  assert.equal(run({...baseline,phase_boundary:{decision:'continue',reason:'按本端材料继续'}}).status,0);
  for (const boundary of [{decision:'handoff'}, {decision:'handoff',reason:'缺交接引用'}, {decision:'handoff',reason:'缺目标',source_ref:'CONTEXT.md'}, {decision:'handoff',reason:'缺来源',destination_ref:'AGENTS.md'}, {decision:'unknown',reason:'test'}, {decision:'handoff',reason:'test',source_ref:'missing-source.md',destination_ref:'missing-target.md'}, {decision:'handoff',reason:'test',source_ref:'../CONTEXT.md',destination_ref:'CONTEXT.md'}, {decision:'subagent',reason:'test'}, {decision:'compact',reason:'test',next_phase:'stage.unknown'}]) {
    assert.notEqual(run({...baseline,phase_boundary:boundary}).status, 0, JSON.stringify(boundary));
  }
  assert.notEqual(run({...baseline,stage_trace:{}}).status,0);
  const legacy=run({...baseline,phase_boundary:{decision:'handoff'},stage_trace:{}},['--history']);
  assert.equal(legacy.status,0,legacy.stderr);
  assert.match(legacy.stdout,/历史.*不.*(批准|流转)/);
  assert.equal(run({...baseline,phase_boundary:{decision:'handoff',reason:'当前本地交接证据',source_ref:'CONTEXT.md',destination_ref:'AGENTS.md'}}).status,0);
});
