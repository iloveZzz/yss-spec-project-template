#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXTRACT_KINDS } from "./extract.mjs";
import { exists, sha256 } from "./inventory.mjs";

const INFRA = new Set(["index.md", "log.md", "claude.md", "agents.md", "soul.md"]);
const WIKILINK_RE = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
const SOURCE_HEADING_RE = /^##\s+来源\s*$/m;
const H1_RE = /^#\s+(.+?)\s*$/m;

export function articlesDir(wikiRoot) {
  return path.join(wikiRoot, "wiki");
}

function extractLinks(text) {
  const ids = [];
  const invalid = [];
  WIKILINK_RE.lastIndex = 0;
  let match;
  while ((match = WIKILINK_RE.exec(text))) {
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
  const indexLinks = extractLinks(indexText);
  linkCount += indexLinks.ids.length;
  for (const target of indexLinks.invalid) errors.push(`CROSS-WIKI (index): [[${target}]]`);
  const indexed = new Set();
  for (const id of indexLinks.ids) {
    indexed.add(id);
    if (!articleIds.has(id)) errors.push(`MISSING (index): [[${id}]]`);
  }

  for (const file of articleFiles) {
    const id = file.slice(0, -3);
    const text = await readFile(path.join(dir, file), "utf8");
    const heading = text.match(H1_RE);
    if (!heading || heading[1] !== id) errors.push(`H1 MISMATCH: ${file} expected # ${id}`);
    if (!SOURCE_HEADING_RE.test(text)) errors.push(`NO SOURCE SECTION: ${file}`);
    if (!indexed.has(id)) errors.push(`ORPHAN: ${file}`);
    const links = extractLinks(text);
    for (const target of links.invalid) errors.push(`CROSS-WIKI: ${file} -> [[${target}]]`);
    for (const target of links.ids) {
      linkCount += 1;
      if (!articleIds.has(target)) errors.push(`MISSING: ${file} -> [[${target}]]`);
    }
  }

  const manifestFile = path.join(wikiRoot, ".wiki-manifest.json");
  if (await exists(manifestFile)) {
    const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
    const sourceById = new Map();
    for (const source of manifest.sources || []) {
      if (source?.id) sourceById.set(source.id, source);
    }
    const listedFiles = new Set();
    for (const article of manifest.articles || []) {
      const rel = path.posix.normalize(article.file || "");
      listedFiles.add(rel);
      const expectedId = path.posix.basename(rel, ".md");
      if (article.id !== expectedId) {
        errors.push(`MANIFEST ID MISMATCH: ${article.file} id=${article.id} expected ${expectedId}`);
      }
      const file = path.resolve(wikiRoot, article.file);
      if (!(await exists(file))) errors.push(`MANIFEST ARTICLE MISSING: ${article.file}`);
      for (const sourceId of article.sourceIds || []) {
        if (!sourceById.has(sourceId)) {
          errors.push(`UNKNOWN SOURCE ID: ${article.id} -> ${sourceId}`);
        }
      }
    }
    for (const file of articleFiles) {
      const rel = path.posix.join("wiki", file);
      if (!listedFiles.has(rel)) errors.push(`UNLISTED ARTICLE: ${file}`);
    }
    for (const source of manifest.sources || []) {
      if (manifest.profile === "documents" && source.kind === "code-surface") {
        errors.push(`PROFILE KIND: documents forbids code-surface (${source.id})`);
      }
      if (source.kind === "document" || source.kind === "derived") {
        if (!source.rawPath) {
          errors.push(`RAW PATH REQUIRED: ${source.id} (${source.kind})`);
        } else {
          const raw = path.resolve(wikiRoot, source.rawPath);
          if (!(await exists(raw))) errors.push(`RAW MISSING: ${source.id} (${source.rawPath})`);
        }
      }
      if (source.kind === "derived") {
        const extractKind = source.extract?.kind;
        if (!extractKind) errors.push(`EXTRACT REQUIRED: ${source.id}`);
        else if (!EXTRACT_KINDS.includes(extractKind)) {
          errors.push(`EXTRACT KIND: ${source.id} (${extractKind})`);
        }
      }
      if (source.kind === "code-surface" && source.rawPath != null) {
        errors.push(`RAW PATH FORBIDDEN: ${source.id} (code-surface)`);
      }
      if (!source.livePath) continue;
      const live = path.resolve(repoRoot, source.livePath);
      if (!(await exists(live))) {
        errors.push(`MANIFEST SOURCE MISSING: ${source.id} (${source.livePath})`);
        continue;
      }
      const current = sha256(await readFile(live));
      if (!source.sha256 || current !== source.sha256) {
        errors.push(`STALE HASH: ${source.id} (${source.livePath})`);
      }
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
    process.stdout.write(
      "失败：存在缺失的 wikilink、孤儿页、来源小节、跨路径链接、H1 或 manifest 闭合问题\n",
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  });
}
