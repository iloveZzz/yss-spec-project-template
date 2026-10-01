import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { materializeTestPlugin, measureTestBuild, publishTestFixture, treeInventory } from '../scripts/tooling-fixture.mjs';
import { runToolingProcess } from '../scripts/tooling-process.mjs';
import { verificationInputDigest } from '../../../../scripts/lib/verification-report.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture(t) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'tooling-fixture-test-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const sourceRoot = path.join(dir, 'source'), artifact = path.join(dir, 'artifact');
  fs.mkdirSync(sourceRoot); fs.mkdirSync(artifact);
  for (const name of ['source.mjs', 'schema.json', 'reference.json', 'lock.json', 'pin.json']) fs.writeFileSync(path.join(sourceRoot, name), 'original');
  execFileSync('git', ['init', '--quiet', sourceRoot]);
  execFileSync('git', ['-C', sourceRoot, 'add', '.']);
  execFileSync('git', ['-C', sourceRoot, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--quiet', '-m', 'test fixture']);
  fs.mkdirSync(path.join(artifact, 'empty'));
  fs.writeFileSync(path.join(artifact, 'run'), 'payload', { mode: 0o755 });
  const manifestFile = path.join(dir, 'fixture.json');
  const digest = publishTestFixture({ sourceRoot, artifact, manifestFile, inputDigest: verificationInputDigest(sourceRoot), dependencies: [] });
  const environment = { YSS_TOOLING_PLUGIN_FIXTURE: manifestFile, YSS_TOOLING_PLUGIN_FIXTURE_SHA256: digest };
  const materialize = output => materializeTestPlugin({ sourceRoot, output: path.join(dir, output), environment, build: () => assert.fail('must not rebuild accepted fixture') });
  return { dir, sourceRoot, artifact, manifestFile, environment, materialize };
}

test('单次运行产物按字节、权限与类型复制，各测试修改互不影响', t => {
  const f = fixture(t); f.materialize('one'); f.materialize('two');
  assert.deepEqual(treeInventory(path.join(f.dir, 'one')), treeInventory(f.artifact));
  assert.notEqual(fs.statSync(path.join(f.dir, 'one/run')).ino, fs.statSync(path.join(f.dir, 'two/run')).ino);
  fs.writeFileSync(path.join(f.dir, 'one/run'), 'changed');
  assert.equal(fs.readFileSync(path.join(f.dir, 'two/run'), 'utf8'), 'payload');
  assert.equal(fs.readFileSync(path.join(f.artifact, 'run'), 'utf8'), 'payload');
  assert.throws(() => f.materialize('two'), /existing output/);
});
test('并发运行消费同一准备产物时拥有独立副本与日志', async t => {
  const f = fixture(t);
  const rows = await Promise.all(['one', 'two'].map(name => {
    const output = path.join(f.dir, name);
    const code = `import fs from 'node:fs';import {materializeTestPlugin} from ${JSON.stringify(new URL('../scripts/tooling-fixture.mjs', import.meta.url).href)};
      materializeTestPlugin({sourceRoot:${JSON.stringify(f.sourceRoot)},output:${JSON.stringify(output)},build:()=>{throw Error('unexpected rebuild')}});
      fs.writeFileSync(${JSON.stringify(path.join(output, 'run'))},${JSON.stringify(name)});console.log(${JSON.stringify(name)});`;
    return runToolingProcess(process.execPath, ['--input-type=module', '-e', code], {
      cwd: f.dir, logRoot: path.join(f.dir, 'logs'), name,
      env: { ...process.env, ...f.environment, YSS_TOOLING_COPY_LOG: '' },
    });
  }));
  for (const [index, name] of ['one', 'two'].entries()) {
    assert.equal(rows[index].code, 0, fs.readFileSync(rows[index].stderrFile, 'utf8'));
    assert.equal(fs.readFileSync(rows[index].stdoutFile, 'utf8').trim(), name);
    assert.equal(fs.readFileSync(path.join(f.dir, name, 'run'), 'utf8'), name);
  }
  assert.equal(fs.readFileSync(path.join(f.artifact, 'run'), 'utf8'), 'payload');
  assert.notEqual(fs.statSync(path.join(f.dir, 'one/run')).ino, fs.statSync(path.join(f.dir, 'two/run')).ino);
});
test('源码、Schema、外部引用、lock 和 pins 变化使准备产物失效', t => {
  const f = fixture(t);
  for (const name of ['source.mjs', 'schema.json', 'reference.json', 'lock.json', 'pin.json']) {
    const file = path.join(f.sourceRoot, name); fs.writeFileSync(file, 'changed');
    assert.throws(() => f.materialize('rejected'), /source inputs changed/);
    fs.writeFileSync(file, 'original');
  }
  f.materialize('restored');
});
test('产物删除、篡改、权限与符号链接变化均失败，恢复后可以复制', t => {
  const f = fixture(t), file = path.join(f.artifact, 'run');
  for (const corrupt of [() => fs.rmSync(file), () => fs.writeFileSync(file, 'tamper'), () => fs.chmodSync(file, 0o644),
    ...(process.platform === 'win32' ? [] : [() => fs.chmodSync(file, 0o4755)]),
    () => { fs.rmSync(file); fs.symlinkSync(path.join(f.sourceRoot, 'source.mjs'), file); },
    () => { fs.rmSync(file); fs.mkdirSync(file); }]) {
    corrupt(); assert.throws(() => f.materialize('rejected'), /artifact changed|unsupported/);
    assert.throws(() => f.materialize('rejected'), /artifact changed|unsupported/);
    fs.rmSync(file, { recursive: true, force: true }); fs.writeFileSync(file, 'payload', { mode: 0o755 });
  }
  f.materialize('recovered');
});
test('manifest、运行时指纹和输入摘要不能跨准备上下文复用', t => {
  const f = fixture(t), original = fs.readFileSync(f.manifestFile);
  fs.appendFileSync(f.manifestFile, ' '); assert.throws(() => f.materialize('wrong'), /manifest changed/);
  const manifest = JSON.parse(original); manifest.runtime.node = 'other-runtime';
  const bytes = JSON.stringify(manifest); fs.writeFileSync(f.manifestFile, bytes); f.environment.YSS_TOOLING_PLUGIN_FIXTURE_SHA256 = sha(bytes);
  assert.throws(() => f.materialize('wrong'), /runtime changed/);
  fs.writeFileSync(f.manifestFile, original); f.environment.YSS_TOOLING_PLUGIN_FIXTURE_SHA256 = sha(original);
  const link = path.join(f.dir, 'link'); fs.symlinkSync(f.dir, link);
  assert.throws(() => f.materialize('link/escape'), /unsafe/);
});
test('单独运行无准备上下文时真实构建，构建失败不会被当作通过', t => {
  let calls = 0;
  const options = { sourceRoot: '.', output: 'unused', environment: {}, build: () => { calls++; return { result: 'built' }; } };
  assert.deepEqual(materializeTestPlugin(options), { result: 'built' }); assert.equal(calls, 1);
  assert.throws(() => materializeTestPlugin({ ...options, build: () => { throw new Error('build failed'); } }), /build failed/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tooling-build-metrics-')), log = path.join(dir, 'build.jsonl');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const timedOut = { status: null, signal: 'SIGTERM', error: new Error('ETIMEDOUT') };
  assert.equal(measureTestBuild('unused', () => timedOut, { YSS_TOOLING_COPY_LOG: log }), timedOut);
  const row = JSON.parse(fs.readFileSync(log, 'utf8'));
  assert.equal(row.code, 1); assert.equal(row.exit_code, null); assert.equal(row.signal, 'SIGTERM'); assert.match(row.error, /ETIMEDOUT/);
});
test('进程监督保留退出码和日志，失败后可继续真实执行', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tooling-process-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const run = (code, name) => runToolingProcess(process.execPath, ['-e', code], { cwd: dir, logRoot: dir, name });
  for (const name of ['fail-1', 'fail-2']) {
    const row = await run('console.error("actual failure");process.exit(7)', name);
    assert.equal(row.code, 7); assert.equal(row.exit_code, 7); assert.match(fs.readFileSync(row.stderrFile, 'utf8'), /actual failure/);
  }
  assert.equal((await run('console.log("actual recovery")', 'recovery')).code, 0);
});
test('进程超时和取消返回失败且停止子进程组', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tooling-stop-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const code = 'process.on("SIGTERM",()=>{});setInterval(()=>{},1000)';
  const timed = await runToolingProcess(process.execPath, ['-e', code], { cwd: dir, logRoot: dir, name: 'timeout', timeoutMs: 100 });
  assert.equal(timed.code, 124); assert.equal(timed.reason, 'timeout');
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 100);
  const cancelled = await runToolingProcess(process.execPath, ['-e', code], { cwd: dir, logRoot: dir, name: 'cancelled', signal: controller.signal });
  clearTimeout(timer); assert.equal(cancelled.code, 130);
  if (process.platform !== 'win32') for (const pid of [timed.pid, cancelled.pid]) assert.throws(() => process.kill(pid, 0), /ESRCH/);
});

