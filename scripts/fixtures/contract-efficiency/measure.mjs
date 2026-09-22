import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const output=process.argv[2],runs=Number(process.argv[3]||30),scenarios=(process.argv[4]||'mvc,ddd,frontend,cross-repo,no-api,stale,invalid-approval,view').split(',');
if(!output||!Number.isInteger(runs)||runs<1)throw Error('Usage: measure.mjs <output.json> [runs=30] [scenarios]');
const report={kind:'synthetic-contract-efficiency',node:process.version,platform:`${process.platform}/${process.arch}`,warmup:3,runs,measures:{}};
for(const scenario of scenarios){const rows=[];for(let i=-3;i<runs;i++){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'yss-contract-profile-'));
 try{const out=spawnSync(process.execPath,['--import',path.join(import.meta.dirname,'profile.mjs'),path.join(import.meta.dirname,'worker.mjs'),scenario],{encoding:'utf8',env:{...process.env,YSS_CONTRACT_PROFILE_DIR:temp},timeout:60000,maxBuffer:4*1024*1024});if(out.status!==0)throw Error(out.stderr||out.stdout);if(i>=0)rows.push(JSON.parse(out.stdout));}finally{fs.rmSync(temp,{recursive:true,force:true});}
 }
 const values=rows.map(r=>r.elapsed_ms).sort((a,b)=>a-b),q=p=>values[Math.ceil(values.length*p)-1];
 report.measures[scenario]={p50_ms:q(.5),p95_ms:q(.95),rows};fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.error(`${scenario}: p50=${q(.5).toFixed(1)} ms p95=${q(.95).toFixed(1)} ms`);
}
