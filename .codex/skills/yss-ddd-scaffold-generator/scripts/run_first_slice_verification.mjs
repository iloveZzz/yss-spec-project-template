#!/usr/bin/env node
/** Promote a generated backend only after a complete, approved first vertical slice passes real Wrapper verification. */
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { run as runScaffoldVerification } from "./run_scaffold_verification.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "../../../..");
const REQUIRED_SKILLS = ["yss-domain", "yss-application", "yss-repository", "yss-mybatis", "yss-web-controller", "yss-dto", "yss-exception", "yss-validation", "mapstruct", "lombok", "alibaba-java-code-style"];
const REQUIRED_LAYERS = ["domain", "application", "infrastructure", "web"];
const ARTIFACT_CHECKS = [
  ["domain-model", /-domain\/src\/main\/java\/.+\/domain\/.+\/model\/.+\.java$/],
  ["domain-gateway", /-domain\/src\/main\/java\/.+\/domain\/.+\/gateway\/.+Gateway\.java$/],
  ["domain-behavior-test", /-domain\/src\/test\/java\/.+(?:Test|Tests)\.java$/],
  ["application-command-or-query", /-application\/src\/main\/java\/.+\/application\/(?:command|query)\/.+\.java$/],
  ["application-result", /-application\/src\/main\/java\/.+\/application\/result\/.+Result\.java$/],
  ["application-service", /-application\/src\/main\/java\/.+\/application\/service\/.+Service\.java$/],
  ["application-service-implementation", /-application\/src\/main\/java\/.+\/application\/service\/impl\/.+ServiceImpl\.java$/],
  ["application-behavior-test", /-application\/src\/test\/java\/.+(?:Test|Tests)\.java$/],
  ["infrastructure-po", /-infrastructure\/src\/main\/java\/.+\/infrastructure\/persistence\/po\/.+PO\.java$/],
  ["infrastructure-repository", /-infrastructure\/src\/main\/java\/.+\/infrastructure\/persistence\/repository\/.+Repository\.java$/],
  ["infrastructure-convertor", /-infrastructure\/src\/main\/java\/.+\/infrastructure\/persistence\/convertor\/.+Convertor\.java$/],
  ["infrastructure-gateway-implementation", /-infrastructure\/src\/main\/java\/.+\/infrastructure\/persistence\/gateway\/.+GatewayImpl\.java$/],
  ["infrastructure-query-adapter", /-infrastructure\/src\/main\/java\/.+\/infrastructure\/query\/adapter\/.+QueryAdapter\.java$/],
  ["infrastructure-integration-test", /-infrastructure\/src\/test\/java\/.+(?:Test|Tests)\.java$/],
  ["web-controller", /-adapter\/.+-web\/src\/main\/java\/.+\/rest\/.+Controller\.java$/],
  ["web-convertor", /-adapter\/.+-web\/src\/main\/java\/.+\/rest\/convertor\/.+WebConvertor\.java$/],
  ["web-request", /-adapter\/.+-web\/src\/main\/java\/.+\/rest\/dto\/request\/.+Request\.java$/],
  ["web-response", /-adapter\/.+-web\/src\/main\/java\/.+\/rest\/dto\/response\/.+Response\.java$/],
  ["web-contract-test", /-adapter\/.+-web\/src\/test\/java\/.+(?:Test|Tests)\.java$/]
];

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
function invalidContractReasons(contract) {
  const reasons = [];
  if (contract.schema_version !== 1) reasons.push("slice-contract-schema");
  if (contract.status !== "approved") reasons.push("slice-contract-not-approved");
  for (const field of ["contract_id", "contract_version", "slice_id"]) if (contract[field] === undefined || contract[field] === null || contract[field] === "") reasons.push(`slice-contract-${field}-missing`);
  if (contract.readiness?.blockers?.length) reasons.push("slice-contract-has-blockers");
  if (contract.readiness?.stale_inputs?.length) reasons.push("slice-contract-has-stale-inputs");
  const actualSkills = new Set([...(contract.common?.required_skills ?? []), ...(contract.backend?.required_skills ?? [])]);
  for (const skill of REQUIRED_SKILLS) if (!actualSkills.has(skill)) reasons.push(`required-skill-missing:${skill}`);
  const actualLayers = new Set(contract.backend?.affected_layers ?? []);
  for (const layer of REQUIRED_LAYERS) if (!actualLayers.has(layer)) reasons.push(`required-layer-missing:${layer}`);
  if (!Array.isArray(contract.work_units) || !contract.work_units.length) reasons.push("slice-contract-work-units-missing");
  else for (const [index, unit] of contract.work_units.entries()) {
    const id = unit.id || `index-${index}`;
    if (unit.contract_id !== contract.contract_id) reasons.push(`work-unit-contract-id-mismatch:${id}`);
    if (unit.contract_version !== contract.contract_version) reasons.push(`work-unit-contract-version-mismatch:${id}`);
    if (!unit.work_unit?.primary_skill) reasons.push(`work-unit-primary-skill-missing:${id}`);
  }
  return reasons;
}
async function downstreamDrift(manifest) {
  const drift = [];
  const recordedSkills = manifest.readiness?.downstream_skills ?? {};
  for (const skill of REQUIRED_SKILLS) {
    const expected = recordedSkills[skill];
    if (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected)) {
      drift.push(`${skill}:digest-missing`);
      continue;
    }
    const root = path.join(REPOSITORY_ROOT, ".agents", "skills", skill);
    if (!await isFile(path.join(root, "SKILL.md"))) drift.push(`${skill}:unavailable`);
    else if (await treeDigest(root) !== expected) drift.push(`${skill}:digest-mismatch`);
  }
  const contracts = manifest.readiness?.contracts ?? {};
  const contractFiles = {
    scaffold_parent: path.join(REPOSITORY_ROOT, ".agents", "skills", "yss-ddd-scaffold-generator", "references", "yss-backend-scaffold-parent", "SKILL.md"),
    compiler_contract: path.join(REPOSITORY_ROOT, ".agents", "skills", "yss-implementation-contract-compiler", "references", "compiler-contract.yaml")
  };
  for (const [name, target] of Object.entries(contractFiles)) {
    const expected = contracts[name];
    if (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected)) {
      drift.push(`${name}:digest-missing`);
      continue;
    }
    if (!await isFile(target)) drift.push(`${name}:unavailable`);
    else if (sha256(await readFile(target)) !== expected) drift.push(`${name}:digest-mismatch`);
  }
  return drift;
}

