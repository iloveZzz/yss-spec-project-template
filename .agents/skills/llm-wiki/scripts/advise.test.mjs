import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { sha256 } from "./inventory.mjs";
import { adviseWiki } from "./advise.mjs";
import { lintWiki } from "./lint-wikilinks.mjs";

const adviseCli = fileURLToPath(new URL("./advise.mjs", import.meta.url));

async function seedAdvise() {
  const repo = await mkdtemp(path.join(tmpdir(), "llm-wiki-advise-"));
  const wikiRoot = path.join(repo, "wiki-root");
  const wiki = path.join(wikiRoot, "wiki");
  await mkdir(wiki, { recursive: true });
  await mkdir(path.join(wikiRoot, "raw"), { recursive: true });
  await mkdir(path.join(repo, "docs"), { recursive: true });
  await writeFile(path.join(repo, "docs", "api.md"), "version one\n", "utf8");
  await writeFile(path.join(wikiRoot, "raw", "api.md"), "version one\n", "utf8");
  await writeFile(path.join(wikiRoot, "raw", "orphan-raw.md"), "unused\n", "utf8");
  await writeFile(path.join(wiki, "index.md"), "# index\n\n## 分类\n\n- [[Alpha]]\n- [[Beta]]\n", "utf8");
  await writeFile(
    path.join(wiki, "Alpha.md"),
    "# Alpha\n\nSee [[Beta]] and **孤立术语**. The figure is 42K.\n\n## 来源\n\n- raw/api.md\n",
    "utf8",
  );
  await writeFile(
    path.join(wiki, "Beta.md"),
    "# Beta\n\nMentions **孤立术语** again.\n\n## 来源\n\n- raw/api.md\n",
    "utf8",
  );
  await writeFile(path.join(wiki, "concept-table.md"), "# concepts\n", "utf8");
  await writeFile(
    path.join(wikiRoot, ".wiki-manifest.json"),
    JSON.stringify({
      schemaVersion: 1,
      profile: "documents",
      sources: [
        {
          id: "api.md",
          kind: "document",
          livePath: "docs/api.md",
          rawPath: "raw/api.md",
          sha256: sha256(Buffer.from("version one\n")),
        },
        {
          id: "orphan-raw.md",
          kind: "document",
          livePath: "docs/api.md",
          rawPath: "raw/orphan-raw.md",
          sha256: sha256(Buffer.from("version one\n")),
        },
      ],
      articles: [
        { id: "Alpha", file: "wiki/Alpha.md", sourceIds: ["api.md"] },
        { id: "Beta", file: "wiki/Beta.md", sourceIds: ["api.md"] },
      ],
    }),
    "utf8",
  );
  return { repo, wikiRoot };
}

test("advise reports one-way links, missing terms, unreferenced raw, and suspects without failing lint", async () => {
  const { repo, wikiRoot } = await seedAdvise();
  const lint = await lintWiki(wikiRoot, { repoRoot: repo });
  assert.equal(lint.ok, true, lint.errors.join("\n"));
  const report = await adviseWiki(wikiRoot, { repoRoot: repo });
  assert.ok(report.oneWayLinks.some((item) => item.from === "Alpha" && item.to === "Beta"));
  assert.ok(report.missingTermPages.some((item) => item.term === "孤立术语" && item.count >= 2));
  assert.ok(report.unreferencedRaws.some((item) => item.rawPath === "raw/orphan-raw.md"));
  assert.ok(report.suspects.some((item) => item.article === "Alpha" && item.value === "42K"));
});

test("advise CLI exits 0 and prints JSON", async () => {
  const { repo, wikiRoot } = await seedAdvise();
  const ran = spawnSync(process.execPath, [adviseCli, wikiRoot, "--repo", repo], { encoding: "utf8" });
  assert.equal(ran.status, 0, ran.stderr);
  const report = JSON.parse(ran.stdout);
  assert.ok(Array.isArray(report.suspects));
});

test("concept-table.md is infrastructure and does not fail lint as an orphan", async () => {
  const { repo, wikiRoot } = await seedAdvise();
  const lint = await lintWiki(wikiRoot, { repoRoot: repo });
  assert.equal(lint.ok, true, lint.errors.join("\n"));
  assert.equal(lint.counts.articles, 2);
});
