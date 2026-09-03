import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "./run_scaffold_verification.mjs";
import { makeGitlinkFixture } from "../../../../scripts/lib/git-submodule-fixtures.mjs";
import { GITLINK_MODE, gitLsFilesStage } from "../../../../scripts/lib/repository-scope-policy.mjs";

const scripts = path.dirname(fileURLToPath(import.meta.url));
const generator = path.join(scripts, "generate_scaffold.mjs");
const workflow = path.join(scripts, "generate_and_verify_scaffold.mjs");
const command = (args, options = {}) => new Promise((resolve) => execFile(process.execPath, [generator, ...args], { encoding: "utf8", ...options }, (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stdout, stderr })));
const workflowCommand = (args, options = {}) => new Promise((resolve) => execFile(process.execPath, [workflow, ...args], { encoding: "utf8", ...options }, (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stdout, stderr })));
async function treeDigest(root) {
  const hash = createHash("sha256");
  async function visit(directory) {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) hash.update(path.relative(root, absolute).split(path.sep).join("/")).update("\0").update(await readFile(absolute)).update("\0");
    }
  }
  await visit(root);
  return hash.digest("hex");
}
function contract(outputDir, overrides = {}) {
  return {
    schema_version: 2,
    contract_id: "scaffold-1",
    contract_version: 1,
    scaffold_request_id: "scaffold-request-1",
    status: "approved",
    router_draft_ref: "router-1",
    lifecycle_approval_ref: "approval-1",
    persisted_ref: "persisted-1",
    current_version: 1,
    implementation_repository: "external",
    backend_repository: "external",
    scaffold_status: "required",
    project_name: "demo-service",
    target_output_dir: outputDir,
    base_package: "com.yss.demo",
    maven_coordinates: {
      group_id: "com.yss.datamiddle",
      project_version: "1.0.0-SNAPSHOT",
      parent: { group_id: "com.yss.datamiddle", artifact_id: "yss-datamiddle-parent", version: "2.0.0-SNAPSHOT" },
      yss_components_version: "2.0.0-SNAPSHOT"
    },
    profiles: {
      architecture: "target-domain-model",
      persistence: "mybatis-plus",
      database: "mysql",
      platform: "spring-boot-2.7-jdk8",
      validation_namespace: "javax",
      dto_placement: "web",
      repository: "yss-internal"
    },
    allowed_write_paths: ["."],
    expected_evidence_files: [".yss/scaffold-generation.json"],
    verification_commands: ["./mvnw validate", "./mvnw test", "./mvnw package"],
    approval: { approval_ref: "approval-1", approver: "reviewer", persisted_ref: "persisted-1", current_version: 1 },
    work_unit: { id: "unit-1", behavior: "scaffold", primary_skill: "yss-ddd-scaffold-generator", supporting_skills: ["yss-router"], tdd_mode: "controlled-generation", allowed_write_paths: ["."], expected_evidence: ["manifest"], verification_commands: ["./mvnw validate", "./mvnw test", "./mvnw package"], controlled_generation: true },
    generation_policy: { mode: "initialize-only", existing_target: "unsupported", old_project_migration: "unsupported", template_upgrade: "unsupported" },
    ...overrides
  };
}
async function fixture(contractOverrides = {}) { const root = await mkdtemp(path.join(os.tmpdir(), "yss-scaffold-node-")); const output = path.join(root, "implementation"); await mkdir(output); const contractFile = path.join(root, "contract.json"); await writeFile(contractFile, `${JSON.stringify(contract(output, contractOverrides), null, 2)}\n`); return { root, output, contractFile, args: ["--project-name", "demo-service", "--base-package", "com.yss.demo", "--output-dir", output, "--database", "mysql", "--contract-id", "scaffold-1", "--contract-version", "1", "--approval-ref", "approval-1", "--router-draft-ref", "router-1", "--persisted-ref", "persisted-1", "--contract-file", contractFile, "--group-id", "com.yss.datamiddle", "--project-version", "1.0.0-SNAPSHOT", "--parent-group-id", "com.yss.datamiddle", "--parent-artifact-id", "yss-datamiddle-parent", "--parent-version", "2.0.0-SNAPSHOT", "--yss-components-version", "2.0.0-SNAPSHOT"] }; }

