import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { PIN_FILE, platformKey, readYssCliPin, readNativeYssPin, validateYssCliPin, verifyPinnedBinary } from '../.template-source/scripts/lib/yss-cli-pin.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const good = () => ({
  schema_version: 1,
  repository: 'https://github.com/iloveZzz/yss-cli.git',
  version: '1.3.5',
  commit: 'c'.repeat(40),
  go_version: '1.27.1',
  build: 'CGO_ENABLED=0 go build -trimpath -o yss ./cmd/yss',
  binaries: { 'darwin-arm64': { sha256: SHA_A }, 'linux-amd64': { sha256: SHA_B } },
});

test('平台键把 Node 的平台与架构名换成发行包使用的名字', () => {
  assert.equal(platformKey('darwin', 'arm64'), 'darwin-arm64');
  assert.equal(platformKey('linux', 'x64'), 'linux-amd64');
  assert.equal(platformKey('win32', 'x64'), 'windows-amd64');
});

test('固定文件的结构校验：合法通过，缺项、坏摘要、坏提交、未知平台和多余字段都拒绝', () => {
  assert.doesNotThrow(() => validateYssCliPin(good()));
  const bad = (change, pattern) => { const pin = good(); change(pin); assert.throws(() => validateYssCliPin(pin), pattern); };
  bad((pin) => { pin.schema_version = 2; }, /schema_version/);
  bad((pin) => { pin.commit = 'abc'; }, /commit/);
  bad((pin) => { pin.version = 'v1.3.5'; }, /version/);
  bad((pin) => { pin.go_version = '1.27'; }, /go_version/);
  bad((pin) => { pin.binaries['darwin-arm64'].sha256 = 'zz'; }, /sha256/);
  bad((pin) => { pin.binaries['plan9-386'] = { sha256: SHA_A }; }, /平台/);
  bad((pin) => { pin.binaries = {}; }, /binaries/);
  bad((pin) => { pin.extra = 1; }, /未知字段/);
});

test('二进制摘要与固定文件相符才通过，并报告固定的版本与提交', () => {
  const result = verifyPinnedBinary({ digest: SHA_A, pin: good(), platform: 'darwin-arm64', environment: {} });
  assert.deepEqual(result, { pinned: true, version: '1.3.5', commit: 'c'.repeat(40), platform: 'darwin-arm64' });
});

test('摘要不符、平台没有登记都失败，并写明期望值与实际值', () => {
  assert.throws(() => verifyPinnedBinary({ digest: SHA_B, pin: good(), platform: 'darwin-arm64', environment: {} }), (error) => /与固定版本不符/.test(error.message) && error.message.includes(SHA_A) && error.message.includes(SHA_B));
  assert.throws(() => verifyPinnedBinary({ digest: SHA_A, pin: good(), platform: 'linux-arm64', environment: {} }), /没有登记 linux-arm64/);
});

test('本地联调可以显式覆盖，但结果标记为未固定；CI 里不接受覆盖', () => {
  const local = verifyPinnedBinary({ digest: SHA_B, pin: good(), platform: 'darwin-arm64', environment: { YSS_NATIVE_BINARY_OVERRIDE: '1' } });
  assert.equal(local.pinned, false);
  assert.equal(local.overridden_digest, SHA_B);
  assert.throws(() => verifyPinnedBinary({ digest: SHA_B, pin: good(), platform: 'darwin-arm64', environment: { YSS_NATIVE_BINARY_OVERRIDE: '1', CI: 'true' } }), /CI 不接受覆盖/);
  assert.throws(() => verifyPinnedBinary({ digest: SHA_B, pin: good(), platform: 'darwin-arm64', environment: { YSS_NATIVE_BINARY_OVERRIDE: 'yes' } }), /与固定版本不符/, '只有 1 才算覆盖');
});

test('读取固定文件：缺文件返回 null，坏 JSON 与坏结构抛错', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-pin-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.equal(readYssCliPin(root), null);
  fs.mkdirSync(path.join(root, path.dirname(PIN_FILE)), { recursive: true });
  fs.writeFileSync(path.join(root, PIN_FILE), '{');
  assert.throws(() => readYssCliPin(root), /不是合法 JSON/);
  fs.writeFileSync(path.join(root, PIN_FILE), JSON.stringify({ ...good(), commit: 'x' }));
  assert.throws(() => readYssCliPin(root), /commit/);
  fs.writeFileSync(path.join(root, PIN_FILE), JSON.stringify(good()));
  assert.equal(readYssCliPin(root).version, '1.3.5');
});

