#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MANIFEST = ".wiki-manifest.json";

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function resolveWikiRoot(wikiArg, cwd = process.cwd()) {
  if (!wikiArg) throw new Error("missing --wiki <wiki-root>");
  return path.resolve(cwd, wikiArg);
}

export function manifestPath(wikiRoot) {
  return path.join(wikiRoot, MANIFEST);
}

export async function loadManifest(wikiRoot) {
  const file = manifestPath(wikiRoot);
  const raw = await readFile(file, "utf8");
  return JSON.parse(raw);
}

export async function saveManifest(wikiRoot, manifest) {
  const file = manifestPath(wikiRoot);
  await writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return file;
}

export async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

export function gitCommit(repoRoot) {
  try {
    return execFileSync("git", ["-C", repoRoot, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

export async function hashSources({ wikiRoot, repoRoot, now = new Date().toISOString() }) {
  const manifest = await loadManifest(wikiRoot);
  const missing = [];
  for (const source of manifest.sources || []) {
    if (!source.livePath) {
      source.sha256 = "";
      continue;
    }
    const live = path.resolve(repoRoot, source.livePath);
    if (!(await exists(live))) {
      missing.push(source.id);
      source.sha256 = "";
      continue;
    }
    source.sha256 = sha256(await readFile(live));
  }
  manifest.compiledAt = now;
  manifest.gitCommit = gitCommit(repoRoot);
  await saveManifest(wikiRoot, manifest);
  return { manifest, missing };
}

export async function drift({ wikiRoot, repoRoot }) {
  const manifest = await loadManifest(wikiRoot);
  const changed = [];
  const missing = [];
  const unchanged = [];
  for (const source of manifest.sources || []) {
    if (!source.livePath) {
      unchanged.push(source.id);
      continue;
    }
    const live = path.resolve(repoRoot, source.livePath);
    if (!(await exists(live))) {
      missing.push(source.id);
      continue;
    }
    const current = sha256(await readFile(live));
    if (current !== source.sha256) changed.push(source.id);
    else unchanged.push(source.id);
  }
  const hit = new Set([...changed, ...missing]);
  const articles = (manifest.articles || [])
    .filter((article) => (article.sourceIds || []).some((id) => hit.has(id)))
    .map((article) => article.id);
  return { changed, missing, unchanged, articles };
}

function parseArgs(argv) {
  const args = { command: argv[0], wiki: null, repo: process.cwd() };
  for (let i = 1; i < argv.length; i += 1) {
    if (argv[i] === "--wiki") args.wiki = argv[++i];
    else if (argv[i] === "--repo") args.repo = argv[++i];
    else if (!args.wiki && !argv[i].startsWith("-")) args.wiki = argv[i];
  }
  return args;
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (!args.command || !["hash", "drift"].includes(args.command)) {
    throw new Error("usage: inventory.mjs hash|drift --wiki <wiki-root> [--repo <repo-root>]");
  }
  const wikiRoot = resolveWikiRoot(args.wiki, args.repo);
  const repoRoot = path.resolve(args.repo);
  if (!(await exists(manifestPath(wikiRoot)))) {
    throw new Error(`manifest not found: ${manifestPath(wikiRoot)}`);
  }
  if (args.command === "hash") {
    const result = await hashSources({ wikiRoot, repoRoot });
    process.stdout.write(
      `${JSON.stringify({ hashed: (result.manifest.sources || []).length, missing: result.missing }, null, 2)}\n`,
    );
    if (result.missing.length) process.exitCode = 1;
    return;
  }
  const report = await drift({ wikiRoot, repoRoot });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.changed.length || report.missing.length) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  });
}
