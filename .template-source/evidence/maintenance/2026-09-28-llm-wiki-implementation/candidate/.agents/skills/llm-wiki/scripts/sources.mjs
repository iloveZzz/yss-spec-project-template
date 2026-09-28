import { readFile } from "node:fs/promises";
import { safePath, sha256, sourceClosure, ownership, transactionState, fail } from "./core.mjs";
import { extractSkillNames, extractHeadings } from "./extract.mjs";
const EXTRACTOR_VERSION = "1";
const extractorKey = (s) => s.kind === "derived" ? `${s.extract.kind}:${s.extract.version}:${s.extract.kind === "prose-note" ? sha256(JSON.stringify({ rules: s.extract.rules, inputs: s.extract.inputDigests })) : ""}` : "identity-v1";
const rawVersion = (s) => ({ effectiveDigest: s.effectiveDigest ?? null, rawDigest: s.rawDigest ?? null, extractorVersion: extractorKey(s) });
const sameVersion = (a, b) => !!a && !!b && a.effectiveDigest === b.effectiveDigest && a.rawDigest === b.rawDigest && a.extractorVersion === b.extractorVersion;
async function readOptional(file, reader) {
  try {
    return reader ? await reader(file) : await readFile(file);
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
async function observeSource(source, { wikiRoot, repoRoot, reader }) {
  const raw = source.rawPath ? await readOptional(await safePath(wikiRoot, source.rawPath), reader) : null;
  const inputPaths = source.kind === "derived" ? (source.extract?.inputs || [source.livePath]).filter(Boolean) : [source.livePath].filter(Boolean);
  const inputs = [];
  for (const ref of inputPaths) {
    const value = await readOptional(await safePath(repoRoot, ref), reader);
    inputs.push({ path: ref, digest: value === null ? null : sha256(value), value });
  }
  const missing = inputs.filter((x) => x.value === null).map((x) => x.path);
  let effective = null, original = null;
  if (inputs.length && !missing.length) {
    original = inputs.length === 1 ? inputs[0].digest : sha256(JSON.stringify(inputs.map(({ path, digest }) => ({ path, digest }))));
    if (source.kind !== "derived") effective = inputs[0].value;
    else if (source.extract?.kind === "skill-names") effective = Buffer.from(inputs.map((x) => extractSkillNames(JSON.parse(x.value.toString()))).join(""));
    else if (source.extract?.kind === "heading-list") effective = Buffer.from(inputs.map((x) => extractHeadings(x.value.toString(), x.path)).join(""));
    else if (source.extract?.kind === "prose-note" && JSON.stringify(source.extract.inputDigests) === JSON.stringify(Object.fromEntries(inputs.map((x) => [x.path, x.digest])))) effective = raw;
  }
  const rawDigest = raw === null ? null : sha256(raw), effectiveDigest = effective === null ? null : sha256(effective);
  const snapshotIntegrity = source.rawPath ? raw === null ? "missing" : !source.rawDigest ? "unverified" : rawDigest === source.rawDigest ? "intact" : "changed" : "not-applicable";
  let state = "unverified", reason = "compile-evidence-missing";
  if (source.status === "archived") {
    state = "archived";
    reason = "explicitly-archived";
  } else if (missing.length) {
    state = "missing";
    reason = "live-input-missing";
  } else if (source.rawPath && raw === null) {
    state = "missing";
    reason = "raw-snapshot-missing";
  } else if (!inputs.length) {
    state = "unverified";
    reason = snapshotIntegrity === "changed" ? "external-snapshot-changed" : "online-not-checked";
  } else if (source.kind === "derived" && source.extract?.version !== EXTRACTOR_VERSION) {
    state = "unverified";
    reason = "extractor-version-unsupported";
  } else if (source.kind === "derived" && source.extract?.kind === "prose-note" && effective === null) {
    state = "stale";
    reason = "prose-input-or-recipe-changed";
  } else if (source.effectiveDigest && effectiveDigest !== source.effectiveDigest) {
    state = "stale";
    reason = "effective-content-changed";
  } else if (snapshotIntegrity === "changed") {
    state = "stale";
    reason = "raw-snapshot-changed";
  } else if (source.kind !== "code-surface" && effective !== null && rawDigest !== effectiveDigest) {
    state = "stale";
    reason = "raw-not-aligned";
  } else if (source.effectiveDigest && effectiveDigest === source.effectiveDigest) {
    state = "current";
    reason = "local-content-matches";
  } else if (source.sha256 && original !== source.sha256) {
    state = "stale";
    reason = "legacy-live-content-changed";
  }
  return { id: source.id, state, reason, originalDigest: original, effectiveDigest, rawDigest, inputDigests: Object.fromEntries(inputs.map((x) => [x.path, x.digest])), snapshotIntegrity, onlineCurrentness: inputs.length ? "local" : "unverified", missing, version: { effectiveDigest, rawDigest, extractorVersion: extractorKey(source) } };
}
async function inspectArticles(manifest, { wikiRoot, repoRoot, articleIds, reader } = {}) {
  const tx = await transactionState(wikiRoot, { reader });
  const selected = articleIds ? manifest.articles.filter((a) => articleIds.includes(a.id)) : manifest.articles;
  if (tx.incomplete || tx.state === "locked") return { sourceStates: [], articleStates: selected.map((a) => ({ id: a.id, state: "unverified", reason: "transaction-incomplete", humanOwned: a.humanOwned === true })), conflicts: [], transaction: tx };
  const ids = new Set(selected.flatMap((a) => sourceClosure(manifest, a.id)));
  const sourceStates = [];
  for (const s of manifest.sources.filter((s2) => ids.has(s2.id) || !articleIds)) sourceStates.push(await observeSource(s, { wikiRoot, repoRoot, reader }));
  const sourceMap = new Map(sourceStates.map((s) => [s.id, s]));
  const articleStates = [], conflicts = [];
  const cache = /* @__PURE__ */ new Map();
  const visit = async (a) => {
    if (cache.has(a.id)) return cache.get(a.id);
    const bytes = await readOptional(await safePath(wikiRoot, a.file), reader);
    const digest = bytes === null ? null : sha256(bytes);
    const own = bytes ? ownership(a, bytes.toString()) : { protected: a.humanOwned === true, conflict: false };
    if (own.conflict) conflicts.push({ code: "OWNERSHIP_CONFLICT", articleId: a.id });
    const deps = [];
    for (const id of a.dependsOnArticles || []) deps.push(await visit(manifest.articles.find((x) => x.id === id)));
    const closure = sourceClosure(manifest, a.id), sources = closure.map((id) => sourceMap.get(id));
    let state = "unverified", reason = "compile-evidence-missing";
    if (bytes === null) {
      state = "missing";
      reason = "article-missing";
    } else if (a.status === "archived") {
      state = "archived";
      reason = "explicitly-archived";
    } else if (own.conflict) {
      state = "unverified";
      reason = "ownership-conflict";
    } else if (a.status === "stale") {
      state = "stale";
      reason = "declared-conflict-or-outdated";
    } else if (sources.some((s) => s.state === "missing")) {
      state = "missing";
      reason = "source-missing";
    } else if (sources.some((s) => s.state === "stale") || deps.some((d) => d.state === "stale")) {
      state = "stale";
      reason = "dependency-changed";
    } else if (manifest.schemaVersion === 2 && a.articleDigest && digest !== a.articleDigest) {
      state = "stale";
      reason = "article-content-changed";
    } else if (manifest.schemaVersion === 2 && closure.some((id) => a.compiledFrom?.[id] && !sameVersion(a.compiledFrom[id], sourceMap.get(id).version))) {
      state = "stale";
      reason = "compiled-source-changed";
    } else if (manifest.schemaVersion === 2 && deps.some((d) => a.compiledDependencies?.[d.id] !== d.articleDigest)) {
      state = "stale";
      reason = "compiled-article-changed";
    } else if (sources.some((s) => s.state !== "current") || deps.some((d) => d.state !== "current")) {
      reason = "dependency-unverified";
    } else if (manifest.schemaVersion === 2 && a.verification?.articleDigest === digest && a.articleDigest === digest && closure.length && closure.every((id) => sameVersion(a.compiledFrom?.[id], sourceMap.get(id).version))) {
      const evidence = a.verification.evidence || [];
      let valid = evidence.length > 0 && closure.every((id) => evidence.some((e) => e.sourceId === id));
      for (const e of evidence) {
        const s = manifest.sources.find((x) => x.id === e.sourceId);
        if (!s || !e.claim || !["general", "critical"].includes(e.risk)) {
          valid = false;
          continue;
        }
        if (![s.livePath, ...s.extract?.inputs || []].filter(Boolean).includes(e.inputPath)) {
          valid = false;
          continue;
        }
        const content = await readOptional(await safePath(repoRoot, e.inputPath), reader);
        if (!content) {
          valid = false;
          continue;
        }
        const lines = content.toString().split("\n");
        if (!Number.isInteger(e.startLine) || !Number.isInteger(e.endLine) || e.startLine < 1 || e.endLine < e.startLine || e.endLine > lines.length) {
          valid = false;
          continue;
        }
        if (sha256(lines.slice(e.startLine - 1, e.endLine).join("\n")) !== e.excerptDigest) valid = false;
      }
      if (valid) {
        state = "current";
        reason = "content-and-evidence-match";
      } else reason = "verification-evidence-invalid";
    }
    const result = { id: a.id, state, reason, articleDigest: digest, sourceIds: closure, humanOwned: own.protected };
    cache.set(a.id, result);
    return result;
  };
  for (const a of selected) articleStates.push(await visit(a));
  return { sourceStates, articleStates, conflicts, transaction: await transactionState(wikiRoot, { reader }) };
}
export {
  EXTRACTOR_VERSION,
  extractorKey,
  inspectArticles,
  observeSource,
  rawVersion,
  readOptional,
  sameVersion
};
