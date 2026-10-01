import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {validateJsonSchemas} from './source/scripts/lib/json-schema.mjs';
const P=path.dirname(fileURLToPath(import.meta.url)), R=path.join(P,'source');
const req=createRequire(path.join(P,'tools/package.json'));
const Ajv=req('ajv/dist/2020').default, formats=req('ajv-formats');
const dir=path.join(P,'schema-inputs');fs.mkdirSync(dir,{recursive:true});
const groups=[], excluded=[];
const external=s=>/"\$(?:ref|dynamicRef)"\s*:\s*"(?!#)/.test(JSON.stringify(s));
for(const f of fs.readdirSync(path.join(P,'json-schema-suite/tests/draft2020-12')).filter(x=>x.endsWith('.json'))){
 const data=JSON.parse(fs.readFileSync(path.join(P,'json-schema-suite/tests/draft2020-12',f)));
 data.forEach((g,i)=>{const id=`suite-${f}-${i}`;if(external(g.schema)){excluded.push({id,reason:'external-reference',tests:g.tests.length});return;}groups.push({...g,id,formatChecker:false,kind:'official-core'});});
}
for(const f of fs.readdirSync(path.join(P,'json-schema-suite/tests/draft2020-12/optional/format')).filter(x=>x.endsWith('.json'))){
 const data=JSON.parse(fs.readFileSync(path.join(P,'json-schema-suite/tests/draft2020-12/optional/format',f)));
 data.forEach((g,i)=>{if(!external(g.schema))groups.push({...g,id:`format-${f}-${i}`,formatChecker:true,kind:'official-format'});});
}
const local=[
 ['.template-spec/process/schemas/digital-human-task-package.schema.json','.template-source/evidence/maintenance/2026-09-30-shadcn-vue-design-research/owner-task.json'],
 ['.template-source/process/schemas/maintenance-checkpoint.schema.json',null],
];
for(const [schemaRef,dataRef] of local){
 if(!fs.existsSync(path.join(R,schemaRef))) {excluded.push({id:schemaRef,reason:'missing-local-schema'});continue;}
 const schema=JSON.parse(fs.readFileSync(path.join(R,schemaRef)));
 const valid=dataRef?JSON.parse(fs.readFileSync(path.join(R,dataRef))):{schema_version:2,intensity:'L1',classification_reason:'pilot',triggers:['textual-only'],changed_assets:['README.md'],verification_evidence:[{kind:'relevant-check',command:'example',result:'pass'}],review_mode:'self-check',escalation:'none',target_state:'implementation-ready',current_state:'implementation-ready',verification_profile:'fast',review_round:0,candidate_digest:null};
 const tests=[{description:'original',data:valid}];
 for(const field of schema.required||[]){const x=structuredClone(valid);delete x[field];tests.push({description:`delete-${field}`,data:x});}
 for(const [field,value] of Object.entries(valid)){const x=structuredClone(valid);x[field]=typeof value==='string'?42:'wrong-type';tests.push({description:`type-${field}`,data:x});}
 for(const value of [null,[],false,'中文🙂',{...valid,unexpected:true}])tests.push({description:'root-or-extra',data:value});
 groups.push({id:`local-${path.basename(schemaRef)}`,schema,tests,formatChecker:true,kind:'repository'});
}
const inventory=[];
for(const base of ['.template-spec/process/schemas','.template-source/process/schemas']){
 for(const file of fs.readdirSync(path.join(R,base)).filter(x=>x.endsWith('.json'))){
  try{const ajv=new Ajv({strict:false,allErrors:true,validateFormats:true,logger:false});formats(ajv);ajv.compile(JSON.parse(fs.readFileSync(path.join(R,base,file))));inventory.push({schema:base+'/'+file,compiled:true});}
  catch(e){inventory.push({schema:base+'/'+file,compiled:false,error:e.message});}
 }
}
const results=[];
for(let i=0;i<groups.length;i++){
 const g=groups[i],schemaPath=path.join(dir,`${i}.json`);fs.writeFileSync(schemaPath,JSON.stringify(g.schema));
 let validate,compileError;
 try{const ajv=new Ajv({strict:false,allErrors:true,validateFormats:g.formatChecker,logger:false,coerceTypes:false,useDefaults:false,removeAdditional:false});formats(ajv);validate=ajv.compile(g.schema);}catch(e){compileError=e.message;}
 const py=validateJsonSchemas(g.tests.map(t=>({schemaPath,value:t.data,formatChecker:g.formatChecker})),{timeoutMs:10000});
 g.tests.forEach((t,j)=>{
  let av=null,err=compileError,errors=null;
  if(validate){try{av=Boolean(validate(t.data));errors=structuredClone(validate.errors);err=errors?JSON.stringify(errors):'';}catch(e){err=e.message;}}
  results.push({group:g.id,kind:g.kind,description:t.description,expected:t.valid??null,python_valid:py[j].valid,ajv_valid:av,decision_match:py[j].valid===av,diagnostic_match:py[j].error===err,python_error:py[j].error.slice(0,1800),ajv_error:err?.slice(0,1800),python_exception:py[j].error.includes('Traceback (most recent call last)'),ajv_compile_error:compileError??null});
 });
}
const summarize=rows=>({tests:rows.length,decision_mismatches:rows.filter(x=>!x.decision_match).length,diagnostic_mismatches:rows.filter(x=>!x.diagnostic_match).length,python_exceptions:rows.filter(x=>x.python_exception).length,ajv_compile_errors:rows.filter(x=>x.ajv_compile_error).length,python_expected_mismatches:rows.filter(x=>x.expected!==null&&x.python_valid!==x.expected).length,ajv_expected_mismatches:rows.filter(x=>x.expected!==null&&x.ajv_valid!==x.expected).length});
const out={versions:{ajv:req('ajv/package.json').version,formats:req('ajv-formats/package.json').version},summary:Object.fromEntries(['official-core','official-format','repository'].map(k=>[k,summarize(results.filter(x=>x.kind===k))])),excluded,inventory,results};
fs.writeFileSync(path.join(P,'schema-audit.json'),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({summary:out.summary,excluded:excluded.length,inventory:inventory.length,compileFailed:inventory.filter(x=>!x.compiled)},null,2));
