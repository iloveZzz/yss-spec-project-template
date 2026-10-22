import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { collectMetrics, dailyStartStats, isPipelinePath, parseSkillFrontmatter, pipelineCommitStats, projectionCoverageV2, PIPELINE_STRUCTURAL_BASELINE } from '../scripts/lib/harness-metrics.mjs';

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

function registry(root, value, profile = 'harness.spec-template') {
  const file = path.join(root, '.template-spec/agents/yss-skill-registry.yaml');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const source = `${JSON.stringify({ schema_version: 3, ...value })}\n`;
  fs.writeFileSync(file, source);
  const profileFile = path.join(root, '.template-spec/process/harness-profile.yaml');
  fs.mkdirSync(path.dirname(profileFile), { recursive: true });
  fs.writeFileSync(profileFile, `schema_version: 3\nprofile_id: ${profile}\n`);
  return createHash('sha256').update(source).digest('hex');
}

test('当前投影视图从两处声明去重读取 WorkBuddy，私有及旧平台目录不进入分母', t => {
  const root = project(t);
  skill(root, 'a', 'description: x');
  const sha256 = registry(root, {
    instance_distribution: { projection_roots: { workbuddy: '.workbuddy/skills' } },
    agent_runtime_roots: { workbuddy: '.workbuddy/skills', same: '.workbuddy/skills' },
  });
  fs.mkdirSync(path.join(root, '.workbuddy/skills'), { recursive: true });
  fs.symlinkSync('../../.agents/skills/a', path.join(root, '.workbuddy/skills/a'));
  fs.mkdirSync(path.join(root, '.workbuddy/skills/copy'));
  fs.writeFileSync(path.join(root, '.workbuddy/skills/README.md'), 'local entry');
  fs.mkdirSync(path.join(root, '.private/skills'), { recursive: true });
  fs.mkdirSync(path.join(root, '.codex/skills'), { recursive: true });
  const metrics = collectMetrics(root);
  const view = metrics.projection_coverage_v2;
  assert.ok(view, '新增当前注册视图');
  assert.equal(view.schema_version, 2);
  assert.equal(view.basis, 'current-registered-roots');
  assert.equal(view.profiles.length, 1);
  const [spec] = view.profiles;
  assert.equal(spec.profile, 'harness.spec-template');
  assert.equal(spec.root, '.');
  assert.deepEqual(spec.registry, { path: '.template-spec/agents/yss-skill-registry.yaml', sha256 });
  assert.deepEqual(spec.summary, { declared_roots: 1, present_roots: 1, missing_roots: 0, unavailable_roots: 0, coverage_ratio: 1 });
  assert.equal(spec.roots[0].root, '.workbuddy/skills');
  assert.deepEqual(spec.roots[0].declared_by, ['instance_distribution.projection_roots', 'agent_runtime_roots']);
  assert.deepEqual(spec.roots[0].runtimes, ['same', 'workbuddy']);
  assert.equal(spec.roots[0].status, 'present');
  assert.equal(spec.roots[0].entries, 3);
  assert.equal(spec.roots[0].symlinks, 1);
  assert.equal(spec.roots[0].directories, 1);
  assert.equal(spec.roots[0].regular_files, 1);
  assert.equal(spec.roots[0].other, 0);
  assert.equal(Object.hasOwn(spec.roots[0], 'runtime_only'), false, '不从覆盖层推断运行时独有技能');
  assert.deepEqual(metrics.projection_roots, [{ root: '.codex/skills', entries: 0, symlinks: 0, full_copies: 0, runtime_only: 0 }]);
  assert.equal(isPipelinePath('.workbuddy/skills/a/SKILL.md'), false, '历史路径口径不扩展');
});

test('注册声明不可用时保持 unknown，显式空声明才是已知零根', t => {
  const cases = [
    [{}, 'registry-missing-roots'],
    [{ schema_version: 99, agent_runtime_roots: {} }, 'registry-unsupported-schema'],
    [{ agent_runtime_roots: null }, 'registry-invalid-roots'],
    [{ agent_runtime_roots: [] }, 'registry-invalid-roots'],
    [{ agent_runtime_roots: 'workbuddy' }, 'registry-invalid-roots'],
    [{ instance_distribution: null, agent_runtime_roots: {} }, 'registry-invalid-roots'],
    [{ instance_distribution: { projection_roots: { workbuddy: '.workbuddy/skills' } }, agent_runtime_roots: { workbuddy: '.other/skills' } }, 'registry-conflicting-roots'],
    ...['../outside', '/tmp/outside', 'C:/outside', '.workbuddy\\skills', '.workbuddy//skills', './.workbuddy/skills', '.workbuddy/../skills', '', 'a\nsecret'].map(ref => [{ agent_runtime_roots: { runtime: ref } }, 'registry-invalid-root']),
  ];
  for (const [value, reason] of cases) {
    const root = project(t);
    registry(root, value);
    const [view] = collectMetrics(root).projection_coverage_v2.profiles;
    assert.equal(view.status, 'unavailable', JSON.stringify(value));
    assert.equal(view.reason, reason, JSON.stringify(value));
    assert.equal(view.summary.declared_roots, null, '未知声明不能被记成零根');
    assert.equal(view.summary.coverage_ratio, null);
  }
  const empty = project(t);
  registry(empty, { agent_runtime_roots: {} });
  const [view] = collectMetrics(empty).projection_coverage_v2.profiles;
  assert.equal(view.status, 'available');
  assert.equal(view.summary.declared_roots, 0);
  assert.equal(view.summary.coverage_ratio, null, '没有分母，不声称 100%');
});

