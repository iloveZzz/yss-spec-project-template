import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { lookupCache, buildPinned, ensureNativeYss, shellExports } from '../.template-source/scripts/lib/ensure-native-yss.mjs';

const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const COMMIT = 'a'.repeat(40);
const pinFor = (binaryText) => ({ schema_version: 1, repository: 'https://example.invalid/yss-cli.git', version: '9.9.9', commit: COMMIT, go_version: '1.27.1', build: 'fixture', binaries: { 'darwin-arm64': { sha256: sha(binaryText) } } });
const PLATFORM = 'darwin-arm64';

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
function fakeRun({ goVersion = 'go version go1.27.1 darwin/arm64', head = COMMIT, dirty = '', built = 'good-binary', calls = [] } = {}) {
  const run = (command, args, options = {}) => {
    calls.push([command, ...args]);
    if (command === 'go') return { status: 0, stdout: goVersion, stderr: '' };
    if (command === 'git' && args[0] === 'rev-parse') return { status: 0, stdout: head, stderr: '' };
    if (command === 'git' && args[0] === 'status') return { status: 0, stdout: dirty, stderr: '' };
    if (command === 'git' && args[0] === 'checkout') { fs.writeFileSync(path.join(options.cwd, 'go.mod'), 'module x\n\ngo 1.27.1\n'); return { status: 0, stdout: '', stderr: '' }; }
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
  assert.throws(() => ensureNativeYss({ root, cacheRoot: path.join(root, 'c'), run: fakeRun() }), /没有 yss-cli 固定文件/);
  const text = shellExports({ binary: "/a b/it's/yss", sha256: 'f'.repeat(64), source: '/src' });
  assert.match(text, /^export YSS_NATIVE_BINARY='\/a b\/it'\\''s\/yss'$/m);
  assert.match(text, /export YSS_NATIVE_BINARY_SHA256='f{64}'/);
  assert.match(text, /export YSS_NATIVE_SOURCE_ROOT='\/src'/);
});
