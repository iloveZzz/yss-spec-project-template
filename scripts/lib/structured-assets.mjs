import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parseDocument, YAMLMap, YAMLSeq } from '../vendor/yaml.mjs';
import { validateJsonSchema } from './json-schema.mjs';

export const TOOL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const ASSET_KINDS = Object.freeze(['checkpoint', 'domain-strategy', 'stage-decision-package', 'task-package', 'approval-record']);
export const byteDigest = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
export const canonicalValue = value => Array.isArray(value) ? value.map(canonicalValue) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])])) : value;
export const semanticDigest = value => byteDigest(JSON.stringify(canonicalValue(value)));
export const serializeAsset = value => `${JSON.stringify(canonicalValue(value), null, 2)}\n`;
const isMap = node => node instanceof YAMLMap;
const isSeq = node => node instanceof YAMLSeq;
const isScalar = node => node && Object.hasOwn(node, 'value');

export function assetComments(bytes) {
  const doc = parseDocument(String(bytes), { uniqueKeys: true }), result = [];
  function visit(node, location) {
    if (!node || typeof node !== 'object') return;
    for (const key of ['comment', 'commentBefore']) if (node[key]) result.push({ location, text: node[key] });
    if (node.contents) visit(node.contents, '<root>');
    if (isMap(node)) for (const pair of node.items) { visit(pair.key, `${location}.${pair.key?.value}`); visit(pair.value, `${location}.${pair.key?.value}`); }
    if (isSeq(node)) node.items.forEach((item, index) => visit(item, `${location}[${index}]`));
  }
  visit(doc, '<document>'); return result;
}

/** JSON syntax is strict; the YAML AST supplies duplicate-key and lossless-type checks. */
export function parseAsset(bytes, file = 'asset.yaml') {
  const source = Buffer.isBuffer(bytes) ? new TextDecoder('utf-8', { fatal: true }).decode(bytes) : String(bytes);
  if (/\.json$/i.test(file)) JSON.parse(source);
  const doc = parseDocument(source, { uniqueKeys: true, maxAliasCount: 0, intAsBigInt: true });
  if (doc.errors.length || doc.warnings.length) throw new TypeError(`ASSET_PARSE: ${file}: ${(doc.errors[0] || doc.warnings[0]).message}`);
  function visit(node) {
    if (!node) return;
    if (node.anchor || node.tag) throw new TypeError(`ASSET_TYPE: anchors/tags are unsupported: ${file}`);
    if (isMap(node)) for (const pair of node.items) {
      if (!isScalar(pair.key) || typeof pair.key.value !== 'string') throw new TypeError(`ASSET_TYPE: keys must be strings: ${file}`);
      visit(pair.value);
    }
    else if (isSeq(node)) node.items.forEach(visit);
    else if (isScalar(node)) {
      if (typeof node.value === 'bigint') {
        const number = Number(node.value);
        if (!Number.isSafeInteger(number)) throw new TypeError(`ASSET_TYPE: unsafe integer: ${file}`);
        node.value = number;
      }
      if (typeof node.value === 'number' && !Number.isFinite(node.value)) throw new TypeError(`ASSET_TYPE: non-finite number: ${file}`);
      if (typeof node.value === 'number' && Number.isInteger(node.value) && !Number.isSafeInteger(node.value)) throw new TypeError(`ASSET_TYPE: unsafe integer: ${file}`);
    } else throw new TypeError(`ASSET_TYPE: aliases are unsupported: ${file}`);
  }
  visit(doc.contents);
  const value = doc.toJS({ maxAliasCount: 0 });
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`ASSET_TYPE: root must be an object: ${file}`);
  return value;
}

export function assetSchema(kind, value, root = TOOL_ROOT) {
  if (!ASSET_KINDS.includes(kind)) throw new TypeError(`ASSET_KIND: ${kind}`);
  if (['domain-strategy', 'stage-decision-package'].includes(kind)) {
    if (![2, 3].includes(value.schema_version)) throw new TypeError('migration-required: unsupported strategy schema_version');
    const authoring = path.join(root, `.agents/skills/yss-stage-decision/references/${kind}.schema.json`);
    return fs.existsSync(authoring) ? authoring : path.join(root, `.template-spec/process/schemas/${kind}-reading.schema.json`);
  }
  const name = { checkpoint: 'lifecycle-checkpoint', 'task-package': 'digital-human-task-package', 'approval-record': value.kind === 'review-bundle' ? 'review-bundle' : 'approval-record' }[kind];
  return path.join(root, `.template-spec/process/schemas/${name}.schema.json`);
}

export function validateAssetStructure(value, kind, { schemaRoot = TOOL_ROOT } = {}) {
  const schemaPath = assetSchema(kind, value, schemaRoot);
  validateJsonSchema(value, schemaPath, { cwd: schemaRoot });
  return { kind, schema_version: value.schema_version, schema: path.relative(schemaRoot, schemaPath), semantic_digest: semanticDigest(value), execution_authorization: 'not-evaluated' };
}

export function readAsset(file, kind, options = {}) {
  const bytes = fs.readFileSync(file), value = parseAsset(bytes, file);
  validateAssetStructure(value, kind, options);
  return { value, bytes, digest: byteDigest(bytes) };
}
