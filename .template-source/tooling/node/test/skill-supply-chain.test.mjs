import assert from "node:assert/strict";
import test from "node:test";

import { obsoleteCanonicalResidues, PROJECTION_ROOTS, unlockedCanonicalEntries, unlockedProjectionEntries } from "../../../../scripts/lib/skill-supply-chain.mjs";

function entry(name, type) {
  return {
    name,
    isDirectory: () => type === "directory",
    isSymbolicLink: () => type === "symlink",
  };
}

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

test("Cursor is a first-class shared skill projection root", () => {
  assert.ok(PROJECTION_ROOTS.includes(".cursor/skills"));
  assert.deepEqual(
    PROJECTION_ROOTS,
    [".claude/skills", ".codex/skills", ".cursor/skills", ".pi/skills", ".qoder/skills", ".trae/skills"]
  );
});
