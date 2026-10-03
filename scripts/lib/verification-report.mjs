import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {intakeSnapshot} from './read-only-intake.mjs';
export const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function verificationInputDigest(root) {
  const git = args => {const r=spawnSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});if(r.status!==0)throw Error(r.stderr);return r.stdout;};
  return fingerprint({head:git(['rev-parse','HEAD']),index:git(['ls-files','--stage','-z']),files:intakeSnapshot(root,{excludeIgnoredToolState:true})});
}
export function resolveVerificationScope({profile,explicit=[],actual=[]}) {
  return {kind:explicit.length && profile==='fast'?'limited':'complete-candidate',files:[...new Set(explicit.length && profile==='fast'?explicit:[...actual,...explicit])].sort(),explicit_files:explicit};
}
export function createVerificationReport(plan,{root,inputDigest,concurrency,scope}) {
  return {schema_version:1,kind:'template-verification-report',status:'running',started_at:new Date().toISOString(),root,scope,plan,input_sha256:inputDigest,environment:{node:process.version,platform:process.platform,arch:process.arch,cpus:os.availableParallelism(),load_average:os.loadavg(),concurrency,cache_condition:'uncontrolled OS cache; no persistent result cache',input_observation:'tracked, untracked and ignored files; exclude only Git-ignored .codegraph/ and .idea/ tool state'},results:[],unexecuted:[],metrics:{wall_ms:null,unique_commands:0,reused_commands:0,output_bytes:0,tool_calls:null,duplicate_tool_calls:null,material_rounds:null,recoveries:null,observed_read_bytes:null,runtime_tokens:null,agent_active_ms:null,human_wait_ms:null,repeated_confirmations:null,first_acceptance:null,rework_reason:null,omitted_failures:null,permission_violations:null,unobserved_reason:'CLI cannot observe agent, human, token or external acceptance telemetry'}};
}
function updateExecutionMetrics(report) {
  if(!report.metrics||!Array.isArray(report.results))return;
  report.metrics.unique_commands=report.results.filter(x=>!x.reused&&!x.skipped).length;
  report.metrics.reused_commands=report.results.filter(x=>x.reused).length;
  report.metrics.output_bytes=report.results.filter(x=>!x.reused).reduce((n,x)=>n+[x.stdoutFile,x.stderrFile].reduce((m,f)=>m+(f&&fs.existsSync(f)?fs.statSync(f).size:0),0),0);
}
export function finalizeVerificationReport(report,{status,error=null,wallMs,repositoryMode}) {
  report.status=status;report.error=error;report.finished_at=new Date().toISOString();report.metrics.wall_ms=wallMs;
  updateExecutionMetrics(report);
  report.unexecuted=report.plan.commands.filter((x,index)=>!report.results.some(r=>r.index===index)).map(x=>({id:x.id,command:x.command,reason:x.when&&x.when!==repositoryMode?'repository-mode':'failure-or-interruption'}));
  report.unexecuted.push(...report.plan.selection.omitted.filter(()=>report.plan.selection.effective==='allowlist'));
  return report;
}
export function saveVerificationReport(directory,report) {
  updateExecutionMetrics(report);
  fs.mkdirSync(directory,{recursive:true});const file=path.join(directory,'report.json'),temp=file+'.tmp';
  fs.writeFileSync(temp,JSON.stringify(report,null,2)+'\n');fs.renameSync(temp,file);
}
