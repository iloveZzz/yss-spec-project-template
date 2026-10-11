import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { classifyVariant, digestBytes, loadProfileVariants, lockContentMatches, PROFILE_VARIANTS_REF } from '../scripts/lib/profile-variants.mjs';

function tempRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-profile-variants-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function writeRegistry(root, document) {
  const file = path.join(root, PROFILE_VARIANTS_REF);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof document === 'string' ? document : `${JSON.stringify(document, null, 2)}\n`);
}

const VARIANT_BYTES = Buffer.from('profile copy\n');
const SOURCE_BYTES = Buffer.from('source copy\n');
const entry = (overrides = {}) => ({
  path: 'submodules/p/scripts/lib/x.mjs',
  variant_sha256: digestBytes(VARIANT_BYTES),
  reason: 'Profile 暂不跟随',
  resolves_with: '某次跨仓改动',
  ...overrides,
});

test('登记文件不存在时没有任何有意定制', (t) => {
  assert.equal(loadProfileVariants(tempRoot(t)).size, 0);
});

test('合法登记按目标路径索引', (t) => {
  const root = tempRoot(t);
  writeRegistry(root, { schema_version: 1, variants: [entry(), entry({ path: 'submodules/q/scripts/lib/y.mjs' })] });
  const variants = loadProfileVariants(root);
  assert.deepEqual([...variants.keys()], ['submodules/p/scripts/lib/x.mjs', 'submodules/q/scripts/lib/y.mjs']);
  assert.equal(variants.get('submodules/p/scripts/lib/x.mjs').variant_sha256, digestBytes(VARIANT_BYTES));
});

test('登记格式错误一律拒绝，并指出出错位置', (t) => {
  const root = tempRoot(t);
  const cases = [
    ['不是 JSON', '{not json', /不是有效 JSON/],
    ['版本不对', { schema_version: 2, variants: [] }, /schema_version 必须为 1/],
    ['variants 不是数组', { schema_version: 1, variants: {} }, /variants 必须是数组/],
    ['缺 reason', { schema_version: 1, variants: [entry({ reason: ' ' })] }, /variants\[0\]\.reason/],
    ['缺 resolves_with', { schema_version: 1, variants: [entry({ resolves_with: '' })] }, /variants\[0\]\.resolves_with/],
    ['摘要格式错', { schema_version: 1, variants: [entry({ variant_sha256: 'abc' })] }, /variant_sha256 必须形如/],
    ['路径逃出模板根', { schema_version: 1, variants: [entry({ path: '../outside.mjs' })] }, /相对路径/],
    ['绝对路径', { schema_version: 1, variants: [entry({ path: '/etc/passwd' })] }, /相对路径/],
    ['路径重复', { schema_version: 1, variants: [entry(), entry()] }, /重复登记/],
  ];
  for (const [name, document, pattern] of cases) {
    writeRegistry(root, document);
    assert.throws(() => loadProfileVariants(root), pattern, name);
  }
});

test('副本与登记摘要一致且不同于来源：成立', () => {
  const verdict = classifyVariant(entry(), { actual: VARIANT_BYTES, expected: SOURCE_BYTES });
  assert.equal(verdict.status, 'ok');
});

test('副本已与来源一致：登记过期，必须删除', () => {
  const verdict = classifyVariant(entry(), { actual: SOURCE_BYTES, expected: SOURCE_BYTES });
  assert.equal(verdict.status, 'stale');
  assert.match(verdict.message, /请删除/);
});

test('副本被改动、与登记摘要不符：拒绝，不静默接受新字节', () => {
  const verdict = classifyVariant(entry(), { actual: Buffer.from('someone edited\n'), expected: SOURCE_BYTES });
  assert.equal(verdict.status, 'changed');
  assert.match(verdict.message, new RegExp(digestBytes(VARIANT_BYTES)));
});

test('登记在案但文件不存在：拒绝', () => {
  assert.equal(classifyVariant(entry(), { actual: null, expected: SOURCE_BYTES }).status, 'missing');
});

test('仓库里的登记项都有原因与解除条件，且格式合法', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const variants = loadProfileVariants(root);
  for (const [key, value] of variants) {
    assert.ok(value.reason.length > 0 && value.resolves_with.length > 0, key);
    assert.match(key, /^submodules\/[^/]+\//, `${key} 应指向 Profile 子模块内的文件`);
  }
});

test('锁比较忽略来源修订号与来源状态，只看内容', () => {
  const lock = { schema_version: 1, target_id: 'x', source_revision: 'aaa', source_state: 'working-tree', effective_files: { 'a.mjs': 'sha256:1' } };
  assert.equal(lockContentMatches({ ...lock, source_revision: 'bbb', source_state: 'committed' }, lock), true, '提交一次后修订号变化不是漂移');
  assert.equal(lockContentMatches({ ...lock, effective_files: { 'a.mjs': 'sha256:2' } }, lock), false, '文件摘要变化是漂移');
  assert.equal(lockContentMatches({ ...lock, effective_files: { 'a.mjs': 'sha256:1', 'b.mjs': 'sha256:3' } }, lock), false, '多出文件是漂移');
  assert.equal(lockContentMatches(null, lock), false, '锁不存在或不可解析按漂移处理');
  assert.equal(lockContentMatches('oops', lock), false);
});
