import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../build.mjs';
import { behavior, legacyMigration } from '../../yss-backend-delivery/tests/behavior.mjs';
import { cancellation } from '../../yss-backend-delivery/tests/cancellation.mjs';
import { sourceUpgrade } from '../../yss-backend-delivery/tests/source-upgrade.mjs';
import { upgradeReview } from '../../yss-backend-delivery/tests/upgrade-review.mjs';

test('设计插件构建也要求固定原生二进制，不取本机全局或旧 CLI', async () => {
  const previous = process.env.YSS_PLUGIN_BINARY; delete process.env.YSS_PLUGIN_BINARY;
  try { await assert.rejects(async () => build({ output: '/private/tmp/yss-design-required-binary' }), /native-binary-required/); }
  finally { if (previous !== undefined) process.env.YSS_PLUGIN_BINARY = previous; }
});
test('设计固定二进制初始化、绑定、升级、回退和冲突保护', () => behavior(build, 'yss-product-design', 'design'));
test('真实旧DesignCLI身份迁移后整体回退保留业务与旧字节', () => legacyMigration(build, 'yss-product-design', 'design'));

test('真实归档 yss-product-design 当前绑定迁移和整体回退保留原字节', () => legacyMigration(build, 'yss-product-design', 'design', true));
test('设计插件真实信号取消后等待原生回滚并允许幂等恢复', () => cancellation(build, 'yss-product-design', 'design'));
test('设计跨原生二进制来源升级保护绑定并整体回退', () => sourceUpgrade(build, 'yss-product-design', 'design'));
test('设计插件审查候选、离线基线与决议重规划', () => upgradeReview(build, 'yss-product-design', 'design'));
