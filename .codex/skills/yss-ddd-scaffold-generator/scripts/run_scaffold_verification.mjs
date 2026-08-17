#!/usr/bin/env node
/** 在生成项目根目录实际执行 YSS 脚手架的固定验证命令并留证。 */
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const PHASES = ["validate", "test", "package"];
const COMMANDS = PHASES.map((phase) => `./mvnw ${phase}`);
const isoNow = () => new Date().toISOString();
async function isFile(target) { try { return (await stat(target)).isFile(); } catch (error) { if (error.code === "ENOENT") return false; throw error; } }
async function writeText(target, content) { await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, content, "utf8"); }
function parseArgs(argv) { const result = {}; for (let index = 0; index < argv.length; index += 1) { let token = argv[index]; if (token === "--help" || token === "-h") { result.help = true; continue; } const equals = token.indexOf("="); let value; if (equals !== -1) { value = token.slice(equals + 1); token = token.slice(0, equals); } if (!["--project-root", "--evidence-dir"].includes(token)) throw new Error(`不支持的参数: ${token}`); if (value === undefined) value = argv[++index]; if (!value || value.startsWith("--")) throw new Error(`参数 ${token} 缺少值`); result[token === "--project-root" ? "projectRoot" : "evidenceDir"] = path.resolve(value); } if (result.help) return result; if (!result.projectRoot || !result.evidenceDir) throw new Error("必须提供 --project-root 和 --evidence-dir"); return result; }
function validateManifest(manifest) {
  const required = ["schema_version", "contract_id", "contract_version", "slice_id", "approval_ref", "approver", "lifecycle_approval_ref", "router_draft_ref", "persisted_ref", "contract_file_ref", "current_version", "allowed_write_paths", "expected_evidence_files", "verification_commands", "generation_mode"];
  const missing = required.filter((field) => manifest[field] === undefined || manifest[field] === null || manifest[field] === "");
  if (manifest.generation_mode !== "controlled-generation" || missing.length) throw new Error(`脚手架生成元数据清单不完整或不是 controlled-generation: ${missing.join(", ")}`);
  if (manifest.current_version !== manifest.contract_version) throw new Error("脚手架生成元数据清单不是当前合同版本");
  if (JSON.stringify(manifest.verification_commands) !== JSON.stringify(COMMANDS)) throw new Error("脚手架生成元数据清单验证命令不符合固定合同");
}
function execute(wrapper, phase, cwd) { return new Promise((resolve) => { const child = spawn(wrapper, [phase], { cwd, stdio: ["ignore", "pipe", "pipe"] }); let stdout = "", stderr = ""; child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; }); child.on("error", (error) => resolve({ exitCode: 127, stdout: "", stderr: String(error) })); child.on("close", (code) => resolve({ exitCode: code ?? 1, stdout, stderr })); }); }
export async function run(projectRoot, evidenceDir) {
  const wrapper = path.join(projectRoot, "mvnw"), manifestPath = path.join(projectRoot, ".yss", "scaffold-generation.json");
  if (!await isFile(wrapper)) throw new Error(`项目根目录缺少 Maven wrapper: ${wrapper}`);
  if (!await isFile(manifestPath)) throw new Error(`项目根目录缺少脚手架生成元数据清单: ${manifestPath}`);
  let manifest; try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); } catch { throw new Error(`脚手架生成元数据清单无法读取或不是合法 JSON: ${manifestPath}`); }
  validateManifest(manifest); await mkdir(evidenceDir, { recursive: true }); const commands = [];
  for (const phase of PHASES) { const stdoutPath = path.join(evidenceDir, `mvnw-${phase}.stdout.log`), stderrPath = path.join(evidenceDir, `mvnw-${phase}.stderr.log`), startedAt = isoNow(), started = process.hrtime.bigint(); const outcome = await execute(wrapper, phase, projectRoot); const durationMs = Number(process.hrtime.bigint() - started) / 1e6; await writeText(stdoutPath, outcome.stdout); await writeText(stderrPath, outcome.stderr); commands.push({ command: `./mvnw ${phase}`, phase, exit_code: outcome.exitCode, duration_ms: Number(durationMs.toFixed(3)), started_at: startedAt, executed_at: isoNow(), stdout_ref: stdoutPath, stderr_ref: stderrPath }); }
  return { verification_mode: "controlled-generation", project_root: projectRoot, scaffold_manifest_ref: manifestPath, generated_at: isoNow(), status: commands.every((item) => item.exit_code === 0) ? "passed" : "failed", commands };
}
async function main() { let args; try { args = parseArgs(process.argv.slice(2)); if (args.help) { console.log("运行 YSS 脚手架真实验证命令\n用法: node scripts/run_scaffold_verification.mjs --project-root <dir> --evidence-dir <dir>"); return 0; } const reportPath = path.join(args.evidenceDir, "scaffold-verification.json"); try { const report = await run(args.projectRoot, args.evidenceDir); await writeText(reportPath, `${JSON.stringify(report, null, 2)}\n`); console.log(`${report.status}: ${reportPath}`); return report.status === "passed" ? 0 : 1; } catch (error) { const report = { verification_mode: "controlled-generation", project_root: args.projectRoot, generated_at: isoNow(), status: "failed", error: error.message, commands: [] }; await writeText(reportPath, `${JSON.stringify(report, null, 2)}\n`); process.stderr.write(`❌ 脚手架验证无法执行: ${error.message}\n`); return 1; } } catch (error) { process.stderr.write(`❌ 脚手架验证无法执行: ${error.message}\n`); return 1; } }
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) process.exitCode = await main();
