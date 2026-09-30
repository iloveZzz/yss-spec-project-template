import {spawnSync} from 'node:child_process';
import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir,cp,readdir,symlink} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {parseScenarios,scenarioScript} from '../scripts/scenario-contract.mjs';
import {prepareFlowPrototype,validatePrototypeProject} from '../scripts/prototype-contract.mjs';
import {buildShadcnPrototype} from '../scripts/build-shadcn-prototype.mjs';
import {comparisonFixture} from './comparison-fixture.mjs';
import {validateComparison,sealComparison} from '../scripts/prototype-comparison.mjs';
async function project(){const root=await mkdtemp(path.join(os.tmpdir(),'prototype-reliability-'));await mkdir(path.join(root,'.template-spec/design/tokens'),{recursive:true});for(const ref of ['DESIGN.md','.template-spec/design/tokens/variables.css'])await cp(new URL(`../../../../${ref}`,import.meta.url),path.join(root,ref));return root;}
test('scenario data is parsed without execution; IDs and generated script bind exact JSON',async()=>{
 const bytes=await readFile(new URL('../assets/native-workbench/scenarios.json',import.meta.url));const doc=parseScenarios(bytes);assert(doc.scenarios.some(s=>s.id==='conflict'));assert.throws(()=>parseScenarios('globalThis.touched=true'));doc.scenarios.push(doc.scenarios[0]);assert.throws(()=>parseScenarios(JSON.stringify(doc)),/重复/);
 const f=await comparisonFixture();const input=structuredClone(f.input);input.cases[0].scenario='missing';await writeFile(path.join(f.root,'input.json'),JSON.stringify(input));await assert.rejects(f.prepare(),/场景 ID 不存在/);
});
test('portable integrity and current project freshness are distinct checks',async()=>{
 const projectRoot=await project(),root=path.join(projectRoot,'docs/.scratch/test/design/prototypes');await prepareFlowPrototype({projectRoot,root,feature:'test',pattern:'workbench'});assert.deepEqual((await validatePrototypeProject({root,projectRoot})).errors,[]);
 await writeFile(path.join(projectRoot,'DESIGN.md'),'changed DESIGN');assert.equal((await validatePrototypeProject({root})).errors.length,0);assert.match((await validatePrototypeProject({root,projectRoot})).errors.join(),/来源已漂移/);
 await writeFile(path.join(root,'scenarios.js'),'window.prototypeScenarios=[]');assert.match((await validatePrototypeProject({root})).errors.join(),/派生脚本不一致/);
});
test('multi-file config bundles referenced images, binds sources, rejects escapes and leaves no partial output',{skip:!process.env.YSS_SHADCN_TOOLCHAIN},async()=>{
 const projectRoot=await project(),author=path.join(projectRoot,'author');await mkdir(author);
 const config=path.join(author,'config.json');await cp(new URL('../assets/native-workbench/scenarios.json',import.meta.url),path.join(author,'scenarios.json'));
 await writeFile(config,JSON.stringify({schema_version:1,title:'自定义 <标题>',entry:'entry.tsx',scenarios:'scenarios.json'}));
 await writeFile(path.join(author,'entry.tsx'),'import React from "react";import{createRoot}from"react-dom/client";import {Part} from "./part";import "./style.css";createRoot(document.getElementById("app")).render(<Part/>);');
 await writeFile(path.join(author,'part.tsx'),'import React from "react";import image from "./mark.svg";export function Part(){return <img alt="本地图形" src={image}/>;}');await writeFile(path.join(author,'mark.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path d="M0 0 L10 10"/></svg>');await writeFile(path.join(author,'style.css'),'img {width:var(--brand-size);height:var(--brand-size)}');
 const options={projectRoot,feature:'config-test',root:path.join(projectRoot,'docs/.scratch/config-test/design/prototypes'),toolchain:process.env.YSS_SHADCN_TOOLCHAIN,config};await buildShadcnPrototype(options);assert.deepEqual((await validatePrototypeProject({root:options.root,projectRoot})).errors,[]);assert((await readFile(path.join(options.root,'index.html'),'utf8')).includes('自定义 &lt;标题&gt;'));assert((await readdir(path.join(options.root,'assets'))).some(x=>x.endsWith('.svg')));assert((await readdir(path.join(options.root,'authoring-sources'))).includes('part.tsx'));await assert.rejects(buildShadcnPrototype(options),/已存在内容/);
 const bad={...options,feature:'bad',root:path.join(projectRoot,'docs/.scratch/bad/design/prototypes')};await writeFile(path.join(author,'part.tsx'),'import "../outside.ts";');await writeFile(path.join(projectRoot,'outside.ts'),'console.log("escape")');await assert.rejects(buildShadcnPrototype(bad),/相对路径/);
 await writeFile(path.join(author,'part.tsx'),'fetch("https://example.test")');await assert.rejects(buildShadcnPrototype(bad),/离线/);
 await writeFile(path.join(author,'part.tsx'),'import "./linked.ts"');await symlink(path.join(projectRoot,'outside.ts'),path.join(author,'linked.ts'));await assert.rejects(buildShadcnPrototype(bad));await assert.rejects(readdir(bad.root),{code:'ENOENT'});
 await writeFile(path.join(author,'part.tsx'),'export const Part=()=>null');await writeFile(path.join(author,'style.css'),'body{background:url("https://example.test/a.png")}');await assert.rejects(buildShadcnPrototype(bad),/非本地/);await assert.rejects(readdir(bad.root),{code:'ENOENT'});
});

test('CLI scripts execute through a filesystem alias instead of silently returning success',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'prototype-cli-alias-'));
 for(const script of ['build-shadcn-prototype.mjs','build-shadcn-vue-prototype.mjs','prototype-comparison.mjs','prototype-contract.mjs']){
  const link=path.join(dir,script);await symlink(new URL('../scripts/'+script,import.meta.url),link);
  const result=spawnSync(process.execPath,[link,'--invalid-argument'],{encoding:'utf8'});assert.notEqual(result.status,0,script);assert(result.stderr.trim(),script+' must report an error');
  const imported=spawnSync(process.execPath,['--input-type=module','-e',`await import(${JSON.stringify(new URL('../scripts/'+script,import.meta.url).href)})`],{encoding:'utf8'});assert.equal(imported.status,0,script+' imports without a CLI argv: '+imported.stderr);
  const stdinImport=spawnSync(process.execPath,['--input-type=module','-'],{input:`await import(${JSON.stringify(new URL('../scripts/'+script,import.meta.url).href)})`,encoding:'utf8'});assert.equal(stdinImport.status,0,script+' imports from stdin: '+stdinImport.stderr);
 }
});

test('new compact preset is explicit, invalid density is rejected and old manifest stays readable',async()=>{
 const projectRoot=await project(),root=path.join(projectRoot,'docs/.scratch/density/design/prototypes'),options={projectRoot,root,feature:'density',pattern:'workbench'};
 await assert.rejects(prepareFlowPrototype({...options,density:'tiny'}),/density/);await assert.rejects(readdir(root),{code:'ENOENT'});
 await prepareFlowPrototype(options);const file=path.join(root,'yss-prototype-adapter.json'),manifest=JSON.parse(await readFile(file,'utf8'));
 assert.equal(manifest.visual_preset.density,'compact');manifest.visual_preset.density='comfortable';await writeFile(file,JSON.stringify(manifest));assert.match((await validatePrototypeProject({root})).errors.join(),/密度不一致/);
 delete manifest.visual_preset;await writeFile(file,JSON.stringify(manifest));assert.deepEqual((await validatePrototypeProject({root})).errors,[]);
});
