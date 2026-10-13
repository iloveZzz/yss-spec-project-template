import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { BUNDLE_PROFILE_REF, PROFILE_NEEDS, evaluateAll, evaluateProfile, formatReport, shipped } from '../scripts/lib/profile-distribution.mjs';

const SCRIPT = new URL('../scripts/verify-profile-distribution', import.meta.url).pathname;
const NEED = Object.keys(PROFILE_NEEDS)[0];
const NEED_BY = PROFILE_NEEDS[NEED].by;

function git(cwd, ...args) {
  const result = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}

function write(root, relative, content) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

const manifest = (overrides = {}) => ({
  allowRootEntries: ['.agents', 'scripts'],
  allowRootFiles: ['README.md'],
  excludeRootEntries: ['.template-source', 'tests'],
  excludePaths: [],
  ...overrides,
});

const GOOD_PROFILE = manifest({ excludePaths: ['scripts/verify-template', 'scripts/fixtures'], excludePathSuffixes: ['tests', 'test'] });
const FILES = ['scripts/verify-template', 'scripts/verify-lifecycle-registry', 'scripts/fixtures/a.json', '.agents/skills/x/SKILL.md', '.agents/skills/x/tests/a.test.mjs', NEED, NEED_BY];

/** 根仓（内核 + 三个 Profile 覆盖层）的最小仓库；tweak 里的函数可改每个 Profile 的策略与覆盖文件。 */
function workspace(t, tweak = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-profile-distribution-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q');
  write(root, BUNDLE_PROFILE_REF, `${JSON.stringify({ manifest: manifest({ excludePaths: ['scripts/verify-template', 'scripts/fixtures', NEED] }) })}\n`);
  for (const file of FILES) write(root, file, file === NEED_BY ? `run("node", ["${NEED}", "--check"]);\n` : 'x\n');
  for (const profile of ['backend', 'design']) {
    const options = { policy: GOOD_PROFILE, files: [], referenceNeed: true, ...(tweak[profile] ?? {}) };
    write(root, `profiles/${profile}/${BUNDLE_PROFILE_REF}`, `${JSON.stringify({ manifest: options.policy })}\n`);
    for (const file of options.files) write(root, `profiles/${profile}/${file}`, 'x\n');
    if (!options.referenceNeed) write(root, `profiles/${profile}/${NEED_BY}`, 'x\n');
  }
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'fixture');
  return root;
}

test('shipped：镜像 includedByManifest 的判定（允许、排除根、排除路径、后缀、allowFiles 优先）', () => {
  const m = manifest({ excludePaths: ['scripts/fixtures'], excludePathSuffixes: ['tests', 'test'], allowFiles: ['.template-source/adr/README.md'] });
  const cases = [
    ['scripts/verify-x', true],
    ['scripts/fixtures/a.json', false],
    ['scripts/fixtures', false],
    ['scripts/fixturesX/a.json', true],
    ['README.md', true],
    ['OTHER.md', false],
    ['docs/x.md', false],
    ['.template-source/x', false],
    ['.template-source/adr/README.md', true],
    ['tests/a.mjs', false],
    ['.agents/skills/x/tests/a.test.mjs', false],
    ['.agents/skills/x/test/a.mjs', false],
    ['.agents/skills/x/SKILL.md', true],
    ['.agents/skills/latest/SKILL.md', false],
  ];
  for (const [ref, expected] of cases) assert.equal(shipped(ref, m), expected, ref);
});

test('合规：Profile 排除了根仓的仅模板源脚本，测试目录被后缀规则排除', (t) => {
  const result = evaluateAll(workspace(t));
  assert.equal(result.ok, true, formatReport(result));
  assert.match(formatReport(result), /通过 backend/);
});

test('违规：根仓声明为仅模板源的脚本在 Profile 里仍然分发', (t) => {
  const root = workspace(t, { design: { policy: manifest({ excludePaths: ['scripts/fixtures'], excludePathSuffixes: ['tests', 'test'] }) } });
  const result = evaluateAll(root);
  assert.equal(result.ok, false);
  const design = result.reports.find((report) => report.profile === 'design');
  assert.deepEqual(design.findings.map((finding) => finding.path), ['scripts/verify-template']);
  assert.match(formatReport(result), /违规 design: .*scripts\/verify-template/);
  assert.ok(result.reports.filter((report) => report.profile !== 'design').every((report) => !report.findings.length), '别的 Profile 不受牵连');
});

