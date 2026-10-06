import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { createIdentityProvider, sha256Identity } from "../scripts/lib/content-identity.mjs";
import { buildDriftReport, canonicalManagedMode, driftReportExit, expectedFromDistribution, formatDriftReport } from "../scripts/lib/drift-report.mjs";

test('原生 full 分发的平台专属嵌套组按声明平台叶子检查，不虚构共享 SKILL', () => {
  // B18 public Bundle and its real --full Spec instance install product-design
  // as a nested Codex group, with no canonical or platform-root SKILL.md.
  const ref = '.codex/skills/product-design/skills/index/SKILL.md';
  const sourceRef = '.codex/skills/product-design/.codex-plugin/plugin.json';
  const record = { ownership: 'managed', baseline: { type: 'file', digest: 'a'.repeat(64), mode: 0o644 },
    lastApplied: { type: 'file', digest: 'a'.repeat(64), mode: 0o644 } };
  const metadata = { distribution: { installedSkills: ['product-design'], runtimes: ['codex'] }, managedFiles: { [ref]: record, [sourceRef]: record } };
  const skillLock = { version: 3, canonicalRoot: '.agents/skills', projectionRoots: ['.codex/skills'],
    skills: { shared: {}, platform: { '.codex/skills': { 'product-design': { targets: ['.codex/skills'] } } } } };
  assert.deepEqual(expectedFromDistribution(metadata, { native: true, skillLock,
    platformSkills: [{ id: 'product-design', root: '.codex/skills', aliases: ['product-design:index'] }],
    platformManifests: { '.codex/skills/product-design': { skills: './skills/' } } }), [sourceRef, ref]);
});

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

test('原生 lastApplied 优先于模板 baseline 与旧 contentHash，真实字节变化仍拒绝', t => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'yss-drift-native-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(path.join(root, 'managed.txt'), 'applied native bytes\n', { mode: 0o644 });
  const managedFiles = { 'managed.txt': {
    ownership: 'managed', contentHash: sha256Identity('old legacy bytes\n'),
    baseline: { type: 'file', digest: sha256Identity('template bytes\n').slice(7), mode: 0o644 },
    lastApplied: { type: 'file', digest: sha256Identity('applied native bytes\n').slice(7), mode: 0o644 },
  } };
  const report = () => buildDriftReport({ scope: 'project-instance', root, managedFiles });
  assert.equal(driftReportExit(report()), 0);
  writeFileSync(path.join(root, 'managed.txt'), 'later hand edit\n');
  assert.equal(driftReportExit(report()), 1);
  assert.equal(report().entries[0].kind, 'drifted');
});

test('受管权限复用 Go FileMode 平台合同的固定示例，Windows 仅保留只读能力', async t => {
  const examples = [
    ['Windows writable stat 0666', 0o666, 'win32', 0o644],
    ['Windows executable source 0755', 0o755, 'win32', 0o644],
    ['Windows owner-write-only', 0o200, 'win32', 0o644],
    ['Windows readonly stat 0444', 0o444, 'win32', 0o444],
    ['Windows executable readonly', 0o555, 'win32', 0o444],
    ['POSIX executable source', 0o755, 'darwin', 0o755],
    ['POSIX custom group permission', 0o640, 'linux', 0o640],
    ['POSIX special bits excluded by descriptor contract', 0o4755, 'linux', 0o755],
  ];
  for (const [name, mode, platform, expected] of examples) await t.test(name, () => {
    assert.equal(canonicalManagedMode(mode, platform), expected);
  });
});

test('独立内容校验不豁免当前可读性，缓存 identity 不能让不可读锁通过', {
  skip: process.platform === 'win32' || process.getuid?.() === 0,
}, t => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'yss-drift-canonical-unreadable-'));
  const file = path.join(root, 'skills-lock.json');
  t.after(() => { chmodSync(file, 0o600); rmSync(root, { recursive: true, force: true }); });
  writeFileSync(file, '{}\n'); chmodSync(file, 0);
  // This public report seam deliberately has no mode descriptor, isolating
  // readability from permission drift rather than obtaining an accidental fail.
  const report = buildDriftReport({ scope: 'project-instance', root,
    managedFiles: { 'skills-lock.json': { contentHash: sha256Identity('{}\n'), ownership: 'generated' } },
    contentValidatedRefs: ['skills-lock.json'],
    provider: { available: true, algo: 'git-sha1', identityFor: () => ({ identity: 'git-sha1:' + 'a'.repeat(40) }) } });
  assert.equal(report.entries[0].kind, 'drifted');
  assert.match(report.entries[0].error, /EACCES|EPERM/);
  assert.equal(driftReportExit(report), 1);
});