test('本批 pin 按 raw bytes 摘要固定；缺批次不能静默使用仓库旧 pin', t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'yss-batch-pin-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, path.dirname(PIN_FILE)), { recursive: true });
  fs.writeFileSync(path.join(root, PIN_FILE), JSON.stringify(good()));
  const file = path.join(root, 'batch.json'), bytes = JSON.stringify({ ...good(), version: '9.9.9' }, null, 2) + '\n';
  fs.writeFileSync(file, bytes);
  const environment = { YSS_NATIVE_PIN_FILE: file, YSS_NATIVE_PIN_SHA256: sha(bytes) };
  assert.equal(readNativeYssPin(root, environment).version, '9.9.9');
  assert.throws(() => readNativeYssPin(root, {}), /先运行.*ensure-native-yss/);
  const withoutPin = path.join(root, 'without-pin'); fs.mkdirSync(withoutPin);
  assert.equal(readNativeYssPin(withoutPin, {}), null, '通用 fixture 没有仓库 pin 时仍返回 null');
  assert.throws(() => readNativeYssPin(root, { YSS_NATIVE_PIN_FILE: file }), /摘要漂移或未固定/);
  fs.appendFileSync(file, ' ');
  assert.throws(() => readNativeYssPin(root, environment), /摘要漂移或未固定/, '语义不变的字节漂移也拒绝，不能回退仓库 pin');
});

test('本批 pin 拒绝相对路径、目录、符号链接、硬链接与超限文件，并继续执行原 schema 校验', t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'yss-batch-pin-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'pin.json'), bytes = JSON.stringify(good());
  fs.writeFileSync(file, bytes);
  const read = (candidate, digest = sha(bytes)) => readNativeYssPin(root, { YSS_NATIVE_PIN_FILE: candidate, YSS_NATIVE_PIN_SHA256: digest });
  assert.throws(() => read('pin.json'), /绝对普通文件/);
  assert.throws(() => read(root), /受限普通文件/);
  const link = path.join(root, 'link.json'); fs.symlinkSync(file, link);
  assert.throws(() => read(link), /受限普通文件/);
  fs.unlinkSync(link); fs.linkSync(file, link);
  assert.throws(() => read(file), /受限普通文件/);
  fs.unlinkSync(link);
  const large = bytes + ' '.repeat(65536); fs.writeFileSync(file, large);
  assert.throws(() => read(file, sha(large)), /受限普通文件/);
  const invalid = JSON.stringify({ ...good(), commit: 'not-a-commit' }); fs.writeFileSync(file, invalid);
  assert.throws(() => read(file, sha(invalid)), /commit/);
});

test('仅回归构建匹配批次摘要仍不声明正式安装资格，摘要不符照常拒绝', () => {
  const pin = { ...good(), build: 'regression-only:source-lock:' + SHA_B };
  assert.deepEqual(verifyPinnedBinary({ digest: SHA_A, pin, platform: 'darwin-arm64', environment: {} }), {
    pinned: true, version: '1.3.5', commit: 'c'.repeat(40), platform: 'darwin-arm64', purpose: 'regression-only', official_installation: false,
  });
  assert.throws(() => verifyPinnedBinary({ digest: SHA_B, pin, platform: 'darwin-arm64', environment: {} }), /与固定版本不符/);
});

test('命令行取值供 shell 脚本使用，字段不存在时失败', () => {
  const lib = path.join(ROOT, '.template-source/scripts/lib/yss-cli-pin.mjs');
  const pin = readYssCliPin(ROOT);
  assert.ok(pin, '仓库必须带 yss-cli 固定文件');
  const run = (...args) => spawnSync(process.execPath, [lib, ...args, '--root', ROOT], { encoding: 'utf8' });
  assert.equal(run('commit').stdout.trim(), pin.commit);
  assert.equal(run('go_version').stdout.trim(), pin.go_version);
  const key = Object.keys(pin.binaries)[0];
  assert.equal(run('sha256', key).stdout.trim(), pin.binaries[key].sha256);
  assert.notEqual(run('nonsense').status, 0);
  assert.notEqual(run('sha256', 'plan9-386').status, 0);
});

test('仓库里的固定文件合法，且每个登记的平台都有摘要', () => {
  const pin = readYssCliPin(ROOT);
  assert.ok(pin);
  assert.ok(Object.keys(pin.binaries).length >= 1);
});
test('当前固定源码构建通过，拒绝旧2.8.1、2.8.0与2.7.6二进制',()=>{
 const pin=readYssCliPin(ROOT);
 const current='49d7af53a03d692977b036585f308fb78527b37b83e403d15c0d70f3594c2ebc';
 for(const retired of ['8ce4662faf64b3cc96aaf5de140fa0aff179eb9f321c9ef8b1422c52e3b0d449','702158ea51987754e55823185b0e929e043f3efd7f922ead68fd5aea0001a551','1f7c7a036563e904c80eee0294e65976f783bd95b810028846b0ecd034650cc7'])assert.throws(()=>verifyPinnedBinary({digest:retired,pin,platform:'darwin-arm64',environment:{}}),/与固定版本不符/);
 assert.deepEqual(verifyPinnedBinary({digest:current,pin,platform:'darwin-arm64',environment:{}}),{pinned:true,version:'2.8.2',commit:'45bd8da20e2cf5ed7a13ba25c47c095ae4b9c0be',platform:'darwin-arm64'});
});
