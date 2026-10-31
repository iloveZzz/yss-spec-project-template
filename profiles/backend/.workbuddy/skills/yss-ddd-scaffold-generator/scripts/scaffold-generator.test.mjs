import { attachScaffoldDecisionFixture } from "../../../../scripts/fixtures/user-decision/build-fixture.mjs";
import { referenceExample } from "../../../../scripts/lib/scaffold-reference-example.mjs";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "./run_scaffold_verification.mjs";
import { run as runMvc } from "../../yss-layered-mvc-scaffold-generator/scripts/run_scaffold_verification.mjs";
import { makeGitlinkFixture } from "../../../../tests/helpers/git-submodule-fixtures.mjs";
import { GITLINK_MODE, gitLsFilesStage } from "../../../../scripts/lib/repository-scope-policy.mjs";

const scripts = path.dirname(fileURLToPath(import.meta.url));
const generator = path.join(scripts, "generate_scaffold.mjs");
const workflow = path.join(scripts, "generate_and_verify_scaffold.mjs");
const command = (args, options = {}) => new Promise((resolve) => execFile(process.execPath, [path.resolve(scripts, "../../../../scripts/fixtures/backend-scaffold/generate-candidate.mjs"), generator, ...args], { encoding: "utf8", ...options }, (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stdout, stderr })));
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
    schema_version: 4,
    kind: "project-scaffold-contract",
    delivery_role: "backend",
    scaffold_kind: "backend-ddd",
    repository_scope: "external-repository",
    init_git: false,
    contract_id: "scaffold-1",
    contract_version: 1,
    scaffold_request_id: "scaffold-request-1",
    status: "approved",
    compiler_draft_ref: "compiler-1",
    lifecycle_approval_ref: "approval-1",
    persisted_ref: "persisted-1",
    current_version: true,
    implementation_repository: "external",
    backend_repository: "external",
    scaffold_status: "required",
    project_name: "demo-service",
    target_output_dir: outputDir,
    base_package: "com.yss.demo",
    architecture_family: "domain-driven", architecture_profile: "target-domain-model",
    generator_skill: "yss-ddd-scaffold-generator",
    decision_ref: "scaffold-architecture-decisions.yaml",
    decision_id: "scaffold-decision.demo-service",
    decision_digest: `sha256:${"0".repeat(64)}`,
    maven_coordinates: {
      group_id: "com.yss.datamiddle",
      project_version: "1.0.0-SNAPSHOT",
      parent: { group_id: "com.yss.datamiddle", artifact_id: "yss-datamiddle-parent", version: "2.0.0-SNAPSHOT" },
      yss_components_version: "2.0.0-SNAPSHOT"
    },
    profiles: {
      architecture: "target-domain-model",
      persistence: "mybatis-plus",
      verification_database: "h2", production_database: "not-bound",
      platform: "spring-boot-2.7-jdk8",
      validation_namespace: "javax",
      dto_placement: "web",
      repository: "yss-internal"
    },
    module_profile: { resolution_version: 1, requested_capabilities: [], resolved_modules: ["domain", "application", "infrastructure", "adapter", "bootstrap"] },
    allowed_write_paths: ["."],
    expected_evidence_files: [".yss/scaffold-generation.json"],
    verification_commands: ["./mvnw validate", "./mvnw test", "./mvnw package"],
    approval: { approval_ref: "approval-1", approver: "reviewer", persisted_ref: "persisted-1", current_version: 1 },
    work_unit: { id: "unit-1", behavior: "scaffold", primary_skill: "yss-ddd-scaffold-generator", supporting_skills: ["yss-implementation-contract-compiler"], tdd_mode: "controlled-generation", allowed_write_paths: ["."], expected_evidence: ["manifest"], verification_commands: ["./mvnw validate", "./mvnw test", "./mvnw package"], controlled_generation: true },
    generation_policy: { mode: "initialize-only", existing_target: "unsupported", old_project_migration: "unsupported", template_upgrade: "unsupported" },
    ...overrides
  };
}

