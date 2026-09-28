#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const EXTRACT_KINDS = Object.freeze(["skill-names", "heading-list", "prose-note"]);

function namesOf(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.keys(value).sort((a, b) => a.localeCompare(b));
}

export function extractSkillNames(lock) {
  if (!lock || typeof lock !== "object" || Array.isArray(lock)) {
    throw new TypeError("skill-names input must be a lock object");
  }
  const shared = namesOf(lock.skills?.shared);
  const platform = lock.skills?.platform && typeof lock.skills.platform === "object" ? lock.skills.platform : {};
  const lines = ["# skills-lock names", "", "Derived names only. Do not copy hashes, paths, or the lock file.", "", "## shared", ""];
  for (const name of shared) lines.push(`- \`${name}\``);
  const roots = namesOf(platform);
  if (roots.length) {
    lines.push("", "## platform", "");
    for (const root of roots) {
      lines.push(`### \`${root}\``, "");
      for (const name of namesOf(platform[root])) lines.push(`- \`${name}\``);
      lines.push("");
    }
  }
  return `${lines.join("\n").replace(/\n+$/, "")}\n`;
}

async function main(argv = process.argv.slice(2)) {
  const kind = argv[0];
  let input;
  let output;
  for (let i = 1; i < argv.length; i += 1) {
    if (argv[i] === "--in") input = argv[++i];
    else if (argv[i] === "--out") output = argv[++i];
  }
  if (kind !== "skill-names" || !input || !output) {
    throw new Error("usage: extract.mjs skill-names --in <lock.json> --out <raw.md>");
  }
  const text = extractSkillNames(JSON.parse(await readFile(input, "utf8")));
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, text, "utf8");
  process.stdout.write(`${output}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  });
}
