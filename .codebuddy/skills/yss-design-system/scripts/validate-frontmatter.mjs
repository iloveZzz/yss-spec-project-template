#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function validateFrontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!match) throw new Error("Invalid SKILL.md frontmatter block");
  const fields = new Map();
  for (const line of match[1].split("\n")) {
    if (!line.trim()) continue;
    const index = line.indexOf(":");
    if (index < 0) throw new Error(`Invalid frontmatter line: ${line}`);
    fields.set(line.slice(0, index).trim(), line.slice(index + 1).trim());
  }
  const keys = [...fields.keys()].sort();
  if (keys.join(",") !== "description,name") throw new Error(`Expected keys ['description', 'name'], got ${JSON.stringify(keys)}`);
  const name = fields.get("name");
  const description = fields.get("description");
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error("Invalid skill name: " + name);
  if (!description || description.length > 1024) throw new Error("Description must be present and <= 1024 chars");
  return name;
}

async function main() {
  const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "SKILL.md");
  try {
    const name = validateFrontmatter(await readFile(skill, "utf8"));
    console.log(`${name} frontmatter ok`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
