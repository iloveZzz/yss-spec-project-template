import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { commitCheckpoint } from "../scripts/lib/checkpoint-commit.mjs";

function git(root, args, options = {}) {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8", ...options });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test("checkpoint commit captures the working tree without touching index, branch or HEAD", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "yss-checkpoint-"));
  try {
    git(root, ["init", "-q"]);
    git(root, ["config", "user.email", "probe@example.test"]);
    git(root, ["config", "user.name", "probe"]);
    writeFileSync(path.join(root, "tracked.txt"), "base\n");
    git(root, ["add", "tracked.txt"]);
    git(root, ["commit", "-q", "-m", "base"]);
    const head = git(root, ["rev-parse", "HEAD"]);
    writeFileSync(path.join(root, "tracked.txt"), "iterated\n");
    writeFileSync(path.join(root, "produced.txt"), "artifact\n");
    const result = commitCheckpoint({ root, runId: "iter-001", message: "checkpoint iter-001" });
    assert.equal(result.ref, "refs/checkpoints/iter-001");
    assert.match(result.commit, /^[0-9a-f]{40}$/);
    assert.equal(git(root, ["show", "refs/checkpoints/iter-001:produced.txt"]), "artifact");
    assert.equal(git(root, ["show", "refs/checkpoints/iter-001:tracked.txt"]), "iterated");
    assert.equal(git(root, ["rev-parse", "HEAD"]), head);
    assert.equal(git(root, ["diff", "--cached", "--name-only"]), "");
    assert.equal(readFileSync(path.join(root, "tracked.txt"), "utf8"), "iterated\n");
    const status = git(root, ["status", "--porcelain"]);
    assert.match(status, /M tracked\.txt/);
    assert.match(status, /produced\.txt/);
    assert.throws(() => commitCheckpoint({ root, runId: "iter-001" }), /拒绝覆盖/);
    assert.throws(() => commitCheckpoint({ root, runId: "Bad ID" }), /run-id/);
    assert.match(commitCheckpoint({ root, runId: "iter-002", dryRun: true }).ref, /refs\/checkpoints\/iter-002/);
    assert.equal(spawnSync("git", ["-C", root, "rev-parse", "--verify", "--quiet", "refs/checkpoints/iter-002"]).status, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
