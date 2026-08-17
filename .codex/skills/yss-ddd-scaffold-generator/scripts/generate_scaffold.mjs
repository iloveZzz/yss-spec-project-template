#!/usr/bin/env node
/** YSS DDD 后端纯工程骨架生成器；只生成工程结构，不生成任何业务行为。 */
import { chmod, cp, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(SCRIPT_DIR, "..");
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "../../../..");
const COMMANDS = ["./mvnw validate", "./mvnw test", "./mvnw package"];

function fail(message) { throw new Error(message); }
function isoNow() { return new Date().toISOString(); }
function localDate() { return new Date().toISOString().slice(0, 10); }
function backupStamp() { return new Date().toISOString().replace(/[-:TZ.]/g, ""); }
function usage(error) {
  const text = `YSS DDD 脚手架生成器\n\n` +
    `用法: node scripts/generate_scaffold.mjs --project-name <kebab-case> --base-package <package> --output-dir <dir> --contract-file <json> [选项]\n\n` +
    `必填合同元数据: --contract-id --contract-version --approval-ref --router-draft-ref --persisted-ref\n` +
    `选项: --database mysql, --force, --overwrite-scope <scope>, --rollback-ref <ref>\n` +
    `--with-example 已禁用；--without-example 是兼容的无操作参数。`;
  if (error) process.stderr.write(`错误: ${error}\n\n`);
  process.stdout.write(`${text}\n`);
}

