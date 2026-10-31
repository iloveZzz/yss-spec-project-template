
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {contextBinary} from '../scripts/lib/native-context.mjs';
import {nativeEvidenceVerify, nativeContractVerify, nativeLifecycleVerify, assertNativeCapabilities, NEEDS, missingCapabilities} from '../scripts/lib/native-evidence.mjs';
import {generateTaskPackageDefaults, validateTaskPackage} from '../scripts/lib/task-package.mjs';
import {parse as parseYamlText} from '../scripts/vendor/yaml.mjs';
import {verifyConsumption} from '../scripts/lib/strategic-handoff-consumption.mjs';
import {verifyContextReconciliation} from '../scripts/lib/context-reconciliation.mjs';
import {readWorkLayout} from '../scripts/lib/work-layout.mjs';
import {attachScaffoldDecisionFixture} from '../scripts/fixtures/user-decision/build-fixture.mjs';
import {read as readHandoff, json as handoffJson} from '../scripts/lib/strategic-handoff-io.mjs';
import {readdirSync, cpSync, unlinkSync, appendFileSync} from 'node:fs';
import {buildDecisionFixture} from '../scripts/lib/testing/user-decision-fixture.mjs';
import {validateUserDecision, assertUserDecisionRequirement} from '../scripts/lib/native-user-decision.mjs';
import {validateApprovalRecord, approvalExpectationFromSubject} from '../scripts/lib/native-approval.mjs';
import {approvalExpectationForBoundAsset} from '../scripts/lib/native-approval.mjs';
import {approvalExpectationFromState} from '../scripts/lib/native-approval.mjs';
import {decisionDigest} from '../scripts/lib/user-decision-core.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareReviewPackage} from '../scripts/lib/review-package.mjs';
import {approvalExpectedFromTask} from '../scripts/lib/review-capabilities.mjs';
import {loadRegistry} from '../scripts/lib/lifecycle-registry.mjs';
import {loadDigitalHumanRoles} from '../scripts/lib/digital-human-roles.mjs';
import {parseDocument} from '../scripts/vendor/yaml.mjs';
import {validateApprovalRecordFile, assertApprovedGateHasValidApproval} from '../scripts/lib/native-approval.mjs';

let binary;
try { binary = contextBinary().binary; } catch { binary = null; }
const skip = binary ? false : '需要固定版本的 yss（YSS_NATIVE_BINARY）';

const REPO = path.resolve(import.meta.dirname, '..');
let site = 'instance';
let instance;
function setup() {
  if (site === 'template-source') {
    const dir = path.join(REPO, '.work', `replay-${process.pid}`);
    mkdirSync(dir, {recursive: true});
    process.on('exit', () => rmSync(dir, {recursive: true, force: true}));
    return REPO;
  }
  if (instance) return instance;
  const base = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'yss-replay-')));
  process.on('exit', () => rmSync(base, {recursive: true, force: true}));
  const init = spawnSync(binary, ['init', '--profile', 'spec', '--root', path.join(base, 'inst'), '--project-name', 'replay'], {encoding: 'utf8'});
  assert.equal(init.status, 0, init.stderr || init.stdout);
  return (instance = path.join(base, 'inst'));
}

const cleanupDirs = new Set(); // 退出时统一清理，避免给 process 加过多监听器
process.on('exit', () => { for (const dir of cleanupDirs) rmSync(dir, {recursive: true, force: true}); });
let seq = 0;
const fixture = (opts) => buildDecisionFixture(path.join(setup(), '.work', ...(site === 'template-source' ? [`replay-${process.pid}`] : ['replay']), `case-${++seq}`), opts);

const approvalRecord = {schema_version: 1, gate_id: 'gate.spec-baseline-approved', decision: 'approved', actor_kind: 'digital-human', role_id: 'role.product-manager', runtime_id: 'runtime.generic', principal_ref: 'instance:product'};
const shell = (args) => spawnSync(path.join(REPO, 'scripts', 'verify-user-decision'), args, {encoding: 'utf8', env: {...process.env, YSS_NATIVE_BINARY: binary}});
test('verify-user-decision 薄壳：通过、拒绝、显式 requirements', {skip}, () => {
  site = 'template-source';
  const ok = fixture();
  ok.save();
  const pass = shell([ok.ref]);
  assert.equal(pass.status, 0, pass.stderr);
  assert.match(pass.stdout, /用户决定及当前批准范围校验通过/);
  const req = path.join(path.dirname(ok.ref), 'requirements.json');
  writeFileSync(req, JSON.stringify([ok.requirement]));
  assert.equal(shell(['--requirements', req, ok.ref]).status, 0);
  const bad = fixture();
  bad.record.responses = [];
  bad.save();
  const denied = shell([bad.ref]);
  assert.notEqual(denied.status, 0);
  assert.match(denied.stderr, /用户决定校验失败: .*user-decision/);
});

