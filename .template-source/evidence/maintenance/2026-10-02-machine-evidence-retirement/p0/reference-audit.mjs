#!/usr/bin/env node
// P0.3 reference audit — read-only scan of all tracked files for candidate path references.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = ".template-source/evidence/maintenance/2026-10-02-machine-evidence-retirement/p0";
const git = (args) => execFileSync("git", args, { cwd: ROOT, maxBuffer: 1 << 30 }).toString("utf8");
const tracked = git(["ls-files", "-z"]).split("\0").filter(Boolean);

const inv = JSON.parse(fs.readFileSync(path.join(ROOT, OUT_DIR, "inventory.json"), "utf8"));
const candidates = inv.entries.filter(e => /\/(cli-results|inputs|inventory|baseline)[.]json$/.test(e.path));
const candidateSet = new Set(candidates.map(c => c.path));

// group candidates by basename so we can attribute matches
const byBase = new Map();
for (const c of candidates) {
  const base = c.path.split("/").pop();
  const arr = byBase.get(base) ?? [];
  arr.push(c);
  byBase.set(base, arr);
}

const TEXT_EXT = /[.](md|mjs|js|cjs|ts|json|ya?ml|yml|py|sh|txt|toml|cfg|ini|xml|html|css)$/i;

const matches = [];
let scanned = 0, skippedBinary = 0, skippedBig = 0;
for (const f of tracked) {
  if (candidateSet.has(f)) continue;
  if (!TEXT_EXT.test(f)) continue;
  const abs = path.join(ROOT, f);
  let st;
  try { st = fs.statSync(abs); } catch { continue; }
  if (!st.isFile()) continue;
  if (st.size > 8 * 1024 * 1024) { skippedBig++; continue; }
  const buf = fs.readFileSync(abs);
  if (buf.subarray(0, 8192).includes(0)) { skippedBinary++; continue; }
  const text = buf.toString("utf8");
  if (!/(cli-results|inputs|inventory|baseline)[.]json/.test(text)) continue;
  scanned++;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/(cli-results|inputs|inventory|baseline)[.]json/.test(line)) continue;
    for (const [base] of byBase) {
      if (!line.includes(base)) continue;
      matches.push({
        candidateBase: base,
        candidatePaths: byBase.get(base).map(c => c.path),
        file: f,
        line: i + 1,
        text: line.trim().slice(0, 500),
      });
    }
  }
}

// classify
const consumers = [];   // code-like: scripts/, .agents/skills/, .codex/, tests/
const other = [];
for (const m of matches) {
  const isCode = /^(scripts|tests|submodules|[.]agents|[.]codex|[.]cursor|[.]pi)\//.test(m.file);
  (isCode ? consumers : other).push(m);
}

const report = { schema: "yss.reference-audit/v1", head: git(["rev-parse", "HEAD"]).trim(), candidates, filesScanned: scanned, skippedBig, skippedBinary, matches, consumers, other };
fs.writeFileSync(path.join(ROOT, OUT_DIR, "reference-audit.json"), JSON.stringify(report, null, 2));

console.log("files scanned:", scanned, "skippedBig:", skippedBig, "skippedBinary:", skippedBinary);
console.log("total matches:", matches.length, "| code-like:", consumers.length, "| other:", other.length);
console.log("\n=== code-like consumers by file ===");
const byFile = new Map();
for (const c of consumers) { const a = byFile.get(c.file) ?? []; a.push(c); byFile.set(c.file, a); }
for (const [f, arr] of [...byFile.entries()].sort()) {
  console.log("\n-- " + f + " (" + arr.length + ")");
  for (const m of arr.slice(0, 6)) console.log("   L" + m.line + ": " + m.text.slice(0, 200));
  if (arr.length > 6) console.log("   ... +" + (arr.length - 6) + " more");
}
console.log("\n=== other mentions by file (top 40) ===");
const byFile2 = new Map();
for (const c of other) { const a = byFile2.get(c.file) ?? []; a.push(c); byFile2.set(c.file, a); }
for (const [f, arr] of [...byFile2.entries()].sort((a,b)=>b[1].length-a[1].length).slice(0, 40)) {
  console.log("  " + String(arr.length).padStart(4) + "  " + f);
}
