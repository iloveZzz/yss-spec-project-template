import { spawn } from "node:child_process";
import { once } from "node:events";
import { createReadStream, createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";

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

export function runCommandToFiles(command, { cwd, environment = process.env, logRoot, sequence }) {
  mkdirSync(logRoot, { recursive: true });
  const stdoutFile = path.join(logRoot, `${sequence}.stdout`);
  const stderrFile = path.join(logRoot, `${sequence}.stderr`);
  return new Promise((resolve) => {
    const started = performance.now();
    process.stderr.write(`[开始] ${command}\n`);
    const child = spawn(command, { cwd, shell: true, env: environment, stdio: ["ignore", "pipe", "pipe"] });
    let spawnError = "";
    const stdoutDone = pipeline(child.stdout, createWriteStream(stdoutFile));
    const stderrDone = pipeline(child.stderr, createWriteStream(stderrFile));
    child.on("error", (error) => { spawnError = `${error.message}\n`; });
    child.on("close", async (code) => {
      const streams = await Promise.allSettled([stdoutDone, stderrDone]);
      const streamError = streams.find((result) => result.status === "rejected")?.reason;
      const duration_ms = Math.round(performance.now() - started);
      const exitCode = code ?? 1;
      process.stderr.write(`[${exitCode === 0 && !streamError ? "完成" : "失败"}] ${command} (${duration_ms}ms, exit=${exitCode})\n`);
      resolve({ command, code: streamError ? 1 : exitCode, duration_ms, stdoutFile, stderrFile, error: spawnError || streamError?.message || "" });
    });
  });
}

export async function runGroups(plan, repositoryMode, concurrency, {
  cwd,
  environment = process.env,
  execute = runCommandToFiles,
  logRoot,
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
    if (cached) return { promise: cached, reused: true };
    const sequence = executionSequence;
    executionSequence += 1;
    const promise = resourceLocks.run(resourcesByExecution.get(key), () => execute(item.command, {
      cwd,
      environment,
      logRoot,
      sequence,
    }));
    executions.set(key, promise);
    return { promise, reused: false };
  };

  let cursor = 0;
  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor];
      cursor += 1;
      for (const item of job.commands) {
        if (failedGroups.has(job.group)) break;
        const execution = executeOnce(item);
        const result = await execution.promise;
        groupResults.get(job.group).push({ ...result, index: item.index, reused: execution.reused });
        if (result.code !== 0) failedGroups.add(job.group);
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
