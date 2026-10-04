import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';

export async function runToolingTestFilesSerial(files, execute, { signal } = {}) {
  const rows = [];
  for (const [index, file] of files.entries()) {
    if (signal?.aborted) break;
    rows.push(await execute([file], `serial-${index}`));
  }
  return rows;
}

// Each supervised process owns one process group, including its test subprocesses.
export async function runToolingProcess(file, args, { cwd, env = process.env, logRoot, name, signal, timeoutMs = 300000 }) {
  fs.mkdirSync(logRoot, { recursive: true });
  const stdoutFile = path.join(logRoot, `${name}.stdout`), stderrFile = path.join(logRoot, `${name}.stderr`);
  const started = performance.now(), started_at = new Date().toISOString();
  const childEnv = { ...env }; delete childEnv.NODE_TEST_CONTEXT;
  if (signal?.aborted) return { name, file, args, code: 130, skipped: true, duration_ms: 0, started_at };
  return await new Promise(resolve => {
    const child = spawn(file, args, { cwd, env: childEnv, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    let error = '', reason = null, escalation, timer;
    const kill = sig => {
      if (!child.pid) return;
      try { if (process.platform === 'win32') child.kill(sig); else process.kill(-child.pid, sig); }
      catch (e) { if (e.code !== 'ESRCH') error += e.message; }
    };
    const stop = why => { if (reason) return; reason = why; kill('SIGTERM'); escalation = setTimeout(() => kill('SIGKILL'), 1000); };
    const abort = () => stop('cancelled');
    // A caller may itself be a supervised test subprocess. Terminate its detached
    // descendants before the outer supervisor's escalation can kill this process.
    const terminate = () => { stop('cancelled'); kill('SIGKILL'); process.exitCode = 130; };
    const onExit = () => kill('SIGKILL');
    process.once('SIGINT', terminate); process.once('SIGTERM', terminate); process.once('exit', onExit);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    timer = setTimeout(() => stop('timeout'), timeoutMs);
    const streams = [pipeline(child.stdout, fs.createWriteStream(stdoutFile)), pipeline(child.stderr, fs.createWriteStream(stderrFile))];
    child.on('error', e => { error += e.message; });
    child.on('close', async (code, exitSignal) => {
      clearTimeout(timer); clearTimeout(escalation); signal?.removeEventListener('abort', abort);
      process.off('SIGINT', terminate); process.off('SIGTERM', terminate); process.off('exit', onExit);
      // Do not leave descendants behind, including after an otherwise successful parent exits.
      kill('SIGKILL');
      const streamed = await Promise.allSettled(streams);
      for (const item of streamed) if (item.status === 'rejected') error += item.reason.message;
      resolve({ name, file, args, pid: child.pid, started_at, duration_ms: performance.now() - started,
        code: reason === 'cancelled' ? 130 : reason === 'timeout' ? 124 : error ? 1 : code ?? 1,
        exit_code: code, signal: exitSignal, reason, error, stdoutFile, stderrFile });
    });
  });
}