test('已声明根的不可读、非目录和逃逸链接均不可统计，不能当作 missing 或空目录', t => {
  const cases = [
    ['permission-denied', (root, directory) => { fs.mkdirSync(directory, { recursive: true }); fs.chmodSync(directory, 0); }, 'EACCES'],
    ['not-directory', (root, directory) => { fs.mkdirSync(path.dirname(directory), { recursive: true }); fs.writeFileSync(directory, 'not a directory'); }, 'root-not-directory'],
    ['outside-root', (root, directory) => { fs.mkdirSync(path.dirname(directory), { recursive: true }); fs.symlinkSync(project(t), directory); }, 'root-outside-project'],
    ['dangling-link', (root, directory) => { fs.mkdirSync(path.dirname(directory), { recursive: true }); fs.symlinkSync('missing', directory); }, 'root-dangling-link'],
  ];
  for (const [name, setup, reason] of cases) {
    if (name === 'permission-denied' && (process.getuid?.() === 0 || process.platform === 'win32')) {
      t.diagnostic('当前身份/平台不能复现 POSIX EACCES，未执行该子场景');
      continue;
    }
    const root = project(t);
    registry(root, { agent_runtime_roots: { workbuddy: '.workbuddy/skills' } });
    const directory = path.join(root, '.workbuddy/skills');
    setup(root, directory);
    let view;
    try { [view] = collectMetrics(root).projection_coverage_v2.profiles; }
    finally { if (name === 'permission-denied') fs.chmodSync(directory, 0o755); }
    assert.equal(view.roots[0].status, 'unavailable', name);
    assert.equal(view.roots[0].exists, true, name);
    assert.equal(view.roots[0].reason, reason, name);
    assert.equal(view.roots[0].entries, null, name);
    assert.equal(view.summary.unavailable_roots, 1, name);
    assert.equal(view.summary.coverage_ratio, null, name);
    assert.equal(view.reason, 'root-unavailable', name);
  }
});

test('Spec 与 Backend 各用自己的声明，missing 根与已存在空目录分别报告', t => {
  const root = project(t);
  registry(root, { instance_distribution: { projection_roots: { claude: '.claude/skills', workbuddy: '.workbuddy/skills' } } });
  fs.mkdirSync(path.join(root, '.workbuddy/skills'), { recursive: true });
  const backend = path.join(root, 'profiles/backend');
  registry(backend, { agent_runtime_roots: { workbuddy: '.workbuddy/skills' } }, 'harness.backend-delivery');
  fs.mkdirSync(path.join(backend, '.workbuddy/skills/only-backend'), { recursive: true });
  const [spec, backendView] = collectMetrics(root).projection_coverage_v2.profiles;
  assert.deepEqual(spec.summary, { declared_roots: 2, present_roots: 1, missing_roots: 1, unavailable_roots: 0, coverage_ratio: 0.5 });
  const missing = spec.roots.find(row => row.root === '.claude/skills');
  assert.equal(missing.status, 'missing');
  assert.equal(missing.exists, false);
  assert.equal(missing.entries, null);
  const empty = spec.roots.find(row => row.root === '.workbuddy/skills');
  assert.equal(empty.status, 'present');
  assert.equal(empty.entries, 0);
  assert.equal(backendView.profile, 'harness.backend-delivery');
  assert.equal(backendView.root, 'profiles/backend');
  assert.equal(backendView.registry.path, 'profiles/backend/.template-spec/agents/yss-skill-registry.yaml');
  assert.equal(backendView.roots.length, 1);
  assert.equal(backendView.roots[0].entries, 1);
  assert.equal(backendView.roots[0].directories, 1);
  assert.equal(backendView.summary.coverage_ratio, 1);
  assert.equal(collectMetrics(backend).projection_coverage_v2.profiles[0].profile, 'harness.backend-delivery', '--root 可直接观察 Backend');
});

