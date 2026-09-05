#!/usr/bin/env node
import { createHash } from "node:crypto";
import { constants, access, copyFile, mkdir, mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseDocument } from "../../../../scripts/vendor/yaml.mjs";
import { assertArchitectureAgreement, validateArchitectureIdentity } from "../../../../scripts/lib/backend-architecture.mjs";

const TYPE_MAPPING = { bigint: "Long", int: "Integer", integer: "Integer", smallint: "Integer", tinyint: "Integer", number: "Long", numeric: "BigDecimal", decimal: "BigDecimal", float: "Float", double: "Double", real: "Float", varchar: "String", varchar2: "String", nvarchar2: "String", char: "String", nchar: "String", text: "String", clob: "String", nclob: "String", date: "LocalDateTime", datetime: "LocalDateTime", timestamp: "LocalDateTime", "timestamp with time zone": "LocalDateTime", boolean: "Boolean", bool: "Boolean", bit: "Boolean", json: "String", jsonb: "String", uuid: "String" };
const PLATFORM_VALIDATION_NAMESPACES = {
  "spring-boot-2.7-jdk8": "javax",
  "spring-boot-3-jdk17": "jakarta"
};
const required = ["metadata-file", "contract-file", "dto-wire-profile-file", "base-package", "module-name", "domain-segment"];
const valued = new Set([...required, "output-dir", "web-project-dir", "web-output-dir", "author", "application-service-package", "validation-namespace", "scaffold-manifest-file"]);

function usage() {
  return "Usage: node generate_controller.mjs --metadata-file FILE --contract-file FILE --dto-wire-profile-file FILE --base-package PACKAGE --module-name NAME --domain-segment SEGMENT [--output-dir DIR] [--web-project-dir DIR] [--web-output-dir DIR] [--scaffold-manifest-file FILE] [--author NAME] [--application-service-package PACKAGE] [--validation-namespace javax|jakarta]";
}
export function parseArgs(argv) {
  const args = { "output-dir": "./output", author: "System", "validation-namespace": "javax", force: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") return { help: true };
    if (token === "--force") throw new Error("unsupported: initialize-only Web 生成禁止 --force、已有目标覆盖和旧项目迁移");
    if (!token.startsWith("--") || !valued.has(token.slice(2))) throw new Error(`unrecognized argument: ${token}`);
    const value = argv[++index];
    if (!value || value.startsWith("--")) throw new Error(`argument ${token} requires a value`);
    args[token.slice(2)] = value;
  }
  for (const key of required) if (!args[key]) throw new Error(`the following arguments are required: --${key}`);
  if (!new Set(["javax", "jakarta"]).has(args["validation-namespace"])) throw new Error("--validation-namespace must be javax or jakarta");
  return args;
}
const pascal = (value) => value.toLowerCase().split("_").map((part) => part ? part[0].toUpperCase() + part.slice(1) : "").join("");
const lowerCamel = (value) => { const output = pascal(value); return output ? output[0].toLowerCase() + output.slice(1) : ""; };
const kebab = (value) => value.toLowerCase().replaceAll("_", "-");
const packagePath = (value) => value.replaceAll(".", path.sep);
const ensureSubdir = (root, name) => path.basename(path.normalize(root)) === name ? root : path.join(root, name);
const javaType = (sqlType = "") => TYPE_MAPPING[sqlType.toLowerCase().split("(")[0]] || "String";

