import { spawn, spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { hash, safe, fileMode, nativeBinaryPath } from './runtime.mjs';

export const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const digest = value => hash(JSON.stringify(canonical(value)));
export const json = value => JSON.stringify(value, null, 2) + '\n';
export function physical(value, file = false) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || /[\x00-\x1f]/.test(value)) throw new Error('absolute-path-required');
  const resolved = path.resolve(value);
  let cursor = path.parse(resolved).root;
  const parts = resolved.slice(cursor.length).split(path.sep).filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    cursor = path.join(cursor, parts[i]);
    let stat;
    try { stat = lstatSync(cursor); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    const last = i === parts.length - 1;
    const allowed = last && file === 'either' ? stat.isFile() || stat.isDirectory() : last && file ? stat.isFile() : stat.isDirectory();
    if (stat.isSymbolicLink() || !allowed) throw new Error('unsafe-path: ' + cursor);
  }
  return resolved;
}
function response(result) {
  if (result.error || result.signal) throw Object.assign(new Error('native-command-interrupted: ' + (result.error?.message || result.signal)),
    { code: 'CANCELLED', signal: result.signal, exitCode: result.status });
  let output;
  try { output = JSON.parse(result.stdout); } catch { throw new Error('native-protocol-invalid-json'); }
  if (output.outputVersion !== 1 || output.protocolVersion !== 1 || !['ok', 'error'].includes(output.status)
      || (output.status === 'ok') !== (result.status === 0)) throw new Error('native-protocol-mismatch');
  if (result.status !== 0) throw Object.assign(new Error(output.code + ': ' + (output.result?.message || JSON.stringify(output.result))), { code: output.code, envelope: output, exitCode: result.status });
  return output;
}
export function invoke(binary, args, options = {}) {
  return response(spawnSync(binary, [...args, '--json'], { encoding: 'utf8', input: '', timeout: options.timeout ?? 120000,
    maxBuffer: 128 * 1024 * 1024, cwd: options.cwd, env: { ...process.env, NODE_OPTIONS: '', NODE_PATH: '' } }));
}
// Mutations must keep the wrapper alive until the native transaction has
// acknowledged cancellation and completed its own recovery or rollback.
export function invokeAsync(binary, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, [...args, '--json'], { cwd: options.cwd,
      env: { ...process.env, NODE_OPTIONS: '', NODE_PATH: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout = [], stderr = [];
    let size = 0, requestedSignal = null, failure = null;
    const cancel = signal => {
      requestedSignal ||= signal;
      if (child.exitCode === null && child.signalCode === null) child.kill(signal);
    };
    const interrupt = () => cancel('SIGINT'), terminate = () => cancel('SIGTERM');
    process.on('SIGINT', interrupt); process.on('SIGTERM', terminate);
    const timeout = setTimeout(() => cancel('SIGTERM'), options.timeout ?? 120000);
    const collect = chunks => chunk => {
      size += chunk.length;
      if (size > 128 * 1024 * 1024) { failure ||= new Error('native-output-limit'); cancel('SIGTERM'); }
      else chunks.push(chunk);
    };
    child.stdout.on('data', collect(stdout)); child.stderr.on('data', collect(stderr));
    child.on('error', error => { failure = error; });
    child.on('close', (status, signal) => {
      clearTimeout(timeout); process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', terminate);
      try {
        const output = response({ stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8'), status, signal, error: failure });
        if (requestedSignal) throw Object.assign(new Error('native-command-finished-after-cancel-request: inspect project-status'),
          { code: 'CANCELLED', envelope: output, exitCode: status, signal: requestedSignal });
        resolve(output);
      } catch (error) { if (requestedSignal) error.signal ||= requestedSignal; reject(error); }
    });
  });
}
export function tool(root) {
  const pin = JSON.parse(readFileSync(safe(root, 'assets/native-lock.json')));
  if (pin.schemaVersion !== 1 || pin.protocolVersion !== 1 || !['spec', 'design'].includes(pin.profile)
      || pin.platform !== `${process.platform}/${process.arch}` || pin.binaryPath !== nativeBinaryPath()
      || !/^[a-f0-9]{64}$/.test(pin.binarySha256)) throw new Error('native-tool-pin-mismatch');
  const binary = safe(root, pin.binaryPath);
  if (hash(readFileSync(binary)) !== pin.binarySha256 || fileMode(lstatSync(binary).mode) !== fileMode(pin.binaryMode)) throw new Error('native-binary-drift');
  const snapshot = invoke(binary, ['bundle', 'inspect', '--profile', pin.profile]).result;
  if (digest(snapshot) !== pin.inspectionDigest) throw new Error('native-bundle-drift');
  return { binary, pin, snapshot, bundleDigest: hash(readFileSync(safe(root, 'bundle-lock.json'))) };
}
