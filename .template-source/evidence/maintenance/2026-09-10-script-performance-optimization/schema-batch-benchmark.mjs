import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.argv[2],batch=process.argv[3]==='batch';
const api=await import(pathToFileURL(path.join(root,'scripts/lib/json-schema.mjs')));
const temp=mkdtempSync(path.join(tmpdir(),'yss-schema-batch-'));
try{
 const schemaPath=path.join(temp,'schema.json');writeFileSync(schemaPath,JSON.stringify({type:'object',required:['id'],properties:{id:{type:'integer'}},additionalProperties:false}));
 const jobs=Array.from({length:100},(_,i)=>({value:i%2?{id:i}:{id:'invalid'},schemaPath}));
 const times=[],counts=[];
 for(let i=0;i<5;i++) {
  const t=performance.now();let rejected=0;
  if(batch)rejected=api.validateJsonSchemas(jobs).filter(x=>!x.valid).length;
  else for(const job of jobs)try{api.validateJsonSchema(job.value,job.schemaPath)}catch{rejected++}
  if(rejected!==50)throw Error('schema result mismatch');counts.push(rejected);times.push(performance.now()-t);
 }
 console.log(JSON.stringify({kind:'schema-batch',batch,items:100,api_times_ms:times,rejected:counts}));
}finally{rmSync(temp,{recursive:true,force:true});}
