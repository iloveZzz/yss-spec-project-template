#!/usr/bin/env node
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = mkdtempSync(path.join(os.tmpdir(), "yss-frontend-scaffold-"));
process.on("exit", () => rmSync(root, { recursive: true, force: true }));
const template = path.join(root, "template"), output = path.join(root, "output"), evidence = path.join(root, "evidence"), bin = path.join(root, "bin");
mkdirSync(template); mkdirSync(bin);
writeFileSync(path.join(template, "package.json"), JSON.stringify({ name: "__APP_NAME__", scripts: { lint: "noop", "type-check": "noop", build: "noop" } }));
writeFileSync(path.join(template, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
writeFileSync(path.join(template, "micro-config.json"), JSON.stringify({ name: "__MICROAPP_NAME__", route: "__BASE_ROUTE__" }));
for (const args of [["init"], ["config", "user.email", "test@example.com"], ["config", "user.name", "test"], ["remote", "add", "origin", template], ["add", "."], ["commit", "-m", "fixture"]]) {
  const result = spawnSync("git", args, { cwd: template, encoding: "utf8" }); assert.equal(result.status, 0, result.stderr);
}
const commit = spawnSync("git", ["rev-parse", "HEAD"], { cwd: template, encoding: "utf8" }).stdout.trim();
const contract = {
  schema_version: 4, kind: "project-scaffold-contract", contract_id: "frontend.demo.v1", contract_version: "1", status: "approved", persisted_ref: "docs/.scratch/demo/scaffold-contract.json", current_version: true,
  delivery_role: "frontend", scaffold_kind: "frontend-yss-vue3", generator_skill: "yss-frontend-scaffold-generator", implementation_repository: output, target_output_dir: output, repository_scope: "external-repository", init_git: false,
  frontend: { app_name: "demo-app", microapp_name: "demo", base_route: "/demo", package_manager: "pnpm", template: { repository: template, commit }, openapi_impact: "not-applicable", openapi_not_applicable_reason: "static-only" },
  allowed_write_paths: [output], expected_evidence_files: [".yss/scaffold-generation.json"], verification_commands: ["pnpm install --frozen-lockfile", "pnpm lint", "pnpm type-check", "pnpm build"], approval: { approval_ref: "decision://frontend", approver: "user" }, generation_policy: { mode: "initialize-only", existing_target: "unsupported", old_project_migration: "unsupported", template_upgrade: "unsupported" }
};
const contractFile = path.join(root, "contract.json"); writeFileSync(contractFile, JSON.stringify(contract));
const mockPnpm = path.join(bin, "pnpm"); writeFileSync(mockPnpm, "#!/bin/sh\nexit 0\n"); chmodSync(mockPnpm, 0o755);
const runner = path.resolve(".agents/skills/yss-frontend-scaffold-generator/scripts/generate_and_verify_scaffold.mjs");
const result = spawnSync(process.execPath, [runner, "--contract-file", contractFile, "--template-checkout", template, "--output-dir", output, "--evidence-dir", evidence], { encoding: "utf8", env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
assert.equal(result.status, 0, result.stderr);
assert.equal(existsSync(path.join(output, ".git")), false);
assert.equal(JSON.parse(readFileSync(path.join(output, "package.json"))).name, "demo-app");
assert.equal(JSON.parse(readFileSync(path.join(output, ".yss", "scaffold-generation.json"))).completion_level, "empty-scaffold-verified");
assert.equal(JSON.parse(readFileSync(path.join(evidence, "scaffold-verification.json"))).commands.length, 4);
const second = spawnSync(process.execPath, [runner, "--contract-file", contractFile, "--template-checkout", template, "--output-dir", output, "--evidence-dir", evidence], { encoding: "utf8", env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
assert.notEqual(second.status, 0);
assert.match(second.stderr, /must not exist or must be empty/);
process.stdout.write("前端脚手架受控生成场景验证通过\n");
