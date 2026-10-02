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
  return `${item.when ?? ""}\0${cwd}\0${item.command.trim()}`;
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

export function runCommandToFiles(command, { cwd, environment = process.env, logRoot, sequence, signal, runtimeSession, secrets = [], deferCommandRegistration = false }) {
  assertNodeVersion();
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
    let spawnError = "", cancelled = false, escalation;
    const kill = sig => killTree(child, sig);
    const abort = () => {cancelled=true;kill('SIGTERM');escalation=setTimeout(()=>kill('SIGKILL'),1000);};
    signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
    const stdoutDone = pipeline(child.stdout, redactingStream(), createWriteStream(stdoutFile));
    const stderrDone = pipeline(child.stderr, redactingStream(), createWriteStream(stderrFile));
    // Attach rejection handlers immediately; the process may exit after a stream fails.
    const streamsDone = Promise.allSettled([stdoutDone, stderrDone]);
    child.on("error", (error) => { spawnError = `${error.message}\n`; });
    child.on("close", async (code, exitSignal) => {
      clearTimeout(escalation);signal?.removeEventListener('abort',abort);
      if(cancelled)kill('SIGKILL');
      const streams = await streamsDone;
      const streamError = streams.find((result) => result.status === "rejected")?.reason;
      const duration_ms = Math.round(performance.now() - started);
      const exitCode = cancelled ? 130 : code ?? 1;
      process.stderr.write(`[${exitCode === 0 && !streamError ? "完成" : "失败"}] ${safeCommand} (${duration_ms}ms, exit=${exitCode})\n`);
      const observed=!spawnError&&Number.isInteger(code);
      const result = { command:safeCommand, code:exitCode, duration_ms, stdoutFile, stderrFile, error:redact(spawnError || streamError?.message || ""),termination:cancelled?'cancelled':null,actual_exit_code:observed?code:null,actual_exit_signal:spawnError?null:exitSignal??null,actual_exit_code_observed:observed };
      if(streamError)result.storageError=redact(streamError.message);
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
      return execute(item.command,{cwd,environment,logRoot,sequence,signal,runtimeSession,deferCommandRegistration:Boolean(runtimeSession&&runtimeEvent)});
    });
    const execution={promise,ownerId:item.id};
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
        const row = { ...result, id:item.id, group:job.group, index: item.index, reused: execution.reused };
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
