#!/usr/bin/env node
import { readFile, readdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const INFRA = new Set(["index.md", "log.md", "claude.md", "agents.md", "soul.md"]);
const WIKILINK_RE = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
const SOURCE_HEADING_RE = /^##\s+来源\s*$/m;

export function articlesDir(wikiRoot) {
  return path.join(wikiRoot, "wiki");
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function extractLinks(text) {
  const ids = [];
  WIKILINK_RE.lastIndex = 0;
  let match;
  while ((match = WIKILINK_RE.exec(text))) {
    const target = match[1].trim();
    if (!target || target.startsWith("../") || target.includes("/")) continue;
    ids.push(target);
  }
  return ids;
}

export async function lintWiki(wikiRoot, { repoRoot = process.cwd() } = {}) {
  const dir = articlesDir(wikiRoot);
  if (!(await exists(path.join(dir, "index.md")))) {
    return { ok: false, errors: [`missing ${path.join(dir, "index.md")}`], counts: {} };
  }
  const names = (await readdir(dir)).filter((name) => name.endsWith(".md"));
  const articleFiles = names.filter((name) => !INFRA.has(name.toLowerCase()));
  const articleIds = new Set(articleFiles.map((name) => name.slice(0, -3)));
  const errors = [];
  let linkCount = 0;

  const indexText = await readFile(path.join(dir, "index.md"), "utf8");
  const indexIds = extractLinks(indexText);
  linkCount += indexIds.length;
  const indexed = new Set();
  for (const id of indexIds) {
    indexed.add(id);
    if (!articleIds.has(id)) errors.push(`MISSING (index): [[${id}]]`);
  }

  for (const file of articleFiles) {
    const id = file.slice(0, -3);
    const text = await readFile(path.join(dir, file), "utf8");
    if (!SOURCE_HEADING_RE.test(text)) errors.push(`NO SOURCE SECTION: ${file}`);
    if (!indexed.has(id)) errors.push(`ORPHAN: ${file}`);
    for (const target of extractLinks(text)) {
      linkCount += 1;
      if (!articleIds.has(target)) errors.push(`MISSING: ${file} -> [[${target}]]`);
    }
  }

  const manifestFile = path.join(wikiRoot, ".wiki-manifest.json");
  if (await exists(manifestFile)) {
    const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
    for (const article of manifest.articles || []) {
      const file = path.resolve(wikiRoot, article.file);
      if (!(await exists(file))) errors.push(`MANIFEST ARTICLE MISSING: ${article.file}`);
    }
    for (const source of manifest.sources || []) {
      if (!source.livePath) continue;
      const live = path.resolve(repoRoot, source.livePath);
      if (!(await exists(live))) errors.push(`MANIFEST SOURCE MISSING: ${source.id} (${source.livePath})`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    counts: { articles: articleFiles.length, links: linkCount },
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
  const result = await lintWiki(wikiRoot, { repoRoot });
  for (const error of result.errors) process.stdout.write(`${error}\n`);
  process.stdout.write(
    `校验完成：${result.counts.articles || 0} 篇文章，${result.counts.links || 0} 条 wikilink\n`,
  );
  if (result.ok) process.stdout.write("通过：所有 wikilink / 来源 / 索引检查通过\n");
  else {
    process.stdout.write("失败：存在缺失的 wikilink、孤儿页、来源小节或 manifest 条目\n");
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  });
}
