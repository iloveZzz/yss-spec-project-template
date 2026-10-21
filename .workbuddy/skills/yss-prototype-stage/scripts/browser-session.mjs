import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

// A standalone browser verification command owns these process groups only.
// Evidence must be written outside profileDir. SIGKILL cannot run cleanup.
export async function withBrowserSession(run) {
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yss-browser-'));
  fs.chmodSync(profileDir, 0o700);
  const children = [];
  let closing;
  const alive = child => {
    if (child.exitCode !== null || child.signalCode !== null) return false;
    try { process.kill(child.pid, 0); return true; }
    catch (error) { if (error.code === 'ESRCH') return false; throw error; }
  };
  const stop = (child, signal) => {
    try { child.kill(signal); }
    catch (error) { if (error.code !== 'ESRCH') throw error; }
  };
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const cleanup = () => closing ??= (async () => {
    try {
      for (const child of children) if (child.pid && alive(child)) stop(child, 'SIGTERM');
      const deadline = Date.now() + 2000;
      while (children.some(child => child.pid && alive(child)) && Date.now() < deadline) await delay(25);
      for (const child of children) if (child.pid && alive(child)) stop(child, 'SIGKILL');
      const killDeadline = Date.now() + 2000;
      while (children.some(child => child.pid && alive(child)) && Date.now() < killDeadline) await delay(25);
      if (children.some(child => child.pid && alive(child))) throw Error('owned browser process did not exit');
      fs.rmSync(profileDir, {recursive: true});
    } catch (error) {
      process.stderr.write(`browser-session cleanup incomplete; retained ${profileDir}: ${error.message}\n`);
      throw error;
    }
  })();
  const handlers = new Map(['SIGINT', 'SIGTERM', 'SIGHUP'].map(signal => [signal, () => {
    cleanup().then(() => process.exit({SIGINT:130,SIGTERM:143,SIGHUP:129}[signal]), () => process.exit(1));
  }]));
  for (const [signal, handler] of handlers) process.once(signal, handler);
  try {
    const result = await run({profileDir, spawn(executable, args, options = {}) {
      if (closing) throw Error('browser-session is closing');
      const child = spawn(executable, args, {...options, detached: process.platform !== 'win32', shell: false});
      child.on('error', error => { child.sessionError = error; });
      children.push(child);
      return child;
    }});
    const failed = children.find(child => child.sessionError);
    if (failed) throw failed.sessionError;
    return result;
  } finally {
    try { await cleanup(); }
    finally { for (const [signal, handler] of handlers) process.removeListener(signal, handler); }
  }
}
