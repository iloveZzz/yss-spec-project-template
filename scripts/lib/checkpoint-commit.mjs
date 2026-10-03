import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

// Reject ids that git cannot turn into a ref ("" .. "", trailing ".lock",
// path separators, unsafe characters) before anything is written.
const RUN_ID_PATTERN = /^(?!.*\.\.)[a-z0-9][a-z0-9._-]{0,62}$/;
export const CHECKPOINT_PREFIX = "refs/checkpoints/";

export function validateCheckpointRunId(root, runId, { spawn = spawnSync } = {}) {
  if (typeof runId !== "string" || !RUN_ID_PATTERN.test(runId) || runId.endsWith(".lock")) {
    throw new TypeError("run-id 必须安全（小写字母/数字/._-；不得含 .. 或以 .lock 结尾）: " + String(runId));
  }
  const reference = CHECKPOINT_PREFIX + runId;
  const checked = spawn("git", ["-C", root, "check-ref-format", reference], { encoding: "utf8" });
  if (checked.status !== 0) throw new TypeError("非法 checkpoint 引用: " + reference);
  return reference;
}

// Create an immutable checkpoint commit of the current working tree without
// touching the user's index, working tree, branch or HEAD. A temporary index is
// populated from the base commit plus the working tree, written to a tree
// object, wrapped in a commit, and published only as a local
// refs/checkpoints/<run-id> ref.
export function commitCheckpoint({ root, runId, message, baseRef = "HEAD", dryRun = false, spawn = spawnSync } = {}) {
  const reference = validateCheckpointRunId(root, runId, { spawn });
  const run = (args, options) => {
    const result = spawn("git", ["-C", root, ...args], { encoding: "utf8", maxBuffer: 128 * 1024 * 1024, ...options });
    if (result.status !== 0) throw new TypeError((result.stderr || "").trim() || "git " + args.join(" ") + " 执行失败");
    return result.stdout.trim();
  };
  const parent = run(["rev-parse", "--verify", baseRef + "^{commit}"]);
  const existing = spawn("git", ["-C", root, "rev-parse", "--verify", "--quiet", reference], { encoding: "utf8" });
  if (dryRun) return { ref: reference, commit: null, tree: null, parent, run_id: runId, dry_run: true, exists: existing.status === 0 };
  if (existing.status === 0) throw new TypeError("checkpoint 已存在，拒绝覆盖: " + reference);
  const indexDirectory = mkdtempSync(path.join(os.tmpdir(), "yss-checkpoint-index-"));
  const indexPath = path.join(indexDirectory, "index");
  const env = { ...process.env, GIT_INDEX_FILE: indexPath };
  try {
    run(["read-tree", baseRef], { env });
    run(["add", "-A", "--", "."], { env });
    const tree = run(["write-tree"], { env });
    const commit = run(["commit-tree", tree, "-p", parent, "-m", message || ("checkpoint " + runId)], { env });
    run(["update-ref", reference, commit]);
    return { ref: reference, commit, tree, parent, run_id: runId, dry_run: false, exists: false };
  } finally {
    rmSync(indexDirectory, { recursive: true, force: true });
  }
}
