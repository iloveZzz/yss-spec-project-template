#!/usr/bin/env node
// Verify every relative Markdown link target in tracked + untracked files resolves on disk.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: ROOT, maxBuffer: 1 << 30 }).toString("utf8").split("\0").filter(Boolean);
let checked = 0, broken = 0;
const examples = [];
for (const f of files) {
  if (!f.endsWith(".md")) continue;
  const abs = path.join(ROOT, f);
  let text; try { text = fs.readFileSync(abs, "utf8"); } catch { continue; }
  const dir = path.posix.dirname(f);
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(/\]\(([^)\s]+)\)/g)) {
      const raw = m[1];
      const target = raw.split("#")[0];
      if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("/")) continue;
      const resolved = path.posix.normalize(path.posix.join(dir, target));
      checked++;
      if (!fs.existsSync(path.join(ROOT, resolved))) { broken++; if (examples.length < 25) examples.push({ file: f, line: i + 1, target: raw, resolved }); }
    }
  }
}
console.log("relative markdown links checked:", checked, "broken:", broken);
for (const e of examples) console.log("  BROKEN", e.file + ":" + e.line, "->", e.target, "(resolved:", e.resolved + ")");
process.exitCode = broken ? 1 : 0;
