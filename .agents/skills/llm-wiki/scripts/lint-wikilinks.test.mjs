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
  const wiki = path.join(repo, "wiki-root", "wiki");
  await mkdir(wiki, { recursive: true });
  await mkdir(path.join(repo, "docs"), { recursive: true });
  const liveRel = "docs/api.md";
  await writeFile(path.join(repo, liveRel), "v2\n", "utf8");
  await writeFile(path.join(wiki, "index.md"), "# index\n\n## 分类\n\n- [[API]]\n", "utf8");
  await writeFile(path.join(wiki, "API.md"), "# API\n\nSummary.\n\n## 来源\n\n- live\n", "utf8");
  await writeFile(
    path.join(repo, "wiki-root", ".wiki-manifest.json"),
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
  const result = await lintWiki(path.join(repo, "wiki-root"), { repoRoot: repo });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((line) => line.includes("STALE HASH") && line.includes("api.md")));
});