const controlledEnvironment = {
  ...process.env,
  YSS_MAVEN_REPOSITORY_URL: "https://repo.example.invalid/repository/maven-public/",
  MAVEN_REPO_USERNAME: "test-user",
  MAVEN_REPO_PASSWORD: "test-password"
};
function targetManifest(overrides = {}) {
  return {
    schema_version: 2,
    contract_id: "id",
    contract_version: 1,
    scaffold_request_id: "request",
    contract_digest: "a".repeat(64),
    approval_ref: "approval",
    approver: "reviewer",
    lifecycle_approval_ref: "approval",
    router_draft_ref: "router",
    persisted_ref: "persisted",
    contract_file_ref: "contract",
    current_version: 1,
    allowed_write_paths: ["."],
    expected_evidence_files: ["manifest"],
    verification_commands: ["./mvnw validate", "./mvnw test", "./mvnw package"],
    generation_mode: "controlled-generation",
    completion_level: "generated",
    profiles: { architecture: "target-domain-model", repository: "yss-internal" },
    ownership: { generated_files: [] },
    readiness: { downstream_skills: {}, architecture_ruleset: "b".repeat(64) },
    generation_policy: { mode: "initialize-only", existing_target: "unsupported", old_project_migration: "unsupported", template_upgrade: "unsupported" },
    maven_coordinates_source: "approved-contract",
    ...overrides
  };
}
async function prepareVerifierProject(project, manifest = targetManifest()) {
  await mkdir(path.join(project, ".yss"), { recursive: true });
  await mkdir(path.join(project, ".mvn"), { recursive: true });
  await writeFile(path.join(project, ".mvn", "maven.config"), "-s .mvn/settings.xml\n-P yss-internal\n");
  await writeFile(path.join(project, ".mvn", "settings.xml"), "<settings/>\n");
  await writeFile(path.join(project, ".yss", "scaffold-generation.json"), `${JSON.stringify(manifest)}\n`);
}

test("生成批准的服务级 target profile 骨架，并写入可追溯 Manifest v2", async (t) => { const data = await fixture(); t.after(() => rm(data.root, { recursive: true, force: true })); const result = await command(data.args); assert.equal(result.code, 0, result.stderr); const project = path.join(data.output, "demo-service"); const manifest = JSON.parse(await readFile(path.join(project, ".yss/scaffold-generation.json"), "utf8")); assert.equal(manifest.schema_version, 2); assert.equal(manifest.scaffold_request_id, "scaffold-request-1"); assert.equal(manifest.slice_id, undefined); assert.equal(manifest.completion_level, "generated"); assert.equal(manifest.profiles.architecture, "target-domain-model"); assert.deepEqual(manifest.generation_policy, { mode: "initialize-only", existing_target: "unsupported", old_project_migration: "unsupported", template_upgrade: "unsupported" }); assert.match(manifest.generator.template_digest, /^[a-f0-9]{64}$/); assert.match(manifest.contract_digest, /^[a-f0-9]{64}$/); assert.ok(manifest.ownership.generated_files.length > 8); assert.ok(manifest.ownership.generated_files.every((item) => item.owner === "generator" && /^[a-f0-9]{64}$/.test(item.sha256))); assert.equal(manifest.generation_mode, "controlled-generation"); assert.deepEqual(manifest.verification_commands, ["./mvnw validate", "./mvnw test", "./mvnw package"]); assert.equal(manifest.bootstrap_main_class, "com.yss.demo.DemoServiceApplication"); assert.equal(manifest.bootstrap_main_source, "demo-service-bootstrap/src/main/java/com/yss/demo/DemoServiceApplication.java"); assert.match(await readFile(path.join(project, manifest.bootstrap_main_source), "utf8"), /class DemoServiceApplication/); assert.match(await readFile(path.join(project, "pom.xml"), "utf8"), /demo-service/); assert.equal(manifest.readiness.downstream_skills["yss-domain"], await treeDigest(path.resolve(scripts, "../../yss-domain"))); assert.match(manifest.readiness.contracts.scaffold_parent, /^[a-f0-9]{64}$/); assert.match(manifest.readiness.contracts.router_contract, /^[a-f0-9]{64}$/); });

