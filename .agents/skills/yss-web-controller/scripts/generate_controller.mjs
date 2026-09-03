#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TYPE_MAPPING = { bigint: "Long", int: "Integer", integer: "Integer", smallint: "Integer", tinyint: "Integer", number: "Long", numeric: "BigDecimal", decimal: "BigDecimal", float: "Float", double: "Double", real: "Float", varchar: "String", varchar2: "String", nvarchar2: "String", char: "String", nchar: "String", text: "String", clob: "String", nclob: "String", date: "LocalDateTime", datetime: "LocalDateTime", timestamp: "LocalDateTime", "timestamp with time zone": "LocalDateTime", boolean: "Boolean", bool: "Boolean", bit: "Boolean", json: "String", jsonb: "String", uuid: "String" };
const PLATFORM_VALIDATION_NAMESPACES = {
  "spring-boot-2.7-jdk8": "javax",
  "spring-boot-3-jdk17": "jakarta"
};
const required = ["metadata-file", "contract-file", "base-package", "module-name", "domain-segment"];
const valued = new Set([...required, "output-dir", "web-project-dir", "web-output-dir", "author", "application-service-package", "validation-namespace"]);

function usage() {
  return "Usage: node generate_controller.mjs --metadata-file FILE --contract-file FILE --base-package PACKAGE --module-name NAME --domain-segment SEGMENT [--output-dir DIR] [--web-project-dir DIR] [--web-output-dir DIR] [--author NAME] [--application-service-package PACKAGE] [--validation-namespace javax|jakarta]";
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

export async function generate(args, logger = console) {
  if (!await exists(args["metadata-file"])) throw new Error(`Metadata file not found: ${args["metadata-file"]}`);
  if (!await exists(args["contract-file"])) throw new Error(`Contract file not found: ${args["contract-file"]}`);
  let metadata;
  try { metadata = JSON.parse(await readFile(args["metadata-file"], "utf8")); } catch (error) { throw new Error(`Error reading metadata file: ${error.message}`); }
  let contract;
  try { contract = JSON.parse(await readFile(args["contract-file"], "utf8")); } catch (error) { throw new Error(`Error reading contract file: ${error.message}`); }
  if (contract.schema_version !== 1 || contract.status !== "approved") throw new Error("web generation contract must be schema_version=1 and approved");
  if (contract.architecture_profile !== "target-domain-model" || contract.dto_placement !== "web") throw new Error("web generation only supports target-domain-model with dto_placement=web");
  if (!contract.openapi_freeze_ref || !contract.fields || typeof contract.fields !== "object") throw new Error("approved web generation contract requires openapi_freeze_ref and fields");
  if (!contract.base_package || !contract.module_name || !contract.domain_segment) throw new Error("approved web generation contract requires base_package, module_name, and domain_segment");
  if (contract.base_package !== args["base-package"] || contract.module_name !== args["module-name"] || contract.domain_segment !== args["domain-segment"]) throw new Error("CLI generation identity does not match the approved web generation contract");
  if (!(contract.platform_profile in PLATFORM_VALIDATION_NAMESPACES)) throw new Error("unsupported platform_profile in approved web generation contract");
  if (PLATFORM_VALIDATION_NAMESPACES[contract.platform_profile] !== contract.validation_namespace) throw new Error("platform_profile and validation_namespace are inconsistent");
  if (contract.validation_namespace !== args["validation-namespace"]) throw new Error("--validation-namespace must match the approved web generation contract");
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
  const planned = [];
  const plan = (target, contents) => planned.push({ target, contents });
  for (const table of tables) {
    const domainClass = pascal(table.table_name); const domainVar = lowerCamel(table.table_name); const domainDesc = String(table.table_comment || domainClass).trim().replaceAll("\n", " ");
    const approvedFields = contract.fields[table.table_name];
    if (!approvedFields || ["create", "update", "query", "response"].some((name) => !Array.isArray(approvedFields[name]))) throw new Error(`approved web field contract is missing for table: ${table.table_name}`);
    const applicationPackage = args["application-service-package"] || `${args["base-package"]}.application.service`;
    const context = { base_package: args["base-package"], module_name: args["module-name"], domain_class: domainClass, domain_var: domainVar, domain_desc: domainDesc, domain_url_path: kebab(table.table_name), domain_pkg_name: args["domain-segment"], author: args.author, dto_imports: [`import ${args["base-package"]}.rest.dto.request.${domainClass}CreateRequest;`, `import ${args["base-package"]}.rest.dto.request.${domainClass}UpdateRequest;`, `import ${args["base-package"]}.rest.dto.request.${domainClass}PageRequest;`, `import ${args["base-package"]}.rest.dto.response.${domainClass}Response;`].join("\n"), application_type_imports: [`import ${args["base-package"]}.application.command.${domainClass}CreateCommand;`, `import ${args["base-package"]}.application.command.${domainClass}UpdateCommand;`, `import ${args["base-package"]}.application.query.${domainClass}PageQuery;`, `import ${args["base-package"]}.application.result.${domainClass}Result;`].join("\n"), application_service_import: `import ${applicationPackage}.${domainClass}Service;`, web_convertor_import: `import ${args["base-package"]}.rest.convertor.${domainClass}WebConvertor;`, web_convertor_class: `${domainClass}WebConvertor`, application_service_field: `private final ${domainClass}Service ${domainVar}Service;`, query_call: `${domainVar}Service.page(webConvertor.toPageQuery(request))`, detail_call: `${domainVar}Service.detail(id)`, add_call: `${domainVar}Service.add(webConvertor.toCreateCommand(request))`, update_call: `${domainVar}Service.update(webConvertor.toUpdateCommand(request))`, delete_call: `${domainVar}Service.delete(id)`, response_class: `${domainClass}Response`, create_request_class: `${domainClass}CreateRequest`, update_request_class: `${domainClass}UpdateRequest`, page_request_class: `${domainClass}PageRequest`, validation_namespace: args["validation-namespace"] };
    plan(path.join(webRoot, `${domainClass}Controller.java`), render(templates["Controller.java.template"], context));
    plan(path.join(webRoot, "convertor", `${domainClass}WebConvertor.java`), render(templates["WebConvertor.java.template"], context));
    for (const [templateName, target, declaration] of [["web/dto/Response.java.template", path.join(webRoot, "dto", "response", `${domainClass}Response.java`), fields(table.columns || [], approvedFields.response)], ["web/dto/CreateRequest.java.template", path.join(webRoot, "dto", "request", `${domainClass}CreateRequest.java`), fields(table.columns || [], approvedFields.create, { command: true })], ["web/dto/UpdateRequest.java.template", path.join(webRoot, "dto", "request", `${domainClass}UpdateRequest.java`), fields(table.columns || [], approvedFields.update, { command: true })], ["web/dto/PageRequest.java.template", path.join(webRoot, "dto", "request", `${domainClass}PageRequest.java`), fields(table.columns || [], approvedFields.query)]]) plan(target, render(templates[templateName], { ...context, field_declarations: declaration }));
  }
  const targets = planned.map(({ target }) => target);
  if (new Set(targets).size !== targets.length) throw new Error("approved metadata produces duplicate target files");
  const existing = [];
  for (const target of targets) if (await exists(target)) existing.push(target);
  if (existing.length) throw new Error(`initialize-only Web generation refuses existing targets: ${existing.join(", ")}`);
  for (const { target, contents } of planned) {
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents, "utf8");
    logger.log(`Generated: ${target}`);
  }
  return targets;
}
async function main() { try { const args = parseArgs(process.argv.slice(2)); if (args.help) { console.log(usage()); return; } await generate(args); } catch (error) { console.error(`Error: ${error.message}`); process.exitCode = 1; } }
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
