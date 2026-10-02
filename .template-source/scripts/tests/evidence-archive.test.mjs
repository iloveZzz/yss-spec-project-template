// Counterexample tests for .template-source/scripts/evidence-archive.mjs
// Run: node --test .template-source/scripts/tests/evidence-archive.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const TOOL = path.resolve(import.meta.dirname, "../evidence-archive.mjs");
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

/** Build a throwaway git repo that mimics the evidence layout. */
function makeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "evidence-archive-test-"));
  const archiveDir = fs.mkdtempSync(path.join(os.tmpdir(), "evidence-archive-out-"));
  const unit = "evidence/maintenance/round-a";
  fs.mkdirSync(path.join(root, unit, "nested"), { recursive: true });
  fs.writeFileSync(path.join(root, unit, "result.json"), JSON.stringify({ ok: true, n: 1 }) + "\n");
  fs.writeFileSync(path.join(root, unit, "nested", "log.txt"), "hello\n");
  fs.mkdirSync(path.join(root, "evidence/maintenance/round-b"), { recursive: true });
  fs.writeFileSync(path.join(root, "evidence/maintenance/round-b/note.md"), "# retained\n");
  fs.writeFileSync(path.join(root, "README.md"), "# repo\n");
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["config", "user.email", "t@example.com"], { cwd: root });
  execFileSync("git", ["config", "user.name", "t"], { cwd: root });
  execFileSync("git", ["add", "-A"], { cwd: root });
  execFileSync("git", ["commit", "-qm", "init"], { cwd: root });
  return { root, archiveDir, unit };
}

function run(root, args) {
  const r = spawnSync(process.execPath, [TOOL, ...args], { cwd: root, encoding: "utf8" });
  return { code: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function packAll(ctx, batch = "b1") {
  const r = run(ctx.root, ["pack", batch, "--unit", ctx.unit, "--archive-dir", ctx.archiveDir]);
  assert.equal(r.code, 0, r.stderr);
  return {
    archive: path.join(ctx.archiveDir, batch + ".tar.gz"),
    manifest: path.join(ctx.archiveDir, batch + ".manifest.json"),
  };
}
function verifyAll(ctx, batch = "b1", report) {
  const extract = path.join(ctx.root, "..", "extract-" + Math.random().toString(36).slice(2));
  const args = ["verify", batch, "--archive-dir", ctx.archiveDir, "--extract-dir", extract];
  if (report) args.push("--report", report);
  return run(ctx.root, args);
}

test("plan blocks removal when a retained markdown file links into the unit", () => {
  const ctx = makeRepo();
  fs.writeFileSync(path.join(ctx.root, "README.md"), "# repo\n\n[see](evidence/maintenance/round-a/result.json)\n");
  execFileSync("git", ["add", "-A"], { cwd: ctx.root });
  execFileSync("git", ["commit", "-qm", "link"], { cwd: ctx.root });
  const r = run(ctx.root, ["plan", "b1", "--unit", ctx.unit]);
  assert.equal(r.code, 2, "must refuse when a hard reference exists");
  assert.match(r.stderr, /hard/);
});

test("plan passes when no retained file links into the unit", () => {
  const ctx = makeRepo();
  const r = run(ctx.root, ["plan", "b1", "--unit", ctx.unit]);
  assert.equal(r.code, 0, r.stderr);
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.hardReferences, 0);
  assert.equal(parsed.memberCount, 2);
});

test("pack refuses to overwrite an existing archive and manifest", () => {
  const ctx = makeRepo();
  packAll(ctx);
  const again = run(ctx.root, ["pack", "b1", "--unit", ctx.unit, "--archive-dir", ctx.archiveDir]);
  assert.equal(again.code, 2);
  assert.match(again.stderr, /refusing to overwrite/);
});

test("verify passes on an intact archive and records per-member readback", () => {
  const ctx = makeRepo();
  packAll(ctx);
  const report = path.join(ctx.archiveDir, "verify.json");
  const r = verifyAll(ctx, "b1", report);
  assert.equal(r.code, 0, r.stderr + r.stdout);
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.result, "pass");
  assert.equal(parsed.checked, 2);
  const saved = JSON.parse(fs.readFileSync(report, "utf8"));
  assert.equal(saved.result, "pass");
  assert.equal(saved.archive_sha256.length, 64);
});

