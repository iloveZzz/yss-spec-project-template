import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { sha256 } from "./inventory.mjs";
import { lintWiki } from "./lint-wikilinks.mjs";

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const broken = path.join(skillRoot, "assets/fixtures/broken-wiki");

test("broken fixture fails on dangling wikilink", async () => {
  const result = await lintWiki(broken);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((line) => line.includes("[[不存在的页]]")));
});

test("complete wiki passes wikilink, index, and source-section checks", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "llm-wiki-lint-"));
  const wiki = path.join(root, "wiki");
  await mkdir(wiki, { recursive: true });
  await writeFile(
    path.join(wiki, "index.md"),
    "# index\n\n## 分类\n\n- [[Alpha]]\n",
    "utf8",
  );
  await writeFile(
    path.join(wiki, "Alpha.md"),
    "# Alpha\n\nSee [[Alpha]].\n\n## 来源\n\n- live\n",
    "utf8",
  );
  await writeFile(path.join(wiki, "CLAUDE.md"), "# schema\n", "utf8");
  const result = await lintWiki(root);
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.counts.articles, 1);
});

test("cross-path wikilink fails instead of being ignored", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "llm-wiki-cross-"));
  const wiki = path.join(root, "wiki");
  await mkdir(wiki, { recursive: true });
  await writeFile(path.join(wiki, "index.md"), "# index\n\n## 分类\n\n- [[Alpha]]\n", "utf8");
  await writeFile(
    path.join(wiki, "Alpha.md"),
    "# Alpha\n\nSee [[../other]]\n\n## 来源\n\n- live\n",
    "utf8",
  );
  const result = await lintWiki(root);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((line) => line.includes("CROSS-WIKI") && line.includes("[[../other]]")));
});

test("manifest sha256 mismatch is stale", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "llm-wiki-hash-"));
  const wikiRoot = path.join(repo, "wiki-root");
  const wiki = path.join(wikiRoot, "wiki");
  await mkdir(wiki, { recursive: true });
  await mkdir(path.join(wikiRoot, "raw"), { recursive: true });
  await mkdir(path.join(repo, "docs"), { recursive: true });
  const liveRel = "docs/api.md";
  await writeFile(path.join(repo, liveRel), "v2\n", "utf8");
  await writeFile(path.join(wikiRoot, "raw", "api.md"), "v1\n", "utf8");
  await writeFile(path.join(wiki, "index.md"), "# index\n\n## 分类\n\n- [[API]]\n", "utf8");
  await writeFile(path.join(wiki, "API.md"), "# API\n\nSummary.\n\n## 来源\n\n- live\n", "utf8");
  await writeFile(
    path.join(wikiRoot, ".wiki-manifest.json"),
    JSON.stringify({
      schemaVersion: 1,
      sources: [
        {
          id: "api.md",
          kind: "document",
          livePath: liveRel,
          rawPath: "raw/api.md",
          sha256: sha256(Buffer.from("v1\n")),
        },
      ],
      articles: [{ id: "API", file: "wiki/API.md", sourceIds: ["api.md"] }],
    }),
    "utf8",
  );
  const result = await lintWiki(wikiRoot, { repoRoot: repo });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((line) => line.includes("STALE HASH") && line.includes("api.md")));
});

async function seedClosedWiki() {
  const repo = await mkdtemp(path.join(tmpdir(), "llm-wiki-closed-"));
  const wikiRoot = path.join(repo, "wiki-root");
  const wiki = path.join(wikiRoot, "wiki");
  await mkdir(wiki, { recursive: true });
  await mkdir(path.join(wikiRoot, "raw"), { recursive: true });
  await mkdir(path.join(repo, "docs"), { recursive: true });
  const liveRel = "docs/api.md";
  await writeFile(path.join(repo, liveRel), "v1\n", "utf8");
  await writeFile(path.join(wikiRoot, "raw", "api.md"), "v1\n", "utf8");
  await writeFile(path.join(wiki, "index.md"), "# index\n\n## 分类\n\n- [[Alpha]]\n", "utf8");
  await writeFile(
    path.join(wiki, "Alpha.md"),
    "# Alpha\n\nSee [[Alpha]].\n\n## 来源\n\n- live\n",
    "utf8",
  );
  const manifest = {
    schemaVersion: 1,
    profile: "documents",
    sources: [
      {
        id: "api.md",
        kind: "document",
        livePath: liveRel,
        rawPath: "raw/api.md",
        sha256: sha256(Buffer.from("v1\n")),
      },
    ],
    articles: [{ id: "Alpha", file: "wiki/Alpha.md", sourceIds: ["api.md"] }],
  };
  await writeFile(path.join(wikiRoot, ".wiki-manifest.json"), JSON.stringify(manifest), "utf8");
  return { repo, wikiRoot, wiki, manifest };
}

