import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";

// Git-native content identity. A "git-sha1" / "git-sha256" identity is the blob
// hash Git itself would record for the path (default clean filters), obtained
// from the index only when the path is provably complete, and from
// "git hash-object" otherwise. "sha256" is the disclosed fallback without Git.
export const GIT_SHA1 = "git-sha1";
export const GIT_SHA256 = "git-sha256";
export const SHA256 = "sha256";
export const UNRESOLVED = "unresolved";
const HEX_LENGTH = { "git-sha1": 40, "git-sha256": 64, sha256: 64 };
const IDENTITY_PATTERN = /^(git-sha1|git-sha256|sha256):([0-9a-f]+)$/;
const SKIP_NAMES = new Set([".DS_Store", "__pycache__", ".git"]);
const SKIP_FILE = /\.(iml|pyc|pyo)$/;

export function parseIdentity(value) {
  if (typeof value !== "string") return null;
  const match = IDENTITY_PATTERN.exec(value);
  if (!match) return null;
  if (match[2].length !== HEX_LENGTH[match[1]]) return null;
  return { algo: match[1], value: match[2] };
}
export function formatIdentity(algo, hex) {
  const length = HEX_LENGTH[algo];
  if (!length) throw new TypeError("未知身份算法: " + algo);
  if (typeof hex !== "string" || !new RegExp("^[0-9a-f]{" + length + "}$").test(hex)) {
    throw new TypeError("身份摘要非法: " + algo + ":" + hex);
  }
  return algo + ":" + hex;
}
export function identityEquals(left, right) {
  const a = parseIdentity(left);
  const b = parseIdentity(right);
  if (!a || !b) return left === right;
  return a.algo === b.algo && a.value === b.value;
}
export function sha256Identity(bytes) {
  return formatIdentity(SHA256, createHash("sha256").update(bytes).digest("hex"));
}
export function treeDigest(entries, algo = SHA256) {
  const digest = createHash(algo === GIT_SHA1 ? "sha1" : "sha256");
  const sorted = [...entries].sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  for (const entry of sorted) {
    digest.update(entry.path).update("\0").update(entry.kind).update("\0").update(entry.identity).update("\0");
  }
  return formatIdentity(algo, digest.digest("hex"));
}
export function treeFiles(directory, prefix = "") {
  if (!existsSync(directory)) return [];
  const collected = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (SKIP_NAMES.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    const rel = prefix ? prefix + "/" + entry.name : entry.name;
    if (SKIP_FILE.test(rel)) continue;
    if (entry.isDirectory()) collected.push(...treeFiles(absolute, rel));
    else if (entry.isFile() || entry.isSymbolicLink()) collected.push([rel, absolute]);
  }
  return collected;
}

function modeKind(mode) {
  if (mode === "120000") return "symlink";
  if (mode === "160000") return "gitlink";
  if (mode === "100755") return "exec";
  return "file";
}
function statKind(info) {
  if (info.isSymbolicLink()) return "symlink";
  return info.mode & 0o111 ? "exec" : "file";
}
// Mark a path and every ancestor directory. A directory may only trust the
// index when neither it nor any descendant is dirty, untracked or ignored —
// otherwise the index view would silently omit files the worktree has.
function markDirectories(target, ref) {
  target.add(ref);
  let cursor = ref;
  while (cursor.includes("/")) {
    cursor = cursor.slice(0, cursor.lastIndexOf("/"));
    if (!cursor) break;
    target.add(cursor);
  }
}

