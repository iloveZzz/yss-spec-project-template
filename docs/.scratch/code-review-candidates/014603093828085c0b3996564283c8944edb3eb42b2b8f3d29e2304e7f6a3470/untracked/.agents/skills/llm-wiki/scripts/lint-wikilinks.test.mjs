import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
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
