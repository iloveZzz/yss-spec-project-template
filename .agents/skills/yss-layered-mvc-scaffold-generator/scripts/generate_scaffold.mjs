#!/usr/bin/env node
/** 依据生命周期批准的 schema v3 合同生成纯机械 YSS 分层 MVC 后端骨架。 */
import { createHash } from "node:crypto";
import { chmod, cp, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseDocument } from "../../../../scripts/vendor/yaml.mjs";
import { findGitRoot, gitSubmoduleScaffoldViolation, overlayMountViolation } from "../../../../scripts/lib/repository-scope-policy.mjs";
import { assertLocalDatabaseProfile, localDatabaseConfiguration, scaffoldArchitectureIdentity } from "../../../../scripts/lib/scaffold-local-database.mjs";
import { validateArchitectureIdentity } from "../../../../scripts/lib/backend-architecture.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(SCRIPT_DIR, "..");
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "../../../..");
const SKILL_ID = "yss-layered-mvc-scaffold-generator";
const COMMANDS = ["./mvnw validate", "./mvnw test", "./mvnw package"];
const MODULE_ORDER = ["server", "service", "repository", "adapter", "client", "feign-client"];
const CORE_MODULES = ["server", "service", "repository"];
const CAPABILITIES = Object.freeze({
  "external-integration": ["adapter"],
  "published-client": ["client"],
  "feign-client": ["client", "feign-client"]
});

function fail(message) { throw new Error(message); }
function isPresent(value) { return value !== undefined && value !== null && value !== "" && (!Array.isArray(value) || value.length > 0); }
function sha256(content) { return `sha256:${createHash("sha256").update(content).digest("hex")}`; }
function rawSha256(content) { return createHash("sha256").update(content).digest("hex"); }
function isWithin(parent, target) { const relative = path.relative(parent, target); return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)); }
function xml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
function toUpperCamel(value) { return value.split("-").map((part) => `${part[0].toUpperCase()}${part.slice(1)}`).join(""); }
function orderedModules(requested) {
  const modules = new Set(CORE_MODULES);
  for (const capability of requested) {
    if (!CAPABILITIES[capability]) fail(`unsupported MVC capability: ${capability}`);
    for (const module of CAPABILITIES[capability]) modules.add(module);
  }
  return MODULE_ORDER.filter((module) => modules.has(module));
}
async function exists(target) { try { await lstat(target); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; } }
async function put(root, relative, content) { const target = path.join(root, relative); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, content.endsWith("\n") ? content : `${content}\n`, "utf8"); }
async function fileEntries(root, excluded = new Set()) {
  const entries = [];
  async function visit(directory) {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const target = path.join(directory, entry.name);
      const relative = path.relative(root, target).split(path.sep).join("/");
      if (entry.name === ".git") continue;
      if (excluded.has(relative)) continue;
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile()) entries.push({ target, relative });
    }
  }
  await visit(root);
  return entries;
}
async function treeDigest(root) {
  const hash = createHash("sha256");
  async function visit(directory) {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile()) hash.update(path.relative(root, target)).update("\0").update(await readFile(target)).update("\0");
    }
  }
  await visit(root);
  return `sha256:${hash.digest("hex")}`;
}

