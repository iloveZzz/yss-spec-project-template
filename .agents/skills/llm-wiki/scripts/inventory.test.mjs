import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { drift, hashSources, sha256 } from "./inventory.mjs";

const inventoryCli = fileURLToPath(new URL("./inventory.mjs", import.meta.url));

async function seed() {
  const repo = await mkdtemp(path.join(tmpdir(), "llm-wiki-inv-"));
  const wiki = path.join(repo, "wiki-root");
  await mkdir(path.join(wiki, "raw"), { recursive: true });
  const liveRel = "docs/api.md";
  const live = path.join(repo, liveRel);
  await mkdir(path.dirname(live), { recursive: true });
  await writeFile(live, "v1\n", "utf8");
  await writeFile(
    path.join(wiki, ".wiki-manifest.json"),
    JSON.stringify({
      schemaVersion: 1,
      wikiRoot: "wiki-root",
      profile: "documents",
      sources: [
        {
          id: "api.md",
          kind: "document",
          livePath: liveRel,
          rawPath: "raw/api.md",
          sha256: "",
          role: "copy",
        },
      ],
      articles: [{ id: "API契约", file: "wiki/API契约.md", sourceIds: ["api.md"], humanOwned: false }],
    }),
    "utf8",
  );
  return { repo, wiki, live, liveRel };
}

test("hash-sources fills sha256; drift is empty until live file changes", async () => {
  const { repo, wiki, live } = await seed();
  const hashed = await hashSources({ wikiRoot: wiki, repoRoot: repo, now: "2026-01-01T00:00:00Z" });
  assert.equal(hashed.missing.length, 0);
  assert.equal(hashed.manifest.sources[0].sha256, sha256(Buffer.from("v1\n")));
  const clean = await drift({ wikiRoot: wiki, repoRoot: repo });
  assert.deepEqual(clean.changed, []);
  assert.deepEqual(clean.articles, []);
  await writeFile(live, "v2\n", "utf8");
  const dirty = await drift({ wikiRoot: wiki, repoRoot: repo });
  assert.deepEqual(dirty.changed, ["api.md"]);
  assert.deepEqual(dirty.articles, ["API契约"]);
});

test("drift CLI exits 0 when sources changed and prints JSON", async () => {
  const { repo, wiki, live } = await seed();
  await hashSources({ wikiRoot: wiki, repoRoot: repo, now: "2026-01-01T00:00:00Z" });
  await writeFile(live, "v2\n", "utf8");
  const ran = spawnSync(process.execPath, [inventoryCli, "drift", "--wiki", wiki, "--repo", repo], {
    encoding: "utf8",
  });
  assert.equal(ran.status, 0, ran.stderr);
  const report = JSON.parse(ran.stdout);
  assert.deepEqual(report.changed, ["api.md"]);
  assert.deepEqual(report.articles, ["API契约"]);
});