test("verify refuses a tampered archive (digest mismatch)", () => {
  const ctx = makeRepo();
  const { archive } = packAll(ctx);
  const buf = fs.readFileSync(archive);
  buf[buf.length - 5] ^= 0xff;
  fs.writeFileSync(archive, buf);
  const r = verifyAll(ctx, "b1");
  assert.equal(r.code, 2);
  assert.match(r.stderr, /does not match manifest/);
});

test("verify fails when the manifest lists a member the archive lacks", () => {
  const ctx = makeRepo();
  const { manifest } = packAll(ctx);
  const m = JSON.parse(fs.readFileSync(manifest, "utf8"));
  m.members.push({ path: ctx.unit + "/nested/absent.json", bytes: 3, mode: "644", sha256: "a".repeat(64) });
  m.memberCount = m.members.length;
  fs.writeFileSync(manifest, JSON.stringify(m, null, 2));
  const r = verifyAll(ctx, "b1");
  assert.equal(r.code, 2);
  assert.match(r.stderr, /missing-member/);
});

test("verify fails when the archive carries an undeclared extra member", () => {
  const ctx = makeRepo();
  const { manifest } = packAll(ctx);
  const m = JSON.parse(fs.readFileSync(manifest, "utf8"));
  m.members = m.members.filter((x) => !x.path.endsWith("log.txt"));
  m.memberCount = m.members.length;
  fs.writeFileSync(manifest, JSON.stringify(m, null, 2));
  const r = verifyAll(ctx, "b1");
  assert.equal(r.code, 2);
  assert.match(r.stderr, /unexpected-member/);
});

test("remove refuses without a passing verify report", () => {
  const ctx = makeRepo();
  packAll(ctx);
  const r = run(ctx.root, ["remove", "b1", "--archive-dir", ctx.archiveDir]);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /requires --report/);
  // originals must be intact
  assert.ok(fs.existsSync(path.join(ctx.root, ctx.unit, "result.json")));
});

test("remove refuses a verify report bound to a different archive digest", () => {
  const ctx = makeRepo();
  packAll(ctx);
  const report = path.join(ctx.archiveDir, "verify.json");
  verifyAll(ctx, "b1", report);
  const saved = JSON.parse(fs.readFileSync(report, "utf8"));
  saved.archive_sha256 = "0".repeat(64);
  fs.writeFileSync(report, JSON.stringify(saved));
  const r = run(ctx.root, ["remove", "b1", "--archive-dir", ctx.archiveDir, "--report", report]);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /does not bind/);
});

test("remove refuses when a member changed after packing (concurrent modification)", () => {
  const ctx = makeRepo();
  packAll(ctx);
  const report = path.join(ctx.archiveDir, "verify.json");
  verifyAll(ctx, "b1", report);
  fs.appendFileSync(path.join(ctx.root, ctx.unit, "result.json"), "\n");
  const r = run(ctx.root, ["remove", "b1", "--archive-dir", ctx.archiveDir, "--report", report]);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /concurrent modification/);
});

test("remove refuses a manifest member that escapes the repository", () => {
  const ctx = makeRepo();
  packAll(ctx);
  const report = path.join(ctx.archiveDir, "verify.json");
  verifyAll(ctx, "b1", report);
  const manifestPath = path.join(ctx.archiveDir, "b1.manifest.json");
  const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  m.members.push({ path: "../outside.txt", bytes: 1, mode: "644", sha256: "0".repeat(64) });
  fs.writeFileSync(manifestPath, JSON.stringify(m));
  const r = run(ctx.root, ["remove", "b1", "--archive-dir", ctx.archiveDir, "--report", report]);
  assert.equal(r.code, 2);
  assert.doesNotMatch(r.stderr, /^$/, "must refuse");
});

