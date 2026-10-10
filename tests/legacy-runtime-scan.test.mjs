import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanLegacyRuntime } from '../.template-source/scripts/lib/legacy-runtime-scan.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCANNER = path.join(ROOT, '.template-source/scripts/lib/legacy-runtime-scan.mjs');
const WORD = ['ru', 'by'].join('');
const SUFFIX = ['.r', 'b'].join('');

function tree(t, files, { git = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-legacy-scan-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  }
  if (git) {
    const run = (...args) => assert.equal(spawnSync('git', ['-C', root, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgsign=false', ...args], { encoding: 'utf8' }).status, 0);
    run('init', '-q');
    run('add', '-A');
    run('commit', '-q', '-m', 'fixture');
  }
  return root;
}

function cli(root, kind, roots, env = process.env) {
  return spawnSync(process.execPath, [SCANNER, kind, ...roots], { cwd: root, encoding: 'utf8', env });
}

test('干净目录：两项扫描都没有匹配，命令行退出 0', (t) => {
  const root = tree(t, { 'scripts/a.mjs': 'export const a = 1;\n', 'scripts/b': '#!/usr/bin/env node\n' });
  assert.deepEqual(scanLegacyRuntime('call', ['scripts'], root), []);
  assert.deepEqual(scanLegacyRuntime('path', ['scripts'], root), []);
  assert.equal(cli(root, 'call', ['scripts']).status, 0);
  assert.equal(cli(root, 'path', ['scripts']).status, 0);
});

test('调用扫描：shebang 与独立单词报告 文件:行号:内容，命令行退出 1', (t) => {
  const root = tree(t, {
    'scripts/run': `#!/usr/bin/env ${WORD}\nputs 1\n`,
    'scripts/lib/call.mjs': `const x = 1;\nspawn("${WORD}", args);\n`,
  });
  assert.deepEqual(scanLegacyRuntime('call', ['scripts'], root), [`scripts/lib/call.mjs:2:spawn("${WORD}", args);`, `scripts/run:1:#!/usr/bin/env ${WORD}`]);
  const result = cli(root, 'call', ['scripts']);
  assert.equal(result.status, 1);
  assert.match(result.stdout, new RegExp(`scripts/lib/call\\.mjs:2:`));
});

test('调用扫描：Markdown、子串、二进制文件与根外文件都不算', (t) => {
  const root = tree(t, {
    'scripts/README.md': `用 ${WORD} 写的旧脚本\n`,
    'scripts/words.mjs': `const a = "sub${WORD}"; const b = "${WORD}ist"; const c = "${WORD}_gem";\n`,
    'outside/uses.mjs': `run("${WORD}")\n`,
  });
  fs.writeFileSync(path.join(root, 'scripts/blob.bin'), Buffer.concat([Buffer.from(`${WORD} `), Buffer.from([0, 1, 2])]));
  // 下划线属于单词字符，所以 ruby_gem 与 subruby、rubyist 一样不是独立单词
  assert.deepEqual(scanLegacyRuntime('call', ['scripts'], root), []);
});

test('路径扫描：只报告旧运行时的源文件后缀', (t) => {
  const root = tree(t, { [`scripts/old${SUFFIX}`]: '', [`scripts/deep/x${SUFFIX}`]: '', [`scripts/keep${SUFFIX}x`]: '', 'scripts/ok.mjs': '' });
  assert.deepEqual(scanLegacyRuntime('path', ['scripts'], root), [`scripts/deep/x${SUFFIX}`, `scripts/old${SUFFIX}`]);
});

test('Git 工作树：忽略的文件不扫描，未跟踪但未忽略的要扫描，已删除的跟踪文件不崩溃', (t) => {
  const root = tree(t, { '.gitignore': 'scripts/generated/\n', 'scripts/tracked.mjs': 'export {};\n', 'scripts/gone.mjs': `${WORD}\n` }, { git: true });
  fs.mkdirSync(path.join(root, 'scripts/generated'), { recursive: true });
  fs.writeFileSync(path.join(root, 'scripts/generated/hidden.mjs'), `${WORD}\n`);
  fs.writeFileSync(path.join(root, 'scripts/untracked.mjs'), `${WORD}\n`);
  fs.rmSync(path.join(root, 'scripts/gone.mjs'));
  assert.deepEqual(scanLegacyRuntime('call', ['scripts'], root), [`scripts/untracked.mjs:1:${WORD}`]);
});

test('不带根参数时扫描当前目录，与 ripgrep 的默认一致', (t) => {
  const root = tree(t, { 'a.mjs': `${WORD}\n`, 'sub/b.mjs': 'ok\n' });
  assert.deepEqual(scanLegacyRuntime('call', [], root), [`a.mjs:1:${WORD}`]);
});

test('PATH 里没有 rg 也没有 git 时照常工作（托管 runner 的真实情形）', (t) => {
  const root = tree(t, { 'scripts/a.mjs': 'export {};\n', [`scripts/x${SUFFIX}`]: '' });
  const env = { PATH: path.dirname(process.execPath), HOME: root };
  assert.equal(spawnSync('rg', ['--version'], { env, encoding: 'utf8' }).error?.code, 'ENOENT', '前提：rg 不可用');
  assert.equal(cli(root, 'call', ['scripts'], env).status, 0);
  const found = cli(root, 'path', ['scripts'], env);
  assert.equal(found.status, 1);
  assert.match(found.stdout, new RegExp(`scripts/x\\${SUFFIX}`));
});

test('非法 kind 退出 2，不当作通过', (t) => {
  const root = tree(t, { 'scripts/a.mjs': '' });
  assert.equal(cli(root, 'nope', ['scripts']).status, 2);
  assert.equal(cli(root, '', ['scripts']).status, 2);
});

test('本仓库的脚本根没有旧运行时残留（候选与发布验证的真实输入）', () => {
  const roots = ['scripts', '.template-source/scripts'];
  assert.deepEqual(scanLegacyRuntime('call', roots, ROOT), []);
  assert.deepEqual(scanLegacyRuntime('path', roots, ROOT), []);
});