test("schema v1 scaffold contract is unsupported and is never upgraded", async (t) => {
  const data = await fixture({ schema_version: 1 });
  t.after(() => rm(data.root, { recursive: true, force: true }));
  const result = await command(data.args);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /unsupported: scaffold contract schema_version=1/);
  assert.equal(existsSync(path.join(data.output, "demo-service")), false);
});

test("一键工作流只有在真实 Maven 三命令全部通过后才报告完成", { timeout: 300_000 }, async (t) => {
  if (!["YSS_MAVEN_REPOSITORY_URL", "MAVEN_REPO_USERNAME", "MAVEN_REPO_PASSWORD"].every((name) => process.env[name])) {
    t.skip("缺少受控 YSS Maven 仓库环境，真实 Wrapper 验证由 L3 环境门禁执行");
    return;
  }
  const data = await fixture();
  t.after(() => rm(data.root, { recursive: true, force: true }));
  const evidence = path.join(data.root, "workflow-evidence");
  const result = await workflowCommand([...data.args, "--evidence-dir", evidence]);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /脚手架生成与验证完成/);
  const verification = JSON.parse(await readFile(path.join(evidence, "scaffold-verification.json"), "utf8"));
  const workflowReport = JSON.parse(await readFile(path.join(evidence, "scaffold-workflow.json"), "utf8"));
  assert.equal(verification.status, "passed");
  assert.deepEqual(verification.commands.map((item) => item.command), ["./mvnw validate", "./mvnw test", "./mvnw package"]);
  assert.ok(verification.commands.every((item) => item.exit_code === 0));
  assert.equal(verification.preflight.project_settings_wired, true);
  assert.equal(verification.preflight.repository_profile_wired, true);
  assert.equal(workflowReport.status, "completed");
  assert.equal(workflowReport.verification_ref, path.join(evidence, "scaffold-verification.json"));
  const manifest = JSON.parse(await readFile(path.join(data.output, "demo-service", ".yss", "scaffold-generation.json"), "utf8"));
  assert.equal(manifest.completion_level, "empty-scaffold-verified");
});

test("显式 Maven 坐标贯穿批准合同、生成参数、全部 POM 和生成清单", async (t) => {
  const mavenCoordinates = {
    group_id: "com.example.metadata",
    project_version: "1.2.3-SNAPSHOT",
    parent: {
      group_id: "com.yss.datamiddle",
      artifact_id: "yss-datamiddle-parent",
      version: "2.0.0-SNAPSHOT"
    },
    yss_components_version: "2.0.0-SNAPSHOT"
  };
  const data = await fixture({ maven_coordinates: mavenCoordinates });
  t.after(() => rm(data.root, { recursive: true, force: true }));
  const result = await command([
    ...data.args,
    "--group-id", mavenCoordinates.group_id,
    "--project-version", mavenCoordinates.project_version,
    "--parent-group-id", mavenCoordinates.parent.group_id,
    "--parent-artifact-id", mavenCoordinates.parent.artifact_id,
    "--parent-version", mavenCoordinates.parent.version,
    "--yss-components-version", mavenCoordinates.yss_components_version
  ]);
  assert.equal(result.code, 0, result.stderr);

  const project = path.join(data.output, "demo-service");
  const pomFiles = [
    "pom.xml",
    "demo-service-domain/pom.xml",
    "demo-service-application/pom.xml",
    "demo-service-infrastructure/pom.xml",
    "demo-service-adapter/pom.xml",
    "demo-service-adapter/demo-service-web/pom.xml",
    "demo-service-bootstrap/pom.xml"
  ];
  const poms = await Promise.all(pomFiles.map((file) => readFile(path.join(project, file), "utf8")));
  assert.ok(poms.every((pom) => pom.includes(mavenCoordinates.group_id)), "全部项目内坐标必须使用合同 groupId");
  assert.ok(poms.every((pom) => pom.includes(mavenCoordinates.project_version)), "全部项目内坐标必须使用合同版本");
  const manifest = JSON.parse(await readFile(path.join(project, ".yss/scaffold-generation.json"), "utf8"));
  assert.deepEqual(manifest.maven_coordinates, mavenCoordinates);
  assert.equal(manifest.maven_coordinates_source, "approved-contract");

});

