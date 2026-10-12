#!/usr/bin/env node
import { createHash } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateJsonSchema } from "../../../../scripts/lib/json-schema.mjs";

const fail = (message) => { throw new TypeError(message); };
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sha256 = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
function argsOf(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, "")] = argv[i + 1];
  return args;
}
function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) fail(result.stderr || `git ${args.join(" ")} failed`);
  return result.stdout.trim();
}
function walk(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const item = path.join(root, entry.name);
    return entry.isDirectory() ? walk(item) : entry.isFile() || entry.isSymbolicLink() ? [item] : [];
  });
}
function validate(contract, outputDir) {
  validateJsonSchema(contract, path.join(REPOSITORY_ROOT, ".template-spec/process/schemas/project-scaffold-contract.schema.json"), { label: "Project Scaffold Contract v4" });
  if (contract.schema_version !== 4 || contract.kind !== "project-scaffold-contract") fail("frontend scaffold requires Project Scaffold Contract schema v4");
  if (contract.status !== "approved" || contract.current_version !== true || !contract.persisted_ref) fail("scaffold contract must be approved, persisted and current");
  if (contract.delivery_role !== "frontend" || contract.scaffold_kind !== "frontend-yss-vue3" || contract.generator_skill !== "yss-frontend-scaffold-generator") fail("contract is not for the YSS frontend generator");
  if (path.resolve(contract.target_output_dir) !== outputDir) fail("output directory differs from approved contract");
  if (contract.generation_policy?.mode !== "initialize-only" || contract.generation_policy?.existing_target !== "unsupported") fail("unsupported generation policy");
  if (contract.frontend.template.kind === "bundled") {
    for (const value of [contract.frontend.app_name, contract.frontend.microapp_name]) if (!/^[a-z][a-z0-9-]{0,62}$/.test(value)) fail("bundled app names must be lowercase kebab-case");
    if (!/^\/(?:[a-zA-Z0-9_-]+\/?)*$/.test(contract.frontend.base_route)) fail("bundled base_route must be an absolute path without query, quotes or traversal");
    if (Object.keys(contract.frontend.replacements || {}).length) fail("bundled baseline does not accept arbitrary replacements");
  } else if (!contract.frontend?.template?.repository || !/^[a-f0-9]{40}$/.test(contract.frontend.template.commit || "")) fail("template repository and exact 40-character commit are required");
  if (contract.frontend.openapi_impact === "frozen" && (!contract.frontend.openapi_json_ref || !contract.frontend.openapi_json_digest)) fail("frozen OpenAPI JSON and digest are required");
  if (contract.frontend.openapi_impact === "not-applicable" && !contract.frontend.openapi_not_applicable_reason) fail("no-API scaffold requires a reason");
}

