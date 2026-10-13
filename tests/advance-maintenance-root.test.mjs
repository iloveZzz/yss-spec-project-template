import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("日常迭代在读取仓库或捕获候选前拒绝 candidate 和 release", () => {
  const other = fs.mkdtempSync(path.join(os.tmpdir(), "advance-profile-"));
  try {
    for (const profile of ["candidate", "release"]) {
      const result = spawnSync(process.execPath, [path.join(ROOT, "scripts/advance-maintenance-iteration"), "--run-id", "retired-profile", "--output", "maintenance:candidates/retired-profile", "--root", other, "--profile", profile], { encoding: "utf8" });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /--profile 必须是 fast:/);
      assert.deepEqual(fs.readdirSync(other), []);
    }
  } finally {
    fs.rmSync(other, { recursive: true, force: true });
  }
});

test("FR-008：checkpoint 只接受当前模板仓，Profile 并入后不再有专职仓的 --root", () => {
  const other = fs.mkdtempSync(path.join(os.tmpdir(), "advance-root-"));
  try {
    const result = spawnSync(process.execPath, [path.join(ROOT, "scripts/advance-maintenance-iteration"), "--run-id", "x", "--output", "maintenance:candidates/x", "--root", other, "--plan"], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /--root 只能是当前模板仓/);
  } finally {
    fs.rmSync(other, { recursive: true, force: true });
  }
});
