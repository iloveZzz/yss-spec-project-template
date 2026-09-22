// Test-only, process-local instrumentation. Never imported by production commands.
import fs from 'node:fs';
import crypto from 'node:crypto';
import child from 'node:child_process';
import { registerHooks, syncBuiltinESMExports } from 'node:module';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
const key=Symbol.for('yss.contract.measurement');
const fresh=()=>({reads:0,read_ms:0,hashes:0,hash_ms:0,parses:0,parse_ms:0,schema_requests:0,executed_schema_jobs:0,spawns:{},paths:{}});
let active=process.env.YSS_CONTRACT_PROFILE_CHILD==='1'?fresh():null;
const read=fs.readFileSync,write=fs.writeFileSync,hash=crypto.createHash,spawn=child.spawnSync;
globalThis[key]=(ms)=>{if(active){active.parses++;active.parse_ms+=ms;}};
globalThis[Symbol.for('yss.contract.schema-requests')]=(count)=>{if(active)active.schema_requests+=count;};
registerHooks({load(url,context,next){const result=next(url,context);if(url.endsWith('/scripts/vendor/yaml.mjs'))return{...result,source:String(result.source)+`\nconst __originalParse=parseDocument; parseDocument=function(...args){const t=performance.now();try{return __originalParse(...args);}finally{globalThis[Symbol.for('yss.contract.measurement')]?.(performance.now()-t);}};\n`};if(url.endsWith('/scripts/lib/json-schema.mjs'))return{...result,source:String(result.source)+`\nconst __originalSchema=validateJsonSchemas; validateJsonSchemas=function(items,...args){globalThis[Symbol.for('yss.contract.schema-requests')]?.(items.length);return __originalSchema(items,...args);};\n`};return result;}});
fs.readFileSync=function(file,...args){const t=performance.now();try{return read.call(this,file,...args);}finally{if(active){active.reads++;active.read_ms+=performance.now()-t;active.paths[String(file)]=(active.paths[String(file)]||0)+1;}}};
crypto.createHash=function(...args){const t=performance.now(),value=hash.apply(this,args);if(active){active.hashes++;active.hash_ms+=performance.now()-t;}for(const method of ['update','digest']){const original=value[method];value[method]=function(...values){const start=performance.now();try{return original.apply(this,values);}finally{if(active)active.hash_ms+=performance.now()-start;}};}return value;};
child.spawnSync=function(command,args,options={}){const measured=active;let forwarded=args,opts=options;
 if(active&&String(command).includes('python')&&options.input){try{const jobs=JSON.parse(String(options.input));if(Array.isArray(jobs)&&jobs.every(job=>job.schemaPath))active.executed_schema_jobs+=jobs.length;}catch{}}
 if(command===process.execPath&&active){forwarded=['--import',import.meta.filename,...args];opts={...options,env:{...process.env,...options.env,YSS_CONTRACT_PROFILE_CHILD:'1'}};}
 const t=performance.now();try{return spawn.call(this,command,forwarded,opts);}finally{if(measured){const kind=String(command).includes('python')?'python':command===process.execPath?'node':'other';const row=measured.spawns[kind]??={count:0,ms:0};row.count++;row.ms+=performance.now()-t;}}};
syncBuiltinESMExports();
export function begin(){active=fresh();}
export function end(){const result=active;active=null;return result;}
process.on('exit',()=>{if(active&&process.env.YSS_CONTRACT_PROFILE_DIR)write(path.join(process.env.YSS_CONTRACT_PROFILE_DIR,`${process.pid}.json`),JSON.stringify(active));});
