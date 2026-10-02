#!/usr/bin/env node
import fs from "node:fs";
const inv = JSON.parse(fs.readFileSync(".template-source/evidence/maintenance/2026-10-02-machine-evidence-retirement/p0/inventory.json", "utf8"));
const names = ["cli-results.json", "inputs.json", "inventory.json", "baseline.json"];
for (const n of names) {
  const hit = inv.entries.filter(e => e.path.endsWith("/" + n));
  const bytes = hit.reduce((a, e) => a + (e.bytes||0), 0);
  console.log("== " + n + " : " + hit.length + " files, " + bytes + " bytes (" + (bytes/1e6).toFixed(2) + " MB)");
  for (const h of hit.sort((a,b)=>b.bytes-a.bytes)) console.log("   " + String(h.bytes).padStart(9) + "  " + h.path.replace(".template-source/evidence/",""));
}
console.log("\n== duplicate extra copies by round ==");
const dupRounds = new Map();
for (const d of inv.duplicateGroups) {
  const extra = d.count - 1;
  const round = d.paths[0].replace(".template-source/evidence/","").split("/").slice(0,2).join("/");
  const cur = dupRounds.get(round) ?? { extra: 0, bytes: 0, groups: 0 };
  cur.extra += extra; cur.bytes += extra * d.bytes; cur.groups++;
  dupRounds.set(round, cur);
}
for (const [k,v] of [...dupRounds.entries()].sort((a,b)=>b[1].bytes-a[1].bytes).slice(0,12)) {
  console.log("  " + String((v.bytes/1e6).toFixed(3)).padStart(8) + " MB  groups=" + String(v.groups).padStart(3) + " extra=" + String(v.extra).padStart(3) + "  " + k);
}
