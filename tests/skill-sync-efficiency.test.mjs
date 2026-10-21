import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Backend 仅新增 WorkBuddy 普通文件投影，根保留 Claude 兼容行为。
for (const sourceRoot of ["profiles/backend"]) test(`FR-006：${sourceRoot} Skill 同步创建 WorkBuddy 普通投影，检查也通过`, async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "yss-skill-sync-"));
  try {
    mkdirSync(path.join(root, "scripts/lib"), { recursive: true });
    cpSync(path.resolve(sourceRoot, "scripts/lib/skill-supply-chain.mjs"), path.join(root, "scripts/lib/skill-supply-chain.mjs"));
    cpSync(path.resolve("scripts/lib/workbuddy-projection.mjs"), path.join(root, "scripts/lib/workbuddy-projection.mjs"));
    mkdirSync(path.join(root, "scripts/vendor"), { recursive: true });
    for (const ref of ["scripts/lib/repository-mode.mjs", "scripts/vendor/yaml.mjs"]) cpSync(path.resolve(ref), path.join(root, ref));
    const source = path.join(root, ".agents/skills/probe");
    mkdirSync(source, { recursive: true });
    writeFileSync(path.join(source, "SKILL.md"), "---\nname: probe\n---\n");
    writeFileSync(path.join(root, "skills-lock.json"), JSON.stringify({ version: 3, skills: { shared: { probe: {} }, platform: {} } }));
    assert.equal(spawnSync("git", ["init", "-q", root]).status, 0);
    const { syncSkills, PROJECTION_ROOTS } = await import(pathToFileURL(path.join(root, "scripts/lib/skill-supply-chain.mjs")).href);
    assert.deepEqual(PROJECTION_ROOTS, [".workbuddy/skills"]);
    assert.match(syncSkills(), /synchronized 1 shared skills/);
    assert.equal(syncSkills({ check: true }), "skill projections are synchronized");
    for (const hidden of [".claude", ".codex", ".cursor", ".pi"]) assert.equal(existsSync(path.join(root, hidden)), false, `${hidden} 不应被创建`);
    assert.deepEqual(readdirSync(root).filter((name) => name.endsWith("skills")), []);
    assert.equal(lstatSync(path.join(root, ".workbuddy/skills/probe")).isSymbolicLink(), false);
    assert.equal(readFileSync(path.join(root, ".workbuddy/skills/probe/SKILL.md"), "utf8"), readFileSync(path.join(source, "SKILL.md"), "utf8"));
    writeFileSync(path.join(root, "yss-project.yaml"), 'schema_version: 1\nrepository_mode: "project-instance"\n');
    for (const roots of [[".codebuddy/skills"], [".workbuddy/skills", ".codebuddy/skills"]]) {
      writeFileSync(path.join(root, "skills-lock.json"), JSON.stringify({ version: 3, projectionRoots: roots, skills: { shared: { probe: {} }, platform: {} } }));
      assert.throws(() => syncSkills({ check: true }), /projectionRoots/);
      assert.throws(() => syncSkills(), /projectionRoots/);
    }
    writeFileSync(path.join(root, "skills-lock.json"), JSON.stringify({ version: 3, projectionRoots: [".workbuddy/skills"], skills: { shared: { probe: {} }, platform: {} } }));
    symlinkSync(source, path.join(root, ".codebuddy"));
    assert.equal(syncSkills({ check: true }), "skill projections are synchronized", "WorkBuddy 实例不探测独立 CodeBuddy 用户路径");
    assert.throws(() => syncSkills(), /实例写入须使用/);

  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("根 Skill 同步：相同投影不重写，结构、换行或权限漂移会被修复", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "yss-skill-sync-"));
  try {
    mkdirSync(path.join(root, "scripts/lib"), { recursive: true });
    cpSync(path.resolve("scripts/lib/skill-supply-chain.mjs"), path.join(root, "scripts/lib/skill-supply-chain.mjs"));
    cpSync(path.resolve("scripts/lib/workbuddy-projection.mjs"), path.join(root, "scripts/lib/workbuddy-projection.mjs"));
    mkdirSync(path.join(root, "scripts/vendor"), { recursive: true });
    for (const ref of ["scripts/lib/repository-mode.mjs", "scripts/vendor/yaml.mjs"]) cpSync(path.resolve(ref), path.join(root, ref));
    const source = path.join(root, ".agents/skills/probe");
    mkdirSync(source, { recursive: true });
    writeFileSync(path.join(source, "SKILL.md"), "---\r\nname: probe\r\n---\r\n");
    writeFileSync(path.join(source, "payload.txt"), "payload\n");
    symlinkSync("payload.txt", path.join(source, "linked.txt"));
    writeFileSync(path.join(root, "yss-project.yaml"), 'schema_version: 1\nrepository_mode: "project-instance"\n');
    const target = path.join(root, ".claude/skills/probe");
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(source, target, { recursive: true, verbatimSymlinks: true });
    writeFileSync(path.join(root, "skills-lock.json"), JSON.stringify({ version: 3, projectionRoots: [".claude/skills"], skills: { shared: { probe: {} }, platform: {} } }));
    assert.equal(spawnSync("git", ["init", "-q", root]).status, 0);
    assert.equal(spawnSync("git", ["-C", root, "add", ".claude/skills"]).status, 0);
    const { syncSkills, PROJECTION_ROOTS } = await import(pathToFileURL(path.join(root, "scripts/lib/skill-supply-chain.mjs")).href);
    assert.deepEqual(PROJECTION_ROOTS, [".claude/skills", ".workbuddy/skills"]);
    const skillFile = path.join(target, "SKILL.md");
    const before = statSync(skillFile).mtimeMs;
    assert.match(syncSkills(), /synchronized 1 shared skills/);
    assert.equal(statSync(skillFile).mtimeMs, before, "相同投影不应重写");

    writeFileSync(skillFile, "---\nname: probe\n---\n");
    assert.equal(syncSkills({ check: true }), "skill projections are synchronized", "只差换行不算漂移");
    syncSkills();
    assert.equal(readFileSync(skillFile, "utf8"), "---\r\nname: probe\r\n---\r\n");

    chmodSync(skillFile, 0o600);
    syncSkills();
    assert.equal(statSync(skillFile).mode & 0o777, statSync(path.join(source, "SKILL.md")).mode & 0o777);
    rmSync(path.join(target, "linked.txt"));
    writeFileSync(path.join(target, "linked.txt"), "payload\n");
    syncSkills();
    assert.equal(lstatSync(path.join(target, "linked.txt")).isSymbolicLink(), true);
    assert.equal(syncSkills({ check: true }), "skill projections are synchronized");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("实例锁的 effectiveHash 由 update-skill-lock 保持在 skillPath 之后，与打包器写入的键序一致", async () => {
  const { withEffectiveHash } = await import(pathToFileURL(path.resolve("scripts/lib/skill-supply-chain.mjs")).href);
  const item = { source: "project", sourceType: "local", skillPath: ".agents/skills/probe/SKILL.md", upstreamHash: "u", targets: [".agents/skills"] };
  assert.deepEqual(Object.keys(withEffectiveHash(item, "h")), ["source", "sourceType", "skillPath", "effectiveHash", "upstreamHash", "targets"]);
  assert.equal(withEffectiveHash(item, "h").effectiveHash, "h");
});


for (const command of ['sync', 'lock']) test(`Profile generation entry ${command} rejects project instances before loading source tooling`, () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'yss-profile-entry-'));
  try {
    mkdirSync(path.join(root, 'scripts/lib'), { recursive: true });
    mkdirSync(path.join(root, 'scripts/vendor'), { recursive: true });
    mkdirSync(path.join(root, '.template-source/scripts'), { recursive: true });
    for (const ref of ['.template-source/scripts/manage-profile-skills.mjs', 'scripts/lib/skill-supply-chain.mjs', 'scripts/lib/workbuddy-projection.mjs', 'scripts/lib/repository-mode.mjs', 'scripts/vendor/yaml.mjs']) cpSync(path.resolve(ref), path.join(root, ref));
    writeFileSync(path.join(root, 'yss-project.yaml'), 'schema_version: 1\nrepository_mode: project-instance\n');
    const before = readdirSync(root).sort();
    const result = spawnSync(process.execPath, [path.join(root, '.template-source/scripts/manage-profile-skills.mjs'), command, '--profile', 'backend'], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Profile 生成仅适用于 template-source/);
    assert.deepEqual(readdirSync(root).sort(), before);
  } finally { rmSync(root, { recursive: true, force: true }); }
});


