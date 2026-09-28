#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exists, safePath, frontmatter, sourceSection, validateManifest, checkPaths, ownership, transactionState, cliError } from "./core.mjs";
import { drift } from "./inventory.mjs";
const INFRA = /* @__PURE__ */ new Set([
  "index.md",
  "log.md",
  "claude.md",
  "agents.md",
  "soul.md",
  "concept-table.md"
]);
const WIKILINK_RE = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
const SOURCE_HEADING_RE = /^##\s+来源\s*$/m;
const H1_RE = /^#\s+(.+?)\s*$/m;
function articlesDir(wikiRoot) {
  return path.join(wikiRoot, "wiki");
}
function extractLinks(text) {
  const ids = [];
  const invalid = [];
  WIKILINK_RE.lastIndex = 0;
  let match;
  while (match = WIKILINK_RE.exec(text)) {
    const target = match[1].trim();
    if (!target) continue;
    if (target.startsWith("../") || target.includes("/")) {
      invalid.push(target);
      continue;
    }
    ids.push(target);
  }
  return { ids, invalid };
}
async function lintWiki(wikiRoot, { repoRoot = process.cwd(), structureOnly = false } = {}) {
  const errors = [];
  let manifest;
  try {
    const mf = await safePath(wikiRoot, ".wiki-manifest.json");
    if (await exists(mf)) {
      manifest = JSON.parse(await readFile(mf, "utf8"));
      errors.push(...validateManifest(manifest));
      if (!errors.length) await checkPaths(manifest, { wikiRoot, repoRoot });
    }
    await safePath(wikiRoot, "wiki/index.md");
  } catch (error) {
    errors.push(error.message);
  }
  if (errors.length) {
    try {
      const files = await readdir(await safePath(wikiRoot, "wiki"));
      for (const file of files.filter((f) => f.endsWith(".md") && !INFRA.has(f.toLowerCase())))
        if (!manifest?.articles?.some((a) => a.file === `wiki/${file}`)) errors.push(`UNLISTED ARTICLE: ${file}`);
    } catch {
    }
    return { ok: false, errors, counts: {} };
  }
  const dir = articlesDir(wikiRoot);
  if (!await exists(path.join(dir, "index.md"))) {
    return { ok: false, errors: [`missing ${path.join(dir, "index.md")}`], counts: {} };
  }
  const names = (await readdir(dir)).filter((name) => name.endsWith(".md"));
  const articleFiles = names.filter((name) => !INFRA.has(name.toLowerCase()));
  const articleIds = new Set(articleFiles.map((name) => name.slice(0, -3)));
  let linkCount = 0;
  const indexText = await readFile(await safePath(wikiRoot, "wiki/index.md"), "utf8");
  const indexLinks = extractLinks(indexText);
  linkCount += indexLinks.ids.length;
  for (const target of indexLinks.invalid) errors.push(`CROSS-WIKI (index): [[${target}]]`);
  const indexed = /* @__PURE__ */ new Set();
  for (const id of indexLinks.ids) {
    indexed.add(id);
    if (!articleIds.has(id)) errors.push(`MISSING (index): [[${id}]]`);
  }
  for (const file of articleFiles) {
    const id = file.slice(0, -3);
    let text;
    try {
      text = await readFile(await safePath(wikiRoot, `wiki/${file}`), "utf8");
      frontmatter(text);
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    const heading = text.match(H1_RE);
    if (!heading || heading[1] !== id) errors.push(`H1 MISMATCH: ${file} expected # ${id}`);
    if (!sourceSection(text)) errors.push(`NO SOURCE SECTION: ${file}`);
    const article = manifest?.articles.find((a) => a.id === id);
    if (article && ownership(article, text).conflict) errors.push(`OWNERSHIP_CONFLICT: ${id}`);
    if (!indexed.has(id)) errors.push(`ORPHAN: ${file}`);
    const links = extractLinks(text);
    for (const target of links.invalid) errors.push(`CROSS-WIKI: ${file} -> [[${target}]]`);
    for (const target of links.ids) {
      linkCount += 1;
      if (!articleIds.has(target)) errors.push(`MISSING: ${file} -> [[${target}]]`);
    }
  }
  if (manifest) {
    const listed = new Set(manifest.articles.map((a) => a.file));
    for (const file of articleFiles) if (!listed.has(`wiki/${file}`)) errors.push(`UNLISTED ARTICLE: ${file}`);
    for (const a of manifest.articles) if (!await exists(await safePath(wikiRoot, a.file))) errors.push(`MANIFEST ARTICLE MISSING: ${a.file}`);
    for (const s of manifest.sources) if (s.rawPath && !await exists(await safePath(wikiRoot, s.rawPath))) errors.push(`RAW MISSING: ${s.id} (${s.rawPath})`);
    if (!structureOnly) {
      const report = await drift({ wikiRoot, repoRoot });
      for (const s of report.sourceStates) if (!["current", "archived"].includes(s.state)) errors.push(`STALE HASH / ${s.state}: ${s.id} (${s.reason})`);
      for (const a of report.articleStates) if (!["current", "archived"].includes(a.state)) errors.push(`ARTICLE ${a.state}: ${a.id} (${a.reason})`);
    }
  }
  const tx = await transactionState(wikiRoot);
  if (tx.incomplete || tx.state === "locked") errors.push("TRANSACTION_INCOMPLETE");
  return {
    ok: errors.length === 0,
    errors,
    counts: { articles: articleFiles.length, links: linkCount }
  };
}
async function main(argv = process.argv.slice(2)) {
  let wikiArg;
  let repoRoot = process.cwd();
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--repo") repoRoot = argv[++i];
    else if (!wikiArg && !argv[i].startsWith("-")) wikiArg = argv[i];
  }
  repoRoot = path.resolve(repoRoot);
  if (!wikiArg) {
    throw new Error("usage: lint-wikilinks.mjs <wiki-root> [--repo <repo-root>]");
  }
  const wikiRoot = path.resolve(repoRoot, wikiArg);
  const result = await lintWiki(wikiRoot, { repoRoot, structureOnly: argv.includes("--structure-only") });
  for (const error of result.errors) process.stdout.write(`${error}
`);
  process.stdout.write(
    `校验完成：${result.counts.articles || 0} 篇文章，${result.counts.links || 0} 条 wikilink
`
  );
  if (result.ok) process.stdout.write("通过：所有 wikilink / 来源 / 索引检查通过\n");
  else {
    process.stdout.write(
      "失败：存在缺失的 wikilink、孤儿页、来源小节、跨路径链接、H1 或 manifest 闭合问题\n"
    );
    process.exitCode = 1;
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(cliError);
}
export {
  INFRA,
  articlesDir,
  extractLinks,
  lintWiki
};
