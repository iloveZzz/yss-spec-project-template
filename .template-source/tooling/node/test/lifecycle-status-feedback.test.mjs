import assert from 'node:assert/strict';
import test from 'node:test';
import {cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const {lifecycleStatus} = await import(path.join(sourceRoot, 'scripts/lib/lifecycle-status.mjs'));
const {renderLifecycleStatus} = await import(path.join(sourceRoot, 'scripts/lib/lifecycle-presentation.mjs'));
const checkpointRef = 'docs/checkpoint.json';
const copiedRefs = ['.template-spec/process/lifecycle-registry.yaml', '.template-spec/agents/digital-human-roles.yaml', '.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml', 'scripts/verify-lifecycle-checkpoint', 'scripts/verify-plan-spec-entry'];

function fixture(run) {
  const root = mkdtempSync(path.join(tmpdir(), 'yss-status-feedback-'));
  const put = (ref, value) => {
    const target = path.join(root, ref);
    mkdirSync(path.dirname(target), {recursive: true});
    writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
  };
  try {
    put('yss-project.yaml', {schema_version: 1, repository_mode: 'project-instance'});
    for (const ref of copiedRefs) {
      mkdirSync(path.dirname(path.join(root, ref)), {recursive: true});
      cpSync(path.join(sourceRoot, ref), path.join(root, ref));
    }
    const checkpoint = {
      schema_version: 1, repository_mode: 'project-instance', mode: 'route', status: 'routing', stage: 'stage.plan',
      artifacts: {}, gates: {}, context_reconciliation: {status: 'pending', ref: null, evidence_refs: []},
      next_work_unit: 'work-unit.spec-synthesis', blockers: [],
      stage_tracking: {items: [{id: 'spec', stage: 'stage.spec-architecture', work_unit: 'work-unit.spec-synthesis', owner: '需求负责人', progress: 'pending', source_refs: [], completion: [], dependencies: []}]},
    };
    const status = () => {put(checkpointRef, checkpoint); return lifecycleStatus({root, checkpointRef});};
    run({root, checkpoint, status, put});
  } finally {rmSync(root, {recursive: true, force: true});}
}

test('text explains the recorded next stage without claiming approval or entry permission', () => fixture(({status}) => {
  const result = status(), text = renderLifecycleStatus(result);
  assert.equal(result.next_stage, 'stage.spec-architecture');
  assert.match(text, /当前阶段：Plan/);
  assert.match(text, /下一阶段（路由目标）：Spec \/ 功能架构/);
  assert.match(text, /不代表.*批准.*可进入/);
  assert.match(text, /待核验.*批准/);
  assert.match(text, /继续条件/);
  assert.equal(result.execution_authorization, 'not-evaluated');
  assert.equal(result.presentation.execution_allowed, false);
}));

test('missing or conflicting recorded stage relations remain unverified, including a missing next unit', () => fixture(({checkpoint, status}) => {
  delete checkpoint.stage_tracking.items[0].stage;
  let result = status();
  assert.equal(result.next_stage, null);
  assert.match(renderLifecycleStatus(result), /下一阶段.*待核验/);
  checkpoint.stage_tracking.items = [
    {...checkpoint.stage_tracking.items[0], stage: 'stage.spec-architecture'},
    {...checkpoint.stage_tracking.items[0], id: 'another', stage: 'stage.product-design'},
  ];
  result = status();
  assert.equal(result.next_stage, null);
  assert.match(renderLifecycleStatus(result), /阶段.*冲突/);
  checkpoint.next_work_unit = null;
  checkpoint.stage_tracking.items = [{...checkpoint.stage_tracking.items[0], work_unit: null}];
  result = status();
  assert.equal(result.next_stage, null);
  assert.match(renderLifecycleStatus(result), /未登记.*终点/);
  assert.doesNotMatch(renderLifecycleStatus(result), /生命周期已完成|已可发布/);
}));

test('unknown next units and cancelled work items cannot establish a next stage', () => fixture(({checkpoint, status}) => {
  checkpoint.next_work_unit = 'work-unit.unknown';
  checkpoint.stage_tracking.items[0].work_unit = checkpoint.next_work_unit;
  let result = status();
  assert.equal(result.next_stage, null);
  assert.equal(result.next_step.action_type, 'repair');
  checkpoint.next_work_unit = 'work-unit.spec-synthesis';
  Object.assign(checkpoint.stage_tracking.items[0], {work_unit: checkpoint.next_work_unit, progress: 'cancelled'});
  result = status();
  assert.equal(result.next_stage, null);
  assert.equal(result.owner, '未登记');
}));

test('a next work unit in the same stage explains that current-stage work remains', () => fixture(({checkpoint, status}) => {
  checkpoint.next_work_unit = 'work-unit.plan-requirements';
  Object.assign(checkpoint.stage_tracking.items[0], {stage: 'stage.plan', work_unit: checkpoint.next_work_unit});
  const result = status();
  assert.equal(result.next_stage, 'stage.plan');
  assert.match(renderLifecycleStatus(result), /仍在当前阶段，先完成当前单元/);
  assert.match(renderLifecycleStatus(result), /不代表已批准或可进入/);
}));

test('registered blockers retain individual responsibility, evidence and repair steps in text', () => fixture(({checkpoint, status}) => {
  checkpoint.blockers = [{message: '申请金额规则存在冲突', source_ref: 'docs/rules.md', owner: '规则负责人', recovery: '对照两份规则确认当前口径并重新审查'}];
  const result = status(), text = renderLifecycleStatus(result);
  const issue = result.diagnostics.find(item => item.code === 'registered-blocker');
  assert.equal(issue.message, '申请金额规则存在冲突');
  assert.equal(issue.owner, '规则负责人');
  assert.equal(issue.source_ref, 'docs/rules.md');
  assert.equal(issue.owner_scope, 'issue');
  assert.match(text, /负责人：规则负责人/);
  assert.match(text, /来源：docs\/rules.md/);
  assert.match(text, /处理：对照两份规则确认当前口径并重新审查/);
  assert.doesNotMatch(text, /\{"message"/);
  assert.equal(result.next_step.action_type, 'repair');
  checkpoint.blockers = ['缺少当前规则证据'];
  const fallback = status();
  assert.equal(fallback.diagnostics.find(item => item.code === 'registered-blocker').owner_scope, 'work-unit');
  assert.match(renderLifecycleStatus(fallback), /工作单元负责人；问题责任方待确认/);
}));

test('pending and failed gate registrations are visible without guessing whether they apply', () => fixture(({checkpoint, status}) => {
  checkpoint.gates = {'gate.plan-approved': {status: 'pending', reason: '等待当前规划决定', evidence_refs: []}};
  let result = status(), text = renderLifecycleStatus(result);
  assert.match(text, /Plan 批准.*等待/);
  assert.match(text, /等待当前规划决定/);
  assert.equal(result.verification_scope.find(item => item.id === 'registered-gates').status, 'not-checked');
  assert.deepEqual(result.blockers, []);
  checkpoint.gates['gate.plan-approved'] = {status: 'failed', applicable: true, reason: '关键规则尚有冲突', evidence_refs: []};
  result = status();
  assert.ok(result.blockers.some(item => item.includes('关键规则尚有冲突')));
  assert.match(renderLifecycleStatus(result), /Plan 批准.*未通过/);
  assert.equal(result.next_step.action_type, 'repair');
  checkpoint.gates['gate.plan-approved'].applicable = false;
  result = status();
  assert.deepEqual(result.blockers, []);
  assert.match(renderLifecycleStatus(result), /适用性/);
  for (const gateStatus of ['ready-for-human', 'not-evaluated']) {
    checkpoint.gates['gate.plan-approved'] = {status: gateStatus, applicable: false, reason: '先核对本轮适用性', evidence_refs: []};
    result = status();
    assert.deepEqual(result.blockers, []);
    assert.equal(result.verification_scope.find(item => item.id === 'registered-gates').status, 'not-checked');
    assert.match(renderLifecycleStatus(result), /先核对本轮适用性/);
  }
}));

test('blocked and stale gates remain blockers when a contradictory applicability flag is false', () => fixture(({checkpoint, status}) => {
  for (const gateStatus of ['blocked', 'stale']) {
    checkpoint.gates = {'gate.plan-approved': {status: gateStatus, applicable: false, reason: '证据尚未闭合', evidence_refs: []}};
    const result = status();
    assert.ok(result.blockers.length);
    assert.equal(result.next_step.action_type, 'repair');
    assert.equal(result.verification_scope.find(item => item.id === 'registered-gates').status, 'failed');
    assert.match(renderLifecycleStatus(result), /登记状态与适用性标记冲突，需正式预检/);
  }
}));

test('CLI text output is read-only and lists human pause recovery and verification boundaries', () => fixture(({root, checkpoint, status}) => {
  checkpoint.status = 'paused-human-gate';
  checkpoint.pause = {owner_or_authority: 'role.test-engineer', reason_code: 'review-required', resume_condition: '当前候选通过独立审查后复验'};
  status();
  const before = new Map(['yss-project.yaml', checkpointRef, ...copiedRefs].map(ref => [ref, readFileSync(path.join(root, ref))]));
  const cli = spawnSync(process.execPath, [path.join(sourceRoot, 'scripts/lifecycle-status'), '--root', root, '--checkpoint', checkpointRef, '--format', 'text'], {encoding: 'utf8'});
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /负责人：测试工程师/);
  assert.match(cli.stdout, /当前候选通过独立审查后复验/);
  assert.match(cli.stdout, /待核验/);
  assert.match(cli.stdout, /未核验完整批准或执行授权/);
  for (const [ref, bytes] of before) assert.deepEqual(readFileSync(path.join(root, ref)), bytes, `${ref} must remain unchanged`);
}));

test('CLI query failures respect a parsed text format and keep JSON and preflight boundaries', () => fixture(({root, status, put}) => {
  status();
  const inputBytes = ref => {
    try { return readFileSync(path.join(root, ref)); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  };
  const cli = args => {
    const before = new Map(['yss-project.yaml', checkpointRef, ...copiedRefs].map(ref => [ref, inputBytes(ref)]));
    const result = spawnSync(process.execPath, [path.join(sourceRoot, 'scripts/lifecycle-status'), '--root', root, ...args], {encoding: 'utf8'});
    for (const [ref, bytes] of before) assert.deepEqual(inputBytes(ref), bytes, `${ref} must remain unchanged after a failed query`);
    return result;
  };
  const assertTextFailure = args => {
    const result = cli(args);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /当前阶段：待核验/);
    assert.match(result.stdout, /下一阶段（路由目标）：待核验/);
    assert.match(result.stdout, /负责人：未登记/);
    assert.match(result.stdout, /处理：/);
    assert.match(result.stdout, /下一动作：/);
    assert.match(result.stdout, /未核验完整批准或执行授权/);
    assert.throws(() => JSON.parse(result.stdout));
    return result;
  };
  put('yss-project.yaml', {schema_version: 1, repository_mode: 'template-source'});
  const template = assertTextFailure(['--checkpoint', checkpointRef, '--format', 'text']);
  assert.match(template.stdout, /模板维护路由/);
  assert.match(template.stdout, /不得更改真实仓库身份/);
  const machine = cli(['--checkpoint', checkpointRef]);
  assert.equal(machine.status, 1);
  assert.deepEqual(JSON.parse(machine.stdout), {
    schema_version: 1, read_only: true, blockers: ['生命周期状态仅适用于 project-instance'], owner: '未登记',
    next_action: '核查状态输入：生命周期状态仅适用于 project-instance', execution_authorization: 'not-evaluated',
    verification_scope: [{id: 'status-input', status: 'failed', refs: [], reason: '生命周期状态仅适用于 project-instance'}],
    diagnostics: [{code: 'status-input-invalid', severity: 'error', message: '生命周期状态仅适用于 project-instance', source_ref: null, owner: '未登记', recovery: '修复输入后重新读取状态'}],
    next_step: {action_type: 'repair', command: null, input_refs: [], prerequisites: ['提供有效项目根和 checkpoint 引用']},
  });
  put('yss-project.yaml', {schema_version: 99, repository_mode: 'template-source'});
  assert.match(assertTextFailure(['--checkpoint', checkpointRef, '--format', 'text']).stdout, /迁移检查/);
  put('yss-project.yaml', {schema_version: 1, repository_mode: 'unknown'});
  assert.match(assertTextFailure(['--checkpoint', checkpointRef, '--format', 'text']).stdout, /迁移检查/);
  put('yss-project.yaml', 'schema_version: [\n');
  assert.match(assertTextFailure(['--checkpoint', checkpointRef, '--format', 'text']).stdout, /迁移检查/);
  rmSync(path.join(root, 'yss-project.yaml'));
  assert.match(assertTextFailure(['--checkpoint', checkpointRef, '--format', 'text']).stdout, /迁移检查/);
  put('yss-project.yaml', {schema_version: 1, repository_mode: 'project-instance'});
  assert.match(assertTextFailure(['--format', 'text']).stdout, /缺少项目根或 checkpoint/);
  rmSync(path.join(root, checkpointRef));
  assert.match(assertTextFailure(['--checkpoint', checkpointRef, '--format', 'text']).stdout, /来源：docs\/checkpoint.json/);
  put(checkpointRef, '{broken json');
  assert.match(assertTextFailure(['--checkpoint', checkpointRef, '--format', 'text']).stdout, /来源：docs\/checkpoint.json/);
  const preflight = cli(['--checkpoint', checkpointRef, '--preflight', '--format', 'text']);
  assert.equal(preflight.status, 2);
  assert.equal(JSON.parse(preflight.stdout).execution_authorization, 'not-evaluated');
  const parseFailure = cli(['--unknown-option', '--format', 'text']);
  assert.equal(parseFailure.status, 1);
  assert.equal(JSON.parse(parseFailure.stdout).execution_authorization, 'not-evaluated');
}));