test("生成工程声明命名仓库 profile、target DDD 依赖边界和构建门禁", async (t) => {
  const data = await fixture();
  t.after(() => rm(data.root, { recursive: true, force: true }));
  const result = await command(data.args);
  assert.equal(result.code, 0, result.stderr);
  const project = path.join(data.output, "demo-service");
  const mavenConfig = await readFile(path.join(project, ".mvn/maven.config"), "utf8");
  const settings = await readFile(path.join(project, ".mvn/settings.xml"), "utf8");
  assert.match(mavenConfig, /-s \.mvn\/settings\.xml/);
  assert.match(mavenConfig, /-P yss-internal/);
  assert.doesNotMatch(settings, /192\.168\.|<activeProfile>aliyun-only<\/activeProfile>/);
  assert.match(settings, /\$\{env\.YSS_MAVEN_REPOSITORY_URL\}/);
  assert.match(settings, /\$\{env\.MAVEN_REPO_USERNAME\}/);
  assert.match(settings, /\$\{env\.MAVEN_REPO_PASSWORD\}/);

  const domainPom = await readFile(path.join(project, "demo-service-domain/pom.xml"), "utf8");
  const infrastructurePom = await readFile(path.join(project, "demo-service-infrastructure/pom.xml"), "utf8");
  const bootstrapPom = await readFile(path.join(project, "demo-service-bootstrap/pom.xml"), "utf8");
  assert.doesNotMatch(domainPom, /yss-component-(?:dto|exception)|jackson-databind|swagger-annotations|validation-api/);
  assert.match(infrastructurePom, /yss-component-mybatis-plus-starter/);
  assert.match(infrastructurePom, /spring-boot-starter-jdbc/);
  assert.match(bootstrapPom, /spring-boot-starter-actuator/);
  assert.match(bootstrapPom, /spring-boot-starter-test/);
  const webPom = await readFile(path.join(project, "demo-service-adapter", "demo-service-web", "pom.xml"), "utf8");
  assert.match(webPom, /yss-component-dto/);
  assert.match(webPom, /yss-component-exception/);
  assert.match(webPom, /io\.swagger\.core\.v3/);
  const parentPom = await readFile(path.join(project, "pom.xml"), "utf8");
  assert.match(parentPom, /lombok-mapstruct-binding/);
  assert.match(parentPom, /maven-enforcer-plugin/);
  assert.match(parentPom, /maven-compiler-plugin/);
  assert.match(parentPom, /archunit-junit5/);
});

test("生成工程固定平台 profile、Wrapper checksum，并把调试日志隔离到 local 配置", async (t) => {
  const data = await fixture();
  t.after(() => rm(data.root, { recursive: true, force: true }));
  const result = await command(data.args);
  assert.equal(result.code, 0, result.stderr);
  const project = path.join(data.output, "demo-service");
  const wrapper = await readFile(path.join(project, ".mvn", "wrapper", "maven-wrapper.properties"), "utf8");
  assert.match(wrapper, /^wrapperSha256Sum=[a-f0-9]{64}$/m);
  assert.match(wrapper, /^distributionSha256Sum=[a-f0-9]{64}$/m);
  const application = await readFile(path.join(project, "demo-service-bootstrap", "src", "main", "resources", "application.yml"), "utf8");
  assert.doesNotMatch(application, /StdOutImpl|DEBUG/);
  const local = await readFile(path.join(project, "demo-service-bootstrap", "src", "main", "resources", "application-local.yml"), "utf8");
  assert.match(local, /StdOutImpl/);
  assert.match(local, /DEBUG/);
});

