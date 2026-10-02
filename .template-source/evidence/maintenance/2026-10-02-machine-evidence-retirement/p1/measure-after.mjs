#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, maxBuffer: 1 << 30 }).toString("utf8").split("\0").filter(Boolean);
const EVID = ".template-source/evidence";
const MACHINE = /[.](json|ya?ml)$/i;
let deleted = 0;
const rows = [];
for (const f of tracked) {
  if (!f.startsWith(EVID + "/")) continue;
  let st; try { st = fs.statSync(path.join(ROOT, f)); } catch { deleted++; continue; }
  rows.push({ f, bytes: st.size, machine: MACHINE.test(f) });
}
const machine = rows.filter(r => r.machine);
const groups = new Map();
for (const r of rows) {
  const k = r.f.slice(EVID.length + 1).split("/").slice(0, 2).join("/");
  const g = groups.get(k) ?? { machineFiles: 0, machineBytes: 0, allFiles: 0, allBytes: 0 };
  g.allFiles++; g.allBytes += r.bytes;
  if (r.machine) { g.machineFiles++; g.machineBytes += r.bytes; }
  groups.set(k, g);
}
const byHash = new Map();
for (const r of machine) {
  const h = crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, r.f))).digest("hex");
  (byHash.get(h) ?? byHash.set(h, []).get(h)).push(r.f);
}
let dupGroups = 0, extra = 0, extraBytes = 0;
for (const [, arr] of byHash) if (arr.length > 1) { dupGroups++; extra += arr.length - 1; const b = fs.statSync(path.join(ROOT, arr[0])).size; extraBytes += (arr.length - 1) * b; }
const out = {
  schema: "yss.machine-evidence-inventory/v1",
  captured_at_utc: new Date().toISOString(),
  head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(),
  note: "post-batch re-measurement restricted to .template-source/evidence (baseline scope)",
  totals: { indexed: rows.length + deleted, present: rows.length, pendingDeletion: deleted, trackedBytes: rows.reduce((a, r) => a + r.bytes, 0), machineFiles: machine.length, machineBytes: machine.reduce((a, r) => a + r.bytes, 0) },
  duplicateSummary: { groups: dupGroups, extraCopies: extra, extraBytes },
  groups: [...groups.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.machineBytes - a.machineBytes),
};
fs.writeFileSync(path.join(ROOT, ".template-source/evidence/maintenance/2026-10-02-machine-evidence-retirement/p1/inventory-after.json"), JSON.stringify(out, null, 2));
console.log("evidence-scope indexed:", out.totals.indexed, "present:", out.totals.present, "pending-deletion:", out.totals.pendingDeletion);
console.log("present bytes:", out.totals.trackedBytes, "(" + (out.totals.trackedBytes / 1e6).toFixed(2) + " MB)");
console.log("machine files:", out.totals.machineFiles, "bytes:", out.totals.machineBytes, "(" + (out.totals.machineBytes / 1e6).toFixed(2) + " MB)");
console.log("duplicates: groups", dupGroups, "extra", extra, "bytes", extraBytes);
console.log("\ntop rounds by machine bytes:");
for (const g of out.groups.slice(0, 8)) console.log("  " + (g.machineBytes / 1e6).toFixed(2).padStart(7) + " MB  machine=" + String(g.machineFiles).padStart(4) + "  " + g.name);
