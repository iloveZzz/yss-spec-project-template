import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { obsoleteCanonicalResidues, PROJECTION_ROOTS, unlockedCanonicalEntries, unlockedProjectionEntries, unregisteredNestedSkillPaths } from "../../../../scripts/lib/skill-supply-chain.mjs";

function entry(name, type) {
  return {
    name,
    isDirectory: () => type === "directory",
    isSymbolicLink: () => type === "symlink",
  };
}

test("FR-006：大型 Git 清单下技能同步不再检查或删除用户保留的旧投影", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "yss-skill-inventory-"));
  try {
    const git = (args, input) => execFileSync("git", args, { cwd: root, input, encoding: "utf8" });
    git(["init", "--quiet"]);
    const blob = git(["hash-object", "-w", "--stdin"], "").trim();
    const inventory = Array.from({ length: 8000 }, (_, i) => `100644 ${blob}\tevidence/${i}/${"x".repeat(180)}\n`).join("");
    assert.ok(Buffer.byteLength(inventory) > 1024 * 1024);
    git(["update-index", "--index-info"], inventory);
    mkdirSync(path.join(root, "scripts/lib"), { recursive: true });
    cpSync(new URL("../../../../scripts/lib/skill-supply-chain.mjs", import.meta.url), path.join(root, "scripts/lib/skill-supply-chain.mjs"));
    cpSync(new URL("../../../../scripts/lib/workbuddy-projection.mjs", import.meta.url), path.join(root, "scripts/lib/workbuddy-projection.mjs"));
    mkdirSync(path.join(root, "scripts/vendor"), { recursive: true });
    for (const ref of ["scripts/lib/repository-mode.mjs", "scripts/lib/skill-retirement-contract.mjs", "scripts/lib/skill-retirement-projection.mjs", "scripts/vendor/yaml.mjs"]) cpSync(new URL(`../../../../${ref}`, import.meta.url), path.join(root, ref));
    mkdirSync(path.join(root, ".codex/skills/unlocked"), { recursive: true });
    writeFileSync(path.join(root, ".codex/skills/unlocked/SKILL.md"), "unlocked");
    git(["add", ".codex/skills/unlocked/SKILL.md"]);
    writeFileSync(path.join(root, "skills-lock.json"), JSON.stringify({ version: 3, skills: { shared: {} } }));
    const { syncSkills } = await import(pathToFileURL(path.join(root, "scripts/lib/skill-supply-chain.mjs")).href);
    assert.doesNotThrow(() => syncSkills({ check: true }));
    assert.doesNotThrow(() => syncSkills());
    assert.equal(readFileSync(path.join(root, ".codex/skills/unlocked/SKILL.md"), "utf8"), "unlocked");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("tracked projections absent from the lock cannot escape synchronization checks", () => {
  const candidates = [
    entry("shared-skill", "symlink"),
    entry("platform-skill", "directory"),
    entry("retired-skill", "symlink"),
    entry("personal-skill", "directory"),
  ];
  const tracked = new Set(["shared-skill", "platform-skill", "retired-skill"]);

  const extras = unlockedProjectionEntries(candidates, ["shared-skill", "platform-skill"], (name) => tracked.has(name));

  assert.deepEqual(extras.map(({ name }) => name), ["retired-skill"]);
});

test("obsolete canonical residues fail even when they are not in the lock", () => {
  assert.deepEqual(
    obsoleteCanonicalResidues(["yss-domain", "yss-dir", "batch-grill-me", "code-review"]),
    ["batch-grill-me", "yss-dir"]
  );
});

test("physical canonical skills must be present in the lock", () => {
  assert.deepEqual(
    unlockedCanonicalEntries(["yss-api-integration", "forgotten-skill", "empty-dir"], ["yss-api-integration"], (name) => name !== "empty-dir"),
    ["forgotten-skill"]
  );
});

test("WorkBuddy：根声明 Claude 与 WorkBuddy 两个必要投影根", () => {
  assert.deepEqual(PROJECTION_ROOTS, [".claude/skills", ".workbuddy/skills"]);
});

test("nested SKILL.md files cannot bypass external skill registration", () => {
  assert.deepEqual(
    unregisteredNestedSkillPaths(
      [
        ".agents/skills/example/references/registered/SKILL.md",
        ".agents/skills/example/references/hidden/SKILL.md",
      ],
      [".agents/skills/example/references/registered/SKILL.md"],
    ),
    [".agents/skills/example/references/hidden/SKILL.md"],
  );
});