const controlledEnvironment = {
  ...process.env,
  MAVEN_ARGS: "",
  YSS_MAVEN_SETTINGS: "",
  YSS_MAVEN_REPOSITORY_URL: "https://repo.example.invalid/repository/maven-public/",
  MAVEN_REPO_USERNAME: "test-user",
  MAVEN_REPO_PASSWORD: "test-password"
};
function targetManifest(overrides = {}) {
  return {
    schema_version: 4,
    contract_id: "id",
    contract_version: 1,
    scaffold_request_id: "request",
    contract_digest: "a".repeat(64),
    approval_ref: "approval",
    approver: "reviewer",
    lifecycle_approval_ref: "approval",
    compiler_draft_ref: "router",
    persisted_ref: "persisted",
    contract_file_ref: "contract",
    current_version: true,
    allowed_write_paths: ["."],
    expected_evidence_files: ["manifest"],
    verification_commands: ["./mvnw validate", "./mvnw test", "./mvnw package"],
    generation_mode: "controlled-generation",
    completion_level: "generated",
    architecture_family: "domain-driven", architecture_profile: "target-domain-model",
    generator_skill: "yss-ddd-scaffold-generator",
    decision_id: "scaffold-decision.demo-service",
    decision_digest: `sha256:${"a".repeat(64)}`,
    module_profile: { resolution_version: 1, requested_capabilities: [], resolved_modules: ["domain", "application", "infrastructure", "adapter", "bootstrap"] },
    design_prerequisites: { technical_design: { ref: "technical.json", version: "v1", digest: `sha256:${"b".repeat(64)}` }, data_architecture_decision: { ref: "data.json", version: "v1", digest: `sha256:${"c".repeat(64)}`, impact: "not-applicable" }, api_contract_decision: { ref: "api.json", version: "v1", digest: `sha256:${"d".repeat(64)}`, impact: "not-applicable" }, engineering_contract_approval_ref: "approval.json" },
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
  await writeFile(path.join(project, ".mvn", "settings.xml"), await readFile(path.join(scripts, "../assets/wrapper/.mvn/settings.xml")));
  await writeFile(path.join(project, ".yss", "scaffold-generation.json"), `${JSON.stringify(manifest)}\n`);
}

test("DDD 和 MVC 默认使用用户 settings，无须重复配置模板仓库变量且日志脱敏", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-user-settings-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = path.join(root, "user home");
  const settingsFile = path.join(home, ".m2/settings.xml");
  const settings = "<settings><!-- unused example: ${env.YSS_TEST_UNUSED_SETTING} --><servers><server><username>private-user</username><password>private-password</password></server></servers></settings>\n";
  await mkdir(path.dirname(settingsFile), { recursive: true });
  await writeFile(settingsFile, settings, { mode: 0o600 });
  for (const [family, verify] of [["domain-driven", run], ["layered-mvc", runMvc]]) {
    const project = path.join(root, family);
    await prepareVerifierProject(project, family === "domain-driven" ? targetManifest() : targetManifest({ architecture_family: family, architecture_profile: "layered-mvc-service", generator_skill: "yss-layered-mvc-scaffold-generator", profiles: { architecture: "layered-mvc", repository: "yss-internal" } }));
    await writeFile(path.join(project, ".mvn/maven.config"), "");
    await writeFile(path.join(project, "mvnw"), "#!/bin/sh\nprintf '%s\\n' \"$@\"\nprintf 'private-user private-password\\n'\n");
    await chmod(path.join(project, "mvnw"), 0o755);
    const evidence = path.join(root, `${family}-evidence`);
    const report = await verify(project, evidence, { ...process.env, HOME: home, MAVEN_ARGS: "", YSS_MAVEN_SETTINGS: "", YSS_MAVEN_REPOSITORY_URL: "", MAVEN_REPO_USERNAME: "", MAVEN_REPO_PASSWORD: "" });
    assert.equal(report.status, "passed");
    assert.equal(report.preflight.settings_source, "user-default");
    assert.equal(report.preflight.settings_ref, settingsFile);
    assert.ok(report.commands.every(item => item.command.includes(settingsFile)));
    const log = await readFile(path.join(evidence, "mvnw-validate.stdout.log"), "utf8");
    assert.ok(log.includes(`validate\n--settings\n${settingsFile}\n`));
    assert.doesNotMatch(log, /private-user|private-password/);
  }
  assert.equal(await readFile(settingsFile, "utf8"), settings);
});