test('取消外层测试进程时不遗留内部监督进程启动的孙进程', { skip: process.platform === 'win32' }, async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tooling-descendant-')), pidFile = path.join(dir, 'pid');
  t.after(() => { if (fs.existsSync(pidFile)) { try { process.kill(Number(fs.readFileSync(pidFile, 'utf8')), 'SIGKILL'); } catch {} } fs.rmSync(dir, { recursive: true, force: true }); });
  const grandchild = `require('node:fs').writeFileSync(${JSON.stringify(pidFile)},String(process.pid));process.on('SIGTERM',()=>{});setInterval(()=>{},1000)`;
  const supervisor = `import {runToolingProcess} from ${JSON.stringify(new URL('../scripts/tooling-process.mjs', import.meta.url).href)};await runToolingProcess(process.execPath,['-e',${JSON.stringify(grandchild)}],{cwd:${JSON.stringify(dir)},logRoot:${JSON.stringify(dir)},name:'inner'});`;
  const controller = new AbortController();
  const timer = setInterval(() => { if (fs.existsSync(pidFile)) controller.abort(); }, 20); t.after(() => clearInterval(timer));
  const row = await runToolingProcess(process.execPath, ['--input-type=module', '-e', supervisor], { cwd: dir, logRoot: dir, name: 'outer', signal: controller.signal, timeoutMs: 5000 });
  assert.equal(row.code, 130);
  const pid = Number(fs.readFileSync(pidFile, 'utf8'));
  assert.throws(() => process.kill(pid, 0), /ESRCH/);
});