export function generate({ contractFile, templateCheckout, outputDir }) {
  const contract = JSON.parse(readFileSync(contractFile, "utf8"));
  outputDir = path.resolve(outputDir);
  validate(contract, outputDir);
  const bundled = contract.frontend.template.kind === "bundled";
  let sourceRoot;
  if (bundled) {
    const bytes = readFileSync(path.join(SKILL_ROOT, "references/data-quality-v1.manifest.json"));
    if (sha256(bytes) !== contract.frontend.template.manifest_digest) fail("bundled manifest digest differs from approved contract");
    const manifest = JSON.parse(bytes);
    if (manifest.baseline_id !== contract.frontend.template.baseline_id) fail("bundled baseline mismatch");
    sourceRoot = path.join(SKILL_ROOT, "assets/data-quality-v1");
    const actual = walk(sourceRoot).map(file => path.relative(sourceRoot, file)).sort();
    if (JSON.stringify(actual) !== JSON.stringify(Object.keys(manifest.files).sort())) fail("bundled file inventory mismatch");
    for (const relative of actual) {
      const file = path.join(sourceRoot, relative);
      if (lstatSync(file).isSymbolicLink() || sha256(readFileSync(file)) !== manifest.files[relative]) fail(`bundled file digest mismatch: ${relative}`);
    }
  } else {
    if (!templateCheckout) fail("Git template requires --template-checkout");
    templateCheckout = path.resolve(templateCheckout);
    if (!existsSync(path.join(templateCheckout, ".git"))) fail("template checkout must be a Git worktree");
    if (git(templateCheckout, "rev-parse", "HEAD") !== contract.frontend.template.commit) fail("template checkout does not match approved commit");
    if (git(templateCheckout, "config", "--get", "remote.origin.url") !== contract.frontend.template.repository) fail("template repository differs from approved source");
  }
  let openapi;
  if (contract.frontend.openapi_impact === "frozen") {
    openapi = readFileSync(contract.frontend.openapi_json_ref);
    if (sha256(openapi) !== contract.frontend.openapi_json_digest) fail("OpenAPI JSON digest mismatch");
  }
  if (existsSync(outputDir) && readdirSync(outputDir).length > 0) fail("target directory must not exist or must be empty");
  mkdirSync(outputDir, { recursive: true });
  const scratch = mkdtempSync(path.join(tmpdir(), "yss-frontend-source-"));
  try {
    // Read the approved Git tree, never dependency caches or edits in the checkout.
    if (bundled) cpSync(sourceRoot, scratch, { recursive: true });
    else {
      const archive = spawnSync("git", ["archive", contract.frontend.template.commit], { cwd: templateCheckout, maxBuffer: 256 * 1024 * 1024 });
      if (archive.error || archive.status !== 0) fail(archive.error?.message || String(archive.stderr));
      const unpack = spawnSync("tar", ["-xf", "-", "-C", scratch], { input: archive.stdout });
      if (unpack.error || unpack.status !== 0) fail(unpack.error?.message || String(unpack.stderr));
    }
    cpSync(scratch, outputDir, { recursive: true, verbatimSymlinks: true });
  } finally { rmSync(scratch, { recursive: true, force: true }); }

  const replacements = {
    "__APP_NAME__": contract.frontend.app_name,
    "__MICROAPP_NAME__": contract.frontend.microapp_name,
    "__BASE_ROUTE__": contract.frontend.base_route,
    ...(contract.frontend.replacements || {}),
  };
  const generatedFiles = walk(outputDir).map(file => path.relative(outputDir, file));
  for (const ref of generatedFiles) {
    const file = path.join(outputDir, ref);
    const info = lstatSync(file);
    if (info.isSymbolicLink() || info.size > 2_000_000) continue;
    const bytes = readFileSync(file);
    if (bytes.includes(0) || !Buffer.from(bytes.toString("utf8")).equals(bytes)) continue;
    const text = bytes.toString("utf8");
    const replaced = Object.entries(replacements).reduce((value, [from, to]) => value.split(from).join(to), text);
    if (replaced !== text) writeFileSync(file, replaced);
  }
  if (contract.frontend.openapi_impact === "frozen") {
    mkdirSync(path.join(outputDir, "openapi"), { recursive: true });
    writeFileSync(path.join(outputDir, "openapi", "openapi.json"), openapi);
    if (!generatedFiles.includes("openapi/openapi.json")) generatedFiles.push("openapi/openapi.json");
  }
  if (contract.init_git === true) git(outputDir, "init");
  generatedFiles.sort();
  const manifest = {
    schema_version: 4,
    kind: "frontend-scaffold",
    delivery_role: "frontend",
    generator_skill: "yss-frontend-scaffold-generator",
    contract_id: contract.contract_id,
    contract_version: contract.contract_version,
    contract_digest: sha256(readFileSync(contractFile)),
    contract_file_ref: path.resolve(contractFile),
    persisted_ref: contract.persisted_ref,
    approval_ref: contract.approval.approval_ref,
    template: { ...contract.frontend.template, ...(!bundled ? { checkout: templateCheckout } : {}) },
    repository_scope: contract.repository_scope,
    target_output_dir: outputDir,
    init_git: contract.init_git,
    openapi_impact: contract.frontend.openapi_impact,
    generation_mode: "controlled-generation",
    generation_policy: contract.generation_policy,
    verification_commands: contract.verification_commands,
    generated_files: generatedFiles,
    completion_level: "generated",
    generated_at: new Date().toISOString(),
  };
  mkdirSync(path.join(outputDir, ".yss"), { recursive: true });
  writeFileSync(path.join(outputDir, ".yss", "scaffold-generation.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const args = argsOf(process.argv.slice(2));
    generate({ contractFile: args["contract-file"], templateCheckout: args["template-checkout"], outputDir: args["output-dir"] });
    process.stdout.write("frontend scaffold generated\n");
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
