#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { parseDocument } from '../../scripts/vendor/yaml.mjs';
import { assertNodeVersion, beginRuntimeRun, resolveRuntimeLocation } from '../../scripts/lib/runtime-store.mjs';
import { runCommand } from '../../scripts/lib/command-runner.mjs';

const KEYS = ['22.12', '22.13', '24', '26'];
const TESTS = ['tests/runtime-store.test.mjs', 'tests/runtime-store-integration.test.mjs', 'tests/runtime-store-distribution.test.mjs'];
const REQUIRED = ['AGENTS.md', 'CONTEXT.md', 'yss-project.yaml', '.template-source/scripts/verify-runtime-windows.mjs', '.template-source/cli-core/runtime-store.mjs', '.template-source/cli-core/command-runner.mjs', 'scripts/lib/runtime-store.mjs', 'scripts/lib/command-runner.mjs', ...TESTS];
const DEFAULT_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const inside = (root, target) => { const relative = path.relative(root, target); return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)); };
const exists = filename => { try { fs.lstatSync(filename); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
const HELP = `用法：node .template-source/scripts/verify-runtime-windows.mjs --nodes-json <路径> --output <仓外新绝对目录> [--root <源码根>] [--source-manifest <路径>]\n\nnodes-json 是对象，四个键为 22.12、22.13、24、26，值为 Node 可执行文件绝对路径。\nsource-manifest: {schema_version:1, source_state:'portable-working-tree', files:[{path,sha256,bytes}]}；path 相对源码根。\n便携包没有 Git 时必须提供仓外清单；portable-working-tree 清单覆盖全部普通源码文件，仅排除 .git 管理数据和 .DS_Store，拒绝额外文件或符号链接，允许未出生 HEAD 的临时 Git。清单只核验原字节，不能替代 committed-source 或完整 Fresh Verification。\nWindows 需已有 git、python3、jsonschema 与符号链接权限，本工具不安装依赖。\n每个支持版本一次执行三个显式 runtime 测试文件；22.12 执行专用拒绝测试；单命令最长20分钟。\n--help / --plan 只读，不创建输出或运行记录。非 Windows 默认拒绝；--allow-other-platform 仅作机械检查，windows_verified=false。\n`;

function portableFiles(root) {
  const files = [];
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      if (entry.name === '.DS_Store') continue;
      const filename = path.join(directory, entry.name);
      // Git administration is outside the byte manifest. Other links are not
      // ordinary source files and cannot hide additional imported content.
      if (entry.isSymbolicLink()) throw Error(`便携源码含符号链接: ${path.relative(root, filename)}`);
      if (entry.name === '.git' && (entry.isDirectory() || entry.isFile())) continue;
      if (entry.isDirectory()) visit(filename);
      else if (entry.isFile()) files.push(path.relative(root, filename).split(path.sep).join('/'));
      else throw Error(`便携源码含未知文件类型: ${path.relative(root, filename)}`);
    }
  };
  visit(root);
  return files.sort();
}

