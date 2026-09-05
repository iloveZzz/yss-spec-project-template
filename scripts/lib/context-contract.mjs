import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const CONTEXT_FILE = "CONTEXT.md";
const CONTEXT_MAP_FILE = "CONTEXT-MAP.md";
const PASCAL_CASE = /^[A-Z][A-Za-z0-9]+$/;
const TERM_REF = /^(Global|[A-Z][A-Za-z0-9]+)\/([A-Z][A-Za-z0-9]+)$/;
const SKIP_DIRECTORIES = new Set([".git", ".codegraph", ".template-source", "node_modules", "dist", "build"]);

function fail(messages, code = "context-contract-invalid") {
  const error = new TypeError(messages.join("；"));
  error.code = code;
  error.problems = messages;
  throw error;
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function normalizedSource(source) {
  return source.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").replace(/\n*$/, "\n");
}

function collectContextFiles(root) {
  const found = [];
  function visit(directory, relative = "") {
    if (relative && existsSync(path.join(directory, ".git"))) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const entryRelative = relative ? `${relative}/${entry.name}` : entry.name;
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRECTORIES.has(entry.name)) visit(entryPath, entryRelative);
        continue;
      }
      if (entry.isFile() && [CONTEXT_FILE, CONTEXT_MAP_FILE, "context.md"].includes(entry.name)) found.push(entryRelative);
    }
  }
  visit(root);
  return found;
}

function splitRow(line) {
  const value = line.trim();
  if (!value.startsWith("|") || !value.endsWith("|")) return null;
  return value.slice(1, -1).split("|").map((cell) => cell.trim());
}

function tableAfterHeading(lines, heading, expectedHeaders, problems) {
  const headerVariants = Array.isArray(expectedHeaders[0]) ? expectedHeaders : [expectedHeaders];
  const primaryHeaders = headerVariants[0];
  const headingIndex = lines.findIndex((line) => line.trim() === heading);
  if (headingIndex < 0) {
    problems.push(`缺少 ${heading}`);
    return [];
  }
  let headerIndex = headingIndex + 1;
  while (headerIndex < lines.length && !lines[headerIndex].trim().startsWith("|") && !lines[headerIndex].trim().startsWith("## ")) headerIndex += 1;
  const headers = splitRow(lines[headerIndex] || "");
  if (!headerVariants.some((candidate) => JSON.stringify(headers) === JSON.stringify(candidate))) {
    problems.push(`${heading} 表头必须是 ${headerVariants.map((candidate) => candidate.join(" | ")).join("；兼容旧项目时也接受 ")}`);
    return [];
  }
  const separator = splitRow(lines[headerIndex + 1] || "");
  if (!separator || separator.length !== primaryHeaders.length || separator.some((cell) => !/^:?-{3,}:?$/.test(cell))) {
    problems.push(`${heading} 缺少合法 Markdown 表格分隔行`);
    return [];
  }
  const rows = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const row = splitRow(lines[index]);
    if (!row) break;
    if (row.length !== primaryHeaders.length) {
      problems.push(`${heading} 第 ${index + 1} 行列数应为 ${primaryHeaders.length}`);
      continue;
    }
    rows.push({ line: index + 1, cells: row });
  }
  return rows;
}

function parseForbiddenAliases(value) {
  const match = value.match(/(?:^|；)\s*避免[：:]\s*([^；]+)/);
  if (!match) return [];
  return match[1].split(/[、,，]/).map((item) => item.trim().replace(/^`|`$/g, "")).filter(Boolean);
}

function canonicalTerm(term) {
  return {
    term_ref: term.term_ref,
    term: term.term,
    meaning: term.meaning,
    english_identifier: term.english_identifier,
    context_id: term.context_id,
    forbidden_aliases: [...term.forbidden_aliases].sort(),
  };
}

export function parseContextContract({ root = process.cwd(), allowedContextIds } = {}) {
  const absoluteRoot = path.resolve(root);
  const contextPath = path.join(absoluteRoot, CONTEXT_FILE);
  const problems = [];
  const discovered = collectContextFiles(absoluteRoot);
  if (!existsSync(contextPath) || !lstatSync(contextPath).isFile()) problems.push(`项目根目录缺少大小写精确的 ${CONTEXT_FILE}`);
  const nested = discovered.filter((entry) => entry.endsWith(`/${CONTEXT_FILE}`));
  if (nested.length) problems.push(`只允许项目根目录的 ${CONTEXT_FILE}，发现嵌套文件: ${nested.join(", ")}`);
  const contextMaps = discovered.filter((entry) => entry === CONTEXT_MAP_FILE || entry.endsWith(`/${CONTEXT_MAP_FILE}`));
  if (contextMaps.length) problems.push(`${CONTEXT_MAP_FILE} 在 YSS Context Contract 中禁止使用: ${contextMaps.join(", ")}`);
  if (discovered.includes("context.md")) problems.push(`文件名大小写错误：必须使用根目录 ${CONTEXT_FILE}`);
  if (problems.length || !existsSync(contextPath)) fail(problems);

  return parseContextSource(readFileSync(contextPath, "utf8"), { allowedContextIds });
}