test('覆盖层自身越界、悬空或不可观察时保留 unavailable，不能重新建立安全边界', async t => {
  for (const variant of ['outside', 'outside-parent', 'dangling', 'permission', 'not-directory']) {
    await t.test(variant, t => {
      if (variant === 'permission' && (process.getuid?.() === 0 || process.platform === 'win32')) { t.skip('当前身份/平台不能复现 POSIX EACCES'); return; }
      const root = project(t);
      registry(root, { agent_runtime_roots: {} });
      const external = project(t);
      const externalBackend = variant === 'outside-parent' ? path.join(external, 'backend') : external;
      registry(externalBackend, { agent_runtime_roots: { workbuddy: '.workbuddy/skills' } }, 'harness.backend-delivery');
      fs.mkdirSync(path.join(externalBackend, '.workbuddy/skills'), { recursive: true });
      const parent = path.join(root, 'profiles');
      if (variant === 'outside-parent') fs.symlinkSync(external, parent);
      else {
        fs.mkdirSync(parent);
        const backend = path.join(parent, 'backend');
        if (variant === 'outside') fs.symlinkSync(external, backend);
        if (variant === 'dangling') fs.symlinkSync('missing', backend);
        if (variant === 'not-directory') fs.writeFileSync(backend, 'not a directory');
        if (variant === 'permission') { fs.mkdirSync(backend); fs.chmodSync(parent, 0); }
      }
      let view;
      try { view = projectionCoverageV2(root).profiles.find(item => item.root === 'profiles/backend'); }
      finally { if (variant === 'permission') fs.chmodSync(parent, 0o755); }
      assert.ok(view, '保留不可观察的覆盖层记录');
      assert.equal(view.status, 'unavailable');
      assert.equal(view.reason, variant.startsWith('outside') ? 'profile-outside-project' : variant === 'dangling' ? 'profile-dangling-link' : variant === 'not-directory' ? 'profile-not-directory' : 'profile-unavailable');
      assert.equal(view.profile, null, '不从仓外或不可观察目录猜测 Profile');
      assert.equal(view.registry.sha256, null, '不读取仓外注册表');
      assert.equal(view.summary.declared_roots, null);
      assert.equal(view.summary.coverage_ratio, null);
      assert.deepEqual(view.roots, []);
    });
  }
});

test('覆盖层可使用原查询根内的链接，普通缺席子目录不误报为悬空链接', t => {
  const root = project(t);
  registry(root, { agent_runtime_roots: {} });
  const inside = path.join(root, 'inside');
  const backend = path.join(inside, 'backend');
  registry(backend, { agent_runtime_roots: { workbuddy: '.workbuddy/skills' } }, 'harness.backend-delivery');
  fs.mkdirSync(path.join(root, 'shared/skills'), { recursive: true });
  fs.writeFileSync(path.join(root, 'shared/skills/entry'), 'observed');
  fs.mkdirSync(path.join(backend, '.workbuddy'));
  fs.symlinkSync(path.join(root, 'shared/skills'), path.join(backend, '.workbuddy/skills'));
  fs.symlinkSync(inside, path.join(root, 'profiles'));
  const view = projectionCoverageV2(root).profiles.find(item => item.root === 'profiles/backend');
  assert.equal(view.status, 'available');
  assert.equal(view.roots[0].entries, 1, '根仍在原查询工程内，不以 Backend 路径重新建锚');
  fs.rmSync(backend, { recursive: true });
  assert.equal(projectionCoverageV2(root).profiles.length, 1, '内部有效父链接下普通缺席的覆盖层可省略');
});

test('缺少、损坏及不可读注册表均保留 unknown 和原因，不能回退平台列表', t => {
  for (const variant of ['missing', 'malformed', 'duplicate', 'permission']) {
    if (variant === 'permission' && (process.getuid?.() === 0 || process.platform === 'win32')) continue;
    const root = project(t);
    registry(root, { agent_runtime_roots: { workbuddy: '.workbuddy/skills' } });
    const file = path.join(root, '.template-spec/agents/yss-skill-registry.yaml');
    if (variant === 'missing') fs.rmSync(file);
    if (variant === 'malformed') fs.writeFileSync(file, 'agent_runtime_roots: [');
    if (variant === 'duplicate') fs.writeFileSync(file, 'schema_version: 3\nagent_runtime_roots: {}\nagent_runtime_roots: {}\n');
    if (variant === 'permission') fs.chmodSync(file, 0);
    let view;
    try { [view] = collectMetrics(root).projection_coverage_v2.profiles; }
    finally { if (variant === 'permission') fs.chmodSync(file, 0o644); }
    assert.equal(view.status, 'unavailable', variant);
    assert.equal(view.reason, variant === 'missing' ? 'registry-missing' : 'registry-unavailable', variant);
    assert.equal(view.summary.declared_roots, null, variant);
    assert.equal(view.summary.coverage_ratio, null, variant);
    assert.deepEqual(view.roots, [], variant);
  }
});

