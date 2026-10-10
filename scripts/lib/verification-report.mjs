import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {intakeSnapshot,createIntakeSnapshotObserver} from './read-only-intake.mjs';
export const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function verificationInputDigest(root) {
  return fingerprintInputs(root, intakeSnapshot(root,{excludeIgnoredToolState:true}));
}
function fingerprintInputs(root, files) {
  const git = args => {const r=spawnSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});if(r.status!==0)throw Error(r.stderr);return r.stdout;};
  return fingerprint({head:git(['rev-parse','HEAD']),index:git(['ls-files','--stage','-z']),files});
}
export function createVerificationInputObserver(root, options) {
  const observer = createIntakeSnapshotObserver(options);
  return { digest: () => fingerprintInputs(root, observer.snapshot(root,{excludeIgnoredToolState:true})), get metrics() { return observer.metrics; } };
}
export function resolveVerificationScope({profile,explicit=[],actual=[]}) {
  return {kind:profile==='fast'?'limited':'complete-candidate',files:[...new Set(explicit.length && profile==='fast'?explicit:[...actual,...explicit])].sort(),explicit_files:explicit};
}
export function createVerificationReport(plan,{root,inputDigest,concurrency,scope,invocation=null,sourcesManifest=null}) {
  if(plan.requested_profile==='fast')scope={...scope,kind:'limited'};
  return {schema_version:2,kind:'template-verification-report',purpose:'verification',status:'running',started_at:new Date().toISOString(),root:fs.realpathSync(root),scope,plan:structuredClone(plan),invocation,sources_manifest:sourcesManifest,final_exit:{code:null,signal:null,observed:false},input_sha256:inputDigest,environment:{node:process.version,platform:process.platform,arch:process.arch,cpus:os.availableParallelism(),load_average:os.loadavg(),concurrency,cache_condition:'uncontrolled OS cache; no persistent result cache',input_observation:'tracked, untracked and ignored files; exclude only Git-ignored .codegraph/ and .idea/ tool state'},results:[],unexecuted:[],not_applicable:structuredClone(plan.not_applicable||[]),gate_results:[],metrics:{wall_ms:null,unique_commands:0,reused_commands:0,test_files:0,subprocesses:0,assertions:null,output_bytes:0,tool_calls:null,duplicate_tool_calls:null,material_rounds:null,recoveries:null,observed_read_bytes:null,runtime_tokens:null,agent_active_ms:null,human_wait_ms:null,repeated_confirmations:null,first_acceptance:null,rework_reason:null,omitted_failures:null,permission_violations:null,unobserved_reason:'CLI cannot observe agent, human, token or external acceptance telemetry'}};
}
function updateExecutionMetrics(report) {
  if(!report.metrics||!Array.isArray(report.results))return;
  report.metrics.unique_commands=report.results.filter(x=>!x.reused&&!x.skipped).length;
  report.metrics.reused_commands=report.results.filter(x=>x.reused).length;
  report.metrics.subprocesses=report.results.filter(x=>!x.reused&&!x.skipped&&x.actual_exit_code_observed).length;
  report.metrics.test_files=new Set(report.results.flatMap(x=>x.test_files||[])).size;
  report.metrics.output_bytes=report.results.filter(x=>!x.reused).reduce((n,x)=>n+[x.stdoutFile,x.stderrFile].reduce((m,f)=>m+(f&&fs.existsSync(f)?fs.statSync(f).size:0),0),0);
}
function updateUnexecuted(report,{repositoryMode}={}) {
  if(!Array.isArray(report.plan?.commands)||!Array.isArray(report.results))return;
  const mode=repositoryMode??report.environment?.repository_mode,knownMode=['template-source','project-instance'].includes(mode);
  const modeNotApplicable=[];
  report.unexecuted=report.plan.commands.flatMap((task,index)=>{
    if(report.schema_version===2&&knownMode&&task.when&&task.when!==mode){modeNotApplicable.push({...task,reason:'repository-mode'});return [];}
    const result=report.results.find(row=>task.task_id?row.task_id===task.task_id:row.index===index);
    if(result&&result.skipped!==true)return [];
    const outsideMode=knownMode&&task.when&&task.when!==mode;
    const reason=result?.termination||result?.reason||(outsideMode?'repository-mode':result?'skipped':'failure-or-interruption');
    return [{id:task.id,task_id:task.task_id,command:task.command,reason}];
  });
  if(report.schema_version===2&&knownMode){
    const refersToTask=(row,task)=>task.task_id?row.task_id===task.task_id:row.id===task.id&&row.command===task.command;
    report.not_applicable=[...(report.not_applicable||report.plan.not_applicable||[]).filter(row=>row.reason!=='repository-mode'||!report.plan.commands.some(task=>refersToTask(row,task))),...modeNotApplicable];
  }
  if(report.schema_version===1&&report.plan.strategy!=='qualified-gates'&&report.plan.selection?.effective==='allowlist')report.unexecuted.push(...(report.plan.selection.omitted||[]));
}
function updateGateResults(report) {
  if(!Array.isArray(report.plan?.commands)||!Array.isArray(report.results))return;
  const resultFor=(task,index)=>report.results.find(row=>task.task_id?row.task_id===task.task_id:row.index===index||row.id===task.id);
  const passed=row=>row&&row.code===0&&!row.skipped&&!row.storageError;
  const observedSuccess=row=>{
    if(!passed(row))return false;
    const actual=row.reused?report.results.find(origin=>row.reused_from?.task_id?origin.task_id===row.reused_from.task_id:origin.index===row.reused_from?.index):row;
    return passed(actual)&&(!row.reused||actual!==row&&!actual.reused&&actual.command===row.command)&&actual.actual_exit_code_observed===true&&actual.actual_exit_code===0&&actual.actual_exit_signal===null;
  };
  const mode=report.environment?.repository_mode,knownMode=['template-source','project-instance'].includes(mode);
  const applicable=report.plan.commands.filter(task=>!knownMode||!task.when||task.when===mode);
  const finalIntegrity=report.status==='passed'&&report.final_exit?.observed===true&&report.final_exit.code===0&&report.final_exit.signal===null&&report.input_drift===false&&report.input_after_sha256===report.input_sha256&&Array.isArray(report.unexecuted)&&report.unexecuted.length===0&&applicable.length>0&&applicable.every(task=>observedSuccess(resultFor(task,report.plan.commands.indexOf(task))));
  report.gate_results=(report.plan.gates||[]).filter(gate=>gate.selected).map(gate=>{
    const tasks=applicable.filter(task=>task.gate_ids?.includes(gate.id)||gate.check_ids?.includes(task.id));
    const ownTasksPassed=tasks.length>0&&tasks.every(task=>passed(resultFor(task,report.plan.commands.indexOf(task))));
    return {id:gate.id,task_ids:tasks.map(task=>task.task_id||task.id),status:ownTasksPassed&&(gate.id!=='check.verification-final-integrity'||finalIntegrity)?'passed':'failed'};
  });
}
export function finalizeVerificationReport(report,{status,error=null,wallMs,repositoryMode}) {
  report.status=status;report.error=error;report.finished_at=new Date().toISOString();report.metrics.wall_ms=wallMs;
  if(repositoryMode!==undefined)(report.environment??={}).repository_mode=repositoryMode;
  updateExecutionMetrics(report);
  updateUnexecuted(report,{repositoryMode});
  updateGateResults(report);
  return report;
}
export function saveVerificationReport(directory,report) {
  updateExecutionMetrics(report);
  if(report.status!=='running')updateUnexecuted(report);
  updateGateResults(report);
  fs.mkdirSync(directory,{recursive:true});const file=path.join(directory,'report.json'),temp=file+'.tmp';
  fs.writeFileSync(temp,JSON.stringify(report,null,2)+'\n');fs.renameSync(temp,file);
}
