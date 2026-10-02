#!/usr/bin/env node
// P0.3b — inbound markdown-link closure per maintenance round (tracked files only).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, maxBuffer: 1 << 30 }).toString("utf8").split("\0").filter(Boolean);
const EVID = ".template-source/evidence/maintenance/";

// every maintenance round directory
const rounds = [...new Set(tracked.filter(f => f.startsWith(EVID)).map(f => EVID + f.slice(EVID.length).split("/")[0]))];

const links = []; // {from, to}
for (const f of tracked) {
  if (!f.endsWith(".md")) continue;
  const abs = path.join(ROOT, f);
  let text; try { text = fs.readFileSync(abs, "utf8"); } catch { continue; }
  if (text.length > 4 * 1024 * 1024) continue;
  const dir = path.posix.dirname(f);
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(/\]\(([^)\s]+)\)/g)) {
      const t = m[1].split("#")[0];
      if (!t || /^[a-z][a-z0-9+.-]*:/i.test(t)) continue;
      links.push({ from: f, line: i + 1, to: path.posix.normalize(path.posix.join(dir, t)) });
    }
  }
}

const inbound = new Map();
for (const r of rounds) inbound.set(r, []);
for (const l of links) {
  for (const r of rounds) {
    if (l.to === r || l.to.startsWith(r + "/")) {
      // ignore self-references and links from within the same round
      if (l.from === r || l.from.startsWith(r + "/")) continue;
      inbound.get(r).push(l);
    }
  }
}

const rows = rounds.map(r => {
  const files = tracked.filter(f => f === r || f.startsWith(r + "/"));
  const inb = inbound.get(r) ?? [];
  return { round: r.replace(EVID, ""), files: files.length, inbound: inb.length, sources: [...new Set(inb.map(x => x.from))] };
}).sort((a, b) => a.inbound - b.inbound || b.files - a.files);

const out = path.join(ROOT, ".template-source/evidence/maintenance/2026-10-02-machine-evidence-retirement/p0/link-closure.json");
fs.writeFileSync(out, JSON.stringify({ schema: "yss.link-closure/v1", roundCount: rounds.length, linkCount: links.length, rows, inbound: Object.fromEntries([...inbound].map(([k, v]) => [k, v])) }, null, 2));

console.log("rounds:", rounds.length, "| md links:", links.length);
console.log("\n=== rounds with inbound links from OUTSIDE the round ===");
for (const r of rows.filter(x => x.inbound > 0)) {
  console.log("  " + String(r.inbound).padStart(3) + " inbound  " + r.round);
  for (const s of r.sources.slice(0, 4)) console.log("        <- " + s);
}
console.log("\n=== rounds with ZERO inbound links (archive-safe from a link standpoint): " + rows.filter(x => x.inbound === 0).length + " ===");
console.log("wrote " + out);
