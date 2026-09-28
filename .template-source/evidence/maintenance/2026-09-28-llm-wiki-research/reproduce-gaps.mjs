// Research-only probes. Never writes the real wiki or skill.
// Run from the repository root: node <this-file>
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const skill = path.resolve('.agents/skills/llm-wiki/scripts');
const { hashSources, drift, sha256 } = await import(pathToFileURL(path.join(skill, 'inventory.mjs')));
const { lintWiki } = await import(pathToFileURL(path.join(skill, 'lint-wikilinks.mjs')));
const { adviseWiki } = await import(pathToFileURL(path.join(skill, 'advise.mjs')));
const root = await mkdtemp(path.join(tmpdir(), 'llm-wiki-research-'));
const findings = [];
async function fixture(name) {
  const repoRoot = path.join(root, name), wikiRoot = path.join(repoRoot, 'knowledge');
  await mkdir(path.join(wikiRoot, 'raw'), { recursive: true });
  await mkdir(path.join(wikiRoot, 'wiki'), { recursive: true });
  const live = path.join(repoRoot, 'source.md');
  await writeFile(live, '模式为旧版。\n');
  await writeFile(path.join(wikiRoot, 'raw/source.md'), '模式为旧版。\n');
  await writeFile(path.join(wikiRoot, 'wiki/index.md'), '# index\n\n## 核心\n- [[Alpha]]\n');
  await writeFile(path.join(wikiRoot, 'wiki/CLAUDE.md'), '# schema\n');
  await writeFile(path.join(wikiRoot, 'wiki/log.md'), '# log\n');
  await writeFile(path.join(wikiRoot, 'wiki/Alpha.md'), '# Alpha\n\n模式为旧版。\n\n## 来源\n- source.md\n- raw/source.md\n');
  const manifest = { schemaVersion: 1, profile: 'documents', sources: [{ id: 'source', kind: 'document', livePath: 'source.md', rawPath: 'raw/source.md', sha256: sha256(Buffer.from('模式为旧版。\n')) }], articles: [{ id: 'Alpha', file: 'wiki/Alpha.md', sourceIds: ['source'] }] };
  const save = () => writeFile(path.join(wikiRoot, '.wiki-manifest.json'), JSON.stringify(manifest));
  await save();
  assert.equal((await lintWiki(wikiRoot, { repoRoot })).ok, true);
  return { repoRoot, wikiRoot, live, manifest, save };
}
try {
  {
    const f = await fixture('hash-without-compile');
    await writeFile(f.live, '模式为新版。\n');
    const before = await drift(f);
    await hashSources(f);
    const after = await drift(f), lint = await lintWiki(f.wikiRoot, f), advise = await adviseWiki(f.wikiRoot, f);
    findings.push({ id: 'hash-hides-uncompiled-content', before, after, lint, advise, rawStillOld: (await readFile(path.join(f.wikiRoot,'raw/source.md'),'utf8')).includes('旧版'), pageStillOld: (await readFile(path.join(f.wikiRoot,'wiki/Alpha.md'),'utf8')).includes('旧版') });
  }
  {
    const f = await fixture('missing-source');
    await rm(f.live);
    await writeFile(path.join(f.wikiRoot,'wiki/Alpha.md'), '# Alpha\n\n来源已删除，保留历史页面。\n\n## Status\n- kind: Outdated\n- sources: source\n- note: live 来源缺失\n\n## 来源\n- raw/source.md\n');
    findings.push({ id: 'missing-source-cannot-close-refresh', status: await drift(f), lint: await lintWiki(f.wikiRoot, f) });
  }
  {
    const f = await fixture('external-source');
    delete f.manifest.sources[0].livePath;
    await f.save();
    await writeFile(path.join(f.wikiRoot,'raw/source.md'), '外源快照被替换。\n');
    findings.push({ id: 'external-source-reported-unchanged', status: await drift(f), lint: await lintWiki(f.wikiRoot, f) });
  }
  {
    const f = await fixture('human-frontmatter');
    await writeFile(path.join(f.wikiRoot,'wiki/Alpha.md'), '---\nhuman-owned: true\n---\n# Alpha\n\n人类正文。\n\n## 来源\n- source.md\n');
    await writeFile(f.live, '模式为新版。\n');
    findings.push({ id: 'human-frontmatter-not-in-status', status: await drift(f) });
  }
  {
    const f = await fixture('invalid-manifest');
    f.manifest.schemaVersion = 999;
    f.manifest.sources.push({ ...f.manifest.sources[0] });
    f.manifest.articles[0].sourceIds = [];
    await f.save();
    await writeFile(path.join(f.wikiRoot,'wiki/Alpha.md'), '# Alpha\n\n没有依据的断言。\n\n## 来源\n');
    findings.push({ id: 'schema-duplicate-empty-provenance-accepted', lint: await lintWiki(f.wikiRoot, f) });
  }
  {
    const f = await fixture('path-boundary');
    f.manifest.sources[0].rawPath = '../source.md';
    await f.save();
    findings.push({ id: 'raw-path-outside-wiki-accepted', lint: await lintWiki(f.wikiRoot, f) });
  }
  {
    const f = await fixture('transitive-article');
    await writeFile(path.join(f.wikiRoot,'wiki/index.md'), '# index\n\n## 核心\n- [[Alpha]]\n- [[Beta]]\n');
    await writeFile(path.join(f.wikiRoot,'wiki/Beta.md'), '# Beta\n\n基于 [[Alpha]] 的汇总：模式为旧版。\n\n## 来源\n- [[Alpha]]\n');
    f.manifest.articles.push({ id: 'Beta', file: 'wiki/Beta.md', sourceIds: [] });
    await f.save();
    await writeFile(f.live, '模式为新版。\n');
    findings.push({ id: 'no-transitive-impact-detection', status: await drift(f) });
  }
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), runtime: process.version, scope: 'synthetic isolated fixtures; observed behavior, not desired behavior assertions', findings }, null, 2));
} finally {
  await rm(root, { recursive: true, force: true });
}
