import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { runFirstSliceVerification } from "./run_first_slice_verification.mjs";

const requiredSkills = ["yss-domain", "yss-application", "yss-repository", "yss-mybatis", "yss-web-controller", "yss-dto", "yss-exception", "yss-validation", "mapstruct", "lombok", "alibaba-java-code-style"];
const scripts = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scripts, "../../../..");

async function treeDigest(root) {
  const relativeFiles = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) relativeFiles.push(path.relative(root, absolute).split(path.sep).join("/"));
    }
  }
  await visit(root);
  const hash = createHash("sha256");
  for (const relative of relativeFiles.sort()) hash.update(relative).update("\0").update(await readFile(path.join(root, relative))).update("\0");
  return hash.digest("hex");
}

async function readiness() {
  const downstreamSkills = {};
  for (const skill of requiredSkills) downstreamSkills[skill] = await treeDigest(path.join(repositoryRoot, ".agents", "skills", skill));
  const digest = async (relative) => createHash("sha256").update(await readFile(path.join(repositoryRoot, relative))).digest("hex");
  return {
    downstream_skills: downstreamSkills,
    contracts: {
      scaffold_parent: await digest(".agents/skills/yss-ddd-scaffold-generator/references/yss-backend-scaffold-parent/SKILL.md"),
      router_contract: await digest(".agents/skills/yss-router/references/router-contract.yaml")
    },
    architecture_ruleset: "b".repeat(64)
  };
}

async function write(project, relative, content = "fixture\n") {
  const target = path.join(project, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}

async function fixture({ omitGatewayImpl = false, omitReadiness = false } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-first-slice-verification-"));
  const project = path.join(root, "demo-service");
  const evidence = path.join(root, "evidence");
  const manifestPath = path.join(project, ".yss", "scaffold-generation.json");
  const contractPath = path.join(root, "slice-contract.json");
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify({
    schema_version: 2,
    contract_id: "scaffold-1",
    contract_version: 1,
    scaffold_request_id: "scaffold-request-1",
    contract_digest: "a".repeat(64),
    profiles: { architecture: "target-domain-model", persistence: "mybatis-plus", database: "mysql", platform: "spring-boot-2.7-jdk8", validation_namespace: "javax", dto_placement: "web", repository: "yss-internal" },
    ownership: { generated_files: [] },
    readiness: omitReadiness ? { downstream_skills: {}, contracts: {}, architecture_ruleset: "b".repeat(64) } : await readiness(),
    generation_policy: { mode: "initialize-only", existing_target: "unsupported", old_project_migration: "unsupported", template_upgrade: "unsupported" },
    completion_level: "empty-scaffold-verified",
    approval_ref: "approval-1",
    approver: "maintainer",
    lifecycle_approval_ref: "approval-1",
    router_draft_ref: "router-1",
    persisted_ref: "persisted-1",
    contract_file_ref: contractPath,
    current_version: 1,
    allowed_write_paths: ["."],
    expected_evidence_files: [".yss/scaffold-generation.json"],
    verification_commands: ["./mvnw validate", "./mvnw test", "./mvnw package"],
    generation_mode: "controlled-generation",
    maven_coordinates_source: "approved-contract"
  }));
  await writeFile(contractPath, JSON.stringify({
    schema_version: 1,
    contract_id: "slice-1",
    contract_version: 1,
    slice_id: "quality-rule-first-slice",
    status: "approved",
    readiness: { blockers: [], stale_inputs: [] },
    common: { required_skills: requiredSkills },
    backend: { status: "required", affected_layers: ["domain", "application", "infrastructure", "web"], required_skills: requiredSkills },
    work_units: [{ id: "slice-backend", contract_id: "slice-1", contract_version: 1, work_unit: { primary_skill: "yss-domain" } }]
  }));
  await write(project, "mvnw", "#!/bin/sh\nexit 0\n");
  await chmod(path.join(project, "mvnw"), 0o755);
  await write(project, ".mvn/settings.xml", "<settings/>\n");
  await write(project, ".mvn/maven.config", "-s .mvn/settings.xml -P yss-internal\n");
  const files = [
    "demo-service-domain/src/main/java/com/yss/demo/domain/quality/model/QualityRule.java",
    "demo-service-domain/src/main/java/com/yss/demo/domain/quality/gateway/QualityRuleGateway.java",
    "demo-service-domain/src/test/java/com/yss/demo/domain/quality/model/QualityRuleTest.java",
    "demo-service-application/src/main/java/com/yss/demo/application/command/QualityRuleCreateCommand.java",
    "demo-service-application/src/main/java/com/yss/demo/application/query/QualityRulePageQuery.java",
    "demo-service-application/src/main/java/com/yss/demo/application/result/QualityRuleResult.java",
    "demo-service-application/src/main/java/com/yss/demo/application/service/QualityRuleService.java",
    "demo-service-application/src/main/java/com/yss/demo/application/service/impl/QualityRuleServiceImpl.java",
    "demo-service-application/src/test/java/com/yss/demo/application/service/QualityRuleServiceTest.java",
    "demo-service-infrastructure/src/main/java/com/yss/demo/infrastructure/persistence/po/QualityRulePO.java",
    "demo-service-infrastructure/src/main/java/com/yss/demo/infrastructure/persistence/repository/QualityRuleRepository.java",
    "demo-service-infrastructure/src/main/java/com/yss/demo/infrastructure/persistence/convertor/QualityRulePersistenceConvertor.java",
    "demo-service-infrastructure/src/main/java/com/yss/demo/infrastructure/query/adapter/QualityRuleQueryAdapter.java",
    "demo-service-infrastructure/src/test/java/com/yss/demo/infrastructure/persistence/QualityRuleGatewayIntegrationTest.java",
    "demo-service-adapter/demo-service-web/src/main/java/com/yss/demo/rest/QualityRuleController.java",
    "demo-service-adapter/demo-service-web/src/main/java/com/yss/demo/rest/convertor/QualityRuleWebConvertor.java",
    "demo-service-adapter/demo-service-web/src/main/java/com/yss/demo/rest/dto/request/QualityRuleCreateRequest.java",
    "demo-service-adapter/demo-service-web/src/main/java/com/yss/demo/rest/dto/response/QualityRuleResponse.java",
    "demo-service-adapter/demo-service-web/src/test/java/com/yss/demo/rest/QualityRuleContractTest.java"
  ];
  if (!omitGatewayImpl) files.push("demo-service-infrastructure/src/main/java/com/yss/demo/infrastructure/persistence/gateway/QualityRuleGatewayImpl.java");
  for (const relative of files) await write(project, relative);
  return { root, project, evidence, manifestPath, contractPath };
}

