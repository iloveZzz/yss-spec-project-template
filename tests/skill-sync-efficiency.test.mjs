import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync, chmodSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

test("write-mode Skill sync skips identical projections and repairs raw structure or mode drift", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "yss-skill-sync-"));
  try {
    mkdirSync(path.join(root, "scripts/lib"), { recursive: true });
    cpSync(path.resolve("scripts/lib/skill-supply-chain.mjs"), path.join(root, "scripts/lib/skill-supply-chain.mjs"));
    const source = path.join(root, ".agents/skills/probe");
    mkdirSync(source, { recursive: true });
    writeFileSync(path.join(source, "SKILL.md"), "---\r\nname: probe\r\n---\r\n");
    writeFileSync(path.join(source, "payload.txt"), "payload\n");
    symlinkSync("payload.txt", path.join(source, "linked.txt"));
    for (const projection of [".codex/skills", ".cursor/skills", ".pi/skills"]) {
      const target = path.join(root, projection, "probe");
      mkdirSync(path.dirname(target), { recursive: true });
      cpSync(source, target, { recursive: true, verbatimSymlinks: true });
    }
    writeFileSync(path.join(root, "skills-lock.json"), JSON.stringify({ version: 3, skills: { shared: { probe: {} }, platform: {} } }));
    assert.equal(spawnSync("git", ["init", "-q", root]).status, 0);
    assert.equal(spawnSync("git", ["-C", root, "add", ".codex/skills", ".cursor/skills", ".pi/skills"]).status, 0);
    const { syncSkills } = await import(pathToFileURL(path.join(root, "scripts/lib/skill-supply-chain.mjs")).href);
    const target = path.join(root, ".codex/skills/probe");
    const skillFile = path.join(target, "SKILL.md");
    const before = statSync(skillFile).mtimeMs;
    assert.match(syncSkills(), /synchronized 1 shared skills/);
    assert.equal(statSync(skillFile).mtimeMs, before);
    assert.equal(readFileSync(skillFile, "utf8"), readFileSync(path.join(source, "SKILL.md"), "utf8"));

    writeFileSync(skillFile, "---\nname: probe\n---\n");
    assert.equal(syncSkills({ check: true }), "skill projections are synchronized");
    syncSkills();
    assert.equal(readFileSync(skillFile, "utf8"), "---\r\nname: probe\r\n---\r\n");

    chmodSync(skillFile, 0o600);
    syncSkills();
    assert.equal(statSync(skillFile).mode & 0o777, statSync(path.join(source, "SKILL.md")).mode & 0o777);
    rmSync(path.join(target, "linked.txt"));
    writeFileSync(path.join(target, "linked.txt"), "payload\n");
    syncSkills();
    assert.equal(lstatSync(path.join(target, "linked.txt")).isSymbolicLink(), true);
    assert.equal(readFileSync(path.join(target, "linked.txt"), "utf8"), "payload\n");
    assert.equal(syncSkills({ check: true }), "skill projections are synchronized");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
