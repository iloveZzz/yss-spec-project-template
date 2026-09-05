import { attachScaffoldDecisionFixture } from "../../../../scripts/fixtures/user-decision/build-fixture.mjs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "generate_scaffold.mjs");
const digest = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const capabilityModules = {
  basic: { capabilities: [], modules: ["server", "service", "repository"] },
  adapter: { capabilities: ["external-integration"], modules: ["server", "service", "repository", "adapter"] },
  client: { capabilities: ["published-client"], modules: ["server", "service", "repository", "client"] },
  feign: { capabilities: ["feign-client"], modules: ["server", "service", "repository", "client", "feign-client"] },
  combined: { capabilities: ["external-integration", "feign-client"], modules: ["server", "service", "repository", "adapter", "client", "feign-client"] }
};

async function fixture(t, { profile = capabilityModules.basic, architectureProfile = "layered-mvc-service", skillId = "yss-layered-mvc-scaffold-generator" } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-layered-mvc-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const output = path.join(root, "backend");
  await mkdir(output);
  let decisionText = `${JSON.stringify({ schema_version: 1, kind: "scaffold-architecture-decisions", template: false, status: "current", decisions: [{ decision_id: "scaffold-decision.demo-service", project_id: "demo-service", parent_project_id: null, status: "lifecycle-approved", recommended_architecture: "layered-mvc", recommendation_reasons: ["薄 CRUD 服务"], confirmed_architecture: "layered-mvc", override_reason: null, inheritance_mode: "root-default", inherited_from: null, platform_profile: "spring-boot-2.7-jdk8", architecture_profile: architectureProfile, verification_database: "h2", production_database: "not-bound", requested_capabilities: profile.capabilities, resolved_modules: profile.modules, resolution_version: 1, user_confirmation: { confirmed_by: "tester", channel: "test", confirmation_ref: "test://confirmation", confirmed_at: "2026-09-05T00:00:00Z", normalized_text: "确认使用 MVC" }, decision_inputs_digest: `sha256:${"1".repeat(64)}` }] }, null, 2)}\n`;
  const decisionSet = JSON.parse(decisionText);
  decisionSet.decisions = decisionSet.decisions.map((decision) => attachScaffoldDecisionFixture(path.join(root, "user-decision"), decision));
  decisionText = JSON.stringify(decisionSet, null, 2) + "\n";
  const decisionFile = path.join(root, "scaffold-architecture-decisions.yaml");
  await writeFile(decisionFile, decisionText);
  const contract = {
    schema_version: 3,
    contract_id: "scaffold.demo-service.v1",
    contract_version: 1,
    scaffold_request_id: "request.demo-service",
    status: "approved",
    compiler_draft_ref: "compiler://demo/1",
    lifecycle_approval_ref: "approval://demo/1",
    persisted_ref: "contract://demo/1",
    current_version: 1,
    implementation_repository: "external",
    backend_repository: "external",
    scaffold_status: "required",
    project_name: "demo-service",
    target_output_dir: output,
    base_package: "com.yss.demo",
    architecture_family: "layered-mvc", architecture_profile: architectureProfile,
    generator_skill: skillId,
    decision_ref: decisionFile,
    decision_id: "scaffold-decision.demo-service",
    decision_digest: digest(decisionText),
    maven_coordinates: { group_id: "com.yss.demo", project_version: "1.0.0-SNAPSHOT", parent: { group_id: "com.yss.cloud", artifact_id: "yss-cloud-microservice", version: "2.0.0-SNAPSHOT" }, yss_components_version: "2.0.0-SNAPSHOT" },
    profiles: { architecture: "layered-mvc", persistence: "mybatis-plus", verification_database: "h2", production_database: "not-bound", platform: "spring-boot-2.7-jdk8", validation_namespace: "javax", repository: "yss-internal" },
    module_profile: { requested_capabilities: profile.capabilities, resolved_modules: profile.modules, resolution_version: 1 },
    allowed_write_paths: ["."],
    expected_evidence_files: [".yss/scaffold-generation.json"],
    verification_commands: ["./mvnw validate", "./mvnw test", "./mvnw package"],
    approval: { approval_ref: "approval://demo/1", approver: "lifecycle", persisted_ref: "contract://demo/1", current_version: 1 },
    work_unit: { id: "scaffold.demo", behavior: "project-scaffold", primary_skill: skillId, supporting_skills: ["yss-implementation-contract-compiler"], tdd_mode: "controlled-generation", allowed_write_paths: ["."], expected_evidence: [".yss/scaffold-generation.json"], verification_commands: ["./mvnw validate", "./mvnw test", "./mvnw package"], controlled_generation: true },
    generation_policy: { mode: "initialize-only", existing_target: "unsupported", old_project_migration: "unsupported", template_upgrade: "unsupported" }
  };
  const contractFile = path.join(root, "contract.json");
  await writeFile(contractFile, `${JSON.stringify(contract, null, 2)}\n`);
  const args = ["--project-name", "demo-service", "--base-package", "com.yss.demo", "--output-dir", output, "--contract-file", contractFile, "--contract-id", contract.contract_id, "--contract-version", "1", "--approval-ref", contract.lifecycle_approval_ref, "--compiler-draft-ref", contract.compiler_draft_ref, "--persisted-ref", contract.persisted_ref, "--group-id", "com.yss.demo", "--project-version", "1.0.0-SNAPSHOT", "--parent-group-id", "com.yss.cloud", "--parent-artifact-id", "yss-cloud-microservice", "--parent-version", "2.0.0-SNAPSHOT", "--yss-components-version", "2.0.0-SNAPSHOT"];
  return { root, output, decisionFile, contractFile, contract, args, project: path.join(output, "demo-service") };
}

