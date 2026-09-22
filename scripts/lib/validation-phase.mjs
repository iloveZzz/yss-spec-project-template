import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';

// Only a live local call owns these snapshots. Neither receipts nor cache data confer approval.
const phases=new AsyncLocalStorage();
const checksum=bytes=>createHash('sha256').update(bytes).digest('hex');
const filename=value=>path.resolve(value instanceof URL?fileURLToPath(value):value);
const error=(code,detail)=>Object.assign(new TypeError(`${code}: ${detail}`),{code});
const current=()=>{const phase=phases.getStore();if(phase&&!phase.active)throw error('VALIDATION_PHASE_EXPIRED','验证阶段已经结束');if(phase?.signal?.aborted)throw error('VALIDATION_CANCELLED','验证阶段已取消');return phase;};
const statShape=stat=>({type:stat.isSymbolicLink()?'link':stat.isDirectory()?'directory':stat.isFile()?'file':'other',mode:Number(stat.mode),ino:String(stat.ino),dev:String(stat.dev)});
function observe(file,kind,read){const phase=current();if(!phase)return read();const key=`${kind}\0${file}`;if(!phase.observations.has(key))phase.observations.set(key,{file,kind,value:read()});return phase.observations.get(key).value;}
function pathIdentity(file){let part=path.parse(file).root;for(const name of path.relative(part,file).split(path.sep).filter(Boolean)){part=path.join(part,name);const nameRef=part;observe(nameRef,'stat',()=>{try{return statShape(fs.lstatSync(nameRef));}catch(e){if(e.code==='ENOENT')return null;throw e;}});}}
export function readFileSync(file,options){
 const phase=current();if(!phase||typeof file==='number'||(typeof options==='object'&&options?.flag&&options.flag!=='r'))return fs.readFileSync(file,options);
 const ref=filename(file);pathIdentity(ref);
 if(!phase.files.has(ref))phase.files.set(ref,Buffer.from(fs.readFileSync(ref)));
 const bytes=phase.files.get(ref),encoding=typeof options==='string'?options:options?.encoding;
 return encoding?bytes.toString(encoding):Buffer.from(bytes);
}
export async function readFile(file,options){return readFileSync(file,options);}
export async function readdir(file,options){return readdirSync(file,options);}
export function existsSync(file){const phase=current();if(!phase||typeof file==='number')return fs.existsSync(file);const ref=filename(file);pathIdentity(ref);return observe(ref,'exists',()=>fs.existsSync(ref));}
export function lstatSync(file,options){const result=fs.lstatSync(file,options);const phase=current();if(phase&&result){const ref=filename(file);observe(ref,'stat',()=>statShape(result));}return result;}
export function readdirSync(file,options){
 const result=fs.readdirSync(file,options),phase=current();
 if(phase){const ref=filename(file);pathIdentity(ref);
  // Record the enumeration actually returned to the consumer, not a second read.
  const encoding=typeof options==='string'?options:options?.encoding||'utf8';
  const names=result.map(entry=>{const name=typeof entry==='string'||Buffer.isBuffer(entry)?entry:entry.name;return Buffer.isBuffer(name)?name.toString():Buffer.from(name,encoding==='buffer'?'utf8':encoding).toString();}).sort();
  const recorded=observe(ref,'directory',()=>names);
  if(JSON.stringify(recorded)!==JSON.stringify(names))throw error('VALIDATION_INPUT_CHANGED',ref);
 }
 return result;
}
function actualObservation(row){if(row.kind==='exists')return fs.existsSync(row.file);if(row.kind==='directory')return fs.readdirSync(row.file).sort();if(row.kind==='stat'){try{return statShape(fs.lstatSync(row.file));}catch(e){if(e.code==='ENOENT')return null;throw e;}}throw error('VALIDATION_RECEIPT_INVALID','未知依赖类型');}
function receipt(phase){return{schema_version:1,files:[...phase.files].map(([file,bytes])=>({file,digest:checksum(bytes)})),observations:[...phase.observations.values()]};}
function checkReceipt(value){
 if(value?.schema_version!==1||!Array.isArray(value.files)||!Array.isArray(value.observations))throw error('VALIDATION_RECEIPT_INVALID','缺少受控校验进程的依赖');
 for(const row of value.files){if(!path.isAbsolute(row.file)||!/^[a-f0-9]{64}$/.test(row.digest))throw error('VALIDATION_RECEIPT_INVALID','非法文件依赖');try{if(checksum(fs.readFileSync(row.file))!==row.digest)throw Error('changed');}catch{throw error('VALIDATION_INPUT_CHANGED',row.file);}}
 for(const row of value.observations){if(!path.isAbsolute(row.file))throw error('VALIDATION_RECEIPT_INVALID','非法路径依赖');try{if(JSON.stringify(actualObservation(row))!==JSON.stringify(row.value))throw Error('changed');}catch{throw error('VALIDATION_INPUT_CHANGED',row.file);}}
}
function mergedReceipt(phase){
 const files=new Map(),observations=new Map();
 for(const part of [receipt(phase),...phase.children]){
  if(part?.schema_version!==1||!Array.isArray(part.files)||!Array.isArray(part.observations))throw error('VALIDATION_RECEIPT_INVALID','缺少受控校验进程的依赖');
  for(const row of part.files){if(typeof row.file!=='string'||!path.isAbsolute(row.file)||!/^[a-f0-9]{64}$/.test(row.digest))throw error('VALIDATION_RECEIPT_INVALID','非法文件依赖');if(files.has(row.file)&&files.get(row.file).digest!==row.digest)throw error('VALIDATION_INPUT_CHANGED',row.file);files.set(row.file,row);}
  for(const row of part.observations){if(typeof row.file!=='string'||!path.isAbsolute(row.file)||!['stat','exists','directory'].includes(row.kind))throw error('VALIDATION_RECEIPT_INVALID','非法路径依赖');const key=`${row.kind}\0${row.file}`;if(observations.has(key)&&JSON.stringify(observations.get(key).value)!==JSON.stringify(row.value))throw error('VALIDATION_INPUT_CHANGED',row.file);observations.set(key,row);}
 }
 return{schema_version:1,files:[...files.values()],observations:[...observations.values()]};
}
export function acceptValidationDependencies(value){
 const phase=current();if(!phase)throw error('VALIDATION_PHASE_REQUIRED','子进程依赖必须交回本次验证阶段');
 // Compare parent/child observations now; verify their union against disk before returning.
 phase.children.push(structuredClone(value));mergedReceipt(phase);
}
export function validationDependencies(){const phase=current();if(!phase)throw error('VALIDATION_PHASE_REQUIRED','没有活动阶段');return structuredClone(mergedReceipt(phase));}
export function validationCache(namespace,key,...values){const phase=current();if(!phase)return undefined;const cache=phase.memo.get(namespace)||new Map();phase.memo.set(namespace,cache);if(values.length)cache.set(key,structuredClone(values[0]));return structuredClone(cache.get(key));}
export function validationMemo(namespace,key,compute){const phase=current();if(!phase)return compute();const cache=phase.memo.get(namespace)||new Map();phase.memo.set(namespace,cache);if(!cache.has(key))cache.set(key,structuredClone(compute()));return structuredClone(cache.get(key));}
export function validationPhaseToken(){return current()?.token;}
export function inValidationPhase(){return !!current();}
export function withValidationPhase(binding,action){
 const parent=current(),identity=JSON.stringify({root:path.resolve(binding.root||process.cwd()),purpose:binding.purpose,unit:binding.work_unit_id||null,slice:binding.slice_id||null,readOnly:binding.readOnly===true});
 if(binding.signal?.aborted)throw error('VALIDATION_CANCELLED','验证阶段已取消');
 if(parent?.identity===identity&&(!binding.signal||binding.signal===parent.signal))return action();
 const phase={identity,token:Object.freeze({}),active:true,files:new Map(),observations:new Map(),memo:new Map(),children:[],signal:binding.signal};
 const finish=value=>{try{current();const dependencies=mergedReceipt(phase);checkReceipt(dependencies);if(parent){parent.children.push(dependencies);mergedReceipt(parent);}return value;}finally{phase.active=false;}};
 return phases.run(phase,()=>{try{const value=action();if(value&&typeof value.then==='function')return value.then(finish,error=>{phase.active=false;throw error;});return finish(value);}catch(error){phase.active=false;throw error;}});
}
export default {...fs,readFileSync,existsSync,lstatSync,readdirSync};
