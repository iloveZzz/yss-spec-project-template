#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: ROOT, maxBuffer: 1 << 30 }).toString("utf8").split("\0").filter(Boolean);
const ARCHIVED = [
  ".template-source/evidence/maintenance/2026-09-28-lifecycle-core-optimization/",
  ".template-source/evidence/maintenance/2026-09-12-existing-project-delivery/preflight/",
  ".template-source/evidence/maintenance/2026-09-30-plan-spec-iteration/continuation-live-attempt/",
  ".template-source/evidence/maintenance/2026-09-30-plan-spec-iteration/continuation-snapshot-preparation/",
  ".template-source/evidence/maintenance/2026-09-30-plan-spec-iteration/task-verification/",
];
let mine = [], other = 0;
for (const f of files) {
  if (!f.endsWith(".md")) continue;
  let text; try { text = fs.readFileSync(path.join(ROOT, f), "utf8"); } catch { continue; }
  const dir = path.posix.dirname(f);
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(/\]\(([^)\s]+)\)/g)) {
      const t = m[1].split("#")[0];
      if (!t || /^[a-z][a-z0-9+.-]*:/i.test(t) || t.startsWith("/") || t.includes("<")) continue;
      const resolved = path.posix.normalize(path.posix.join(dir, t));
      if (fs.existsSync(path.join(ROOT, resolved))) continue;
      if (ARCHIVED.some((a) => resolved.startsWith(a))) mine.push({ file: f, line: i + 1, target: t, resolved });
      else other++;
    }
  }
}
console.log("broken links pointing into archived units (attributable to this batch):", mine.length);
for (const m of mine) console.log("  " + m.file + ":" + m.line + " -> " + m.target);
console.log("pre-existing broken links elsewhere:", other);
