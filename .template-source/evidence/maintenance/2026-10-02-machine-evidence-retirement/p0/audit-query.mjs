#!/usr/bin/env node
import fs from "node:fs";
const audit = JSON.parse(fs.readFileSync(".template-source/evidence/maintenance/2026-10-02-machine-evidence-retirement/p0/reference-audit.json","utf8"));
const candSet = new Set(audit.candidates.map(c=>c.path));

// matches whose line contains a real candidate path suffix (beyond basename)
console.log("=== matches containing an actual candidate path fragment ===");
const strongText = [];
for (const m of audit.matches) {
  for (const cp of m.candidatePaths) {
    const segs = cp.split("/");
    // try suffixes of length >= 2 segments
    for (let k = 2; k <= segs.length; k++) {
      const suffix = segs.slice(-k).join("/");
      if (m.text.includes(suffix)) { strongText.push({ file: m.file, line: m.line, suffix, text: m.text.slice(0,220) }); break; }
    }
  }
}
console.log("count:", strongText.length);
const byFile = new Map();
for (const s of strongText) { const a = byFile.get(s.file) ?? []; a.push(s); byFile.set(s.file, a); }
for (const [f, arr] of [...byFile.entries()].sort((a,b)=>b[1].length-a[1].length).slice(0,25)) {
  console.log("\n-- " + f + " (" + arr.length + ")");
  for (const m of arr.slice(0,3)) console.log("   L" + m.line + " [" + m.suffix + "]: " + m.text.slice(0,180));
}
