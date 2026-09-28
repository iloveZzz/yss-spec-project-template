import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runGroups} from '../scripts/lib/template-verification-runner.mjs';
import {createVerificationReport,finalizeVerificationReport,saveVerificationReport} from '../scripts/lib/verification-report.mjs';
test('actual logs, deduplication, failures and wall time are distinct',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'report-'));const commands=[{group:'a',command:'node -e "console.log(123)"'},{group:'b',command:'node -e "console.log(123)"'},{group:'a',command:'node -e "process.exit(7)"'},{group:'a',command:'node -e "process.exit(99)"'},{group:'b',command:'ignored',when:'project-instance'}];
 const plan={groups:['a','b'],commands,selection:{omitted:[],effective:'shadow'}};const report=createVerificationReport(plan,{root:dir,inputDigest:'x',concurrency:2,scope:{kind:'limited'}});
 try{await runGroups(plan,'template-source',2,{cwd:dir,logRoot:dir,onResult:row=>{report.results.push(row);saveVerificationReport(dir,report);assert.ok(JSON.parse(fs.readFileSync(path.join(dir,'report.json'))).metrics.unique_commands>0,'partial reports must preserve observed execution counts');}});finalizeVerificationReport(report,{status:'failed',wallMs:123,repositoryMode:'template-source'});saveVerificationReport(dir,report);
 const saved=JSON.parse(fs.readFileSync(path.join(dir,'report.json')));assert.equal(saved.metrics.unique_commands,2);assert.equal(saved.metrics.reused_commands,1);assert.equal(saved.metrics.wall_ms,123);assert.equal(saved.metrics.runtime_tokens,null);assert.equal(saved.results.find(x=>x.code===7).code,7);assert.deepEqual(saved.unexecuted.map(x=>x.reason),['failure-or-interruption','repository-mode']);assert.ok(saved.metrics.output_bytes>0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('interruption preserves partial execution and marks remaining checks',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cancel-')),controller=new AbortController();const plan={groups:['a'],commands:[{group:'a',command:'node -e "setTimeout(()=>{},10000)"'},{group:'a',command:'never'}],selection:{omitted:[],effective:'shadow'}};const report=createVerificationReport(plan,{root:dir});const timer=setTimeout(()=>controller.abort(),100);
 try{await runGroups(plan,'template-source',1,{cwd:dir,logRoot:dir,signal:controller.signal,onResult:r=>report.results.push(r)});finalizeVerificationReport(report,{status:'interrupted',wallMs:100,repositoryMode:'template-source'});assert.equal(report.results[0].code,130);assert.equal(report.unexecuted.length,1);}finally{clearTimeout(timer);fs.rmSync(dir,{recursive:true,force:true});}
});
