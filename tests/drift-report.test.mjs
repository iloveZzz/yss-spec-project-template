import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
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

test("instance verification permits preserved custom content while auditing and generated assets stay hash-gated", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "yss-drift-customization-"));
  try {
    writeFileSync(path.join(root, "AGENTS.md"), "project extension\n");
    writeFileSync(path.join(root, "generated.txt"), "tampered generation\n");
    const managedFiles = {
      "AGENTS.md": { ownership: "managed-customizable", identity: sha256Identity("template rules\n") },
      "generated.txt": { ownership: "generated", identity: sha256Identity("approved generation\n") },
    };
    const report = buildDriftReport({ scope: "project-instance", root, managedFiles, allowCustomizations: true });
    const custom = report.entries.find(entry => entry.ref === "AGENTS.md");
    assert.equal(custom.kind, "ok");
    assert.equal(custom.expected, null);
    assert.ok(custom.actual);
    assert.equal(report.entries.find(entry => entry.ref === "generated.txt").kind, "drifted");
    assert.equal(driftReportExit(report), 1);
    const audit = buildDriftReport({ scope: "project-instance", root, managedFiles });
    assert.equal(audit.entries.find(entry => entry.ref === "AGENTS.md").kind, "drifted");
    const template = buildDriftReport({ scope: "template-source", root, managedFiles, allowCustomizations: true });
    assert.equal(template.entries.find(entry => entry.ref === "AGENTS.md").kind, "drifted");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("customizable assets remain required and cannot become directories or symlinks", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "yss-drift-custom-types-"));
  try {
    mkdirSync(path.join(root, "directory.md"));
    symlinkSync("missing-target", path.join(root, "link.md"));
    const managedFiles = Object.fromEntries(["missing.md", "directory.md", "link.md"].map(ref => [ref, {
      ownership: "managed-customizable", identity: sha256Identity("original\n"),
    }]));
    const report = buildDriftReport({ scope: "project-instance", root, managedFiles, allowCustomizations: true });
    assert.equal(report.entries.find(entry => entry.ref === "missing.md").kind, "missing");
    assert.equal(report.entries.find(entry => entry.ref === "directory.md").kind, "drifted");
    assert.equal(report.entries.find(entry => entry.ref === "link.md").kind, "drifted");
    assert.equal(driftReportExit(report), 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("an unreadable customizable file is rejected even when the identity provider has a cached digest", {
  skip: process.platform === "win32" || process.getuid?.() === 0,
}, () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "yss-drift-custom-unreadable-"));
  const file = path.join(root, "AGENTS.md");
  try {
    writeFileSync(file, "custom rules\n");
    chmodSync(file, 0);
    const provider = { available: true, algo: "git-sha1", identityFor: () => ({ identity: "git-sha1:" + "a".repeat(40) }) };
    const report = buildDriftReport({ scope: "project-instance", root, provider, allowCustomizations: true,
      managedFiles: { "AGENTS.md": { ownership: "managed-customizable", identity: sha256Identity("template\n") } } });
    assert.equal(report.entries[0].kind, "drifted");
    assert.equal(report.entries[0].actual, null);
    assert.match(report.entries[0].error, /EACCES|EPERM/);
    assert.equal(driftReportExit(report), 1);
  } finally {
    chmodSync(file, 0o600);
    rmSync(root, { recursive: true, force: true });
  }
});
