#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { safePath, cliError } from "./core.mjs";
const EXTRACT_KINDS = Object.freeze(["skill-names", "heading-list", "prose-note"]);
function extractHeadings(text, input = "") {
  const lines = [`# heading-list${input ? `: ${input}` : ""}`, ""];
  let fence = null;
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1][0];
      else if (fence === marker[1][0]) fence = null;
      continue;
    }
    if (!fence && /^#{1,6}\s+\S/.test(line)) lines.push(`- L${index + 1}: ${line.trim()}`);
  }
  return lines.join("\n") + "\n";
}
function namesOf(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.keys(value).sort((a, b) => a.localeCompare(b));
}
function extractSkillNames(lock) {
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
  return `${lines.join("\n").replace(/\n+$/, "")}
`;
}
async function main(argv = process.argv.slice(2)) {
  const kind = argv[0];
  let input;
  let output;
  for (let i = 1; i < argv.length; i += 1) {
    if (argv[i] === "--in") input = argv[++i];
    else if (argv[i] === "--out") output = argv[++i];
  }
  if (!["skill-names", "heading-list"].includes(kind) || !input || !output) {
    throw new Error("usage: extract.mjs skill-names|heading-list --in <lock.json> --out <raw.md>");
  }
  const inputFile = await safePath(process.cwd(), input);
  const outputFile = await safePath(process.cwd(), output, { write: true });
  const content = await readFile(inputFile, "utf8");
  const text = kind === "skill-names" ? extractSkillNames(JSON.parse(content)) : extractHeadings(content, input);
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, text, "utf8");
  process.stdout.write(`${output}
`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(cliError);
}
export {
  EXTRACT_KINDS,
  extractHeadings,
  extractSkillNames
};