test("closed manifest passes listing, id, sourceIds, profile, and rawPath checks", async () => {
  const { repo, wikiRoot } = await seedClosedWiki();
  const result = await lintWiki(wikiRoot, { repoRoot: repo });
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("open manifest fails unlisted article, id mismatch, unknown source, profile kind, and rawPath", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "llm-wiki-open-"));
  const wikiRoot = path.join(repo, "wiki-root");
  const wiki = path.join(wikiRoot, "wiki");
  await mkdir(wiki, { recursive: true });
  await mkdir(path.join(repo, "docs"), { recursive: true });
  await writeFile(path.join(repo, "docs", "api.md"), "v1\n", "utf8");
  await writeFile(path.join(wiki, "index.md"), "# index\n\n## 分类\n\n- [[Alpha]]\n- [[Beta]]\n", "utf8");
  await writeFile(path.join(wiki, "Alpha.md"), "# Alpha\n\nSee [[Beta]].\n\n## 来源\n\n- live\n", "utf8");
  await writeFile(path.join(wiki, "Beta.md"), "# Beta\n\nSee [[Alpha]].\n\n## 来源\n\n- live\n", "utf8");
  await writeFile(
    path.join(wikiRoot, ".wiki-manifest.json"),
    JSON.stringify({
      schemaVersion: 1,
      profile: "documents",
      sources: [
        {
          id: "api.md",
          kind: "code-surface",
          livePath: "docs/api.md",
          rawPath: "raw/should-not-exist.md",
          sha256: sha256(Buffer.from("v1\n")),
        },
        {
          id: "note",
          kind: "document",
          livePath: "docs/api.md",
          rawPath: "",
          sha256: sha256(Buffer.from("v1\n")),
        },
      ],
      articles: [
        {
          id: "WrongId",
          file: "wiki/Alpha.md",
          sourceIds: ["api.md", "ghost"],
        },
      ],
    }),
    "utf8",
  );
  const result = await lintWiki(wikiRoot, { repoRoot: repo });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((line) => line.includes("UNLISTED ARTICLE") && line.includes("Beta.md")));
  assert.ok(result.errors.some((line) => line.includes("MANIFEST ID MISMATCH") && line.includes("WrongId")));
  assert.ok(result.errors.some((line) => line.includes("UNKNOWN SOURCE ID") && line.includes("ghost")));
  assert.ok(result.errors.some((line) => line.includes("PROFILE KIND") && line.includes("code-surface")));
  assert.ok(result.errors.some((line) => line.includes("RAW PATH REQUIRED") && line.includes("note")));
  assert.ok(result.errors.some((line) => line.includes("RAW PATH FORBIDDEN") && line.includes("api.md")));
});

test("derived source requires a known extract.kind", async () => {
  const { repo, wikiRoot, manifest } = await seedClosedWiki();
  manifest.sources.push({
    id: "lock",
    kind: "derived",
    livePath: "docs/api.md",
    rawPath: "raw/api.md",
    sha256: sha256(Buffer.from("v1\n")),
  });
  await writeFile(path.join(wikiRoot, ".wiki-manifest.json"), JSON.stringify(manifest), "utf8");
  const missing = await lintWiki(wikiRoot, { repoRoot: repo });
  assert.equal(missing.ok, false);
  assert.ok(missing.errors.some((line) => line.includes("EXTRACT REQUIRED") && line.includes("lock")));

  manifest.sources.at(-1).extract = { kind: "whole-file" };
  await writeFile(path.join(wikiRoot, ".wiki-manifest.json"), JSON.stringify(manifest), "utf8");
  const unknown = await lintWiki(wikiRoot, { repoRoot: repo });
  assert.equal(unknown.ok, false);
  assert.ok(unknown.errors.some((line) => line.includes("EXTRACT KIND") && line.includes("whole-file")));

  manifest.sources.at(-1).extract = { kind: "skill-names" };
  await writeFile(path.join(wikiRoot, ".wiki-manifest.json"), JSON.stringify(manifest), "utf8");
  const ok = await lintWiki(wikiRoot, { repoRoot: repo });
  assert.equal(ok.ok, true, ok.errors.join("\n"));
});

test("document rawPath must exist on disk", async () => {
  const { repo, wikiRoot, manifest } = await seedClosedWiki();
  manifest.sources[0].rawPath = "raw/missing.md";
  await writeFile(path.join(wikiRoot, ".wiki-manifest.json"), JSON.stringify(manifest), "utf8");
  const result = await lintWiki(wikiRoot, { repoRoot: repo });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((line) => line.includes("RAW MISSING") && line.includes("raw/missing.md")));
});
