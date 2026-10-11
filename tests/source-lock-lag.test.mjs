import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { MAX_LAG_COMMITS, SOURCE_LOCK_REF, bundleInputPathspecs, formatReport, measureLag } from '../scripts/lib/source-lock-lag.mjs';

const SCRIPT = new URL('../scripts/verify-source-lock-lag', import.meta.url).pathname;
const MANIFEST = { allowRootEntries: ['scripts'], allowRootFiles: ['README.md'], excludeRootEntries: ['.template-source'], excludePaths: ['scripts/internal-only'] };

function git(cwd, ...args) {
  const result = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function write(root, relative, content) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function commit(root, relative, content = String(Math.random())) {
  write(root, relative, content);
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', `touch ${relative}`);
  return git(root, 'rev-parse', 'HEAD');
}

/** 一个最小模板：根目录自身是 spec，pinned 为锁定提交；返回根目录与锁定提交。 */
function template(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-source-lock-lag-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q');
  write(root, '.template-source/distribution/bundle-profile.json', `${JSON.stringify({ manifest: MANIFEST })}\n`);
  const pinned = commit(root, 'README.md', 'v1');
  write(root, SOURCE_LOCK_REF, `${JSON.stringify({ schemaVersion: 3, profiles: { spec: { profile: 'spec', sourcePath: '.', templateCommit: pinned } } }, null, 2)}\n`);
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'lock');
  return { root, pinned };
}

test('Bundle 输入路径规格：包含允许的根与文件，排除策略明确排除的路径', () => {
  assert.deepEqual(bundleInputPathspecs(MANIFEST), ['scripts', 'README.md', ':(exclude).template-source', ':(exclude)scripts/internal-only']);
  assert.throws(() => bundleInputPathspecs({}), /没有 allowRootEntries/);
});

test('只数触及 Bundle 输入的提交：文档与被排除路径的提交不算', (t) => {
  const { root } = template(t);
  commit(root, 'docs/plan.md');
  commit(root, '.template-source/contracts/x.md');
  commit(root, 'scripts/internal-only/tool.mjs');
  commit(root, 'scripts/real.mjs');
  commit(root, 'README.md');
  const report = measureLag(root);
  assert.equal(report.rows[0].lag, 2);
  assert.ok(report.rows[0].all_commits >= 6, '全部提交数也要如实报告');
  assert.equal(report.ok, true);
});

test('落后恰好等于上限通过，超过上限失败，并给出修复指引', (t) => {
  const { root } = template(t);
  for (let index = 0; index < 3; index += 1) commit(root, `scripts/a${index}.mjs`);
  assert.equal(measureLag(root, { max: 3 }).ok, true);
  const report = measureLag(root, { max: 2 });
  assert.equal(report.ok, false);
  assert.equal(report.rows[0].status, 'stale');
  assert.match(formatReport(report), /tools\/refresh-source-lock\.mjs/);
});

test('默认上限小于上一次出现 Node/Go 分歧时的落后数 7', () => {
  assert.ok(MAX_LAG_COMMITS < 7);
});

test('无法评估时一律失败，不静默通过：缺锁、锁定提交不存在、模板未检出、策略缺失', (t) => {
  const missingLock = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-source-lock-lag-'));
  t.after(() => fs.rmSync(missingLock, { recursive: true, force: true }));
  assert.throws(() => measureLag(missingLock), /缺少 来源锁/);

  const { root } = template(t);
  const bad = JSON.parse(fs.readFileSync(path.join(root, SOURCE_LOCK_REF), 'utf8'));
  bad.profiles.spec.templateCommit = 'a'.repeat(40);
  write(root, SOURCE_LOCK_REF, JSON.stringify(bad));
  assert.throws(() => measureLag(root), /不存在；浅克隆需要完整历史/);

  bad.profiles.spec.templateCommit = 'short';
  write(root, SOURCE_LOCK_REF, JSON.stringify(bad));
  assert.throws(() => measureLag(root), /不是完整提交号/);

  bad.profiles.spec.templateCommit = git(root, 'rev-parse', 'HEAD');
  bad.profiles.design = { profile: 'design', sourcePath: 'submodules/design', templateCommit: bad.profiles.spec.templateCommit };
  write(root, SOURCE_LOCK_REF, JSON.stringify(bad));
  assert.throws(() => measureLag(root), /未检出，无法评估/);

  delete bad.profiles.design;
  write(root, SOURCE_LOCK_REF, JSON.stringify(bad));
  fs.rmSync(path.join(root, '.template-source/distribution/bundle-profile.json'));
  assert.throws(() => measureLag(root), /缺少 spec 的 Bundle 策略/);
});

test('命令行：通过退出 0，落后退出 1 并写 stderr，参数错误退出 1', (t) => {
  const { root } = template(t);
  const ok = spawnSync(process.execPath, [SCRIPT, '--root', root], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /通过 spec/);

  commit(root, 'scripts/a.mjs');
  const stale = spawnSync(process.execPath, [SCRIPT, '--root', root, '--max-lag', '0'], { encoding: 'utf8' });
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /落后 spec/);

  assert.equal(spawnSync(process.execPath, [SCRIPT, '--max-lag', '-1'], { encoding: 'utf8' }).status, 1);
  assert.equal(spawnSync(process.execPath, [SCRIPT, '--nope'], { encoding: 'utf8' }).status, 1);
});
