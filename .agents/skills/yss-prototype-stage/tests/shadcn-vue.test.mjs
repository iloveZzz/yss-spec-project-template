import { fixtureTracker } from './work-layout-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir,cp,readdir,symlink} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';
import {verifyShadcnVueSources,buildShadcnVuePrototype} from '../scripts/build-shadcn-vue-prototype.mjs';
import {validatePrototypeProject} from '../scripts/prototype-contract.mjs';
import {resourceErrors} from '../scripts/offline-html.mjs';
const groups='button input label badge table select dialog checkbox textarea tabs alert-dialog card separator breadcrumb field input-group alert empty skeleton spinner sheet dropdown-menu tooltip pagination combobox range-calendar popover'.split(' ').sort();
test('Vue components have fixed original sources, exact dependencies and closed imports',async()=>{
 const r=await verifyShadcnVueSources(),base=new URL('../assets/shadcn-vue-authoring/',import.meta.url),pkg=JSON.parse(await readFile(new URL('package.json',base)));
 assert.equal(r.revision,'67c9a3926dc0a854507b325c6337ff2210d16379');assert.deepEqual([...r.component_groups].sort(),groups);assert.deepEqual([...new Set(r.components.map(c=>c.path.split('/')[1]))].sort(),groups);
 for(const c of r.components){assert(c.source_url.includes(`/blob/${r.revision}/apps/v4/registry/new-york-v4/${c.path}`));const s=await readFile(new URL(c.path,base),'utf8');for(const m of s.matchAll(/from\s+["']([^"']+)["']/g)){const ref=m[1];if(ref.startsWith('.'))assert(r.components.some(x=>["", ".ts", "/index.ts"].some(ext=>x.path===path.posix.normalize(path.posix.join(path.posix.dirname(c.path),ref))+ext)),`${c.path}: ${ref}`);else if(ref.startsWith('@/registry/'))assert(groups.includes(ref.split('/').at(-1)));else assert(ref==='@/lib/utils'||Object.hasOwn(pkg.dependencies,ref),ref);}}
 assert.equal(pkg.dependencies.vue,pkg.devDependencies['@vue/compiler-sfc']);for(const v of Object.values({...pkg.dependencies,...pkg.devDependencies}))assert.match(v,/^\d+\.\d+\.\d+$/);assert(!pkg.dependencies.react);assert.match(await readFile(new URL('SHADCN-LICENSE.txt',base),'utf8'),/MIT License/);
 assert(resourceErrors('App.vue','<script setup>fetch("https://example.test")</script>',{}).length);assert(resourceErrors('App.vue','<template><img src="https://example.test/x.png"/></template>',{}).length);
});
async function fixture(){const r=await mkdtemp(path.join(os.tmpdir(),'yss-vue-test-'));await mkdir(path.join(r,'.template-spec/design/tokens'),{recursive:true});for(const f of ['DESIGN.md','.template-spec/design/tokens/variables.css'])await cp(new URL(`../../../../${f}`,import.meta.url),path.join(r,f));await fixtureTracker(r);return r;}
test('Vue multi-file SFC build: asset closure, scoped CSS, schema, rejection and cleanup',{},async()=>{
 const projectRoot=await fixture(),author=path.join(projectRoot,'author');await mkdir(author);
 const config=path.join(author,'config.json');await cp(new URL('../assets/vue-business-patterns/list-detail.scenarios.json',import.meta.url),path.join(author,'scenarios.json'));
 await writeFile(config,JSON.stringify({schema_version:1,title:'Vue <title>',entry:'entry.ts',scenarios:'scenarios.json',density:'comfortable'}));
 const entry='import {createApp} from "vue";import App from "./App.vue";import "./styles.css";createApp(App).mount("#app");';
 const app='<script setup lang="ts">import {Button} from "@/components/ui/button";import image from "./mark.svg";import data from "./data.json";import type {Props} from "./types";defineProps<Props>();</script><template><Button>{{data.title}}</Button><img :src="image" alt="local"/></template><style scoped>img{width:var(--brand-size);background:url("./mark.svg")}</style>';
 await writeFile(path.join(author,'types.ts'),'export interface Props { note?: string }');
 await writeFile(path.join(author,'entry.ts'),entry);await writeFile(path.join(author,'App.vue'),app);await writeFile(path.join(author,'data.json'),'{"title":"本地"}');await writeFile(path.join(author,'mark.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>');await writeFile(path.join(author,'unused.svg'),'<svg/>');await writeFile(path.join(author,'styles.css'),'img{height:var(--brand-size)}');
 const options={projectRoot,feature:'sfc',root:path.join(projectRoot,'docs/.scratch/sfc/design/prototypes'),toolchain:process.env.YSS_VUE_TOOLCHAIN,config,density:'compact'};
 await buildShadcnVuePrototype(options);assert.deepEqual((await validatePrototypeProject({root:options.root,projectRoot})).errors,[]);
 const manifest=JSON.parse(await readFile(path.join(options.root,'yss-prototype-adapter.json')));assert.equal(manifest.component_basis,'vue-shadcn-prebuilt');assert.equal(manifest.visual_preset.density,'compact');assert.equal(manifest.build_provenance.browser_runtime,'vue');assert(manifest.build_provenance.authored_files['authoring-sources/types.ts'],'type-only inputs must be recorded');assert(Object.keys(manifest.build_provenance.authored_files).includes('authoring-sources/App.vue'));assert(!Object.keys(manifest.files).some(p=>p.includes('unused.svg')));assert((await readFile(path.join(options.root,'styles.css'),'utf8')).includes('[data-v-'));assert((await readdir(path.join(options.root,'assets'))).some(x=>x.endsWith('.svg')));
 await assert.rejects(buildShadcnVuePrototype(options),/已存在内容/);
 const bad={...options,feature:'bad',root:path.join(projectRoot,'docs/.scratch/bad/design/prototypes')};
 await assert.rejects(buildShadcnVuePrototype({...bad,entry:path.join(author,'entry.ts')}),/互斥/);
 for(const [source,pattern] of [['import "react"',/未登记依赖/],['import "react-dom\/client"',/未登记依赖/],['import "./missing.ts"',/resolve/],['import "https://example.test/module.js"',/未登记依赖/],['import "@\/components/ui/calendar"',/未收录组件/],['import "../outside.ts"',/相对路径/]]){await writeFile(path.join(projectRoot,'outside.ts'),'export const x=1');await writeFile(path.join(author,'entry.ts'),source);await assert.rejects(buildShadcnVuePrototype(bad),pattern);await assert.rejects(readdir(bad.root),{code:'ENOENT'});}
 await symlink(path.join(projectRoot,'outside.ts'),path.join(author,'linked.ts'));await writeFile(path.join(author,'entry.ts'),'import "./linked.ts"');await assert.rejects(buildShadcnVuePrototype(bad));
 await writeFile(path.join(author,'entry.ts'),entry);
 await writeFile(path.join(projectRoot,'outside.ts'),'export interface Props { outside?: string }');
 for(const source of ['<script setup lang="ts">import type {Props} from "../outside";defineProps<Props>();</script><template><p>outside</p></template>','<script setup lang="ts">import type {Props} from "./linked";defineProps<Props>();</script><template><p>linked</p></template>']){await writeFile(path.join(author,'App.vue'),source);await assert.rejects(buildShadcnVuePrototype(bad));await assert.rejects(readdir(bad.root),{code:'ENOENT'});}
 for(const source of ['<script setup>fetch("https://example.test")</script>', '<template><img src="https://example.test/x.png"/></template>', '<template><p>safe</p></template><style>p{background:url(https://example.test/x.png)}</style>', '<template lang="pug">p bad</template>']){await writeFile(path.join(author,'App.vue'),source);await assert.rejects(buildShadcnVuePrototype(bad));await assert.rejects(readdir(bad.root),{code:'ENOENT'});}
 // Validation-stage failure still cleans staging, with no half-published artifact.
 await writeFile(path.join(author,'App.vue'),app);await writeFile(path.join(projectRoot,'.template-spec/design/tokens/variables.css'),'@import "https://example.test/font.css";');await assert.rejects(buildShadcnVuePrototype(bad),/非本地/);assert.deepEqual(await readdir(path.join(projectRoot,'docs/.scratch/bad/design/build')),[]);await assert.rejects(readdir(bad.root),{code:'ENOENT'});
 await writeFile(path.join(options.root,'authoring-sources/App.vue'),app+'<!-- drift -->');assert.match((await validatePrototypeProject({root:options.root})).errors.join(),/漂移|摘要/);
});
test('all 27 Vue groups compile, including unused-route components',{},async()=>{
 const projectRoot=await fixture(),author=path.join(projectRoot,'author');await mkdir(author);await writeFile(path.join(author,'entry.ts'),groups.map((g,i)=>`import * as c${i} from '@/components/ui/${g}';`).join('\n')+'\nconsole.log('+groups.map((_,i)=>`Object.keys(c${i})`).join(',')+');');const root=path.join(projectRoot,'docs/.scratch/all-components/design/prototypes');const m=await buildShadcnVuePrototype({projectRoot,root,feature:'all-components',toolchain:process.env.YSS_VUE_TOOLCHAIN,entry:path.join(author,'entry.ts'),profile:'H1'});assert.deepEqual([...new Set(m.build_provenance.used_component_files.map(p=>p.split('/')[1]))].sort(),groups);assert.deepEqual((await validatePrototypeProject({root,profile:'H1'})).errors,[]);
});
