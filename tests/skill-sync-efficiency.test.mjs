import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

for (const sourceRoot of [".", "profiles/backend", "profiles/design"]) test(`FR-006：${sourceRoot} Skill 同步不创建任何投影目录，检查也通过`, async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "yss-skill-sync-"));
  try {
    mkdirSync(path.join(root, "scripts/lib"), { recursive: true });
    cpSync(path.resolve(sourceRoot, "scripts/lib/skill-supply-chain.mjs"), path.join(root, "scripts/lib/skill-supply-chain.mjs"));
    const source = path.join(root, ".agents/skills/probe");
    mkdirSync(source, { recursive: true });
    writeFileSync(path.join(source, "SKILL.md"), "---\nname: probe\n---\n");
    writeFileSync(path.join(root, "skills-lock.json"), JSON.stringify({ version: 3, skills: { shared: { probe: {} }, platform: {} } }));
    assert.equal(spawnSync("git", ["init", "-q", root]).status, 0);
    const { syncSkills, PROJECTION_ROOTS } = await import(pathToFileURL(path.join(root, "scripts/lib/skill-supply-chain.mjs")).href);
    assert.deepEqual(PROJECTION_ROOTS, []);
    assert.match(syncSkills(), /synchronized 1 shared skills/);
    assert.equal(syncSkills({ check: true }), "skill projections are synchronized");
    for (const hidden of [".claude", ".codex", ".cursor", ".pi"]) assert.equal(existsSync(path.join(root, hidden)), false, `${hidden} 不应被创建`);
    assert.deepEqual(readdirSync(root).filter((name) => name.endsWith("skills")), []);
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
