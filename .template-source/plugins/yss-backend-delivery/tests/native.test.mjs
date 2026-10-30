import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../build.mjs';
import { behavior } from './behavior.mjs';
import { cancellation } from './cancellation.mjs';
import { sourceUpgrade } from './source-upgrade.mjs';
import { upgradeReview } from './upgrade-review.mjs';

test('构建必须显式提供固定原生二进制，不能静默使用旧 Node CLI', async () => {
  const previous = process.env.YSS_PLUGIN_BINARY; delete process.env.YSS_PLUGIN_BINARY;
  try { await assert.rejects(async () => build({ output: '/private/tmp/yss-backend-required-binary' }), /native-binary-required/); }
  finally { if (previous !== undefined) process.env.YSS_PLUGIN_BINARY = previous; }
});
test('后端固定二进制初始化、绑定、升级、回退和冲突保护', () => behavior(build, 'yss-backend-delivery', 'backend'));


test('后端插件真实信号取消后等待原生回滚并允许幂等恢复', () => cancellation(build, 'yss-backend-delivery', 'backend'));
test('后端跨原生二进制来源升级保护绑定并整体回退', () => sourceUpgrade(build, 'yss-backend-delivery', 'backend'));
test('后端插件审查候选、离线基线与决议重规划', () => upgradeReview(build, 'yss-backend-delivery', 'backend'));
