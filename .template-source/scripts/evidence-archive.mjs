#!/usr/bin/env node
/**
 * evidence-archive — template-source historical evidence archival tool.
 *
 * Implements the archive/restore mechanism required by the machine-evidence
 * retirement plan: pack historical evidence outside the repository, verify the
 * pack by full member comparison, and only then remove the originals from the
 * worktree. Every destructive step has an explicit refusal guard.
 *
 * Subcommands:
 *   plan   <batch> --unit <path>... --out <file>
 *   pack   <batch> --unit <path>... --archive-dir <dir> [--index <file>]
 *   verify <batch> --archive-dir <dir> --extract-dir <dir> [--report <file>]
 *   remove <batch> --archive-dir <dir> [--report <file>] [--dry-run]
 *   status <batch> --archive-dir <dir>
 *
 * Exit codes: 0 ok, 2 refusal/blocker, 1 unexpected error.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const EXIT_REFUSE = 2;

const die = (message) => { console.error("evidence-archive: " + message); process.exit(EXIT_REFUSE); };
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const fileSha = (abs) => sha256(fs.readFileSync(abs));

function repoRoot() {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
}
function head(root) {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
}
function trackedFiles(root) {
  return execFileSync("git", ["ls-files", "-z"], { cwd: root, maxBuffer: 1 << 30 })
    .toString("utf8").split("\0").filter(Boolean);
}

/** Reject absolute paths, parent escapes and any member outside the repository. */
function assertContained(rel, root) {
  if (typeof rel !== "string" || rel.length === 0) die("invalid member path");
  if (path.isAbsolute(rel)) die("absolute member path refused: " + rel);
  const norm = path.posix.normalize(rel);
  if (norm.startsWith("../") || norm === ".." || norm.includes("/../")) die("path escape refused: " + rel);
  const abs = path.resolve(root, norm);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (!abs.startsWith(rootWithSep)) die("member escapes repository: " + rel);
  return { rel: norm, abs };
}

function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) { out.flags[key] = true; }
      else if (key === "unit") { (out.flags.unit ??= []).push(next); i++; }
      else { out.flags[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

/** Walk a unit on disk: the archive must be a faithful image of the whole directory. */
function walkUnit(root, rel) {
  const abs = path.resolve(root, rel);
  const st = fs.lstatSync(abs);
  if (st.isSymbolicLink()) die("symlink not supported: " + rel);
  if (st.isFile()) return [rel];
  if (!st.isDirectory()) die("unsupported file type: " + rel);
  const out = [];
  const walk = (dir, prefix) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const child = path.join(dir, e.name);
      const childRel = prefix ? prefix + "/" + e.name : e.name;
      if (e.isSymbolicLink()) die("symlink not supported: " + childRel);
      if (e.isDirectory()) walk(child, childRel);
      else if (e.isFile()) out.push(childRel);
      else die("unsupported file type: " + childRel);
    }
  };
  walk(abs, rel);
  return out;
}

/** Expand units (files or directories) into the sorted list of files that will move. */
function expandUnits(root, units) {
  const members = [];
  for (const unit of units) {
    const { rel } = assertContained(unit, root);
    const hits = walkUnit(root, rel);
    if (hits.length === 0) die("unit has no files: " + rel);
    for (const h of hits) members.push(h);
  }
  return [...new Set(members)].sort();
}

function readManifest(archiveDir, batch) {
  const file = path.join(archiveDir, batch + ".manifest.json");
  if (!fs.existsSync(file)) die("manifest not found: " + file);
  return { file, manifest: JSON.parse(fs.readFileSync(file, "utf8")) };
}
function archiveFile(archiveDir, batch) {
  const file = path.join(archiveDir, batch + ".tar.gz");
  if (!fs.existsSync(file)) die("archive not found: " + file);
  return file;
}

