// 校验语义归 yss；这里只负责定位固定版本的二进制、拼参数、解码信封并透传退出码。
import {spawnSync} from 'node:child_process';
import {mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {contextBinary} from './native-context.mjs';

export function nativeEvidenceVerify({root, kind, file, extra = [], environment = process.env}) {
  const {binary} = contextBinary(environment);
  const args = ['evidence', 'verify', '--root', root, '--kind', kind, '--file', file, ...extra, '--json'];
  const run = spawnSync(binary, args, {cwd: root, env: environment, encoding: 'utf8', timeout: 120000, maxBuffer: 32 * 1024 * 1024});
  if (run.error || run.signal || !Number.isInteger(run.status)) throw new Error(`NATIVE_INTERRUPTED: ${run.error?.message || run.signal}`);
  let envelope;
  try { envelope = JSON.parse(run.stdout); } catch { throw new Error(`NATIVE_PROTOCOL: 非 JSON 响应（退出码 ${run.status}）：${run.stderr || run.stdout}`.slice(0, 600)); }
  const diagnostics = envelope.result?.diagnostics ?? [];
  return {exitCode: run.status, status: envelope.status, code: envelope.code, diagnostics, message: diagnostics.map((item) => `${item.code}: ${item.message}`).join('；') || envelope.code, envelope};
}

// 进程内调用方（工作流里校验已落盘的用户决定）的适配：只在能唯一定位 yss 且根是合法项目身份时才委托；
// 自定义 rolesDoc/read 等注入项意味着调用方要的是进程内语义，不委托。
export function nativeDelegationAvailable(root, options = {}, environment = process.env, refs = []) {
  if (options.native === false || options.rolesDoc || options.read || options.registry) return false;
  // yss 只读项目根内的路径；引用落在根外（合成夹具等）时无法委托。
  const real = (target) => { try { return realpathSync(target); } catch { return path.resolve(target); } };
  const inside = (ref) => typeof ref === 'string' && ref !== '' && !/^\w+:\/\//.test(ref) && !path.relative(real(root), real(path.resolve(root, ref))).startsWith('..');
  if (!refs.every(inside)) return false;
  try {
    contextBinary(environment);
    // yss 需要完整的治理权威文件；合成夹具只有 yss-project.yaml 时不委托。
    const has = (ref) => statSync(path.join(root, ref), {throwIfNoEntry: false})?.isFile() === true;
    if (!has('yss-project.yaml') || !has('.template-spec/agents/digital-human-roles.yaml') || !has('.template-spec/process/lifecycle-registry.yaml')) return false;
    return has('.template-spec/process/harness-profile.yaml') || /repository_mode:\s*template-source/.test(readFileSync(path.join(root, 'yss-project.yaml'), 'utf8'));
  } catch { return false; }
}

// 委托校验一条「用户决定要求」：requirement 是 Node 里的 {boundary, subject_ref, scope, user_decision_ref | continuation_ref}。
// 要求写入根下 .work/native-candidates 的临时文件（yss 只读根内路径），用完即删；失败时抛出带 yss 拒绝码的错误。
export function nativeUserDecisionRequirement({root: given, requirement, environment = process.env}) {
  const root = realpathSync(given); // yss 要求项目根由普通目录组成（不含符号链接）
  const continuation = Boolean(requirement.continuation_ref);
  const file = continuation ? requirement.continuation_ref : requirement.user_decision_ref;
  const dir = path.join(root, '.work', 'native-candidates');
  mkdirSync(dir, {recursive: true});
  const candidate = path.join(dir, `requirement-${process.pid}-${randomUUID()}.json`);
  writeFileSync(candidate, JSON.stringify([requirement]));
  try {
    const result = nativeEvidenceVerify({root, kind: 'user-decision', file, extra: ['--requirements', path.relative(root, candidate), ...(continuation ? ['--continuation'] : [])], environment});
    if (result.exitCode !== 0) throw Object.assign(new Error(result.message), {code: result.diagnostics[0]?.code ?? result.code, native: true});
    return {validated: result.envelope.result?.coverage?.user_decision_validated ?? []};
  } finally {
    rmSync(candidate, {force: true});
  }
}
