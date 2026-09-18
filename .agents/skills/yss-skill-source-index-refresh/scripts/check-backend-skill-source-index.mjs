#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BACKEND, BACKEND_PLATFORM_LINES, assertSourcePlatformLine, backendComponentPaths, backendPlatformIndexPath, sourceState } from "./refresh-yss-skill-index.mjs";

export async function checkBackendSkillSourceIndex({ skill, platformLine, skillsRoot, sourceRoot }) {
  if (!BACKEND[skill]) throw new TypeError(`unknown backend component skill: ${skill}`);
  if (!BACKEND_PLATFORM_LINES[platformLine]) throw new TypeError(`unknown backend component platform line: ${platformLine}`);
  await assertSourcePlatformLine(sourceRoot, platformLine);
  const componentPaths = backendComponentPaths(skill, platformLine);
  const indexPath = backendPlatformIndexPath(skillsRoot, skill, platformLine);
  const contents = await readFile(indexPath, "utf8");
  const problems = [];
  if (!contents.includes("Index schema: `backend-component-source-index-v2`")) problems.push("index schema is not backend-component-source-index-v2");
  if (!contents.includes(`Platform line: \`${platformLine}\``)) problems.push(`platform line is not ${platformLine}`);
  if (!contents.includes("## Platform Signals")) problems.push("platform signals are missing");
  const indexedTrees = new Map([...contents.matchAll(/^Component tree `([^`]+)`: `([^`]+)`$/gm)]
    .map((match) => [match[1], match[2]]));
  if (indexedTrees.size !== componentPaths.length || componentPaths.some((item) => !indexedTrees.has(item))) problems.push("component tree set does not match the skill mapping");
  const current = sourceState(sourceRoot, componentPaths);
  if (current.componentWorktree !== "clean") problems.push(`component worktree is ${current.componentWorktree}`);
  for (const item of current.componentTrees) {
    const indexed = indexedTrees.get(item.path);
    if (!/^[a-f0-9]{40}$/.test(item.tree)) problems.push(`${item.path} is not present in the current Git commit`);
    else if (indexed !== item.tree) problems.push(`${item.path} tree changed: indexed=${indexed ?? "missing"}, current=${item.tree}`);
  }
  if (problems.length) throw new Error(`stale source index for ${skill}: ${problems.join("; ")}`);
  return { skill, indexPath, componentPaths, componentTrees: current.componentTrees };
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const name = argv[i];
    if (!["--skill", "--platform-line", "--source-root", "--skills-root"].includes(name) || !argv[i + 1]) throw new TypeError("usage: check-backend-skill-source-index.mjs --skill <id> --platform-line <boot2-java8|boot3-java17> --source-root <root> [--skills-root <canonical-root>]");
    result[name.slice(2).replaceAll("-", "_")] = argv[++i];
  }
  if (!result.skill || !result.platform_line || !result.source_root) throw new TypeError("usage: check-backend-skill-source-index.mjs --skill <id> --platform-line <boot2-java8|boot3-java17> --source-root <root> [--skills-root <canonical-root>]");
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const result = await checkBackendSkillSourceIndex({
    skill: args.skill,
    platformLine: args.platform_line,
    sourceRoot: path.resolve(args.source_root),
    skillsRoot: path.resolve(args.skills_root ?? path.join(scriptDir, "../..")),
  });
  console.log(JSON.stringify({ status: "fresh", skill: result.skill, platform_line: args.platform_line, components: result.componentPaths }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