export function createIdentityProvider(root, { spawn = spawnSync } = {}) {
  // Compare against the canonical root: on macOS a /tmp path is really
  // /private/tmp, and a link inside the repository would otherwise look external.
  const realRoot = realpathOrResolve(root);
  const run = (args) => spawn("git", ["-C", root, ...args], { encoding: "buffer", maxBuffer: 128 * 1024 * 1024 });
  let available = false;
  let algo = SHA256;
  const index = new Map();
  const ignoredDirs = new Set();
  let dirty = null;
  let dirtyDirs = null;
  const visiting = new Set();

  function load() {
    index.clear();
    ignoredDirs.clear();
    visiting.clear();
    dirty = null;
    dirtyDirs = null;
    const probe = run(["rev-parse", "--is-inside-work-tree"]);
    available = probe.status === 0 && probe.stdout.toString("utf8").trim() === "true";
    algo = SHA256;
    if (!available) return;
    const format = run(["rev-parse", "--show-object-format"]);
    const name = format.status === 0 ? format.stdout.toString("utf8").trim() : "sha1";
    algo = name === "sha256" ? GIT_SHA256 : GIT_SHA1;
    const listed = run(["ls-files", "--stage", "-z"]);
    if (listed.status !== 0) { available = false; return; }
    for (const record of listed.stdout.toString("utf8").split("\0")) {
      if (!record) continue;
      const separator = record.indexOf("\t");
      if (separator < 0) continue;
      const [mode, sha] = record.slice(0, separator).split(" ");
      index.set(record.slice(separator + 1), { mode, sha });
    }
    const ignored = run(["ls-files", "-z", "--others", "--ignored", "--exclude-standard"]);
    if (ignored.status === 0) {
      for (const ref of ignored.stdout.toString("utf8").split("\0")) {
        if (ref) markDirectories(ignoredDirs, ref);
      }
    }
  }
  load();

  function dirtySet() {
    if (dirty) return dirty;
    dirty = new Set();
    dirtyDirs = new Set();
    if (available) {
      const status = run(["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
      if (status.status === 0) {
        const records = status.stdout.toString("utf8").split("\0");
        for (let cursor = 0; cursor < records.length; cursor += 1) {
          const record = records[cursor];
          if (record.length < 4) continue;
          const code = record.slice(0, 2);
          const ref = record.slice(3);
          if (code[0] === "?" || code[1] !== " ") { dirty.add(ref); markDirectories(dirtyDirs, ref); }
          if (code[0] === "R" || code[0] === "C") {
            cursor += 1;
            if (records[cursor]) { dirty.add(records[cursor]); markDirectories(dirtyDirs, records[cursor]); }
          }
        }
      }
    }
    return dirty;
  }

  function hashObject(absolute) {
    const result = spawn("git", ["-C", root, "hash-object", "--", absolute], { encoding: "utf8" });
    if (result.status !== 0) return null;
    const hex = result.stdout.trim();
    return new RegExp("^[0-9a-f]{" + HEX_LENGTH[algo] + "}$").test(hex) ? formatIdentity(algo, hex) : null;
  }

  function indexIdentity(ref) {
    const record = ref ? index.get(ref) : null;
    if (!record || dirtySet().has(ref)) return null;
    return formatIdentity(algo, record.sha);
  }

  function fileFromAbsolute(absolute, ref) {
    const fromIndex = indexIdentity(ref);
    if (fromIndex) return fromIndex;
    if (available) {
      const hashed = hashObject(absolute);
      if (hashed) return hashed;
    }
    try { return sha256Identity(readFileSync(absolute)); } catch { return null; }
  }

  function symlinkIdentity(absolute) {
    let resolved;
    try { resolved = realpathSync(absolute); } catch { return null; }
    if (visiting.has(resolved)) return null;
    visiting.add(resolved);
    try {
      const info = lstatSync(resolved);
      const rel = path.relative(realRoot, resolved).split(path.sep).join("/");
      // A link that leaves the repository (or points at the root itself) is never
      // enumerated: walking it would be unbounded. A directory legitimately named
      // like "..data" is still inside, so only the ".." path segment is rejected.
      const inside = rel !== "" && rel !== ".." && !rel.startsWith("../") && !path.isAbsolute(rel);
      if (!inside) return null;
      if (info.isDirectory()) return directoryIdentity(rel, resolved).identity;
      return fileFromAbsolute(resolved, rel);
    } finally {
      visiting.delete(resolved);
    }
  }

  function unresolvedEntry(rel, info) {
    return { path: rel, kind: info.isSymbolicLink() ? "symlink" : "file", identity: UNRESOLVED };
  }

  function directoryEntries(absolute, ref) {
    dirtySet();
    const complete = ref && !dirtyDirs.has(ref) && !ignoredDirs.has(ref);
    if (complete) {
      const candidates = [];
      for (const [candidate, record] of index) {
        if (candidate.startsWith(ref + "/")) candidates.push([candidate, record]);
      }
      if (candidates.length) {
        const entries = candidates.map(([candidate, record]) => {
          const rel = candidate.slice(ref.length + 1);
          const kind = modeKind(record.mode);
          if (kind === "symlink") {
            const resolvedIdentity = symlinkIdentity(path.join(root, candidate));
            return resolvedIdentity ? { path: rel, kind, identity: resolvedIdentity } : { path: rel, kind, identity: UNRESOLVED };
          }
          return { path: rel, kind, identity: formatIdentity(algo, record.sha) };
        });
        return { entries, source: "index" };
      }
    }
    const entries = treeFiles(absolute).map(([rel, file]) => {
      const info = lstatSync(file);
      if (info.isSymbolicLink()) {
        const identity = symlinkIdentity(file);
        return identity ? { path: rel, kind: "symlink", identity } : unresolvedEntry(rel, info);
      }
      const identity = fileFromAbsolute(file, ref ? ref + "/" + rel : null);
      return identity ? { path: rel, kind: statKind(info), identity } : unresolvedEntry(rel, info);
    });
    return { entries, source: available ? "worktree" : "sha256-fallback" };
  }

  function directoryIdentity(ref, absolute = path.join(root, ref)) {
    const { entries, source } = directoryEntries(absolute, ref);
    return { identity: treeDigest(entries, available ? algo : SHA256), kind: "dir", source };
  }

  function identityFor(ref) {
    const absolute = path.isAbsolute(ref) ? ref : path.join(root, ref);
    const info = lstatSafe(absolute);
    if (!info) return { identity: null, kind: "missing", source: available ? "index" : "sha256-fallback" };
    if (info.isSymbolicLink()) {
      const identity = symlinkIdentity(absolute);
      return { identity, kind: "symlink", source: identity ? (available ? "worktree" : "sha256-fallback") : "unresolved" };
    }
    if (info.isDirectory()) return directoryIdentity(ref, absolute);
    const identity = fileFromAbsolute(absolute, ref);
    return { identity, kind: statKind(info), source: indexIdentity(ref) ? "index" : (available ? "worktree" : "sha256-fallback") };
  }

  return {
    get available() { return available; },
    get algo() { return available ? algo : SHA256; },
    get root() { return root; },
    indexSize: () => index.size,
    refresh: () => { load(); },
    identityFor,
    file: (ref) => identityFor(ref).identity,
    directory: (ref) => directoryIdentity(ref).identity,
    equals: (left, right) => identityEquals(identityFor(left).identity, identityFor(right).identity),
  };
}

function realpathOrResolve(target) {
  try { return realpathSync(target); } catch { return path.resolve(target); }
}

function lstatSafe(target) {
  try { return lstatSync(target); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
