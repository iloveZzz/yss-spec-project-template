import {createHash} from 'node:crypto';
import {readFile,writeFile,lstat,mkdir} from 'node:fs/promises';
import path from 'node:path';
export const digest = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
export const safeId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(value);
export async function localPath(root,ref) {
 if(typeof ref!=='string'||!ref||/[\\?#%\x00-\x1f]/.test(ref)||path.isAbsolute(ref)||/^[a-z][\w+.-]*:/i.test(ref)||ref.split('/').some(p=>!p||p==='.'||p==='..'))throw Error(`需要包内相对路径: ${ref}`);
 let current=path.resolve(root);
 for(const part of [null,...ref.split('/')]){if(part)current=path.join(current,part);try{if((await lstat(current)).isSymbolicLink())throw Error(`不允许符号链接: ${ref}`);}catch(e){if(e.code!=='ENOENT')throw e;}}
 return current;
}
export function parseScenarios(bytes) {
 const doc=JSON.parse(String(bytes));
 if(doc.schema_version!==1||!Array.isArray(doc.scenarios)||!doc.scenarios.length||!doc.scenarios.some(s=>s.id==='primary'))throw Error('场景需要 schema_version=1、scenarios 和 primary 入口');
 const ids=new Set();
 for(const s of doc.scenarios){
  if(!safeId(s.id)||ids.has(s.id)||!s.label?.trim()||!s.state_ref?.trim()||!s.initial_data||typeof s.initial_data!=='object'||Array.isArray(s.initial_data))throw Error('场景 ID/来源/初始数据缺失或重复');
  if(Object.keys(s).some(k=>!['id','label','state_ref','initial_data'].includes(k)))throw Error('场景包含未知字段');
  ids.add(s.id);
 }
 return doc;
}
export function scenarioScript(bytes) {
 const doc=parseScenarios(bytes);
 const packet={...doc,digest:digest(bytes),data_digests:Object.fromEntries(doc.scenarios.map(s=>[s.id,digest(JSON.stringify(s.initial_data))]))};
 return `window.prototypeScenarioContract = ${JSON.stringify(packet).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029')};\nwindow.prototypeScenarios = window.prototypeScenarioContract.scenarios;\n`;
}
export async function writeScenarios(root,bytes) {
 parseScenarios(bytes);await mkdir(root,{recursive:true});await writeFile(path.join(root,'scenarios.json'),bytes);await writeFile(path.join(root,'scenarios.js'),scenarioScript(bytes));
 await writeFile(path.join(root,'scenario-runtime.js'),await readFile(new URL('../assets/scenario-runtime.js',import.meta.url)));
}
