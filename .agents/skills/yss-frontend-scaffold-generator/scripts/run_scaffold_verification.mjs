#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ALLOWED = new Map([
  ["pnpm install --frozen-lockfile", ["install", "--frozen-lockfile"]],
  ["pnpm lint", ["lint"]],
  ["pnpm type-check", ["type-check"]],
  ["pnpm build", ["build"]],
]);
function argsOf(argv) { const args = {}; for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, "")] = argv[i + 1]; return args; }
export function verify(projectRoot, evidenceDir) {
  projectRoot = path.resolve(projectRoot); evidenceDir = path.resolve(evidenceDir);
  const manifestPath = path.join(projectRoot, ".yss", "scaffold-generation.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.schema_version !== 4 || manifest.kind !== "frontend-scaffold" || manifest.generation_mode !== "controlled-generation") throw new TypeError("invalid frontend scaffold manifest");
  if (!manifest.generated_files.includes("pnpm-lock.yaml")) throw new TypeError("frontend template must contain pnpm-lock.yaml");
  const commands = manifest.verification_commands;
  for (const required of ALLOWED.keys()) if (!commands.includes(required)) throw new TypeError(`missing required verification command: ${required}`);
  mkdirSync(evidenceDir, { recursive: true });
  const results = commands.map((command, index) => {
    const argv = ALLOWED.get(command);
    if (!argv) throw new TypeError(`unsupported verification command: ${command}`);
    const started = Date.now();
    const result = spawnSync("pnpm", argv, { cwd: projectRoot, encoding: "utf8" });
    const stdoutRef = path.join(evidenceDir, `${index + 1}-stdout.log`), stderrRef = path.join(evidenceDir, `${index + 1}-stderr.log`);
    writeFileSync(stdoutRef, result.stdout || ""); writeFileSync(stderrRef, result.stderr || "");
    return { command, exit_code: result.status ?? 1, duration_ms: Date.now() - started, stdout_ref: stdoutRef, stderr_ref: stderrRef, executed_at: new Date().toISOString() };
  });
  const passed = results.every((item) => item.exit_code === 0);
  const report = { schema_version: 1, kind: "frontend-scaffold-verification", status: passed ? "passed" : "failed", project_root: projectRoot, scaffold_manifest_ref: manifestPath, commands: results };
  const reportPath = path.join(evidenceDir, "scaffold-verification.json");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  if (passed) { manifest.completion_level = "empty-scaffold-verified"; manifest.scaffold_verification_ref = reportPath; writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`); }
  return report;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  try { const args = argsOf(process.argv.slice(2)); const report = verify(args["project-root"], args["evidence-dir"]); process.stdout.write(`${report.status}\n`); if (report.status !== "passed") process.exitCode = 1; }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
