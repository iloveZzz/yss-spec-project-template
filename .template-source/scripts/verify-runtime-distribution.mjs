#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { verificationInputDigest } from '../../scripts/lib/verification-report.mjs';
import { assertNodeVersion, resolveRuntimeLocation } from '../../scripts/lib/runtime-store.mjs';
import {NATIVE_PROFILES,nativeBinary,initializeNative,inspectNative} from './lib/native-yss.mjs';

assertNodeVersion();
const root = fileURLToPath(new URL('../..', import.meta.url));
const { values } = parseArgs({ strict: true, options: { output: { type: 'string' } } });
if (!values.output || !path.isAbsolute(values.output) || fs.existsSync(values.output)) throw new Error('--output 必须为仓外尚不存在的绝对目录');
resolveRuntimeLocation({ root, home: values.output });
const output = values.output; fs.mkdirSync(output, { recursive: true });
const report = { schema_version: 1, kind: 'runtime-distribution-development-verification', source_state: 'working-tree', release_ready: false, status: 'running', started_at: new Date().toISOString(), input_sha256: verificationInputDigest(root), commands: [], packages: [] };
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const save = () => fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
function run(command, args, cwd = root, env = process.env) {
  const log = `${report.commands.length}.log`, started = performance.now(), executedAt = new Date().toISOString();
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(path.join(output, log), (result.stdout || '') + (result.stderr || ''));
  report.commands.push({ command: [command, ...args], cwd, executed_at: executedAt, exit_code: result.status, signal: result.signal, duration_ms: Math.round(performance.now() - started), log }); save();
  if (result.error || result.status !== 0) throw new Error(result.error?.message || `命令失败，参见 ${log}: ${result.stderr}`);
  return result.stdout;
}
try {
  report.source_commit = run('git', ['rev-parse', 'HEAD']).trim();
  const canonical = fs.readFileSync(path.join(root, '.template-source/cli-core/runtime-store.mjs'));
  const pinned=nativeBinary();
  for (const family of NATIVE_PROFILES) {
    const instance = path.join(output, family, 'instance');fs.mkdirSync(path.dirname(instance),{recursive:true});
    initializeNative(family,instance,{run:(binary,args,cwd,env)=>({stdout:run(binary,args,cwd,env),status:0})});
    assert.match(fs.readFileSync(path.join(instance, 'yss-project.yaml'), 'utf8'), /repository_mode:\s*project-instance/);
    assert.deepEqual(fs.readFileSync(path.join(instance, 'scripts/lib/runtime-store.mjs')), canonical);
    assert.deepEqual(fs.readFileSync(path.join(instance, '.template-spec/process/runtime-storage.md')), fs.readFileSync(path.join(root, '.template-spec/process/runtime-storage.md')));
    const runtimeHome = path.join(output, family, 'query-only-home');
    const summary = JSON.parse(run(process.execPath, [path.join(instance, 'scripts/runtime-store'), 'inspect', '--root', instance, '--home', runtimeHome], instance));
    assert.equal(summary.database_exists, false); assert.equal(fs.existsSync(runtimeHome), false);
    for (const forbidden of ['.template-source', 'submodules']) assert.equal(fs.existsSync(path.join(instance, forbidden)), false);
    report.packages.push({family,package:'yss',binary_sha256:pinned.digest,bundle:inspectNative(family),source_state:'working-tree',instance});save();
    process.stderr.write(`${family}: 固定 yss 初始化、治理工具和只读查询通过\n`);
  }
  report.input_after_sha256 = verificationInputDigest(root);
  assert.equal(report.input_after_sha256, report.input_sha256, '分发验证输入发生漂移');
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = error.message; process.stderr.write(error.message + '\n'); process.exitCode = 1; }
finally { report.finished_at = new Date().toISOString(); save(); }
