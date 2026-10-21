import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, cp, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { sealComparison, validateComparison } from '../scripts/prototype-comparison.mjs';

import { comparisonFixture } from './comparison-fixture.mjs';

test('portable review package binds sources, refuses overwrite and detects resource/source drift',async()=>{
  const fixture=await comparisonFixture();const output=await fixture.prepare();
  assert.deepEqual(await validateComparison(output.root,fixture.root),{errors:[]});
  await assert.rejects(fixture.prepare(),/拒绝覆盖/);
  const html=path.join(output.root,'variants/a/index.html');await writeFile(html,(await readFile(html,'utf8'))+'\n<!-- review change -->');
  assert.match((await validateComparison(output.root)).errors.join(),/摘要/);
  await sealComparison(output.root);assert.deepEqual(await validateComparison(output.root),{errors:[]});
  await writeFile(path.join(fixture.root,'interaction.md'),'changed source');
  assert.match((await validateComparison(output.root,fixture.root)).errors.join(),/漂移/);
  assert.deepEqual(await validateComparison(output.root),{errors:[]});
  const portable=await mkdtemp(path.join(os.tmpdir(),'yss-comparison-portable-'));await cp(output.root,path.join(portable,'package'),{recursive:true});
  assert.deepEqual(await validateComparison(path.join(portable,'package')),{errors:[]});
});

test('invalid cases, differing data, missing entries, remote resources and escaping paths fail before output',async()=>{
  const f=await comparisonFixture();
  for (const mutate of [i=>i.cases[0].scenario='unknown',i=>i.variants[1].cases.pop(),i=>i.variants[1].entry='missing.html',i=>i.variants[1].root='../escape',i=>i.variants[1].entry='%2e%2e/index.html',i=>i.approved=true]) {
    const input=structuredClone(f.input);mutate(input);await writeFile(path.join(f.root,'input.json'),JSON.stringify(input));await assert.rejects(f.prepare());
  }
  await writeFile(path.join(f.root,'input.json'),JSON.stringify(f.input));
  const source=path.join(f.root,f.input.variants[1].root);const scenarios=await readFile(path.join(source,'scenarios.json'));
  await writeFile(path.join(source,'scenarios.json'),'different data');await assert.rejects(f.prepare(),/共同来源/);await writeFile(path.join(source,'scenarios.json'),scenarios);
  const html=await readFile(path.join(source,'index.html'),'utf8');
  for (const extra of ['<img src="https://example.com/a.png">','<img src="../outside.png">','<script>fetch("/api")</script>']) {
    await writeFile(path.join(source,'index.html'),html+extra);await assert.rejects(f.prepare(),/非离线/);
  }
  await writeFile(path.join(source,'index.html'),html);
  await symlink(path.join(f.root,'interaction.md'),path.join(source,'linked.md'));await assert.rejects(f.prepare(),/符号链接/);
});

test('manifest, scenario and missing-file mutations cannot masquerade as sealed comparison',async()=>{
  const f=await comparisonFixture();const output=await f.prepare();
  const manifestPath=path.join(output.root,'comparison-manifest.json');const original=await readFile(manifestPath,'utf8');const m=JSON.parse(original);
  m.variants[0].entry='variants/b/index.html';await writeFile(manifestPath,JSON.stringify(m));assert.match((await validateComparison(output.root)).errors.join(),/越界/);
  await writeFile(manifestPath,original);await writeFile(path.join(output.root,'variants/b/scenarios.json'),'drift');await assert.rejects(sealComparison(output.root),/场景数据不一致/);
  await cp(path.join(output.root,'sources/scenarios.json'),path.join(output.root,'variants/b/scenarios.json'));await rm(path.join(output.root,'variants/b/index.html'));assert.match((await validateComparison(output.root)).errors.join(),/入口缺失/);
});
