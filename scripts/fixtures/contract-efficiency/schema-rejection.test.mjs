import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateJsonSchemas } from '../../lib/json-schema.mjs';

test('Schema 校验接受合法值并拒绝类型及必填项错误', t => {
  const root = mkdtempSync(path.join(tmpdir(), 'schema-rejection-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const schemaPath = path.join(root, 'schema.json');
  writeFileSync(schemaPath, JSON.stringify({ type: 'object', required: ['name'], properties: { name: { type: 'string' } } }));
  const results = validateJsonSchemas([{ value: { name: '合法' }, schemaPath }, { value: {}, schemaPath }, { value: { name: 1 }, schemaPath }]);
  assert.deepEqual(results.map(result => result.valid), [true, false, false]);
  assert.ok(results[1].error.length > 0);
});