test('CLI 解释 v2 与历史字段的区别，默认查询不写入测量目录', t => {
  const root = project(t);
  registry(root, { agent_runtime_roots: { workbuddy: '.workbuddy/skills' } });
  fs.mkdirSync(path.join(root, '.workbuddy/skills'), { recursive: true });
  const cli = path.resolve(import.meta.dirname, '../scripts/harness-metrics');
  const help = execFileSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });
  assert.match(help, /projection_coverage_v2/);
  assert.match(help, /projection_roots/);
  assert.match(help, /发现.*调用/);
  const snapshot = directory => fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).map(entry => [entry.name, entry.isDirectory() ? snapshot(path.join(directory, entry.name)) : fs.readFileSync(path.join(directory, entry.name), 'utf8')]);
  const before = snapshot(root);
  const output = JSON.parse(execFileSync(process.execPath, [cli, '--root', root], { encoding: 'utf8' }));
  assert.equal(output.projection_coverage_v2.profiles[0].summary.present_roots, 1);
  assert.deepEqual(snapshot(root), before);
});

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
  assert.equal(metrics.process_docs, 0);
  assert.equal(metrics.process_shards, 0);
  assert.equal(metrics.timings_ms.ci_gate, null);
});

test('流程目录分三种口径：全部文件不变，根层文档与编排分片分别计数', t => {
  const root = project(t);
  const dir = path.join(root, '.template-spec/process');
  fs.mkdirSync(path.join(dir, 'orchestration/entry'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'schemas'));
  for (const file of ['a.md', 'b.md', 'registry.yaml', 'orchestration/entry/x.yaml', 'orchestration/y.yaml', 'schemas/s.json', 'schemas/n.md']) fs.writeFileSync(path.join(dir, file), '1');
  const metrics = collectMetrics(root);
  assert.equal(metrics.process_files, 7);
  assert.equal(metrics.process_docs, 2, '只算根层 .md，不算子目录里的 .md 和根层其他格式');
  assert.equal(metrics.process_shards, 2);
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
  const baseline = collectMetrics(root).pipeline_commits_since_structural_baseline;
  assert.equal(baseline.window.since, PIPELINE_STRUCTURAL_BASELINE);
  assert.equal(baseline.total, 0, '结构基线之前的提交不计入');
});

test('daily 起步累计真实 agent JSON 的 UTF-8 字节，缺输入不宣称达标', t => {
  const root = project(t);
  fs.writeFileSync(path.join(root, 'AGENTS.md'), 'abc');
  assert.equal(dailyStartStats(root).total_bytes, null);
  assert.equal(dailyStartStats(root).within_budget, null);
  fs.writeFileSync(path.join(root, 'CONTEXT.md'), '业务');
  const output = JSON.stringify({view:'agent', route:'daily', rules:['规则不可截断']});
  const stats = dailyStartStats(root, output);
  assert.equal(stats.profile, 'route-agent-v1');
  assert.equal(stats.total_bytes, 3 + Buffer.byteLength('业务') + Buffer.byteLength(output));
  assert.equal(stats.within_budget, true);
  assert.equal(dailyStartStats(root, output.repeat(1000)).within_budget, false);
});

test("上下文预算：超限与无法测量都会报告，未知指标与非法上限视为配置错误", async () => {
  const { checkContextBudget } = await import("../scripts/lib/harness-metrics.mjs");
  const metrics = { resident_context: { total_bytes: 15000 }, skills: { canonical: { claude: { implicit_description_chars: 3900 }, largest_skill_md_bytes: [] } } };
  const budget = { schema_version: 1, limits: { resident_context_bytes: 14000, implicit_description_chars: 4000, largest_skill_md_bytes: 12500 } };
  assert.deepEqual(checkContextBudget(metrics, budget).map((f) => `${f.metric}:${f.actual}`), ["resident_context_bytes:15000", "largest_skill_md_bytes:null"]);
  assert.throws(() => checkContextBudget(metrics, { schema_version: 1, limits: { other: 1 } }), /未知预算指标/);
  assert.throws(() => checkContextBudget(metrics, { schema_version: 1, limits: { resident_context_bytes: 0 } }), /正整数/);
  assert.throws(() => checkContextBudget(metrics, { limits: {} }), /schema_version/);
});

test("上下文预算：当前模板源在预算内", async () => {
  const { checkContextBudget, collectMetrics, CONTEXT_BUDGET_REF } = await import("../scripts/lib/harness-metrics.mjs");
  const root = path.resolve(import.meta.dirname, "..");
  const budget = JSON.parse(fs.readFileSync(path.join(root, CONTEXT_BUDGET_REF), "utf8"));
  assert.deepEqual(checkContextBudget(collectMetrics(root), budget), []);
});