test("initialize-only 在写文件前拒绝任何已存在目标和 --force", async (t) => { const data = await fixture(); t.after(() => rm(data.root, { recursive: true, force: true })); const rejected = await command(data.args.map((value) => value === data.contractFile ? path.join(data.root, "missing.json") : value)); assert.equal(rejected.code, 1); assert.match(rejected.stderr, /合同/); await mkdir(path.join(data.output, "demo-service")); await writeFile(path.join(data.output, "demo-service", "keep.txt"), "keep"); const noForce = await command(data.args); assert.equal(noForce.code, 1); assert.match(noForce.stderr, /initialize-only/); const forced = await command([...data.args, "--force"]); assert.equal(forced.code, 1); assert.match(forced.stderr, /initialize-only/); assert.equal(await readFile(path.join(data.output, "demo-service", "keep.txt"), "utf8"), "keep"); });

test("拒绝基础包名与批准合同不一致", async (t) => {
  const data = await fixture({ base_package: "com.example.approved" });
  t.after(() => rm(data.root, { recursive: true, force: true }));
  const result = await command(data.args);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /--base-package 与脚手架合同不一致/);
});

test("合同 project_name、profile 和 allowed_write_paths 必须约束实际输出", async (t) => {
  const wrongName = await fixture({ project_name: "other-service" });
  t.after(() => rm(wrongName.root, { recursive: true, force: true }));
  const nameResult = await command(wrongName.args);
  assert.equal(nameResult.code, 1);
  assert.match(nameResult.stderr, /--project-name 与脚手架合同不一致/);

  const wrongProfile = await fixture({ profiles: { ...contract("unused").profiles, persistence: "mybatis" } });
  t.after(() => rm(wrongProfile.root, { recursive: true, force: true }));
  const profileResult = await command(wrongProfile.args);
  assert.equal(profileResult.code, 1);
  assert.match(profileResult.stderr, /unsupported persistence profile/);

  const wrongPath = await fixture({ allowed_write_paths: ["another-service"], work_unit: { ...contract("unused").work_unit, allowed_write_paths: ["another-service"] } });
  t.after(() => rm(wrongPath.root, { recursive: true, force: true }));
  const pathResult = await command(wrongPath.args);
  assert.equal(pathResult.code, 1);
  assert.match(pathResult.stderr, /allowed_write_paths/);
});

test("initialize-only 拒绝以 --force 覆盖 .gitmodules 登记的挂载点", async (t) => {
  const data = await fixture();
  t.after(() => rm(data.root, { recursive: true, force: true }));
  const superproject = path.join(data.root, "harness");
  const output = path.join(superproject, "apps/backend");
  await mkdir(path.join(output, "demo-service"), { recursive: true });
  await writeFile(path.join(superproject, ".gitmodules"), "[submodule \"demo-service\"]\n\tpath = apps/backend/demo-service\n\turl = https://example.invalid/demo-service.git\n");
  const contractFile = path.join(data.root, "gitlink-contract.json");
  await writeFile(contractFile, `${JSON.stringify(contract(output), null, 2)}\n`);
  const result = await command(["--project-name", "demo-service", "--base-package", "com.yss.demo", "--output-dir", output, "--database", "mysql", "--contract-id", "scaffold-1", "--contract-version", "1", "--approval-ref", "approval-1", "--router-draft-ref", "router-1", "--persisted-ref", "persisted-1", "--contract-file", contractFile, "--force"]);
  assert.equal(result.code, 1, result.stderr);
  assert.match(`${result.stdout}\n${result.stderr}`, /initialize-only|gitlink 不得由脚手架覆盖/);
});

test("拒绝在 detached HEAD 子仓工作树内当成普通目录生成", async (t) => {
  const data = await fixture();
  const detached = makeGitlinkFixture({ checkout: "detached-head" });
  t.after(() => rm(data.root, { recursive: true, force: true }));
  t.after(() => detached.cleanup());
  const output = path.join(detached.superproject, detached.mount);
  const contractFile = path.join(data.root, "detached-contract.json");
  await writeFile(contractFile, `${JSON.stringify(contract(output), null, 2)}\n`);
  const result = await command(["--project-name", "nested-service", "--base-package", "com.yss.demo", "--output-dir", output, "--database", "mysql", "--contract-id", "scaffold-1", "--contract-version", "1", "--approval-ref", "approval-1", "--router-draft-ref", "router-1", "--persisted-ref", "persisted-1", "--contract-file", contractFile]);
  const text = `${result.stdout}\n${result.stderr}`;
  assert.equal(result.code, 1, text);
  assert.doesNotMatch(text, /请显式传入 --force/);
  assert.match(text, /detached HEAD 不得当成普通目录写入/);
  assert.equal(existsSync(path.join(output, "nested-service", "pom.xml")), false);
  assert.equal((await readdir(output)).some((name) => name.includes("staging") || name === "nested-service"), false);
});

