import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const source = path.resolve(import.meta.dirname, '..');
const binary = process.env.YSS_NATIVE_BINARY;
assert.ok(binary && path.isAbsolute(binary), 'YSS_NATIVE_BINARY must name the real candidate');
const digest = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');

function dailyFixture(t, {profile = 'spec'} = {}) {
  const temp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'daily-inputs-')));
  t.after(() => fs.rmSync(temp, {recursive: true, force: true}));
  const root = path.join(temp, 'governance'), repo = path.join(temp, 'implementation');
  fs.mkdirSync(root); fs.mkdirSync(repo);
  const write = (ref, value) => {
    const file = path.join(root, ref);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
  };
  fs.cpSync(path.join(source, '.template-spec/process'), path.join(root, '.template-spec/process'), {recursive: true});
  if (profile === 'backend') fs.cpSync(path.join(source, 'profiles/backend/.template-spec/process'), path.join(root, '.template-spec/process'), {recursive: true});
  for (const ref of ['CONTEXT.md', 'AGENTS.md', '.template-spec/agents/issue-tracker.md']) write(ref, fs.readFileSync(path.join(source, ref), 'utf8'));
  write('yss-project.yaml', {schema_version: 2, repository_mode: 'project-instance'});
  write('.template-spec/process/harness-profile.yaml', {schema_version: 3, profile_id: profile === 'spec' ? 'harness.spec-template' : 'harness.backend-delivery', status: 'active', required_capabilities: ['role-independent-governance-v1'], lifecycle: {}, execution: {}});
  write('facts.md', '目标、验收、工程基线、回滚和风险。\n');
  write('skill.md', '本次适用检查\n'); write('资料.md', '已有规则\n');
  fs.mkdirSync(path.join(repo, 'src'));
  fs.writeFileSync(path.join(repo, 'src/server.mjs'), 'export const enabled=false;\n');
  const git = (...args) => {
    const r = spawnSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', ...args], {cwd: repo, encoding: 'utf8'});
    assert.equal(r.status, 0, r.stderr); return r.stdout;
  };
  git('init', '-q'); git('add', '.'); git('commit', '-qm', 'baseline');
  const base = git('rev-parse', 'HEAD').trim();
  fs.writeFileSync(path.join(repo, 'src/server.mjs'), 'export const enabled=true;\n');
  const record = {schema_version: 2, policy_version: 2, task_id: 'DAILY-INPUTS', delivery_path: 'daily', formal_bindings: [], goal_ref: 'facts.md', acceptance_ref: 'facts.md', repository: {root: repo, baseline_sha: base, baseline_ref: 'facts.md', rollback_ref: 'facts.md'}, scope: {paths: ['src'], impacts: ['backend', 'no-api'], risk_ref: 'facts.md'}, skills: [{ref: 'skill.md', digest: digest(fs.readFileSync(path.join(root, 'skill.md')))}], inputs: [{ref: '资料.md', digest: digest(fs.readFileSync(path.join(root, '资料.md')))}], commands: [{argv: [process.execPath, '--check', 'src/server.mjs'], cwd: '.'}], api: {mode: 'none', reason: '没有API变化'}};
  if (profile === 'backend') record.business_input = {mode: 'standalone', side: 'backend', ref: 'facts.md', digest: digest(fs.readFileSync(path.join(root, 'facts.md'))), conflicts: []};
  let sections = '';
  const writeTask = (value = record, body = sections) => { sections = body; write('task.md', '# 日常任务\n' + sections + '\n<!-- yss-task-evidence -->\n```json\n' + JSON.stringify(value) + '\n```\n'); };
  const run = (extra = [], action = 'route') => {
    const r = spawnSync(binary, ['lifecycle', action, '--root', root, '--task', 'task.md', '--implementation-root', repo, '--base', base, '--json', ...extra], {cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024});
    assert.ok(r.stdout, r.stderr); return {exitCode: r.status, envelope: JSON.parse(r.stdout)};
  };
  writeTask();
  const baseline = run();
  assert.equal(baseline.exitCode, 0, 'fixture must route successfully before preparation: ' + JSON.stringify(baseline.envelope));
  return {root, repo, base, record, write, writeTask, run, git};
}

function prepared(result) {
  assert.equal(result.exitCode, 0, JSON.stringify(result.envelope));
  assert.equal(result.envelope.result.delivery_path, 'daily');
  return result.envelope.result.input_preparation;
}

