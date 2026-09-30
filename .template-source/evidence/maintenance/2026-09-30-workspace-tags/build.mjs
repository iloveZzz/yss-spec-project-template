import {mkdtemp,mkdir,cp,writeFile} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';import {fileURLToPath,pathToFileURL} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../../../..');
const {buildShadcnVuePrototype}=await import(pathToFileURL(path.join(repo,'.agents/skills/yss-prototype-stage/scripts/build-shadcn-vue-prototype.mjs')));
const temp=await mkdtemp(path.join(os.tmpdir(),'yss-workspace-build-')),fixture=path.join(temp,'fixture');
await mkdir(path.join(fixture,'.template-spec/design/tokens'),{recursive:true});
for(const ref of ['DESIGN.md','.template-spec/design/tokens/variables.css'])await cp(path.join(repo,ref),path.join(fixture,ref));
const toolchain=process.argv[2];if(!toolchain)throw Error('Provide locked toolchain');
const stage=process.argv[3]||'draft';const results=[];
for(const [name,config,density] of [['workspace','workspace-standard',undefined],['glass','workspace-glass',undefined],['comfortable','workspace-standard','comfortable']]) {
 const root=path.join(fixture,`docs/.scratch/${name}/design/prototypes`);
 const manifest=await buildShadcnVuePrototype({projectRoot:fixture,root,feature:name,toolchain,config:path.join(repo,'.agents/skills/yss-prototype-stage/assets/vue-business-patterns',config+'.config.json'),density});
 const target=path.join(here,stage,name);await mkdir(path.dirname(target),{recursive:true});await cp(root,target,{recursive:true,force:false,errorOnExist:true});
 results.push({name,root:target,manifest});
}
await writeFile(path.join(here,'evidence',stage+'-build.json'),JSON.stringify({fixture,results},null,2));console.log(JSON.stringify({fixture,roots:results.map(r=>r.root)}));
