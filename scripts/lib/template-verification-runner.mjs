import { spawn } from "node:child_process";
import { once } from "node:events";
import { createReadStream, createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { StringDecoder } from "node:string_decoder";
import { assertNodeVersion } from "./runtime-store.mjs";
import { killTree } from "./command-runner.mjs";

function commandKey(item, cwd) {
  return `${item.when ?? ""}\0${cwd}\0${item.command.trim()}\0${JSON.stringify(item.depends_on || [])}`;
}

class ResourceLocks {
  #held = new Map();

  async run(resources, operation) {
    const names = [...new Set(resources || [])].sort();
    while (true) {
      const blockers = names.map((name) => this.#held.get(name)).filter(Boolean);
      if (blockers.length === 0) break;
      await Promise.race(blockers);
    }
    let release;
    const token = new Promise((resolve) => { release = resolve; });
    for (const name of names) this.#held.set(name, token);
    try {
      return await operation();
    } finally {
      for (const name of names) if (this.#held.get(name) === token) this.#held.delete(name);
      release();
    }
  }
}

function commandRedaction(command,environment,secrets=[]) {
  const sensitive=[...secrets,...Object.entries(environment).filter(([name])=>/(?:PASSWORD|TOKEN|SECRET)$/.test(name)||name==='MAVEN_REPO_USERNAME').map(([,value])=>value),...(command.match(/https?:\/\/[^\s"']+/g)||[]).flatMap(value=>{try{const url=new URL(value);return url.password?[url.password,decodeURIComponent(url.password)]:[];}catch{return[];}})].filter(value=>typeof value==='string'&&value.length).sort((a,b)=>b.length-a.length);
  const redact=text=>sensitive.reduce((value,secret)=>value.replaceAll(secret,'[REDACTED]'),text);
  const safeCommand=redact(command);
  return {sensitive,redact,safeCommand};
}

export function runCommandToFiles(command, { cwd, environment = process.env, logRoot, sequence, signal, runtimeSession, secrets = [], deferCommandRegistration = false, timeoutMs = 0, terminateProcess = killTree, onProcess = () => {} }) {
  assertNodeVersion();
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 0) throw new TypeError("timeoutMs 必须为非负整数");
  const {sensitive,redact,safeCommand}=commandRedaction(command,environment,secrets);
  const remember=result=>{
    if(runtimeSession&&!deferCommandRegistration)try{runtimeSession.recordCommand({...result,exit_code:result.code,termination:result.termination??(result.skipped?'cancelled':null)});}
    catch(error){result.storageError=[result.storageError,redact(error.message)].filter(Boolean).join('; ');}
    return result;
  };
  if(signal?.aborted)return Promise.resolve(remember({command:safeCommand,code:130,skipped:true,duration_ms:0,error:'interrupted',termination:'cancelled',actual_exit_code:null,actual_exit_signal:null,actual_exit_code_observed:false}));
  const redactingStream=()=>{
    const decoder=new StringDecoder('utf8');let pending='';
    const consume=final=>{let output='',cursor=0;while(cursor<pending.length){const secret=sensitive.find(value=>pending.startsWith(value,cursor));if(secret){output+='[REDACTED]';cursor+=secret.length;continue;}if(!final&&sensitive.some(value=>value.startsWith(pending.slice(cursor))))break;output+=pending[cursor++];}pending=pending.slice(cursor);return output;};
    return new Transform({transform(bytes,encoding,callback){pending+=decoder.write(bytes);callback(null,consume(false));},flush(callback){pending+=decoder.end();callback(null,consume(true));}});
  };
  mkdirSync(logRoot, { recursive: true });
  const stdoutFile = path.join(logRoot, `${sequence}.stdout`);
  const stderrFile = path.join(logRoot, `${sequence}.stderr`);
  return new Promise((resolve) => {
    const started = performance.now();
    process.stderr.write(`[开始] ${safeCommand}\n`);
    const child = spawn(command, { cwd, shell: true, env: environment, stdio: ["ignore", "pipe", "pipe"], detached: process.platform !== "win32" });
    let spawnError = "", termination = null, escalation, timer, killErrors = [];
    if(child.pid)onProcess({pid:child.pid,active:true});
    const kill = sig => { try { terminateProcess(child, sig); } catch(error) { killErrors.push(redact(error.message)); try { child.kill(sig); } catch (fallback) { killErrors.push(redact(fallback.message)); } } };
    const stop = reason => { if(termination)return; termination=reason; kill('SIGTERM'); escalation=setTimeout(()=>kill('SIGKILL'),1000); };
    const abort = () => stop('cancelled');
    if(timeoutMs)timer=setTimeout(()=>stop('timeout'),timeoutMs);
    signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
    const stdoutDone = pipeline(child.stdout, redactingStream(), createWriteStream(stdoutFile));
    const stderrDone = pipeline(child.stderr, redactingStream(), createWriteStream(stderrFile));
    // Attach rejection handlers immediately; the process may exit after a stream fails.
    const streamsDone = Promise.allSettled([stdoutDone, stderrDone]);
    child.on("error", (error) => { spawnError = `${error.message}\n`; });
    child.on("close", async (code, exitSignal) => {
      clearTimeout(escalation);clearTimeout(timer);signal?.removeEventListener('abort',abort);
      // Detached descendants may outlive a successful parent too.
      kill('SIGKILL');
      const streams = await streamsDone;
      const streamError = streams.find((result) => result.status === "rejected")?.reason;
      if(child.pid)onProcess({pid:child.pid,active:false});
      const duration_ms = Math.round(performance.now() - started);
      const exitCode = termination==='cancelled' ? 130 : termination==='timeout' ? 124 : killErrors.length || streamError || spawnError ? 1 : code ?? 1;
      process.stderr.write(`[${exitCode === 0 && !streamError ? "完成" : "失败"}] ${safeCommand} (${duration_ms}ms, exit=${exitCode})\n`);
      const observed=!spawnError&&Number.isInteger(code);
      const result = { command:safeCommand, code:exitCode, duration_ms, stdoutFile, stderrFile, error:redact([spawnError,streamError?.message,...killErrors].filter(Boolean).join("; ")),termination,actual_exit_code:observed?code:null,actual_exit_signal:spawnError?null:exitSignal??null,actual_exit_code_observed:observed };
      if(streamError)result.storageError=redact(streamError.message);
      if(killErrors.length)result.kill_errors=killErrors;
      resolve(remember(result));
    });
  });
}

export async function runGroups(plan, repositoryMode, concurrency, {
  cwd,
  environment = process.env,
  execute = runCommandToFiles,
  logRoot,
  signal,
  runtimeSession,
  runtimeEvent,
  onResult = () => {},
} = {}) {
  if(['qualified-gates','qualification-shadow'].includes(plan.strategy))return runDag(plan,repositoryMode,concurrency,{cwd,environment,execute,logRoot,signal,runtimeSession,runtimeEvent,onResult});
  const grouped = new Map(plan.groups.map((group) => [group, []]));
  const resourcesByExecution = new Map();
  for (const [index, item] of plan.commands.entries()) {
    if (item.when && item.when !== repositoryMode) continue;
    grouped.get(item.group).push({ ...item, index });
    const key = commandKey(item, cwd);
    resourcesByExecution.set(key, [...new Set([...(resourcesByExecution.get(key) || []), ...(item.resources || [])])]);
  }

  const groupResults = new Map([...grouped].map(([group]) => [group, []]));
  const jobs = [];
  for (const [group, commands] of grouped) {
    const lanes = new Map();
    const forceSerial = commands.some((item) => (item.parallel_unless_env || []).some((name) => environment[name]));
    for (const item of commands) {
      const lane = forceSerial ? "default" : item.lane || "default";
      if (!lanes.has(lane)) lanes.set(lane, []);
      lanes.get(lane).push(item);
    }
    for (const laneCommands of lanes.values()) jobs.push({ group, commands: laneCommands });
  }

  const failedGroups = new Set();
  const executions = new Map();
  const resourceLocks = new ResourceLocks();
  let executionSequence = 0;
  const executeOnce = (item) => {
    const key = commandKey(item, cwd);
    const cached = executions.get(key);
    if (cached) return { ...cached, reused: true };
    const sequence = executionSequence;
    executionSequence += 1;
    const promise = resourceLocks.run(resourcesByExecution.get(key), () => {
      if(signal?.aborted){
        const row={command:commandRedaction(item.command,environment).safeCommand,code:130,skipped:true,duration_ms:0,error:'interrupted',termination:'cancelled',actual_exit_code:null,actual_exit_signal:null,actual_exit_code_observed:false};
        if(runtimeSession)try{runtimeSession.recordEvent('command-skipped',{id:item.id,reason:'interrupted',exit_code:130});}catch(error){row.storageError=commandRedaction(item.command,environment).redact(error.message);}
        return row;
      }
      return execute(item.command,{cwd,environment,logRoot,sequence,signal,runtimeSession,timeoutMs:item.timeout_ms||0,deferCommandRegistration:Boolean(runtimeSession&&runtimeEvent)});
    });
    const execution={promise,ownerId:item.id,ownerIndex:item.index,ownerTaskId:item.task_id};
    executions.set(key, execution);
    return { ...execution, reused: false };
  };

  let cursor = 0;
  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor];
      cursor += 1;
      for (const item of job.commands) {
        if (failedGroups.has(job.group) || signal?.aborted) break;
        const execution = executeOnce(item);
        const result = await execution.promise;
        const row = { ...result, id:item.id, task_id:item.task_id, gate_ids:item.gate_ids||[], group:job.group, index: item.index, reused: execution.reused, ...(execution.reused ? {reused_from:{id:execution.ownerId,index:execution.ownerIndex,task_id:execution.ownerTaskId}} : {}) };
        if(runtimeSession&&runtimeEvent)try {
          const {command,stdoutFile,stderrFile,...summary}=row;
          const eventValue=row.skipped||row.storageError?row:{...summary,command_id:execution.ownerId};
          if(execution.reused||row.skipped)runtimeSession.recordEvent(runtimeEvent,eventValue);
          else {
            const commandRow={...row,exit_code:row.code,termination:row.termination??null};
            if(typeof runtimeSession.recordCommandAndEvent==='function')runtimeSession.recordCommandAndEvent(commandRow,runtimeEvent,eventValue);
            else {runtimeSession.recordCommand(commandRow);runtimeSession.recordEvent(runtimeEvent,eventValue);}
          }
        } catch(error) {
          result.storageError=[result.storageError,commandRedaction(item.command,environment).redact(error.message)].filter(Boolean).join('; ');
          row.storageError=result.storageError;
        }
        groupResults.get(job.group).push(row);
        onResult(row);
        if (row.code !== 0 || row.storageError) failedGroups.add(job.group);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length || 1) }, () => worker()));
  return [...groupResults]
    .filter(([, results]) => results.length > 0)
    .map(([group, results]) => ({ group, results: results.sort((left, right) => left.index - right.index) }));
}

async function replay(file, destination) {
  if (!file) return;
  for await (const chunk of createReadStream(file)) {
    if (!destination.write(chunk)) await once(destination, "drain");
  }
}

async function runDag(plan, repositoryMode, concurrency, options) {
  const {cwd,environment,execute,logRoot,signal,runtimeSession,runtimeEvent,onResult}=options;
  if(!Number.isInteger(concurrency)||concurrency<1||concurrency>4)throw new TypeError('concurrency 必须为 1..4');
  const tasks=plan.commands.map((item,index)=>({...item,index})).filter(item=>!item.when||item.when===repositoryMode);
  const byTaskId=new Map(),byCheckId=new Map();
  for(const item of tasks) {
    if(!item.id)throw new TypeError('DAG 检查缺少稳定 ID');
    item.execution_id=item.task_id||item.id;
    if(byTaskId.has(item.execution_id))throw new TypeError(`任务 occurrence ID 冲突: ${item.execution_id}`);
    const occurrences=byCheckId.get(item.id)||[];
    if(occurrences.some(previous=>previous.command.trim()!==item.command.trim()||(previous.when||'')!==(item.when||'')))throw new TypeError(`检查 ID 冲突: ${item.id}`);
    byTaskId.set(item.execution_id,item);byCheckId.set(item.id,[...occurrences,item]);
  }
  const resolveDependency=id=>{
    if(byTaskId.has(id))return byTaskId.get(id).execution_id;
    const occurrences=byCheckId.get(id)||[];
    if(!occurrences.length)throw new TypeError(`未知检查依赖: ${id}`);
    if(occurrences.length!==1)throw new TypeError(`检查依赖引用不明确: ${id}；请使用唯一 task_id`);
    return occurrences[0].execution_id;
  };
  for(const item of tasks)item.normalized_dependencies=[...new Set((item.depends_on||[]).map(resolveDependency))].sort();
  const visiting=new Set(),visited=new Set();
  const visit=id=>{ if(visiting.has(id))throw new TypeError(`检查依赖循环: ${id}`); if(visited.has(id))return; const item=byTaskId.get(id); visiting.add(id); for(const dependency of item.normalized_dependencies)visit(dependency); visiting.delete(id); visited.add(id); };
  for(const id of byTaskId.keys())visit(id);
  const serialGroups=new Set(tasks.filter(item=>(item.parallel_unless_env||[]).some(name=>environment[name])).map(item=>item.group));
  const lane=item=>`${item.group}\0${serialGroups.has(item.group)?'default':item.lane||'default'}`;
  const results=new Map(),completed=new Map(),active=new Map(),executions=new Map();
  let sequence=0;
  const resources=item=>item.resources||[];
  const exclusive=item=>Number(environment.YSS_TOOLING_CONCURRENCY)>1&&(item.kind==='tooling'||/pnpm.*\.template-source\/tooling\/node\s+test/.test(item.command));
  const remember=(item,row)=>{
    row={...row,id:item.id,task_id:item.task_id,gate_ids:item.gate_ids||[],group:item.group,index:item.index};
    if(runtimeSession&&runtimeEvent)try {
      if(row.skipped||row.reused)runtimeSession.recordEvent(runtimeEvent,row);
      else if(typeof runtimeSession.recordCommandAndEvent==='function')runtimeSession.recordCommandAndEvent({...row,exit_code:row.code},runtimeEvent,row);
      else {runtimeSession.recordCommand({...row,exit_code:row.code});runtimeSession.recordEvent(runtimeEvent,row);}
    }catch(error){row.storageError=error.message;row.code=1;}
    results.set(item.index,row);completed.set(item.execution_id,row);onResult(row);return row;
  };
  while(results.size<tasks.length) {
    let progressed=false;
    for(const item of tasks) {
      if(results.has(item.index)||active.has(item.index))continue;
      if(signal?.aborted) {remember(item,{command:item.command,code:130,skipped:true,termination:'cancelled',actual_exit_code:null,actual_exit_signal:null,actual_exit_code_observed:false,duration_ms:0,reused:false});progressed=true;continue;}
      const dependencies=item.normalized_dependencies.map(id=>completed.get(id));
      if(dependencies.some(row=>row&&(row.code!==0||row.skipped||row.storageError))) {remember(item,{command:item.command,code:1,skipped:true,termination:'dependency-failed',actual_exit_code:null,actual_exit_signal:null,actual_exit_code_observed:false,duration_ms:0,reused:false});progressed=true;continue;}
      if(dependencies.some(row=>!row))continue;
      if([...active.values()].some(job=>lane(job.item)===lane(item)))continue;
      const key=commandKey({...item,depends_on:item.normalized_dependencies},cwd)+'\0'+JSON.stringify([...new Set(resources(item))].sort()),previous=executions.get(key);
      if(previous) {
        if(!previous.row)continue;
        if(previous.row.code===0&&!previous.row.skipped&&!previous.row.storageError){remember(item,{...previous.row,reused:true,reused_from:{id:previous.item.id,task_id:previous.item.task_id,index:previous.item.index}});progressed=true;continue;}
        executions.delete(key);
      }
      if(active.size>=concurrency||[...active.values()].some(job=>exclusive(job.item))||exclusive(item)&&active.size)continue;
      if([...active.values()].some(job=>resources(job.item).some(resource=>resources(item).includes(resource))))continue;
      const execution={item,row:null};executions.set(key,execution);
      const promise=Promise.resolve().then(()=>execute(item.command,{cwd,environment,logRoot,sequence:sequence++,signal,runtimeSession,deferCommandRegistration:Boolean(runtimeSession&&runtimeEvent),timeoutMs:item.timeout_ms||0})).catch(error=>({command:item.command,code:1,error:error.message,actual_exit_code:null,actual_exit_signal:null,actual_exit_code_observed:false,duration_ms:0})).then(row=>{execution.row=remember(item,{...row,reused:false});active.delete(item.index);});
      active.set(item.index,{item,promise});progressed=true;
      if(exclusive(item))break;
    }
    if(active.size)await Promise.race([...active.values()].map(job=>job.promise));
    else if(!progressed&&results.size<tasks.length)throw new TypeError('DAG 无法调度：依赖与 lane 顺序冲突');
  }
  return [...new Set(tasks.map(item=>item.group))].map(group=>({group,results:[...results.values()].filter(row=>row.group===group).sort((a,b)=>a.index-b.index)}));
}

export async function printResults(groups) {
  for (const group of groups) {
    process.stdout.write(`\n[${group.group}]\n`);
    for (const result of group.results) {
      process.stdout.write(`$ ${result.command} (${result.duration_ms}ms)\n`);
      if (result.reused) process.stderr.write(`[复用] ${result.command}\n`);
      await replay(result.stdoutFile, process.stdout);
      await replay(result.stderrFile, process.stderr);
      if (result.error) process.stderr.write(result.error);
    }
  }
}
