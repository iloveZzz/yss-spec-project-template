import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { lookupCache, buildPinned, ensureNativeYss, shellExports } from '../.template-source/scripts/lib/ensure-native-yss.mjs';
import { PIN_FILE } from '../.template-source/scripts/lib/yss-cli-pin.mjs';

const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const COMMIT = 'a'.repeat(40);
const pinFor = (binaryText) => ({ schema_version: 1, repository: 'https://example.invalid/yss-cli.git', version: '9.9.9', commit: COMMIT, go_version: '1.27.1', build: 'fixture', binaries: { 'darwin-arm64': { sha256: sha(binaryText) } } });
const PLATFORM = 'darwin-arm64';
const SOURCE_LOCK = JSON.stringify({ schemaVersion: 5, fixture: 'published-source-lock' }) + '\n';
const releaseFor = (binaries = { [PLATFORM]: { sha256: sha('good-binary') } }) => ({ version: '9.9.9', commit: COMMIT, sourceLockSha256: sha(SOURCE_LOCK), binaries });

function sandbox(t) {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ensure-yss-')));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  return base;
}
function seedCache(cacheRoot, binaryText) {
  const dir = path.join(cacheRoot, COMMIT);
  fs.mkdirSync(path.join(dir, 'source'), { recursive: true }); fs.mkdirSync(path.join(dir, 'build'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'build/yss'), binaryText);
}
/** 替身 run：git 命令按脚本回答，构建命令写出指定的二进制。 */
function fakeRun({ goVersion = 'go version go1.27.1 darwin/arm64', head = COMMIT, dirty = '', built = 'good-binary', calls = [], sourceLock = SOURCE_LOCK, release = releaseFor(), resolution } = {}) {
  const run = (command, args, options = {}) => {
    calls.push([command, ...args]);
    if (command === 'python3') return resolution ?? { status: 0, stdout: JSON.stringify({ status: 'ok', result: release }), stderr: '' };
    if (command === 'go') return { status: 0, stdout: goVersion, stderr: '' };
    if (command === 'git' && args[0] === 'rev-parse') return { status: 0, stdout: head, stderr: '' };
    if (command === 'git' && args[0] === 'status') return { status: 0, stdout: dirty, stderr: '' };
    if (command === 'git' && args[0] === 'checkout') {
      fs.writeFileSync(path.join(options.cwd, 'go.mod'), 'module x\n\ngo 1.27.1\n');
      fs.mkdirSync(path.join(options.cwd, 'docs'), { recursive: true });
      fs.writeFileSync(path.join(options.cwd, 'docs/source-lock.json'), sourceLock);
      return { status: 0, stdout: '', stderr: '' };
    }
    if (command === 'node') { const out = args[args.indexOf('--out') + 1]; fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'yss'), built); return { status: 0, stdout: '', stderr: '' }; }
    return { status: 0, stdout: '', stderr: '' };
  };
  return run;
}

test('缓存命中：摘要等于固定值、源码目录干净且提交等于固定提交时直接复用，不执行任何构建', t => {
  const cacheRoot = sandbox(t); seedCache(cacheRoot, 'good-binary');
  const calls = []; const hit = lookupCache({ cacheRoot, pin: pinFor('good-binary'), platform: PLATFORM, run: fakeRun({ calls }) });
  assert.equal(hit.cached, true);
  assert.equal(hit.binary, path.join(cacheRoot, COMMIT, 'build/yss'));
  assert.ok(calls.every(([command, sub]) => command === 'git' && ['rev-parse', 'status'].includes(sub)), '命中只做只读核对');
});

test('缓存失效：二进制被改、源码脏、提交漂移、平台未登记都不得命中', t => {
  const cacheRoot = sandbox(t); seedCache(cacheRoot, 'tampered');
  assert.equal(lookupCache({ cacheRoot, pin: pinFor('good-binary'), platform: PLATFORM, run: fakeRun() }), null, '二进制摘要不符');
  seedCache(cacheRoot, 'good-binary');
  assert.equal(lookupCache({ cacheRoot, pin: pinFor('good-binary'), platform: PLATFORM, run: fakeRun({ dirty: ' M x' }) }), null, '源码脏');
  assert.equal(lookupCache({ cacheRoot, pin: pinFor('good-binary'), platform: PLATFORM, run: fakeRun({ head: 'b'.repeat(40) }) }), null, '提交漂移');
  assert.equal(lookupCache({ cacheRoot, pin: pinFor('good-binary'), platform: 'linux-amd64', run: fakeRun() }), null, '平台未登记');
});

