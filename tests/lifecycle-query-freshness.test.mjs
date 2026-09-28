import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { queryLifecycleContext } from '../scripts/lib/lifecycle-context-query.mjs';
import { ROOT } from '../scripts/lib/lifecycle-registry.mjs';
import { parse } from '../scripts/vendor/yaml.mjs';

const registry = path.join(ROOT, '.template-spec/process/lifecycle-registry.yaml');
const query = { stageId: 'stage.product-design' };
const original = fs.readFileSync;
function mutateRegistry(fn, action) {
  const data = parse(original(registry, 'utf8')); fn(data);
  const bytes = Buffer.from(JSON.stringify(data));
  fs.readFileSync = function(file, options) {
    if (String(file) === registry) return typeof options === 'string' ? bytes.toString(options) : Buffer.from(bytes);
    return original.apply(this, arguments);
  };
  try { return action(); } finally { fs.readFileSync = original; }
}
test('display changes invalidate content binding without changing published semantics', () => {
  const before = queryLifecycleContext(query);
  const after = mutateRegistry(r => { r.evidence.find(x => x.id === 'evidence.prototype-deliverable-verification').public_description += ' 新说明'; }, () => queryLifecycleContext(query));
  assert.equal(before.sources.lifecycle_registry.semantic_sha256, after.sources.lifecycle_registry.semantic_sha256);
  assert.notEqual(before.sources.lifecycle_registry.sha256, after.sources.lifecycle_registry.sha256);
  assert.notEqual(before.context_sha256, after.context_sha256);
  assert.notDeepEqual(before.lifecycle.evidence, after.lifecycle.evidence);
});
test('identical queries bind deterministically, different queries bind independently', () => {
  const result = queryLifecycleContext(query);
  assert.deepEqual(result, queryLifecycleContext(query));
  const { context_sha256, ...content } = result;
  assert.equal(context_sha256, createHash('sha256').update(JSON.stringify(content)).digest('hex'));
  assert.notEqual(context_sha256, queryLifecycleContext({ ...query, include: ['execution_efficiency'] }).context_sha256);
});
test('source changes during a query fail instead of mixing snapshots', () => {
  let reads = 0;
  fs.readFileSync = function(file, options) {
    const result = original.apply(this, arguments);
    if (String(file) === registry && ++reads > 1) return Buffer.concat([Buffer.from(result), Buffer.from('\n# changed')]);
    return result;
  };
  try { assert.throws(() => queryLifecycleContext(query), /VALIDATION_INPUT_CHANGED/); }
  finally { fs.readFileSync = original; }
});
test('an invalid identity fails even without an execution scope marker', () => {
  fs.readFileSync = function(file, options) {
    if (String(file) === path.join(ROOT, 'yss-project.yaml')) return 'schema_version: 999\nrepository_mode: template-source\n';
    return original.apply(this, arguments);
  };
  try { assert.throws(() => queryLifecycleContext(query), /身份或版本无效/); }
  finally { fs.readFileSync = original; }
});
