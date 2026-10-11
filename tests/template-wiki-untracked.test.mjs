import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const git = (...args) => spawnSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' });

// llm-wiki 在模板源编译出的阅读视图是派生物：每次提交都会过期，且没有检查发现过期。
// 它只在本机按需生成，不进版本库；这个守卫防止它被重新提交（例如 git add -f）。
test('模板源的编译 wiki 没有被版本库跟踪', () => {
  const tracked = git('ls-files', '--', '.template-source/wiki');
  assert.equal(tracked.status, 0, tracked.stderr);
  assert.equal(tracked.stdout.trim(), '', `不应提交 .template-source/wiki，发现被跟踪的文件:\n${tracked.stdout}`);
});

test('.gitignore 排除了 wiki 的各层产物', () => {
  for (const ref of ['.template-source/wiki/.wiki-manifest.json', '.template-source/wiki/raw/AGENTS.md', '.template-source/wiki/wiki/index.md']) {
    assert.equal(git('check-ignore', '-q', '--', ref).status, 0, `${ref} 应被 .gitignore 排除`);
  }
});