test('构建：Go 版本必须等于固定值；摘要不符拒绝并清理缓存；成功返回新构建结果', t => {
  const cacheRoot = sandbox(t);
  assert.throws(() => buildPinned({ cacheRoot, pin: pinFor('good-binary'), platform: PLATFORM, run: fakeRun({ goVersion: 'go version go1.26.0 darwin/arm64' }) }), /要求 go1\.27\.1/);
  assert.throws(() => buildPinned({ cacheRoot, pin: pinFor('good-binary'), platform: PLATFORM, run: fakeRun({ built: 'other-binary' }) }), /与固定文件摘要不符/);
  assert.equal(fs.existsSync(path.join(cacheRoot, COMMIT)), false, '摘要不符不留下缓存');
  assert.throws(() => buildPinned({ cacheRoot, pin: pinFor('good-binary'), platform: PLATFORM, run: fakeRun({ head: 'c'.repeat(40) }) }), /不一致/);
  const built = buildPinned({ cacheRoot, pin: pinFor('good-binary'), platform: PLATFORM, run: fakeRun() });
  assert.equal(built.cached, false);
  assert.equal(built.sha256, sha('good-binary'));
});

test('ensureNativeYss：无固定文件拒绝；导出的变量被安全引用', t => {
  const root = sandbox(t);
  assert.throws(() => ensureNativeYss({ root, cacheRoot: path.join(root, 'c'), pinned: true, run: fakeRun() }), /没有 yss-cli 固定文件/);
  const text = shellExports({ binary: "/a b/it's/yss", sha256: 'f'.repeat(64), source: '/src', pinFile: "/a b/it's/pin.json", pinSha256: 'e'.repeat(64) });
  assert.match(text, /^export YSS_NATIVE_BINARY='\/a b\/it'\\''s\/yss'$/m);
  assert.match(text, /export YSS_NATIVE_BINARY_SHA256='f{64}'/);
  assert.match(text, /export YSS_NATIVE_SOURCE_ROOT='\/src'/);
  assert.match(text, /^export YSS_NATIVE_PIN_FILE='\/a b\/it'\\''s\/pin.json'$/m);
  assert.match(text, /export YSS_NATIVE_PIN_SHA256='e{64}'/);
});

test('默认每批只解析一次 latest，固定提交与来源锁构建并导出本批 pin；缓存命中仍解析但不重建', t => {
  const root = sandbox(t), cacheRoot = path.join(root, 'cache'), calls = [];
  const result = ensureNativeYss({ root, cacheRoot, platform: PLATFORM, run: fakeRun({ calls }) });
  assert.equal(result.version, '9.9.9');
  assert.equal(result.cached, false);
  assert.deepEqual(calls.filter(([command]) => command === 'python3'), [['python3', path.join(root, '.template-source/scripts/lib/resolve-yss-release.py')]]);
  assert.ok(calls.some(([command, ...args]) => command === 'git' && args.includes('fetch') && args.at(-1) === COMMIT));
  assert.equal(result.pinFile, path.join(cacheRoot, COMMIT, `regression-pin-${PLATFORM}.json`));
  const pinBytes = fs.readFileSync(result.pinFile), pin = JSON.parse(pinBytes);
  assert.equal(result.pinSha256, sha(pinBytes));
  assert.equal(pin.commit, COMMIT);
  assert.equal(pin.go_version, '1.27.1');
  assert.equal(pin.binaries[PLATFORM].sha256, sha('good-binary'));
  assert.ok(!pin.build.startsWith('regression-only:'));
  const cachedCalls = [];
  const cached = ensureNativeYss({ root, cacheRoot, platform: PLATFORM, run: fakeRun({ calls: cachedCalls }) });
  assert.equal(cached.cached, true);
  assert.equal(cached.pinSha256, result.pinSha256);
  assert.equal(cachedCalls.filter(([command]) => command === 'python3').length, 1);
  assert.ok(cachedCalls.every(([command, sub]) => command === 'python3' || (command === 'git' && ['rev-parse', 'status'].includes(sub))));
});

test('指定版本只交给官方解析器一次，解析结果必须仍是指定版本', t => {
  const root = sandbox(t), calls = [];
  ensureNativeYss({ root, cacheRoot: path.join(root, 'cache'), platform: PLATFORM, version: 'v9.9.9', run: fakeRun({ calls }) });
  assert.deepEqual(calls.filter(([command]) => command === 'python3'), [['python3', path.join(root, '.template-source/scripts/lib/resolve-yss-release.py'), 'v9.9.9']]);
  assert.throws(() => ensureNativeYss({ root, cacheRoot: path.join(root, 'mismatch'), platform: PLATFORM, version: '9.9.8', run: fakeRun() }), /Release 固定来源/);
});

test('显式 pin 文件与仓库 pinned 可离线复用缓存，均不查询 latest', t => {
  const root = sandbox(t), cacheRoot = path.join(root, 'cache'), external = path.join(root, 'external-pin.json');
  const bytes = JSON.stringify(pinFor('good-binary')) + '\n';
  fs.mkdirSync(path.join(root, path.dirname(PIN_FILE)), { recursive: true });
  fs.writeFileSync(path.join(root, PIN_FILE), bytes);
  fs.writeFileSync(external, bytes);
  seedCache(cacheRoot, 'good-binary');
  for (const options of [{ pinned: true }, { pinFile: external }]) {
    const calls = [];
    const result = ensureNativeYss({ root, cacheRoot, platform: PLATFORM, ...options, run: fakeRun({ calls, resolution: { status: 1, stdout: '', stderr: 'offline' } }) });
    assert.equal(result.cached, true);
    assert.equal(result.pinFile, options.pinFile ?? path.join(root, PIN_FILE));
    assert.equal(result.pinSha256, sha(bytes));
    assert.equal(calls.some(([command]) => command === 'python3'), false);
  }
});

test('显式 pin-file 缓存缺失或漂移时拒绝，保留 pin、二进制和源码原字节', t => {
  const root = sandbox(t);
  for (const invalid of ['missing-binary', 'digest', 'dirty-source']) {
    const cacheRoot = path.join(root, invalid), source = path.join(cacheRoot, COMMIT, 'source');
    seedCache(cacheRoot, 'good-binary');
    const file = path.join(cacheRoot, COMMIT, `regression-pin-${PLATFORM}.json`), bytes = JSON.stringify(pinFor('good-binary')) + '\n';
    fs.writeFileSync(file, bytes);
    const binary = path.join(cacheRoot, COMMIT, 'build/yss'), userFile = path.join(source, 'local-work');
    fs.writeFileSync(userFile, 'preserve this work');
    if (invalid === 'missing-binary') fs.unlinkSync(binary);
    if (invalid === 'digest') fs.writeFileSync(binary, 'changed binary');
    const before = fs.existsSync(binary) ? fs.readFileSync(binary) : null, calls = [];
    assert.throws(() => ensureNativeYss({ root, cacheRoot, pinFile: file, platform: PLATFORM,
      run: fakeRun({ calls, dirty: invalid === 'dirty-source' ? ' M local-work' : '' }) }), /缓存.*保留现场/, invalid);
    assert.equal(fs.readFileSync(file, 'utf8'), bytes, invalid);
    assert.equal(fs.readFileSync(userFile, 'utf8'), 'preserve this work', invalid);
    assert.deepEqual(fs.existsSync(binary) ? fs.readFileSync(binary) : null, before, invalid);
    assert.ok(calls.every(([command, sub]) => command === 'git' && ['rev-parse', 'status'].includes(sub)), invalid);
  }
});

test('官方网络或响应未知时拒绝，已有仓库 pin 与缓存也不能静默回退', t => {
  const root = sandbox(t), cacheRoot = path.join(root, 'cache');
  fs.mkdirSync(path.join(root, path.dirname(PIN_FILE)), { recursive: true });
  fs.writeFileSync(path.join(root, PIN_FILE), JSON.stringify(pinFor('good-binary')));
  seedCache(cacheRoot, 'good-binary');
  for (const resolution of [{ status: 1, stdout: '', stderr: 'network unavailable' }, { status: 0, stdout: '<html>proxy error</html>', stderr: '' }, { status: 0, stdout: '{"status":"ok","result":{}}', stderr: '' }]) {
    const calls = [];
    assert.throws(() => ensureNativeYss({ root, cacheRoot, platform: PLATFORM, run: fakeRun({ calls, resolution }) }), /Release/);
    assert.deepEqual(calls.map(([command]) => command), ['python3']);
  }
  assert.equal(fs.readFileSync(path.join(cacheRoot, COMMIT, 'build/yss'), 'utf8'), 'good-binary');
});

test('来源锁首次不符或缓存中漂移均拒绝，且不执行构建', t => {
  const root = sandbox(t), cacheRoot = path.join(root, 'cache'), calls = [];
  assert.throws(() => ensureNativeYss({ root, cacheRoot: path.join(root, 'bad'), platform: PLATFORM, run: fakeRun({ calls, sourceLock: 'tampered' }) }), /来源锁摘要不符/);
  assert.equal(calls.some(([command]) => ['go', 'node'].includes(command)), false);
  const result = ensureNativeYss({ root, cacheRoot, platform: PLATFORM, run: fakeRun() });
  fs.writeFileSync(path.join(result.source, 'docs/source-lock.json'), 'tampered');
  const cachedCalls = [];
  assert.throws(() => ensureNativeYss({ root, cacheRoot, platform: PLATFORM, run: fakeRun({ calls: cachedCalls }) }), /来源锁摘要不符/);
  assert.equal(cachedCalls.some(([command]) => ['go', 'node'].includes(command)), false);
});

test('来源锁摘要匹配仍拒绝未知 schema，不开始构建', t => {
  const root = sandbox(t), calls = [], sourceLock = JSON.stringify({ schemaVersion: 6 });
  const release = { ...releaseFor(), sourceLockSha256: sha(sourceLock) };
  assert.throws(() => ensureNativeYss({ root, cacheRoot: path.join(root, 'cache'), platform: PLATFORM, run: fakeRun({ calls, sourceLock, release }) }), /来源锁合同不支持/);
  assert.equal(calls.some(([command]) => ['go', 'node'].includes(command)), false);
});

test('缓存 commit、source、build 或 pin 链接在 git 与写入前拒绝，不在外部目录创建 source', t => {
  const root = sandbox(t);
  for (const node of ['commit', 'source', 'build', 'pin', 'pin-hardlink']) {
    const cacheRoot = path.join(root, node, 'cache'), outside = path.join(root, node, 'outside'), calls = [];
    fs.mkdirSync(cacheRoot, { recursive: true }); fs.mkdirSync(outside);
    const dir = path.join(cacheRoot, COMMIT);
    if (node === 'commit') fs.symlinkSync(outside, dir);
    else {
      fs.mkdirSync(dir);
      if (node === 'source' || node === 'build') fs.symlinkSync(outside, path.join(dir, node));
      else {
        const target = path.join(outside, 'pin.json'), link = path.join(dir, `regression-pin-${PLATFORM}.json`);
        fs.writeFileSync(target, JSON.stringify(pinFor('good-binary')));
        if (node === 'pin') fs.symlinkSync(target, link); else fs.linkSync(target, link);
      }
    }
    assert.throws(() => ensureNativeYss({ root, cacheRoot, platform: PLATFORM, run: fakeRun({ calls }) }), /链接或非法节点/, node);
    assert.deepEqual(calls.map(([command]) => command), ['python3'], `${node} 不得开始 git 或构建`);
    assert.equal(fs.existsSync(path.join(outside, 'source')), false, `${node} 不得在缓存边界外写入`);
    if (node === 'pin' || node === 'pin-hardlink') assert.deepEqual(JSON.parse(fs.readFileSync(path.join(outside, 'pin.json'))), pinFor('good-binary'));
  }
});

test('官方平台摘要不匹配不产生可用 pin；缺少该平台 proof 才固定实际构建摘要并标记仅回归', t => {
  const root = sandbox(t), cacheRoot = path.join(root, 'qualified');
  assert.throws(() => ensureNativeYss({ root, cacheRoot, platform: PLATFORM, run: fakeRun({ built: 'different-binary' }) }), /与固定文件摘要不符/);
  assert.equal(fs.existsSync(path.join(cacheRoot, COMMIT, `regression-pin-${PLATFORM}.json`)), false);
  const result = ensureNativeYss({ root, cacheRoot: path.join(root, 'regression'), platform: 'linux-amd64', run: fakeRun({ built: 'linux-binary' }) });
  const pin = JSON.parse(fs.readFileSync(result.pinFile));
  assert.match(pin.build, /^regression-only:/);
  assert.equal(pin.binaries['linux-amd64'].sha256, sha('linux-binary'));
  assert.equal(result.sha256, sha('linux-binary'));
  assert.equal(pin.binaries[PLATFORM].sha256, sha('good-binary'), '保留正式平台 proof');
});
