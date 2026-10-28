import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runNative, initializeNative } from '../.template-source/scripts/lib/native-yss.mjs';

test('治理验证初始化按 Bundle 代际选择安装方式，兼容旧 CLI', t => {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'yss-native-init-contract-')));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const binary = path.join(base, 'transport-fixture');
  fs.writeFileSync(binary, 'native transport fixture');
  for (const schemaVersion of [2, 3, 4, 5]) {
    for (const full of [false, true]) {
      const calls = [];
      const run = (_binary, args) => {
        calls.push(args);
        return { status: 0, stdout: JSON.stringify({ outputVersion: 1, protocolVersion: 1, command: args[0], status: 'ok', code: 'OK', result: { schemaVersion } }) };
      };
      initializeNative('spec', path.join(base, `spec-${schemaVersion}-${full}`), { environment: { YSS_NATIVE_BINARY: binary }, run, full });
      const initializations = calls.filter(args => args[0] === 'init');
      assert.equal(initializations.length, 2);
      const plan = initializations.find(args => args.includes('--plan'));
      assert.equal(plan.includes('--full'), full);
      if (schemaVersion === 5) {
        assert.equal(plan[plan.indexOf('--installation') + 1], 'governed', '新版 CLI 必须显式初始化治理实例');
      } else {
        assert.equal(plan.includes('--installation'), false, '旧 CLI 不得收到新参数');
      }
      assert.equal(initializations.find(args => args.includes('--apply')).includes('--installation'), false, '应用阶段复用已保存计划');
    }
  }
});

// 固定二进制在当前平台上的端到端冒烟：初始化 → 只读查询 → 回退 → 重复回退幂等。
// CI 在 ubuntu 上按 yss-cli-pin.json 原生构建二进制，因此这条测试同时给出 Linux 原生运行证据。
test('原生 yss：初始化 spec 实例、只读查询、整体回退且重复回退幂等', t => {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'yss-native-smoke-')));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const target = path.join(base, 'project');
  initializeNative('spec', target);
  assert.ok(fs.existsSync(path.join(target, 'yss-project.yaml')), '初始化应写入仓库身份');

  const before = fs.readFileSync(path.join(target, 'yss-project.yaml'), 'utf8');
  const stage = runNative(['lifecycle', 'query', '--root', target, '--id', 'stage.plan', '--view', 'agent']);
  assert.equal(stage.status, 'ok');
  assert.equal(fs.readFileSync(path.join(target, 'yss-project.yaml'), 'utf8'), before, '只读查询不改文件');

  const inspected = runNative(['rollback', '--root', target]).result;
  assert.equal(inspected.transactions.at(-1).kind, 'init');
  assert.ok(fs.existsSync(path.join(target, 'yss-project.yaml')), '不带 --apply 的 rollback 只读');

  assert.equal(runNative(['rollback', '--root', target, '--apply']).result.status, 'rolled-back');
  assert.ok(!fs.existsSync(path.join(target, 'yss-project.yaml')), '回退应移除初始化写入的文件');
  assert.equal(runNative(['rollback', '--root', target, '--apply']).result.status, 'unchanged', '重复回退保持幂等');
});