export function parseContextSource(text, { allowedContextIds } = {}) {
  const problems = [];
  const source = normalizedSource(text);
  if (!/^---\ncontext_schema_version:\s*1\n---\n/.test(source)) problems.push("CONTEXT.md 顶部必须声明 context_schema_version: 1");
  const lines = source.split("\n");
  const processRows = tableAfterHeading(lines, "## 流程术语", ["术语", "含义", "英文标识", "避免 / 备注"], problems);
  const businessRows = tableAfterHeading(lines, "## 业务术语", [
    ["术语", "含义", "英文标识", "适用业务责任区", "避免 / 备注"],
    ["术语", "含义", "英文标识", "适用限界上下文", "避免 / 备注"],
  ], problems);

  for (const row of processRows) {
    if (row.cells.some((cell, index) => index < 3 && !cell)) problems.push(`流程术语第 ${row.line} 行存在空必填列`);
    if (row.cells[2] !== "—") problems.push(`流程术语第 ${row.line} 行英文标识必须为 —`);
  }

  const terms = [];
  const identities = new Map();
  const scopedNames = new Map();
  const scopedAliases = new Map();
  const allowed = allowedContextIds ? new Set(allowedContextIds) : null;
  for (const row of businessRows) {
    const [term, meaning, englishIdentifier, contextId, notes] = row.cells;
    if (![term, meaning, englishIdentifier, contextId].every(Boolean)) {
      problems.push(`业务术语第 ${row.line} 行存在空必填列`);
      continue;
    }
    if (!PASCAL_CASE.test(englishIdentifier)) problems.push(`业务术语第 ${row.line} 行英文标识必须是 PascalCase`);
    if (contextId !== "Global" && !PASCAL_CASE.test(contextId)) problems.push(`业务术语第 ${row.line} 行适用业务责任区格式非法`);
    if (allowed && contextId !== "Global" && !allowed.has(contextId)) problems.push(`业务术语 ${contextId}/${englishIdentifier} 的业务责任区未在业务边界与规则设计中登记`);
    const termRef = `${contextId}/${englishIdentifier}`;
    if (identities.has(termRef)) problems.push(`术语身份重复: ${termRef}`);
    const scopedName = `${contextId}/${term}`;
    if (scopedNames.has(scopedName)) problems.push(`同一作用域中文术语重复: ${scopedName}`);
    const forbiddenAliases = parseForbiddenAliases(notes);
    const aliasSet = scopedAliases.get(contextId) || new Set();
    for (const alias of forbiddenAliases) {
      if (aliasSet.has(alias) || scopedNames.has(`${contextId}/${alias}`)) problems.push(`同一作用域禁用别名冲突: ${contextId}/${alias}`);
      aliasSet.add(alias);
    }
    scopedAliases.set(contextId, aliasSet);
    const parsed = { term_ref: termRef, term, meaning, english_identifier: englishIdentifier, context_id: contextId, forbidden_aliases: forbiddenAliases, notes, line: row.line };
    identities.set(termRef, parsed);
    scopedNames.set(scopedName, parsed);
    terms.push(parsed);
  }

  const globalTerms = terms.filter((term) => term.context_id === "Global");
  for (const globalTerm of globalTerms) {
    for (const localTerm of terms.filter((term) => term.context_id !== "Global")) {
      if (globalTerm.term === localTerm.term || globalTerm.english_identifier === localTerm.english_identifier) problems.push(`Global 术语不得被局部上下文重新定义: ${globalTerm.term_ref} / ${localTerm.term_ref}`);
    }
  }
  if (problems.length) fail(problems);
  return { context_ref: CONTEXT_FILE, context_schema_version: 1, document_digest: sha256(source), process_terms: processRows.length, business_terms: terms, terms_by_ref: identities };
}

export function resolveContextTermRefs(contract, termRefs = []) {
  const problems = [];
  const resolved = [];
  for (const termRef of termRefs) {
    if (typeof termRef !== "string" || !TERM_REF.test(termRef)) {
      problems.push(`术语引用格式非法: ${String(termRef)}；必须使用 <ContextId>/<EnglishIdentifier>`);
      continue;
    }
    const term = contract.terms_by_ref.get(termRef);
    if (!term) problems.push(`术语引用无法解析: ${termRef}`);
    else resolved.push(term);
  }
  if (problems.length) fail(problems, "context-reference-invalid");
  const canonical = resolved.map(canonicalTerm).sort((left, right) => left.term_ref.localeCompare(right.term_ref));
  return { terms: resolved, referenced_terms_digest: sha256(JSON.stringify(canonical)) };
}

export function verifyContextSnapshot(snapshot, { root = process.cwd(), allowedContextIds } = {}) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) fail(["context_snapshot 必须是对象"]);
  if (snapshot.context_ref !== CONTEXT_FILE) fail([`context_snapshot.context_ref 必须精确为 ${CONTEXT_FILE}`]);
  if (snapshot.context_schema_version !== 1) fail(["context_snapshot.context_schema_version 必须为 1"]);
  if (!Array.isArray(snapshot.term_refs)) fail(["context_snapshot.term_refs 必须是数组"]);
  const contract = parseContextContract({ root, allowedContextIds });
  const resolved = resolveContextTermRefs(contract, snapshot.term_refs);
  const problems = [];
  if (snapshot.document_digest !== contract.document_digest) problems.push("context_snapshot.document_digest 与当前 CONTEXT.md 不一致");
  if (snapshot.referenced_terms_digest !== resolved.referenced_terms_digest) problems.push("context_snapshot.referenced_terms_digest 与引用术语不一致");
  if (problems.length) fail(problems, "context-snapshot-stale");
  return { ...contract, ...resolved };
}