test("--force 覆盖真实 gitlink 不得走普通目录覆盖路径", async (t) => {
  const data = await fixture();
  const empty = makeGitlinkFixture({ checkout: "empty-gitlink" });
  t.after(() => rm(data.root, { recursive: true, force: true }));
  t.after(() => empty.cleanup());
  const output = path.join(empty.superproject, "apps/backend");
  const contractFile = path.join(data.root, "empty-gitlink-contract.json");
  await writeFile(contractFile, `${JSON.stringify(contract(output), null, 2)}\n`);
  const result = await command(["--project-name", "billing-service", "--base-package", "com.yss.demo", "--output-dir", output, "--database", "mysql", "--contract-id", "scaffold-1", "--contract-version", "1", "--approval-ref", "approval-1", "--router-draft-ref", "router-1", "--persisted-ref", "persisted-1", "--contract-file", contractFile, "--force"]);
  const text = `${result.stdout}\n${result.stderr}`;
  assert.equal(result.code, 1, text);
  assert.doesNotMatch(text, /请显式传入 --force/);
  assert.match(text, /initialize-only|--force 不得把 git-submodule 挂载点当成普通目录覆盖|gitlink 不得/);
  assert.equal(existsSync(path.join(output, "billing-service", "pom.xml")), false);
  assert.equal((await readdir(output)).some((name) => name.includes("backup")), false);
  assert.equal(gitLsFilesStage(empty.superproject, empty.mount)?.mode, GITLINK_MODE);
});

test("验证器记录三条 wrapper 命令的成功和失败证据", async (t) => { const root = await mkdtemp(path.join(os.tmpdir(), "yss-scaffold-verifier-")); t.after(() => rm(root, { recursive: true, force: true })); const project = path.join(root, "project"); await prepareVerifierProject(project); const wrapper = path.join(project, "mvnw"); await writeFile(wrapper, "#!/bin/sh\n[ \"$1\" = test ] && exit 2\nprintf 'ran %s\\n' \"$1\"\n"); await chmod(wrapper, 0o755); const evidence = path.join(root, "evidence"); const report = await run(project, evidence, controlledEnvironment); assert.equal(report.status, "failed"); assert.equal(report.failure_category, "test-failure"); assert.equal(report.commands[1].failure_category, "test-failure"); assert.equal(report.preflight.wrapper_executable, true); assert.deepEqual(report.commands.map((item) => item.exit_code), [0, 2, 0]); assert.match(await readFile(path.join(evidence, "mvnw-test.stderr.log"), "utf8"), /^$/); });

test("验证器把内部仓库解析失败与编译失败分开报告", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-scaffold-repository-failure-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = path.join(root, "project");
  await prepareVerifierProject(project);
  const wrapper = path.join(project, "mvnw");
  await writeFile(wrapper, "#!/bin/sh\nprintf 'Non-resolvable parent POM: Could not transfer artifact\\n'\nexit 1\n");
  await chmod(wrapper, 0o755);
  const report = await run(project, path.join(root, "evidence"), controlledEnvironment);
  assert.equal(report.status, "failed");
  assert.equal(report.failure_category, "repository-access");
  assert.ok(report.commands.every((item) => item.failure_category === "repository-access"));
  assert.equal(typeof report.preflight.maven_repository_credentials_configured, "boolean");
});

