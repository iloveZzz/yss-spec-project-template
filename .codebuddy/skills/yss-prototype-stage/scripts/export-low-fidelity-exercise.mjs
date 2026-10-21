#!/usr/bin/env node
import { existsSync, realpathSync } from 'node:fs';
import {mkdtemp,mkdir,cp,readFile,writeFile,readdir,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeScenarios} from './scenario-contract.mjs';
import {prepareComparison} from './prototype-comparison.mjs';
export async function exportLowFidelityExercise({projectRoot,output}){
 output=path.resolve(output);try{if((await readdir(output)).length)throw Error('目标非空，拒绝覆盖');}catch(e){if(e.code!=='ENOENT')throw e;}
 await mkdir(path.dirname(output),{recursive:true});const temp=await mkdtemp(path.join(path.dirname(output),'.low-fidelity-'));
 try{await mkdir(path.join(temp,'.template-spec/design/tokens'),{recursive:true});for(const ref of ['DESIGN.md','.template-spec/design/tokens/variables.css'])await cp(path.join(projectRoot,ref),path.join(temp,ref));
  const doc=JSON.parse(await readFile(new URL('../assets/native-workbench/scenarios.json',import.meta.url)));doc.scenarios=doc.scenarios.filter(s=>['primary','failure'].includes(s.id));for(const s of doc.scenarios)s.state_ref='comparison-record.md';
  const bytes=JSON.stringify(doc,null,2)+'\n';await writeFile(path.join(temp,'shared.json'),bytes);await cp(new URL('../references/low-fidelity-exercise.md',import.meta.url),path.join(temp,'record.md'));
  for(const mode of ['single','batch','queue']){const root=path.join(temp,mode);await writeScenarios(root,bytes);for(const file of ['index.html','styles.css','app.js'])await writeFile(path.join(root,file),(await readFile(new URL(`../assets/low-fidelity-exercise/${file}`,import.meta.url),'utf8')).replaceAll('__MODE__',mode));await cp(path.join(temp,'.template-spec/design/tokens/variables.css'),path.join(root,'tokens.css'));}
  const input={schema_version:2,comparison_id:'low-fidelity-exercise',title:'低保真：资料审批组织方式',comparison_ref:'record.md',scenario_ref:'shared.json',cases:[{id:'normal',label:'正常处理',scenario:'primary'},{id:'retry',label:'失败恢复',scenario:'failure'}],variants:['single','batch','queue'].map((id,i)=>({id,label:['逐项处理','批量处理','引导队列'][i],root:id,entry:'index.html',cases:['normal','retry']}))};await writeFile(path.join(temp,'input.json'),JSON.stringify(input));const result=await prepareComparison({projectRoot:temp,feature:'exercise',input:'input.json'});await rename(result.root,output);return {root:output,entry:path.join(output,'index.html')};
 }finally{await rm(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&existsSync(process.argv[1])&&import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href){const args={};for(let i=2;i<process.argv.length;i+=2)args[process.argv[i].slice(2)]=process.argv[i+1];console.log(JSON.stringify(await exportLowFidelityExercise({projectRoot:path.resolve(args['project-root']||'.'),output:args.output})));}
