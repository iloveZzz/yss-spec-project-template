#!/usr/bin/env node
// P0 inventory builder — read-only. Produces p0/inventory.json and a compact summary.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const OUT_DIR = ".template-source/evidence/maintenance/2026-10-02-machine-evidence-retirement/p0";
const SCOPE = ".template-source/evidence";

const git = (args) => execFileSync("git", args, { cwd: ROOT, maxBuffer: 1 << 30 });
const listTracked = (scope) =>
  git(["ls-files", "-z", "--", scope]).toString("utf8").split("\0").filter(Boolean);

const MACHINE = /[.](json|ya?ml)$/i;
const head = git(["rev-parse", "HEAD"]).toString().trim();

const files = listTracked(SCOPE);
const entries = [];
for (const f of files) {
  const abs = path.join(ROOT, f);
  let st;
  try { st = fs.statSync(abs); } catch { entries.push({ path: f, missing: true }); continue; }
  const buf = fs.readFileSync(abs);
  entries.push({
    path: f,
    bytes: st.size,
    mode: (st.mode & 0o777).toString(8).padStart(3, "0"),
    sha256: crypto.createHash("sha256").update(buf).digest("hex"),
    machine: MACHINE.test(f),
  });
}
const present = entries.filter((e) => !e.missing);
const machine = present.filter((e) => e.machine);

const sum = (arr) => arr.reduce((a, e) => a + e.bytes, 0);

// round-level aggregates: group by the first 3 segments under evidence (maintenance/<round> or reviews)
const groupOf = (p) => {
  const rel = p.slice(SCOPE.length + 1).split("/");
  return rel.length >= 2 ? rel.slice(0, 2).join("/") : rel[0];
};
const groups = new Map();
for (const e of present) {
  const k = groupOf(e.path);
  const g = groups.get(k) ?? { files: 0, bytes: 0, machineFiles: 0, machineBytes: 0 };
  g.files++; g.bytes += e.bytes;
  if (e.machine) { g.machineFiles++; g.machineBytes += e.bytes; }
  groups.set(k, g);
}

// duplicates among machine files
const byHash = new Map();
for (const e of machine) {
  const arr = byHash.get(e.sha256) ?? [];
  arr.push(e.path);
  byHash.set(e.sha256, arr);
}
const duplicateGroups = [];
let extraCopies = 0, extraBytes = 0;
for (const [h, paths] of byHash) {
  if (paths.length < 2) continue;
  const bytes = machine.find((e) => e.sha256 === h).bytes;
  extraCopies += paths.length - 1;
  extraBytes += (paths.length - 1) * bytes;
  duplicateGroups.push({ sha256: h, bytes, count: paths.length, paths: paths.sort() });
}
duplicateGroups.sort((a, b) => (b.count - 1) * b.bytes - (a.count - 1) * a.bytes);

const report = {
  schema: "yss.machine-evidence-inventory/v1",
  captured_at_utc: new Date().toISOString(),
  head,
  scope: SCOPE,
  tracking: "git ls-files",
  totals: {
    tracked: entries.length,
    present: present.length,
    missing: entries.length - present.length,
    trackedBytes: sum(present),
    machineFiles: machine.length,
    machineBytes: sum(machine),
  },
  duplicateSummary: { groups: duplicateGroups.length, extraCopies, extraBytes },
  groups: [...groups.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.machineBytes - a.machineBytes),
  duplicateGroups,
  entries,
};

fs.mkdirSync(path.join(ROOT, OUT_DIR), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT_DIR, "inventory.json"), JSON.stringify(report, null, 2));

// compact summary for the console
console.log("HEAD", head);
console.log("tracked under scope:", report.totals.tracked, "present:", report.totals.present, "missing:", report.totals.missing);
console.log("bytes total:", report.totals.trackedBytes, "(" + (report.totals.trackedBytes / 1e6).toFixed(2) + " MB)");
console.log("machine files:", report.totals.machineFiles, "bytes:", report.totals.machineBytes, "(" + (report.totals.machineBytes / 1e6).toFixed(2) + " MB)");
console.log("duplicate groups:", report.duplicateSummary.groups, "extra copies:", report.duplicateSummary.extraCopies, "extra bytes:", report.duplicateSummary.extraBytes);
console.log("\nTop 15 rounds by machine bytes:");
for (const g of report.groups.slice(0, 15)) {
  console.log(
    String((g.machineBytes / 1e6).toFixed(2)).padStart(8) + " MB  machine=" + String(g.machineFiles).padStart(4) +
    "  all=" + String(g.files).padStart(5) + "  " + g.name
  );
}
console.log("\nTop 10 duplicate groups (wasted bytes):");
for (const d of duplicateGroups.slice(0, 10)) {
  console.log("  x" + d.count + " " + d.bytes + "B  " + d.paths[0]);
}