test('准备只更新允许输入且不写原件', t => {
  const f = dailyFixture(t);
  delete f.record.skills[0].digest; f.record.inputs[0].digest = 'sha256:' + '0'.repeat(64);
  f.record.user_decisions = [];
  f.writeTask();
  const originals = ['task.md', 'skill.md', '资料.md'].map(ref => fs.readFileSync(path.join(f.root, ref)));
  const gitBefore = [f.git('rev-parse', 'HEAD'), f.git('ls-files', '--stage', '-z'), f.git('status', '--porcelain=v1', '-z')];
  const original = structuredClone(f.record);
  const unprepared = f.run(); assert.notEqual(unprepared.exitCode, 0); assert.equal(unprepared.envelope.code, 'NEEDS_INFO');
  const p = prepared(f.run(['--prepare-inputs']));
  assert.equal(p.schema_version, 1); assert.equal(p.read_only, true); assert.equal(p.approval_created, false); assert.equal(p.evidence_state, 'not-evaluated');
  assert.deepEqual(p.changes, [
    {pointer: '/skills/0/digest', ref: 'skill.md', before: '', after: digest(Buffer.from('本次适用检查\n'))},
    {pointer: '/inputs/0/digest', ref: '资料.md', before: original.inputs[0].digest, after: digest(Buffer.from('已有规则\n'))},
  ]);
  original.skills[0].digest = p.changes[0].after; original.inputs[0].digest = p.changes[1].after;
  assert.deepEqual(p.record, original);
  assert.deepEqual(['task.md', 'skill.md', '资料.md'].map(ref => fs.readFileSync(path.join(f.root, ref))), originals);
  assert.deepEqual([f.git('rev-parse', 'HEAD'), f.git('ls-files', '--stage', '-z'), f.git('status', '--porcelain=v1', '-z')], gitBefore);
});

test('准备不续期完成证据', t => {
  const f = dailyFixture(t), current = f.run().envelope.result;
  const argv = f.record.commands[0].argv;
  const execute = () => {
    const r = spawnSync(argv[0], argv.slice(1), {cwd: f.repo, encoding: 'utf8'});
    assert.equal(r.status, 0, r.stderr);
    return {argv, cwd: f.repo, exit_code: r.status, executed_at: new Date().toISOString(), stdout: r.stdout, stderr: r.stderr};
  };
  const provenance = {tool: 'node', task_ref: 'task.md', execution_ref: 'implementation.json', identity: {status: 'unavailable', reason: 'Node process has no stable agent identity'}};
  const actual = {...execute(), tool: 'node', task_ref: 'task.md', identity: provenance.identity, candidate_digest: current.candidate_digest.slice(7), scope: ['src'], result: 'passed', blocking_findings: []};
  f.write('implementation.json', actual);
  f.record.implementation = {provenance, diff_digest: current.diff_digest, changed_files: current.changed_files};
  f.write('test.json', {...actual, candidate_digest: current.candidate_digest});
  f.record.tests = [{command_index: 0, exit_code: 0, candidate_digest: current.candidate_digest, log_ref: 'test.json', log_digest: digest(fs.readFileSync(path.join(f.root, 'test.json')))}];
  f.write('review-execution.json', {...actual, ...execute()});
  const review = {assessment: {mode: 'self-check', provenance: {...provenance, execution_ref: 'review-execution.json'}}, result: 'passed', blocking_findings: [], candidate_digest: current.candidate_digest};
  f.write('review.json', review);
  f.record.review = {...review, ref: 'review.json', digest: digest(fs.readFileSync(path.join(f.root, 'review.json')))};
  f.writeTask();
  const baseline = f.run([], 'verify-daily'); assert.equal(baseline.exitCode, 0, JSON.stringify(baseline.envelope));
  f.write('资料.md', '变更后的规则\n');
  const unchanged = structuredClone(f.record), logs = ['implementation.json', 'test.json', 'review.json', 'review-execution.json'].map(ref => fs.readFileSync(path.join(f.root, ref)));
  const result = f.run(['--prepare-inputs']), p = prepared(result);
  for (const key of ['implementation', 'tests', 'review']) assert.deepEqual(p.record[key], unchanged[key]);
  assert.deepEqual(['implementation.json', 'test.json', 'review.json', 'review-execution.json'].map(ref => fs.readFileSync(path.join(f.root, ref))), logs);
  f.writeTask(p.record);
  assert.equal(f.run().envelope.result.candidate_digest, result.envelope.result.candidate_digest);
  const stale = f.run([], 'verify-daily'); assert.equal(stale.exitCode, 1); assert.equal(stale.envelope.code, 'EVIDENCE_CANDIDATE');
});

test('准备重复运行及返回后漂移仍由原验证拒绝', t => {
  const f = dailyFixture(t);
  delete f.record.skills[0].digest; f.writeTask();
  const result = f.run(['--prepare-inputs']); f.writeTask(prepared(result).record);
  const again = f.run(['--prepare-inputs']);
  assert.deepEqual(prepared(again).changes, []);
  assert.equal(again.envelope.result.candidate_digest, result.envelope.result.candidate_digest);
  assert.equal(f.run().envelope.result.candidate_digest, result.envelope.result.candidate_digest);
  assert.notEqual(f.run([], 'verify-daily').exitCode, 0, 'routing cannot invent missing completion evidence');
  f.write('skill.md', '下一版检查\n');
  assert.equal(f.run().envelope.code, 'DAILY_EVIDENCE');
  assert.equal(f.run([], 'verify-daily').envelope.code, 'DAILY_EVIDENCE');
});

