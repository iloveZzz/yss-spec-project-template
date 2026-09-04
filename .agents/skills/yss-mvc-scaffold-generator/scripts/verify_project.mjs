#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const modules = ["server", "core", "client", "repository", "adapter", "feign-client"];
const args = process.argv.slice(2); const index = args.indexOf("--project-root");
if (index < 0 || !args[index + 1]) { console.error("必须提供 --project-root"); process.exit(1); }
const root = path.resolve(args[index + 1]);
async function required(relative) { try { await stat(path.join(root, relative)); } catch { throw new Error(`缺少必需路径: ${relative}`); } }
try {
  await Promise.all([".git", ".gitignore", ".artifact-workspace.yaml", "yss-project.yaml", "AGENTS.md", "CONTEXT.md", "skills-lock.json", "scripts/check-agent-environment.mjs", "docs/service/service-overview.md", "docs/service/module-map.md", "docs/service/current-capabilities.md", "docs/agents/issue-tracker.md", "docs/process/lifecycle-registry.yaml", "docs/process/harness-process-tailoring.md", "docs/process/implementation-repo-registry.yaml", "docs/templates/approval-record-template.yaml", "docs/templates/implementation-routing-template.md", "docs/templates/verification-record-template.md", "docs/templates/vertical-slice-ticket-template.md", ".yss/scaffold-generation.json"].map(required));
  const manifest = JSON.parse(await readFile(path.join(root, ".yss/scaffold-generation.json"), "utf8"));
  if (manifest.skill !== "yss-mvc-scaffold-generator" || !["oracle", "oceanbase-oracle"].includes(manifest.database)) throw new Error("生成清单与 YSS MVC 脚手架合同不一致");
  if (manifest.runtime_java !== "8" || manifest.project_version !== "2.0.0-SNAPSHOT" || manifest.persistence_profile !== "yss-mybatis-plus") throw new Error("Java 8/YSS MyBatis-Plus 技术基线不正确");
  const skillUtils = path.resolve(root, manifest.skill_utils_dir);
  await Promise.all(["skill-utils.yaml", "skills-lock.json", ".agents/skills/yss-product-lifecycle/SKILL.md", ".agents/skills/yss-router/SKILL.md"].map((relative) => required(path.join(manifest.skill_utils_dir, relative))));
  for (const projection of [".agents", ".claude", ".codex", ".cursor", ".pi", ".qoder", ".trae"]) {
    const nestedGenerator = path.join(skillUtils, projection, "skills", "yss-mvc-scaffold-generator");
    if (await stat(nestedGenerator).then(() => true).catch(() => false)) throw new Error(`skillUtils 不应分发创建期生成器: ${projection}/skills/yss-mvc-scaffold-generator`);
  }
  for (const forbidden of [".agents", ".claude", ".codex", ".cursor", ".pi", ".qoder", ".trae"]) if (await stat(path.join(root, forbidden)).then(() => true).catch(() => false)) throw new Error(`项目不应携带技能投影目录: ${forbidden}`);
  if (JSON.stringify(manifest.modules) !== JSON.stringify(modules)) throw new Error("模块集合或顺序不正确");
  const backendRoot = path.join(root, manifest.backend_root || "");
  await Promise.all(["pom.xml", "mvnw", "mvnw.cmd", ...modules.map((item) => `${item}/pom.xml`)].map((relative) => required(path.join(manifest.backend_root || "", relative))));
  const packagePath = manifest.base_package.replaceAll(".", "/");
  await Promise.all([
    `server/src/main/java/${packagePath}/Application.java`,
    `server/src/main/java/${packagePath}/server/controller/AnalysisController.java`,
    `server/src/main/java/${packagePath}/server/configuration/AnalysisConfiguration.java`,
    `server/src/main/java/${packagePath}/server/configuration/DatabaseInfrastructureConfiguration.java`,
    `core/src/main/java/${packagePath}/core/gateway/AnalysisQueryExecutor.java`,
    `core/src/main/java/${packagePath}/core/service/AnalysisQueryService.java`,
    `client/src/main/java/${packagePath}/client/query/AnalysisQuery.java`,
    `client/src/main/java/${packagePath}/client/response/AnalysisResult.java`,
    `adapter/src/main/java/${packagePath}/adapter/oracle/OracleAnalysisQueryExecutor.java`,
  ].map(required));
  const all = await readFile(path.join(backendRoot, "pom.xml"), "utf8");
  for (const module of modules) if (!all.includes(`<module>${module}</module>`)) throw new Error(`父 POM 未声明模块: ${module}`);
  for (const expected of ["yss-cloud-microservice", "yss-components-bom", "<java.version>1.8</java.version>", "<version>2.0.0-SNAPSHOT</version>"]) if (!all.includes(expected)) throw new Error(`父 POM 缺少技术基线: ${expected}`);
  await Promise.all(["server/src/main/resources/bootstrap.yml", "server/src/main/resources/bootstrap-nacos.yml", "server/src/main/resources/application-mock.yml", `server/src/main/resources/application-${manifest.database}.yml`, "server/src/main/resources/logback-spring.xml", "server/src/main/resources/smart-doc.json"].map(required));
  if (manifest.mock_enabled) await required("server/src/main/resources/bootstrap-mock.yml");
  const bootstrap = await readFile(path.join(backendRoot, "server/src/main/resources/bootstrap.yml"), "utf8");
  const databaseProfile = manifest.database === "oceanbase-oracle" ? "oceanbase-oracle" : "oracle";
  const expectedProfiles = `active: \${app.env:dev},datasource,nacos,${databaseProfile}${manifest.mock_enabled ? ",mock" : ""}`;
  if (!bootstrap.includes(expectedProfiles) || /mock,\s*$/m.test(bootstrap)) throw new Error("Bootstrap profile 顺序或格式不正确");
  const bootstrapNacos = await readFile(path.join(backendRoot, "server/src/main/resources/bootstrap-nacos.yml"), "utf8");
  for (const expected of ["${nacosserver:192.168.165.58:8848}", "${nacos_group:yss-dm}", "enabled: true"]) if (!bootstrapNacos.includes(expected)) throw new Error(`Nacos Bootstrap 配置不完整: ${expected}`);
  if (manifest.mock_enabled) {
    const bootstrapMock = await readFile(path.join(backendRoot, "server/src/main/resources/bootstrap-mock.yml"), "utf8");
    if (!/discovery:\s*\n\s*enabled: false/.test(bootstrapMock) || !/config:\s*\n\s*enabled: false/.test(bootstrapMock)) throw new Error("Mock Bootstrap 未禁用 Nacos Discovery/Config");
    const applicationMock = await readFile(path.join(backendRoot, "server/src/main/resources/application-mock.yml"), "utf8");
    if (!/leaf:\s*\n\s*leafSegmentEnable: false\s*\n\s*leafSnowflakeEnable: false/.test(applicationMock)) throw new Error("Mock Profile 未禁用 Leaf Segment/Snowflake");
  }
  const serverPom = await readFile(path.join(backendRoot, "server/pom.xml"), "utf8");
  for (const expected of ["spring-boot-maven-plugin", "smart-doc-maven-plugin", "<id>nacos</id>", "<activeByDefault>true</activeByDefault>", "<app.env>dev</app.env>", "<app.profiles>nacos</app.profiles>", `${manifest.project_name}-client`, `${manifest.project_name}-core`, `${manifest.project_name}-repository`]) {
    if (!serverPom.includes(expected)) throw new Error(`server POM 缺少标准配置: ${expected}`);
  }
  const smartDocPlugin = serverPom.match(/<plugin>(?:(?!<\/plugin>)[\s\S])*?<artifactId>smart-doc-maven-plugin<\/artifactId>(?:(?!<\/plugin>)[\s\S])*?<\/plugin>/)?.[0];
  if (!smartDocPlugin) throw new Error("server POM 缺少 Smart-doc 人工文档能力");
  if (smartDocPlugin.includes("<executions>")) throw new Error("Smart-doc 不得绑定 Maven execution");
  const smartDoc = await readFile(path.join(backendRoot, "server/src/main/resources/smart-doc.json"), "utf8");
  for (const expected of [`"projectName": "${manifest.project_name}"`, `"packageFilters": "${manifest.base_package}.server.controller.*"`, '"showAuthor": true', '"appToken": ""']) {
    if (!smartDoc.includes(expected)) throw new Error(`Smart-doc 配置不完整: ${expected}`);
  }
  if (/43fd1d4bc1c743c1b83bf4843e8167bf|192\.168\./.test(smartDoc)) throw new Error("Smart-doc 不得携带示例项目的内网地址或 Token");
  const logback = await readFile(path.join(backendRoot, "server/src/main/resources/logback-spring.xml"), "utf8");
  for (const expected of ['springProfile name="dev,mock"', 'springProfile name="uat,pro,oracle,oceanbase-oracle"', manifest.base_package, "RollingFileAppender", "<maxFileSize>100MB</maxFileSize>", "<maxHistory>7</maxHistory>"]) {
    if (!logback.includes(expected)) throw new Error(`Logback 配置不完整: ${expected}`);
  }
  const controller = await readFile(path.join(backendRoot, `server/src/main/java/${packagePath}/server/controller/AnalysisController.java`), "utf8");
  for (const expected of [`@author ${manifest.javadoc_author}`, "@date ", "@param query", "@return "]) if (!controller.includes(expected)) throw new Error(`Controller Javadoc 不完整: ${expected}`);
  const application = await readFile(path.join(backendRoot, `server/src/main/java/${packagePath}/Application.java`), "utf8");
  if (application.includes("@EnableDistributedId")) throw new Error("启动类不得在 Mock profile 无条件启用分布式 ID");
  const databaseInfrastructure = await readFile(path.join(backendRoot, `server/src/main/java/${packagePath}/server/configuration/DatabaseInfrastructureConfiguration.java`), "utf8");
  for (const expected of ['@Profile("!mock")', "@EnableDistributedId", "@Import(MapperConfiguration.class)"]) if (!databaseInfrastructure.includes(expected)) throw new Error(`数据库基础设施 Profile 隔离不完整: ${expected}`);
  const configuration = await readFile(path.join(backendRoot, `server/src/main/java/${packagePath}/server/configuration/AnalysisConfiguration.java`), "utf8");
  const expectedOracleProfile = manifest.mock_enabled ? `@Profile("${databaseProfile} & !mock")` : `@Profile("${databaseProfile}")`;
  if (!configuration.includes(expectedOracleProfile)) throw new Error("Oracle/Mock 执行器 Profile 隔离不正确");
  const identity = await readFile(path.join(root, "yss-project.yaml"), "utf8");
  if (!identity.includes("repository_mode: project-instance")) throw new Error("项目身份不是 project-instance");
  const registry = await readFile(path.join(root, "docs/process/implementation-repo-registry.yaml"), "utf8");
  if (/smart-doc(?:-maven-plugin[^\n]*:openapi|-verification\.md|:html|:torna-rest)/i.test(registry)) throw new Error("AI Coding 默认验证不得执行 Smart-doc 或要求其证据");
  const expectedRegistryLines = [
    `    project_name: ${manifest.project_name}`,
    `    project_root: ${manifest.backend_root}`,
    "    git_root: .",
    "    repository_scope: external-repository",
    "      - .",
  ];
  for (const line of expectedRegistryLines) {
    if (!registry.split(/\r?\n/).includes(line)) throw new Error(`实现仓登记与生成清单不一致: ${line.trim()}`);
  }
  const gitRoot = spawnSync("git", ["-C", root, "rev-parse", "--show-toplevel"], { encoding: "utf8" });
  if (gitRoot.status !== 0 || path.resolve(gitRoot.stdout.trim()).toLowerCase() !== root.toLowerCase()) throw new Error("目标目录不是独立 Git 仓库根");
  const branch = spawnSync("git", ["-C", root, "branch", "--show-current"], { encoding: "utf8" });
  if (branch.status !== 0 || branch.stdout.trim() !== "main") throw new Error("独立 Git 仓库默认分支不是 main");
  const commits = spawnSync("git", ["-C", root, "rev-list", "--all", "--count"], { encoding: "utf8" });
  if (commits.status !== 0 || commits.stdout.trim() !== "0") throw new Error("生成器不得创建 Git commit");
  const remotes = spawnSync("git", ["-C", root, "remote"], { encoding: "utf8" });
  if (remotes.status !== 0 || remotes.stdout.trim()) throw new Error("生成器不得配置 Git remote");
  console.log(`项目结构验证通过：${manifest.project_name}，${modules.length} 个模块，mock=${manifest.mock_enabled}`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
