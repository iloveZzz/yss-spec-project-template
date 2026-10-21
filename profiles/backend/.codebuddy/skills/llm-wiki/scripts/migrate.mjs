#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadManifest, safePath, digestFile, sha256, json, ownership, fail, args, cliError } from "./core.mjs";
import { createPlan, applyPlan } from "./transaction.mjs";
async function migrate({ wikiRoot, repoRoot = process.cwd(), apply = false }) {
  const prior = await loadManifest(wikiRoot, { repoRoot });
  if (prior.schemaVersion === 2) return { schemaVersion: 2, changed: false, readOnly: !apply };
  const original = await readFile(await safePath(wikiRoot, ".wiki-manifest.json"), "utf8");
  const manifest = structuredClone(prior);
  manifest.schemaVersion = 2;
  manifest.profile ||= "mixed";
  manifest.feedback = [];
  for (const s of manifest.sources) {
    s.originalDigest = s.sha256 || null;
    s.effectiveDigest = s.kind === "derived" ? null : s.sha256 || null;
    s.rawDigest = s.rawPath ? await digestFile(await safePath(wikiRoot, s.rawPath)) : null;
    s.location = s.livePath || s.url || `snapshot:${s.rawPath}`;
    if (s.kind === "derived") {
      s.extract = { ...s.extract, version: "1", inputs: s.extract?.inputs || [s.livePath].filter(Boolean) };
      if (s.extract.kind === "prose-note") {
        s.extract.inputDigests = {};
        s.extract.rules ||= "legacy-unknown; explicit recipe required before recompilation";
      }
    }
  }
  for (const a of manifest.articles) {
    a.articleDigest = null;
    a.compiledFrom = {};
    a.compiledDependencies = {};
    a.verification = null;
    a.dependsOnArticles ||= [];
    a.aliases ||= [];
    const text = await readFile(await safePath(wikiRoot, a.file), "utf8");
    a.humanOwned = ownership(a, text).protected;
  }
  const backup = `.wiki-backups/manifest-v1-${sha256(original)}.json`;
  const plan = await createPlan({ wikiRoot, repoRoot, request: { operation: "migrate", manifest, writes: [{ path: backup, content: original }], authorization: { confirmed: true, paths: [backup, ".wiki-manifest.json", "wiki/log.md"] } } });
  if (!apply) return { changed: true, readOnly: true, backup, plan };
  return { ...await applyPlan({ wikiRoot, repoRoot, plan }), changed: true, backup, remaining: "unverified; migration does not compile articles" };
}
async function main() {
  const a = args(process.argv.slice(2));
  if (!a.wiki) fail("USAGE", "migrate.mjs --wiki <root> [--repo <root>] [--apply]");
  process.stdout.write(json(await migrate({ wikiRoot: path.resolve(a.repo, a.wiki), repoRoot: path.resolve(a.repo), apply: a.apply === true })));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(cliError);
export {
  migrate
};
