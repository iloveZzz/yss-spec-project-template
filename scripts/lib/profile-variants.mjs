import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** 有意定制登记：Profile 里被同步工具管理、但暂时不跟随来源的文件。数据文件，不是新流程概念。 */
export const PROFILE_VARIANTS_REF = '.template-source/distribution/profile-variants.json';

const SHA256 = /^sha256:[a-f0-9]{64}$/;
const fail = (message) => { throw new TypeError(`PROFILE_VARIANTS: ${message}`); };

export function digestBytes(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

/** 读取登记；文件不存在视为没有登记。返回 Map：键是相对模板根的目标路径（如 submodules/<profile>/scripts/lib/x.mjs）。 */
export function loadProfileVariants(root) {
  const file = path.join(root, PROFILE_VARIANTS_REF);
  if (!existsSync(file)) return new Map();
  let document;
  try { document = JSON.parse(readFileSync(file, 'utf8')); } catch (error) { fail(`${PROFILE_VARIANTS_REF} 不是有效 JSON: ${error.message}`); }
  if (document?.schema_version !== 1) fail('schema_version 必须为 1');
  if (!Array.isArray(document.variants)) fail('variants 必须是数组');
  const entries = new Map();
  for (const [index, entry] of document.variants.entries()) {
    const where = `variants[${index}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail(`${where} 必须是对象`);
    for (const key of ['path', 'reason', 'resolves_with']) {
      if (typeof entry[key] !== 'string' || !entry[key].trim()) fail(`${where}.${key} 必须是非空字符串`);
    }
    if (path.isAbsolute(entry.path) || entry.path.split('/').includes('..')) fail(`${where}.path 必须是模板根内的相对路径`);
    if (!SHA256.test(entry.variant_sha256 ?? '')) fail(`${where}.variant_sha256 必须形如 sha256:<64 位十六进制>`);
    if (entries.has(entry.path)) fail(`${where}.path 重复登记: ${entry.path}`);
    entries.set(entry.path, entry);
  }
  return entries;
}

/**
 * 判断一个已登记的有意定制现在是否成立。
 * actual 是 Profile 里的现有字节（不存在为 null），expected 是同步工具按来源本应写入的字节。
 */
export function classifyVariant(entry, { actual, expected }) {
  if (!actual) return { status: 'missing', message: 'Profile 里没有这个文件，登记无从成立' };
  const actualDigest = digestBytes(actual);
  if (actualDigest === digestBytes(expected)) {
    return { status: 'stale', message: `Profile 副本已与来源一致，登记不再需要，请删除（原因：${entry.reason}）` };
  }
  if (actualDigest !== entry.variant_sha256) {
    return { status: 'changed', message: `Profile 副本的摘要 ${actualDigest} 与登记的 ${entry.variant_sha256} 不一致；请还原文件，或在确认后更新 variant_sha256` };
  }
  return { status: 'ok', message: '' };
}

/** 锁里只记录「生成时的来源状态」的字段；它们每提交一次就会变，本身不是漂移信号。漂移只看文件摘要等内容。 */
export const LOCK_PROVENANCE_FIELDS = ['source_revision', 'source_state'];

/** existing 为磁盘上的锁（可能不存在或不可解析），fresh 为按当前来源算出的锁；忽略来源状态字段后内容是否一致。 */
export function lockContentMatches(existing, fresh) {
  if (!existing || typeof existing !== 'object') return false;
  const strip = (lock) => Object.fromEntries(Object.entries(lock).filter(([key]) => !LOCK_PROVENANCE_FIELDS.includes(key)));
  return JSON.stringify(strip(existing)) === JSON.stringify(strip(fresh));
}
