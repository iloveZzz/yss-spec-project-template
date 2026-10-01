import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';
import {validateJsonSchemas} from '../source/scripts/lib/json-schema.mjs';
const name=process.argv[2],cwd=process.cwd(),root=path.resolve(cwd,'../source');
const audit=process.env.PILOT_AUDIT;if(audit)fs.appendFileSync(audit,JSON.stringify({task:name,at:Date.now()})+'\n');
const data=JSON.parse(fs.readFileSync('inputs/data.json')),schema=path.resolve('inputs/schema.json');
const [check]=name==='schema'?validateJsonSchemas([{schemaPath:schema,value:data}]):[{valid:true,error:''}];
const ref=JSON.parse(fs.readFileSync('inputs/reference.json')),ignored=JSON.parse(fs.readFileSync('inputs/ignored.json'));
if(!check.valid||!ignored.enabled||process.env.PILOT_MODE==='fail'){console.error('PILOT_INPUT_REJECTED',check.error);process.exit(2);}
const commands={query:['scripts/query-lifecycle-context','--mode','route','--stage','stage.plan','--work-unit','work-unit.plan-requirements','--include','execution_efficiency'],checks:['--test','--test-concurrency=1','tests/verification-selection.test.mjs','scripts/fixtures/contract-efficiency/phase.test.mjs']};
let payload;
if(name==='schema')payload={valid:check.valid};
else{const res=spawnSync(process.execPath,commands[name],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});if(res.status!==0){process.stderr.write(res.stderr+res.stdout);process.exit(res.status??1)}
payload=name==='query'?JSON.parse(res.stdout):{passed:true,test_names:res.stdout.split('\n').filter(x=>/^ok \d+ - /.test(x)).map(x=>x.replace(/^ok \d+ - /,''))};}
const inputs=Object.fromEntries(fs.readdirSync('inputs').sort().map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync('inputs/'+f)).digest('hex')]));
fs.mkdirSync('out/'+name,{recursive:true});fs.writeFileSync('out/'+name+'/result.json',JSON.stringify({task:name,payload,inputs,mode:process.env.PILOT_MODE??''})+'\n');

fs.writeFileSync('out/'+name+'/manifest.json',JSON.stringify({sha256:crypto.createHash('sha256').update(fs.readFileSync('out/'+name+'/result.json')).digest('hex')})+'\n');