test("数据分析初始化生成 H2 六模块和独立治理信封", async (t) => {
  const skillId = "yss-mvc-data-analysis-project-initializer";
  const data = await fixture(t, { architectureProfile: "mvc-data-analysis-v1", skillId, profile: { capabilities: [], modules: ["server", "core", "client", "repository", "adapter", "feign-client"] } });
  const context = "---\ncontext_schema_version: 1\n---\n# 业务上下文\n\n## 业务术语\n\n| 术语 | 含义 | 英文标识 | 适用业务责任区 | 避免 / 备注 |\n|---|---|---|---|---|\n";
  await writeFile(path.join(data.root, "context-handoff.md"), context);
  data.contract.context_handoff_ref = "context-handoff.md";
  data.contract.context_handoff_digest = digest(context);
  await writeFile(data.contractFile, JSON.stringify(data.contract));
  const initializer = path.resolve(path.dirname(script), `../../${skillId}/scripts/generate_project.mjs`);
  const result = spawnSync(process.execPath, [initializer, ...data.args], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(await readFile(path.join(data.project, ".yss/scaffold-generation.json"), "utf8"));
  assert.equal(manifest.architecture_identity.architecture_profile, "mvc-data-analysis-v1");
  assert.equal(manifest.generator_skill, skillId);
  assert.equal(await readFile(path.join(data.project, "CONTEXT.md"), "utf8"), context);
  await stat(path.join(data.project, ".git"));
  await stat(path.join(data.output, "skillUtils/skills-lock.json"));
  assert.ok(!manifest.ownership.generated_files.some((entry) => entry.path.startsWith(".git/")));
  const core = await readFile(path.join(data.project, "demo-service-core/pom.xml"), "utf8");
  assert.doesNotMatch(core, /demo-service-client|spring-web|ojdbc|mysql-connector/);
});

test("旧数据库和 Mock 参数在写入前被拒绝", async (t) => {
  const data = await fixture(t);
  for (const args of [["--database", "mysql"], ["--with-mock"]]) {
    const result = spawnSync(process.execPath, [script, ...data.args, ...args], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    await assert.rejects(stat(data.project), { code: "ENOENT" });
  }
});

test("可选离线 Maven 可行性检查（不替代受控仓库验收）", { skip: process.env.YSS_BACKEND_OFFLINE_PROBE !== "1" }, async (t) => {
  const data = await fixture(t);
  const generated = spawnSync(process.execPath, [script, ...data.args], { encoding: "utf8" });
  assert.equal(generated.status, 0, generated.stderr);
  for (const phase of ["validate", "test", "package"]) {
    const result = spawnSync(path.join(data.project, "mvnw"), ["-o", phase], { cwd: data.project, encoding: "utf8", timeout: 60_000 });
    t.diagnostic(`./mvnw -o ${phase}: exit=${result.status}; ${result.error?.message ?? ""}`);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  }
});

for (const database of ["h2"]) {
  test(`生成 ${database} 基础 Profile`, async (t) => {
    const data = await fixture(t, { database });
    const result = spawnSync(process.execPath, [script, ...data.args], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const manifest = JSON.parse(await readFile(path.join(data.project, ".yss/scaffold-generation.json"), "utf8"));
    assert.equal(manifest.schema_version, 3);
    assert.equal(manifest.architecture_family, "layered-mvc");
    assert.equal(manifest.profiles.verification_database, database);
    assert.equal(manifest.profiles.production_database, "not-bound");
    assert.equal(manifest.architecture_identity.architecture_profile, "layered-mvc-service");
    const config = await readFile(path.join(data.project, "demo-service-server/src/main/resources/application.yml"), "utf8");
    assert.doesNotMatch(config, /datasource|profiles|jdbc:/);
    const local = await readFile(path.join(data.project, "demo-service-server/src/main/resources/application-scaffold-local.yml"), "utf8");
    assert.match(local, /jdbc:h2:mem:/);
    assert.deepEqual(manifest.module_profile.resolved_modules, capabilityModules.basic.modules);
    await stat(path.join(data.project, "demo-service-server/src/main/java/com/yss/demo/DemoServiceApplication.java"));
    await assert.rejects(stat(path.join(data.project, "demo-service-server/src/main/java/com/yss/demo/server/controller")), { code: "ENOENT" });
  });
}

for (const [name, profile] of Object.entries(capabilityModules)) {
  test(`能力闭包 ${name}`, async (t) => {
    const data = await fixture(t, { profile });
    const result = spawnSync(process.execPath, [script, ...data.args], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const pom = await readFile(path.join(data.project, "pom.xml"), "utf8");
    for (const module of profile.modules) assert.match(pom, new RegExp(`<module>demo-service-${module}</module>`));
    for (const module of ["adapter", "client", "feign-client"].filter((item) => !profile.modules.includes(item))) assert.doesNotMatch(pom, new RegExp(`<module>demo-service-${module}</module>`));
  });
}

test("选择缺失、digest 漂移和非空目标均阻断", async (t) => {
  const missing = await fixture(t);
  missing.contract.decision_id = "decision.missing";
  await writeFile(missing.contractFile, `${JSON.stringify(missing.contract)}\n`);
  assert.notEqual(spawnSync(process.execPath, [script, ...missing.args], { encoding: "utf8" }).status, 0);

  const drift = await fixture(t);
  drift.contract.decision_digest = `sha256:${"0".repeat(64)}`;
  await writeFile(drift.contractFile, `${JSON.stringify(drift.contract)}\n`);
  assert.notEqual(spawnSync(process.execPath, [script, ...drift.args], { encoding: "utf8" }).status, 0);

  const existing = await fixture(t);
  await mkdir(existing.project);
  const blocked = spawnSync(process.execPath, [script, ...existing.args], { encoding: "utf8" });
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /目标已存在/);
});
