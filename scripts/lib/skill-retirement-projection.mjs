import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseDocument, stringify } from '../vendor/yaml.mjs';
import { readRetirementContract } from './skill-retirement-contract.mjs';

const registryRef = '.template-spec/agents/yss-skill-registry.yaml';
const supplyRef = 'scripts/lib/skill-supply-chain.mjs';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function ordinary(root, ref) {
  let cursor = root;
  if (!lstatSync(cursor).isDirectory()) throw new TypeError(`退役生成根必须为普通目录: ${cursor}`);
  const parts = ref.split('/');
  for (const [index, part] of parts.entries()) {
    cursor = path.join(cursor, part);
    const info = lstatSync(cursor);
    if (!(index === parts.length - 1 ? info.isFile() : info.isDirectory())) throw new TypeError(`退役生成路径必须为普通文件或目录: ${cursor}`);
  }
  return cursor;
}
function source(root, ref) {
  const file = ordinary(root, ref), before = readFileSync(file);
  return { file, before, current() {
    ordinary(root, ref);
    if (!readFileSync(file).equals(before)) throw new TypeError(`退役生成时文件发生变化: ${ref}`);
  } };
}
function registry(bytes) {
  const document = parseDocument(bytes.toString('utf8'), { uniqueKeys: true });
  if (document.errors.length) throw document.errors[0];
  return document.toJS({ maxAliasCount: 0 });
}
function replacement(snapshot, body, comment) {
  const text = snapshot.before.toString('utf8');
  const begin = `${comment} YSS_RETIREMENT_BEGIN`, end = `${comment} YSS_RETIREMENT_END`;
  if (text.split(begin).length !== 2 || text.split(end).length !== 2) throw new TypeError('退役生成标记缺失或重复');
  const start = text.indexOf(begin), newline = text.indexOf('\n', start), finish = text.indexOf(end);
  const oldBody = text.slice(newline + 1, finish), banner = text.slice(start, newline);
  if (finish <= newline || banner !== `${begin} sha256=${digest(oldBody)}`) throw new TypeError('退役生成块包含手工改动，拒绝覆盖');
  return text.slice(0, start) + `${begin} sha256=${digest(body)}\n` + body + text.slice(finish);
}
function apply(changes, snapshots, check) {
  if (check && changes.some(([snapshot, wanted]) => !snapshot.before.equals(Buffer.from(wanted)))) throw new TypeError('退役生成块过期，请先运行同步');
  for (const snapshot of snapshots) snapshot.current();
  if (!check) for (const [snapshot, wanted] of changes) if (!snapshot.before.equals(Buffer.from(wanted))) writeFileSync(snapshot.file, wanted);
}
const literal = ids => `export const OBSOLETE = new Set(${JSON.stringify([...ids].sort())});\n`;

export function syncRetirementProjection({ root, ids, check = false }) {
  const input = source(root, registryRef), data = registry(input.before);
  const current = readRetirementContract(data);
  const target = source(root, supplyRef);
  if (JSON.stringify([...ids].sort()) !== JSON.stringify([...current].sort())) throw new TypeError('退役生成输入与当前 registry 不一致');
  apply([[target, replacement(target, literal(current), '//')]], [input, target], check);
}

export function syncBackendRetirementProjection({ root, check = false }) {
  const input = source(root, registryRef), data = registry(input.before), ids = readRetirementContract(data);
  const target = source(root, `profiles/backend/${registryRef}`), supply = source(root, `profiles/backend/${supplyRef}`);
  const wantedRegistry = replacement(target, stringify({ retirement_contract: data.retirement_contract }), '#');
  readRetirementContract(registry(Buffer.from(wantedRegistry)));
  apply([[target, wantedRegistry], [supply, replacement(supply, literal(ids), '//')]], [input, target, supply], check);
}
