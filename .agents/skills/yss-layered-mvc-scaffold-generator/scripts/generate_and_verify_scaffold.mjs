#!/usr/bin/env node
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { run } from "./run_scaffold_verification.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const GENERATOR = path.join(SCRIPT_DIR, "generate_scaffold.mjs");

function parseArgs(argv) {
  const generatorArgs = [];
  let evidenceDir;
  let outputDir;
  let projectName;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--evidence-dir" || token.startsWith("--evidence-dir=")) {
      evidenceDir = token.includes("=") ? token.slice(token.indexOf("=") + 1) : argv[++index];
      continue;
    }
    generatorArgs.push(token);
    if (token === "--output-dir") outputDir = argv[index + 1];
    if (token.startsWith("--output-dir=")) outputDir = token.slice(token.indexOf("=") + 1);
    if (token === "--project-name") projectName = argv[index + 1];
    if (token.startsWith("--project-name=")) projectName = token.slice(token.indexOf("=") + 1);
  }
  if (!evidenceDir || !outputDir || !projectName) throw new Error("必须提供 --evidence-dir、--output-dir 和 --project-name");
  return { evidenceDir: path.resolve(evidenceDir), generatorArgs, projectRoot: path.join(path.resolve(outputDir), projectName) };
}

function executeGenerator(args) {
  return new Promise((resolve) => execFile(process.execPath, [GENERATOR, ...args], { encoding: "utf8" }, (error, stdout, stderr) => resolve({ exitCode: error?.code ?? 0, stdout, stderr })));
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    await mkdir(args.evidenceDir, { recursive: true });
    const generation = await executeGenerator(args.generatorArgs);
    await writeFile(path.join(args.evidenceDir, "generation.stdout.log"), generation.stdout, "utf8");
    await writeFile(path.join(args.evidenceDir, "generation.stderr.log"), generation.stderr, "utf8");
    if (generation.exitCode !== 0) throw new Error(`生成失败: ${generation.stderr.trim()}`);
    const verification = await run(args.projectRoot, args.evidenceDir);
    await writeFile(path.join(args.evidenceDir, "scaffold-verification.json"), `${JSON.stringify(verification, null, 2)}\n`, "utf8");
    if (verification.status !== "passed") return 1;
    const manifestPath = path.join(args.projectRoot, ".yss/scaffold-generation.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.completion_level = "empty-scaffold-verified";
    manifest.empty_scaffold_verification_ref = path.join(args.evidenceDir, "scaffold-verification.json");
    manifest.empty_scaffold_verified_at = new Date().toISOString();
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    return 0;
  } catch (error) {
    process.stderr.write(`❌ MVC 脚手架工作流失败: ${error.message}\n`);
    return 1;
  }
}

process.exitCode = await main();