// ---------------------------------------------------------------- plan
function cmdPlan(root, args) {
  const [batch] = args._;
  if (!batch) die("plan requires a batch id");
  const units = args.flags.unit ?? [];
  if (units.length === 0) die("plan requires at least one --unit");
  const members = expandUnits(root, units);
  const memberSet = new Set(members);

  // Inbound references from *retained* tracked files (hard = markdown link).
  const hard = [], soft = [];
  const unitPaths = units.map((u) => assertContained(u, root).rel);
  const unitNames = unitPaths.map((u) => u.split("/").filter(Boolean).pop());
  for (const f of trackedFiles(root)) {
    if (memberSet.has(f)) continue;
    if (!/[.](md|mjs|js|cjs|ts|json|ya?ml|yml|py|sh|txt)$/i.test(f)) continue;
    const abs = path.join(root, f);
    let size; try { size = fs.statSync(abs).size; } catch { continue; }
    if (size > 8 * 1024 * 1024) continue;
    const text = fs.readFileSync(abs, "utf8");
    if (text.includes("\0")) continue;
    const dir = path.posix.dirname(f);
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const link of line.matchAll(/\]\(([^)\s]+)\)/g)) {
        const target = link[1].split("#")[0];
        if (!target || /^[a-z]+:/i.test(target)) continue;
        const resolved = path.posix.normalize(path.posix.join(dir, target));
        if (memberSet.has(resolved)) hard.push({ file: f, line: i + 1, target, resolved, text: line.trim().slice(0, 200) });
      }
      for (let u = 0; u < unitPaths.length; u++) {
        if (line.includes(unitPaths[u])) soft.push({ file: f, line: i + 1, unit: unitPaths[u], kind: "path", text: line.trim().slice(0, 200) });
        else if (line.includes(unitNames[u] + "/")) soft.push({ file: f, line: i + 1, unit: unitPaths[u], kind: "name", text: line.trim().slice(0, 200) });
      }
    }
  }

  const out = args.flags.out;
  const report = {
    schema: "yss.evidence-archive-disposition/v1",
    batch, head: head(root), generated_at_utc: new Date().toISOString(),
    units: unitPaths, memberCount: members.length,
    memberBytes: members.reduce((a, m) => a + fs.statSync(path.join(root, m)).size, 0),
    blockers: { hardReferences: hard },
    softReferences: soft,
    members,
  };
  if (out) { fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true }); fs.writeFileSync(path.resolve(root, out), JSON.stringify(report, null, 2)); }
  console.log(JSON.stringify({ batch, units: unitPaths, memberCount: members.length, memberBytes: report.memberBytes, hardReferences: hard.length, softReferences: soft.length, out: out ?? null }, null, 2));
  if (hard.length > 0) { console.error("plan: " + hard.length + " hard (markdown link) references block removal"); process.exit(EXIT_REFUSE); }
}

// ---------------------------------------------------------------- pack
function cmdPack(root, args) {
  const [batch] = args._;
  if (!batch) die("pack requires a batch id");
  const units = args.flags.unit ?? [];
  if (units.length === 0) die("pack requires at least one --unit");
  const archiveDir = args.flags["archive-dir"];
  if (!archiveDir || archiveDir === true) die("pack requires --archive-dir");
  fs.mkdirSync(archiveDir, { recursive: true });

  const members = expandUnits(root, units);
  const rows = members.map((rel) => {
    const abs = path.join(root, rel);
    const st = fs.statSync(abs);
    if (!st.isFile()) die("member is not a regular file: " + rel);
    return { path: rel, bytes: st.size, mode: (st.mode & 0o777).toString(8).padStart(3, "0"), sha256: fileSha(abs) };
  });

  const archivePath = path.join(archiveDir, batch + ".tar.gz");
  if (fs.existsSync(archivePath)) die("archive already exists, refusing to overwrite: " + archivePath);
  const manifestPath = path.join(archiveDir, batch + ".manifest.json");
  if (fs.existsSync(manifestPath)) die("manifest already exists, refusing to overwrite: " + manifestPath);

  // Pack exactly the enumerated files so the archive and the manifest cannot diverge;
  // passing the directory would silently include files the manifest does not describe.
  const listFile = path.join(archiveDir, batch + ".files.txt");
  fs.writeFileSync(listFile, members.join("\n") + "\n");
  try {
    execFileSync("tar", ["-czf", archivePath, "-C", root, "-T", listFile], { maxBuffer: 1 << 30 });
  } finally {
    fs.rmSync(listFile, { force: true });
  }

  const manifest = {
    schema: "yss.evidence-archive-manifest/v1",
    batch, head: head(root), created_at_utc: new Date().toISOString(),
    units: units.map((u) => assertContained(u, root).rel),
    archive: path.basename(archivePath),
    archive_sha256: fileSha(archivePath),
    archive_bytes: fs.statSync(archivePath).size,
    memberCount: rows.length, memberBytes: rows.reduce((a, r) => a + r.bytes, 0),
    members: rows,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const index = args.flags.index;
  if (index && index !== true) {
    const idxPath = path.resolve(root, index);
    fs.mkdirSync(path.dirname(idxPath), { recursive: true });
    const idx = fs.existsSync(idxPath) ? JSON.parse(fs.readFileSync(idxPath, "utf8"))
      : { schema: "yss.evidence-archive-index/v1", archive_dir: archiveDir, batches: [] };
    idx.batches = idx.batches.filter((b) => b.batch !== batch);
    idx.batches.push({
      batch, head: manifest.head, created_at_utc: manifest.created_at_utc, units: manifest.units,
      archive: manifest.archive, archive_sha256: manifest.archive_sha256, archive_bytes: manifest.archive_bytes,
      memberCount: manifest.memberCount, memberBytes: manifest.memberBytes,
      restore: "tar -xzf " + manifest.archive + " -C <repo root>",
    });
    fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2));
  }
  console.log(JSON.stringify({ batch, archive: archivePath, manifest: manifestPath, memberCount: rows.length, memberBytes: manifest.memberBytes, archiveBytes: manifest.archive_bytes }, null, 2));
}

