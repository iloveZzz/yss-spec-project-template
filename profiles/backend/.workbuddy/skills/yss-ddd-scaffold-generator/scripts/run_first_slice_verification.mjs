#!/usr/bin/env node
/** Promote a generated backend only after a complete, approved first vertical slice passes real Wrapper verification. */
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { run as runScaffoldVerification } from "./run_scaffold_verification.mjs";
import { assertArchitectureAgreement } from "../../../../scripts/lib/backend-architecture.mjs";
import { inspectSliceContract } from "../../../../scripts/lib/slice-execution-preflight.mjs";
import { selectSliceWorkUnit } from "../../../../scripts/lib/slice-contract.mjs";
import { verifyFirstSliceTests } from "../../../../scripts/lib/first-slice-tests.mjs";
import { inspectFirstSliceArtifacts } from "../../../../scripts/lib/first-slice-artifacts.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "../../../..");
const REQUIRED_SKILLS = ["yss-domain", "yss-application", "yss-repository", "yss-mybatis", "yss-web-controller", "yss-dto", "yss-exception", "yss-validation", "mapstruct", "lombok", "alibaba-java-code-style"];
const REQUIRED_LAYERS = ["domain", "application", "infrastructure", "web"];

const isoNow = () => new Date().toISOString();
const sha256 = (content) => createHash("sha256").update(content).digest("hex");
async function isFile(target) { try { return (await stat(target)).isFile(); } catch (error) { if (error.code === "ENOENT") return false; throw error; } }
async function files(root) {
  const output = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) output.push(path.relative(root, absolute).split(path.sep).join("/"));
    }
  }
  await visit(root);
  return output.sort();
}
async function treeDigest(root) {
  const hash = createHash("sha256");
  for (const relative of await files(root)) hash.update(relative).update("\0").update(await readFile(path.join(root, relative))).update("\0");
  return hash.digest("hex");
}
async function writeJsonAtomic(target, value) {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, target);
}
export async function runFirstSliceVerification(projectRoot, evidenceDir, sliceContractFile, environment = process.env, options = {}) {
  projectRoot = path.resolve(projectRoot);
  evidenceDir = path.resolve(evidenceDir);
  sliceContractFile = path.resolve(sliceContractFile);
  const manifestPath = path.join(projectRoot, ".yss", "scaffold-generation.json");
  const reportPath = path.join(evidenceDir, "first-slice-verification.json");
  if (!await isFile(manifestPath)) throw new Error(`missing scaffold manifest: ${manifestPath}`);
  if (!await isFile(sliceContractFile)) throw new Error(`missing Slice Implementation Contract: ${sliceContractFile}`);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const contractRoot = path.resolve(options.contractRoot || projectRoot);
  let contract, preflight;
  try {
    const loaded = inspectSliceContract(path.relative(contractRoot, sliceContractFile), {
      root: contractRoot, approval_ref: options.approvalRef, work_unit_id: options.workUnit
    });
    preflight = loaded.report;
    contract = selectSliceWorkUnit(loaded.contract, options.workUnit);
  } catch (error) {
    preflight = { execution_allowed: false, blockers: [error.message] };
    contract = {};
  }
  if (manifest.platform_verification === "candidate") throw new Error("backend-platform: candidate scaffold cannot become first-slice-verified");
  const contractFailures = [...preflight.blockers];
  if (!preflight.execution_allowed) contractFailures.push("slice-execution-not-authorized");
  if (!(contract.common?.project_roots || []).some(ref => path.resolve(contractRoot, ref) === projectRoot)) contractFailures.push("slice-project-root-mismatch");
  try {
    const identity = contract.architecture_identity ?? contract.resolution?.architecture_identity;
    if (identity?.source_kind !== "existing-registration") assertArchitectureAgreement(identity, { manifest });
    for (const unit of contract.work_units ?? []) assertArchitectureAgreement(identity, { work_unit: unit.architecture_identity });
  } catch (error) { contractFailures.push(`architecture-identity:${error.message}`); }
  if (![2, 3, 4].includes(manifest.schema_version) || manifest.completion_level !== "empty-scaffold-verified") contractFailures.push("scaffold-not-empty-scaffold-verified");
  if (manifest.schema_version === 3 && manifest.legacy_reconciliation?.status !== "approved") contractFailures.push("legacy-scaffold-reconciliation-required");
  const artifacts = inspectFirstSliceArtifacts(contract, projectRoot);
  const missingArtifacts = artifacts.failures;
  // Generation-time Skill hashes are provenance. Current authority was checked by execution preflight.
  const skillDrift = [];
  if (contractFailures.length || missingArtifacts.length || skillDrift.length) {
    const report = { verification_mode: "first-slice", project_root: projectRoot, slice_contract_ref: sliceContractFile, scaffold_manifest_ref: manifestPath, generated_at: isoNow(), status: "failed", completion_level: manifest.completion_level, contract_failures: contractFailures, missing_artifacts: missingArtifacts, downstream_skill_drift: skillDrift, commands: [] };
    await writeJsonAtomic(reportPath, report);
    return report;
  }

  const mavenEvidence = path.join(evidenceDir, "maven");
  const startedAt = Date.now();
  const wrapper = await runScaffoldVerification(projectRoot, mavenEvidence, environment, { firstSlice: true, systemProperties: artifacts.properties });
  const mvc = manifest.architecture_family === "layered-mvc";
  const tests = wrapper.status === "passed" ? verifyFirstSliceTests(contract, projectRoot, startedAt, {
    module: `${manifest.project_name}-${mvc ? "server" : "bootstrap"}`,
    type: `${manifest.base_package}.${mvc ? "architecture.LayeredMvcArchitectureTest" : "ArchitectureRulesTest"}`
  }) : { status: "not-executed", failures: [], evidence: [] };
  const passed = wrapper.status === "passed" && tests.status === "passed";
  const report = { verification_mode: "first-slice", project_root: projectRoot, slice_contract_ref: sliceContractFile, scaffold_manifest_ref: manifestPath, generated_at: isoNow(), status: passed ? "passed" : "failed", test_execution: tests, failure_category: wrapper.failure_category || (tests.status === "failed" ? "first-slice-tests" : null), completion_level: passed ? "first-slice-verified" : manifest.completion_level, contract_failures: [], missing_artifacts: [], downstream_skill_drift: [], commands: wrapper.commands };
  await writeJsonAtomic(reportPath, report);
  if (passed) {
    manifest.completion_level = "first-slice-verified";
    manifest.first_slice_verification_ref = reportPath;
    manifest.first_slice_verified_at = isoNow();
    manifest.first_slice_contract = { contract_id: contract.contract_id, contract_version: contract.contract_version, slice_id: contract.slice_id, sha256: sha256(await readFile(sliceContractFile)) };
    await writeJsonAtomic(manifestPath, manifest);
  }
  return report;
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index], value = argv[index + 1];
    if (!["--project-root", "--evidence-dir", "--slice-contract-file", "--contract-root", "--approval-ref", "--work-unit"].includes(flag) || !value) throw new Error("usage: run_first_slice_verification.mjs --project-root DIR --evidence-dir DIR --slice-contract-file FILE");
    result[flag.slice(2).replaceAll(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
  }
  if (!result.projectRoot || !result.evidenceDir || !result.sliceContractFile) throw new Error("project root, evidence dir, and slice contract file are required");
  return result;
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const report = await runFirstSliceVerification(args.projectRoot, args.evidenceDir, args.sliceContractFile, process.env, args);
    process.stdout.write(`${report.status}: ${path.join(path.resolve(args.evidenceDir), "first-slice-verification.json")}\n`);
    return report.status === "passed" ? 0 : 1;
  } catch (error) {
    process.stderr.write(`first-slice verification failed: ${error.message}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) process.exitCode = await main();
