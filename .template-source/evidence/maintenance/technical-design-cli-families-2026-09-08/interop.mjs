import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const base=path.resolve(process.argv[2]);const consumers=process.argv.slice(3).length?process.argv.slice(3):['dev','backend','frontend'];
const moduleAt=async(f,ref)=>import(pathToFileURL(path.join(base,'instances',f==='frontend'?'existing-frontend':`new-${f}`,ref)).href);
const {fixture}=await moduleAt('design','scripts/fixtures/strategic-handoff/fixture.mjs');
const {exportBundle}=await moduleAt('design','scripts/lib/strategic-handoff.mjs');
for(const technicalDesign of [false,true]){
 const run=path.join(base,technicalDesign?'interop-new':'interop-legacy');fs.mkdirSync(run,{recursive:true});const source=path.join(run,'source');const bundle=path.join(run,'bundle');if(!fs.existsSync(bundle)){fs.mkdirSync(source);await fixture(source,{technicalDesign});await exportBundle({sourceRoot:source,handoffRef:'handoff.yaml',output:bundle,zip:true});}
 for(const family of consumers){
  const target=path.join(run,family);fs.mkdirSync(target);fs.writeFileSync(path.join(target,'yss-project.yaml'),'schema_version: 1\nrepository_mode: project-instance\n');fs.copyFileSync(path.join(source,'CONTEXT.md'),path.join(target,'CONTEXT.md'));
  const {importBundle}=await moduleAt(family,'scripts/lib/strategic-handoff.mjs');const r=await importBundle({bundle:bundle+'.zip',targetRoot:target});assert.equal(r.result,'imported-pending-reconciliation');assert.equal((await importBundle({bundle,targetRoot:target})).result,'already-imported');
  console.log(JSON.stringify({producer:'design',consumer:family,protocol:technicalDesign?'technical-design-v2':'legacy-ddd',portable_import:'pass',idempotent:'pass',approval:'pending-reconciliation'}));
 }
}
