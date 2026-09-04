import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "generate_project.mjs");
const verifyScript = path.join(path.dirname(fileURLToPath(import.meta.url)), "verify_project.mjs");
const harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const gitAuthorEnvironment = {
  GIT_CONFIG_COUNT: "1",
  GIT_CONFIG_KEY_0: "user.name",
  GIT_CONFIG_VALUE_0: "Scaffold Tester"
};
function run(args, options = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    ...options,
    env: { ...process.env, ...gitAuthorEnvironment, ...(options.env ?? {}) }
  });
}
async function expectedDistributedLock() {
  const lock = JSON.parse(await readFile(path.join(harnessRoot, "skills-lock.json"), "utf8"));
  delete lock.skills?.shared?.["yss-mvc-scaffold-generator"];
  for (const platform of Object.values(lock.skills?.platform ?? {})) delete platform?.["yss-mvc-scaffold-generator"];
  return `${JSON.stringify(lock, null, 2)}\n`;
}
test("生成固定六模块和 mock endpoint", async (t) => {
  const base = await mkdtemp(path.join(os.tmpdir(), "data-analysis-scaffold-")); t.after(() => rm(base, { recursive: true, force: true }));
  const target = path.join(base, "item1"); const result = run(["--project-name", "data-analysis-item1", "--base-package", "com.yss.dataanalysis.item1", "--target-dir", target, "--database", "oracle", "--with-mock"]);
  assert.equal(result.status, 0, result.stderr); const backend = target; const pom = await readFile(path.join(backend, "pom.xml"), "utf8");
  const skillUtils = path.join(base, "skillUtils");
  for (const module of ["server", "core", "client", "repository", "adapter", "feign-client"]) assert.match(pom, new RegExp(`<module>${module}</module>`));
  const controller = await readFile(path.join(backend, "server/src/main/java/com/yss/dataanalysis/item1/server/controller/AnalysisController.java"), "utf8"); assert.match(controller, /\/api\/analysis/); assert.doesNotMatch(controller, /;[ \t]+import /);
  assert.match(controller, /\* \u6570\u636e\u5206\u6790\u67e5\u8be2\u63a5\u53e3\u3002/);
  assert.match(controller, /@author Scaffold Tester/);
  assert.match(controller, /@date \d{4}\/\d{2}\/\d{2} \d{2}:\d{2}/);
  assert.match(controller, /\* \u5206\u9875\u67e5\u8be2\u6570\u636e\u5206\u6790\u7ed3\u679c\u3002[\s\S]*@param query[\s\S]*@return \u6570\u636e\u5206\u6790\u5206\u9875\u7ed3\u679c/);
  const mock = await readFile(path.join(backend, "adapter/src/main/java/com/yss/dataanalysis/item1/adapter/mock/MockAnalysisQueryExecutor.java"), "utf8"); assert.match(mock, /source|"mock"/);
  const configuration = await readFile(path.join(backend, "server/src/main/java/com/yss/dataanalysis/item1/server/configuration/AnalysisConfiguration.java"), "utf8"); assert.match(configuration, /Profile\("mock"\)/); assert.match(configuration, /Profile\("oracle & !mock"\)/);
  await readFile(path.join(backend, "server/src/main/java/com/yss/dataanalysis/item1/Application.java"), "utf8");
  const controllerTest = await readFile(path.join(backend, "server/src/test/java/com/yss/dataanalysis/item1/server/controller/AnalysisControllerTest.java"), "utf8");
  assert.match(controllerTest, /pageNo/);
  assert.match(await readFile(path.join(target, "yss-project.yaml"), "utf8"), /repository_mode: project-instance/);
  assert.match(await readFile(path.join(target, "CONTEXT.md"), "utf8"), /AnalysisDataset/);
  assert.match(await readFile(path.join(target, ".artifact-workspace.yaml"), "utf8"), /kind: service/);
  assert.match(await readFile(path.join(target, "docs/service/module-map.md"), "utf8"), /feign-client/);
  assert.match(await readFile(path.join(target, "docs/service/current-capabilities.md"), "utf8"), /普通功能开发不手工修改/);
  assert.match(await readFile(path.join(target, "docs/process/implementation-repo-registry.yaml"), "utf8"), /repository_scope: external-repository/);
  const analysisProject = await readFile(path.join(target, "docs/process/analysis-project.yaml"), "utf8"); assert.match(analysisProject, /project_name: data-analysis-item1/); assert.doesNotMatch(analysisProject, /galaxy-data-analysis|fegin-client/);
  assert.match(await readFile(path.join(target, "docs/process/lifecycle-registry.yaml"), "utf8"), /schema_version:/);
  assert.match(await readFile(path.join(target, "docs/templates/vertical-slice-ticket-template.md"), "utf8"), /status: ready-for-human/);
  assert.match(await readFile(path.join(target, "docs/templates/local-parent-ticket-template.md"), "utf8"), /lifecycle_status \| routing \/ running \/ paused-human-gate \/ blocked \/ completed/);
  const lifecycleContract = await readFile(path.join(skillUtils, ".agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml"), "utf8");
  assert.match(lifecycleContract, /entry_routing:/);
  assert.match(lifecycleContract, /workflow_execution_result:/);
  assert.match(lifecycleContract, /work_unit_routes:/);
  assert.match(await readFile(path.join(target, "docs/templates/approval-record-template.yaml"), "utf8"), /gate_id:/);
  assert.match(await readFile(path.join(target, "docs/templates/implementation-routing-template.md"), "utf8"), /implementation/);
  assert.match(await readFile(path.join(target, "docs/templates/verification-record-template.md"), "utf8"), /verification/i);
  await readFile(path.join(skillUtils, ".agents/skills/yss-product-lifecycle/SKILL.md"), "utf8");
  for (const projection of [".agents", ".claude", ".codex", ".cursor", ".pi", ".qoder", ".trae"]) {
    await assert.rejects(stat(path.join(skillUtils, projection, "skills/yss-mvc-scaffold-generator")), { code: "ENOENT" });
  }
  assert.equal(path.resolve(spawnSync("git", ["-C", target, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).stdout.trim()), path.resolve(target));
  assert.equal(spawnSync("git", ["-C", target, "branch", "--show-current"], { encoding: "utf8" }).stdout.trim(), "main");
  assert.equal(spawnSync("git", ["-C", target, "rev-list", "--all", "--count"], { encoding: "utf8" }).stdout.trim(), "0");
  assert.equal(spawnSync("git", ["-C", target, "remote"], { encoding: "utf8" }).stdout.trim(), "");
  const verification = spawnSync(process.execPath, [verifyScript, "--project-root", target], { encoding: "utf8" });
  assert.equal(verification.status, 0, verification.stderr);
  await assert.rejects(stat(path.join(skillUtils, ".agents/skills/data-analysis-java-implementation")), { code: "ENOENT" });
  const implementationRegistry = await readFile(path.join(target, "docs/process/implementation-repo-registry.yaml"), "utf8");
  assert.doesNotMatch(implementationRegistry, /data-analysis-java-implementation|verify_java_web_style\.mjs/);
  assert.match(implementationRegistry, /fmt-maven-plugin:2\.9\.1:check/);
  assert.doesNotMatch(implementationRegistry, /smart-doc-maven-plugin:[^\s]+:openapi/);
  assert.doesNotMatch(implementationRegistry, /smart-doc-verification\.md/);
  const projectInstanceDocs = await Promise.all([
    "AGENTS.md",
    "docs/agents/skills-maintenance.md",
    "docs/agents/gitlab-workflow-skills.md",
    "docs/agents/issue-tracker.md",
    "docs/process/implementation-repo-integration.md",
    "docs/process/harness-process-tailoring.md",
    "docs/templates/build-architecture-checklist-template.md"
  ].map((relative) => readFile(path.join(target, relative), "utf8")));
  const staleProjectCommands = /scripts\/(?:verify-template|sync-skills|update-skill-lock|export-yss-skills|verify-upstream-skill-source|verify-maintenance-checkpoint|verify-implementation-path-scenarios|gitworks)/;
  for (const body of projectInstanceDocs) assert.doesNotMatch(body, staleProjectCommands);
  const serverPom = await readFile(path.join(backend, "server/pom.xml"), "utf8");
  assert.match(serverPom, /<profiles>[\s\S]*<id>nacos<\/id>[\s\S]*<activeByDefault>true<\/activeByDefault>/);
  assert.match(serverPom, /<app\.env>dev<\/app\.env>[\s\S]*<app\.profiles>nacos<\/app\.profiles>/);
  assert.match(serverPom, /spring-boot-maven-plugin/);
  assert.match(serverPom, /<includes>[\s\S]*data-analysis-item1-client[\s\S]*data-analysis-item1-core[\s\S]*data-analysis-item1-repository[\s\S]*<\/includes>/);
  const smartDocPlugin = serverPom.match(/<plugin>(?:(?!<\/plugin>)[\s\S])*?<artifactId>smart-doc-maven-plugin<\/artifactId>(?:(?!<\/plugin>)[\s\S])*?<\/plugin>/)?.[0];
  assert.ok(smartDocPlugin);
  assert.doesNotMatch(smartDocPlugin, /<executions>/);
  const smartDoc = await readFile(path.join(backend, "server/src/main/resources/smart-doc.json"), "utf8");
  assert.match(smartDoc, /"projectName": "data-analysis-item1"/);
  assert.match(smartDoc, /"packageFilters": "com\.yss\.dataanalysis\.item1\.server\.controller\.\*"/);
  assert.match(smartDoc, /"showAuthor": true/);
  assert.match(smartDoc, /"appToken": ""/);
  assert.doesNotMatch(smartDoc, /43fd1d4bc1c743c1b83bf4843e8167bf|192\.168\./);
  const logback = await readFile(path.join(backend, "server/src/main/resources/logback-spring.xml"), "utf8");
  assert.match(logback, /springProfile name="dev,mock"/);
  assert.match(logback, /springProfile name="uat,pro,oracle,oceanbase-oracle"/);
  assert.match(logback, /com\.yss\.dataanalysis\.item1/);
  const bootstrap = await readFile(path.join(backend, "server/src/main/resources/bootstrap.yml"), "utf8");
  assert.match(bootstrap, /active: \$\{app\.env:dev\},datasource,nacos,oracle,mock/);
  assert.doesNotMatch(bootstrap, /mock,\s*$/m);
  const bootstrapNacos = await readFile(path.join(backend, "server/src/main/resources/bootstrap-nacos.yml"), "utf8");
  assert.match(bootstrapNacos, /server-addr: \$\{nacosserver:192\.168\.165\.58:8848\}/);
  assert.match(bootstrapNacos, /group: \$\{nacos_group:yss-dm\}/);
  assert.match(bootstrapNacos, /discovery:[\s\S]*enabled: true[\s\S]*config:[\s\S]*enabled: true/);
  const bootstrapMock = await readFile(path.join(backend, "server/src/main/resources/bootstrap-mock.yml"), "utf8");
  assert.match(bootstrapMock, /discovery:[\s\S]*enabled: false/);
  assert.match(bootstrapMock, /config:[\s\S]*enabled: false[\s\S]*import-check:[\s\S]*enabled: false/);
  const applicationMock = await readFile(path.join(backend, "server/src/main/resources/application-mock.yml"), "utf8");
  assert.match(applicationMock, /leaf:[\s\S]*leafSegmentEnable: false[\s\S]*leafSnowflakeEnable: false/);
  assert.match(applicationMock, /com\.yss\.cloud\.mybatis\.MybatisPlusConfiguration/);
  assert.match(applicationMock, /com\.yss\.cloud\.sankuai\.config\.LeafDataSourceConfiguration/);
  const application = await readFile(path.join(backend, "server/src/main/java/com/yss/dataanalysis/item1/Application.java"), "utf8");
  assert.doesNotMatch(application, /@EnableDistributedId/);
  const databaseInfrastructure = await readFile(path.join(backend, "server/src/main/java/com/yss/dataanalysis/item1/server/configuration/DatabaseInfrastructureConfiguration.java"), "utf8");
  assert.match(databaseInfrastructure, /@Profile\("!mock"\)/);
  assert.match(databaseInfrastructure, /@EnableDistributedId/);
  assert.match(databaseInfrastructure, /@Import\(MapperConfiguration.class\)/);
});

test("已有 skillUtils 落后时原子刷新并保留备份", async (t) => {
  const base = await mkdtemp(path.join(os.tmpdir(), "data-analysis-skill-refresh-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const skillUtils = path.join(base, "skillUtils");
  await mkdir(skillUtils, { recursive: true });
  await writeFile(path.join(skillUtils, "skill-utils.yaml"), "schema_version: 1\nkind: yss-skill-utils\n", "utf8");
  await writeFile(path.join(skillUtils, "skills-lock.json"), "{\"version\":0}\n", "utf8");
  await writeFile(path.join(skillUtils, "local-marker.txt"), "preserve old installation\n", "utf8");
  const target = path.join(base, "item-refresh");
  const result = run(["--project-name", "data-analysis-refresh", "--base-package", "com.yss.dataanalysis.refresh", "--target-dir", target]);
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.skill_utils_created, false);
  assert.equal(output.skill_utils_refreshed, true);
  assert.ok(output.skill_utils_backup);
  assert.equal(await readFile(path.join(output.skill_utils_backup, "local-marker.txt"), "utf8"), "preserve old installation\n");
  assert.equal(await readFile(path.join(skillUtils, "skills-lock.json"), "utf8"), await expectedDistributedLock());
});

test("已有 skillUtils 与源锁一致时直接复用", async (t) => {
  const base = await mkdtemp(path.join(os.tmpdir(), "data-analysis-skill-reuse-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const first = run(["--project-name", "data-analysis-reuse-a", "--base-package", "com.yss.dataanalysis.reusea", "--target-dir", path.join(base, "item-a")]);
  assert.equal(first.status, 0, first.stderr);
  const second = run(["--project-name", "data-analysis-reuse-b", "--base-package", "com.yss.dataanalysis.reuseb", "--target-dir", path.join(base, "item-b")]);
  assert.equal(second.status, 0, second.stderr);
  const output = JSON.parse(second.stdout);
  assert.equal(output.skill_utils_created, false);
  assert.equal(output.skill_utils_refreshed, false);
  assert.equal(output.skill_utils_backup, null);
});

test("dry-run 仅报告 skillUtils 将刷新且不修改旧目录", async (t) => {
  const base = await mkdtemp(path.join(os.tmpdir(), "data-analysis-skill-dry-refresh-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const skillUtils = path.join(base, "skillUtils");
  await mkdir(skillUtils, { recursive: true });
  await writeFile(path.join(skillUtils, "skill-utils.yaml"), "schema_version: 1\nkind: yss-skill-utils\n", "utf8");
  await writeFile(path.join(skillUtils, "skills-lock.json"), "{\"version\":0}\n", "utf8");
  const result = run(["--project-name", "data-analysis-dry-refresh", "--base-package", "com.yss.dataanalysis.dryrefresh", "--target-dir", path.join(base, "item"), "--dry-run"]);
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.skill_utils_refreshed, true);
  assert.equal(output.skill_utils_backup, null);
  assert.equal(await readFile(path.join(skillUtils, "skills-lock.json"), "utf8"), "{\"version\":0}\n");
  assert.deepEqual((await readdir(base)).sort(), ["skillUtils"]);
});

test("Git 当前用户写入 Javadoc 且缺失时拒绝生成", async (t) => {
  const base = await mkdtemp(path.join(os.tmpdir(), "data-analysis-author-")); t.after(() => rm(base, { recursive: true, force: true }));
  const target = path.join(base, "author-project");
  const generated = run(["--project-name", "author-project", "--base-package", "com.yss.author", "--target-dir", target], {
    env: { GIT_CONFIG_VALUE_0: "张三" }
  });
  assert.equal(generated.status, 0, generated.stderr);
  const controller = await readFile(path.join(target, "server/src/main/java/com/yss/author/server/controller/AnalysisController.java"), "utf8");
  assert.match(controller, /@author 张三/);
  assert.doesNotMatch(controller, /@author system/);

  const missingTarget = path.join(base, "missing-author");
  const missing = run(["--project-name", "missing-author", "--base-package", "com.yss.missing", "--target-dir", missingTarget], {
    env: { GIT_CONFIG_COUNT: "0", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: path.join(base, "not-found.gitconfig") }
  });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /Git user\.name/);
  await assert.rejects(stat(missingTarget), { code: "ENOENT" });
});

test("不启用 Mock 时不生成 bootstrap-mock 且不激活 mock profile", async (t) => {
  const base = await mkdtemp(path.join(os.tmpdir(), "data-analysis-no-mock-profile-")); t.after(() => rm(base, { recursive: true, force: true }));
  const target = path.join(base, "data-analysis-no-mock");
  const result = run(["--project-name", "data-analysis-no-mock", "--base-package", "com.yss.dataanalysis.nomock", "--target-dir", target]);
  assert.equal(result.status, 0, result.stderr);
  const bootstrap = await readFile(path.join(target, "server/src/main/resources/bootstrap.yml"), "utf8");
  assert.match(bootstrap, /active: \$\{app\.env:dev\},datasource,nacos,oracle/);
  assert.doesNotMatch(bootstrap, /,mock/);
  await assert.rejects(stat(path.join(target, "server/src/main/resources/bootstrap-mock.yml")), { code: "ENOENT" });
});

test("Maven settings \u4f5c\u4e3a外部验证输入且不写入项目", async (t) => {
  const base = await mkdtemp(path.join(os.tmpdir(), "data-analysis-settings-")); t.after(() => rm(base, { recursive: true, force: true }));
  const settings = path.join(base, "settings.xml");
  await writeFile(settings, "<settings/>\n");
  const target = path.join(base, "data-analysis-item-settings");
  const result = run(["--project-name", "data-analysis-item-settings", "--base-package", "com.yss.dataanalysis.settings", "--target-dir", target, "--maven-settings", settings]);
  assert.equal(result.status, 0, result.stderr);
  const manifest = await readFile(path.join(target, ".yss/scaffold-generation.json"), "utf8");
  assert.match(manifest, /"maven_settings_mode": "external"/);
  assert.match(manifest, /"maven_settings_required": true/);
  assert.doesNotMatch(manifest, new RegExp(settings.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal((await readdir(target)).includes("settings.xml"), false);
});
test("Maven settings 支持环境变量且显式参数优先", async (t) => {
  const base = await mkdtemp(path.join(os.tmpdir(), "data-analysis-settings-resolution-")); t.after(() => rm(base, { recursive: true, force: true }));
  const environmentSettings = path.join(base, "environment-settings.xml");
  const explicitSettings = path.join(base, "explicit-settings.xml");
  await writeFile(environmentSettings, "<settings/>\n");
  await writeFile(explicitSettings, "<settings/>\n");
  const environmentTarget = path.join(base, "environment-project");
  const fromEnvironment = run(["--project-name", "environment-project", "--base-package", "com.yss.environment", "--target-dir", environmentTarget, "--dry-run"], { env: { YSS_MAVEN_SETTINGS: environmentSettings } });
  assert.equal(fromEnvironment.status, 0, fromEnvironment.stderr);
  assert.match(fromEnvironment.stdout, /"maven_settings_source": "environment"/);
  const explicitTarget = path.join(base, "explicit-project");
  const fromExplicit = run(["--project-name", "explicit-project", "--base-package", "com.yss.explicit", "--target-dir", explicitTarget, "--maven-settings", explicitSettings, "--dry-run"], { env: { YSS_MAVEN_SETTINGS: environmentSettings } });
  assert.equal(fromExplicit.status, 0, fromExplicit.stderr);
  assert.match(fromExplicit.stdout, /"maven_settings_source": "explicit"/);
});
test("未指定 settings 时仍完整生成，并将依赖解析延后到验证阶段", async (t) => {
  const base = await mkdtemp(path.join(os.tmpdir(), "yss-mvc-no-settings-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const target = path.join(base, "no-settings-project");
  const result = run(["--project-name", "no-settings-project", "--base-package", "com.yss.nosettings", "--target-dir", target], {
    env: { YSS_MAVEN_SETTINGS: "", USERPROFILE: path.join(base, "missing-user"), HOME: path.join(base, "missing-home") }
  });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.maven_settings_source, "maven-default");
  assert.equal(output.maven_settings_available, false);
  assert.equal(output.dependency_resolution, "deferred");
  assert.equal(output.network_access_during_generation, "disabled");
  for (const module of ["server", "core", "client", "repository", "adapter", "feign-client"]) {
    await stat(path.join(target, module, "pom.xml"));
  }
  await stat(path.join(target, "mvnw"));
  assert.equal((await readdir(target)).includes("settings.xml"), false);
});
test("拒绝非空目标目录", async (t) => {
  const base = await mkdtemp(path.join(os.tmpdir(), "data-analysis-scaffold-nonempty-")); t.after(() => rm(base, { recursive: true, force: true })); await mkdir(base, { recursive: true }); await writeFile(path.join(base, "keep.txt"), "keep");
  const result = run(["--project-name", "data-analysis-item1", "--base-package", "com.yss.dataanalysis.item1", "--target-dir", base]); assert.notEqual(result.status, 0); assert.match(result.stderr, /目标目录非空/);
});
test("允许已存在的空目标目录", async (t) => {
  const base = await mkdtemp(path.join(os.tmpdir(), "data-analysis-empty-target-")); t.after(() => rm(base, { recursive: true, force: true }));
  const target = path.join(base, "data-analysis-item-empty"); await mkdir(target);
  const result = run(["--project-name", "data-analysis-item-empty", "--base-package", "com.yss.dataanalysis.empty", "--target-dir", target]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(path.resolve(spawnSync("git", ["-C", target, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).stdout.trim()), path.resolve(target));
});
test("嵌套在父仓目录时仍初始化为独立 Git 根", async (t) => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "data-analysis-parent-repo-")); t.after(() => rm(parent, { recursive: true, force: true }));
  assert.equal(spawnSync("git", ["init", "--initial-branch=parent-main", parent], { encoding: "utf8" }).status, 0);
  const target = path.join(parent, "data-analysis-item2");
  const result = run(["--project-name", "data-analysis-item2", "--base-package", "com.yss.dataanalysis.item2", "--target-dir", target]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(path.resolve(spawnSync("git", ["-C", target, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).stdout.trim()), path.resolve(target));
  assert.equal(spawnSync("git", ["-C", target, "branch", "--show-current"], { encoding: "utf8" }).stdout.trim(), "main");
});
test("dry-run 不创建目录或 Git 仓库", async (t) => {
  const base = await mkdtemp(path.join(os.tmpdir(), "data-analysis-dry-run-")); t.after(() => rm(base, { recursive: true, force: true }));
  const target = path.join(base, "data-analysis-item3");
  const result = run(["--project-name", "data-analysis-item3", "--base-package", "com.yss.dataanalysis.item3", "--target-dir", target, "--dry-run"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"mode": "dry-run"/);
  assert.equal(spawnSync("git", ["-C", target, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).status, 128);
});
test("Git 预检失败时不留下目标目录或 staging", async (t) => {
  const base = await mkdtemp(path.join(os.tmpdir(), "data-analysis-no-git-")); t.after(() => rm(base, { recursive: true, force: true }));
  const target = path.join(base, "data-analysis-item4");
  const result = run(["--project-name", "data-analysis-item4", "--base-package", "com.yss.dataanalysis.item4", "--target-dir", target], { env: { ...process.env, PATH: "" } });
  assert.notEqual(result.status, 0); assert.match(result.stderr, /未检测到可用的 Git/);
  await assert.rejects(stat(target), { code: "ENOENT" });
  assert.deepEqual((await readdir(base)).filter((name) => name.includes(".staging-")), []);
});
test("staging 创建后中间步骤失败时只清理本轮 staging", async (t) => {
  const base = await mkdtemp(path.join(os.tmpdir(), "data-analysis-git-init-fail-")); t.after(() => rm(base, { recursive: true, force: true }));
  const occupied = path.join(base, ".data-analysis-item5.staging-occupied"); await mkdir(occupied); await writeFile(path.join(occupied, "keep.txt"), "keep");
  const target = path.join(base, "data-analysis-item5");
  const result = run(["--project-name", "data-analysis-item5", "--base-package", "com.yss.dataanalysis.item5", "--target-dir", target], { env: { ...process.env, NODE_ENV: "test", YSS_SCAFFOLD_TEST_FAIL_AFTER_STAGING: "1" } });
  assert.notEqual(result.status, 0); assert.match(result.stderr, /staging 后失败/);
  await assert.rejects(stat(target), { code: "ENOENT" });
  assert.equal(await readFile(path.join(occupied, "keep.txt"), "utf8"), "keep");
  assert.deepEqual((await readdir(base)).filter((name) => name.startsWith(".data-analysis-item5.staging-") && name !== path.basename(occupied)), []);
});
test("生成期间空目标目录被写入时保留新内容并拒绝替换", async (t) => {
  const base = await mkdtemp(path.join(os.tmpdir(), "data-analysis-target-race-")); t.after(() => rm(base, { recursive: true, force: true }));
  const target = path.join(base, "data-analysis-item6"); await mkdir(target);
  const result = run(["--project-name", "data-analysis-item6", "--base-package", "com.yss.dataanalysis.item6", "--target-dir", target], { env: { ...process.env, NODE_ENV: "test", YSS_SCAFFOLD_TEST_WRITE_TARGET_DURING_STAGING: "1" } });
  assert.notEqual(result.status, 0);
  assert.equal(await readFile(path.join(target, "keep.txt"), "utf8"), "concurrent content\n");
  assert.deepEqual((await readdir(base)).filter((name) => name.startsWith(".data-analysis-item6.staging-")), []);
});
test("结构验证器拒绝与生成清单不一致的实现仓登记", async (t) => {
  const base = await mkdtemp(path.join(os.tmpdir(), "data-analysis-registry-drift-")); t.after(() => rm(base, { recursive: true, force: true }));
  const target = path.join(base, "data-analysis-item7");
  const result = run(["--project-name", "data-analysis-item7", "--base-package", "com.yss.dataanalysis.item7", "--target-dir", target]);
  assert.equal(result.status, 0, result.stderr);
  const registryPath = path.join(target, "docs/process/implementation-repo-registry.yaml");
  const registry = await readFile(registryPath, "utf8");
  await writeFile(registryPath, registry.replace("repository_scope: external-repository", "repository_scope: harness-apps"));
  const verification = spawnSync(process.execPath, [verifyScript, "--project-root", target], { encoding: "utf8" });
  assert.notEqual(verification.status, 0);
  assert.match(verification.stderr, /实现仓登记与生成清单不一致/);
});
test("OceanBase Oracle 仅生成指定驱动并保持 Java 8 基线", async (t) => {
  const base = await mkdtemp(path.join(os.tmpdir(), "data-analysis-oceanbase-")); t.after(() => rm(base, { recursive: true, force: true }));
  const target = path.join(base, "data-analysis-item8");
  const result = run(["--project-name", "data-analysis-item8", "--base-package", "com.yss.dataanalysis.item8", "--target-dir", target, "--database", "oceanbase-oracle", "--with-mock"]);
  assert.equal(result.status, 0, result.stderr);
  const parentPom = await readFile(path.join(target, "pom.xml"), "utf8");
  const repositoryPom = await readFile(path.join(target, "repository/pom.xml"), "utf8");
  assert.match(parentPom, /<java.version>1.8<\/java.version>/);
  assert.match(parentPom, /<version>2.0.0-SNAPSHOT<\/version>/);
  assert.match(repositoryPom, /oceanbase-client/);
  assert.doesNotMatch(repositoryPom, /ojdbc8/);
  const querySource = await readFile(path.join(target, "client/src/main/java/com/yss/dataanalysis/item8/client/query/AnalysisQuery.java"), "utf8");
  assert.doesNotMatch(querySource, /\brecord\b|List\.of|Map\.of|jakarta\./);
  const verification = spawnSync(process.execPath, [verifyScript, "--project-root", target], { encoding: "utf8" });
  assert.equal(verification.status, 0, verification.stderr);
});
