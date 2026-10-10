import { fixtureTracker } from './work-layout-fixture.mjs';
import {spawnSync} from 'node:child_process';
import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir,cp,readdir,symlink} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {parseScenarios,scenarioScript} from '../scripts/scenario-contract.mjs';
import {prepareFlowPrototype,validatePrototypeProject} from '../scripts/prototype-contract.mjs';
import {comparisonFixture} from './comparison-fixture.mjs';
import {validateComparison,sealComparison} from '../scripts/prototype-comparison.mjs';
async function project(){const root=await mkdtemp(path.join(os.tmpdir(),'prototype-reliability-'));await mkdir(path.join(root,'.template-spec/design/tokens'),{recursive:true});for(const ref of ['DESIGN.md','.template-spec/design/tokens/variables.css'])await cp(new URL(`../../../../${ref}`,import.meta.url),path.join(root,ref));await fixtureTracker(root);return root;}
test('scenario data is parsed without execution; IDs and generated script bind exact JSON',async()=>{
 const bytes=await readFile(new URL('../assets/native-workbench/scenarios.json',import.meta.url));const doc=parseScenarios(bytes);assert(doc.scenarios.some(s=>s.id==='conflict'));assert.throws(()=>parseScenarios('globalThis.touched=true'));doc.scenarios.push(doc.scenarios[0]);assert.throws(()=>parseScenarios(JSON.stringify(doc)),/重复/);
 const f=await comparisonFixture();const input=structuredClone(f.input);input.cases[0].scenario='missing';await writeFile(path.join(f.root,'input.json'),JSON.stringify(input));await assert.rejects(f.prepare(),/场景 ID 不存在/);
});
test('portable integrity and current project freshness are distinct checks',async()=>{
 const projectRoot=await project(),root=path.join(projectRoot,'docs/.scratch/test/design/prototypes');await prepareFlowPrototype({projectRoot,root,feature:'test',pattern:'workbench'});assert.deepEqual((await validatePrototypeProject({root,projectRoot})).errors,[]);
 await writeFile(path.join(projectRoot,'DESIGN.md'),'changed DESIGN');assert.equal((await validatePrototypeProject({root})).errors.length,0);assert.match((await validatePrototypeProject({root,projectRoot})).errors.join(),/来源已漂移/);
 await writeFile(path.join(root,'scenarios.js'),'window.prototypeScenarios=[]');assert.match((await validatePrototypeProject({root})).errors.join(),/派生脚本不一致/);
});
test('CLI scripts execute through a filesystem alias instead of silently returning success',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'prototype-cli-alias-'));
 for(const script of ['build-shadcn-vue-prototype.mjs','prototype-comparison.mjs','prototype-contract.mjs']){
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

test('configured roots drive prototype output and reject other or occupied paths',async()=>{
 for(const workRoot of ['.work','docs/custom-work','docs/.scratch']){
  const projectRoot=await project();await fixtureTracker(projectRoot,workRoot);
  const root=path.join(projectRoot,workRoot,'configured/design/prototypes');
  await assert.rejects(prepareFlowPrototype({projectRoot,root:path.join(projectRoot,'wrong/configured/design/prototypes'),feature:'configured'}),/精确匹配/);
  await prepareFlowPrototype({projectRoot,root,feature:'configured'});
  assert.deepEqual((await validatePrototypeProject({root,projectRoot})).errors,[]);
  await assert.rejects(prepareFlowPrototype({projectRoot,root,feature:'configured'}),/已存在内容/);
 }
});
