import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
const root = process.env.WIKI_BASELINE_SCRIPTS;
const { drift, hashSources, sha256 } = await (root ? import(pathToFileURL(path.join(root, "inventory.mjs"))) : import("./inventory.mjs"));
const { lintWiki } = await (root ? import(pathToFileURL(path.join(root, "lint-wikilinks.mjs"))) : import("./lint-wikilinks.mjs"));
async function fixture(t) {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "wiki-regression-"));
  t.after(() => rm(repoRoot, { recursive: true, force: true }));
  const wikiRoot = path.join(repoRoot, "kb");
  await mkdir(path.join(wikiRoot, "wiki"), { recursive: true });
  await mkdir(path.join(wikiRoot, "raw"));
  const source = "初始说明。\n";
  const article = "# Alpha\n\n初始说明。\n\n## 来源\n\n- source: source.md:1\n";
  const manifest = { schemaVersion: 1, profile: "documents", compiledAt: "2026-01-01", sources: [{ id: "source", kind: "document", livePath: "source.md", rawPath: "raw/source.md", sha256: sha256(source) }], articles: [{ id: "Alpha", file: "wiki/Alpha.md", sourceIds: ["source"], humanOwned: false }] };
  const put = (rel, text) => writeFile(path.join(wikiRoot, rel), text);
  const save = () => put(".wiki-manifest.json", JSON.stringify(manifest));
  await writeFile(path.join(repoRoot, "source.md"), source);
  await put("raw/source.md", source);
  await put("wiki/Alpha.md", article);
  await put("wiki/index.md", "# index\n\n- [[Alpha]]\n");
  await save();
  return { repoRoot, wikiRoot, manifest, save, put, source, article };
}
test("regression: hash observes without clearing drift or rewriting the manifest", async (t) => {
  const f = await fixture(t);
  await writeFile(path.join(f.repoRoot, "source.md"), "changed\n");
  const before = await readFile(path.join(f.wikiRoot, ".wiki-manifest.json"));
  await hashSources(f);
  assert.deepEqual(await readFile(path.join(f.wikiRoot, ".wiki-manifest.json")), before);
  assert.deepEqual((await drift(f)).changed, ["source"]);
});
test("regression: deletion permits structure-only maintenance but is never current", async (t) => {
  const f = await fixture(t);
  await rm(path.join(f.repoRoot, "source.md"));
  assert.equal((await lintWiki(f.wikiRoot, { ...f, structureOnly: true })).ok, true);
  assert.deepEqual((await drift(f)).missing, ["source"]);
});
test("regression: an external snapshot is not an online unchanged source", async (t) => {
  const f = await fixture(t);
  f.manifest.sources[0].livePath = null;
  await f.save();
  const r = await drift(f);
  assert.deepEqual(r.unchanged, []);
  assert.deepEqual(r.unverified, ["source"]);
});
test("regression: either ownership flag protects and mismatch is reported", async (t) => {
  const f = await fixture(t);
  await f.put("wiki/Alpha.md", "---\nhuman-owned: true\n---\n" + f.article);
  await writeFile(path.join(f.repoRoot, "source.md"), "changed");
  const r = await drift(f);
  assert.ok(r.humanOwned.includes("Alpha"));
  assert.ok(r.conflicts.some((x) => x.code === "OWNERSHIP_CONFLICT"));
});
for (const [name, mutate] of [
  ["unknown schema", (f) => {
    f.manifest.schemaVersion = 999;
  }],
  ["duplicate source IDs", (f) => {
    f.manifest.sources.push({ ...f.manifest.sources[0] });
  }],
  ["empty source reference", (f) => {
    f.manifest.articles[0].sourceIds = [];
  }],
  ["unknown enum", (f) => {
    f.manifest.sources[0].kind = "mystery";
  }],
  ["escaping raw path", (f) => {
    f.manifest.sources[0].rawPath = "../source.md";
  }]
]) test(`regression: rejects ${name}`, async (t) => {
  const f = await fixture(t);
  mutate(f);
  await f.save();
  assert.equal((await lintWiki(f.wikiRoot, { ...f, structureOnly: true })).ok, false);
});
test("regression: empty source heading fails", async (t) => {
  const f = await fixture(t);
  await f.put("wiki/Alpha.md", "# Alpha\n\nBody.\n\n## 来源\n");
  assert.equal((await lintWiki(f.wikiRoot, { ...f, structureOnly: true })).ok, false);
});
test("regression: symlink outside wiki cannot be read as raw", async (t) => {
  const f = await fixture(t);
  await rm(path.join(f.wikiRoot, "raw/source.md"));
  await symlink(path.join(f.repoRoot, "source.md"), path.join(f.wikiRoot, "raw/source.md"));
  assert.equal((await lintWiki(f.wikiRoot, { ...f, structureOnly: true })).ok, false);
});
test("regression: explicit factual dependencies propagate, ordinary links do not", async (t) => {
  const f = await fixture(t);
  f.manifest.articles.push({ id: "Beta", file: "wiki/Beta.md", sourceIds: [], dependsOnArticles: ["Alpha"], humanOwned: false });
  await f.put("wiki/Beta.md", "# Beta\n\nSummary [[Alpha]].\n\n## 来源\n\n- [[Alpha]]\n");
  await f.save();
  await writeFile(path.join(f.repoRoot, "source.md"), "changed");
  assert.ok((await drift(f)).articles.includes("Beta"));
});
export {
  fixture
};
