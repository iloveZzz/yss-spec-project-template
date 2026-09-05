#!/usr/bin/env node
/** 复用统一 Manifest v3 / Maven Wrapper 验证协议。 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { run as runUnifiedVerification } from "../../yss-ddd-scaffold-generator/scripts/run_scaffold_verification.mjs";

export async function run(projectRoot, evidenceDir, environment = process.env) {
  return runUnifiedVerification(path.resolve(projectRoot), path.resolve(evidenceDir), environment);
}

async function main() {
  const [projectRoot, evidenceDir] = process.argv.slice(2);
  if (!projectRoot || !evidenceDir) {
    process.stderr.write("用法: node run_scaffold_verification.mjs <project-root> <evidence-dir>\n");
    return 1;
  }
  try {
    const report = await run(projectRoot, evidenceDir);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return report.status === "passed" ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) process.exitCode = await main();