export async function runFirstSliceVerification(projectRoot, evidenceDir, sliceContractFile, environment = process.env) {
  projectRoot = path.resolve(projectRoot);
  evidenceDir = path.resolve(evidenceDir);
  sliceContractFile = path.resolve(sliceContractFile);
  const manifestPath = path.join(projectRoot, ".yss", "scaffold-generation.json");
  const reportPath = path.join(evidenceDir, "first-slice-verification.json");
  if (!await isFile(manifestPath)) throw new Error(`missing scaffold manifest: ${manifestPath}`);
  if (!await isFile(sliceContractFile)) throw new Error(`missing Slice Implementation Contract: ${sliceContractFile}`);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const contract = JSON.parse(await readFile(sliceContractFile, "utf8"));
  const contractFailures = invalidContractReasons(contract);
  if (manifest.schema_version !== 2 || manifest.completion_level !== "empty-scaffold-verified") contractFailures.push("scaffold-not-empty-scaffold-verified");
  const projectFiles = await files(projectRoot);
  const missingArtifacts = ARTIFACT_CHECKS.filter(([, pattern]) => !projectFiles.some((file) => pattern.test(file))).map(([name]) => name);
  const skillDrift = await downstreamDrift(manifest);
  if (contractFailures.length || missingArtifacts.length || skillDrift.length) {
    const report = { verification_mode: "first-slice", project_root: projectRoot, slice_contract_ref: sliceContractFile, scaffold_manifest_ref: manifestPath, generated_at: isoNow(), status: "failed", completion_level: manifest.completion_level, contract_failures: contractFailures, missing_artifacts: missingArtifacts, downstream_skill_drift: skillDrift, commands: [] };
    await writeJsonAtomic(reportPath, report);
    return report;
  }

  const mavenEvidence = path.join(evidenceDir, "maven");
  const wrapper = await runScaffoldVerification(projectRoot, mavenEvidence, environment);
  const passed = wrapper.status === "passed";
  const report = { verification_mode: "first-slice", project_root: projectRoot, slice_contract_ref: sliceContractFile, scaffold_manifest_ref: manifestPath, generated_at: isoNow(), status: passed ? "passed" : "failed", failure_category: wrapper.failure_category, completion_level: passed ? "first-slice-verified" : manifest.completion_level, contract_failures: [], missing_artifacts: [], downstream_skill_drift: [], commands: wrapper.commands };
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
    if (!["--project-root", "--evidence-dir", "--slice-contract-file"].includes(flag) || !value) throw new Error("usage: run_first_slice_verification.mjs --project-root DIR --evidence-dir DIR --slice-contract-file FILE");
    result[flag.slice(2).replaceAll(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
  }
  if (!result.projectRoot || !result.evidenceDir || !result.sliceContractFile) throw new Error("project root, evidence dir, and slice contract file are required");
  return result;
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const report = await runFirstSliceVerification(args.projectRoot, args.evidenceDir, args.sliceContractFile);
    process.stdout.write(`${report.status}: ${path.join(path.resolve(args.evidenceDir), "first-slice-verification.json")}\n`);
    return report.status === "passed" ? 0 : 1;
  } catch (error) {
    process.stderr.write(`first-slice verification failed: ${error.message}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) process.exitCode = await main();
