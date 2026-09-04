#!/usr/bin/env node
/** YSS MVC 脚手架编排入口；参数、文件、模板和项目治理分别位于 scripts/lib。 */
import { cp, mkdir, mkdtemp, rename, rm, rmdir } from "node:fs/promises";
import path from "node:path";

import {
  MODULES,
  SHARED_SKILLS_ROOT,
  fail,
  parseArgs,
  assertGitAvailable,
  resolveGitAuthor,
  resolveMavenSettings,
  initializeGit,
  exists,
} from "./lib/runtime.mjs";
import { assertEmpty, ensureSkillUtils, put, renderAsset } from "./lib/storage.mjs";
import { writeProjectEnvelope } from "./lib/envelope.mjs";
import { modulePom, parentPom, writeJavaSources } from "./lib/templates.mjs";

const SKILL_ID = "yss-mvc-scaffold-generator";
let generatedJavadocAuthor;

function usage() {
  console.log(`YSS MVC 脚手架生成器\n\n用法: node scripts/generate_project.mjs --project-name <name> --base-package <package> --target-dir <dir> [选项]\n\n选项: --database oracle|oceanbase-oracle --with-mock --maven-settings <path> --dry-run`);
}

async function writeGenerated(root, relative, content) {
  await put(root, relative, content, generatedJavadocAuthor);
}

async function copyWrapper(root) {
  const source = path.join(SHARED_SKILLS_ROOT, "yss-ddd-scaffold-generator", "assets", "wrapper");
  if (!await exists(source)) fail(`Maven Wrapper 资产不存在: ${source}`);
  await cp(source, root, { recursive: true });
}

function buildPlan(o, skillUtils, mavenSettings) {
  const driver = o.database === "oceanbase-oracle" ? "com.oceanbase:oceanbase-client:2.4.3" : "com.oracle.database.jdbc:ojdbc8:19.8.0.0";
  return {
    project_name: o.projectName,
    project_version: "2.0.0-SNAPSHOT",
    base_package: o.basePackage,
    target_dir: o.targetDir,
    backend_root: ".",
    skill_utils_dir: path.relative(o.targetDir, skillUtils.path).replaceAll(path.sep, "/"),
    skill_utils_created: skillUtils.created,
    skill_utils_refreshed: skillUtils.refreshed,
    skill_utils_backup: skillUtils.backup,
    repository_scope: "external-repository",
    database: o.database,
    database_driver: driver,
    runtime_java: "8",
    parent_pom: "com.yss.cloud:yss-cloud-microservice:2.0.0-SNAPSHOT",
    components_bom: "com.yss.cloud:yss-components-bom:2.0.0-SNAPSHOT",
    persistence_profile: "yss-mybatis-plus",
    id_strategy: "ASSIGN_ID",
    javadoc_author: o.gitAuthor,
    maven_settings_mode: "external",
    maven_settings_source: mavenSettings.source,
    maven_settings_available: mavenSettings.available,
    maven_settings_required: mavenSettings.available,
    dependency_resolution: "deferred",
    network_access_during_generation: "disabled",
    features: ["audit", "distributed-id", "excel", "nacos", "redis", "openfeign", "smart-doc", "userinfo", "actuator"],
    modules: MODULES,
    mock_enabled: o.withMock,
    project_instance: true,
    git_initialized: true,
    default_branch: "main",
    endpoint: o.withMock ? "POST /api/analysis/query" : null
  };
}

