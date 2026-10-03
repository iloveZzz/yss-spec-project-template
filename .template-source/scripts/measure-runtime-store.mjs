#!/usr/bin/env node
// Fixed-input component benchmark. This is performance evidence, not a substitute
// for the complete template verification or a committed-source release gate.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { beginRuntimeRun, assertNodeVersion } from '../../scripts/lib/runtime-store.mjs';
import { runGroups } from '../../scripts/lib/template-verification-runner.mjs';

assertNodeVersion();
const source = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const quote = value => process.platform === 'win32' ? `"${value.replaceAll('"', '\\"')}"` : `'${value.replaceAll("'", "'\\''")}'`;
function size(directory) {
  let files = 0, bytes = 0;
  if (!fs.existsSync(directory)) return { files, bytes };
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) { const child = size(target); files += child.files; bytes += child.bytes; }
    else if (entry.isFile()) { files++; bytes += fs.statSync(target).size; }
  }
  return { files, bytes };
}
const { values } = parseArgs({ strict: true, options: {
  output: { type: 'string' }, count: { type: 'string', default: '30' }, input: { type: 'string' },
  worker: { type: 'boolean' }, mode: { type: 'string' }, fixture: { type: 'string' },
  home: { type: 'string' }, 'run-dir': { type: 'string' },
} });
if (values.worker) {
  const root = values.fixture;
  const commands = [
    `${quote(process.execPath)} ${quote(path.join(source, 'scripts/repository-mode'))}`,
    `${quote(process.execPath)} ${quote(path.join(source, 'scripts/verify-context-contract'))} --root ${quote(root)}`,
    `${quote(process.execPath)} ${quote(path.join(source, 'scripts/verify-maintenance-checkpoint'))} ${quote(path.join(root, 'checkpoint.json'))}`,
    `${quote(process.execPath)} --check ${quote(path.join(source, '.template-source/cli-core/runtime-store.mjs'))}`,
  ];
  const input = fs.readFileSync(path.join(root, 'inputs.json'));
  const start = performance.now();
  const session = beginRuntimeRun({ root, kind: 'quick-check-benchmark', mode: values.mode, home: values.home, input });
  const directory = session?.runDir || values['run-dir'];
  fs.mkdirSync(directory, { recursive: true });
  if (!session) fs.writeFileSync(path.join(directory, 'inputs.json'), input);
  const events = [];
  const groups = await runGroups({ groups: ['fixed-fast-components'], commands: commands.map((command, index) => ({ command, id: String(index), group: 'fixed-fast-components' })) }, 'template-source', 1, {
    cwd: root, logRoot: directory, runtimeSession: session, runtimeEvent:'command-result',
    onResult: row => {
      if (!session) { events.push({ id: row.id, code: row.code }); fs.writeFileSync(path.join(directory, 'report.json'), JSON.stringify({ events })); }
    },
  });
  const results = groups.flatMap(group => group.results);
  const report = { status: results.every(row => row.code === 0 && !row.storageError) ? 'passed' : 'failed', commands: results };
  const semantics = results.map(row => ({ code: row.code, stdout: hash(fs.readFileSync(row.stdoutFile)), stderr: hash(fs.readFileSync(row.stderrFile)) }));
  if (session) { session.finish({ status: report.status, exitCode: report.status === 'passed' ? 0 : 1, report }); session.close(); }
  else fs.writeFileSync(path.join(directory, 'report.json'), JSON.stringify(report));
  process.stdout.write(JSON.stringify({ wall_ms: performance.now() - start, rss_bytes: process.resourceUsage().maxRSS * 1024, semantics, status: report.status }));
  if (report.status !== 'passed') process.exitCode = 1;
} else {
  if (!values.output || !path.isAbsolute(values.output) || fs.existsSync(values.output)) throw new Error('--output 必须为仓外尚不存在的绝对目录');
  const output = path.resolve(values.output);
  const relative = path.relative(source, output);
  if (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative)) throw new Error('测量输出必须在仓外');
  const count = Number(values.count);
  if (!Number.isInteger(count) || count < 30) throw new Error('--count 至少为30');
  fs.mkdirSync(output, { recursive: true });
  const fixture = path.join(output, 'fixture'); fs.mkdirSync(fixture);
  for (const file of ['CONTEXT.md', 'yss-project.yaml']) fs.copyFileSync(path.join(source, file), path.join(fixture, file));
  fs.writeFileSync(path.join(fixture, 'checkpoint.json'), JSON.stringify({ schema_version: 2, intensity: 'L3', classification_reason: '固定输入组件测量', triggers: ['core-validator'], changed_assets: ['runtime-store'], verification_evidence: ['self-check', 'fresh-verification'].map(kind => ({ kind, command: 'fixture', result: 'pass' })), review_mode: 'self-check', escalation: 'none', target_state: 'implementation-ready', current_state: 'implementation-ready', verification_profile: 'fast', review_round: 0, candidate_digest: null }));
  const inputs = Object.fromEntries(['CONTEXT.md', 'yss-project.yaml', 'checkpoint.json'].map(file => [file, hash(fs.readFileSync(path.join(fixture, file)))]));
  const runtimeInput = values.input ? fs.readFileSync(path.resolve(values.input)) : Buffer.from(JSON.stringify(inputs));
  fs.writeFileSync(path.join(fixture, 'inputs.json'), runtimeInput);
  inputs.runtime_input_sha256 = hash(runtimeInput);
  inputs.runtime_input_bytes = runtimeInput.length;
  const rows = [];
  function run(mode, index) {
    const started = performance.now();
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--worker', '--mode', mode, '--fixture', fixture, '--home', path.join(output, 'sqlite'), '--run-dir', path.join(output, 'off', String(index))], { encoding: 'utf8', env: { ...process.env, YSS_RUNTIME_HOME: path.join(output, 'sqlite') }, maxBuffer: 1024 * 1024 });
    const row = { ...JSON.parse(result.stdout || '{}'), end_to_end_ms: performance.now() - started, mode, index, exit_code: result.status };
    fs.appendFileSync(path.join(output, 'measurement.stderr'), result.stderr);
    if (result.error || result.status !== 0) throw new Error(`测量失败: ${result.error?.message || result.stderr}`);
    return row;
  }
  for (let index = -2; index < 0; index++) for (const mode of ['off', 'sqlite']) run(mode, index);
  const before = { off: size(path.join(output, 'off')), sqlite: size(path.join(output, 'sqlite')) };
  for (let index = 0; index < count; index++) {
    const pair = (index % 2 ? ['sqlite', 'off'] : ['off', 'sqlite']).map(mode => run(mode, index));
    if (JSON.stringify(pair[0].semantics) !== JSON.stringify(pair[1].semantics)) throw new Error('相同输入下输出或退出码不一致');
    rows.push(...pair);
    if (index % 5 === 4) process.stderr.write(`已完成 ${index + 1}/${count} 对照\n`);
  }
  const percentile = (array, p) => [...array].sort((a, b) => a - b)[Math.ceil(array.length * p) - 1];
  const summary = Object.fromEntries(['off', 'sqlite'].map(mode => {
    const data = rows.filter(row => row.mode === mode), after = size(path.join(output, mode));
    return [mode, { runs: data.length, p50_ms: percentile(data.map(row => row.end_to_end_ms), .5), p95_ms: percentile(data.map(row => row.end_to_end_ms), .95), rss_p95_bytes: percentile(data.map(row => row.rss_bytes), .95), file_growth: after.files - before[mode].files, byte_growth: after.bytes - before[mode].bytes }];
  }));
  const result = { schema_version: 1, scope: '实际runner执行身份、CONTEXT、L3 checkpoint和语法四项固定输入快检；包含启动、登记、流式日志、报告完成；RSS为每次runner自身峰值，不代表整个进程树或完整发布验证。', platform: os.platform(), node: process.versions.node, inputs, summary, p95_ratio: summary.sqlite.p95_ms / summary.off.p95_ms, threshold: 1.10, rows };
  result.performance_passed = result.p95_ratio <= result.threshold;
  fs.writeFileSync(path.join(output, 'comparison.json'), JSON.stringify(result, null, 2));
  process.stdout.write(JSON.stringify({ summary, p95_ratio: result.p95_ratio, performance_passed: result.performance_passed }, null, 2) + '\n');
  if (!result.performance_passed) process.exitCode = 1;
}
