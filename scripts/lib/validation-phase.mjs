import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
import {sourceContextRef} from './source-context-snapshot.mjs';

// Only a live local call owns these snapshots. Neither receipts nor cache data confer approval.
const phases=new AsyncLocalStorage();
const checksum=bytes=>createHash('sha256').update(bytes).digest('hex');
const filename=value=>{const resolved=path.resolve(value instanceof URL?fileURLToPath(value):value);return path.basename(resolved)==='CONTEXT.md'?path.join(path.dirname(resolved),sourceContextRef(path.dirname(resolved),'CONTEXT.md')):resolved;};
const error=(code,detail)=>Object.assign(new TypeError(`${code}: ${detail}`),{code});
const current=()=>{const phase=phases.getStore();if(phase&&!phase.active)throw error('VALIDATION_PHASE_EXPIRED','验证阶段已经结束');if(phase?.signal?.aborted)throw error('VALIDATION_CANCELLED','验证阶段已取消');return phase;};
// Only live native calls register directories they just created; receipts cannot register exclusions.
export function registerValidationTransport(directory,parents){
 const phase=current();if(!phase)return;
 const allowed=[directory,path.dirname(directory),path.dirname(path.dirname(directory))];
 if(!path.isAbsolute(directory)||!/^input-\d+-[a-f0-9-]{36}$/.test(path.basename(directory))||path.basename(allowed[1])!=='native-candidates'||path.basename(allowed[2])!=='.work'||!parents.includes(directory)||parents.some(ref=>!allowed.includes(ref)))throw error('VALIDATION_RECEIPT_INVALID','非法临时传输范围');
 phase.transports.push({directory,parents:[...parents]});
}
function ownedTransport(file,transports){
 if(transports.some(row=>file===row.directory||file.startsWith(row.directory+path.sep)))return true;
 if(!transports.some(row=>row.parents.includes(file)))return false;
 if(!fs.existsSync(file))return true;
 const stat=fs.lstatSync(file);
 return stat.isDirectory()&&!stat.isSymbolicLink()&&fs.readdirSync(file).every(name=>ownedTransport(path.join(file,name),transports));
}
const statShape=stat=>({type:stat.isSymbolicLink()?'link':stat.isDirectory()?'directory':stat.isFile()?'file':'other',mode:Number(stat.mode),ino:String(stat.ino),dev:String(stat.dev)});
function observe(file,kind,read){const phase=current();if(!phase)return read();const key=`${kind}\0${file}`;if(!phase.observations.has(key))phase.observations.set(key,{file,kind,value:read()});return phase.observations.get(key).value;}
function pathIdentity(file){let part=path.parse(file).root;for(const name of path.relative(part,file).split(path.sep).filter(Boolean)){part=path.join(part,name);const nameRef=part;observe(nameRef,'stat',()=>{try{return statShape(fs.lstatSync(nameRef));}catch(e){if(e.code==='ENOENT')return null;throw e;}});}}
export function readFileSync(file,options){
 if(typeof file==='number')return fs.readFileSync(file,options);
 const ref=filename(file),phase=current();if(!phase||(typeof options==='object'&&options?.flag&&options.flag!=='r'))return fs.readFileSync(ref,options);
 pathIdentity(ref);
 if(!phase.files.has(ref))phase.files.set(ref,Buffer.from(fs.readFileSync(ref)));
 const bytes=phase.files.get(ref),encoding=typeof options==='string'?options:options?.encoding;
 return encoding?bytes.toString(encoding):Buffer.from(bytes);
}
export async function readFile(file,options){return readFileSync(file,options);}
export async function readdir(file,options){return readdirSync(file,options);}
export function existsSync(file){const phase=current();if(!phase||typeof file==='number')return fs.existsSync(file);const ref=filename(file);pathIdentity(ref);return observe(ref,'exists',()=>fs.existsSync(ref));}
export function lstatSync(file,options){const result=fs.lstatSync(file,options);const phase=current();if(phase&&result){const ref=filename(file);observe(ref,'stat',()=>statShape(result));}return result;}
export function readdirSync(file,options){
 let result=fs.readdirSync(file,options);const phase=current();
 if(phase)result=result.filter(entry=>!ownedTransport(path.join(filename(file),String(typeof entry==='string'||Buffer.isBuffer(entry)?entry:entry.name)),phase.transports));
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
function sameObservation(actual,expected,kind){
 if(kind!=='stat'||expected===null)return JSON.stringify(actual)===JSON.stringify(expected);
 if(!expected||typeof expected!=='object'||!Object.hasOwn(expected,'type')||(!Object.hasOwn(expected,'mode')&&!Object.hasOwn(expected,'permissions'))||Object.keys(expected).some(key=>!['type','mode','permissions','ino','dev'].includes(key)))throw error('VALIDATION_RECEIPT_INVALID','非法原生路径身份');
 if(!actual)return false;
 return Object.entries(expected).every(([key,value])=>(key==='permissions'?(actual.mode&0o7777):actual[key])===value);
}
function receipt(phase){return{schema_version:1,files:[...phase.files].map(([file,bytes])=>({file,digest:checksum(bytes)})),observations:[...phase.observations.values()]};}
function checkReceipt(value){
 if(value?.schema_version!==1||!Array.isArray(value.files)||!Array.isArray(value.observations))throw error('VALIDATION_RECEIPT_INVALID','缺少受控校验进程的依赖');
 for(const row of value.files){if(!path.isAbsolute(row.file)||!/^[a-f0-9]{64}$/.test(row.digest))throw error('VALIDATION_RECEIPT_INVALID','非法文件依赖');try{if(checksum(fs.readFileSync(row.file))!==row.digest)throw Error('changed');}catch{throw error('VALIDATION_INPUT_CHANGED',row.file);}}
 for(const row of value.observations){if(!path.isAbsolute(row.file))throw error('VALIDATION_RECEIPT_INVALID','非法路径依赖');try{if(!sameObservation(actualObservation(row),row.value,row.kind))throw Error('changed');}catch{throw error('VALIDATION_INPUT_CHANGED',row.file);}}
}
export const verifyValidationDependencies=checkReceipt;
function mergedReceipt(phase){
 const files=new Map(),observations=new Map();
 for(const part of [receipt(phase),...phase.children]){
  if(part?.schema_version!==1||!Array.isArray(part.files)||!Array.isArray(part.observations))throw error('VALIDATION_RECEIPT_INVALID','缺少受控校验进程的依赖');
  for(const row of part.files){if(typeof row.file!=='string'||!path.isAbsolute(row.file)||!/^[a-f0-9]{64}$/.test(row.digest))throw error('VALIDATION_RECEIPT_INVALID','非法文件依赖');if(ownedTransport(row.file,phase.transports))continue;if(files.has(row.file)&&files.get(row.file).digest!==row.digest)throw error('VALIDATION_INPUT_CHANGED',row.file);files.set(row.file,row);}
  for(let row of part.observations){if(typeof row.file!=='string'||!path.isAbsolute(row.file)||!['stat','exists','directory'].includes(row.kind))throw error('VALIDATION_RECEIPT_INVALID','非法路径依赖');if(ownedTransport(row.file,phase.transports))continue;if(row.kind==='directory')row={...row,value:row.value.filter(name=>!ownedTransport(path.join(row.file,name),phase.transports))};const key=`${row.kind}\0${row.file}`,prior=observations.get(key);if(prior&&JSON.stringify(prior.value)!==JSON.stringify(row.value)){if(row.kind!=='stat'||!prior.value||!row.value)throw error('VALIDATION_INPUT_CHANGED',row.file);const actual=actualObservation(row);if(!sameObservation(actual,prior.value,'stat')||!sameObservation(actual,row.value,'stat'))throw error('VALIDATION_INPUT_CHANGED',row.file);observations.set(key,{...row,value:{...prior.value,...row.value}});}else observations.set(key,row);}
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
// Only in-process callers may register a fixed operation. Serialized receipts
// contain observations, never executable commands or callbacks.
export function atValidationFinish(check,cleanup=()=>{}){
 const phase=current();if(!phase)throw error('VALIDATION_PHASE_REQUIRED','结束复验必须属于活动阶段');
 if(typeof check!=='function'||typeof cleanup!=='function')throw error('VALIDATION_RECEIPT_INVALID','非法结束复验');
 phase.finishChecks.push({check:()=>{if(phase.signal?.aborted)throw error('VALIDATION_CANCELLED','验证阶段已取消');check();},cleanup});
}
export function withValidationPhase(binding,action){
 const parent=current(),identity=JSON.stringify({root:path.resolve(binding.root||process.cwd()),purpose:binding.purpose,unit:binding.work_unit_id||null,slice:binding.slice_id||null,readOnly:binding.readOnly===true});
 if(binding.signal?.aborted)throw error('VALIDATION_CANCELLED','验证阶段已取消');
 if(parent?.identity===identity&&(!binding.signal||binding.signal===parent.signal))return action();
 const phase={identity,token:Object.freeze({}),active:true,files:new Map(),observations:new Map(),memo:new Map(),children:[],finishChecks:[],transports:[],signal:binding.signal};
 const cleanup=()=>{let failed=false,failure;try{for(const item of phase.finishChecks.splice(0).reverse()){try{item.cleanup();}catch(error){if(!failed){failed=true;failure=error;}}}}finally{phase.active=false;}if(failed)throw failure;};
 const abort=original=>{try{cleanup();}catch{}throw original;};
 const finish=value=>{try{current();if(parent){parent.transports.push(...phase.transports);const dependencies=mergedReceipt(phase);parent.children.push(dependencies);mergedReceipt(parent);parent.finishChecks.push(...phase.finishChecks.splice(0));cleanup();}else{for(const item of phase.finishChecks)item.check();cleanup();checkReceipt(mergedReceipt(phase));}return value;}catch(error){abort(error);}};
 return phases.run(phase,()=>{try{const value=action();if(value&&typeof value.then==='function')return value.then(finish,error=>abort(error));return finish(value);}catch(error){abort(error);}});
}
export default {...fs,readFileSync,existsSync,lstatSync,readdirSync};