function sourceRows(root, manifestPath) {
  let manifest, manifestBytes;
  if (manifestPath) {
    manifestBytes = fs.readFileSync(manifestPath);
    manifest = JSON.parse(manifestBytes);
    if (manifest.schema_version !== 1 || !manifest.files || !['working-tree', 'portable-working-tree'].includes(manifest.source_state)) throw Error('source-manifest schema 或来源状态非法');
  }
  const rows = manifest ? (Array.isArray(manifest.files) ? manifest.files : Object.entries(manifest.files).map(([name, value]) => ({ path: name, ...value }))) : REQUIRED.map(ref => ({ path: ref }));
  const names = new Set();
  const captured = rows.map(row => {
    if (typeof row.path !== 'string' || !row.path || path.isAbsolute(row.path) || path.win32.isAbsolute(row.path) || row.path.split(/[\\/]/).includes('..') || names.has(row.path)) throw Error('source-manifest 路径非法或重复');
    const normalized = row.path.replaceAll('\\', '/');
    if (names.has(normalized)) throw Error('source-manifest 规范路径重复');
    names.add(normalized);
    const filename = path.resolve(root, normalized);
    if (!inside(root, fs.realpathSync(filename)) || !fs.statSync(filename).isFile()) throw Error(`源码清单真实路径越界或类型非法: ${row.path}`);
    const data = fs.readFileSync(filename), actual = { path: normalized, sha256: sha(data), bytes: data.length };
    if (manifest && (!/^[a-f0-9]{64}$/.test(row.sha256) || !Number.isInteger(row.bytes) || row.sha256 !== actual.sha256 || row.bytes !== actual.bytes)) throw Error(`源码原字节与清单不一致: ${row.path}`);
    return actual;
  }).sort((a, b) => a.path.localeCompare(b.path, 'en'));
  for (const ref of REQUIRED) if (!names.has(ref)) throw Error(`源码清单缺少运行输入: ${ref}`);
  if (manifest?.source_state === 'portable-working-tree') {
    const actual = portableFiles(root);
    const actualNames = new Set(actual);
    const missing = actual.filter(ref => !names.has(ref));
    const excluded = [...names].filter(ref => !actualNames.has(ref));
    if (missing.length || excluded.length) throw Error(`便携源码清单覆盖不完整: 未列文件 ${missing.join(', ') || '无'}；未消费的清单路径 ${excluded.join(', ') || '无'}`);
  }
  return { files: captured, sha256: sha(JSON.stringify(captured)), manifest_sha256: manifestBytes ? sha(manifestBytes) : null, declared_source_input_sha256: manifest?.source_input_sha256 ?? null, declared_source_state: manifest?.source_state ?? null, kind: manifest ? 'portable-source-manifest' : 'selected-runtime-inputs', complete_fresh_verification: false };
}

function parseSummary(output) {
  const numeric = key => {
    const matches = [...output.matchAll(new RegExp(`^(?:#|ℹ) ${key} (\\d+)\\s*$`, 'gm'))];
    return matches.length ? Number(matches.at(-1)[1]) : null;
  };
  return { tests: numeric('tests'), pass: numeric('pass'), fail: numeric('fail'), cancelled: numeric('cancelled'), skipped: numeric('skipped') };
}

