import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { findRiskyCodexConfigs } from '../scripts/lib/agent-config-safety.mjs';

const SCRIPT = new URL('../scripts/verify-agent-config', import.meta.url).pathname;

function git(cwd, ...args) {
  const result = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}

function repo(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-agent-config-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q');
  return root;
}

function write(root, relative, content) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

const RISKY = 'sandbox_mode = "danger-full-access"\n\napproval_policy = "never"\n';

test('被追踪的高危 Codex 配置同时报告沙箱与审批两项', t => {
  const root = repo(t);
  write(root, '.codex/config.toml', RISKY);
  git(root, 'add', '.codex/config.toml');
  assert.deepEqual(findRiskyCodexConfigs(root).map((item) => [item.key, item.line]), [['sandbox_mode', 1], ['approval_policy', 3]]);
});

test('未被追踪的本机配置不报告，用户可在本地保留自己的偏好', t => {
  const root = repo(t);
  write(root, '.codex/config.toml', RISKY);
  assert.deepEqual(findRiskyCodexConfigs(root), []);
});

test('安全值、注释和单引号写法：安全值与注释不报告，单引号高危值仍报告', t => {
  const root = repo(t);
  write(root, '.codex/config.toml', '# sandbox_mode = "danger-full-access"\nsandbox_mode = "workspace-write"\napproval_policy = "on-request"\n');
  git(root, 'add', '.codex/config.toml');
  assert.deepEqual(findRiskyCodexConfigs(root), []);
  write(root, '.codex/config.toml', "approval_policy = 'never'\n");
  assert.equal(findRiskyCodexConfigs(root).length, 1);
});

test('子模块里被追踪的高危配置同样报告，路径带子模块前缀', t => {
  const root = repo(t);
  const sub = path.join(root, 'submodules/yss-harness-x');
  fs.mkdirSync(sub, { recursive: true });
  git(sub, 'init', '-q');
  write(root, 'submodules/yss-harness-x/.codex/config.toml', RISKY);
  git(sub, 'add', '.codex/config.toml');
  assert.equal(findRiskyCodexConfigs(root)[0].file, 'submodules/yss-harness-x/.codex/config.toml');
});

test('命令行：高危配置退出 1 并给出修复指引，干净仓库退出 0', t => {
  const root = repo(t);
  const clean = spawnSync('node', [SCRIPT, '--root', root], { encoding: 'utf8' });
  assert.equal(clean.status, 0);
  write(root, '.codex/config.toml', RISKY);
  git(root, 'add', '.codex/config.toml');
  const bad = spawnSync('node', [SCRIPT, '--root', root], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /~\/\.codex\/config\.toml/);
});
