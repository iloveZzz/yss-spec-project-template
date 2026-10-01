import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';
const root=process.cwd(),dir='/tmp/yss-execution-research-20261001',mode=process.argv[2];
const schemaPath=path.join(root,'.template-spec/process/schemas/digital-human-task-package.schema.json');
const value=JSON.parse(fs.readFileSync(path.join(root,'.template-source/evidence/maintenance/2026-09-30-shadcn-vue-design-research/owner-task.json')));
const cases=[structuredClone(value)];
for(const mut of [x=>delete x.task_id,x=>x.unexpected=true,x=>x.contract.contract_version='bad',x=>x.allowed_write_paths=3,x=>x.schema_version=99]){const x=structuredClone(value);mut(x);cases.push(x)}
const jobs=Array.from({length:20},(_,i)=>({schemaPath,value:{...structuredClone(cases[i%6]),task_id:i%6===1?undefined:'probe-'+i}}));
let results;
if(mode==='python-single'||mode==='python-batch'){
 const api=await import(pathToFileURL(path.join(root,'scripts/lib/json-schema.mjs')));
 results=mode==='python-single'?jobs.flatMap(x=>api.validateJsonSchemas([x])):api.validateJsonSchemas(jobs);results=results.map(x=>x.valid);
}else if(mode==='ajv-compile'||mode==='generate'){
 const req=createRequire(dir+'/ajv-poc/package.json');const Ajv=req('ajv/dist/2020').default,formats=req('ajv-formats');const ajv=new Ajv({strict:false,allErrors:true,code:{source:true},coerceTypes:false,useDefaults:false,removeAdditional:false});formats(ajv);const validate=ajv.compile(JSON.parse(fs.readFileSync(schemaPath)));
 if(mode==='generate'){fs.writeFileSync(dir+'/standalone.cjs',req('ajv/dist/standalone').default(ajv,validate));process.exit(0)}
 results=jobs.map(x=>validate(x.value));
}else{const req=createRequire(dir+'/ajv-poc/package.json');const validate=req(dir+'/standalone.cjs');results=jobs.map(x=>validate(x.value))}
process.stdout.write(JSON.stringify({mode,results}));
