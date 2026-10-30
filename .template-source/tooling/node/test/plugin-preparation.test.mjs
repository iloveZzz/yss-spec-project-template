import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { planPlugin, checkProject } from '../../../plugins/yss-backend-delivery/plan.mjs';

test('旧 Spec 插件准备入口明确退役，指向 Backend 原生构建', () => {
  assert.throws(() => planPlugin(), /legacy-spec-plugin-preparation-unsupported/);
  assert.throws(() => checkProject(), /legacy-spec-plugin-preparation-unsupported/);
  const result = spawnSync(process.execPath, ['.template-source/plugins/yss-backend-delivery/plan.mjs', 'plan', '--source-root', '.'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /legacy-spec-plugin-preparation-unsupported/);
});