async function generate(o) {
  await assertEmpty(o.targetDir);
  const skillUtils = await ensureSkillUtils(o.targetDir, { apply: !o.dryRun });
  assertGitAvailable();
  o.gitAuthor = resolveGitAuthor();
  generatedJavadocAuthor = o.gitAuthor;
  const mavenSettings = await resolveMavenSettings(o);
  const plan = buildPlan(o, skillUtils, mavenSettings);
  if (o.dryRun) {
    console.log(JSON.stringify({ mode: "dry-run", ...plan }, null, 2));
    return;
  }

  const targetParent = path.dirname(o.targetDir);
  await mkdir(targetParent, { recursive: true });
  const staging = await mkdtemp(path.join(targetParent, `.${path.basename(o.targetDir)}.staging-`));
  const work = { ...o, targetDir: staging, modules: MODULES };
  try {
    for (const module of MODULES) {
      await writeGenerated(work.targetDir, `${module}/pom.xml`, modulePom(work, module));
      await mkdir(path.join(work.targetDir, module, "src/main/resources"), { recursive: true });
    }
    await writeGenerated(work.targetDir, "pom.xml", parentPom(work));
    await writeJavaSources(work, writeGenerated);
    const activeProfiles = `\${app.env:dev},datasource,nacos,${o.database === "oceanbase-oracle" ? "oceanbase-oracle" : "oracle"}${o.withMock ? ",mock" : ""}`;
    await writeGenerated(work.targetDir, "server/src/main/resources/bootstrap.yml", `server:\n  port: \${SERVER_PORT:8080}\nspring:\n  application:\n    name: \${APP_NAME:${o.projectName}}\n  profiles:\n    active: ${activeProfiles}\n  main:\n    allow-bean-definition-overriding: true\n  servlet:\n    multipart:\n      max-file-size: \${MAX_FILE_SIZE:100MB}\n      max-request-size: \${MAX_REQUEST_SIZE:100MB}`);
    await writeGenerated(work.targetDir, "server/src/main/resources/bootstrap-nacos.yml", `spring:\n  cloud:\n    nacos:\n      discovery:\n        server-addr: \${nacosserver:192.168.165.58:8848}\n        group: \${nacos_group:yss-dm}\n        namespace: \${namespace:yss-datamiddle}\n        enabled: true\n      config:\n        import-check:\n          enabled: false\n        server-addr: \${nacosserver:192.168.165.58:8848}\n        namespace: \${namespace:yss-datamiddle}\n        group: \${nacos_group:yss-dm}\n        file-extension: yml\n        enabled: true`);
    if (o.withMock) await writeGenerated(work.targetDir, "server/src/main/resources/bootstrap-mock.yml", `spring:\n  cloud:\n    nacos:\n      discovery:\n        enabled: false\n      config:\n        enabled: false\n        import-check:\n          enabled: false`);
    await writeGenerated(work.targetDir, "server/src/main/resources/application-mock.yml", `spring:\n  autoconfigure:\n    exclude:\n      - org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration\n      - com.yss.cloud.mybatis.MybatisPlusConfiguration\n      - com.yss.cloud.sankuai.config.LeafDataSourceConfiguration\n  leaf:\n    leafSegmentEnable: false\n    leafSnowflakeEnable: false\nyss:\n  audit:\n    enabled: false`);
    const driver = o.database === "oceanbase-oracle" ? "com.oceanbase.jdbc.Driver" : "oracle.jdbc.OracleDriver";
    await writeGenerated(work.targetDir, `server/src/main/resources/application-${o.database}.yml`, `spring:\n  datasource:\n    driver-class-name: ${driver}\n    url: \${DB_URL:}\n    username: \${DB_USERNAME:}\n    password: \${DB_PASSWORD:}\nyss:\n  id:\n    strategy: ASSIGN_ID`);
    await writeGenerated(work.targetDir, "server/src/main/resources/logback-spring.xml", await renderAsset("logback-spring.xml.template", { PROJECT_NAME: o.projectName, BASE_PACKAGE: o.basePackage }));
    await writeGenerated(work.targetDir, "server/src/main/resources/smart-doc.json", await renderAsset("smart-doc.json.template", { PROJECT_NAME: o.projectName, BASE_PACKAGE: o.basePackage, GENERATED_AT: new Date().toISOString() }));
    await writeGenerated(staging, "README.md", `# ${o.projectName}\n\n项目根即 Maven 后端工程根，固定模块：${MODULES.join("、")}。\n\n## 依赖解析\n\n初始化阶段只生成文件和 Git 根，不执行 Maven，不下载依赖。未提供 settings 时仍会完整生成；后续验证时请使用 \`mvnw.cmd -s <settings.xml> validate\`（Windows）或 \`./mvnw -s <settings.xml> validate\`（Unix）。`);
    await writeProjectEnvelope(work);
    await copyWrapper(work.targetDir);
    if (process.env.NODE_ENV === "test" && process.env.YSS_SCAFFOLD_TEST_FAIL_AFTER_STAGING === "1") fail("测试注入：staging 后失败");
    initializeGit(staging);
    await writeGenerated(staging, ".yss/scaffold-generation.json", JSON.stringify({ schema_version: 1, skill: SKILL_ID, generation_mode: "controlled-generation", generated_at: new Date().toISOString(), ...plan }, null, 2));
    if (process.env.NODE_ENV === "test" && process.env.YSS_SCAFFOLD_TEST_WRITE_TARGET_DURING_STAGING === "1") await writeGenerated(o.targetDir, "keep.txt", "concurrent content");
    if (await exists(o.targetDir)) await rmdir(o.targetDir);
    await rename(staging, o.targetDir);
  } catch (error) {
    if (await exists(staging)) await rm(staging, { recursive: true, force: true });
    throw error;
  }
  console.log(JSON.stringify({ mode: "generated", ...plan }, null, 2));
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) { usage(); return 0; }
    await generate(options);
    return 0;
  } catch (error) {
    process.stderr.write(`\n❌ 生成失败: ${error.message}\n`);
    return 1;
  }
}

process.exitCode = await main();
