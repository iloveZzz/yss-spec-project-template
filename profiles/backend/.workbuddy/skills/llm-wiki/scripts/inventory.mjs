#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sha256, exists, loadManifest, args, cliError, transactionState } from "./core.mjs";
import { observeSource, inspectArticles } from "./sources.mjs";
const resolveWikiRoot = (arg, cwd = process.cwd()) => {
  if (!arg) throw new Error("missing --wiki");
  return path.resolve(cwd, arg);
};
const manifestPath = (root) => path.join(root, ".wiki-manifest.json");
const normalizeLivePath = (p) => String(p || "").replace(/\\/g, "/").replace(/^\.\/+/, "");
function unmappedCandidates(sources, candidates = []) {
  const mapped = new Set(sources.map((s) => normalizeLivePath(s.livePath)));
  return [...new Set(candidates.map(normalizeLivePath).filter((p) => p && !mapped.has(p)))];
}
async function hashSources({ wikiRoot, repoRoot = process.cwd() }) {
  const manifest = await loadManifest(wikiRoot, { repoRoot });
  const observations = [];
  for (const s of manifest.sources) observations.push(await observeSource(s, { wikiRoot, repoRoot }));
  return { manifest, observations, hashed: observations.length, missing: observations.filter((s) => s.state === "missing").map((s) => s.id), readOnly: true, transaction: await transactionState(wikiRoot) };
}
async function drift({ wikiRoot, repoRoot = process.cwd(), candidates = [], articleIds, reader }) {
  const manifest = await loadManifest(wikiRoot, { repoRoot });
  const report = await inspectArticles(manifest, { wikiRoot, repoRoot, articleIds, reader });
  const select = (state) => report.sourceStates.filter((s) => s.state === state).map((s) => s.id);
  return { changed: select("stale"), missing: select("missing"), unchanged: select("current"), unverified: select("unverified"), archived: select("archived"), articles: report.articleStates.filter((a) => a.state !== "current" && a.state !== "archived").map((a) => a.id), unmapped: unmappedCandidates(manifest.sources, candidates), humanOwned: report.articleStates.filter((a) => a.humanOwned).map((a) => a.id), ...report };
}
async function main() {
  const a = args(process.argv.slice(2), ["hash", "drift", "status"]);
  const options = { wikiRoot: resolveWikiRoot(a.wiki, a.repo), repoRoot: path.resolve(a.repo), candidates: a.candidates };
  const result = a.command === "hash" ? await hashSources(options) : await drift(options);
  if (a.command === "hash") delete result.manifest;
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(cliError);
export {
  drift,
  exists,
  hashSources,
  loadManifest,
  manifestPath,
  normalizeLivePath,
  resolveWikiRoot,
  sha256,
  unmappedCandidates
};
