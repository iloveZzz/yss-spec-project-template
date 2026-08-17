#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TYPE_MAPPING = { bigint: "Long", int: "Integer", integer: "Integer", smallint: "Integer", tinyint: "Integer", number: "Long", numeric: "BigDecimal", decimal: "BigDecimal", float: "Float", double: "Double", real: "Float", varchar: "String", varchar2: "String", nvarchar2: "String", char: "String", nchar: "String", text: "String", clob: "String", nclob: "String", date: "LocalDateTime", datetime: "LocalDateTime", timestamp: "LocalDateTime", "timestamp with time zone": "LocalDateTime", boolean: "Boolean", bool: "Boolean", bit: "Boolean", json: "String", jsonb: "String", uuid: "String" };
const required = ["metadata-file", "base-package", "module-name", "domain-segment"];
const valued = new Set([...required, "output-dir", "domain-project-dir", "web-project-dir", "domain-output-dir", "web-output-dir", "author", "application-service-package", "validation-namespace"]);

function usage() {
  return "Usage: node generate_controller.mjs --metadata-file FILE --base-package PACKAGE --module-name NAME --domain-segment SEGMENT [--output-dir DIR] [--domain-project-dir DIR] [--web-project-dir DIR] [--domain-output-dir DIR] [--web-output-dir DIR] [--author NAME] [--force] [--application-service-package PACKAGE] [--validation-namespace javax|jakarta]";
}
export function parseArgs(argv) {
  const args = { "output-dir": "./output", author: "System", "validation-namespace": "javax", force: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") return { help: true };
    if (token === "--force") { args.force = true; continue; }
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

function fields(columns, { skipPk = false, command = false, skipAudit = true } = {}) {
  const audit = new Set(["create_time", "update_time", "create_by", "update_by", "deleted", "version"]);
  return columns.filter((column) => !(skipPk && column.primary) && !(skipAudit && audit.has(String(column.name).toLowerCase()))).map((column) => {
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
  let metadata;
  try { metadata = JSON.parse(await readFile(args["metadata-file"], "utf8")); } catch (error) { throw new Error(`Error reading metadata file: ${error.message}`); }
  const tables = metadata.tables || [];
  if (!tables.length) { logger.warn("Warning: No tables found in metadata."); return []; }
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const templatesDir = path.resolve(scriptDir, "../assets/templates");
  const template = async (name) => { const target = path.join(templatesDir, name); if (!await exists(target)) throw new Error(`Template not found: ${target}`); return readFile(target, "utf8"); };
  const templates = Object.fromEntries(await Promise.all(["Controller.java.template", "WebConvertor.java.template", "domain/vo/VO.java.template", "domain/dto/cmd/AddCmd.java.template", "domain/dto/cmd/UpdateCmd.java.template", "domain/dto/query/PageQuery.java.template"].map(async (name) => [name, await template(name)])));
  const basePath = packagePath(args["base-package"]);
  const domainBase = args["domain-output-dir"] || (args["domain-project-dir"] ? path.join(args["domain-project-dir"], "src", "main", "java", basePath) : path.join(args["output-dir"], basePath));
  const webBase = args["web-output-dir"] || (args["web-project-dir"] ? path.join(args["web-project-dir"], "src", "main", "java", basePath) : path.join(args["output-dir"], basePath));
  const domainRoot = ensureSubdir(domainBase, "client");
  const webRoot = ensureSubdir(webBase, "rest");
  const written = [];
  const write = async (target, contents) => { await mkdir(path.dirname(target), { recursive: true }); if (!await exists(target) || args.force) { await writeFile(target, contents, "utf8"); logger.log(`Generated: ${target}`); written.push(target); } else logger.log(`Skipped (exists): ${target}`); };
  for (const table of tables) {
    const domainClass = pascal(table.table_name); const domainVar = lowerCamel(table.table_name); const domainDesc = String(table.table_comment || domainClass).trim().replaceAll("\n", " ");
    const applicationPackage = args["application-service-package"] || `${args["base-package"]}.application.service`;
    const context = { base_package: args["base-package"], module_name: args["module-name"], domain_class: domainClass, domain_var: domainVar, domain_desc: domainDesc, domain_url_path: kebab(table.table_name), domain_pkg_name: args["domain-segment"], author: args.author, dto_imports: [`import ${args["base-package"]}.client.dto.cmd.${domainClass}AddCmd;`, `import ${args["base-package"]}.client.dto.cmd.${domainClass}UpdateCmd;`, `import ${args["base-package"]}.client.dto.query.${domainClass}PageQuery;`, `import ${args["base-package"]}.client.vo.${domainClass}VO;`].join("\n"), application_service_import: `import ${applicationPackage}.${domainClass}Service;`, domain_import: `import ${args["base-package"]}.domain.${args["domain-segment"]}.model.${domainClass};`, web_convertor_import: `import ${args["base-package"]}.rest.convertor.${domainClass}WebConvertor;`, web_convertor_class: `${domainClass}WebConvertor`, application_service_field: `private final ${domainClass}Service ${domainVar}Service;`, query_call: `${domainVar}Service.page(query)`, detail_call: `${domainVar}Service.detail(id)`, add_call: `${domainVar}Service.add(cmd)`, update_call: `${domainVar}Service.update(cmd)`, delete_call: `${domainVar}Service.delete(id)`, vo_class: `${domainClass}VO`, add_cmd_class: `${domainClass}AddCmd`, update_cmd_class: `${domainClass}UpdateCmd`, query_class: `${domainClass}PageQuery`, validation_namespace: args["validation-namespace"] };
    await write(path.join(webRoot, `${domainClass}Controller.java`), render(templates["Controller.java.template"], context));
    await write(path.join(webRoot, "convertor", `${domainClass}WebConvertor.java`), render(templates["WebConvertor.java.template"], context));
    for (const [templateName, target, declaration] of [["domain/vo/VO.java.template", path.join(domainRoot, "vo", `${domainClass}VO.java`), fields(table.columns || [], { skipAudit: false })], ["domain/dto/cmd/AddCmd.java.template", path.join(domainRoot, "dto/cmd", `${domainClass}AddCmd.java`), fields(table.columns || [], { skipPk: true, command: true })], ["domain/dto/cmd/UpdateCmd.java.template", path.join(domainRoot, "dto/cmd", `${domainClass}UpdateCmd.java`), fields(table.columns || [], { command: true })], ["domain/dto/query/PageQuery.java.template", path.join(domainRoot, "dto/query", `${domainClass}PageQuery.java`), fields(table.columns || [])]]) await write(target, render(templates[templateName], { ...context, field_declarations: declaration }));
  }
  return written;
}
async function main() { try { const args = parseArgs(process.argv.slice(2)); if (args.help) { console.log(usage()); return; } await generate(args); } catch (error) { console.error(`Error: ${error.message}`); process.exitCode = 1; } }
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