test("remove deletes only after verification, prunes empty dirs, and the archive restores identical bytes", () => {
  const ctx = makeRepo();
  const { archive, manifest } = packAll(ctx);
  const before = fs.readFileSync(path.join(ctx.root, ctx.unit, "nested", "log.txt"));
  const beforeMode = (fs.statSync(path.join(ctx.root, ctx.unit, "result.json")).mode & 0o777).toString(8);
  const report = path.join(ctx.archiveDir, "verify.json");
  assert.equal(verifyAll(ctx, "b1", report).code, 0);
  const r = run(ctx.root, ["remove", "b1", "--archive-dir", ctx.archiveDir, "--report", report]);
  assert.equal(r.code, 0, r.stderr);
  assert.ok(!fs.existsSync(path.join(ctx.root, ctx.unit, "result.json")), "member removed");
  assert.ok(!fs.existsSync(path.join(ctx.root, ctx.unit)), "empty dirs pruned");
  assert.ok(fs.existsSync(archive) && fs.existsSync(manifest), "archive retained outside worktree");

  // restore into an isolated directory and compare bytes + mode
  const restore = fs.mkdtempSync(path.join(os.tmpdir(), "evidence-archive-restore-"));
  execFileSync("tar", ["-xzf", archive, "-C", restore]);
  const restored = path.join(restore, ctx.unit, "nested", "log.txt");
  assert.deepEqual(fs.readFileSync(restored), before, "restored bytes identical");
  assert.equal((fs.statSync(path.join(restore, ctx.unit, "result.json")).mode & 0o777).toString(8), beforeMode, "mode preserved");
});

test("archive image includes untracked and ignored files, and removal clears them too", () => {
  const ctx = makeRepo();
  // an ignored run log plus an untracked artifact: both are part of the historical material
  fs.writeFileSync(path.join(ctx.root, ".gitignore"), "*.log\n");
  fs.writeFileSync(path.join(ctx.root, ctx.unit, "run.log"), "ignored log\n");
  fs.writeFileSync(path.join(ctx.root, ctx.unit, "nested", "scratch.json"), "{}\n");
  execFileSync("git", ["add", "-A"], { cwd: ctx.root });
  execFileSync("git", ["commit", "-qm", "gitignore"], { cwd: ctx.root });
  fs.writeFileSync(path.join(ctx.root, ctx.unit, "later.log"), "still ignored\n");

  const { manifest } = packAll(ctx);
  const m = JSON.parse(fs.readFileSync(manifest, "utf8"));
  assert.equal(m.memberCount, 5, "all 5 on-disk files must be described");
  const report = path.join(ctx.archiveDir, "verify.json");
  assert.equal(verifyAll(ctx, "b1", report).code, 0, "archive must equal its manifest exactly");
  const r = run(ctx.root, ["remove", "b1", "--archive-dir", ctx.archiveDir, "--report", report]);
  assert.equal(r.code, 0, r.stderr);
  assert.ok(!fs.existsSync(path.join(ctx.root, ctx.unit)), "whole unit directory removed");
});

test("remove --dry-run reports the plan without touching the worktree", () => {
  const ctx = makeRepo();
  packAll(ctx);
  const report = path.join(ctx.archiveDir, "verify.json");
  verifyAll(ctx, "b1", report);
  const r = run(ctx.root, ["remove", "b1", "--archive-dir", ctx.archiveDir, "--report", report, "--dry-run"]);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).wouldRemove, 2);
  assert.ok(fs.existsSync(path.join(ctx.root, ctx.unit, "result.json")));
});