test('例外：实例确实需要的脚本被登记在 PROFILE_NEEDS 里就不算违规，但依赖消失后例外自己过期', (t) => {
  const withNeed = evaluateProfile({ root: workspace(t), profile: 'backend', rootManifest: JSON.parse(fs.readFileSync(path.join(workspace(t), BUNDLE_PROFILE_REF), 'utf8')).manifest });
  assert.deepEqual(withNeed.findings, [], `${NEED} 被 ${NEED_BY} 调用，不应报违规`);
  assert.deepEqual(withNeed.staleNeeds, []);

  const root = workspace(t, { backend: { referenceNeed: false } });
  const result = evaluateAll(root);
  assert.equal(result.ok, false);
  const backend = result.reports.find((report) => report.profile === 'backend');
  assert.deepEqual(backend.staleNeeds.map((item) => item.entry), [NEED]);
  assert.match(formatReport(result), /过期 backend: PROFILE_NEEDS/);
});

test('违规：测试目录没有被后缀规则排除', (t) => {
  const root = workspace(t, { design: { policy: manifest({ excludePaths: ['scripts/verify-template', 'scripts/fixtures'], excludePathSuffixes: ['tests'] }) } });
  const frontend = evaluateAll(root).reports.find((report) => report.profile === 'design');
  assert.deepEqual(frontend.findings.map((finding) => finding.kind), ['test-directory-not-excluded']);
  assert.equal(frontend.findings[0].path, 'test');
});

test('违规：后缀规则会误伤名字恰好以 test 结尾的路径段（如 latest、contest），带扩展名的文件名不受影响', (t) => {
  const root = workspace(t, { backend: { files: ['.agents/skills/latest/SKILL.md', 'scripts/contest'] } });
  const backend = evaluateAll(root).reports.find((report) => report.profile === 'backend');
  const collateral = backend.findings.filter((finding) => finding.kind === 'suffix-collateral').map((finding) => finding.path);
  assert.equal(collateral.length, 2);
  assert.ok(collateral.some((item) => item.includes('latest')) && collateral.some((item) => item.includes('contest')));
  assert.equal(shipped('scripts/contest.mjs', manifest({ excludePathSuffixes: ['test'] })), true, 'contest.mjs 以 .mjs 结尾，不会被 test 后缀命中');
});

test('无法评估时失败而不是通过：覆盖层目录缺失、策略缺失', (t) => {
  const root = workspace(t);
  fs.rmSync(path.join(root, 'profiles/design'), { recursive: true });
  git(root, 'add', '-A');
  assert.throws(() => evaluateAll(root), /design 缺少覆盖层目录 profiles\/design/);
  const missingPolicy = workspace(t);
  fs.rmSync(path.join(missingPolicy, 'profiles/backend', BUNDLE_PROFILE_REF));
  assert.throws(() => evaluateAll(missingPolicy), /缺少 backend 的分发策略/);
});

test('违规：已删除的同步机制或 Profile 子模块登记重新出现', (t) => {
  const root = workspace(t);
  write(root, 'scripts/sync-profile-skills', 'x\n');
  write(root, '.gitmodules', '[submodule "submodules/yss-harness-design-agent"]\n\tpath = submodules/yss-harness-design-agent\n');
  const result = evaluateAll(root);
  assert.equal(result.ok, false);
  const kinds = result.reports[0].findings.map((finding) => finding.kind);
  assert.ok(kinds.includes('retired-machinery-present') && kinds.includes('profile-submodule-present'), kinds.join());
  assert.match(formatReport(result), /不应重新出现/);
});

test('FR-006：分发守卫拒绝技能投影和根内旧清单，但允许明确排除及非技能配置', (t) => {
  const files = ['.claude/skills/x/SKILL.md', '.codex/skills/x/SKILL.md', '.cursor/skills/.yss-skills-manifest.json', '.pi/skills/x/SKILL.md'];
  const policy = { ...GOOD_PROFILE, allowRootEntries: [...GOOD_PROFILE.allowRootEntries, '.claude', '.codex', '.cursor', '.pi'] };
  const root = workspace(t, { backend: { policy, files: [...files, '.codex/instructions.md'] } });
  const result = evaluateAll(root);
  assert.equal(result.ok, false);
  assert.deepEqual(result.reports.find((report) => report.profile === 'backend').findings.map((finding) => finding.path).sort(), [...files].sort());
  assert.match(formatReport(result), /技能投影/);
  const excluded = { ...policy, excludePaths: [...policy.excludePaths, '.claude/skills', '.codex/skills', '.cursor/skills', '.pi/skills'] };
  assert.equal(evaluateAll(workspace(t, { backend: { policy: excluded, files: [...files, '.codex/instructions.md'] } })).ok, true);
});

test('命令行：合规退出 0，违规退出 1 并写 stderr，参数错误退出 1', (t) => {
  const ok = spawnSync(process.execPath, [SCRIPT, '--root', workspace(t)], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /通过 design/);
  const bad = workspace(t, { backend: { policy: manifest() } });
  const failed = spawnSync(process.execPath, [SCRIPT, '--root', bad], { encoding: 'utf8' });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /违规 backend/);
  assert.equal(spawnSync(process.execPath, [SCRIPT, '--nope'], { encoding: 'utf8' }).status, 1);
});
