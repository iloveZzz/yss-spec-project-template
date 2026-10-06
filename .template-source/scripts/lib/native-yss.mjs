import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

export const NATIVE_PROFILES = ['spec','design','backend','frontend'];
export const nativeDigest = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new TypeError(message); };

/** The binary is an explicit supply-chain input, never discovered through PATH. */
export function nativeBinary(environment = process.env) {
  const binary = environment.YSS_NATIVE_BINARY;
  if (!binary || !path.isAbsolute(binary)) fail('YSS_NATIVE_BINARY 必须指向已固定的 yss 二进制绝对路径');
  const stat = fs.lstatSync(binary);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) fail('yss 二进制必须为独立普通文件');
  const digest = nativeDigest(fs.readFileSync(binary));
  if (environment.YSS_NATIVE_BINARY_SHA256 && environment.YSS_NATIVE_BINARY_SHA256 !== digest) fail('yss 二进制摘要漂移');
  return {binary, digest};
}

export function decodeNative(result, command, expectedCode = 'OK') {
  let envelope;
  try { envelope = JSON.parse(result.stdout); } catch { fail(`yss ${command} 没有返回版本化 JSON envelope`); }
  if (envelope.outputVersion !== 1 || envelope.protocolVersion !== 1 || envelope.command !== command
      || envelope.code !== expectedCode || envelope.status !== (expectedCode === 'OK' ? 'ok' : 'error')) fail(`yss ${command} 协议或预期错误码不匹配: ${envelope.code}`);
  if (expectedCode === 'OK' ? result.status !== 0 : result.status === 0) fail(`yss ${command} 退出码不匹配: ${result.status}`);
  if (result.error || result.signal || !Number.isInteger(result.status)) fail(`yss ${command} 未观察到正常退出`);
  return envelope;
}

export function runNative(args, {environment = process.env, cwd, run, expectedCode = 'OK'} = {}) {
  const {binary, digest} = nativeBinary(environment);
  const argv = [...args, ...(args.includes('--json') ? [] : ['--json'])];
  const result = run ? run(binary, argv, cwd, environment) : spawnSync(binary, argv, {cwd, env:environment, encoding:'utf8', maxBuffer:128*1024*1024, timeout:600000});
  if (nativeDigest(fs.readFileSync(binary)) !== digest) fail('执行过程中 yss 二进制摘要漂移');
  return decodeNative(result, args[0], expectedCode);
}

export function inspectNative(profile, options = {}) {
  if (!NATIVE_PROFILES.includes(profile)) fail('未知 Profile');
  return runNative(['bundle','inspect','--profile',profile], options).result;
}

export function initializeNative(profile, target, options = {}) {
  const plan = path.join(path.dirname(target), `${path.basename(target)}.init-plan.json`);
  runNative(['init','--profile',profile,'--root',target,'--project-name',`Verification ${profile}`,'--business-domain','模板生态验证','--team-size','3',...(options.full?['--full']:[]),'--plan','--out',plan], options);
  return runNative(['init','--profile',profile,'--root',target,'--apply','--plan-file',plan], options).result;
}

export function applyNative(command, profile, target, plan, selection = [], options = {}) {
  runNative([command,...selection,'--profile',profile,'--root',target,'--plan','--out',plan], options);
  return runNative([command,...selection,'--profile',profile,'--root',target,'--apply','--plan-file',plan], options).result;
}
