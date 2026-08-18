import assert from "node:assert/strict";
import test from "node:test";

import { unlockedProjectionEntries } from "../../../../scripts/lib/skill-supply-chain.mjs";

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
