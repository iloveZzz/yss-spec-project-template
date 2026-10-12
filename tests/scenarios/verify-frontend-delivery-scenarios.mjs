// 冻结旧覆盖清单仍按名字登记本入口；前端移交验证已随前端整线移除（AR-12c）。
// 这里只断言移除后的事实，真正的守卫在 tests/frontend-removed.test.mjs。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('前端移交验证入口已移除', () => {
  for (const ref of ['scripts/verify-frontend-delivery', 'scripts/verify-frontend-strategic-preflight', 'scripts/verify-frontend-implementation-evidence', 'scripts/lib/frontend-delivery.mjs', 'profiles/frontend']) {
    assert.equal(fs.existsSync(path.join(root, ref)), false, ref);
  }
});