test('准备复用唯一章节原字节', t => {
  const f = dailyFixture(t); f.record.inputs = [{ref: '#验收'}];
  f.writeTask(f.record, '## 验收\n原始规则 é\n');
  const p = prepared(f.run(['--prepare-inputs']));
  assert.equal(p.record.inputs[0].digest, digest(Buffer.from('原始规则 é\n\n')));
});

test('准备复用记录引用边界并隐藏部分准备结果', t => {
  const f = dailyFixture(t);
  fs.symlinkSync(path.join(f.root, 'facts.md'), path.join(f.root, 'link.md'));
  const cases = [
    {ref: '#验收', body: '## 验收\n甲\n## 验收\n乙\n'},
    {ref: '#验收', body: '## 验收\n'},
    {ref: 'task.md'}, {ref: '../outside.md'}, {ref: 'link.md'}, {ref: 'missing.md'},
  ];
  for (const item of cases) {
    delete f.record.skills[0].digest; f.record.inputs = [{ref: item.ref}]; f.writeTask(f.record, item.body || '');
    const result = f.run(['--prepare-inputs']); assert.notEqual(result.exitCode, 0, item.ref);
    assert.equal(result.envelope.result?.input_preparation, undefined, item.ref);
  }
  f.record.inputs = [{ref: '资料.md', digest: 42}]; f.writeTask();
  const invalid = f.run(['--prepare-inputs']); assert.notEqual(invalid.exitCode, 0); assert.equal(invalid.envelope.result?.input_preparation, undefined);
  f.record.inputs = [{ref: '资料.md'}]; f.record.repository.root = '/incorrect'; f.writeTask();
  const later = f.run(['--prepare-inputs']); assert.notEqual(later.exitCode, 0); assert.equal(later.envelope.result?.input_preparation, undefined);
});

test('Backend standalone 准备业务输入并拒绝正式上游', t => {
  const f = dailyFixture(t, {profile: 'backend'}); delete f.record.business_input.digest; f.writeTask();
  const p = prepared(f.run(['--prepare-inputs']));
  assert.deepEqual(p.changes.map(x => x.pointer), ['/business_input/digest']);
  assert.equal(p.record.business_input.digest, digest(fs.readFileSync(path.join(f.root, 'facts.md'))));
  f.record.business_input.mode = 'upstream'; f.writeTask();
  const rejected = f.run(['--prepare-inputs']); assert.notEqual(rejected.exitCode, 0); assert.equal(rejected.envelope.code, 'PREPARE_INPUTS_UNSUPPORTED');
});

test('准备不扩大支持路线或命令范围', t => {
  const f = dailyFixture(t);
  for (const mutate of [r => {r.delivery_path = 'standard';}, r => {r.api.mode = 'compatible-additive';}, r => {r.formal_bindings = [{ref: 'formal.json'}];}]) {
    f.write('formal.json', {stage: 'stage.plan'});
    const record = structuredClone(f.record); mutate(record); f.writeTask(record);
    const result = f.run(['--prepare-inputs']); assert.notEqual(result.exitCode, 0); assert.equal(result.envelope.code, 'PREPARE_INPUTS_UNSUPPORTED');
    assert.equal(result.envelope.result?.input_preparation, undefined);
  }
  f.writeTask();
  for (const [args, action] of [[['--prepare-inputs', '--view', 'agent'], 'route'], [['--prepare-inputs'], 'verify-daily']]) {
    const r = f.run(args, action); assert.notEqual(r.exitCode, 0); assert.equal(r.envelope.code, 'ARGUMENT');
  }
  assert.equal(f.run().envelope.result.input_preparation, undefined);
  assert.equal(f.run(['--prepare-inputs=false']).envelope.result.input_preparation, undefined);
});

test('准备能力与帮助只暴露给 route', () => {
  const caps = spawnSync(binary, ['capabilities', '--json'], {encoding: 'utf8'});
  assert.equal(caps.status, 0);
  assert.ok(JSON.parse(caps.stdout).result.governanceCandidate.interfaces.includes('lifecycle.route:prepare-inputs'));
  const help = action => spawnSync(binary, ['lifecycle', action, '--help'], {encoding: 'utf8'}).stdout;
  assert.ok(help('route').includes('--prepare-inputs'));
  assert.ok(!help('verify-daily').includes('--prepare-inputs'));
});
