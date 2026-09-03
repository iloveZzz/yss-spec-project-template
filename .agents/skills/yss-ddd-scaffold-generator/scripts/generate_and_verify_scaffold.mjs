#!/usr/bin/env node
/** 在同一个受控工作流中生成脚手架并执行真实 Maven Wrapper 验证。 */
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { run } from "./run_scaffold_verification.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const GENERATOR = path.join(SCRIPT_DIR, "generate_scaffold.mjs");
const isoNow = () => new Date().toISOString();

function parseArgs(argv) {
  const generatorArgs = [];
  let evidenceDir;
  let projectName;
  let outputDir;
  for (let index = 0; index < argv.length; index += 1) {
    const original = argv[index];
    const [flag, inlineValue] = original.split(/=(.*)/s, 2);
    let value = inlineValue;
    if (["--evidence-dir", "--project-name", "--output-dir"].includes(flag) && value === undefined) value = argv[index + 1];
    if (flag === "--evidence-dir") {
      if (!value || value.startsWith("--")) throw new Error("参数 --evidence-dir 缺少值");
      evidenceDir = path.resolve(value);
      if (inlineValue === undefined) index += 1;
      continue;
    }
    generatorArgs.push(original);
    if (["--project-name", "--output-dir"].includes(flag) && inlineValue === undefined) {
      if (!value || value.startsWith("--")) throw new Error(`参数 ${flag} 缺少值`);
      generatorArgs.push(value);
      index += 1;
    }
    if (flag === "--project-name") projectName = value;
    if (flag === "--output-dir") outputDir = value;
  }
  if (!evidenceDir) throw new Error("必须提供 --evidence-dir");
  if (!projectName || !outputDir) throw new Error("必须提供 --project-name 和 --output-dir");
  return { evidenceDir, generatorArgs, projectRoot: path.join(path.resolve(outputDir), projectName) };
}

function executeGenerator(args) {
  return new Promise((resolve) => {
    execFile(process.execPath, [GENERATOR, ...args], { encoding: "utf8" }, (error, stdout, stderr) => {
      resolve({ exitCode: error?.code ?? 0, stdout, stderr });
    });
  });
}

async function writeJson(target, value) {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`❌ 脚手架工作流无法执行: ${error.message}\n`);
    return 1;
  }
  await mkdir(args.evidenceDir, { recursive: true });
  const workflowPath = path.join(args.evidenceDir, "scaffold-workflow.json");
  const verificationPath = path.join(args.evidenceDir, "scaffold-verification.json");
  const generation = await executeGenerator(args.generatorArgs);
  await writeFile(path.join(args.evidenceDir, "scaffold-generation.stdout.log"), generation.stdout, "utf8");
  await writeFile(path.join(args.evidenceDir, "scaffold-generation.stderr.log"), generation.stderr, "utf8");
  process.stdout.write(generation.stdout);
  process.stderr.write(generation.stderr);
  if (generation.exitCode !== 0) {
    await writeJson(workflowPath, {
      workflow_mode: "controlled-generation",
      generated_at: isoNow(),
      project_root: args.projectRoot,
      status: "blocked",
      failure_category: "generation",
      generation_exit_code: generation.exitCode,
      verification_ref: null
    });
    return 1;
  }
  try {
    const verification = await run(args.projectRoot, args.evidenceDir);
    await writeJson(verificationPath, verification);
    const passed = verification.status === "passed";
    if (passed) {
      const manifestPath = path.join(args.projectRoot, ".yss", "scaffold-generation.json");
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      manifest.completion_level = "empty-scaffold-verified";
      manifest.empty_scaffold_verification_ref = verificationPath;
      manifest.empty_scaffold_verified_at = isoNow();
      await writeJson(manifestPath, manifest);
    }
    await writeJson(workflowPath, {
      workflow_mode: "controlled-generation",
      generated_at: isoNow(),
      project_root: args.projectRoot,
      status: passed ? "completed" : "blocked",
      failure_category: verification.failure_category,
      generation_exit_code: generation.exitCode,
      verification_ref: verificationPath
    });
    if (passed) process.stdout.write(`✅ 脚手架生成与验证完成: ${args.projectRoot}\n`);
    else process.stderr.write(`❌ 脚手架验证失败，已阻断: ${verification.failure_category}\n`);
    return passed ? 0 : 1;
  } catch (error) {
    await writeJson(workflowPath, {
      workflow_mode: "controlled-generation",
      generated_at: isoNow(),
      project_root: args.projectRoot,
      status: "blocked",
      failure_category: "verification-preflight",
      generation_exit_code: generation.exitCode,
      verification_ref: verificationPath,
      error: error.message
    });
    process.stderr.write(`❌ 脚手架验证无法执行，已阻断: ${error.message}\n`);
    return 1;
  }
}

process.exitCode = await main();
