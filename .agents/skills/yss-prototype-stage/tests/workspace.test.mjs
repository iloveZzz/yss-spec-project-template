import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,cp} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {validateWorkspace,readPageId,pageLink,createWorkspaceState,openPage,closePage,pageScene,pageTagFocusTarget} from '../assets/vue-business-patterns/workspace-model.js';
import {composeWorkspaceScenarios} from '../scripts/compose-workspace-scenarios.mjs';
import {buildShadcnVuePrototype} from '../scripts/build-shadcn-vue-prototype.mjs';
import {validatePrototypeProject} from '../scripts/prototype-contract.mjs';
const definition={brand:'fixture',modules:[{id:'records',label:'资料'},{id:'operations',label:'事项'}],groups:[{id:'records-pages',label:'资料',moduleId:'records'},{id:'operations-pages',label:'事项',moduleId:'operations'}],pages:[{id:'list',title:'查询',moduleId:'records',groupId:'records-pages',component:{}},{id:'form',title:'表单',moduleId:'records',groupId:'records-pages',component:{}},{id:'conflict',title:'冲突',moduleId:'operations',groupId:'operations-pages',component:{}}],defaultPage:'list'};
test('navigation registration rejects ambiguous or unreachable pages',()=>{
 assert.equal(validateWorkspace(definition),definition);
 for(const mutate of [d=>d.pages.push(d.pages[0]),d=>d.pages[1].groupId='missing',d=>d.defaultPage='missing',d=>d.modules.push({id:'empty',label:'空模块'}),d=>d.pages[1].id='../outside']){const d=structuredClone(definition);mutate(d);assert.throws(()=>validateWorkspace(d));}
});
test('page deep links are strict and preserve the existing scene fragment',()=>{
 assert.equal(readPageId('',definition),'list');assert.equal(readPageId('?page=form',definition),'form');
 for(const query of ['?page=missing','?page=','?page=list&page=form','?other=x','?page=list&scenario=primary'])assert.throws(()=>readPageId(query,definition));
 for(const prefix of ['file:///offline/index.html','https://example.test/offline/index.html']) {
  const result=new URL(pageLink(prefix+'?page=form#scenario=conflict',definition,'list'));
  assert.equal(result.pathname,new URL(prefix).pathname);assert.equal(result.origin,new URL(prefix).origin);assert.equal(result.hash,'#scenario=conflict');assert.equal(result.search,'?page=list');
 }
 assert.throws(()=>pageLink('file:///a/index.html',definition,'../other'));assert.throws(()=>pageLink('javascript:alert(1)',definition,'list'));
});
test('switching retains per-page state while closing removes only its cache identity',()=>{
 const state=createWorkspaceState(definition);openPage(state,definition,'form');state.dirty.form=true;state.scroll.form=180;
 openPage(state,definition,'conflict');openPage(state,definition,'form');assert.deepEqual(state.opened,['list','form','conflict']);assert.equal(state.scroll.form,180);assert.equal(state.dirty.form,true);
 const before=structuredClone(state);assert.equal(closePage(state,definition,'form'),'confirm');assert.deepEqual(state,before,'cancel has no destructive transition');
 assert.equal(closePage(state,definition,'form',true),'closed');assert.equal(state.activeId,'list');assert.equal(state.dirty.form,undefined);assert.equal(state.scroll.form,undefined);assert.deepEqual(state.opened,['list','conflict']);
 openPage(state,definition,'form');assert.equal(state.dirty.form,undefined);state.scroll.form=35;assert.equal(closePage(state,definition,'conflict'),'closed');assert.equal(state.activeId,'form');assert.equal(state.scroll.form,35);
 assert.equal(closePage(state,definition,'list',true),'pinned');assert.deepEqual(createWorkspaceState(definition,'conflict'),{activeId:'conflict',opened:['list','conflict'],dirty:{},scroll:{}});
});
test('page Tag keyboard focus wraps without activating pages or discarding drafts',()=>{
 const state=createWorkspaceState(definition);openPage(state,definition,'form');openPage(state,definition,'conflict');state.dirty.form=true;state.scroll.form=180;
 const before=structuredClone(state);
 assert.equal(pageTagFocusTarget(state.opened,'list','ArrowLeft'),'conflict');
 assert.equal(pageTagFocusTarget(state.opened,'conflict','ArrowRight'),'list');
 assert.equal(pageTagFocusTarget(state.opened,'form','Home'),'list');
 assert.equal(pageTagFocusTarget(state.opened,'list','End'),'conflict');
 assert.equal(pageTagFocusTarget(state.opened,'form','ArrowLeft'),'list');
 for(const key of ['Enter',' ','Tab','Delete','Escape'])assert.equal(pageTagFocusTarget(state.opened,'form',key),null);
 assert.equal(pageTagFocusTarget([], 'list','Home'),null);
 assert.equal(pageTagFocusTarget(state.opened,'closed','ArrowLeft'),null);
 assert.equal(pageTagFocusTarget(['form'],'form','ArrowRight'),'form');
 assert.deepEqual(state,before,'moving focus must not activate or mutate page caches');
});
test('composed fixtures bind original states and isolate data between scenes/pages',async()=>{
 const composed=await composeWorkspaceScenarios();const bytes=await readFile(new URL('../assets/vue-business-patterns/workspace.scenarios.json',import.meta.url),'utf8');assert.equal(bytes,JSON.stringify(composed,null,2)+'\n');
 for(const scenario of composed.scenarios)for(const [name,page] of Object.entries(scenario.initial_data.pages)){
  const source=await readFile(new URL(`../assets/vue-business-patterns/${name}.scenarios.json`,import.meta.url));assert.equal(page.source_digest,'sha256:'+createHash('sha256').update(source).digest('hex'));
  const original=JSON.parse(source).scenarios.find(s=>s.id===page.id);assert.deepEqual(page.initial_data,original.initial_data);assert.equal(page.state_ref,original.state_ref);
 }
 const primary=composed.scenarios[0],scene={id:primary.id,data:primary.initial_data,ticket:1};const page={id:'list-detail'};
 const a=pageScene(scene,page);a.data.rows[0].name='local draft';assert.notEqual(pageScene(scene,page).data.rows[0].name,'local draft');assert.throws(()=>pageScene(scene,{id:'absent'}),/缺少/);
 assert.throws(()=>pageScene(scene,{id:'list-detail',mapScene:()=>({id:'primary',data:{}})}),/来源/);
});
test('workspace style references resolve to generated project or local variables',async()=>{
 const base=new URL('../assets/vue-business-patterns/',import.meta.url),style=await readFile(new URL('workspace.css',base),'utf8');
 const tokens=await readFile(new URL('../../../../.template-spec/design/tokens/variables.css',import.meta.url),'utf8');const declared=new Set([...tokens.matchAll(/(--[\w-]+)\s*:/g),...style.matchAll(/(--[\w-]+)\s*:/g)].map(m=>m[1]));
 for(const ref of style.matchAll(/var\((--[\w-]+)/g))assert(declared.has(ref[1]),`Unresolved theme role ${ref[1]}`);
});
test('workspace builds as a portable Vue package with exact page source closure',{},async()=>{
 const projectRoot=await mkdtemp(path.join(os.tmpdir(),'yss-workspace-contract-'));await mkdir(path.join(projectRoot,'.template-spec/design/tokens'),{recursive:true});
 for(const file of ['DESIGN.md','.template-spec/design/tokens/variables.css'])await cp(new URL('../../../../'+file,import.meta.url),path.join(projectRoot,file));
 const root=path.join(projectRoot,'docs/.scratch/workspace/design/prototypes');const manifest=await buildShadcnVuePrototype({projectRoot,root,feature:'workspace',toolchain:process.env.YSS_VUE_TOOLCHAIN,config:new URL('../assets/vue-business-patterns/workspace-standard.config.json',import.meta.url).pathname});
 assert.equal(manifest.component_basis,'vue-shadcn-prebuilt');assert.equal(manifest.build_provenance.component_groups.length,27);assert.deepEqual((await validatePrototypeProject({root,projectRoot})).errors,[]);
 for(const source of ['ListDetail.vue','MultiStep.vue','Approval.vue','Conflict.vue','Analysis.vue','workspace-model.js','workspace-page.ts','workspace-definition.ts'])assert(manifest.files['authoring-sources/'+source],source);
 const scenarios=JSON.parse(await readFile(path.join(root,'scenarios.json')));for(const item of Object.values(scenarios.scenarios[0].initial_data.pages))assert.equal(manifest.files[item.source_ref],item.source_digest,'bound page fixture must travel with the package');
 const copied=path.join(projectRoot,'portable-copy');await cp(root,copied,{recursive:true});assert.deepEqual((await validatePrototypeProject({root:copied})).errors,[]);
});
