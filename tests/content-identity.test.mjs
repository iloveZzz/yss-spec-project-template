import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import {
  GIT_SHA1, SHA256, createIdentityProvider, formatIdentity, identityEquals, parseIdentity, sha256Identity, treeDigest,
} from "../scripts/lib/content-identity.mjs";

function git(root, args) {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test("identity literals parse, format and compare without mixing algorithms", () => {
  assert.deepEqual(parseIdentity(GIT_SHA1 + ":" + "a".repeat(40)), { algo: GIT_SHA1, value: "a".repeat(40) });
  assert.equal(parseIdentity("sha256:" + "a".repeat(40)), null);
  assert.equal(parseIdentity(GIT_SHA1 + ":" + "a".repeat(64)), null);
  assert.equal(parseIdentity("a".repeat(40)), null);
  assert.throws(() => formatIdentity(GIT_SHA1, "a".repeat(64)), /身份摘要非法/);
  assert.equal(identityEquals(GIT_SHA1 + ":" + "a".repeat(40), GIT_SHA1 + ":" + "a".repeat(40)), true);
  assert.equal(identityEquals(GIT_SHA1 + ":" + "a".repeat(40), "sha256:" + "a".repeat(40)), false);
  assert.equal(identityEquals("not-an-identity", "not-an-identity"), true);
  assert.equal(identityEquals(null, null), true);
  assert.equal(identityEquals(null, GIT_SHA1 + ":" + "a".repeat(40)), false);
});

test("treeDigest is order independent, content sensitive and algorithm tagged", () => {
  const entries = [
    { path: "a.md", kind: "file", identity: GIT_SHA1 + ":" + "1".repeat(40) },
    { path: "b/c.md", kind: "file", identity: GIT_SHA1 + ":" + "2".repeat(40) },
  ];
  const digest = treeDigest(entries);
  assert.equal(digest, treeDigest([...entries].reverse()));
  assert.match(digest, /^sha256:[0-9a-f]{64}$/);
  assert.notEqual(digest, treeDigest([entries[0]]));
  assert.match(treeDigest(entries, GIT_SHA1), /^git-sha1:[0-9a-f]{40}$/);
});

test("self-referential and ancestor symlinks terminate instead of recursing", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "yss-identity-cycle-"));
  try {
    git(root, ["init", "-q"]);
    mkdirSync(path.join(root, "dir"), { recursive: true });
    writeFileSync(path.join(root, "dir/payload.txt"), "payload\n");
    symlinkSync(".", path.join(root, "dir/self"));
    symlinkSync("..", path.join(root, "dir/up"));
    const provider = createIdentityProvider(root);
    const identity = provider.directory("dir");
    assert.match(identity, /^(git-sha1:[0-9a-f]{40}|sha256:[0-9a-f]{64})$/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("one tree has one identity whether read from the index or the worktree", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "yss-identity-source-"));
  try {
    git(root, ["init", "-q"]);
    writeFileSync(path.join(root, ".gitignore"), "__pycache__/\n");
    for (const copy of ["a", "b"]) {
      mkdirSync(path.join(root, copy), { recursive: true });
      writeFileSync(path.join(root, copy, "run.sh"), "#!/bin/sh\n");
      writeFileSync(path.join(root, copy, "payload.txt"), "payload\n");
      symlinkSync("payload.txt", path.join(root, copy, "link.txt"));
      git(root, ["add", copy, ".gitignore"]);
    }
    const clean = createIdentityProvider(root);
    const fromIndex = clean.directory("a");
    assert.equal(clean.identityFor("a").source, "index");
    // An ignored, treeFiles-skipped file makes "b" dirty, forcing the worktree path.
    writeFileSync(path.join(root, "b/stale.pyc"), "x");
    const dirty = createIdentityProvider(root);
    assert.equal(dirty.identityFor("b").source, "worktree");
    assert.equal(dirty.directory("b"), fromIndex);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a broken symlink changes the directory identity instead of vanishing", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "yss-identity-broken-"));
  try {
    mkdirSync(path.join(root, "with"), { recursive: true });
    mkdirSync(path.join(root, "without"), { recursive: true });
    writeFileSync(path.join(root, "with/payload.txt"), "payload\n");
    writeFileSync(path.join(root, "without/payload.txt"), "payload\n");
    symlinkSync("missing.txt", path.join(root, "with/dead"));
    const provider = createIdentityProvider(root);
    assert.notEqual(provider.directory("with"), provider.directory("without"));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("git provider reads committed identity from the index and hashes dirty work", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "yss-identity-"));
  try {
    git(root, ["init", "-q"]);
    mkdirSync(path.join(root, ".agents/skills/probe"), { recursive: true });
    writeFileSync(path.join(root, ".agents/skills/probe/SKILL.md"), "---\nname: probe\n---\n");
    writeFileSync(path.join(root, ".agents/skills/probe/references.md"), "reference\n");
    git(root, ["add", ".agents/skills/probe"]);
    const provider = createIdentityProvider(root);
    assert.equal(provider.available, true);
    assert.equal(provider.algo, GIT_SHA1);
    const staged = git(root, ["ls-files", "--stage", "--", ".agents/skills/probe/SKILL.md"]).split(" ")[1];
    assert.equal(provider.file(".agents/skills/probe/SKILL.md"), GIT_SHA1 + ":" + staged);
    const clean = provider.directory(".agents/skills/probe");
    assert.equal(provider.identityFor(".agents/skills/probe").source, "index");
    cpSync(path.join(root, ".agents/skills/probe"), path.join(root, ".codex/skills/probe"), { recursive: true });
    git(root, ["add", ".codex/skills/probe"]);
    assert.equal(provider.directory(".codex/skills/probe"), clean);
    writeFileSync(path.join(root, ".codex/skills/probe/references.md"), "edited\n");
    provider.refresh();
    assert.notEqual(provider.file(".codex/skills/probe/references.md"), provider.file(".agents/skills/probe/references.md"));
    mkdirSync(path.join(root, ".pi/skills"), { recursive: true });
    symlinkSync("../../.agents/skills/probe", path.join(root, ".pi/skills/probe"), "dir");
    assert.equal(provider.directory(".pi/skills/probe"), clean);
    assert.equal(provider.identityFor(".pi/skills/probe").kind, "symlink");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("untracked files still receive git identity; missing paths yield null", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "yss-identity-untracked-"));
  try {
    git(root, ["init", "-q"]);
    writeFileSync(path.join(root, "loose.txt"), "loose\n");
    const provider = createIdentityProvider(root);
    assert.equal(provider.file("loose.txt"), GIT_SHA1 + ":" + git(root, ["hash-object", "--", "loose.txt"]));
    assert.equal(provider.identityFor("loose.txt").source, "worktree");
    assert.equal(provider.file("missing.txt"), null);
    assert.equal(provider.identityFor("missing.txt").kind, "missing");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("non-repository roots fall back to a disclosed sha256 identity", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "yss-identity-plain-"));
  try {
    writeFileSync(path.join(root, "note.md"), "plain\n");
    const provider = createIdentityProvider(root);
    assert.equal(provider.available, false);
    assert.equal(provider.algo, SHA256);
    assert.equal(provider.file("note.md"), sha256Identity(Buffer.from("plain\n")));
    assert.match(provider.directory("."), /^sha256:[0-9a-f]{64}$/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("an ignored file changes the directory identity instead of hiding drift", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "yss-identity-ignored-"));
  try {
    git(root, ["init", "-q"]);
    writeFileSync(path.join(root, ".gitignore"), ".env\n");
    for (const copy of ["src", "tgt"]) {
      mkdirSync(path.join(root, copy), { recursive: true });
      writeFileSync(path.join(root, copy, "SKILL.md"), "skill\n");
    }
    writeFileSync(path.join(root, "src/.env"), "SECRET=1\n");
    git(root, ["add", ".gitignore", "src/SKILL.md", "tgt/SKILL.md"]);
    const provider = createIdentityProvider(root);
    assert.notEqual(provider.directory("src"), provider.directory("tgt"));
    writeFileSync(path.join(root, "tgt/.env"), "SECRET=1\n");
    provider.refresh();
    assert.equal(provider.directory("src"), provider.directory("tgt"));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
