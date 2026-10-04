// Analysis-only instrumentation. It never changes validator inputs, results or cache scope.
import cp from 'node:child_process';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {syncBuiltinESMExports} from 'node:module';
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const active=Symbol.for('yss.python-schema-probe');
const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return (sorted[Math.floor((sorted.length-1)/2)]+sorted[Math.floor(sorted.length/2)])/2;};

export function installSchemaProbe({root=process.cwd()}={}) {
 if(cp[active])throw Error('schema probe already installed');
 const original=cp.spawnSync, batches=[], representatives=new Map(), operations=new Set();let operation=null,closed=false;
 cp[active]=true;
 function observe(args) {
  const [command,argv,options]=args;
  if(!/^python(?:3(?:\.\d+)?)?$/.test(path.basename(String(command)))||argv?.[0]!=='-c'||!String(argv[1]).includes('Draft202012Validator')||!options?.input)return null;
  const jobs=JSON.parse(String(options.input));if(!Array.isArray(jobs))return null;
  const rows=jobs.map(job=>{
   const boundaries=[...new Set((job.value?.request?.items||[]).map(x=>x.boundary).filter(x=>typeof x==='string'&&/^[a-z][a-z0-9.-]{0,100}$/.test(x)))].sort();
   const boundary=boundaries.length?boundaries.join('+'):`schema:${path.basename(job.schemaPath)}`;
   const relative=path.relative(root,job.schemaPath),schema=relative.startsWith('..')||path.isAbsolute(relative)?path.basename(job.schemaPath):relative;
   const settings={format_checker:job.formatChecker,error_style:job.errorStyle,cwd_sha256:hash(path.resolve(options.cwd||process.cwd())),timeout_ms:options.timeout};
   const row={schema_path:schema,schema_path_sha256:hash(path.resolve(job.schemaPath)),schema_sha256:hash(job.schemaText),resources_sha256:hash(job.resources||[]),input_sha256:hash(job.value),options:settings,boundary};
   row.job_sha256=hash([row.schema_path_sha256,row.schema_sha256,row.resources_sha256,row.input_sha256,settings]);
   const representativeKey=hash([schema,boundary,row.schema_sha256,row.resources_sha256]);
   if(!representatives.has(representativeKey))representatives.set(representativeKey,{job,row});
   return row;
  });
  return {operation_id:operation?.id??'unscoped',entrypoint:operation?.entrypoint??'unscoped',jobs:rows};
 }
 const wrapper=function(...args) {
  let row;try {row=observe(args);}catch {row={operation_id:operation?.id??'unscoped',entrypoint:operation?.entrypoint??'unscoped',jobs:[],diagnostic_error:'unrecognized schema payload'};}
  const start=performance.now();let result;
  try {result=original.apply(this,args);return result;}
  finally {if(row)batches.push({...row,batch_id:batches.length,duration_ms:performance.now()-start,exit_code:result?.status??null,timed_out:result?.error?.code==='ETIMEDOUT'});}
 };
 cp.spawnSync=wrapper;syncBuiltinESMExports();
 return {
  withOperation({id,entrypoint},fn) {
   if(closed||operation||!id||!entrypoint||operations.has(id))throw Error('schema probe requires a distinct synchronous operation');
   operations.add(id);
   operation={id,entrypoint};try{return fn();}finally{operation=null;}
  },
  report() {
   const groups=new Map(),cross=new Map();
   for(const batch of batches)for(const job of batch.jobs){
    const key=JSON.stringify([batch.operation_id,job.boundary]);
    const group=groups.get(key)||{operation_id:batch.operation_id,entrypoint:batch.entrypoint,boundary:job.boundary,jobs:0,unique:new Set()};group.jobs++;group.unique.add(job.job_sha256);groups.set(key,group);
    const appearances=cross.get(job.job_sha256)||new Set();appearances.add(`${batch.operation_id}/${job.boundary}`);cross.set(job.job_sha256,appearances);
   }
   return {schema_version:1,kind:'python-schema-diagnostic',batches:structuredClone(batches),groups:[...groups.values()].map(({unique,...row})=>({...row,unique_jobs:unique.size,repeated_jobs:row.jobs-unique.size,classification:row.jobs===unique.size?'distinct-inputs':'same-operation-repeat-candidate'})),cross_operation_repeated_jobs:[...cross.values()].filter(x=>x.size>1).length,cache_policy:'Cross-operation and cross-approval reuse is forbidden; repeated jobs are candidates, not cache authorization.'};
  },
  measurePython(samples=5) {
   if(!Number.isSafeInteger(samples)||samples<1||samples>20)throw Error('samples must be 1..20');
   const run=(code,input)=>{const start=performance.now();const r=original('python3',['-c',code],{input,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});if(r.error||r.status!==0)throw Error(`Python diagnostic subprocess failed: exit_code=${r.status}, ${r.error?.message||r.stderr||'no stderr'}`);return {wall_ms:performance.now()-start,stdout:r.stdout};};
   const startup=[],imports=[];for(let i=0;i<samples;i++){startup.push(run('pass').wall_ms);imports.push(run('from jsonschema import Draft202012Validator, FormatChecker').wall_ms);}
   const code=String.raw`
import sys,json,time
t=time.perf_counter()
from jsonschema import Draft202012Validator,FormatChecker
from referencing import Registry,Resource
from referencing.jsonschema import DRAFT202012
i=(time.perf_counter()-t)*1000
x=json.load(sys.stdin)
t=time.perf_counter()
schema=json.loads(x['schemaText'])
Draft202012Validator.check_schema(schema)
registry=Registry()
for resource in x.get('resources', []):
    contents=json.loads(resource['text'])
    Draft202012Validator.check_schema(contents)
    registry=registry.with_resource(resource['uri'],Resource.from_contents(contents,default_specification=DRAFT202012))
v=Draft202012Validator(schema,registry=registry,format_checker=FormatChecker() if x['formatChecker'] else None)
valid=not list(v.iter_errors(x['value']))
print(json.dumps({'import_ms':i,'compile_and_validate_ms':(time.perf_counter()-t)*1000,'valid':valid}))
`;
   const validation=[];
   for(const {job,row} of representatives.values()){
    const measurements=[];for(let i=0;i<samples;i++){const r=run(code,JSON.stringify(job));measurements.push({wall_ms:r.wall_ms,...JSON.parse(r.stdout)});}
    validation.push({schema_path:row.schema_path,boundary:row.boundary,input_sha256:row.input_sha256,resources_sha256:row.resources_sha256,status:'measured',samples:measurements});
   }
   return {samples,python_startup_ms:startup,python_with_import_ms:imports,startup_median_ms:median(startup),with_import_median_ms:median(imports),validation,note:'Standalone fresh Python processes and synthetic fixture inputs. Import and validation have internal timers; differences between wall-time medians are not exact phase attribution.'};
  },
  close(){if(closed)return;cp.spawnSync=original;delete cp[active];syncBuiltinESMExports();closed=true;representatives.clear();},
 };
}
