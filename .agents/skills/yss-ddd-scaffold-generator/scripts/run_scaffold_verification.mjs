#!/usr/bin/env node
/** 在生成项目根目录实际执行 YSS 脚手架的固定验证命令并留证。 */
import { assertSourceFingerprint, generatedTreeDigest } from "../../../../scripts/lib/backend-platform-provenance.mjs";
import { assertContractPlatform, assertPlatformAgreement, platformDigest } from "../../../../scripts/lib/backend-platform.mjs";
import { verifyPlatformDependencies, verifyPlatformStartup, verifyPlatformTests, platformEvidenceArtifacts } from "../../../../scripts/lib/backend-platform-verification.mjs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { runCommand } from "../../../../scripts/lib/command-runner.mjs";
import { assertArchitectureAgreement } from "../../../../scripts/lib/backend-architecture.mjs";
import { assertLocalDatabaseProfile, scaffoldArchitectureIdentity } from "../../../../scripts/lib/scaffold-local-database.mjs";

const PHASES = ["validate", "test", "package"];
const COMMANDS = PHASES.map((phase) => `./mvnw ${phase}`);
const isoNow = () => new Date().toISOString();
async function isFile(target) { try { return (await stat(target)).isFile(); } catch (error) { if (error.code === "ENOENT") return false; throw error; } }
async function writeText(target, content) { await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, content, "utf8"); }
async function isExecutable(target) {
  try { const info = await stat(target); return info.isFile() && Boolean(info.mode & 0o111); }
  catch (error) { if (error.code === "ENOENT") return false; throw error; }
}
async function readTextIfPresent(target) { try { return await readFile(target, "utf8"); } catch (error) { if (error.code === "ENOENT") return ""; throw error; } }
function configured(value) { return typeof value === "string" && value.trim().length > 0; }
function redactSecrets(text, environment = process.env) {
  let output = text;
  for (const name of ["MAVEN_REPO_USERNAME", "MAVEN_REPO_PASSWORD"]) {
    const value = environment[name];
    if (configured(value)) output = output.replaceAll(value, `[REDACTED:${name}]`);
  }
  return output;
}
function classifyFailure(phase, outcome) {
  if (outcome.exitCode === 0) return null;
  const output = `${outcome.stdout}\n${outcome.stderr}`.replaceAll(/\u001B\[[0-9;]*m/g, "");
  if (/Non-resolvable parent POM|Could not transfer artifact|Could not resolve (?:dependencies|artifact)|status code: 401|\bUnauthorized\b|PKIX path building failed|Name or service not known|Unknown host/i.test(output)) return "repository-access";
  if (/Unable to find main class|mainClass.*(?:not found|missing)/i.test(output)) return "bootstrap-entrypoint";
  if (/COMPILATION ERROR|Compilation failure|maven-compiler-plugin/i.test(output)) return "compilation";
  if (phase === "validate") return "project-model";
  if (phase === "test") return "test-failure";
  if (phase === "package") return "packaging";
  return "maven-execution";
}
function parseArgs(argv) { const result = {}; for (let index = 0; index < argv.length; index += 1) { let token = argv[index]; if (token === "--help" || token === "-h") { result.help = true; continue; } const equals = token.indexOf("="); let value; if (equals !== -1) { value = token.slice(equals + 1); token = token.slice(0, equals); } if (!["--project-root", "--evidence-dir", "--timeout-ms"].includes(token)) throw new Error(`不支持的参数: ${token}`); if (value === undefined) value = argv[++index]; if (!value || value.startsWith("--")) throw new Error(`参数 ${token} 缺少值`); if (token === "--timeout-ms") result.timeoutMs = Number(value); else result[token === "--project-root" ? "projectRoot" : "evidenceDir"] = path.resolve(value); } if (result.help) return result; if (!result.projectRoot || !result.evidenceDir) throw new Error("必须提供 --project-root 和 --evidence-dir"); return result; }
function validateManifest(manifest) {
  if (![2, 3, 4].includes(manifest.schema_version)) throw new Error(`unsupported: scaffold Manifest schema_version=${manifest.schema_version}；只读兼容 v2，并验证当前 v3/v4`);
  const required = ["schema_version", "contract_id", "contract_version", "scaffold_request_id", "contract_digest", "profiles", "ownership", "readiness", "generation_policy", "completion_level", "approval_ref", "approver", "lifecycle_approval_ref", "compiler_draft_ref", "persisted_ref", "contract_file_ref", "current_version", "allowed_write_paths", "expected_evidence_files", "verification_commands", "generation_mode"];
  if (manifest.schema_version >= 3) required.push("architecture_family", "generator_skill", "decision_id", "decision_digest", "module_profile");
  if (manifest.schema_version === 4) required.push("design_prerequisites");
  const missing = required.filter((field) => manifest[field] === undefined || manifest[field] === null || manifest[field] === "");
  if (manifest.generation_mode !== "controlled-generation" || missing.length) throw new Error(`脚手架生成元数据清单不完整或不是 controlled-generation: ${missing.join(", ")}`);
  if (manifest.schema_version >= 3) {
    if (manifest.kind || manifest.architecture_identity) {
      assertLocalDatabaseProfile(manifest.profiles);
      assertArchitectureAgreement(manifest.architecture_identity, { manifest_fields: scaffoldArchitectureIdentity(manifest, manifest.contract_digest) });
    }
    const supportedArchitecture = manifest.architecture_family === "domain-driven" && manifest.generator_skill === "yss-ddd-scaffold-generator" && manifest.profiles.architecture === "target-domain-model"
      || manifest.architecture_family === "layered-mvc" && ["yss-layered-mvc-scaffold-generator", "yss-mvc-data-analysis-project-initializer"].includes(manifest.generator_skill) && manifest.profiles.architecture === "layered-mvc";
    if (!supportedArchitecture || manifest.module_profile?.resolution_version !== 1 || !Array.isArray(manifest.module_profile?.resolved_modules)) throw new Error("Manifest v3/v4 的架构族、生成器、Profile 或模块闭包不一致");
    if (manifest.schema_version === 4 && (!manifest.design_prerequisites?.technical_design || !manifest.design_prerequisites?.data_architecture_decision || !manifest.design_prerequisites?.engineering_contract_approval_ref)) throw new Error("Manifest v4 缺少设计门禁绑定");
  } else if (manifest.profiles.architecture !== "target-domain-model") throw new Error("历史 Manifest v2 只读兼容仅支持 target-domain-model");
  if (manifest.generation_policy.mode !== "initialize-only" || manifest.generation_policy.existing_target !== "unsupported" || manifest.generation_policy.old_project_migration !== "unsupported" || manifest.generation_policy.template_upgrade !== "unsupported") throw new Error("Manifest 必须声明严格 initialize-only；已有目标、旧项目迁移和模板升级均须为 unsupported");
  if (manifest.schema_version === 4 ? manifest.current_version !== true : manifest.current_version !== manifest.contract_version) throw new Error("脚手架生成元数据清单不是当前合同版本");
  if (JSON.stringify(manifest.verification_commands) !== JSON.stringify(COMMANDS)) throw new Error("脚手架生成元数据清单验证命令不符合固定合同");
}
export async function run(projectRoot, evidenceDir, environment = process.env, { timeoutMs = 0, signal, platformOptions = {}, firstSlice = false } = {}) {
  const wrapper = path.join(projectRoot, "mvnw"), manifestPath = path.join(projectRoot, ".yss", "scaffold-generation.json");
  if (!await isFile(wrapper)) throw new Error(`项目根目录缺少 Maven wrapper: ${wrapper}`);
  if (!await isFile(manifestPath)) throw new Error(`项目根目录缺少脚手架生成元数据清单: ${manifestPath}`);
  let manifest; try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); } catch { throw new Error(`脚手架生成元数据清单无法读取或不是合法 JSON: ${manifestPath}`); }
  validateManifest(manifest);
  let selectedPlatform, selectedEntry;
  if (manifest.platform_verification && !manifest.platform_configuration) throw new Error("backend-platform: Manifest missing platform_configuration");
  if (manifest.platform_configuration) {
    if (manifest.platform_verification === "candidate" && platformOptions.candidate !== true) throw new Error("backend-platform: candidate scaffold cannot enter production verification");
    const contractBytes = await readFile(manifest.contract_file_ref);
    if (platformDigest(contractBytes).replace(/^sha256:/, "") !== manifest.contract_digest.replace(/^sha256:/, "")) throw new Error("backend-platform: contract digest drift");
    const contract = JSON.parse(contractBytes);
    assertPlatformAgreement(manifest.platform_configuration, contract.platform_configuration);
    if (firstSlice) {
      if (manifest.platform_verification !== "verified" || manifest.completion_level !== "empty-scaffold-verified") throw new Error("backend-platform: first slice requires a verified empty scaffold");
    } else {
      const relativeEvidence = path.relative(path.resolve(projectRoot), path.resolve(evidenceDir));
      if (!relativeEvidence || (!relativeEvidence.startsWith(`..${path.sep}`) && relativeEvidence !== ".." && !path.isAbsolute(relativeEvidence))) throw new Error("backend-platform: empty scaffold evidence must be outside the generated project");
      assertSourceFingerprint(manifest.source_fingerprint, manifest.architecture_family);
      if (generatedTreeDigest(projectRoot, manifest) !== manifest.generated_tree_digest) throw new Error("backend-platform: generated tree drift");
    }
    ({ profile: selectedPlatform, entry: selectedEntry } = assertContractPlatform(contract, null, { ...platformOptions, requireVerified: platformOptions.candidate !== true }));
  }
  await mkdir(evidenceDir, { recursive: true });
  const mavenConfig = await readTextIfPresent(path.join(projectRoot, ".mvn", "maven.config"));
  const preflight = {
    wrapper_exists: true,
    wrapper_executable: await isExecutable(wrapper),
    java_home_configured: configured(environment.JAVA_HOME),
    maven_repository_credentials_configured: configured(environment.MAVEN_REPO_USERNAME) && configured(environment.MAVEN_REPO_PASSWORD),
    maven_repository_url_configured: configured(environment.YSS_MAVEN_REPOSITORY_URL),
    project_settings_present: await isFile(path.join(projectRoot, ".mvn", "settings.xml")),
    project_maven_config_present: await isFile(path.join(projectRoot, ".mvn", "maven.config")),
    project_settings_wired: /(?:^|\s)-(?:s|-settings)\s+\.mvn\/settings\.xml(?:\s|$)/m.test(mavenConfig),
    repository_profile: manifest.profiles.repository,
    repository_profile_wired: /(?:^|\s)-(?:P|-activate-profiles)\s+yss-internal(?:\s|$)/m.test(mavenConfig),
    maven_coordinates_source: manifest.maven_coordinates_source
  };
  const failed = [];
  if (!preflight.wrapper_executable) failed.push("wrapper-not-executable");
  if (!preflight.project_settings_present || !preflight.project_maven_config_present || !preflight.project_settings_wired || !preflight.repository_profile_wired) failed.push("repository-profile-not-wired");
  if (!preflight.maven_repository_url_configured) failed.push("repository-url-not-configured");
  if (!preflight.maven_repository_credentials_configured) failed.push("repository-credentials-not-configured");
  if (failed.length) return { verification_mode: "controlled-generation", project_root: projectRoot, scaffold_manifest_ref: manifestPath, generated_at: isoNow(), status: "failed", failure_category: "verification-preflight", completion_level: "generated", preflight: { ...preflight, failures: failed }, commands: [] };
  const verificationStartedAt = Date.now();
  const commands = [];
  for (const phase of PHASES) {
    const stdoutPath = path.join(evidenceDir, `mvnw-${phase}.stdout.log`);
    const stderrPath = path.join(evidenceDir, `mvnw-${phase}.stderr.log`);
    const startedAt = isoNow();
    const started = process.hrtime.bigint();
    const execution = await runCommand(wrapper, [phase], { cwd: projectRoot, env: environment, timeoutMs, signal, stdoutFile: stdoutPath, stderrFile: stderrPath, secrets: [environment.MAVEN_REPO_USERNAME, environment.MAVEN_REPO_PASSWORD], progress: true });
    const outcome = { ...execution, exitCode: execution.status };
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
    await writeText(stdoutPath, redactSecrets(outcome.stdout, environment));
    await writeText(stderrPath, redactSecrets(outcome.stderr, environment));
    commands.push({
      command: `./mvnw ${phase}`,
      phase,
      exit_code: outcome.exitCode,
      failure_category: outcome.termination || classifyFailure(phase, outcome),
      duration_ms: Number(durationMs.toFixed(3)),
      started_at: startedAt,
      executed_at: isoNow(),
      stdout_ref: stdoutPath,
      stderr_ref: stderrPath
    });
  }
  let failureCategory = commands.find((item) => item.failure_category)?.failure_category ?? null;
  const platformDependencies = selectedPlatform && failureCategory === null ? await verifyPlatformDependencies(projectRoot, evidenceDir, selectedPlatform, environment, { timeoutMs, signal, manifest, components: selectedEntry.components }) : null;
  if (platformDependencies?.status === "failed") failureCategory = "platform-dependencies";
  const integrationTests = selectedPlatform && failureCategory === null ? await verifyPlatformTests(projectRoot, evidenceDir, manifest, verificationStartedAt) : null;
  if (integrationTests?.status === "failed") failureCategory = "platform-integration-tests";
  const startup = selectedPlatform && failureCategory === null ? await verifyPlatformStartup(projectRoot, evidenceDir, manifest, environment, { timeoutMs, signal, runtimeArtifacts: platformDependencies.runtime_artifacts, providedLombokVersion: selectedPlatform.versions.lombok }) : null;
  if (startup?.status === "failed") failureCategory = "platform-startup";
  if (selectedPlatform && !firstSlice && generatedTreeDigest(projectRoot, manifest) !== manifest.generated_tree_digest) throw new Error("backend-platform: Maven modified generated source bytes");
  return {
    verification_scope: firstSlice ? "first-slice" : "empty-scaffold",
    ...(selectedPlatform && !firstSlice ? { recipe_digest: manifest.platform_configuration.compatibility_digest, source_fingerprint: manifest.source_fingerprint, generated_tree_digest: manifest.generated_tree_digest, evidence_artifacts: await platformEvidenceArtifacts(evidenceDir), verified_capabilities: manifest.module_profile?.requested_capabilities ?? [], integration_tests: integrationTests } : {}),
    ...(selectedPlatform ? { spring_boot_version: selectedPlatform.spring_boot_version, java_version: selectedPlatform.java_version, parent: manifest.platform_configuration.parent, bom: manifest.platform_configuration.bom, architecture_family: manifest.architecture_family, platform_dependencies: platformDependencies, dependency_check: platformDependencies?.status ?? "not-executed", startup, startup_check: startup?.status ?? "not-executed", platform_verification: manifest.platform_verification } : {}),
    verification_mode: "controlled-generation",
    project_root: projectRoot,
    scaffold_manifest_ref: manifestPath,
    generated_at: isoNow(),
    status: failureCategory === null ? "passed" : "failed",
    failure_category: failureCategory,
    completion_level: firstSlice ? manifest.completion_level : failureCategory === null && manifest.platform_verification !== "candidate" ? "empty-scaffold-verified" : "generated",
    preflight,
    commands
  };
}
async function main() { let args; try { args = parseArgs(process.argv.slice(2)); if (args.help) { console.log("运行 YSS 脚手架真实验证命令\n用法: node scripts/run_scaffold_verification.mjs --project-root <dir> --evidence-dir <dir>"); return 0; } const reportPath = path.join(args.evidenceDir, "scaffold-verification.json"); try { const report = await run(args.projectRoot, args.evidenceDir, process.env, { timeoutMs: args.timeoutMs ?? 0 }); await writeText(reportPath, `${JSON.stringify(report, null, 2)}\n`); console.log(`${report.status}: ${reportPath}`); return report.status === "passed" ? 0 : 1; } catch (error) { const report = { verification_mode: "controlled-generation", project_root: args.projectRoot, generated_at: isoNow(), status: "failed", failure_category: "verification-preflight", error: error.message, commands: [] }; await writeText(reportPath, `${JSON.stringify(report, null, 2)}\n`); process.stderr.write(`❌ 脚手架验证无法执行: ${error.message}\n`); return 1; } } catch (error) { process.stderr.write(`❌ 脚手架验证无法执行: ${error.message}\n`); return 1; } }
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) process.exitCode = await main();
