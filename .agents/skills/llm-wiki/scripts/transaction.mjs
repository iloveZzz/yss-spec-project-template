#!/usr/bin/env node
import { readFile, writeFile, mkdir, rm, readdir, lstat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sha256, json, wikiInternalPath, wikiHistoryRoot, atomicWrite, digestFile, exists, loadManifest, validateManifest, checkPaths, ownership, sourceClosure, sourceSection, frontmatter, fail, args, cliError } from "./core.mjs";
import { observeSource, sameVersion } from "./sources.mjs";
import { extractLinks } from "./lint-wikilinks.mjs";
const MANIFEST = ".wiki-manifest.json", JOURNAL = ".wiki-transaction.json", LOCK = ".wiki-lock";
const phases = ["prepared", "applied", "verified", "finalized", "aborted"];
function planDigest(plan) {
  const { digest, ...body } = plan;
  return sha256(JSON.stringify(body));
}
const authorized = (p, scope) => scope.some((s) => s.endsWith("/") ? p.startsWith(s) : s === p);
function stripLinks(text) {
  return text.replace(/\[\[[^\]\n]+\]\]/g, "[[LINK]]");
}
async function getText(root, ref) {
  const file = await wikiInternalPath(root, ref);
  try {
    return await readFile(file, "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
function validatePlan(p) {
  if (p?.schemaVersion !== 1 || !/^[a-zA-Z0-9_-]+$/.test(p.id) || p.digest !== planDigest(p) || !Array.isArray(p.writes) || !p.inputs || p.authorization?.confirmed !== true || !Array.isArray(p.authorization.paths)) fail("PLAN_INVALID", "schema, digest or authorization");
  if (!["init", "refresh", "rebuild", "ingest", "migrate", "feedback"].includes(p.operation)) fail("PLAN_INVALID", "operation");
  if (new Set(p.writes.map((w) => w.path)).size !== p.writes.length) fail("PLAN_INVALID", "duplicate write");
  for (const w of p.writes) {
    if (!authorized(w.path, p.authorization.paths) || typeof w.content !== "string" || !/^([a-f0-9]{64})$/.test(w.after) || sha256(w.content) !== w.after || !(w.before === null || /^[a-f0-9]{64}$/.test(w.before))) fail("PLAN_INVALID", w.path);
    if ([LOCK, JOURNAL, ".wiki-runner-lock"].includes(w.path) || w.path.startsWith(".wiki-staging/")) fail("PLAN_INVALID", "reserved path");
  }
}
async function createPlan({ wikiRoot, repoRoot = process.cwd(), request }) {
  const { operation } = request;
  if (!["init", "refresh", "rebuild", "ingest", "migrate", "feedback"].includes(operation)) fail("USAGE", "invalid operation");
  if (request.authorization?.confirmed !== true || !Array.isArray(request.authorization.paths)) fail("AUTHORIZATION_REQUIRED", "a reviewed scope is required");
  const priorText = await getText(wikiRoot, MANIFEST), prior = priorText ? await loadManifest(wikiRoot, { repoRoot }) : null;
  if (operation === "init" && prior) fail("ALREADY_EXISTS", "init cannot overwrite a wiki");
  if (operation !== "init" && !prior) fail("MANIFEST_MISSING", operation);
  if (prior?.schemaVersion === 1 && operation !== "migrate") fail("MIGRATION_REQUIRED", "v1 is read-only");
  const manifest = structuredClone(request.manifest || prior);
  if (manifest?.schemaVersion !== 2) fail("SCHEMA_UNSUPPORTED", "writes require v2");
  const errors = validateManifest(manifest);
  if (errors.length) fail("MANIFEST_INVALID", errors.join("\n"));
  await checkPaths(manifest, { wikiRoot, repoRoot });
  const proposed = new Map((request.writes || []).map((w) => [w.path, w.content]));
  if (proposed.size !== (request.writes || []).length) fail("PLAN_INVALID", "duplicate writes");
  const inputs = {}, writes = [];
  const bind = async (kind, root, ref) => {
    const p = await wikiInternalPath(root, ref);
    const digest = await digestFile(p);
    inputs[`${kind}:${ref}`] = digest;
    return p;
  };
  for (const ref of [MANIFEST, "wiki/index.md", "wiki/log.md", ...(prior?.sources || []).map((s) => s.rawPath), ...(prior?.articles || []).map((a) => a.file)].filter(Boolean)) await bind("wiki", wikiRoot, ref);
  for (const s of [...prior?.sources || [], ...manifest.sources]) for (const ref of [s.livePath, ...s.extract?.inputs || []].filter(Boolean)) await bind("repo", repoRoot, ref);
  const protectedPages = [], conflicts = [];
  for (const a of manifest.articles) {
    const old = prior?.articles.find((x) => x.id === a.id);
    if (operation === "migrate") {
      if (a.articleDigest !== null || Object.keys(a.compiledFrom || {}).length || a.verification) fail("MIGRATION_EVIDENCE_FORBIDDEN", a.id);
    } else for (const field of ["articleDigest", "compiledFrom", "compiledDependencies", "verification"]) {
      const expected = old?.[field] ?? (field === "compiledFrom" || field === "compiledDependencies" ? {} : null);
      if (JSON.stringify(a[field] ?? expected) !== JSON.stringify(expected)) fail("COMPILE_RECORD_PROTECTED", `${a.id}.${field}`);
    }
  }
  for (const a of prior?.articles || []) {
    const text = await getText(wikiRoot, a.file);
    if (text === null) continue;
    const own = ownership(a, text);
    if (own.protected) protectedPages.push(a.id);
    if (own.conflict) conflicts.push({ code: "OWNERSHIP_CONFLICT", articleId: a.id });
    const next = manifest.articles.find((x) => x.id === a.id);
    if (!next) fail("ARTICLE_REMOVAL_FORBIDDEN", a.id);
    if (own.protected && next.humanOwned !== true) fail("HUMAN_OWNED", `${a.id}: preserve ownership`);
    if (proposed.has(a.file) && proposed.get(a.file) !== text && own.protected) {
      if (!request.linkRepairs?.includes(a.id) || stripLinks(text) !== stripLinks(proposed.get(a.file))) fail("HUMAN_OWNED", a.id);
    }
  }
  for (const s of prior?.sources || []) if (!manifest.sources.some((x) => x.id === s.id)) fail("SOURCE_REMOVAL_FORBIDDEN", `retain tombstone and snapshot: ${s.id}`);
  for (const [ref, content] of proposed) {
    await wikiInternalPath(wikiRoot, ref, { write: true });
    if ([MANIFEST, "wiki/log.md", LOCK, JOURNAL].includes(ref) || ref.startsWith(".wiki-staging/")) fail("PLAN_INVALID", `reserved ${ref}`);
    if (typeof content !== "string") fail("PLAN_INVALID", "deletion or non-text content");
    const isKnown = manifest.articles.some((a) => a.file === ref) || manifest.sources.some((s) => s.rawPath === ref) || ["wiki/index.md", "wiki/CLAUDE.md", "wiki/AGENTS.md", "wiki/concept-table.md"].includes(ref) || operation === "migrate" && ref.startsWith(".wiki-backups/");
    if (!isKnown) fail("WRITE_SCOPE", ref);
    await bind("wiki", wikiRoot, ref);
  }
  const reader = async (file) => {
    const rel = path.relative(path.resolve(wikiRoot), file).split(path.sep).join("/");
    if (proposed.has(rel)) return Buffer.from(proposed.get(rel));
    return readFile(file);
  };
  const observed = [];
  for (const s of manifest.sources) {
    const o = await observeSource(s, { wikiRoot, repoRoot, reader });
    observed.push(o);
    if (o.state === "missing" && o.missing.length) {
      s.deletion = { observedAt: request.at || (/* @__PURE__ */ new Date()).toISOString(), paths: o.missing, lastEffectiveDigest: s.effectiveDigest };
      continue;
    }
    if (operation === "migrate") continue;
    if (s.kind === "derived" && s.extract?.kind === "prose-note" && proposed.has(s.rawPath)) {
      if (JSON.stringify(s.extract.inputDigests) !== JSON.stringify(o.inputDigests)) fail("EXTRACT_INPUT_MISMATCH", s.id);
    }
    if (o.effectiveDigest && (!s.rawPath || o.effectiveDigest === o.rawDigest)) {
      s.originalDigest = o.originalDigest;
      s.effectiveDigest = o.effectiveDigest;
      s.rawDigest = o.rawDigest;
      s.sha256 = o.originalDigest;
    } else if (!s.livePath && s.kind === "document" && o.rawDigest) {
      s.originalDigest = o.rawDigest;
      s.effectiveDigest = o.rawDigest;
      s.rawDigest = o.rawDigest;
    }
  }
  const bySource = new Map(observed.map((o) => [o.id, o]));
  const compiled = /* @__PURE__ */ new Set();
  for (const c of request.compilations || []) {
    if (compiled.has(c.articleId)) fail("COMPILE_INVALID", "duplicate article");
    compiled.add(c.articleId);
    const a = manifest.articles.find((a2) => a2.id === c.articleId);
    if (!a) fail("UNKNOWN_ARTICLE_ID", c.articleId);
    const content = proposed.get(a.file) ?? await getText(wikiRoot, a.file);
    if (content === null) fail("COMPILE_INVALID", "missing article");
    const own = ownership(a, content);
    if (own.conflict) fail("OWNERSHIP_CONFLICT", a.id);
    // Ownership protects content. Evidence can be renewed for unchanged content;
    // all proposed changes have already passed the link-only protection above.
    const ids = sourceClosure(manifest, a.id);
    if (JSON.stringify(Object.keys(c.consumed || {}).sort()) !== JSON.stringify(ids)) fail("COMPILE_INVALID", "consumed closure mismatch");
    if (!Array.isArray(c.evidence) || !c.evidence.length) fail("EVIDENCE_REQUIRED", a.id);
    for (const id2 of ids) {
      const o = bySource.get(id2);
      if (!o.effectiveDigest || !sameVersion(c.consumed[id2], o.version)) fail("COMPILE_INPUT_CHANGED", id2);
      if (!c.evidence.some((e) => e.sourceId === id2)) fail("EVIDENCE_REQUIRED", id2);
    }
    for (const e of c.evidence) {
      const s = manifest.sources.find((s2) => s2.id === e.sourceId);
      if (!ids.includes(e.sourceId) || !e.claim || !["general", "critical"].includes(e.risk) || ![s?.livePath, ...s?.extract?.inputs || []].filter(Boolean).includes(e.inputPath)) fail("EVIDENCE_INVALID", a.id);
      const input = await readFile(await bind("repo", repoRoot, e.inputPath), "utf8"), lines = input.split("\n");
      if (!Number.isInteger(e.startLine) || !Number.isInteger(e.endLine) || e.startLine < 1 || e.endLine < e.startLine || e.endLine > lines.length || sha256(lines.slice(e.startLine - 1, e.endLine).join("\n")) !== e.excerptDigest) fail("EVIDENCE_INVALID", e.inputPath);
    }
    a.articleDigest = sha256(content);
    a.compiledFrom = structuredClone(c.consumed);
    a.compiledDependencies = Object.fromEntries((a.dependsOnArticles || []).map((id2) => {
      const dep = manifest.articles.find((x) => x.id === id2);
      const bytes = proposed.get(dep.file);
      return [id2, bytes === void 0 ? null : sha256(bytes)];
    }));
    for (const id2 of a.dependsOnArticles || []) if (a.compiledDependencies[id2] === null) a.compiledDependencies[id2] = sha256(await getText(wikiRoot, manifest.articles.find((x) => x.id === id2).file));
    a.verification = { articleDigest: a.articleDigest, checkedAt: request.at || (/* @__PURE__ */ new Date()).toISOString(), evidence: c.evidence };
    delete a.status;
  }
  for (const a of manifest.articles) {
    const content = proposed.get(a.file) ?? await getText(wikiRoot, a.file);
    if (content === null) fail("ARTICLE_MISSING", a.id);
    frontmatter(content);
    if (ownership(a, content).conflict) fail("OWNERSHIP_CONFLICT", a.id);
    if (!sourceSection(content)) fail("SOURCE_SECTION_EMPTY", a.id);
    if (content.match(/^#\s+(.+)$/m)?.[1] !== a.id) fail("H1_MISMATCH", a.id);
    for (const id2 of extractLinks(content).ids) if (!manifest.articles.some((x) => x.id === id2)) fail("WIKILINK_MISSING", id2);
    if (extractLinks(content).invalid.length) fail("WIKILINK_INVALID", a.id);
  }
  if (await exists(await wikiInternalPath(wikiRoot, "wiki"))) {
    for (const file of await readdir(await wikiInternalPath(wikiRoot, "wiki"))) if (file.endsWith(".md") && !["index.md", "log.md", "claude.md", "agents.md", "soul.md", "concept-table.md"].includes(file.toLowerCase()) && !manifest.articles.some((a) => a.file === `wiki/${file}`)) fail("UNLISTED_ARTICLE", file);
  }
  const index = proposed.get("wiki/index.md") ?? await getText(wikiRoot, "wiki/index.md");
  if (index === null) fail("INDEX_MISSING", "wiki/index.md");
  const indexed = extractLinks(index);
  if (indexed.invalid.length || indexed.ids.some((id2) => !manifest.articles.some((a) => a.id === id2)) || manifest.articles.some((a) => !indexed.ids.includes(a.id))) fail("INDEX_INVALID", "article closure");
  const finalErrors = validateManifest(manifest);
  if (finalErrors.length) fail("MANIFEST_INVALID", finalErrors.join("\n"));
  proposed.set(MANIFEST, json(manifest));
  const id = request.id || sha256(JSON.stringify({ operation, inputs, proposed: [...proposed] })).slice(0, 24);
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) fail("PLAN_INVALID", "id");
  const historyRoot = await wikiHistoryRoot(wikiRoot);
  const priorLog = historyRoot ? "# Wiki 当前运行\n" : await getText(wikiRoot, "wiki/log.md") || "# log\n";
  proposed.set("wiki/log.md", `${priorLog.trimEnd()}

## [${(request.at || (/* @__PURE__ */ new Date()).toISOString()).slice(0, 10)}] ${operation.toUpperCase()} | ${id}

- Changed articles: ${[...compiled].join(", ") || "none"}
- Remaining freshness must be read from status.
${historyRoot ? `- 运行材料：maintenance:wiki/${sha256(path.resolve(wikiRoot))}/.wiki-staging/${id}/completed.json\n` : ""}`);
  for (const [ref, content] of proposed) {
    const old = await getText(wikiRoot, ref);
    if (old === content) continue;
    await bind("wiki", wikiRoot, ref);
    writes.push({ path: ref, before: old === null ? null : sha256(old), after: sha256(content), content, original: old });
  }
  writes.sort((a, b) => {
    const rank = (w) => w.path === MANIFEST ? 1 : w.path === "wiki/log.md" ? 2 : 0;
    return rank(a) - rank(b) || a.path.localeCompare(b.path);
  });
  const plan = { schemaVersion: 1, id, operation, inputs, writes, summary: { sources: observed.map(({ id: id2, state, reason }) => ({ id: id2, state, reason })), articles: manifest.articles.filter((a) => writes.some((w) => w.path === a.file)).map((a) => a.id), protected: protectedPages, conflicts }, authorization: request.authorization };
  plan.digest = planDigest(plan);
  validatePlan(plan);
  return plan;
}
async function verifyInputs(plan, options, { during = false } = {}) {
  for (const [key, expected] of Object.entries(plan.inputs)) {
    const colon = key.indexOf(":"), kind = key.slice(0, colon), ref = key.slice(colon + 1);
    if (!["repo", "wiki"].includes(kind)) fail("PLAN_INVALID", key);
    const p = await wikiInternalPath(kind === "wiki" ? options.wikiRoot : options.repoRoot, ref, { write: kind === "wiki" }), actual = await digestFile(p);
    const w = kind === "wiki" ? plan.writes.find((w2) => w2.path === ref) : null;
    if (actual !== expected && !(during && w && actual === w.after)) fail("PLAN_STALE", key);
  }
}
async function loadJournal(wikiRoot) {
  const j = JSON.parse(await readFile(await wikiInternalPath(wikiRoot, JOURNAL), "utf8"));
  if (j.schemaVersion !== 1 || !phases.includes(j.phase) || j.id !== j.plan?.id || !Array.isArray(j.applied)) fail("JOURNAL_INVALID", "invalid journal");
  validatePlan(j.plan);
  return j;
}
async function saveJournal(wikiRoot, j) {
  await atomicWrite(await wikiInternalPath(wikiRoot, JOURNAL, { write: true }), json(j));
}
async function assertLock(wikiRoot, id) {
  const lock = JSON.parse(await readFile(await wikiInternalPath(wikiRoot, LOCK), "utf8"));
  if (lock.id !== id) fail("LOCK_CONFLICT", "another writer owns the lock");
}
async function acquire(wikiRoot, id) {
  await mkdir(wikiRoot, { recursive: true });
  try {
    const file = await wikiInternalPath(wikiRoot, LOCK, { write: true });
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, json({ id }), { flag: "wx" });
  } catch (e) {
    if (e.code === "EEXIST") fail("LOCKED", "explicit resume/abort; never steal a lock");
    throw e;
  }
}
async function stage(wikiRoot, plan) {
  for (const [i, w] of plan.writes.entries()) {
    await atomicWrite(await wikiInternalPath(wikiRoot, `.wiki-staging/${plan.id}/${i}.txt`, { write: true }), w.content);
  }
}
async function install(options, j, w, index) {
  const target = await wikiInternalPath(options.wikiRoot, w.path, { write: true });
  const actual = await digestFile(target);
  if (actual !== w.before && actual !== w.after) fail("MANUAL_MODIFICATION", w.path);
  if (actual !== w.after) {
    const content = await readFile(await wikiInternalPath(options.wikiRoot, `.wiki-staging/${j.id}/${index}.txt`));
    if (sha256(content) !== w.after) fail("STAGING_CHANGED", w.path);
    await atomicWrite(target, content);
  }
  if (!j.applied.includes(w.path)) j.applied.push(w.path);
  await saveJournal(options.wikiRoot, j);
}
async function applyPlan({ wikiRoot, repoRoot = process.cwd(), plan, stopAfter }) {
  validatePlan(plan);
  const options = { wikiRoot, repoRoot };
  const completed = await getText(wikiRoot, `.wiki-staging/${plan.id}/completed.json`);
  if (completed) {
    const done = JSON.parse(completed);
    if (done.digest !== plan.digest) fail("PLAN_ID_CONFLICT", plan.id);
    return { id: plan.id, phase: "finalized", replayed: true };
  }
  const previous = await getText(wikiRoot, JOURNAL);
  if (previous) {
    const j2 = await loadJournal(wikiRoot);
    if (j2.id === plan.id && j2.plan.digest === plan.digest) {
      if (j2.phase === "finalized") {
        for (const w of j2.plan.writes) if (await digestFile(await wikiInternalPath(wikiRoot, w.path)) !== w.after) fail("MANUAL_MODIFICATION", w.path);
        return { id: j2.id, phase: "finalized", replayed: true };
      }
      fail("TRANSACTION_INCOMPLETE", "use explicit resume");
    }
    if (!["finalized", "aborted"].includes(j2.phase)) fail("TRANSACTION_INCOMPLETE", j2.id);
  }
  await verifyInputs(plan, options);
  await acquire(wikiRoot, plan.id);
  const j = { schemaVersion: 1, id: plan.id, phase: "prepared", plan, applied: [] };
  await saveJournal(wikiRoot, j);
  await stage(wikiRoot, plan);
  if (stopAfter === "prepared") return { id: j.id, phase: j.phase };
  return resumeTransaction({ ...options, stopAfter });
}
async function resumeInternal({ wikiRoot, repoRoot = process.cwd(), stopAfter }) {
  const j = await loadJournal(wikiRoot);
  const options = { wikiRoot, repoRoot };
  if (["finalized", "aborted"].includes(j.phase)) {
    if (await exists(await wikiInternalPath(wikiRoot, LOCK))) {
      await assertLock(wikiRoot, j.id);
      await rm(await wikiInternalPath(wikiRoot, LOCK, { write: true }));
    }
    return { id: j.id, phase: j.phase, replayed: true };
  }
  await assertLock(wikiRoot, j.id);
  await verifyInputs(j.plan, options, { during: true });
  for (const [i, w] of j.plan.writes.entries()) {
    const p = await wikiInternalPath(wikiRoot, `.wiki-staging/${j.id}/${i}.txt`, { write: true });
    if (!await exists(p)) await atomicWrite(p, w.content);
  }
  if (j.phase === "prepared") {
    for (const [i, w] of j.plan.writes.entries()) if (![MANIFEST, "wiki/log.md"].includes(w.path)) await install(options, j, w, i);
    j.phase = "applied";
    await saveJournal(wikiRoot, j);
    if (stopAfter === "applied") return { id: j.id, phase: j.phase };
  }
  if (j.phase === "applied") {
    for (const w of j.plan.writes.filter((w2) => ![MANIFEST, "wiki/log.md"].includes(w2.path))) if (await digestFile(await wikiInternalPath(wikiRoot, w.path)) !== w.after) fail("VERIFY_FAILED", w.path);
    const candidate = j.plan.writes.find((w) => w.path === MANIFEST);
    if (candidate) {
      const errors = validateManifest(JSON.parse(candidate.content));
      if (errors.length) fail("VERIFY_FAILED", errors.join("\n"));
    }
    j.phase = "verified";
    await saveJournal(wikiRoot, j);
    if (stopAfter === "verified") return { id: j.id, phase: j.phase };
  }
  await verifyInputs(j.plan, options, { during: true });
  for (const [i, w] of j.plan.writes.entries()) if ([MANIFEST, "wiki/log.md"].includes(w.path)) {
    await install(options, j, w, i);
    if (stopAfter === w.path) return { id: j.id, phase: j.phase };
  }
  await atomicWrite(await wikiInternalPath(wikiRoot, `.wiki-staging/${j.id}/completed.json`, { write: true }), json({ id: j.id, digest: j.plan.digest, phase: "finalized", writes: j.plan.writes.map(({ path: path2, before, after }) => ({ path: path2, before, after })) }));
  j.phase = "finalized";
  await saveJournal(wikiRoot, j);
  await rm(await wikiInternalPath(wikiRoot, LOCK, { write: true }));
  return { id: j.id, phase: j.phase };
}
async function abortInternal({ wikiRoot }) {
  const j = await loadJournal(wikiRoot);
  if (j.phase === "aborted") return { id: j.id, phase: j.phase, replayed: true };
  if (j.phase === "finalized") fail("TRANSACTION_FINALIZED", "cannot abort published transaction");
  await assertLock(wikiRoot, j.id);
  for (const w of j.plan.writes) {
    const digest = await digestFile(await wikiInternalPath(wikiRoot, w.path, { write: true }));
    if (digest !== w.before && digest !== w.after) fail("MANUAL_MODIFICATION", w.path);
    if (w.before !== null && (typeof w.original !== "string" || sha256(w.original) !== w.before)) fail("BACKUP_INVALID", w.path);
  }
  for (const w of [...j.plan.writes].reverse()) {
    const p = await wikiInternalPath(wikiRoot, w.path, { write: true });
    if (await digestFile(p) === w.after) {
      if (w.before === null) await rm(p);
      else await atomicWrite(p, w.original);
    }
  }
  j.phase = "aborted";
  await saveJournal(wikiRoot, j);
  await rm(await wikiInternalPath(wikiRoot, LOCK, { write: true }));
  return { id: j.id, phase: j.phase };
}
async function exclusive(options, run) {
  const file = await wikiInternalPath(options.wikiRoot, ".wiki-runner-lock", { write: true });
  try {
    await writeFile(file, json({ pid: process.pid }), { flag: "wx" });
  } catch (e) {
    if (e.code === "EEXIST") fail("LOCKED", "runner lock retained; inspect interrupted process before explicit removal");
    throw e;
  }
  try {
    return await run(options);
  } finally {
    await rm(file);
  }
}
const resumeTransaction = (options) => exclusive(options, resumeInternal);
const abortTransaction = (options) => exclusive(options, abortInternal);
async function main() {
  const a = args(process.argv.slice(2), ["plan", "apply", "resume", "abort"]);
  if (!a.wiki) fail("USAGE", "--wiki required");
  const options = { wikiRoot: path.resolve(a.repo, a.wiki), repoRoot: path.resolve(a.repo) };
  let result;
  if (a.command === "plan") {
    if (!a.request) fail("USAGE", "--request required");
    result = await createPlan({ ...options, request: JSON.parse(await readFile(a.request, "utf8")) });
  } else if (a.command === "apply") {
    if (!a.plan) fail("USAGE", "--plan required");
    result = await applyPlan({ ...options, plan: JSON.parse(await readFile(a.plan, "utf8")) });
  } else if (a.command === "resume") result = await resumeTransaction(options);
  else result = await abortTransaction(options);
  process.stdout.write(json(result));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(cliError);
export {
  abortTransaction,
  applyPlan,
  createPlan,
  planDigest,
  resumeTransaction
};