async function main() {
  assertNodeVersion();
  const { values, positionals } = parseArgs({ allowPositionals: false, options: {
    root: { type: 'string', default: DEFAULT_ROOT }, 'nodes-json': { type: 'string' }, output: { type: 'string' },
    'source-manifest': { type: 'string' }, 'allow-other-platform': { type: 'boolean' }, help: { type: 'boolean' }, plan: { type: 'boolean' },
  } });
  if (positionals.length) throw Error('不支持位置参数');
  if (values.help) { process.stdout.write(HELP); return; }
  if (values.plan) {
    process.stdout.write(JSON.stringify({ schema_version: 1, execution: 'not-performed', windows_required: true, versions: KEYS, tests: TESTS, timeout_ms: 1_200_000, output_created: false }, null, 2) + '\n');
    return;
  }
  if (process.platform !== 'win32' && !values['allow-other-platform']) throw Error('此入口需要真实 Windows；非 Windows 未创建输出或运行记录。机械检查需显式 --allow-other-platform。');
  if (!values.output || !path.isAbsolute(values.output) || exists(values.output)) throw Error('--output 必须为尚不存在的仓外绝对目录');
  const root = fs.realpathSync(path.resolve(values.root));
  // Output is checked before inputs, dependency probes, database or logs can write.
  const output = resolveRuntimeLocation({ root, home: values.output }).home;
  const runtimeLocation = resolveRuntimeLocation({ root });
  if (inside(runtimeLocation.directory, output) || inside(output, runtimeLocation.directory)) throw Error('报告目录不能与本运行数据库目录重叠');
  const identity = parseDocument(fs.readFileSync(path.join(root, 'yss-project.yaml'), 'utf8'));
  if (identity.errors.length) throw Error('仓库身份 YAML 不可读');
  const project = identity.toJS();
  if (project?.schema_version !== 1 || project.repository_mode !== 'template-source') throw Error('此 source-only 入口只接受 template-source');
  fs.readFileSync(path.join(root, 'CONTEXT.md'));
  if (!values['nodes-json']) throw Error('需要 --nodes-json；参见 --help');
  const declared = JSON.parse(fs.readFileSync(values['nodes-json'], 'utf8'));
  if (!declared || typeof declared !== 'object' || Array.isArray(declared) || Object.keys(declared).length !== KEYS.length) throw Error('nodes-json 必须只包含四个版本键');
  const nodes = Object.fromEntries(KEYS.map(key => {
    const executable = declared[key];
    if (typeof executable !== 'string' || !path.isAbsolute(executable)) throw Error(`Node ${key} 需要绝对可执行文件路径`);
    const actual = fs.realpathSync(executable);
    if (!fs.statSync(actual).isFile()) throw Error(`Node ${key} 路径不是文件`);
    return [key, actual];
  }));
  const hasGit = exists(path.join(root, '.git'));
  if (!hasGit && !values['source-manifest']) throw Error('没有 Git 元数据的便携包必须提供 --source-manifest');
  const manifestPath = values['source-manifest'] ? fs.realpathSync(path.resolve(values['source-manifest'])) : null;
  const before = sourceRows(root, manifestPath);
  const portableSource = before.declared_source_state === 'portable-working-tree';
  // Git worktrees bind the existing complete source fingerprint. Portable
  // packages bind their byte manifest and never request a committed-source HEAD.
  if (!hasGit && !portableSource) throw Error('没有 Git 元数据时不能声明 working-tree 来源');
  const verificationDigest = portableSource ? null : (await import('../../scripts/lib/verification-report.mjs')).verificationInputDigest;
  const verificationBefore = verificationDigest ? verificationDigest(root) : null;
  before.verification_input_sha256 = verificationBefore;
  const session = beginRuntimeRun({ root, mode: 'sqlite', kind: 'runtime-windows-compatibility', reportDir: output, input: { nodes, source: before } });
  const reportFile = path.join(output, 'report.json');
  const report = { schema_version: 1, kind: 'runtime-windows-compatibility', root, source_state: portableSource || !hasGit ? 'portable-working-tree' : 'working-tree', source_scope: portableSource ? 'portable-source-manifest' : 'git-working-tree-runtime-inputs', source_head: null, platform: process.platform, windows_verified: false, release_ready: false, publication: 'not-performed', fresh_verification_scope: 'runtime-tests-only', driver_exit_must_equal: 0, started_at: new Date().toISOString(), finished_at: null, status: 'failed', run_id: session.id, input: before, verification_input_sha256: verificationBefore, verification_input_after_sha256: null, commands: [], environment_issues: [], storage_errors: [], input_drift: null };
  let failure, finished = false, outputOwned = false;
  try {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.mkdirSync(output);
    outputOwned = true;
    if (fs.realpathSync(output) !== output) throw Error('报告目录真实路径发生变化');
    fs.mkdirSync(path.join(output, 'logs'));
    session.pin('windows-runtime-verification-report');
    const execute = async (kind, command, args, { test = false, requiredPasses, allowSkipped = false } = {}) => {
      const number = report.commands.length + 1;
      const stdoutFile = path.join(output, 'logs', `${String(number).padStart(2, '0')}.stdout.log`);
      const stderrFile = path.join(output, 'logs', `${String(number).padStart(2, '0')}.stderr.log`);
      const result = await runCommand(command, args, { cwd: root, timeoutMs: 1_200_000, stdoutFile, stderrFile, runtimeSession: session, env: { ...process.env, YSS_RUNTIME_HOME: path.join(output, 'child-runtime') } });
      const stdoutBytes = fs.statSync(stdoutFile).size, stderrBytes = fs.statSync(stderrFile).size;
      const spawnFailed = Boolean(result.spawnError || result.error || result.stderr.includes(`spawn ${command} `));
      const exitObserved = typeof result.actual_exit_code_observed==='boolean' ? result.actual_exit_code_observed : !result.termination && !result.signal && !spawnFailed && Number.isInteger(result.status);
      const actualExit = exitObserved ? result.actual_exit_code??result.status : null;
      const row = { kind, command, args, cwd: root, runner_status: result.status, actual_exit_code: actualExit, actual_exit_code_observed: exitObserved, actual_exit_signal:result.actual_exit_signal??null,signal: result.signal, termination: result.termination, spawn_error_observed: spawnFailed, duration_ms: result.duration_ms, stdout_log: path.relative(output, stdoutFile), stderr_log: path.relative(output, stderrFile), stdout_bytes: stdoutBytes, stderr_bytes: stderrBytes };
      if (test) row.summary = parseSummary(result.stdout);
      report.commands.push(row);
      if (result.storageError) { report.storage_errors.push(result.storageError); throw Error(`命令已执行但运行登记失败: ${kind}`); }
      if (result.status !== 0 || result.termination) {
        if (/EPERM|EACCES|ENOENT|privilege|symlink|symbolic link|not permitted/i.test(result.stderr + result.stdout)) report.environment_issues.push({ kind, reason: result.stderr.slice(-3000) || '符号链接权限或依赖环境不足，详见日志' });
        throw Error(`${kind} 失败，runner 状态 ${result.status}，实际退出码 ${exitObserved ? actualExit : '未观察'}；不重复执行，详见日志`);
      }
      if (stdoutBytes + stderrBytes === 0) throw Error(`${kind} 日志为空，不能作为执行证据`);
      if (test && (!row.summary.tests || !row.summary.pass || row.summary.fail !== 0 || row.summary.cancelled !== 0)) throw Error(`${kind} 缺少完整成功测试摘要`);
      if (test && (row.summary.pass !== requiredPasses || (!allowSkipped && (row.summary.skipped !== 0 || row.summary.tests !== requiredPasses)))) throw Error(`${kind} 测试数量或跳过数不符合要求，需实际通过 ${requiredPasses} 项`);
      session.recordEvent('verification-command-completed', { kind, runner_status: result.status, actual_exit_code: row.actual_exit_code, actual_exit_code_observed: row.actual_exit_code_observed, duration_ms: result.duration_ms });
      return result;
    };
    for (const key of KEYS) {
      const result = await execute(`node-version-${key}`, nodes[key], ['--version']);
      const match = /^v(\d+)\.(\d+)\.(\d+)\s*$/.exec(result.stdout);
      if (!match || (key.includes('.') ? `${match[1]}.${match[2]}` !== key : match[1] !== key)) throw Error(`Node ${key} 实际版本不匹配: ${result.stdout.trim()}`);
      report.commands.at(-1).actual_node_version = result.stdout.trim();
    }
    await execute('git-environment', 'git', ['--version']);
    await execute('python-jsonschema-environment', 'python3', ['-c', 'import sys,jsonschema;from jsonschema import Draft202012Validator,FormatChecker;from referencing.jsonschema import DRAFT202012;from importlib.metadata import version;print(sys.version);print("jsonschema="+version("jsonschema"))']);
    if (hasGit && !portableSource) {
      report.source_head = (await execute('source-head-observation', 'git', ['rev-parse', 'HEAD'])).stdout.trim();
      if (!/^[a-f0-9]{40}$/.test(report.source_head)) throw Error('真实 Git 工作树的 HEAD 观察结果非法');
    }
    await execute('symlink-environment', nodes['22.13'], ['-e', "const fs=require('node:fs'),path=require('node:path');const d=process.argv[1],f=path.join(d,'target'),l=path.join(d,'link'),q=path.join(d,'dir'),r=path.join(d,'dir-link');fs.mkdirSync(d);try{fs.writeFileSync(f,'probe');fs.mkdirSync(q);fs.symlinkSync(f,l,'file');fs.symlinkSync(q,r,'dir');if(fs.readFileSync(l,'utf8')!=='probe'||!fs.statSync(r).isDirectory())throw Error('symlink probe mismatch');console.log('file and directory symlink permissions available')}finally{for(const x of [l,r,f]){try{fs.unlinkSync(x)}catch(e){if(e.code!=='ENOENT')throw e}}try{fs.rmdirSync(q)}catch(e){if(e.code!=='ENOENT')throw e}fs.rmdirSync(d)}", path.join(output, 'symlink-probe')]);
    for (const key of ['22.13', '24', '26']) await execute(`runtime-tests-${key}`, nodes[key], ['--test', '--test-reporter=tap', '--test-concurrency=1', ...TESTS], { test: true, requiredPasses:44 });
    await execute('node-22.12-refusal-tests', nodes['22.12'], ['--test', '--test-reporter=tap', '--test-name-pattern=Node 22.12 startup rejection', TESTS[2]], { test: true, requiredPasses:1, allowSkipped:true });
    report.status = process.platform === 'win32' ? 'passed' : 'mechanical-check-passed';
  } catch (error) { failure = error; report.error = error.message; }
  finally {
    try {
      const after = sourceRows(root, manifestPath);
      report.input_after_sha256 = after.sha256;
      report.manifest_after_sha256 = after.manifest_sha256;
      report.verification_input_after_sha256 = verificationDigest ? verificationDigest(root) : null;
      report.input_drift = before.sha256 !== after.sha256 || before.manifest_sha256 !== after.manifest_sha256 || verificationBefore !== report.verification_input_after_sha256;
      if (report.input_drift) throw Error('执行前后源码清单发生变化');
    } catch (error) { report.input_drift = true; report.source_error = error.message; failure ??= error; }
    if (failure || report.storage_errors.length) report.status = 'failed';
    report.windows_verified = process.platform === 'win32' && report.status === 'passed';
    report.finished_at = new Date().toISOString();
    let reportWritten = false;
    const storageFailure = (stage, error) => {
      failure ??= error;
      report.storage_errors.push(`${stage}: ${error.message}`);
      report.status = 'failed';
      report.windows_verified = false;
      report.error ??= error.message;
      report.storage_finalization = 'failed';
      process.stderr.write(`运行记录收尾失败: ${stage}: ${error.message}\n`);
    };
    try {
      if (!outputOwned || !exists(output)) throw Error('报告输出目录未被本运行独占创建');
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      reportWritten = true;
      session.finish({ status: failure ? 'failed' : 'passed', exitCode: failure ? 1 : 0, report: reportFile });
      finished = true;
    } catch (error) { storageFailure('finish', error); }
    try { session.close(); } catch (error) { storageFailure('close', error); }
    // A failed ledger finalization cannot leave an optimistic passed report.
    // Only replace the report this invocation created; commands are never rerun.
    if (reportWritten && report.storage_finalization === 'failed') {
      try {
        if (fs.lstatSync(reportFile).isSymbolicLink() || fs.realpathSync(reportFile) !== reportFile) throw Error('报告真实路径发生变化，拒绝覆写');
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
      } catch (error) { process.stderr.write(`失败报告保存失败: ${error.message}\n`); }
    }
  }
  if (failure || !finished) { process.stderr.write(`Windows运行验证未通过: ${failure?.message || '报告或登记不完整'}\n`); process.exitCode = 1; }
  process.stdout.write(JSON.stringify({ report: reportFile, status: failure ? 'failed' : report.status, windows_verified: !failure && report.windows_verified, source_state: report.source_state, release_ready: false }) + '\n');
}

main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
