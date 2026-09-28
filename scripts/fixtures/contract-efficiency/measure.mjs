import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runCommand} from '../../lib/command-runner.mjs';
import {verificationInputDigest} from '../../lib/verification-report.mjs';
const output=process.argv[2],runs=Number(process.argv[3]||30),scenarios=(process.argv[4]||'mvc,ddd,frontend,cross-repo,no-api,stale,invalid-approval,view').split(',');
if(!output||!Number.isInteger(runs)||runs<3)throw Error('Usage: measure.mjs <output.json> [runs=30; long>=3] [scenarios]');
const root=path.resolve(import.meta.dirname,'../../..'),digest=verificationInputDigest(root),started=performance.now();
const report={kind:'synthetic-contract-efficiency',status:'running',started_at:new Date().toISOString(),command:process.argv,node:process.version,platform:`${process.platform}/${process.arch}`,load_average:os.loadavg(),input_sha256:digest,cache_condition:'fresh child processes; uncontrolled OS cache',warmup:3,runs,wall_ms:null,runtime_tokens:null,human_wait_ms:null,unobserved_reason:'synthetic CLI does not observe real Agent tokens or human waiting',measures:{}};
const save=()=>fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');save();
try {
 for(const scenario of scenarios){const rows=[];report.measures[scenario]={status:'running',rows};
  for(let i=-3;i<runs;i++){
   const temp=fs.mkdtempSync(path.join(os.tmpdir(),'yss-contract-profile-')),start=performance.now();
   try{const command=[process.execPath,'--import',path.join(import.meta.dirname,'profile.mjs'),path.join(import.meta.dirname,'worker.mjs'),scenario];const out=await runCommand(command[0],command.slice(1),{env:{...process.env,YSS_CONTRACT_PROFILE_DIR:temp},timeoutMs:60000});
    const execution={command,executed_at:new Date().toISOString(),exit_code:out.status,signal:out.signal,termination:out.termination,wall_ms:performance.now()-start,output_bytes:Buffer.byteLength(out.stdout||'')+Buffer.byteLength(out.stderr||'')};
    if(out.status!==0){report.failure={...execution,scenario,warmup:i<0,stderr:out.stderr,error:out.error?.message};throw Error('measurement failed');}
    if(i>=0)rows.push({...JSON.parse(out.stdout),execution});save();
   }finally{fs.rmSync(temp,{recursive:true,force:true});}
  }
  const values=rows.map(r=>r.elapsed_ms).sort((a,b)=>a-b),q=p=>values[Math.ceil(values.length*p)-1];report.measures[scenario]={status:'passed',p50_ms:q(.5),p95_ms:q(.95),rows};save();console.error(`${scenario}: p50=${q(.5).toFixed(1)} ms p95=${q(.95).toFixed(1)} ms`);
 }
 if(verificationInputDigest(root)!==digest)throw Error('measurement inputs changed');report.status='passed';
}catch(error){report.status=report.failure?.termination==='cancelled'?'interrupted':'failed';report.error=error.message;process.exitCode=1;}finally{for(const scenario of scenarios){if(!report.measures[scenario])report.measures[scenario]={status:'not-executed',rows:[]};else if(report.measures[scenario].status==='running')report.measures[scenario].status=report.status;}report.finished_at=new Date().toISOString();report.wall_ms=performance.now()-started;save();}
