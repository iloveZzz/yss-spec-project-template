import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const ENTRY = '.template-source/scripts/replay-lifecycle-triage';
const CONTRACT = '.template-spec/process/orchestration-contract.yaml';
const TRIAGE = '.template-spec/process/triage.yaml';
const MODES = '.template-spec/process/modes.yaml';
const SKILL = '.agents/skills/yss-product-lifecycle/';
const sha = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;

function fixture(t) {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'triage-replay-test-')));
  t.after(() => fs.rmSync(base, {recursive: true, force: true}));
  const root = path.join(base, 'source'), output = path.join(base, 'output');
  const put = (ref, value) => {
    const file = path.join(root, ref);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
  };
  for (const ref of [ENTRY, 'scripts/lib/orchestration-contract.mjs', 'scripts/vendor/yaml.mjs']) {
    put(ref, fs.readFileSync(path.join(ROOT, ref), 'utf8'));
  }
  put(CONTRACT, {schema_version: 2, parts: ['triage.yaml', 'modes.yaml']});
  put(TRIAGE, {request_triage: {marker: 'baseline-policy'}});
  put(MODES, {modes: {daily: {marker: 'daily-mode'}}});
  put(SKILL + 'SKILL.md', 'Frozen Skill text');
  put(SKILL + 'references/request-triage.md', 'Frozen triage guidance');
  put(SKILL + 'references/request-triage-scenarios.yaml', {cases: [
    {id: 'case-1', input: 'test-data-only', context: {}, expected: {mode: 'daily', next_action: 'execute'}, forbidden: []},
  ]});
  for (const args of [['init', '-q'], ['add', '.'], ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'baseline']]) {
    const r = spawnSync('git', args, {cwd: root, encoding: 'utf8'});
    assert.equal(r.status, 0, r.stderr);
  }
  const calls = path.join(base, 'model-calls'), stub = path.join(base, 'codex.mjs'), preload = path.join(base, 'preload.mjs');
  fs.writeFileSync(stub, `import fs from 'node:fs';
if (process.argv.includes('--version')) console.log('fixture-codex');
else {
 fs.appendFileSync(process.env.TRIAGE_REPLAY_CALLS, 'exec\\n');
 fs.readFileSync(0, 'utf8');
 const text=JSON.stringify({cases:[{id:'case-1',mode:'daily',next_action:'execute',answer:'fixture',tool_calls:[]}]});
 console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text}}));
}
`);
  // Route only the external model process to a real local stand-in; keep the
  // replay entry, Git readers, YAML loader and emitted artifacts unchanged.
  fs.writeFileSync(preload, `import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';
for(const name of ['execFileSync','spawnSync']) {const original=cp[name];cp[name]=(file,args,options)=>file==='codex'?original(process.execPath,[${JSON.stringify(stub)},...args],options):original(file,args,options);}
syncBuiltinESMExports();
`);
  const run = () => spawnSync(process.execPath, ['--import', preload, path.join(root, ENTRY), output, 'fixture-model'], {
    cwd: root, encoding: 'utf8', timeout: 15000, env: {...process.env, TRIAGE_REPLAY_CALLS: calls},
  });
  return {root, output, put, run, calls: () => fs.existsSync(calls) ? fs.readFileSync(calls, 'utf8').trim().split('\n') : []};
}

test('分片合同分别绑定 Git 基线与候选提示和原字节摘要', t => {
  const f = fixture(t);
  const baseline = fs.readFileSync(path.join(f.root, TRIAGE));
  f.put(TRIAGE, {request_triage: {marker: 'candidate-policy'}});
  const candidate = fs.readFileSync(path.join(f.root, TRIAGE));
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  const metadata = JSON.parse(fs.readFileSync(path.join(f.output, 'metadata.json')));
  assert.deepEqual(f.calls(), ['exec', 'exec']);
  assert.equal(metadata.model, 'fixture-model');
  for (const [variant, expected, other] of [['baseline', 'baseline-policy', 'candidate-policy'], ['candidate', 'candidate-policy', 'baseline-policy']]) {
    const prompt = fs.readFileSync(path.join(f.output, `${variant}-prompt.txt`), 'utf8');
    assert.ok(prompt.includes(expected));
    assert.ok(!prompt.includes(other));
    assert.ok(prompt.includes('daily-mode'));
    for (const ref of [CONTRACT, MODES]) assert.equal(metadata.variants[variant][ref], sha(fs.readFileSync(path.join(f.root, ref))));
    const scored = JSON.parse(fs.readFileSync(path.join(f.output, `${variant}-scored.json`)));
    assert.equal(scored[0].route_match, true);
  }
  assert.equal(metadata.variants.baseline[TRIAGE], sha(baseline));
  assert.equal(metadata.variants.candidate[TRIAGE], sha(candidate));
  assert.deepEqual(fs.readFileSync(path.join(f.root, TRIAGE)), candidate);
});

test('缺失合同分片在任何模型执行前失败', t => {
  const f = fixture(t);
  fs.unlinkSync(path.join(f.root, TRIAGE));
  const result = f.run();
  assert.notEqual(result.status, 0);
  assert.ok(result.stderr.includes(TRIAGE), result.stderr);
  assert.deepEqual(f.calls(), []);
  assert.equal(fs.existsSync(path.join(f.output, 'metadata.json')), false);
  assert.equal(fs.existsSync(path.join(f.root, TRIAGE)), false);
});

test('重复顶层策略拒绝且不生成可用回放结论', t => {
  const f = fixture(t);
  f.put(MODES, {request_triage: {marker: 'duplicate'}});
  const result = f.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /顶层策略 request_triage 重复定义/);
  assert.deepEqual(f.calls(), []);
  assert.equal(fs.existsSync(path.join(f.output, 'metadata.json')), false);
});