for (const command of ['sync', 'lock']) for (const [kind, identity] of [
  ['unsupported-schema', 'schema_version: 99\nrepository_mode: template-source\n'],
  ['duplicate-mode', 'schema_version: 1\nrepository_mode: project-instance\nrepository_mode: template-source\n'],
]) test(`Profile generation entry ${command} rejects ${kind} identity without writes`, () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'yss-profile-identity-'));
  try {
    mkdirSync(path.join(root, 'scripts/lib'), { recursive: true });
    mkdirSync(path.join(root, 'scripts/vendor'), { recursive: true });
    mkdirSync(path.join(root, '.template-source/scripts'), { recursive: true });
    for (const ref of ['.template-source/scripts/manage-profile-skills.mjs', 'scripts/lib/skill-supply-chain.mjs', 'scripts/lib/workbuddy-projection.mjs', 'scripts/lib/repository-mode.mjs', 'scripts/vendor/yaml.mjs']) cpSync(path.resolve(ref), path.join(root, ref));
    writeFileSync(path.join(root, 'yss-project.yaml'), identity);
    const before = readdirSync(root).sort();
    const result = spawnSync(process.execPath, [path.join(root, '.template-source/scripts/manage-profile-skills.mjs'), command, '--profile', 'backend'], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /yss-project.yaml.*(?:schema_version|解析)|无法解析 yss-project.yaml/);
    assert.deepEqual(readdirSync(root).sort(), before);
    assert.equal(readFileSync(path.join(root, 'yss-project.yaml'), 'utf8'), identity);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

for (const command of ['sync', 'lock']) test(`Profile generation entry ${command} rejects a linked profiles ancestor without external writes`, () => {
  const base = mkdtempSync(path.join(os.tmpdir(), 'yss-profile-boundary-'));
  const root = path.join(base, 'repository'), outside = path.join(base, 'outside'), backend = path.join(outside, 'backend');
  try {
    mkdirSync(path.join(root, '.agents/skills/probe'), { recursive: true });
    mkdirSync(path.join(backend, 'scripts/lib'), { recursive: true });
    mkdirSync(path.join(root, 'scripts'), { recursive: true });
    for (const ref of ['scripts/lib', 'scripts/vendor']) cpSync(path.resolve(ref), path.join(root, ref), { recursive: true });
    mkdirSync(path.join(root, '.template-source/scripts'), { recursive: true });
    cpSync(path.resolve('.template-source/scripts/manage-profile-skills.mjs'), path.join(root, '.template-source/scripts/manage-profile-skills.mjs'));
    cpSync(path.resolve('profiles/backend/scripts/lib/skill-supply-chain.mjs'), path.join(backend, 'scripts/lib/skill-supply-chain.mjs'));
    writeFileSync(path.join(root, 'yss-project.yaml'), 'schema_version: 1\nrepository_mode: template-source\n');
    writeFileSync(path.join(root, '.agents/skills/probe/SKILL.md'), '---\nname: probe\n---\n');
    const originalLock = JSON.stringify({ version: 3, skills: { shared: { probe: {} }, platform: {} } });
    writeFileSync(path.join(backend, 'skills-lock.json'), originalLock);
    symlinkSync(outside, path.join(root, 'profiles'));
    const result = spawnSync(process.execPath, [path.join(root, '.template-source/scripts/manage-profile-skills.mjs'), command, '--profile', 'backend'], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /WORKBUDDY_PROJECTION_CONFLICT.*ordinary directory/);
    assert.equal(readFileSync(path.join(backend, 'skills-lock.json'), 'utf8'), originalLock);
    assert.equal(existsSync(path.join(backend, '.workbuddy')), false);
    assert.deepEqual(readdirSync(backend).sort(), ['scripts', 'skills-lock.json']);
  } finally { rmSync(base, { recursive: true, force: true }); }
});


for (const profile of ['spec', 'backend']) for (const [kind, identity] of [
  ['quoted-source', 'schema_version: 1\nrepository_mode: "template-source"\n'],
  ['quoted-instance', 'schema_version: 1\nrepository_mode: "project-instance"\n'],
  ['unsupported-schema', 'schema_version: 99\nrepository_mode: template-source\n'],
  ['duplicate-mode', 'schema_version: 1\nrepository_mode: project-instance\nrepository_mode: template-source\n'],
]) test(`WorkBuddy ${profile} supply consumes strict ${kind} repository identity`, async t => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'yss-workbuddy-identity-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'scripts/lib'), { recursive: true });
  mkdirSync(path.join(root, 'scripts/vendor'), { recursive: true });
  const origin = profile === 'backend' ? 'profiles/backend/scripts/lib/skill-supply-chain.mjs' : 'scripts/lib/skill-supply-chain.mjs';
  cpSync(path.resolve(origin), path.join(root, 'scripts/lib/skill-supply-chain.mjs'));
  for (const ref of ['scripts/lib/workbuddy-projection.mjs', 'scripts/lib/repository-mode.mjs', 'scripts/vendor/yaml.mjs']) cpSync(path.resolve(ref), path.join(root, ref));
  const canonical = path.join(root, '.agents/skills/probe'), legacy = path.join(root, '.codebuddy/skills/probe');
  mkdirSync(canonical, { recursive: true }); mkdirSync(path.dirname(legacy), { recursive: true });
  writeFileSync(path.join(canonical, 'SKILL.md'), '---\nname: probe\n---\n');
  chmodSync(path.join(canonical, 'SKILL.md'), 0o644);
  cpSync(canonical, legacy, { recursive: true });
  writeFileSync(path.join(root, 'skills-lock.json'), JSON.stringify({ version: 3, projectionRoots: ['.workbuddy/skills'], skills: { shared: { probe: {} }, platform: {} } }));
  writeFileSync(path.join(root, 'yss-project.yaml'), identity);
  const git = args => { const result = spawnSync('git', ['-c','user.name=Probe','-c','user.email=probe@example.invalid',...args], { cwd: root, encoding: 'utf8' }); assert.equal(result.status, 0, result.stderr); };
  git(['init','-q']); git(['add','.codebuddy']); git(['commit','-qm','committed legacy projection']);
  const { syncSkills } = await import(pathToFileURL(path.join(root, 'scripts/lib/skill-supply-chain.mjs')).href);
  if (kind === 'quoted-source') {
    assert.match(syncSkills(), /synchronized 1 shared skills/);
    assert.equal(existsSync(path.join(root, '.codebuddy')), false);
    assert.equal(readFileSync(path.join(root, '.workbuddy/skills/probe/SKILL.md'), 'utf8'), readFileSync(path.join(canonical, 'SKILL.md'), 'utf8'));
    assert.equal(syncSkills({ check: true }), 'skill projections are synchronized');
  } else if (kind === 'quoted-instance') {
    rmSync(path.join(root, '.codebuddy'), { recursive: true });
    symlinkSync(canonical, path.join(root, '.codebuddy'));
    mkdirSync(path.join(root, '.workbuddy/skills'), { recursive: true });
    cpSync(canonical, path.join(root, '.workbuddy/skills/probe'), { recursive: true });
    assert.equal(syncSkills({ check: true }), 'skill projections are synchronized');
    assert.throws(() => syncSkills(), /实例写入须使用/);
  } else {
    assert.throws(() => syncSkills(), /yss-project.yaml/);
    assert.equal(existsSync(path.join(root, '.workbuddy')), false);
    assert.equal(readFileSync(path.join(legacy, 'SKILL.md'), 'utf8'), readFileSync(path.join(canonical, 'SKILL.md'), 'utf8'));
  }
});