test("验证器单独标记 Java 编译失败和 Bootstrap 主类缺失", async (t) => {
  const cases = [
    { output: "[ERROR] COMPILATION ERROR", expected: "compilation" },
    { output: "Unable to find main class", expected: "bootstrap-entrypoint" }
  ];
  for (const item of cases) {
    const root = await mkdtemp(path.join(os.tmpdir(), "yss-scaffold-build-failure-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const project = path.join(root, "project");
    await prepareVerifierProject(project);
    const wrapper = path.join(project, "mvnw");
    await writeFile(wrapper, `#!/bin/sh\n[ "$1" = package ] || exit 0\nprintf '%s\\n' '${item.output}' >&2\nexit 1\n`);
    await chmod(wrapper, 0o755);
    const report = await run(project, path.join(root, "evidence"), controlledEnvironment);
    assert.equal(report.failure_category, item.expected);
    assert.equal(report.commands[2].failure_category, item.expected);
  }
});

test("验证器在全部 Maven 命令成功时通过并保留日志引用", async (t) => { const root = await mkdtemp(path.join(os.tmpdir(), "yss-scaffold-verifier-success-")); t.after(() => rm(root, { recursive: true, force: true })); const project = path.join(root, "project"); await prepareVerifierProject(project); const wrapper = path.join(project, "mvnw"); await writeFile(wrapper, "#!/bin/sh\nprintf 'ran %s\\n' \"$1\"\n"); await chmod(wrapper, 0o755); const report = await run(project, path.join(root, "evidence"), controlledEnvironment); assert.equal(report.status, "passed"); assert.ok(report.commands.every((item) => item.exit_code === 0 && item.stdout_ref.endsWith(".stdout.log"))); });

test("Manifest v2 在缺少受控仓库环境时先于 Maven 执行阻断", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-scaffold-v2-preflight-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = path.join(root, "project");
  await prepareVerifierProject(project);
  const wrapper = path.join(project, "mvnw");
  await writeFile(wrapper, "#!/bin/sh\nprintf 'must not run'\nexit 99\n");
  await chmod(wrapper, 0o755);
  const report = await run(project, path.join(root, "evidence"), { ...process.env, YSS_MAVEN_REPOSITORY_URL: "", MAVEN_REPO_USERNAME: "", MAVEN_REPO_PASSWORD: "" });
  assert.equal(report.status, "failed");
  assert.equal(report.failure_category, "verification-preflight");
  assert.deepEqual(report.commands, []);
  assert.ok(report.preflight.failures.includes("repository-url-not-configured"));
});

test("Manifest schema v1 is unsupported and verifier never executes its wrapper", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-scaffold-v1-unsupported-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = path.join(root, "project");
  await prepareVerifierProject(project, { schema_version: 1, contract_id: "legacy", contract_version: 1 });
  const wrapper = path.join(project, "mvnw");
  await writeFile(wrapper, "#!/bin/sh\nprintf 'must not run' > wrapper-ran\n");
  await chmod(wrapper, 0o755);
  await assert.rejects(() => run(project, path.join(root, "evidence"), controlledEnvironment), /unsupported: scaffold Manifest schema_version=1/);
  assert.equal(existsSync(path.join(project, "wrapper-ran")), false);
});

test("验证日志会脱敏 Maven 仓库凭据", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-scaffold-redaction-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = path.join(root, "project");
  await prepareVerifierProject(project);
  const wrapper = path.join(project, "mvnw");
  await writeFile(wrapper, "#!/bin/sh\nprintf '%s %s\\n' \"$MAVEN_REPO_USERNAME\" \"$MAVEN_REPO_PASSWORD\"\n");
  await chmod(wrapper, 0o755);
  const sensitiveEnvironment = { ...controlledEnvironment, MAVEN_REPO_USERNAME: "sensitive-user", MAVEN_REPO_PASSWORD: "sensitive-password" };
  const evidence = path.join(root, "evidence");
  await run(project, evidence, sensitiveEnvironment);
  const log = await readFile(path.join(evidence, "mvnw-validate.stdout.log"), "utf8");
  assert.doesNotMatch(log, /sensitive-user|sensitive-password/);
  assert.match(log, /\[REDACTED:MAVEN_REPO_USERNAME\].*\[REDACTED:MAVEN_REPO_PASSWORD\]/);
});
