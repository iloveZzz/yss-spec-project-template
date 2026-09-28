#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exists } from "./inventory.mjs";
import { articlesDir, extractLinks, INFRA } from "./lint-wikilinks.mjs";

const SOURCE_HEADING_RE = /^##\s+来源\s*$/m;
const H1_RE = /^#\s+(.+?)\s*$/m;
const NUMBER_RE = /\b\d+(?:\.\d+)?[A-Za-z%]+\b/g;
const ISO_DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/g;
const LONG_QUOTE_RE = /[“"]([^”"]{12,})[”"]/g;
const BACKTICK_RE = /`([^`\n]{2,64})`/g;
const BOLD_RE = /\*\*([^*]{2,32})\*\*/g;
const HEADING_RE = /^#{2,6}\s+(.+)$/gm;

export function sourceSection(text) {
  const match = text.match(SOURCE_HEADING_RE);
  if (!match) return "";
  return text.slice(match.index + match[0].length);
}

export function firstParagraph(text) {
  const afterH1 = text.replace(/^---[\s\S]*?---\s*/, "").replace(H1_RE, "").trimStart();
  const block = afterH1.split(/\n\s*\n/)[0] || "";
  return block.trim();
}

export function articleBody(text) {
  const source = text.search(SOURCE_HEADING_RE);
  const head = source === -1 ? text : text.slice(0, source);
  return head.replace(/^---[\s\S]*?---\s*/, "");
}

export function highSignalLiterals(text) {
  const found = new Set();
  for (const match of text.matchAll(NUMBER_RE)) found.add(match[0]);
  for (const match of text.matchAll(ISO_DATE_RE)) found.add(match[0]);
  for (const match of text.matchAll(LONG_QUOTE_RE)) found.add(match[1]);
  return [...found];
}

function addTerm(counter, term) {
  const value = term.trim();
  if (!value) return;
  counter.set(value, (counter.get(value) || 0) + 1);
}

export function collectTerms(text) {
  const body = articleBody(text);
  const counter = new Map();
  for (const match of body.matchAll(BACKTICK_RE)) addTerm(counter, match[1]);
  for (const match of body.matchAll(BOLD_RE)) addTerm(counter, match[1]);
  for (const match of body.matchAll(HEADING_RE)) addTerm(counter, match[1]);
  return counter;
}

export async function loadArticles(wikiRoot) {
  const dir = articlesDir(wikiRoot);
  const names = (await readdir(dir)).filter((name) => name.endsWith(".md"));
  const files = names.filter((name) => !INFRA.has(name.toLowerCase()));
  const articles = [];
  for (const file of files) {
    const text = await readFile(path.join(dir, file), "utf8");
    articles.push({
      id: file.slice(0, -3),
      file,
      text,
      links: extractLinks(text).ids,
    });
  }
  return articles;
}

export function oneWayLinks(articles) {
  const inbound = new Map();
  for (const article of articles) inbound.set(article.id, new Set());
  for (const article of articles) {
    for (const target of article.links) {
      if (!inbound.has(target)) continue;
      inbound.get(target).add(article.id);
    }
  }
  const findings = [];
  for (const article of articles) {
    for (const target of new Set(article.links)) {
      if (target === article.id) continue;
      if (!inbound.has(target)) continue;
      if (inbound.get(article.id).has(target)) continue;
      findings.push({ from: article.id, to: target });
    }
  }
  return findings;
}

export function missingTermPages(articles) {
  const ids = new Set(articles.map((article) => article.id));
  const counts = new Map();
  for (const article of articles) {
    const local = collectTerms(article.text);
    for (const [term, count] of local) {
      if (ids.has(term)) continue;
      counts.set(term, (counts.get(term) || 0) + count);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term));
}

export function unreferencedRaws(manifest, articles) {
  const cited = articles.map((article) => sourceSection(article.text)).join("\n");
  const findings = [];
  for (const source of manifest.sources || []) {
    if (!source.rawPath) continue;
    if (cited.includes(source.rawPath) || cited.includes(source.id)) continue;
    findings.push({ id: source.id, rawPath: source.rawPath });
  }
  return findings;
}

async function citedCorpus({ wikiRoot, repoRoot, article, manifest }) {
  const cited = sourceSection(article.text);
  const chunks = [cited];
  for (const source of manifest.sources || []) {
    const mentioned =
      (source.rawPath && cited.includes(source.rawPath)) ||
      (source.id && cited.includes(source.id)) ||
      (source.livePath && cited.includes(source.livePath));
    if (!mentioned) continue;
    if (source.rawPath) {
      const raw = path.resolve(wikiRoot, source.rawPath);
      if (await exists(raw)) chunks.push(await readFile(raw, "utf8"));
    }
    if (source.livePath) {
      const live = path.resolve(repoRoot, source.livePath);
      if (await exists(live)) chunks.push(await readFile(live, "utf8"));
    }
  }
  return chunks.join("\n");
}

export async function evidenceSuspects({ wikiRoot, repoRoot, articles, manifest }) {
  const findings = [];
  for (const article of articles) {
    const literals = highSignalLiterals(articleBody(article.text));
    if (!literals.length) continue;
    const corpus = await citedCorpus({ wikiRoot, repoRoot, article, manifest });
    for (const value of literals) {
      if (!corpus.includes(value)) {
        findings.push({ article: article.id, value });
      }
    }
  }
  return findings;
}

export async function adviseWiki(wikiRoot, { repoRoot = process.cwd() } = {}) {
  const articles = await loadArticles(wikiRoot);
  const manifestFile = path.join(wikiRoot, ".wiki-manifest.json");
  const manifest = (await exists(manifestFile))
    ? JSON.parse(await readFile(manifestFile, "utf8"))
    : { sources: [] };
  return {
    oneWayLinks: oneWayLinks(articles),
    missingTermPages: missingTermPages(articles),
    unreferencedRaws: unreferencedRaws(manifest, articles),
    suspects: await evidenceSuspects({ wikiRoot, repoRoot, articles, manifest }),
  };
}

function parseArgs(argv) {
  const args = { wiki: null, repo: process.cwd() };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--repo") args.repo = argv[++i];
    else if (argv[i] === "--wiki") args.wiki = argv[++i];
    else if (!args.wiki && !argv[i].startsWith("-")) args.wiki = argv[i];
  }
  return args;
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (!args.wiki) throw new Error("usage: advise.mjs <wiki-root> [--repo <repo-root>]");
  const wikiRoot = path.resolve(args.repo, args.wiki);
  const report = await adviseWiki(wikiRoot, { repoRoot: path.resolve(args.repo) });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  });
}
