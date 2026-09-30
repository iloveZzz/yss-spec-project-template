import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {verifyShadcnSources} from '../scripts/build-shadcn-prototype.mjs';
import {resourceErrors} from '../scripts/offline-html.mjs';
test('vendored shadcn components bind a fixed upstream revision and exact source bytes',async()=>{
 const registry=await verifyShadcnSources();
 assert.deepEqual(registry.components.map(x=>x.name).sort(), 'button input dialog select table badge label checkbox textarea tabs alert-dialog card separator breadcrumb field input-group alert empty skeleton spinner sheet dropdown-menu tooltip pagination'.split(' ').sort());
 assert.equal(registry.revision,'db2db460a26fa84fb65c8d903b213925fbdee9ed');
 for(const item of registry.components)assert(item.url.includes(`/blob/${registry.revision}/`));
 const pkg=JSON.parse(await readFile(new URL('../assets/shadcn-authoring/package.json',import.meta.url)));
 assert(!pkg.dependencies.antd);assert(pkg.dependencies.react);
 for(const version of Object.values({...pkg.dependencies,...pkg.devDependencies}))assert.match(version,/^\d+\.\d+\.\d+$/);
});
test('authored TypeScript receives the same offline network checks as JavaScript',()=>{
 assert(resourceErrors('entry.tsx','fetch("https://example.test")',{}).length);
 assert(resourceErrors('entry.ts','import("./remote.js")',{}).length);
});

test('component imports close over the registered set and existing fixed dependencies',async()=>{
 const base=new URL('../assets/shadcn-authoring/',import.meta.url),registry=await verifyShadcnSources(),names=new Set(registry.components.map(x=>x.name)),pkg=JSON.parse(await readFile(new URL('package.json',base)));
 for(const item of registry.components){
  const source=await readFile(new URL(item.path,base),'utf8');
  for(const match of source.matchAll(/from\s+["']([^"']+)["']/g)){
   const ref=match[1];
   if(ref.startsWith('@/registry/new-york-v4/ui/'))assert(names.has(ref.split('/').at(-1)),`${item.name}: ${ref}`);
   else assert(ref==='cn'||Object.hasOwn(pkg.dependencies,ref),`${item.name}: unregistered dependency ${ref}`);
  }
 }
 assert.match(await readFile(new URL('SHADCN-LICENSE.txt',base),'utf8'),/MIT License/);
});