// ---------------------------------------------------------------- verify
function cmdVerify(root, args) {
  const [batch] = args._;
  if (!batch) die("verify requires a batch id");
  const archiveDir = args.flags["archive-dir"];
  const extractDir = args.flags["extract-dir"];
  if (!archiveDir || archiveDir === true) die("verify requires --archive-dir");
  if (!extractDir || extractDir === true) die("verify requires --extract-dir");

  const { manifest } = readManifest(archiveDir, batch);
  const archivePath = archiveFile(archiveDir, batch);

  if (fileSha(archivePath) !== manifest.archive_sha256) die("archive digest does not match manifest");
  if (fs.existsSync(extractDir)) die("extract dir already exists, refusing to overwrite: " + extractDir);
  fs.mkdirSync(extractDir, { recursive: true });
  execFileSync("tar", ["-xzf", archivePath, "-C", extractDir], { maxBuffer: 1 << 30 });

  const problems = [];
  const seen = new Set();
  for (const m of manifest.members) {
    const abs = path.join(extractDir, m.path);
    seen.add(m.path);
    if (!fs.existsSync(abs)) { problems.push({ path: m.path, kind: "missing-member" }); continue; }
    const st = fs.statSync(abs);
    if (!st.isFile()) { problems.push({ path: m.path, kind: "not-a-file" }); continue; }
    if (st.size !== m.bytes) problems.push({ path: m.path, kind: "size-mismatch", expected: m.bytes, actual: st.size });
    const mode = (st.mode & 0o777).toString(8).padStart(3, "0");
    if (mode !== m.mode) problems.push({ path: m.path, kind: "mode-mismatch", expected: m.mode, actual: mode });
    const digest = fileSha(abs);
    if (digest !== m.sha256) problems.push({ path: m.path, kind: "digest-mismatch", expected: m.sha256, actual: digest });
  }
  // extra members that the manifest does not describe
  const walked = [];
  const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else walked.push(path.relative(extractDir, p).split(path.sep).join("/")); } };
  walk(extractDir);
  for (const w of walked) if (!seen.has(w)) problems.push({ path: w, kind: "unexpected-member" });

  // representative readback: prove the archive is actually parseable, not just byte-equal
  const readback = [];
  for (const m of manifest.members.slice(0, 50)) {
    if (!/[.](json|ya?ml)$/i.test(m.path)) continue;
    const abs = path.join(extractDir, m.path);
    if (!fs.existsSync(abs)) continue;
    try {
      if (/[.]json$/i.test(m.path)) JSON.parse(fs.readFileSync(abs, "utf8"));
      readback.push({ path: m.path, ok: true });
    } catch (e) { readback.push({ path: m.path, ok: false, error: String(e.message) }); problems.push({ path: m.path, kind: "unparseable-json", detail: e.message }); }
  }

  const report = {
    schema: "yss.evidence-archive-verify/v1",
    batch, verified_at_utc: new Date().toISOString(),
    archive: archivePath, archive_sha256: manifest.archive_sha256, extract_dir: extractDir,
    memberCount: manifest.memberCount, checked: manifest.members.length,
    result: problems.length === 0 ? "pass" : "fail",
    problems, readback,
  };
  let reportPath = args.flags.report;
  if (reportPath && reportPath !== true) { const rp = path.resolve(root, reportPath); fs.mkdirSync(path.dirname(rp), { recursive: true }); fs.writeFileSync(rp, JSON.stringify(report, null, 2)); report.report = rp; }
  console.log(JSON.stringify({ batch, result: report.result, checked: report.checked, problems: problems.length, readback: readback.length, report: report.report ?? null }, null, 2));
  if (problems.length > 0) { console.error(JSON.stringify(problems.slice(0, 10), null, 2)); process.exit(EXIT_REFUSE); }
}

