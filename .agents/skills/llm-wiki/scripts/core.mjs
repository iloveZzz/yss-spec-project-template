import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile, rename, lstat, realpath, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from 'node:url';
const STATES = ["current", "stale", "missing", "unverified", "archived"];
const INFRA = /* @__PURE__ */ new Set(["index.md", "log.md", "claude.md", "agents.md", "soul.md", "concept-table.md"]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}
`;
class WikiError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.code = code;
  }
}
function fail(code, message) {
  throw new WikiError(code, message);
}
async function exists(file) {
  try {
    await access(file);
    return true;
  } catch (e) {
    if (e.code === "ENOENT") return false;
    throw e;
  }
}
async function digestFile(file) {
  try {
    return sha256(await readFile(file));
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
function inside(root, target) {
  const r = path.relative(root, target);
  return r === "" || !r.startsWith(`..${path.sep}`) && r !== ".." && !path.isAbsolute(r);
}
async function safePath(root, ref, { write = false } = {}) {
  if (typeof ref !== "string" || !ref || ref.includes("\\") || ref.includes("\0") || path.isAbsolute(ref) || ref.split("/").some((x) => ["..", ".", ""].includes(x))) fail("PATH_INVALID", String(ref));
  const base = path.resolve(root), target = path.resolve(base, ref);
  if (!inside(base, target) || target === base) fail("PATH_ESCAPE", ref);
  let baseReal;
  try {
    baseReal = await realpath(base);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    const parent = path.dirname(base);
    baseReal = path.join(await realpath(parent), path.basename(base));
  }
  let current = base;
  for (const part of ref.split("/")) {
    current = path.join(current, part);
    let st;
    try {
      st = await lstat(current);
    } catch (e) {
      if (e.code === "ENOENT") continue;
      throw e;
    }
    if (st.isSymbolicLink() && write) fail("SYMLINK_WRITE", ref);
    let resolved;
    try {
      resolved = await realpath(current);
    } catch {
      fail("PATH_ESCAPE", `unresolved symlink ${ref}`);
    }
    if (!inside(baseReal, resolved)) fail("PATH_ESCAPE", ref);
  }
  return target;
}
async function wikiHistoryRoot(wikiRoot) {
  let cursor = path.resolve(wikiRoot);
  while (true) {
    const identity = path.join(cursor, 'yss-project.yaml');
    if (await exists(identity)) {
      const source = await readFile(identity, 'utf8');
      if (!/^repository_mode:\s*template-source\s*$/m.test(source)) return null;
      const helper = path.join(cursor, 'scripts/lib/maintenance-storage.mjs');
      if (!await exists(helper)) fail('MAINTENANCE_STORAGE_MISSING', 'template-source requires its registered maintenance storage helper');
      const { resolveMaintenanceOutput } = await import(pathToFileURL(helper).href);
      return resolveMaintenanceOutput(`maintenance:wiki/${sha256(path.resolve(wikiRoot))}`, { root: cursor });
    }
    const parent = path.dirname(cursor);
    if (parent === cursor) return null;
    cursor = parent;
  }
}
async function wikiInternalPath(wikiRoot, ref, options = {}) {
  if (typeof ref === 'string' && /^\.wiki-(?:staging\/|backups\/|transaction\.json$|lock$|runner-lock$)/.test(ref)) {
    // Validate the same relative path contract before resolving an external file.
    if (ref.includes('\\') || ref.split('/').some(part => ['..', '.', ''].includes(part))) fail('PATH_INVALID', ref);
    const historyRoot = await wikiHistoryRoot(wikiRoot);
    if (historyRoot) {
      const target = path.join(historyRoot, ref);
      let cursor = target;
      while (inside(historyRoot, cursor)) {
        if (await exists(cursor) && (await lstat(cursor)).isSymbolicLink()) fail('SYMLINK_WRITE', ref);
        if (cursor === historyRoot) break;
        cursor = path.dirname(cursor);
      }
      return target;
    }
  }
  return safePath(wikiRoot, ref, options);
}
async function atomicWrite(file, content) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, content, { flag: "wx" });
  await rename(temp, file);
}
function frontmatter(text) {
  if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) return { humanOwned: false, body: text, fields: {} };
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!m) fail("FRONTMATTER_INVALID", "unterminated header");
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const pair = line.match(/^([\w-]+):\s*(.*?)\s*$/);
    if (!pair) fail("FRONTMATTER_INVALID", "use flat scalar fields");
    if (Object.hasOwn(fields, pair[1])) fail("FRONTMATTER_INVALID", `duplicate ${pair[1]}`);
    fields[pair[1]] = pair[2];
  }
  if (fields["human-owned"] !== void 0 && !["true", "false"].includes(fields["human-owned"])) fail("FRONTMATTER_INVALID", "human-owned must be a boolean");
  return { humanOwned: fields["human-owned"] === "true", fields, body: text.slice(m[0].length) };
}
function sourceSection(text) {
  return text.match(/^##\s+来源\s*\r?\n([\s\S]*)/m)?.[1]?.trim() || "";
}
function ownership(article, text) {
  const fm = frontmatter(text);
  return { protected: article.humanOwned === true || fm.humanOwned, conflict: article.humanOwned !== void 0 && fm.fields["human-owned"] !== void 0 && article.humanOwned !== fm.humanOwned };
}
const array = (v) => Array.isArray(v);
const unique = (v) => new Set(v).size === v.length;
const digest = (v) => v === null || /^[a-f0-9]{64}$/.test(v);
function validateManifest(m) {
  const errors = [];
  const check = (ok, code, detail) => {
    if (!ok) errors.push(`${code}: ${detail}`);
  };
  if (!m || typeof m !== "object" || array(m)) return ["MANIFEST_INVALID: expected object"];
  check([1, 2].includes(m.schemaVersion), "SCHEMA_UNSUPPORTED", m.schemaVersion);
  check(m.profile === void 0 && m.schemaVersion === 1 || ["mixed", "documents", "code"].includes(m.profile), "PROFILE_INVALID", m.profile);
  if (!array(m.sources) || !array(m.articles)) return [...errors, "MANIFEST_INVALID: sources and articles must be arrays"];
  for (const [group, rows] of [["source", m.sources], ["article", m.articles]]) {
    check(rows.every((x) => x && typeof x.id === "string" && x.id.trim() && (group === "source" || !/[\[\]#|/\\]/.test(x.id))), "ID_INVALID", group);
    check(unique(rows.map((x) => x?.id)), "DUPLICATE_ID", group);
  }
  const sources = new Set(m.sources.map((x) => x?.id)), articles = new Set(m.articles.map((x) => x?.id));
  check(unique(m.articles.map((x) => x?.file)), "DUPLICATE_FILE", "articles");
  for (const s of m.sources) {
    if (!s || typeof s !== "object") continue;
    check(["document", "derived", "code-surface"].includes(s.kind), "SOURCE_KIND", s.id);
    if (s.kind === "code-surface") check(typeof s.livePath === "string" && s.livePath.length > 0, "LIVE_PATH_REQUIRED", s.id);
    check(!(m.profile === "documents" && s.kind === "code-surface"), "PROFILE KIND", s.id + " code-surface");
    check(s.kind === "code-surface" ? s.rawPath == null : typeof s.rawPath === "string" && s.rawPath.length > 0, s.kind === "code-surface" ? "RAW PATH FORBIDDEN" : "RAW PATH REQUIRED", s.id);
    if (s.kind === "derived") {
      if (m.schemaVersion === 2 && s.extract?.kind === "prose-note") check(typeof s.extract.rules === "string" && s.extract.rules.length > 0 && s.extract.inputDigests && typeof s.extract.inputDigests === "object", "EXTRACT_RULES", s.id);
      check(!!s.extract?.kind, "EXTRACT REQUIRED", s.id);
      if (s.extract?.kind) check(["skill-names", "heading-list", "prose-note"].includes(s.extract.kind), "EXTRACT KIND", `${s.id} ${s.extract.kind}`);
      if (m.schemaVersion === 2) {
        check(typeof s.extract?.version === "string" && !!s.extract.version, "EXTRACT_VERSION", s.id);
        check(array(s.extract?.inputs) && s.extract.inputs.length > 0 && unique(s.extract.inputs), "EXTRACT_INPUTS", s.id);
      }
    }
    if (s.status !== void 0) check(STATES.includes(s.status), "STATUS_INVALID", s.id);
    if (m.schemaVersion === 2) {
      for (const k of ["originalDigest", "effectiveDigest", "rawDigest"]) check(Object.hasOwn(s, k) && digest(s[k]), "DIGEST_INVALID", `${s.id}.${k}`);
      check(typeof s.location === "string" && s.location.length > 0, "LOCATION_REQUIRED", s.id);
    }
  }
  for (const a of m.articles) {
    if (!a || typeof a !== "object") continue;
    check(a.file === `wiki/${a.id}.md` && !INFRA.has(`${a.id}.md`.toLowerCase()), "MANIFEST ID MISMATCH", a.id);
    check(array(a.sourceIds) && unique(a.sourceIds), "SOURCE_REFS_INVALID", a.id);
    check(array(a.sourceIds) && (a.sourceIds.length > 0 || array(a.dependsOnArticles) && a.dependsOnArticles.length > 0), "EMPTY_SOURCE_REFS", a.id);
    for (const id of array(a.sourceIds) ? a.sourceIds : []) check(sources.has(id), "UNKNOWN SOURCE ID", `${a.id} -> ${id}`);
    if (a.dependsOnArticles !== void 0) check(array(a.dependsOnArticles) && unique(a.dependsOnArticles), "DEPENDENCIES_INVALID", a.id);
    for (const id of array(a.dependsOnArticles) ? a.dependsOnArticles : []) check(articles.has(id), "UNKNOWN_ARTICLE_ID", `${a.id} -> ${id}`);
    if (a.aliases !== void 0) check(array(a.aliases) && a.aliases.every((x) => typeof x === "string" && x.trim()), "ALIASES_INVALID", a.id);
    if (a.humanOwned !== void 0) check(typeof a.humanOwned === "boolean", "OWNERSHIP_INVALID", a.id);
    if (a.verification !== void 0 && a.verification !== null) check(a.verification && typeof a.verification === "object" && array(a.verification.evidence) && a.verification.evidence.every((e) => e && typeof e === "object" && sources.has(e.sourceId) && ["general", "critical"].includes(e.risk) && typeof e.claim === "string" && e.claim.length > 0 && digest(e.excerptDigest) && e.excerptDigest !== null && typeof e.inputPath === "string" && Number.isInteger(e.startLine) && e.startLine > 0 && Number.isInteger(e.endLine) && e.endLine >= e.startLine) && digest(a.verification.articleDigest) && a.verification.articleDigest !== null, "EVIDENCE_INVALID", a.id);
    if (a.status !== void 0) check(STATES.includes(a.status), "STATUS_INVALID", a.id);
    if (m.schemaVersion === 2) {
      check(digest(a.articleDigest) && Object.hasOwn(a, "articleDigest"), "DIGEST_INVALID", a.id);
      check(a.compiledFrom && typeof a.compiledFrom === "object" && !array(a.compiledFrom), "COMPILED_FROM_INVALID", a.id);
      for (const [id, binding] of Object.entries(a.compiledFrom || {})) {
        check(sources.has(id) && binding && digest(binding.effectiveDigest) && binding.effectiveDigest !== null, "COMPILED_FROM_INVALID", `${a.id}:${id}`);
      }
    }
  }
  if (errors.length === 0) {
    try {
      for (const a of m.articles) sourceClosure(m, a.id);
    } catch (e) {
      errors.push(e.message);
    }
  }
  if (m.feedback !== void 0) {
    check(array(m.feedback), "FEEDBACK_INVALID", "expected array");
    if (array(m.feedback)) {
      check(unique(m.feedback.map((f) => f?.id)), "DUPLICATE_ID", "feedback");
      for (const f of m.feedback) {
        if (!f || typeof f !== "object") {
          errors.push("FEEDBACK_INVALID: expected object");
          continue;
        }
        check(typeof f.id === "string" && f.id.length > 0 && articles.has(f.articleId) && digest(f.targetDigest) && f.targetDigest !== null && typeof f.issue === "string" && f.issue.trim() && f.locator && typeof f.locator.quote === "string" && f.locator.quote.length > 0, "FEEDBACK_INVALID", f.id);
        check(["open", "accepted", "partial", "rejected", "deferred"].includes(f.status), "FEEDBACK_STATUS", f.id);
      }
    }
  }
  return errors;
}
function sourceClosure(m, id, trail = []) {
  if (trail.includes(id)) fail("DEPENDENCY_CYCLE", [...trail, id].join(" -> "));
  const a = m.articles.find((x) => x.id === id);
  if (!a) fail("UNKNOWN_ARTICLE_ID", id);
  return [.../* @__PURE__ */ new Set([...a.sourceIds || [], ...(a.dependsOnArticles || []).flatMap((dep) => sourceClosure(m, dep, [...trail, id]))])].sort();
}
async function checkPaths(m, { wikiRoot, repoRoot }) {
  for (const s of m.sources) {
    for (const ref of [s.livePath, ...s.extract?.inputs || []].filter(Boolean)) await safePath(repoRoot, ref);
    if (s.rawPath) await safePath(wikiRoot, s.rawPath);
  }
  for (const a of m.articles) await safePath(wikiRoot, a.file);
}
async function loadManifest(wikiRoot, { repoRoot = process.cwd(), validate = true } = {}) {
  const m = JSON.parse(await readFile(await safePath(wikiRoot, ".wiki-manifest.json"), "utf8"));
  if (validate) {
    const errors = validateManifest(m);
    if (errors.length) fail("MANIFEST_INVALID", errors.join("\n"));
    await checkPaths(m, { wikiRoot, repoRoot });
  }
  return m;
}
async function transactionState(wikiRoot, { reader } = {}) {
  // A writer claims the lock before replacing an earlier finalized journal.
  // That interval must also block readers.
  if (await exists(await wikiInternalPath(wikiRoot, ".wiki-lock"))) return { state: "locked", incomplete: true };
  const file = await wikiInternalPath(wikiRoot, ".wiki-transaction.json");
  if (!await exists(file)) return { state: "none" };
  const j = JSON.parse(reader ? (await reader(file)).toString() : await readFile(file, "utf8"));
  return { id: j.id, state: j.phase, incomplete: !["finalized", "aborted"].includes(j.phase) };
}
async function assertReadable(wikiRoot, reader) {
  const tx = await transactionState(wikiRoot, { reader });
  if (tx.incomplete || tx.state === "locked") fail("TRANSACTION_INCOMPLETE", "explicit resume or abort required; query never recovers");
  return tx;
}
function cliError(e) {
  process.stderr.write(`${JSON.stringify({ ok: false, code: e.code || "EXECUTION_ERROR", message: e.message })}
`);
  process.exitCode = 2;
}
function args(argv, commands = []) {
  const result = { command: commands.length ? argv.shift() : void 0, repo: process.cwd() };
  if (commands.length && !commands.includes(result.command)) fail("USAGE", commands.join("|"));
  while (argv.length) {
    const a = argv.shift();
    if (a === "--apply" || a === "--structure-only") {
      result[a.slice(2)] = true;
    } else if (a.startsWith("--")) {
      if (!argv.length || argv[0].startsWith("--")) fail("USAGE", `value required ${a}`);
      const key = a.slice(2);
      if (key === "candidate") (result.candidates ??= []).push(argv.shift());
      else result[key] = argv.shift();
    } else if (!result.wiki) result.wiki = a;
    else fail("USAGE", a);
  }
  return result;
}
export {
  INFRA,
  STATES,
  WikiError,
  args,
  assertReadable,
  atomicWrite,
  checkPaths,
  cliError,
  digestFile,
  exists,
  fail,
  frontmatter,
  json,
  loadManifest,
  wikiHistoryRoot,
  wikiInternalPath,
  ownership,
  safePath,
  sha256,
  sourceClosure,
  sourceSection,
  transactionState,
  validateManifest
};