test('verify-approval-record 薄壳：历史结构可读，没有当前上下文不放行', {skip}, () => {
  site = 'template-source';
  const file = path.join(setup(), '.work', `replay-${process.pid}`, 'approval-shell.json');
  mkdirSync(path.dirname(file), {recursive: true});
  writeFileSync(file, JSON.stringify(approvalRecord));
  const run = (args) => spawnSync(path.join(REPO, 'scripts', 'verify-approval-record'), args, {encoding: 'utf8', env: {...process.env, YSS_NATIVE_BINARY: binary}});
  const history = run(['--history', file]);
  assert.equal(history.status, 0, history.stderr);
  assert.match(history.stdout, /历史兼容结构检查完成/);
  const current = run([file]);
  assert.notEqual(current.status, 0);
  assert.match(current.stderr, /会签记录校验失败/);
});

test('verify-user-decision 薄壳：延续模式缺 continuation_ref 时拒绝，不静默通过', {skip}, () => {
  site = 'template-source';
  const f = fixture();
  const input = path.join(path.dirname(f.ref), 'requirement.json');
  writeFileSync(input, JSON.stringify(f.requirement));
  const run = spawnSync(path.join(REPO, 'scripts', 'verify-user-decision'), ['--continuation', input], {encoding: 'utf8', env: {...process.env, YSS_NATIVE_BINARY: binary}});
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /continuation_ref/);
});

const outcome = (run) => { try { run(); return {ok: true}; } catch (error) { return {ok: false, code: error.code, message: error.message, native: error.native}; } };
function taskPackage() {
  site = 'template-source';
  setup();
  const dir = path.join(REPO, '.work', `replay-${process.pid}`);
  mkdirSync(dir, {recursive: true});
  const evidence = path.join(dir, `task-evidence-${++seq}.json`);
  writeFileSync(evidence, JSON.stringify({ok: true}));
  return {dir, value: generateTaskPackageDefaults('role.requirements-manager', {task_id: 'task-discovery', work_unit_id: 'work-unit.plan-opportunity', actor_id: 'role.requirements-manager.instance-1', stage_id: 'stage.plan', runtime_id: 'runtime.skill-projection', execution_state: 'Worker', workflow_status: 'not-started',
    contract: {kind: 'lifecycle-work-unit', contract_id: 'lifecycle-discovery', contract_version: 1, status: 'issued', contract_ref: '.template-spec/process/lifecycle-registry.yaml', lifecycle_ref: '.template-spec/process/lifecycle-registry.yaml', artifact_refs: ['artifact.plan-record'], gate_refs: []},
    inputs: ['CONTEXT.md'], objective: '执行有界生命周期工作单元', allowed_write_paths: ['docs/.scratch/'], forbidden_actions: ['不得越过主控门禁'], expected_outputs: ['结构化工作结果'], expected_evidence_files: [path.relative(REPO, evidence)], verification_commands: ['scripts/verify-template'], verification_results: [], downstream_consumers: ['role.lifecycle-orchestrator'],
    convergence: {parent_work_unit: 'work-unit.plan-opportunity', convergence_ref: 'checkpoint:test', conflict_escalation: '返回主控'}})};
}
test('verify-digital-human-task-package 薄壳：通过与拒绝都透传', {skip}, () => {
  const c = taskPackage();
  const file = path.join(c.dir, `task-shell-${++seq}.json`);
  writeFileSync(file, JSON.stringify(c.value));
  const run = (f) => spawnSync(path.join(REPO, 'scripts', 'verify-digital-human-task-package'), [f], {encoding: 'utf8', env: {...process.env, YSS_NATIVE_BINARY: binary}});
  const ok = run(file);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /数字人任务包验证通过/);
  c.value.work_unit_id = 'work-unit.unknown';
  writeFileSync(file, JSON.stringify(c.value));
  const bad = run(file);
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /数字人任务包验证失败/);
});

test('能力协商：旧 yss 拒绝并提示升级；新 yss 放行', {skip}, () => {
  const stubDir = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'yss-old-')));
  process.on('exit', () => rmSync(stubDir, {recursive: true, force: true}));
  const stub = path.join(stubDir, 'yss');
  writeFileSync(stub, '#!/bin/sh\necho \'{"outputVersion":1,"status":"ok","code":"OK","result":{"nodeDelegation":["user-decision.requirements-object.v1"]}}\'\n', {mode: 0o755});
  const env = {...process.env};
  for (const key of Object.keys(env)) if (key === 'YSS_BINARY' || key.startsWith('YSS_NATIVE_') || key.startsWith('YSS_RELEASE_')) delete env[key];
  env.YSS_NATIVE_BINARY = stub;
  env.YSS_NATIVE_BINARY_SHA256 = createHash('sha256').update(readFileSync(stub)).digest('hex');
  assert.deepEqual(missingCapabilities(NEEDS.approval, env), NEEDS.approval);
  assert.deepEqual(missingCapabilities(['user-decision.requirements-object.v1'], env), []);
  assert.throws(()=>assertNativeCapabilities(NEEDS.approval,env),/NATIVE_CAPABILITY/);
  assert.doesNotThrow(()=>assertNativeCapabilities(NEEDS.approval));
  const shell = spawnSync(path.join(REPO, 'scripts', 'verify-approval-record'), ['--history', 'x.json'], {encoding: 'utf8', env});
  assert.notEqual(shell.status, 0);
  assert.match(shell.stderr, /缺少能力.*升级 yss/);
});

let consumptionBuilt;

const sha256 = (text) => `sha256:${createHash('sha256').update(text).digest('hex')}`;