test('Source Profile entry sync and lock accept quoted identity and generate the complete Backend projection', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'yss-source-profile-entry-'));
  try {
    const entry = '.template-source/scripts/manage-profile-skills.mjs';
    const backend = path.join(root, 'profiles/backend');
    const canonical = path.join(root, '.agents/skills/probe');
    const legacy = path.join(backend, '.codebuddy/skills/probe');
    mkdirSync(path.join(root, '.template-source/scripts'), { recursive: true });
    mkdirSync(path.join(root, 'scripts'), { recursive: true });
    mkdirSync(path.join(backend, 'scripts/lib'), { recursive: true });
    mkdirSync(canonical, { recursive: true });
    mkdirSync(path.dirname(legacy), { recursive: true });
    for (const ref of ['scripts/lib', 'scripts/vendor']) cpSync(path.resolve(ref), path.join(root, ref), { recursive: true });
    cpSync(path.resolve(entry), path.join(root, entry));
    cpSync(path.resolve('profiles/backend/scripts/lib/skill-supply-chain.mjs'), path.join(backend, 'scripts/lib/skill-supply-chain.mjs'));
    writeFileSync(path.join(root, 'yss-project.yaml'), 'schema_version: 1\nrepository_mode: "template-source"\n');
    writeFileSync(path.join(canonical, 'SKILL.md'), '---\nname: probe\n---\nold canonical\n');
    chmodSync(path.join(canonical, 'SKILL.md'), 0o644);
    cpSync(canonical, legacy, { recursive: true });
    const originalLock = JSON.stringify({ version: 3, projectionRoots: ['.codebuddy/skills'], skills: { shared: { probe: { effectiveHash: 'previous' } }, platform: {} } });
    writeFileSync(path.join(backend, 'skills-lock.json'), originalLock);
    const git = args => { const result = spawnSync('git', ['-c', 'user.name=Probe', '-c', 'user.email=probe@example.invalid', ...args], { cwd: root, encoding: 'utf8' }); assert.equal(result.status, 0, result.stderr); };
    git(['init', '-q']); git(['add', 'profiles/backend/.codebuddy']); git(['commit', '-qm', 'committed legacy projection']);
    writeFileSync(path.join(canonical, 'SKILL.md'), '---\nname: probe\n---\nnew canonical\n');
    const run = (action, check = false) => spawnSync(process.execPath, [path.join(root, entry), action, '--profile', 'backend', ...(check ? ['--check'] : [])], { cwd: root, encoding: 'utf8' });
    for (const action of ['sync', 'lock']) assert.equal(run(action, true).status, 1, `${action} must report stale generated content`);
    assert.equal(existsSync(path.join(backend, '.workbuddy')), false);
    assert.equal(readFileSync(path.join(backend, 'skills-lock.json'), 'utf8'), originalLock);
    for (const action of ['sync', 'lock']) { const result = run(action); assert.equal(result.status, 0, result.stderr); }
    assert.equal(existsSync(path.join(backend, '.codebuddy')), false);
    assert.equal(readFileSync(path.join(backend, '.workbuddy/skills/probe/SKILL.md'), 'utf8'), readFileSync(path.join(canonical, 'SKILL.md'), 'utf8'));
    const lock = JSON.parse(readFileSync(path.join(backend, 'skills-lock.json'), 'utf8'));
    assert.deepEqual(lock.projectionRoots, ['.workbuddy/skills']);
    assert.deepEqual(lock.skills.shared.probe.targets, ['.agents/skills', '.workbuddy/skills']);
    assert.match(lock.skills.shared.probe.effectiveHash, /^[a-f0-9]{64}$/);
    for (const action of ['sync', 'lock']) { const result = run(action, true); assert.equal(result.status, 0, result.stderr); }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
