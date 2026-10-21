#!/usr/bin/env node
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseScenarios} from './scenario-contract.mjs';
const base=new URL('../assets/vue-business-patterns/',import.meta.url);
const names=['list-detail','multi-step','approval','conflict','analysis','combined-query','owner-validity'];
export async function composeWorkspaceScenarios() {
 const inputs=Object.fromEntries(await Promise.all(names.map(async name=>{const bytes=await readFile(new URL(name+'.scenarios.json',base));return [name,{doc:parseScenarios(bytes),digest:'sha256:'+createHash('sha256').update(bytes).digest('hex')}]})));
 const modes=[['primary','正常工作区',{}],['exceptions','失败与冲突恢复',{'multi-step':'failure',approval:'failure',conflict:'conflict','combined-query':'failure','owner-validity':'failure'}],['no-permission','只读与权限',{'list-detail':'no-permission','multi-step':'no-permission',approval:'no-permission',conflict:'no-permission','combined-query':'no-permission','owner-validity':'no-permission'}],['empty','空结果',{'list-detail':'empty',approval:'empty',analysis:'empty','combined-query':'empty'}]];
 return {schema_version:1,scenarios:modes.map(([id,label,overrides])=>({id,label,state_ref:'.agents/skills/yss-prototype-stage/references/enterprise-workspace.md',initial_data:{pages:Object.fromEntries(names.map(name=>{
   const selected=inputs[name].doc.scenarios.find(s=>s.id===(overrides[name]||'primary'));
   if(!selected)throw Error(`缺少明确来源 ${name}/${overrides[name]}`);
   return [name,{...selected,source_ref:`authoring-sources/${name}.scenarios.json`,source_digest:inputs[name].digest}];
 }))}}))};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url) {
 const target=fileURLToPath(new URL('workspace.scenarios.json',base));const bytes=JSON.stringify(await composeWorkspaceScenarios(),null,2)+'\n';
 if(process.argv.includes('--check')){if(await readFile(target,'utf8')!==bytes)throw Error('工作区场景与来源漂移');console.log('工作区场景来源一致');}
 else if(process.argv.includes('--write')){await writeFile(target,bytes);console.log('已组合工作区场景');}
 else throw Error('需要 --check 或 --write');
}
