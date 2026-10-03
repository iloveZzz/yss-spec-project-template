import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { createIdentityProvider, sha256Identity } from "../scripts/lib/content-identity.mjs";
import { buildDriftReport, driftReportExit, expectedFromDistribution, formatDriftReport } from "../scripts/lib/drift-report.mjs";

function git(root, args) {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}

test("a clean instance reports ok and exits zero", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "yss-drift-clean-"));
  try {
    git(root, ["init", "-q"]);
    mkdirSync(path.join(root, ".agents/skills/probe"), { recursive: true });
    writeFileSync(path.join(root, ".agents/skills/probe/SKILL.md"), "probe\n");
    git(root, ["add", ".agents/skills/probe"]);
    const provider = createIdentityProvider(root);
    const managedFiles = { ".agents/skills/probe/SKILL.md": { type: "copy", identity: provider.file(".agents/skills/probe/SKILL.md") } };
    const report = buildDriftReport({ scope: "project-instance", root, managedFiles, provider });
    assert.equal(report.summary.ok, 1);
    assert.equal(report.summary.drifted, 0);
    assert.equal(driftReportExit(report), 0);
    assert.equal(report.identity.algo, "git-sha1");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("bare sha256 contentHash written by the CLI is not a false drift", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "yss-drift-bare-"));
  try {
    const bytes = Buffer.from("manifest body\n");
    writeFileSync(path.join(root, "managed.txt"), bytes);
    const bare = sha256Identity(bytes).slice("sha256:".length);
    const report = buildDriftReport({ scope: "project-instance", root, managedFiles: { "managed.txt": { type: "copy", contentHash: bare } } });
    assert.equal(report.summary.drifted, 0);
    assert.equal(report.summary.ok, 1);
    assert.equal(driftReportExit(report), 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("hand-edited managed assets are reported as drifted (reverse test)", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "yss-drift-edited-"));
  try {
    git(root, ["init", "-q"]);
    mkdirSync(path.join(root, ".agents/skills/probe"), { recursive: true });
    const file = path.join(root, ".agents/skills/probe/SKILL.md");
    writeFileSync(file, "original\n");
    git(root, ["add", ".agents/skills/probe"]);
    const recorded = createIdentityProvider(root).file(".agents/skills/probe/SKILL.md");
    writeFileSync(file, "hand edited\n");
    const provider = createIdentityProvider(root);
    const report = buildDriftReport({ scope: "project-instance", root, managedFiles: { ".agents/skills/probe/SKILL.md": { contentHash: recorded } }, provider });
    assert.equal(report.summary.drifted, 1);
    assert.equal(driftReportExit(report), 1);
    assert.match(formatDriftReport(report), /drifted: .agents\/skills\/probe\/SKILL\.md/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("deleted managed assets are missing and never silently ignored", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "yss-drift-missing-"));
  try {
    git(root, ["init", "-q"]);
    const report = buildDriftReport({ scope: "project-instance", root, managedFiles: { ".agents/skills/gone/SKILL.md": { identity: "git-sha1:" + "a".repeat(40) } } });
    assert.equal(report.summary.missing, 1);
    assert.equal(driftReportExit(report), 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("expected-but-unrecorded assets are not-installed, distinct from missing", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "yss-drift-uninstalled-"));
  try {
    git(root, ["init", "-q"]);
    const report = buildDriftReport({
      scope: "project-instance",
      root,
      managedFiles: {},
      expected: expectedFromDistribution({ distribution: { installedSkills: ["yss-research"] } }),
    });
    assert.equal(report.summary.not_installed, 1);
    assert.equal(report.summary.missing, 0);
    assert.equal(report.entries[0].kind, "not-installed");
    // A skill declared installed but neither recorded nor present is a gate failure.
    assert.equal(driftReportExit(report), 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