function parseArgs(argv) {
  const options = { database: "mysql", force: false, withExample: false };
  const mapping = new Map([
    ["--project-name", "projectName"], ["--base-package", "basePackage"], ["--output-dir", "outputDir"],
    ["--database", "database"], ["--contract-id", "contractId"], ["--contract-version", "contractVersion"],
    ["--approval-ref", "approvalRef"], ["--router-draft-ref", "routerDraftRef"], ["--persisted-ref", "persistedRef"],
    ["--contract-file", "contractFile"], ["--overwrite-scope", "overwriteScope"], ["--rollback-ref", "rollbackRef"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    let token = argv[index];
    if (token === "--help" || token === "-h") { options.help = true; continue; }
    if (token === "--force") { options.force = true; continue; }
    if (token === "--with-example") { options.withExample = true; continue; }
    if (token === "--without-example") { options.withExample = false; continue; }
    const equal = token.indexOf("=");
    let value;
    if (equal !== -1) { value = token.slice(equal + 1); token = token.slice(0, equal); }
    if (!mapping.has(token)) fail(`不支持的参数: ${token}`);
    if (value === undefined) value = argv[++index];
    if (!value || value.startsWith("--")) fail(`参数 ${token} 缺少值`);
    options[mapping.get(token)] = value;
  }
  if (options.help) return options;
  for (const [flag, key] of mapping) {
    if (["database", "overwriteScope", "rollbackRef", "contractId", "contractVersion", "approvalRef", "routerDraftRef", "persistedRef"].includes(key)) continue;
    if (!options[key]) fail(`缺少必填参数: ${flag}`);
  }
  if (options.database !== "mysql") fail("参数 --database 只支持 mysql");
  if (!/^[a-z][a-z0-9-]*$/.test(options.projectName)) fail("项目名称必须是 kebab-case 格式 (例如: user-service)");
  if (!/^[a-z](?:[a-z0-9]*)(?:\.[a-z](?:[a-z0-9]*)?)*$/.test(options.basePackage)) fail("包名格式不正确 (例如: com.yss.user)");
  if (options.contractVersion !== undefined && (!/^\d+$/.test(options.contractVersion) || Number(options.contractVersion) < 1)) fail("--contract-version(必须为正整数)");
  if (options.contractVersion !== undefined) options.contractVersion = Number(options.contractVersion);
  if (options.withExample) fail("--with-example 已禁用；业务代码必须由批准的 YSS Slice skill 逐切片生成");
  return options;
}

async function exists(target) { try { await lstat(target); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; } }
async function isFile(target) { try { return (await stat(target)).isFile(); } catch (error) { if (error.code === "ENOENT") return false; throw error; } }
async function nonEmpty(target) { const info = await lstat(target); return !info.isDirectory() || (await readdir(target)).length > 0; }
async function readJson(target, message) { try { return JSON.parse(await readFile(target, "utf8")); } catch (error) { fail(`${message}: ${target}`); } }
async function writeText(target, content) { await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, content, "utf8"); }
function isPresent(value) { return value !== undefined && value !== null && value !== "" && (!Array.isArray(value) || value.length > 0); }

class ScaffoldGenerator {
  constructor(options) {
    this.options = options;
    this.projectName = options.projectName;
    this.basePackage = options.basePackage;
    this.outputDir = path.resolve(options.outputDir);
    this.contractFile = path.resolve(options.contractFile);
    this.finalProjectRoot = path.join(this.outputDir, this.projectName);
    this.projectRoot = this.finalProjectRoot;
    this.templateRoot = path.join(SKILL_ROOT, "assets", "templates");
    this.configTemplateDir = path.join(this.templateRoot, "config");
    this.pomTemplateDir = path.join(this.templateRoot, "pom");
    this.packagePath = this.basePackage.replaceAll(".", path.sep);
    this.author = process.env.USER || "yss-team";
    this.date = localDate();
    this.groupId = this.basePackage.split(".").slice(0, 2).join(".");
    this.dbName = this.projectName.replaceAll("-", "_");
    this.scaffoldContract = undefined;
  }

  async generate() {
    await this.validateHarnessOutputLayout();
    if (await exists(this.finalProjectRoot) && !this.options.force) fail(`输出目录已存在: ${this.finalProjectRoot}；如确认覆盖，请显式传入 --force`);
    await this.validateContractMetadata();
    if (await exists(this.finalProjectRoot) && await nonEmpty(this.finalProjectRoot) && this.options.force) this.validateForceMetadata();
    await mkdir(this.outputDir, { recursive: true });
    const stagingRoot = await mkdtemp(path.join(this.outputDir, `.${this.projectName}.staging-`));
    this.projectRoot = path.join(stagingRoot, this.projectName);
    try {
      console.log(`🚀 开始生成项目: ${this.projectName}\n📦 基础包名: ${this.basePackage}\n📁 输出目录: ${this.outputDir}\n`);
      await this.createProjectStructure(); await this.generatePomFiles(); await this.generateConfigFiles();
      this.generateDatabaseScripts(); await this.generateDocumentation(); await this.writeGenerationManifest();
      await this.copyWrapperFiles(); await this.validateGeneratedArtifacts();
      let backupPath;
      if (await exists(this.finalProjectRoot)) { backupPath = path.join(this.outputDir, `.${this.projectName}.backup-${backupStamp()}`); await rename(this.finalProjectRoot, backupPath); }
      await rename(this.projectRoot, this.finalProjectRoot); this.projectRoot = this.finalProjectRoot;
      console.log(`\n✅ 项目生成完成!\n📂 项目位置: ${this.projectRoot}`);
      if (backupPath) console.log(`♻️ 原项目备份: ${backupPath}`);
      console.log(`\n🎯 下一步:\n  cd ${this.projectRoot}\n  ./mvnw validate\n  ./mvnw test\n  ./mvnw package\n  ./mvnw spring-boot:run -pl ${this.projectName}-bootstrap`);
    } catch (error) { await rm(stagingRoot, { recursive: true, force: true }); throw error; }
  }

  async validateHarnessOutputLayout() {
    const relative = path.relative(REPOSITORY_ROOT, this.outputDir);
    if (relative.startsWith("..") || path.isAbsolute(relative)) return; // 外部实现仓库。
    const parts = relative.split(path.sep).filter(Boolean);
    if (parts.length >= 2 && parts[0] === "app" && ["backend", "frontend"].includes(parts[1])) fail("禁止使用单数 app/backend 或 app/frontend 作为工程生成路径；Harness 内后端脚手架必须以 apps/backend 为父容器");
    if (parts.length === 2 && parts[0] === "apps" && parts[1] === "backend") return;
    if (parts.length >= 2 && parts[0] === "apps" && parts[1] === "frontend") fail("后端脚手架不能输出到 apps/frontend；请使用外部后端仓库或 apps/backend");
    fail("当前 Harness 内生成后端工程时，输出目录必须是 apps/backend；生成器会以 project_name 创建 apps/backend/<project>/");
  }

  async validateContractMetadata() {
    if (!await isFile(this.contractFile)) fail("必须提供已持久化的结构化脚手架合同 JSON 文件: --contract-file");
    const contract = await readJson(this.contractFile, "脚手架合同文件无法读取或不是合法 JSON");
    if (!contract || Array.isArray(contract) || typeof contract !== "object") fail("脚手架合同必须是 JSON 对象");
    const requiredMetadata = [["--contract-id", this.options.contractId], ["--contract-version", this.options.contractVersion], ["--approval-ref", this.options.approvalRef], ["--router-draft-ref", this.options.routerDraftRef], ["--persisted-ref", this.options.persistedRef]];
    const missing = requiredMetadata.filter(([, value]) => !isPresent(value)).map(([flag]) => flag);
    if (missing.length) fail(`生成项目必须提供当前已批准脚手架合同的完整元数据: ${missing.join(", ")}`);
    const required = ["schema_version", "contract_id", "contract_version", "slice_id", "status", "router_draft_ref", "lifecycle_approval_ref", "persisted_ref", "current_version", "implementation_repository", "backend_repository", "scaffold_status", "target_git_url_or_output_dir", "allowed_write_paths", "expected_evidence_files", "verification_commands", "approval", "work_unit", "overwrite_policy"];
    const missingFields = required.filter((field) => !isPresent(contract[field]));
    if (missingFields.length) fail(`脚手架合同缺少结构化字段: ${missingFields.join(", ")}`);
    if (contract.schema_version !== 1 || contract.status !== "approved") fail("脚手架合同必须是 schema_version=1 且已由生命周期批准");
    if (contract.contract_id !== this.options.contractId) fail("--contract-id 与脚手架合同不一致");
    if (contract.contract_version !== this.options.contractVersion) fail("--contract-version 与脚手架合同不一致");
    if (contract.current_version !== contract.contract_version) fail("脚手架合同版本不是当前版本");
    if (contract.router_draft_ref !== this.options.routerDraftRef) fail("--router-draft-ref 与脚手架合同不一致");
    if (contract.persisted_ref !== this.options.persistedRef) fail("--persisted-ref 与脚手架合同不一致");
    if (contract.lifecycle_approval_ref !== this.options.approvalRef) fail("--approval-ref 与脚手架合同不一致");
    if (contract.scaffold_status !== "required") fail("脚手架生成器只接受 scaffold_status=required");
    if (!["allowed_write_paths", "expected_evidence_files", "verification_commands"].every((field) => Array.isArray(contract[field]) && contract[field].length)) fail("脚手架合同的 allowed_write_paths、expected_evidence_files、verification_commands 必须非空");
    if (!contract.expected_evidence_files.map(String).join(" ").includes(".yss/scaffold-generation.json")) fail("脚手架合同 expected_evidence_files 必须包含 .yss/scaffold-generation.json");
    const targetRef = String(contract.target_git_url_or_output_dir);
    if (!targetRef.includes("://") && !targetRef.startsWith("git@") && path.resolve(targetRef) !== this.outputDir) fail("脚手架合同目标目录与 --output-dir 不一致");
    if (JSON.stringify(contract.verification_commands) !== JSON.stringify(COMMANDS)) fail("脚手架合同验证命令必须固定为三条项目根目录 ./mvnw 命令");
    const approval = contract.approval;
    if (!approval || typeof approval !== "object" || ["approval_ref", "approver", "persisted_ref", "current_version"].some((field) => !isPresent(approval[field]))) fail("脚手架合同 approval 记录不完整");
    if (approval.approval_ref !== this.options.approvalRef || approval.persisted_ref !== this.options.persistedRef) fail("脚手架合同 approval 引用与命令参数不一致");
    if (approval.current_version !== this.options.contractVersion) fail("脚手架合同 approval 不是当前版本");
    const workUnit = contract.work_unit;
    const workFields = ["id", "behavior", "primary_skill", "supporting_skills", "tdd_mode", "allowed_write_paths", "expected_evidence", "verification_commands", "controlled_generation"];
    if (!workUnit || typeof workUnit !== "object" || workFields.some((field) => !isPresent(workUnit[field]))) fail("脚手架合同 work_unit 结构不完整");
    if (workUnit.primary_skill !== "yss-ddd-scaffold-generator" || workUnit.tdd_mode !== "controlled-generation" || workUnit.controlled_generation !== true) fail("脚手架合同 work_unit 必须绑定本 skill 和 controlled-generation");
    if (JSON.stringify(workUnit.verification_commands) !== JSON.stringify(contract.verification_commands) || JSON.stringify(workUnit.allowed_write_paths) !== JSON.stringify(contract.allowed_write_paths)) fail("脚手架合同 work_unit 与根级验证/写路径约束不一致");
    const overwrite = contract.overwrite_policy;
    if (!overwrite || typeof overwrite !== "object" || ["force_allowed", "overwrite_scope", "rollback_ref"].some((field) => !(field in overwrite))) fail("脚手架合同 overwrite_policy 结构不完整");
    this.scaffoldContract = contract;
  }

  validateForceMetadata() {
    if (!isPresent(this.options.overwriteScope) || !isPresent(this.options.rollbackRef)) fail("覆盖非空目录必须提供当前批准合同的覆盖范围和回滚引用: --overwrite-scope, --rollback-ref");
    const policy = this.scaffoldContract.overwrite_policy;
    if (policy.force_allowed !== true) fail("脚手架合同未批准非空目录覆盖");
    if (policy.overwrite_scope !== this.options.overwriteScope) fail("--overwrite-scope 与脚手架合同不一致");
    if (policy.rollback_ref !== this.options.rollbackRef) fail("--rollback-ref 与脚手架合同不一致");
  }

  templateVars() {
    const database = this.options.database;
    const dependency = database === "mysql" ? `<dependency>\n    <groupId>com.mysql</groupId>\n    <artifactId>mysql-connector-j</artifactId>\n    <version>8.4.0</version>\n    <scope>compile</scope>\n</dependency>` : "";
    return { project_name: this.projectName, base_package: this.basePackage, group_id: this.groupId, project_description: `${this.projectName} service`, author: this.author, date: this.date, database, driver_class: "com.mysql.cj.jdbc.Driver", db_name: this.dbName, jdbc_url: `jdbc:mysql://localhost:3306/${this.dbName}?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai`, db_dependency: dependency };
  }
  render(text) { let output = text; for (const [key, value] of Object.entries(this.templateVars())) output = output.replaceAll(`{{${key}}}`, String(value)); return output; }
  async renderTemplate(template, output) { if (!await isFile(template)) fail(`模板文件不存在: ${template}`); await writeText(output, this.render(await readFile(template, "utf8"))); }

  async createProjectStructure() {
    console.log("📁 创建项目目录结构...");
    for (const module of ["domain", "application", "infrastructure", "adapter", "bootstrap"]) {
      const root = path.join(this.projectRoot, `${this.projectName}-${module}`);
      await Promise.all([mkdir(path.join(root, "src/main/java", this.packagePath), { recursive: true }), mkdir(path.join(root, "src/main/resources"), { recursive: true }), mkdir(path.join(root, "src/test/java", this.packagePath), { recursive: true })]);
      console.log(`  ✓ ${this.projectName}-${module}`);
    }
    await mkdir(path.join(this.projectRoot, `${this.projectName}-adapter`, `${this.projectName}-web`, "src/main/java", this.packagePath, "rest"), { recursive: true });
    await mkdir(path.join(this.projectRoot, "db"), { recursive: true });
    console.log(`  ✓ ${this.projectName}-adapter/${this.projectName}-web\n  ✓ db`);
  }
  async generatePomFiles() {
    console.log("\n📝 生成 Maven POM 文件...");
    const pom = (name) => path.join(this.pomTemplateDir, name);
    const target = (module) => path.join(this.projectRoot, module, "pom.xml");
    await Promise.all([[pom("parent-pom.xml.template"), path.join(this.projectRoot, "pom.xml")], [pom("domain-pom.xml.template"), target(`${this.projectName}-domain`)], [pom("application-pom.xml.template"), target(`${this.projectName}-application`)], [pom("infrastructure-pom.xml.template"), target(`${this.projectName}-infrastructure`)], [pom("adapter-pom.xml.template"), target(`${this.projectName}-adapter`)], [pom("web-pom.xml.template"), target(path.join(`${this.projectName}-adapter`, `${this.projectName}-web`))], [pom("bootstrap-pom.xml.template"), target(`${this.projectName}-bootstrap`)]].map(([from, to]) => this.renderTemplate(from, to)));
    console.log("  ✓ 父级 pom.xml\n  ✓ domain pom.xml\n  ✓ application pom.xml\n  ✓ infrastructure pom.xml\n  ✓ adapter pom.xml\n  ✓ web pom.xml\n  ✓ bootstrap pom.xml");
  }
  async generateConfigFiles() {
    console.log("\n⚙️  生成配置文件..."); const base = path.join(this.projectRoot, `${this.projectName}-bootstrap`, "src/main/resources");
    await Promise.all([["application.yml.template", "application.yml"], ["logback-spring.xml.template", "logback-spring.xml"]].map(([from, to]) => this.renderTemplate(path.join(this.configTemplateDir, from), path.join(base, to))));
    console.log("  ✓ application.yml\n  ✓ logback-spring.xml");
  }
  generateDatabaseScripts() { console.log("\n🗃️  保留数据库目录布局...\n  ✓ db/（业务 schema 和初始化数据由批准切片合同生成）"); }
  async generateDocumentation() {
    console.log("\n📚 生成项目文档...");
    await writeText(path.join(this.projectRoot, "README.md"), this.render("# {{project_name}}\n\n## 模块说明\n\n- {{project_name}}-domain\n- {{project_name}}-application\n- {{project_name}}-infrastructure\n- {{project_name}}-adapter\n- {{project_name}}-bootstrap\n\n业务 API、领域模型、数据结构和权限行为必须在冻结的 Slice Implementation Contract 下，由对应 YSS skill 逐切片实现。\n\n## 快速开始\n\n```bash\ncd {{project_name}}\n./mvnw clean compile\n./mvnw spring-boot:run -pl {{project_name}}-bootstrap\n```\n"));
    console.log("  ✓ README.md");
  }
  async writeGenerationManifest() {
    const contract = this.scaffoldContract;
    const manifest = { schema_version: 1, contract_id: this.options.contractId, contract_version: this.options.contractVersion, approval_ref: this.options.approvalRef, router_draft_ref: this.options.routerDraftRef, persisted_ref: this.options.persistedRef, contract_file_ref: this.contractFile, slice_id: contract.slice_id, lifecycle_approval_ref: contract.lifecycle_approval_ref, current_version: contract.current_version, approver: contract.approval.approver, allowed_write_paths: contract.allowed_write_paths, expected_evidence_files: contract.expected_evidence_files, project_name: this.projectName, base_package: this.basePackage, database: this.options.database, generation_mode: "controlled-generation", force: this.options.force, overwrite_scope: this.options.overwriteScope, rollback_ref: this.options.rollbackRef, verification_commands: COMMANDS, generated_at: isoNow() };
    await writeText(path.join(this.projectRoot, ".yss", "scaffold-generation.json"), `${JSON.stringify(manifest, null, 2)}\n`); console.log("  ✓ .yss/scaffold-generation.json");
  }
  async copyWrapperFiles() {
    const wrapper = path.join(SKILL_ROOT, "assets", "wrapper");
    for (const file of ["mvnw", "mvnw.cmd"]) { const source = path.join(wrapper, file); if (await exists(source)) { const target = path.join(this.projectRoot, file); await mkdir(path.dirname(target), { recursive: true }); await copyFile(source, target); await chmod(target, (await stat(source)).mode); } }
    if (await exists(path.join(wrapper, ".mvn"))) await cp(path.join(wrapper, ".mvn"), path.join(this.projectRoot, ".mvn"), { recursive: true, force: true });
  }
  async validateGeneratedArtifacts() {
    const required = [path.join(this.projectRoot, "pom.xml"), path.join(this.projectRoot, `${this.projectName}-bootstrap`, "pom.xml"), path.join(this.projectRoot, "mvnw"), path.join(this.projectRoot, ".yss", "scaffold-generation.json")];
    const missing = []; for (const target of required) if (!await isFile(target)) missing.push(target); if (missing.length) fail(`生成产物缺失: ${missing.join(", ")}`);
    const manifest = await readJson(required[3], "脚手架生成元数据清单无法读取");
    if (manifest.contract_id !== this.options.contractId || manifest.contract_version !== this.options.contractVersion || manifest.current_version !== this.options.contractVersion || manifest.generation_mode !== "controlled-generation" || JSON.stringify(manifest.verification_commands) !== JSON.stringify(COMMANDS)) fail("脚手架生成元数据清单与当前批准合同或固定验证命令不一致");
    const stack = [this.projectRoot], binary = new Set([".class", ".db", ".jar", ".png", ".jpg", ".jpeg", ".gif"]);
    while (stack.length) { const dir = stack.pop(); for (const entry of await readdir(dir, { withFileTypes: true })) { const target = path.join(dir, entry.name); if (entry.isDirectory()) { stack.push(target); continue; } if (!entry.isFile() || binary.has(path.extname(entry.name))) continue; const content = await readFile(target, "utf8"); if (content.includes("{{") || content.includes("root/root")) fail(`生成文件包含未替换占位符或明文凭据: ${target}`); } }
  }
}

async function main() { let options; try { options = parseArgs(process.argv.slice(2)); if (options.help) { usage(); return 0; } await new ScaffoldGenerator(options).generate(); return 0; } catch (error) { process.stderr.write(`\n❌ 生成失败: ${error.message}\n`); return 1; } }
process.exitCode = await main();