test("显式 settings 保留优先级，缺失或无效时不回退且不执行 Maven", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-explicit-settings-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = path.join(root, "project"), home = path.join(root, "home");
  await prepareVerifierProject(project);
  await writeFile(path.join(project, ".mvn/maven.config"), "");
  await writeFile(path.join(project, "mvnw"), "#!/bin/sh\nprintf '%s\\n' \"$@\"\n");
  await chmod(path.join(project, "mvnw"), 0o755);
  const environment = { ...process.env, HOME: home, MAVEN_ARGS: "", YSS_MAVEN_SETTINGS: "", YSS_MAVEN_REPOSITORY_URL: "", MAVEN_REPO_USERNAME: "", MAVEN_REPO_PASSWORD: "" };
  const missing = await run(project, path.join(root, "missing-evidence"), environment);
  assert.equal(missing.status, "failed");
  assert.deepEqual(missing.commands, []);
  assert.ok(missing.preflight.failures.includes("maven-settings-required"));
  assert.match(missing.preflight.next_action, /用户.*settings 文件路径/);
  await mkdir(path.join(home, ".m2"), { recursive: true });
  await writeFile(path.join(home, ".m2/settings.xml"), "<settings/>\n");
  const explicit = path.join(root, "custom-settings.xml");
  await writeFile(explicit, "<settings/>\n");
  const report = await run(project, path.join(root, "explicit-evidence"), { ...environment, YSS_MAVEN_SETTINGS: explicit });
  assert.equal(report.status, "passed");
  assert.equal(report.preflight.settings_source, "explicit");
  assert.equal(report.preflight.settings_ref, explicit);
  await writeFile(path.join(project, ".mvn/maven.config"), `--settings=${explicit}\n`);
  const configured = await run(project, path.join(root, "configured-evidence"), environment);
  assert.equal(configured.status, "passed");
  assert.equal(configured.preflight.settings_source, "project-config");
  assert.equal(configured.preflight.settings_ref, explicit);
  assert.deepEqual(configured.commands.map(item => item.command), ["./mvnw validate", "./mvnw test", "./mvnw package"]);
  const spaced = path.join(root, "settings with spaces.xml");
  await writeFile(spaced, "<settings/>\n");
  await writeFile(path.join(project, ".mvn/maven.config"), `--settings\n${spaced}\n`);
  const multiline = await run(project, path.join(root, "multiline-evidence"), environment);
  assert.equal(multiline.status, "passed");
  assert.equal(multiline.preflight.settings_ref, spaced);
  await assert.rejects(() => run(project, path.join(root, "conflict-evidence"), { ...environment, YSS_MAVEN_SETTINGS: explicit }), /同时.*指定/);
  await writeFile(path.join(project, ".mvn/maven.config"), "");
  const mavenArgs = await run(project, path.join(root, "maven-args-evidence"), { ...environment, MAVEN_ARGS: `--settings ${explicit}` });
  assert.equal(mavenArgs.status, "passed");
  assert.equal(mavenArgs.preflight.settings_source, "maven-args");
  assert.equal(mavenArgs.preflight.settings_ref, explicit);
  assert.deepEqual(mavenArgs.commands.map(item => item.command), ["./mvnw validate", "./mvnw test", "./mvnw package"]);
  await writeFile(path.join(project, "mvnw"), "#!/bin/sh\nprintf 'must not run' > wrapper-ran\nexit 99\n");
  await assert.rejects(() => run(project, path.join(root, "bad-path-evidence"), { ...environment, YSS_MAVEN_SETTINGS: path.join(root, "absent.xml") }), /不可读取或 XML 无效/);
  await writeFile(explicit, "<settings><password>never-expose-this-secret</settings>");
  await assert.rejects(() => run(project, path.join(root, "bad-xml-evidence"), { ...environment, YSS_MAVEN_SETTINGS: explicit }), error => /XML 无效/.test(error.message) && !error.message.includes("never-expose-this-secret"));
  assert.equal(existsSync(path.join(project, "wrapper-ran")), false);
});

test("无用户 settings 时显式使用项目环境模板，保留仓库凭据预检", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-environment-settings-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = path.join(root, "project");
  await prepareVerifierProject(project);
  await writeFile(path.join(project, ".mvn/maven.config"), "");
  await writeFile(path.join(project, "mvnw"), "#!/bin/sh\nprintf '%s\\n' \"$@\"\n");
  await chmod(path.join(project, "mvnw"), 0o755);
  const environment = { ...controlledEnvironment, HOME: path.join(root, "home"), YSS_MAVEN_SETTINGS: "" };
  const report = await run(project, path.join(root, "evidence"), environment);
  assert.equal(report.status, "passed");
  assert.equal(report.preflight.settings_source, "project-environment");
  assert.ok(report.commands.every(item => item.command.endsWith(`--settings ${path.join(project, ".mvn/settings.xml")} -P yss-internal`)));
  const missing = await run(project, path.join(root, "no-credentials"), { ...environment, MAVEN_REPO_PASSWORD: "" });
  assert.equal(missing.status, "failed");
  assert.deepEqual(missing.commands, []);
  assert.ok(missing.preflight.failures.includes("repository-credentials-not-configured"));
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

test("历史 Manifest v3 只读校验仍在缺少受控仓库环境时先于 Maven 阻断", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yss-scaffold-v2-preflight-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = path.join(root, "project");
  await prepareVerifierProject(project, targetManifest({ schema_version: 3, current_version: 1, design_prerequisites: undefined }));
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
