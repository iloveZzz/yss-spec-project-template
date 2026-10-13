import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectMetrics, dailyStartStats, isPipelinePath, parseSkillFrontmatter, pipelineCommitStats } from '../scripts/lib/harness-metrics.mjs';

function project(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-harness-metrics-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function skill(root, name, frontmatter, extra = {}) {
  const dir = path.join(root, '.agents/skills', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\n${frontmatter}\n---\n\n正文\n`);
  if (extra.openai) {
    fs.mkdirSync(path.join(dir, 'agents'));
    fs.writeFileSync(path.join(dir, 'agents/openai.yaml'), extra.openai);
  }
}

test('description 支持行内、引号和折叠块，且不把引号计入长度', () => {
  assert.equal(parseSkillFrontmatter('---\ndescription: 四个字符\n---\n').description, '四个字符');
  assert.equal(parseSkillFrontmatter('---\ndescription: "四个字符"\n---\n').description, '四个字符');
  assert.equal(parseSkillFrontmatter('---\ndescription: >-\n  第一行\n  第二行\nother: x\n---\n').description, '第一行 第二行');
  assert.equal(parseSkillFrontmatter('---\nname: x\ndisable-model-invocation: true\n---\n').disableModelInvocation, true);
});

test('隐式技能口径：显式技能不计入可隐式触发的 description 字符', t => {
  const root = project(t);
  skill(root, 'free', 'description: 12345');
  skill(root, 'manual', 'description: 1234567890\ndisable-model-invocation: true');
  skill(root, 'codex-off', 'description: 123', { openai: 'policy:\n  allow_implicit_invocation: false\n' });
  const { skills } = collectMetrics(root);
  assert.equal(skills.canonical.skills, 3);
  assert.equal(skills.canonical.description_chars_all, 18);
  assert.deepEqual(skills.canonical.claude, { implicit_skills: 2, implicit_description_chars: 8, explicit_skills: 1 });
  assert.deepEqual(skills.canonical.codex, { implicit_skills: 1, implicit_description_chars: 5, explicit_skills: 2 });
});

test('投影根区分符号链接、完整副本和运行时独有技能', t => {
  const root = project(t);
  skill(root, 'a', 'description: x');
  skill(root, 'b', 'description: y');
  const projection = path.join(root, '.codex/skills');
  fs.mkdirSync(projection, { recursive: true });
  fs.symlinkSync(path.join(root, '.agents/skills/a'), path.join(projection, 'a'));
  fs.cpSync(path.join(root, '.agents/skills/b'), path.join(projection, 'b'), { recursive: true });
  fs.mkdirSync(path.join(projection, 'only-codex'));
  const [codex] = collectMetrics(root).projection_roots;
  assert.deepEqual(codex, { root: '.codex/skills', entries: 3, symlinks: 1, full_copies: 1, runtime_only: 1 });
});

test('缺少文件时输出 null 而不是抛错，常驻上下文只累计存在的文件', t => {
  const root = project(t);
  fs.writeFileSync(path.join(root, 'AGENTS.md'), 'abc');
  const metrics = collectMetrics(root);
  assert.equal(metrics.resident_context.total_bytes, 3);
  assert.equal(metrics.resident_context.files.find((item) => item.path === 'CONTEXT.md').bytes, null);
  assert.equal(metrics.skills.canonical.exists, false);
  assert.equal(metrics.process_files, 0);
  assert.equal(metrics.timings_ms.ci_gate, null);
});

// ---- AR-00：管道提交占比与 daily 起步必读 ----
const GIT_ENV = { GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
function git(root, args, date) {
  const env = { ...process.env, ...GIT_ENV, ...(date ? { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : {}) };
  return execFileSync('git', ['-C', root, '-c', 'commit.gpgsign=false', ...args], { env, encoding: 'utf8' });
}
function repo(t) {
  const root = fs.realpathSync(project(t));
  git(root, ['init', '-q', '-b', 'main']);
  return root;
}
function commit(root, files, date, message = 'c') {
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), text);
  }
  git(root, ['add', '-A']);
  git(root, ['commit', '-q', '-m', message], date);
}

test('管道路径口径与附录 A 一致，且不把普通脚本或同名测试算进去', () => {
  for (const file of ['skills-lock.json', 'submodules/yss-cli', '.template-source/distribution/strategic-handoff-tools.lock.json',
    '.agents/skills/.strategic-design-skills-manifest.json', '.codex/skills/a/SKILL.md', '.cursor/skills/a', '.pi/skills/a', '.claude/skills/a',
    '.template-source/profile-skill-sync.json', 'x/pnpm-lock.yaml', 'submodules/yss-cli/docs/source-lock.json']) {
    assert.equal(isPipelinePath(file), true, file);
  }
  for (const file of ['scripts/lib/source-lock-lag.mjs', 'tests/source-lock-lag.test.mjs', 'scripts/sync-skills', '.agents/skills/a/SKILL.md', 'README.md', 'skills-lock.json.md']) {
    assert.equal(isPipelinePath(file), false, file);
  }
});

test('管道提交占比：只改管道文件才算纯管道提交，混合提交与合并提交分别处理', t => {
  const root = repo(t);
  commit(root, { 'README.md': 'x' }, '2026-09-01T10:00:00Z');
  commit(root, { 'skills-lock.json': '{}' }, '2026-09-02T10:00:00Z');
  commit(root, { 'skills-lock.json': '{"a":1}', 'scripts/x': 'x' }, '2026-09-03T10:00:00Z');
  commit(root, { '.codex/skills/a/SKILL.md': 'x' }, '2026-09-04T10:00:00Z');
  git(root, ['switch', '-q', '-c', 'side']);
  commit(root, { 'docs/a.md': 'x' }, '2026-09-05T10:00:00Z');
  git(root, ['switch', '-q', 'main']);
  git(root, ['merge', '-q', '--no-ff', '-m', 'merge', 'side'], '2026-09-06T10:00:00Z');
  const stats = pipelineCommitStats(root);
  assert.equal(stats.total, 5, '合并提交不计入');
  assert.equal(stats.pipeline_only, 2);
  assert.equal(stats.touching_pipeline, 3);
  assert.equal(stats.pipeline_only_ratio, 0.4);
  assert.equal(stats.window.rev, 'HEAD');
});

test('默认窗口是 HEAD 提交时间往前 30 天，可用 since、until、rev 复现历史口径', t => {
  const root = repo(t);
  commit(root, { 'skills-lock.json': '1' }, '2026-07-01T10:00:00Z');
  commit(root, { 'skills-lock.json': '2' }, '2026-09-10T10:00:00Z');
  commit(root, { 'a.md': '1' }, '2026-10-01T10:00:00Z');
  assert.equal(pipelineCommitStats(root).total, 2, '7 月的提交在 30 天窗口之外');
  const old = pipelineCommitStats(root, { since: '2026-06-01', until: '2026-08-01' });
  assert.equal(old.total, 1);
  assert.equal(old.pipeline_only, 1);
  const back = pipelineCommitStats(root, { rev: 'HEAD~1' });
  assert.equal(back.window.rev, 'HEAD~1');
  assert.equal(back.total, 1, '窗口随 rev 的提交时间移动');
});

test('窗口内没有提交时占比为 null；参数形似选项时拒绝；子目录不读取上层仓库', t => {
  const root = repo(t);
  commit(root, { 'a.md': '1' }, '2026-10-01T10:00:00Z');
  const none = pipelineCommitStats(root, { since: '2026-01-01', until: '2026-01-02' });
  assert.equal(none.total, 0);
  assert.equal(none.pipeline_only_ratio, null);
  assert.throws(() => pipelineCommitStats(root, { rev: '--all' }), /rev/);
  assert.throws(() => pipelineCommitStats(root, { since: '--exec=x' }), /since/);
  const sub = path.join(root, 'sub');
  fs.mkdirSync(sub);
  assert.equal(pipelineCommitStats(sub), null, '子目录不是仓库根，不读取上层仓库的历史');
});

test('collectMetrics 在非 git 目录里 pipeline_commits 为 null，在仓库里带占比', t => {
  const plain = project(t);
  assert.equal(collectMetrics(plain).pipeline_commits, null);
  const root = repo(t);
  commit(root, { 'skills-lock.json': '1' }, '2026-10-01T10:00:00Z');
  assert.equal(collectMetrics(root).pipeline_commits.pipeline_only_ratio, 1);
});

test('daily 起步必读：累计入口文件与编排合同 request_triage 段，缺文件不计入', t => {
  const root = project(t);
  fs.writeFileSync(path.join(root, 'AGENTS.md'), 'abc');
  const references = '.agents/skills/yss-product-lifecycle/references';
  fs.mkdirSync(path.join(root, references), { recursive: true });
  fs.writeFileSync(path.join(root, references, 'daily-delivery.md'), 'ab');
  fs.writeFileSync(path.join(root, references, 'orchestration-contract.yaml'), 'schema_version: 6\n# 注释\nrequest_triage:\n  owner: x\n  delivery_path: y\n\nexecution_efficiency:\n  a: 1\n');
  const stats = dailyStartStats(root);
  const triage = 'request_triage:\n  owner: x\n  delivery_path: y\n\n';
  assert.equal(stats.profile, 'pre-s4');
  assert.equal(stats.files.find((item) => item.path === 'AGENTS.md').bytes, 3);
  assert.equal(stats.files.find((item) => item.path === 'CONTEXT.md').bytes, null);
  assert.deepEqual(stats.sections, [{ path: `${references}/orchestration-contract.yaml`, section: 'request_triage', bytes: Buffer.byteLength(triage) }]);
  assert.equal(stats.total_bytes, 3 + 2 + Buffer.byteLength(triage));
  assert.equal(collectMetrics(root).daily_start.total_bytes, stats.total_bytes);
});

test('合同里没有 request_triage 段时该段为 null 且不计入总数', t => {
  const root = project(t);
  const references = '.agents/skills/yss-product-lifecycle/references';
  fs.mkdirSync(path.join(root, references), { recursive: true });
  fs.writeFileSync(path.join(root, references, 'orchestration-contract.yaml'), 'other:\n  a: 1\n');
  const stats = dailyStartStats(root);
  assert.equal(stats.sections[0].bytes, null);
  assert.equal(stats.total_bytes, 0);
});
