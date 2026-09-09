import {mkdtempSync,mkdirSync,copyFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.argv[2];
const {parseContextContract}=await import(pathToFileURL(path.join(root,'scripts/lib/context-contract.mjs')));
const temp=mkdtempSync(path.join(tmpdir(),'yss-context-scale-'));
try {
 copyFileSync(path.join(root,'CONTEXT.md'),path.join(temp,'CONTEXT.md'));
 let created=0;const rows=[];
 for(const count of [10,1000,10000]) {
  const start=performance.now();while(created<count)mkdirSync(path.join(temp,String(created++)));
  const setup_ms=performance.now()-start,times=[];
  for(let i=0;i<5;i++){const t=performance.now();parseContextContract({root:temp});times.push(performance.now()-t);}
  rows.push({directories:count,setup_ms,api_times_ms:times});
 }
 mkdirSync(path.join(temp,'nested'));copyFileSync(path.join(temp,'CONTEXT.md'),path.join(temp,'nested/CONTEXT.md'));
 let blocked=false;try{parseContextContract({root:temp})}catch{blocked=true}if(!blocked)throw Error('nested Context bypass');
 console.log(JSON.stringify({kind:'context-scale',rows,nested_rejected:true}));
}finally{rmSync(temp,{recursive:true,force:true});}