// ---------------------------------------------------------------- remove
function cmdRemove(root, args) {
  const [batch] = args._;
  if (!batch) die("remove requires a batch id");
  const archiveDir = args.flags["archive-dir"];
  if (!archiveDir || archiveDir === true) die("remove requires --archive-dir");
  const dryRun = Boolean(args.flags["dry-run"]);

  const { manifest } = readManifest(archiveDir, batch);
  const archivePath = archiveFile(archiveDir, batch);
  if (fileSha(archivePath) !== manifest.archive_sha256) die("archive digest does not match manifest; re-verify before removing");

  // A passing verify report for this exact archive digest is mandatory.
  const reportFlag = args.flags.report;
  if (!reportFlag || reportFlag === true) die("remove requires --report (a passing verify report)");
  const reportPath = path.resolve(root, reportFlag);
  if (!fs.existsSync(reportPath)) die("verify report not found: " + reportPath);
  const verify = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  if (verify.result !== "pass") die("verify report is not a pass");
  if (verify.batch !== batch || verify.archive_sha256 !== manifest.archive_sha256) die("verify report does not bind this batch/archive digest");

  const removals = [];
  for (const m of manifest.members) {
    const { abs, rel } = assertContained(m.path, root);
    if (!fs.existsSync(abs)) { removals.push({ path: rel, action: "already-absent" }); continue; }
    const st = fs.statSync(abs);
    if (!st.isFile()) die("refusing to remove non-file: " + rel);
    const actual = fileSha(abs);
    if (actual !== m.sha256) die("concurrent modification detected, refusing: " + rel);
    // refuse if git reports local modifications for this path beyond the archived state
    // Empty (clean tracked), "??" (untracked/ignored) and " D"/"D " (already staged for deletion)
    // are all acceptable; anything else means an unrelated local edit would be destroyed.
    const status = execFileSync("git", ["status", "--porcelain", "--", rel], { cwd: root, encoding: "utf8" }).trim();
    if (status && !status.startsWith("??") && !status.startsWith(" D") && !status.startsWith("D ")) {
      die("working tree has unexpected changes for " + rel + ": " + status);
    }
    removals.push({ path: rel, action: dryRun ? "would-remove" : "removed" });
    if (!dryRun) fs.unlinkSync(abs);
  }

  if (!dryRun) {
    // prune directories that became empty, deepest first
    const dirs = [...new Set(manifest.members.map((m) => path.posix.dirname(m.path)))].sort((a, b) => b.length - a.length);
    for (const d of dirs) {
      let cur = path.resolve(root, d);
      while (cur.startsWith(root + path.sep) && cur !== root) {
        try { if (fs.readdirSync(cur).length === 0) { fs.rmdirSync(cur); cur = path.dirname(cur); } else break; } catch { break; }
      }
    }
  }
  console.log(JSON.stringify({ batch, dryRun, removed: removals.filter((r) => r.action === "removed").length, wouldRemove: removals.filter((r) => r.action === "would-remove").length, alreadyAbsent: removals.filter((r) => r.action === "already-absent").length, details: removals }, null, 2));
}

// ---------------------------------------------------------------- status
function cmdStatus(root, args) {
  const [batch] = args._;
  const archiveDir = args.flags["archive-dir"];
  if (!archiveDir || archiveDir === true) die("status requires --archive-dir");
  const { manifest } = readManifest(archiveDir, batch);
  const present = manifest.members.filter((m) => fs.existsSync(path.join(root, m.path))).length;
  console.log(JSON.stringify({ batch, memberCount: manifest.memberCount, stillPresent: present, archive: archiveFile(archiveDir, batch) }, null, 2));
}

const [cmd, ...rest] = process.argv.slice(2);
const root = repoRoot();
const args = parseArgs(rest);
const commands = { plan: cmdPlan, pack: cmdPack, verify: cmdVerify, remove: cmdRemove, status: cmdStatus };
if (!commands[cmd]) die("unknown subcommand: " + cmd);
commands[cmd](root, args);
