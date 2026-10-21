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
    const source = path.join(root, ".agents/skills/probe");
    mkdirSync(source, { recursive: true });
    writeFileSync(path.join(source, "SKILL.md"), "---\nname: probe\n---\n");
    writeFileSync(path.join(root, "skills-lock.json"), JSON.stringify({ version: 3, skills: { shared: { probe: {} }, platform: {} } }));
    assert.equal(spawnSync("git", ["init", "-q", root]).status, 0);
    const { syncSkills, PROJECTION_ROOTS } = await import(pathToFileURL(path.join(root, "scripts/lib/skill-supply-chain.mjs")).href);
    assert.deepEqual(PROJECTION_ROOTS, [".codebuddy/skills"]);
    assert.match(syncSkills(), /synchronized 1 shared skills/);
    assert.equal(syncSkills({ check: true }), "skill projections are synchronized");
    for (const hidden of [".claude", ".codex", ".cursor", ".pi"]) assert.equal(existsSync(path.join(root, hidden)), false, `${hidden} 不应被创建`);
    assert.deepEqual(readdirSync(root).filter((name) => name.endsWith("skills")), []);
    assert.equal(lstatSync(path.join(root, ".codebuddy/skills/probe")).isSymbolicLink(), false);
    assert.equal(readFileSync(path.join(root, ".codebuddy/skills/probe/SKILL.md"), "utf8"), readFileSync(path.join(source, "SKILL.md"), "utf8"));
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
    const source = path.join(root, ".agents/skills/probe");
    mkdirSync(source, { recursive: true });
    writeFileSync(path.join(source, "SKILL.md"), "---\r\nname: probe\r\n---\r\n");
    writeFileSync(path.join(source, "payload.txt"), "payload\n");
    symlinkSync("payload.txt", path.join(source, "linked.txt"));
    writeFileSync(path.join(root, "yss-project.yaml"), "schema_version: 1\nrepository_mode: project-instance\n");
    const target = path.join(root, ".claude/skills/probe");
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(source, target, { recursive: true, verbatimSymlinks: true });
    writeFileSync(path.join(root, "skills-lock.json"), JSON.stringify({ version: 3, projectionRoots: [".claude/skills"], skills: { shared: { probe: {} }, platform: {} } }));
    assert.equal(spawnSync("git", ["init", "-q", root]).status, 0);
    assert.equal(spawnSync("git", ["-C", root, "add", ".claude/skills"]).status, 0);
    const { syncSkills, PROJECTION_ROOTS } = await import(pathToFileURL(path.join(root, "scripts/lib/skill-supply-chain.mjs")).href);
    assert.deepEqual(PROJECTION_ROOTS, [".claude/skills", ".codebuddy/skills"]);
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
