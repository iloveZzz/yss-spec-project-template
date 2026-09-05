#!/usr/bin/env node
import { run } from "../../yss-ddd-scaffold-generator/scripts/run_scaffold_verification.mjs";
try {
  const [projectRoot, evidenceDir] = process.argv.slice(2);
  if (!projectRoot || !evidenceDir) throw new Error("用法: run_scaffold_verification.mjs <project-root> <evidence-dir>");
  const report = await run(projectRoot, evidenceDir);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.status === "passed" ? 0 : 1;
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