export function parseArgs(argv) {
  const options = { force: false };
  const mapping = new Map([
    ["--project-name", "projectName"], ["--base-package", "basePackage"], ["--output-dir", "outputDir"],
    ["--contract-file", "contractFile"], ["--contract-id", "contractId"], ["--contract-version", "contractVersion"],
    ["--approval-ref", "approvalRef"], ["--compiler-draft-ref", "compilerDraftRef"], ["--persisted-ref", "persistedRef"],
    ["--group-id", "groupId"], ["--project-version", "projectVersion"], ["--parent-group-id", "parentGroupId"],
    ["--parent-artifact-id", "parentArtifactId"], ["--parent-version", "parentVersion"], ["--yss-components-version", "yssComponentsVersion"]
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    let token = argv[index];
    if (token === "--help" || token === "-h") { options.help = true; continue; }
    if (token === "--force") { options.force = true; continue; }
    const equal = token.indexOf("=");
    let value;
    if (equal >= 0) { value = token.slice(equal + 1); token = token.slice(0, equal); }
    if (!mapping.has(token)) fail(`不支持的参数: ${token}`);
    if (value === undefined) value = argv[++index];
    if (!value || value.startsWith("--")) fail(`参数 ${token} 缺少值`);
    options[mapping.get(token)] = value;
  }
  if (options.help) return options;
  for (const key of mapping.values()) if (!isPresent(options[key])) fail(`缺少必填参数: ${key}`);
  if (!/^[a-z][a-z0-9-]*$/.test(options.projectName)) fail("--project-name 必须是 kebab-case");
  if (!/^[a-z](?:[a-z0-9]*)(?:\.[a-z](?:[a-z0-9]*)?)*$/.test(options.basePackage)) fail("--base-package 不是合法 Java 包名");
  if (!/^\d+$/.test(options.contractVersion) || Number(options.contractVersion) < 1) fail("--contract-version 必须为正整数");
  options.contractVersion = Number(options.contractVersion);
  if (options.force) fail("unsupported: initialize-only 脚手架禁止 --force");
  return options;
}

function dependency(groupId, artifactId, version = null, scope = null) {
  return `<dependency><groupId>${xml(groupId)}</groupId><artifactId>${xml(artifactId)}</artifactId>${version ? `<version>${xml(version)}</version>` : ""}${scope ? `<scope>${scope}</scope>` : ""}</dependency>`;
}

function parentPom(contract, modules) {
  const c = contract.maven_coordinates;
  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <parent><groupId>${xml(c.parent.group_id)}</groupId><artifactId>${xml(c.parent.artifact_id)}</artifactId><version>${xml(c.parent.version)}</version><relativePath/></parent>
  <groupId>${xml(c.group_id)}</groupId><artifactId>${xml(contract.project_name)}</artifactId><version>${xml(c.project_version)}</version><packaging>pom</packaging>
  <properties><java.version>1.8</java.version><maven.compiler.source>1.8</maven.compiler.source><maven.compiler.target>1.8</maven.compiler.target><project.build.sourceEncoding>UTF-8</project.build.sourceEncoding><yss-components.version>${xml(c.yss_components_version)}</yss-components.version></properties>
  <modules>${modules.map((module) => `<module>${contract.project_name}-${module}</module>`).join("")}</modules>
  <dependencyManagement><dependencies>${dependency("com.yss.cloud", "yss-components-bom", "${yss-components.version}", "import").replace("</dependency>", "<type>pom</type></dependency>")}</dependencies></dependencyManagement>
  <build><pluginManagement><plugins><plugin><groupId>org.apache.maven.plugins</groupId><artifactId>maven-compiler-plugin</artifactId><version>3.11.0</version><configuration><source>1.8</source><target>1.8</target><annotationProcessorPaths><path><groupId>org.projectlombok</groupId><artifactId>lombok</artifactId><version>1.18.30</version></path><path><groupId>org.mapstruct</groupId><artifactId>mapstruct-processor</artifactId><version>1.5.5.Final</version></path><path><groupId>org.projectlombok</groupId><artifactId>lombok-mapstruct-binding</artifactId><version>0.2.0</version></path></annotationProcessorPaths></configuration></plugin></plugins></pluginManagement></build>
</project>`;
}

function modulePom(contract, module, modules) {
  const applicationModule = modules.includes("core") ? "core" : "service";
  const own = (name) => dependency(contract.maven_coordinates.group_id, `${contract.project_name}-${name}`, "${project.version}");
  const dependencies = [];
  if (module === "server") {
    dependencies.push(own(applicationModule), dependency("org.springframework.boot", "spring-boot-starter-web"), dependency("org.springframework.boot", "spring-boot-starter-validation"), dependency("org.springframework.boot", "spring-boot-starter-test", null, "test"), dependency("com.tngtech.archunit", "archunit-junit5", "1.2.1", "test"));
    if (modules.includes("client")) dependencies.push(own("client"));
    dependencies.push(dependency("com.h2database", "h2", null, "test"), dependency("org.mapstruct", "mapstruct", "1.5.5.Final"), dependency("com.yss.cloud", "yss-component-dto"));
  }
  if (module === applicationModule) {
    dependencies.push(own("repository"), dependency("org.springframework", "spring-tx"), dependency("com.yss.cloud", "yss-component-dto"), dependency("org.springframework.boot", "spring-boot-starter-test", null, "test"));
    if (modules.includes("adapter")) dependencies.push(own("adapter"));
  }
  if (module === "repository") {
    dependencies.push(dependency("com.yss.cloud", "yss-component-mybatis-plus-starter"), dependency("org.mapstruct", "mapstruct", "1.5.5.Final"), dependency("org.springframework.boot", "spring-boot-starter-test", null, "test"), dependency("com.h2database", "h2", null, "test"));
  }
  if (module === "adapter") {
    dependencies.push(dependency("org.springframework", "spring-context"));
    if (modules.includes("feign-client")) dependencies.push(own("feign-client"));
  }
  if (module === "client") dependencies.push(dependency("com.yss.cloud", "yss-component-dto"), dependency("javax.validation", "validation-api"));
  if (["server", "service", "core", "client", "repository"].includes(module)) dependencies.push(dependency("org.projectlombok", "lombok", "1.18.30", "provided"));
  if (module === "feign-client") dependencies.push(own("client"), dependency("org.springframework.cloud", "spring-cloud-openfeign-core"));
  const plugin = module === "server" ? `<profiles><profile><id>scaffold-local</id><dependencies>${dependency("com.h2database", "h2", null, "runtime")}</dependencies></profile></profiles><build><plugins><plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId></plugin></plugins></build>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"><modelVersion>4.0.0</modelVersion><parent><groupId>${xml(contract.maven_coordinates.group_id)}</groupId><artifactId>${xml(contract.project_name)}</artifactId><version>${xml(contract.maven_coordinates.project_version)}</version></parent><artifactId>${xml(contract.project_name)}-${module}</artifactId><dependencies>${dependencies.join("")}</dependencies>${plugin}</project>`;
}

async function validateContract(options, skillId, architectureProfile) {
  const contractFile = path.resolve(options.contractFile);
  const contractText = await readFile(contractFile, "utf8").catch(() => fail(`脚手架合同不可读取: ${contractFile}`));
  let contract;
  try { contract = JSON.parse(contractText); } catch { fail("脚手架合同必须是 JSON 对象"); }
  if (contract.schema_version !== 3) fail(`unsupported: 新生成只接受 scaffold contract schema v3，收到 v${contract.schema_version}`);
  const required = ["contract_id", "contract_version", "scaffold_request_id", "status", "compiler_draft_ref", "lifecycle_approval_ref", "persisted_ref", "current_version", "implementation_repository", "backend_repository", "scaffold_status", "project_name", "target_output_dir", "base_package", "architecture_family", "generator_skill", "decision_ref", "decision_id", "decision_digest", "maven_coordinates", "profiles", "module_profile", "allowed_write_paths", "expected_evidence_files", "verification_commands", "approval", "work_unit", "generation_policy"];
  const missing = required.filter((field) => !isPresent(contract[field]));
  if (missing.length) fail(`脚手架合同缺少字段: ${missing.join(", ")}`);
  if (contract.status !== "approved" || contract.current_version !== contract.contract_version) fail("脚手架合同必须已批准且为当前版本");
  if (contract.contract_id !== options.contractId || contract.contract_version !== options.contractVersion || contract.compiler_draft_ref !== options.compilerDraftRef || contract.lifecycle_approval_ref !== options.approvalRef || contract.persisted_ref !== options.persistedRef) fail("命令行合同元数据与批准合同不一致");
  if (contract.scaffold_status !== "required" || contract.architecture_family !== "layered-mvc" || contract.generator_skill !== skillId) fail("合同必须绑定 layered-mvc 与本生成器");
  if (contract.project_name !== options.projectName || contract.base_package !== options.basePackage || path.resolve(contract.target_output_dir) !== path.resolve(options.outputDir)) fail("项目身份或输出目录与合同不一致");
  if (!["allowed_write_paths", "expected_evidence_files", "verification_commands"].every((field) => Array.isArray(contract[field]) && contract[field].length)) fail("allowed_write_paths、expected_evidence_files、verification_commands 必须为非空数组");
  const finalProjectRoot = path.join(path.resolve(options.outputDir), options.projectName);
  const allowedRoots = contract.allowed_write_paths.map((item) => path.resolve(options.outputDir, String(item)));
  if (!allowedRoots.some((root) => isWithin(root, finalProjectRoot))) fail("实际项目根不在合同 allowed_write_paths 内");
  const expectedProfiles = { architecture: "layered-mvc", persistence: "mybatis-plus", platform: "spring-boot-2.7-jdk8", validation_namespace: "javax", repository: "yss-internal" };
  for (const [field, value] of Object.entries(expectedProfiles)) if (contract.profiles?.[field] !== value) fail(`unsupported profile ${field}: ${contract.profiles?.[field]}`);
  assertLocalDatabaseProfile(contract.profiles);
  if (contract.architecture_profile !== architectureProfile) fail(`合同必须显式绑定 ${architectureProfile} Profile`);
  const requested = contract.module_profile?.requested_capabilities;
  if (!Array.isArray(requested)) fail("module_profile.requested_capabilities 必须是数组");
  const resolved = architectureProfile === "mvc-data-analysis-v1" ? ["server", "core", "client", "repository", "adapter", "feign-client"] : orderedModules(requested);
  if (contract.module_profile.resolution_version !== 1 || JSON.stringify(contract.module_profile.resolved_modules) !== JSON.stringify(resolved)) fail("MVC 能力闭包与 resolution_version=1 不一致");
  if (JSON.stringify(contract.verification_commands) !== JSON.stringify(COMMANDS)) fail("验证命令必须固定为三条 ./mvnw 命令");
  if (!contract.expected_evidence_files.includes(".yss/scaffold-generation.json")) fail("expected_evidence_files 必须包含 Manifest");
  const work = contract.work_unit;
  if (work?.primary_skill !== skillId || work?.tdd_mode !== "controlled-generation" || work?.controlled_generation !== true) fail("工作单元必须绑定本生成器和 controlled-generation");
  if (!Array.isArray(work.allowed_write_paths) || !Array.isArray(work.expected_evidence) || !Array.isArray(work.verification_commands) || JSON.stringify(work.allowed_write_paths) !== JSON.stringify(contract.allowed_write_paths) || JSON.stringify(work.verification_commands) !== JSON.stringify(contract.verification_commands)) fail("工作单元与根级写路径或验证命令不一致");
  const approval = contract.approval;
  if (!approval || ["approval_ref", "approver", "persisted_ref", "current_version"].some((field) => !isPresent(approval[field])) || approval.approval_ref !== options.approvalRef || approval.persisted_ref !== options.persistedRef || approval.current_version !== options.contractVersion) fail("approval 记录不完整或不是当前合同版本");
  const policy = contract.generation_policy;
  if (policy?.mode !== "initialize-only" || policy?.existing_target !== "unsupported" || policy?.old_project_migration !== "unsupported" || policy?.template_upgrade !== "unsupported") fail("generation_policy 不符合 initialize-only");
  const coordinates = contract.maven_coordinates;
  const coordinateValues = [coordinates?.group_id, coordinates?.project_version, coordinates?.parent?.group_id, coordinates?.parent?.artifact_id, coordinates?.parent?.version, coordinates?.yss_components_version];
  const optionValues = [options.groupId, options.projectVersion, options.parentGroupId, options.parentArtifactId, options.parentVersion, options.yssComponentsVersion];
  if (coordinateValues.some((value) => !isPresent(value)) || JSON.stringify(coordinateValues) !== JSON.stringify(optionValues)) fail("Maven 坐标与合同不一致");
  if (coordinateValues.some((value) => !/^[A-Za-z0-9_.-]+$/.test(String(value)))) fail("Maven 坐标只能包含字母、数字、点、下划线和连字符");
  const decisionPath = path.isAbsolute(contract.decision_ref) ? contract.decision_ref : path.resolve(path.dirname(contractFile), contract.decision_ref);
  const decisionText = await readFile(decisionPath, "utf8").catch(() => fail(`架构决策文件不可读取: ${decisionPath}`));
  if (sha256(decisionText) !== contract.decision_digest) fail("架构决策文件 digest 与合同不一致");
  const document = parseDocument(decisionText, { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length) fail(`架构决策 YAML 无效: ${document.errors[0].message}`);
  const decisionSet = document.toJS({ maxAliasCount: 0 });
  if (decisionSet?.kind !== "scaffold-architecture-decisions" || decisionSet?.template !== false || decisionSet?.status !== "current") fail("架构决策文件必须是 current 的正式 scaffold-architecture-decisions 记录");
  const decisions = decisionSet.decisions ?? [];
  const decision = decisions.find((item) => item.decision_id === contract.decision_id);
  if (!decision || decision.status !== "lifecycle-approved" || decision.confirmed_architecture !== "layered-mvc" || decision.project_id !== contract.project_name) fail("架构决策未批准、项目不匹配或不是 layered-mvc");
  if (decision.platform_profile !== contract.profiles.platform || decision.architecture_profile !== contract.architecture_profile || decision.verification_database !== "h2" || decision.production_database !== "not-bound" || Object.hasOwn(decision, "database_profile") || JSON.stringify(decision.requested_capabilities) !== JSON.stringify(contract.module_profile.requested_capabilities) || JSON.stringify(decision.resolved_modules) !== JSON.stringify(contract.module_profile.resolved_modules)) fail("架构决策的 Profile 或模块闭包与脚手架合同不一致");
  if (!decision.user_confirmation || Object.values(decision.user_confirmation).some((value) => !isPresent(value))) fail("架构决策缺少完整用户确认记录");
  validateArchitectureIdentity(scaffoldArchitectureIdentity(contract, sha256(contractText)));
  return { contract, contractText, modules: resolved };
}

async function validateOutputLayout(outputDir, projectName) {
  const target = path.join(path.resolve(outputDir), projectName);
  const relative = path.relative(REPOSITORY_ROOT, path.resolve(outputDir));
  if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
    const parts = relative.split(path.sep).filter(Boolean);
    if (!(parts.length === 2 && parts[0] === "apps" && parts[1] === "backend")) fail("Harness 内后端脚手架输出父目录必须是 apps/backend");
  }
  const gitRoot = findGitRoot(target) || findGitRoot(outputDir) || REPOSITORY_ROOT;
  const violation = gitSubmoduleScaffoldViolation(gitRoot, path.resolve(outputDir), projectName, { force: false }) || overlayMountViolation(gitRoot, target, { force: true });
  if (violation) fail(violation);
  if (await exists(target)) fail(`unsupported: 目标已存在 ${target}`);
}

export async function generate(options, { skillId = SKILL_ID, architectureProfile = "layered-mvc-service", finalize } = {}) {
  if (!((skillId === SKILL_ID && architectureProfile === "layered-mvc-service") || (skillId === "yss-mvc-data-analysis-project-initializer" && architectureProfile === "mvc-data-analysis-v1"))) fail("unsupported MVC generator/Profile pair");
  await validateOutputLayout(options.outputDir, options.projectName);
  const { contract, contractText, modules } = await validateContract(options, skillId, architectureProfile);
  const outputDir = path.resolve(options.outputDir);
  await mkdir(outputDir, { recursive: true });
  const staging = await mkdtemp(path.join(outputDir, `.${options.projectName}.staging-`));
  const projectRoot = path.join(staging, options.projectName);
  const packagePath = options.basePackage.replaceAll(".", "/");
  try {
    await mkdir(projectRoot, { recursive: true });
    await put(projectRoot, "pom.xml", parentPom(contract, modules));
    for (const module of modules) {
      const moduleRoot = `${options.projectName}-${module}`;
      await put(projectRoot, `${moduleRoot}/pom.xml`, modulePom(contract, module, modules));
      await put(projectRoot, `${moduleRoot}/src/main/java/${packagePath}/${module.replaceAll("-", "/")}/package-info.java`, `/** ${module} mechanical package boundary. */\npackage ${options.basePackage}.${module.replaceAll("-", ".")};`);
    }
    const applicationClass = `${toUpperCamel(options.projectName)}Application`;
    const serverRoot = `${options.projectName}-server`;
    await put(projectRoot, `${serverRoot}/src/main/java/${packagePath}/${applicationClass}.java`, `package ${options.basePackage};\n\nimport org.springframework.boot.SpringApplication;\nimport org.springframework.boot.autoconfigure.SpringBootApplication;\n\n/** Mechanical Spring Boot entrypoint. */\n@SpringBootApplication\npublic class ${applicationClass} {\n    public static void main(String[] args) {\n        SpringApplication.run(${applicationClass}.class, args);\n    }\n}`);
    await put(projectRoot, `${serverRoot}/src/main/resources/application.yml`, `spring:\n  application:\n    name: ${options.projectName}`);
    await put(projectRoot, `${serverRoot}/src/main/resources/application-scaffold-local.yml`, localDatabaseConfiguration(options.projectName));
    await put(projectRoot, `${serverRoot}/src/test/resources/application-scaffold-test.yml`, localDatabaseConfiguration(`${options.projectName}_test`));
    await put(projectRoot, `${serverRoot}/src/test/java/${packagePath}/${applicationClass}Test.java`, `package ${options.basePackage};\n\nimport org.junit.jupiter.api.Test;\nimport org.springframework.boot.test.context.SpringBootTest;\nimport org.springframework.test.context.ActiveProfiles;\n\n@SpringBootTest\n@ActiveProfiles("scaffold-test")\nclass ${applicationClass}Test {\n    @Test\n    void contextLoads() {\n    }\n}`);
    await put(projectRoot, `${serverRoot}/src/test/java/${packagePath}/architecture/LayeredMvcArchitectureTest.java`, `package ${options.basePackage}.architecture;\n\nimport static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;\n\nimport com.tngtech.archunit.core.importer.ImportOption;\nimport com.tngtech.archunit.junit.AnalyzeClasses;\nimport com.tngtech.archunit.junit.ArchTest;\nimport com.tngtech.archunit.lang.ArchRule;\n\n@AnalyzeClasses(packages = "${options.basePackage}", importOptions = ImportOption.DoNotIncludeTests.class)\nclass LayeredMvcArchitectureTest {\n    @ArchTest\n    static final ArchRule repositoryDoesNotDependOnUpperLayers = noClasses().that().resideInAPackage("..repository..").should().dependOnClassesThat().resideInAnyPackage("..service..", "..server..");\n}`);
    const wrapper = path.join(REPOSITORY_ROOT, ".agents/skills/yss-ddd-scaffold-generator/assets/wrapper");
    await cp(wrapper, projectRoot, { recursive: true });
    await chmod(path.join(projectRoot, "mvnw"), 0o755);
    if (finalize) await finalize({ projectRoot, contract, architectureIdentity: scaffoldArchitectureIdentity(contract, sha256(contractText)) });
    await put(projectRoot, "README.md", `# ${options.projectName}\n\n该工程由 ${skillId} 根据批准的 schema v3 合同生成。模块：${modules.join("、")}。不包含业务 API、SQL 或生产数据库绑定。\n\n本地运行需同时显式启用 Maven -Pscaffold-local 和 Spring scaffold-local Profile；测试独立使用 H2。生产数据库须由后续已批准存储工作单元接入。`);
    const generatedFiles = [];
    for (const entry of await fileEntries(projectRoot, new Set([".yss/scaffold-generation.json"]))) generatedFiles.push({ path: entry.relative, owner: "generator", sha256: rawSha256(await readFile(entry.target)) });
    const architectureRuleset = `${serverRoot}/src/test/java/${packagePath}/architecture/LayeredMvcArchitectureTest.java`;
    const downstream = {};
    for (const skill of ["yss-application", "yss-repository", "yss-mybatis", "yss-web-controller", "yss-dto", "yss-exception", "yss-validation", "mapstruct", "lombok", "alibaba-java-code-style"]) downstream[skill] = (await treeDigest(path.join(REPOSITORY_ROOT, ".agents/skills", skill))).replace(/^sha256:/, "");
    const manifest = {
      schema_version: 3,
      kind: architectureProfile === "mvc-data-analysis-v1" ? "service-project-initialization" : "backend-scaffold",
      architecture_profile: contract.architecture_profile,
      architecture_identity: scaffoldArchitectureIdentity(contract, sha256(contractText)),
      contract_id: contract.contract_id,
      contract_version: contract.contract_version,
      scaffold_request_id: contract.scaffold_request_id,
      architecture_family: "layered-mvc",
      generator_skill: skillId,
      decision_id: contract.decision_id,
      decision_digest: contract.decision_digest,
      decision_ref: contract.decision_ref,
      contract_digest: sha256(contractText),
      contract_file_ref: path.resolve(options.contractFile),
      approval_ref: options.approvalRef,
      approver: contract.approval.approver,
      lifecycle_approval_ref: contract.lifecycle_approval_ref,
      compiler_draft_ref: contract.compiler_draft_ref,
      persisted_ref: contract.persisted_ref,
      current_version: contract.current_version,
      allowed_write_paths: contract.allowed_write_paths,
      expected_evidence_files: contract.expected_evidence_files,
      profiles: contract.profiles,
      module_profile: contract.module_profile,
      maven_coordinates: contract.maven_coordinates,
      maven_coordinates_source: "approved-contract",
      project_name: contract.project_name,
      base_package: contract.base_package,
      bootstrap_main_class: `${options.basePackage}.${applicationClass}`,
      bootstrap_main_source: `${serverRoot}/src/main/java/${packagePath}/${applicationClass}.java`,
      generation_mode: "controlled-generation",
      completion_level: "generated",
      generation_policy: contract.generation_policy,
      verification_commands: COMMANDS,
      generator: { id: skillId, template_digest: await treeDigest(SKILL_ROOT) },
      ownership: { generated_files: generatedFiles, user_owned_globs: ["**/src/main/java/**", "**/src/test/java/**", "db/**"] },
      readiness: { downstream_skills: downstream, contracts: { architecture_profiles: rawSha256(await readFile(path.join(REPOSITORY_ROOT, "docs/agents/backend-architecture-profiles.md"))), compiler_contract: rawSha256(await readFile(path.join(REPOSITORY_ROOT, ".agents/skills/yss-implementation-contract-compiler/references/compiler-contract.yaml"))) }, architecture_ruleset: rawSha256(await readFile(path.join(projectRoot, architectureRuleset))) },
      generated_at: new Date().toISOString()
    };
    await put(projectRoot, ".yss/scaffold-generation.json", JSON.stringify(manifest, null, 2));
    await rename(projectRoot, path.join(outputDir, options.projectName));
    await rm(staging, { recursive: true, force: true });
    process.stdout.write(`${JSON.stringify({ status: "generated", project_root: path.join(outputDir, options.projectName), modules }, null, 2)}\n`);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) { process.stdout.write("Use --project-name --base-package --output-dir and approved contract metadata. Local/test database is H2; production is not bound.\n"); return 0; }
    await generate(options);
    return 0;
  } catch (error) {
    process.stderr.write(`❌ MVC 脚手架生成失败: ${error.message}\n`);
    return 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = await main();
