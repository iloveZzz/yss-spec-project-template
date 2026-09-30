import {readFile,writeFile,mkdir,cp,mkdtemp} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';import {fileURLToPath,pathToFileURL} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../../../..');
const {prepareComparison,validateComparison}=await import(pathToFileURL(path.join(repo,'.agents/skills/yss-prototype-stage/scripts/prototype-comparison.mjs')));
const fixture=await mkdtemp(path.join(os.tmpdir(),'yss-workspace-comparison-'));await mkdir(path.join(fixture,'design'),{recursive:true});
await cp(path.join(repo,'DESIGN.md'),path.join(fixture,'DESIGN.md'));
await mkdir(path.join(fixture,'.template-spec/design/tokens'),{recursive:true});
await cp(path.join(repo,'.template-spec/design/tokens/variables.css'),path.join(fixture,'.template-spec/design/tokens/variables.css'));
const bytes=await readFile(path.join(here,'review/workspace/scenarios.json'));await writeFile(path.join(fixture,'design/scenarios.json'),bytes);
await cp(path.join(here,'interaction.md'),path.join(fixture,'design/interaction.md'));
const cases=JSON.parse(bytes).scenarios.map(s=>({id:s.id,label:s.label,scenario:s.id}));const variants=[];
for(const [id,folder,label] of [['standard','workspace','标准工作区'],['glass','glass','轻玻璃工作区']]) {
 await cp(path.join(here,'review',folder),path.join(fixture,'candidates',id),{recursive:true});
 variants.push({id,label,root:`candidates/${id}`,entry:'index.html',cases:cases.map(c=>c.id)});
}
await writeFile(path.join(fixture,'design/input.json'),JSON.stringify({schema_version:2,comparison_id:'enterprise-workspace',title:'企业工作区外观比较',comparison_ref:'design/interaction.md',scenario_ref:'design/scenarios.json',cases,variants}));
const output=await prepareComparison({projectRoot:fixture,feature:'enterprise-workspace',input:'design/input.json'});
const target=path.join(here,'comparison');await cp(output.root,target,{recursive:true,force:false,errorOnExist:true});
const result=await validateComparison(target);await writeFile(path.join(here,'evidence/comparison.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({target,result}));