function fields(columns, selected, { command = false } = {}) {
  const byName = new Map(columns.map((column) => [String(column.name), column]));
  return selected.map((field) => {
    const column = byName.get(field);
    if (!column) throw new Error(`approved field is absent from metadata: ${field}`);
    const type = javaType(column.sql_type);
    const name = lowerCamel(column.name);
    const comment = column.comment || "";
    const documentation = comment ? `    /**\n     * ${comment}\n     */\n` : "";
    const validation = command && !column.nullable ? `    @${type === "String" ? "NotBlank" : "NotNull"}(message = \"${comment || name}不能为空\")\n` : "";
    return `${documentation}${validation}    private ${type} ${name};`;
  }).join("\n\n");
}
function render(template, context) { return template.replace(/\$(?:\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))/g, (_, braced, plain) => { const key = braced || plain; if (!(key in context)) throw new Error(`missing template field: ${key}`); return context[key]; }); }
async function exists(target) { try { await access(target); return true; } catch { return false; } }
const present = (value) => value !== undefined && value !== null && value !== "";
function within(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
function simpleJavaName(javaType) {
  return javaType.replace(/<.*$/, "").split(".").at(-1);
}
function paginationFields(selected, dtoProfile) {
  const definitions = dtoProfile.page_query.fields;
  const unique = [...new Set(selected)];
  const unsupported = unique.filter((name) => !(name in definitions) || dtoProfile.page_query.forbidden_client_fields.includes(name));
  if (unsupported.length) throw new Error(`unsupported pagination fields: ${unsupported.join(", ")}`);
  return unique.map((name) => {
    const definition = definitions[name];
    const wireType = definition.wire_types.find((item) => item !== "null");
    const javaType = wireType === "integer" ? (definition.nullable ? "Integer" : "int") : wireType === "string" ? "String" : null;
    if (!javaType) throw new Error(`unsupported yss-dto pagination wire type for ${name}: ${definition.wire_types.join(", ")}`);
    const annotation = definition.enum?.length
      ? `    @Pattern(regexp = "${definition.enum.join("|")}", message = "${name} must be one of ${definition.enum.join(", ")}")\n`
      : "";
    const initializer = definition.default === undefined ? "" : ` = ${typeof definition.default === "string" ? JSON.stringify(definition.default) : definition.default}`;
    return `${annotation}    private ${javaType} ${name}${initializer};`;
  }).join("\n");
}

async function loadDtoWireProfile(contract, args) {
  const profilePath = path.resolve(args["dto-wire-profile-file"]);
  if (profilePath !== path.resolve(contract.dto_wire_profile_ref ?? "")) throw new Error("--dto-wire-profile-file does not match the approved Web generation contract");
  if (!await exists(profilePath)) throw new Error(`yss-dto wire profile not found: ${profilePath}`);
  const source = await readFile(profilePath);
  const digest = createHash("sha256").update(source).digest("hex");
  if (digest !== contract.dto_wire_profile_digest) throw new Error("yss-dto wire profile digest does not match the approved Web generation contract");
  const document = parseDocument(source.toString("utf8"), { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length) throw new Error(`invalid yss-dto wire profile: ${document.errors[0].message}`);
  const profile = document.toJS({ maxAliasCount: 0 });
  if (profile?.schema_version !== 1 || profile?.kind !== "yss-dto-openapi-wire-profile") throw new Error("unsupported yss-dto wire profile");
  const resultPackage = profile.canonical?.java_package;
  const pageResult = profile.wrappers?.PageResult;
  const singleResult = profile.wrappers?.SingleResult;
  const commandDtoType = profile.request_bases?.command?.java_type;
  const queryDtoType = profile.request_bases?.query?.java_type;
  if (![resultPackage, pageResult?.java_type, singleResult?.java_type, commandDtoType, queryDtoType].every(present)) throw new Error("incomplete yss-dto wire profile type mapping");
  if (![pageResult.java_type, singleResult.java_type].every((type) => type.startsWith(`${resultPackage}.`))) throw new Error("yss-dto result wrapper package is inconsistent");
  if (!profile.page_query?.fields || !Array.isArray(profile.page_query?.forbidden_client_fields)) throw new Error("incomplete yss-dto page_query mapping");
  const factory = pageResult.java_factory;
  const singleFactory = singleResult.java_factory;
  const javaIdentifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
  if (!javaIdentifier.test(factory?.method ?? "") || !Array.isArray(factory.arguments) || !factory.arguments.length) throw new Error("incomplete yss-dto PageResult factory mapping");
  if (!javaIdentifier.test(singleFactory?.method ?? "") || JSON.stringify(singleFactory.arguments) !== JSON.stringify(["data"])) throw new Error("incomplete yss-dto SingleResult factory mapping");
  const expressionByArgument = { data: "toResponses(source.getData())", totalCount: "source.getTotalCount()", pageSize: "source.getPageSize()", pageIndex: "source.getPageIndex()" };
  const unsupportedArguments = factory.arguments.filter((name) => !(name in expressionByArgument));
  if (unsupportedArguments.length) throw new Error(`unsupported yss-dto PageResult factory arguments: ${unsupportedArguments.join(", ")}`);
  return {
    profile,
    resultPackage,
    pageResultType: pageResult.java_type.replace(/<.*$/, ""),
    singleResultType: singleResult.java_type.replace(/<.*$/, ""),
    pageResultFactoryMethod: factory.method,
    singleResultFactoryMethod: singleFactory.method,
    commandDtoType,
    queryDtoType,
    pageResultFactoryArguments: factory.arguments.map((name, index) => `                ${expressionByArgument[name]}${index < factory.arguments.length - 1 ? "," : ""}`).join("\n")
  };
}

async function validateContract(contract, args) {
  if (contract.schema_version !== 2) throw new Error(`web generation contract schema_version=${contract.schema_version} is unsupported; only schema_version=2 is accepted`);
  if (contract.status !== "approved") throw new Error("web generation contract must be approved");
  const requiredFields = ["contract_id", "contract_version", "current_version", "slice_id", "integration_mode", "implementation_project_root", "base_package", "module_name", "domain_segment", "application_service_package", "architecture_profile", "platform_profile", "validation_namespace", "dto_placement", "dto_wire_profile_ref", "dto_wire_profile_digest", "openapi_freeze_ref", "fields", "allowed_write_paths", "expected_evidence_files", "verification_commands"];
  const missing = requiredFields.filter((name) => !present(contract[name]));
  if (missing.length) throw new Error(`approved web generation contract is incomplete: ${missing.join(", ")}`);
  if (contract.current_version !== contract.contract_version) throw new Error("web generation contract is not the current approved version");
  if (!Number.isInteger(contract.contract_version) || contract.contract_version < 1) throw new Error("web generation contract_version must be a positive integer");
  if (!["existing-project", "scaffold-v2"].includes(contract.integration_mode)) throw new Error("unsupported web generation integration_mode");
  if (!["allowed_write_paths", "expected_evidence_files", "verification_commands"].every((name) => Array.isArray(contract[name]) && contract[name].length)) throw new Error("web generation contract requires non-empty allowed_write_paths, expected_evidence_files, and verification_commands");
  const mvc = contract.architecture_profile !== "target-domain-model";
  const applicationModule = { "target-domain-model": "application", "layered-mvc-service": "service", "mvc-data-analysis-v1": "core" }[contract.architecture_profile];
  if (!applicationModule) throw new Error("unsupported architecture_profile");
  const allowedDto = { "target-domain-model": ["web"], "layered-mvc-service": ["server", "client"], "mvc-data-analysis-v1": ["client"] }[contract.architecture_profile];
  if (!allowedDto.includes(contract.dto_placement)) throw new Error("dto_placement does not match architecture_profile");
  if (mvc) validateArchitectureIdentity(contract.architecture_identity);
  if (contract.base_package !== args["base-package"] || contract.module_name !== args["module-name"] || contract.domain_segment !== args["domain-segment"]) throw new Error("CLI generation identity does not match the approved web generation contract");
  const applicationPackage = args["application-service-package"] || `${args["base-package"]}.${applicationModule}.service`;
  if (mvc && !applicationPackage.startsWith(`${args["base-package"]}.${applicationModule}.`)) throw new Error("MVC service interface must belong to its application module");
  if (contract.application_service_package !== applicationPackage) throw new Error("--application-service-package does not match the approved web generation contract");
  if (!(contract.platform_profile in PLATFORM_VALIDATION_NAMESPACES)) throw new Error("unsupported platform_profile in approved web generation contract");
  if (PLATFORM_VALIDATION_NAMESPACES[contract.platform_profile] !== contract.validation_namespace) throw new Error("platform_profile and validation_namespace are inconsistent");
  if (contract.validation_namespace !== args["validation-namespace"]) throw new Error("--validation-namespace must match the approved web generation contract");

  const implementationRoot = path.resolve(contract.implementation_project_root);
  if (contract.integration_mode === "existing-project") {
    if (args["scaffold-manifest-file"] || present(contract.scaffold_manifest_ref)) throw new Error("existing-project Web generation must not claim a scaffold manifest");
    if (mvc) throw new Error("existing MVC project requires explicit onboarding support; no automatic migration");
    return { applicationPackage, implementationRoot, applicationModule };
  }

  if (!args["scaffold-manifest-file"] || !present(contract.scaffold_manifest_ref)) throw new Error("scaffold-v2 Web generation requires --scaffold-manifest-file and scaffold_manifest_ref");
  const manifestPath = path.resolve(args["scaffold-manifest-file"]);
  if (manifestPath !== path.resolve(contract.scaffold_manifest_ref)) throw new Error("--scaffold-manifest-file does not match the approved web generation contract");
  if (!await exists(manifestPath)) throw new Error(`scaffold manifest not found: ${manifestPath}`);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (![2, 3].includes(manifest.schema_version)) throw new Error("scaffold manifest must use historical schema_version=2 or current schema_version=3");
  if (mvc && manifest.schema_version !== 3) throw new Error("MVC requires schema v3 scaffold identity");
  if (manifest.architecture_identity || mvc) {
    assertArchitectureAgreement(contract.architecture_identity, { manifest });
    if (contract.architecture_identity.architecture_profile !== contract.architecture_profile) throw new Error("Web architecture profile differs from its identity");
  } else if (manifest.schema_version === 3 && (manifest.architecture_family !== "domain-driven" || manifest.generator_skill !== "yss-ddd-scaffold-generator")) throw new Error("schema v3 scaffold manifest must bind the domain-driven generator for Web adapter generation");
  if (!["empty-scaffold-verified", "first-slice-verified"].includes(manifest.completion_level)) throw new Error("scaffold manifest must be empty-scaffold-verified before Web generation");
  const scaffoldRoot = path.dirname(path.dirname(manifestPath));
  if (implementationRoot !== scaffoldRoot) throw new Error("implementation_project_root does not match the scaffold manifest project root");
  const expectedWebProject = mvc ? path.join(scaffoldRoot, `${manifest.project_name}-server`) : path.join(scaffoldRoot, `${manifest.project_name}-adapter`, `${manifest.project_name}-web`);
  if (!args["web-project-dir"] || path.resolve(args["web-project-dir"]) !== expectedWebProject) throw new Error("--web-project-dir does not match the scaffold manifest project layout");
  const profilePairs = mvc ? [["platform", "platform_profile"], ["validation_namespace", "validation_namespace"]] : [["architecture", "architecture_profile"], ["platform", "platform_profile"], ["validation_namespace", "validation_namespace"], ["dto_placement", "dto_placement"]];
  for (const [manifestField, contractField] of profilePairs) {
    if (manifest.profiles?.[manifestField] !== contract[contractField]) throw new Error(`scaffold manifest ${manifestField} profile does not match the approved Web contract`);
  }
  if (manifest.base_package !== contract.base_package) throw new Error("scaffold manifest base_package does not match the approved Web contract");
  const dtoProject = contract.dto_placement === "client" ? path.join(scaffoldRoot, `${manifest.project_name}-client`) : expectedWebProject;
  if (contract.dto_placement === "client" && !contract.architecture_identity.resolved_modules.includes("client")) throw new Error("client DTO requires approved client capability");
  if (args["web-output-dir"] && path.resolve(args["web-output-dir"]) !== path.join(expectedWebProject, "src/main/java", packagePath(args["base-package"]))) throw new Error("web-output-dir must not override approved module ownership");
  return { applicationPackage, implementationRoot, applicationModule, dtoProject };
}

export async function generate(args, logger = console) {
  if (!await exists(args["metadata-file"])) throw new Error(`Metadata file not found: ${args["metadata-file"]}`);
  if (!await exists(args["contract-file"])) throw new Error(`Contract file not found: ${args["contract-file"]}`);
  let metadata;
  try { metadata = JSON.parse(await readFile(args["metadata-file"], "utf8")); } catch (error) { throw new Error(`Error reading metadata file: ${error.message}`); }
  let contract;
  try { contract = JSON.parse(await readFile(args["contract-file"], "utf8")); } catch (error) { throw new Error(`Error reading contract file: ${error.message}`); }
  const { applicationPackage, implementationRoot, applicationModule, dtoProject } = await validateContract(contract, args);
  const dto = await loadDtoWireProfile(contract, args);
  const tables = metadata.tables || [];
  if (!tables.length) { logger.warn("Warning: No tables found in metadata."); return []; }
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const templatesDir = path.resolve(scriptDir, "../assets/templates");
  const template = async (name) => { const target = path.join(templatesDir, name); if (!await exists(target)) throw new Error(`Template not found: ${target}`); return readFile(target, "utf8"); };
  const templateNames = ["Controller.java.template", "WebConvertor.java.template", "web/dto/Response.java.template", "web/dto/CreateRequest.java.template", "web/dto/UpdateRequest.java.template", "web/dto/PageRequest.java.template"];
  const templates = Object.fromEntries(await Promise.all(templateNames.map(async (name) => [name, await template(name)])));
  const basePath = packagePath(args["base-package"]);
  const webBase = args["web-output-dir"] || (args["web-project-dir"] ? path.join(args["web-project-dir"], "src", "main", "java", basePath) : path.join(args["output-dir"], basePath));
  const webRoot = ensureSubdir(webBase, "rest");
  const dtoRoot = dtoProject ? path.join(dtoProject, "src/main/java", basePath, "rest") : webRoot;
  const planned = [];
  const plan = (target, contents) => planned.push({ target, contents });
  for (const table of tables) {
    const domainClass = pascal(table.table_name); const domainVar = lowerCamel(table.table_name); const domainDesc = String(table.table_comment || domainClass).trim().replaceAll("\n", " ");
    const approvedFields = contract.fields[table.table_name];
    if (!approvedFields || ["create", "update", "query", "pagination", "response"].some((name) => !Array.isArray(approvedFields[name]))) throw new Error(`approved web field contract is missing create/update/query/pagination/response allowlists for table: ${table.table_name}`);
    const context = { base_package: args["base-package"], module_name: args["module-name"], domain_class: domainClass, domain_var: domainVar, domain_desc: domainDesc, domain_url_path: kebab(table.table_name), domain_pkg_name: args["domain-segment"], author: args.author, dto_imports: [`import ${args["base-package"]}.rest.dto.request.${domainClass}CreateRequest;`, `import ${args["base-package"]}.rest.dto.request.${domainClass}UpdateRequest;`, `import ${args["base-package"]}.rest.dto.request.${domainClass}PageRequest;`, `import ${args["base-package"]}.rest.dto.response.${domainClass}Response;`].join("\n"), application_type_imports: [`import ${args["base-package"]}.${applicationModule}.command.${domainClass}CreateCommand;`, `import ${args["base-package"]}.${applicationModule}.command.${domainClass}UpdateCommand;`, `import ${args["base-package"]}.${applicationModule}.query.${domainClass}PageQuery;`, `import ${args["base-package"]}.${applicationModule}.result.${domainClass}Result;`].join("\n"), application_service_import: `import ${applicationPackage}.${domainClass}Service;`, web_convertor_import: `import ${args["base-package"]}.rest.convertor.${domainClass}WebConvertor;`, web_convertor_class: `${domainClass}WebConvertor`, application_service_field: `private final ${domainClass}Service ${domainVar}Service;`, query_call: `${domainVar}Service.page(webConvertor.toPageQuery(request))`, detail_call: `${domainVar}Service.detail(id)`, add_call: `${domainVar}Service.add(webConvertor.toCreateCommand(request))`, update_call: `${domainVar}Service.update(webConvertor.toUpdateCommand(request))`, delete_call: `${domainVar}Service.delete(id)`, response_class: `${domainClass}Response`, create_request_class: `${domainClass}CreateRequest`, update_request_class: `${domainClass}UpdateRequest`, page_request_class: `${domainClass}PageRequest`, validation_namespace: args["validation-namespace"], result_package: dto.resultPackage, page_result_type: dto.pageResultType, page_result_simple_name: simpleJavaName(dto.pageResultType), page_result_factory_method: dto.pageResultFactoryMethod, single_result_type: dto.singleResultType, single_result_simple_name: simpleJavaName(dto.singleResultType), single_result_factory_method: dto.singleResultFactoryMethod, command_dto_type: dto.commandDtoType, command_dto_simple_name: simpleJavaName(dto.commandDtoType), query_dto_type: dto.queryDtoType, query_dto_simple_name: simpleJavaName(dto.queryDtoType), page_result_factory_arguments: dto.pageResultFactoryArguments };
    plan(path.join(webRoot, `${domainClass}Controller.java`), render(templates["Controller.java.template"], context));
    plan(path.join(webRoot, "convertor", `${domainClass}WebConvertor.java`), render(templates["WebConvertor.java.template"], context));
    for (const [templateName, target, declaration] of [["web/dto/Response.java.template", path.join(dtoRoot, "dto", "response", `${domainClass}Response.java`), fields(table.columns || [], approvedFields.response)], ["web/dto/CreateRequest.java.template", path.join(dtoRoot, "dto", "request", `${domainClass}CreateRequest.java`), fields(table.columns || [], approvedFields.create, { command: true })], ["web/dto/UpdateRequest.java.template", path.join(dtoRoot, "dto", "request", `${domainClass}UpdateRequest.java`), fields(table.columns || [], approvedFields.update, { command: true })], ["web/dto/PageRequest.java.template", path.join(dtoRoot, "dto", "request", `${domainClass}PageRequest.java`), fields(table.columns || [], approvedFields.query)]]) plan(target, render(templates[templateName], { ...context, field_declarations: declaration, pagination_field_declarations: paginationFields(approvedFields.pagination, dto.profile) }));
  }
  const targets = planned.map(({ target }) => target);
  if (new Set(targets).size !== targets.length) throw new Error("approved metadata produces duplicate target files");
  const existing = [];
  for (const target of targets) if (await exists(target)) existing.push(target);
  if (existing.length) throw new Error(`initialize-only Web generation refuses existing targets: ${existing.join(", ")}`);
  const allowedRoots = contract.allowed_write_paths.map((item) => path.resolve(implementationRoot, String(item)));
  const outside = targets.filter((target) => !allowedRoots.some((root) => within(root, target)));
  if (outside.length) throw new Error(`planned Web targets are outside allowed_write_paths: ${outside.join(", ")}`);
  const staging = await mkdtemp(path.join(tmpdir(), "yss-web-generation-"));
  const created = [];
  try {
    for (const [index, { contents }] of planned.entries()) await writeFile(path.join(staging, String(index)), contents, "utf8");
    for (const [index, { target }] of planned.entries()) {
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(path.join(staging, String(index)), target, constants.COPYFILE_EXCL);
      created.push(target);
      logger.log(`Generated: ${target}`);
    }
  } catch (error) {
    for (const target of created.reverse()) {
      try { await unlink(target); } catch (cleanupError) { if (cleanupError.code !== "ENOENT") error.cleanupError = cleanupError.message; }
    }
    throw error;
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  return targets;
}
async function main() { try { const args = parseArgs(process.argv.slice(2)); if (args.help) { console.log(usage()); return; } await generate(args); } catch (error) { console.error(`Error: ${error.message}`); process.exitCode = 1; } }
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