const environment = { ...process.env, JAVA_HOME: "/fixture/java", YSS_MAVEN_REPOSITORY_URL: "https://repo.example.invalid", MAVEN_REPO_USERNAME: "user", MAVEN_REPO_PASSWORD: "secret" };

test("refuses first-slice promotion when a required persistence seam is absent", async () => {
  const data = await fixture({ omitGatewayImpl: true });
  const report = await runFirstSliceVerification(data.project, data.evidence, data.contractPath, environment);
  assert.equal(report.status, "failed");
  assert.ok(report.missing_artifacts.includes("infrastructure-gateway-implementation"));
  const manifest = JSON.parse(await readFile(data.manifestPath, "utf8"));
  assert.equal(manifest.completion_level, "empty-scaffold-verified");
});

test("refuses first-slice promotion when downstream skill or contract digests are absent", async () => {
  const data = await fixture({ omitReadiness: true });
  const report = await runFirstSliceVerification(data.project, data.evidence, data.contractPath, environment);
  assert.equal(report.status, "failed");
  assert.ok(report.downstream_skill_drift.includes("yss-domain:digest-missing"));
  assert.ok(report.downstream_skill_drift.includes("router_contract:digest-missing"));
  const manifest = JSON.parse(await readFile(data.manifestPath, "utf8"));
  assert.equal(manifest.completion_level, "empty-scaffold-verified");
});

test("refuses first-slice promotion when a work unit references a stale contract version", async () => {
  const data = await fixture();
  const contract = JSON.parse(await readFile(data.contractPath, "utf8"));
  contract.work_units[0].contract_version = 0;
  await writeFile(data.contractPath, JSON.stringify(contract));
  const report = await runFirstSliceVerification(data.project, data.evidence, data.contractPath, environment);
  assert.equal(report.status, "failed");
  assert.ok(report.contract_failures.includes("work-unit-contract-version-mismatch:slice-backend"));
});

test("promotes a complete approved slice only after all root wrapper commands pass", async () => {
  const data = await fixture();
  const report = await runFirstSliceVerification(data.project, data.evidence, data.contractPath, environment);
  assert.equal(report.status, "passed");
  assert.equal(report.completion_level, "first-slice-verified");
  assert.deepEqual(report.commands.map((item) => item.exit_code), [0, 0, 0]);
  const manifest = JSON.parse(await readFile(data.manifestPath, "utf8"));
  assert.equal(manifest.completion_level, "first-slice-verified");
  assert.equal(manifest.first_slice_contract.contract_id, "slice-1");
  assert.equal(manifest.first_slice_contract.slice_id, "quality-rule-first-slice");
  assert.equal(JSON.parse(await readFile(path.join(data.evidence, "first-slice-verification.json"), "utf8")).status, "passed");
});
