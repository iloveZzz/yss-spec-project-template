// 校验语义归 yss；这里只负责定位固定版本的二进制、拼参数、解码信封并透传退出码。
import {spawnSync} from 'node:child_process';
import {copyFileSync, cpSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {contextBinary} from './native-context.mjs';

// 命令行薄壳的输入可以在项目根外（例如维护反例生成器把输入写在仓外目录）：yss 只读根内路径，
// 这时把文件复制到根下临时目录再校验，用完即删；记录里的相对引用仍按项目根解析，与进程内实现一致。
function stagedInput(root, file) {
  if (!path.isAbsolute(file)) return {file, cleanup() {}};
  const rel = path.relative(root, file);
  if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) return {file: rel.split(path.sep).join('/'), cleanup() {}};
  const dir = path.join(root, '.work', 'native-candidates', `input-${process.pid}-${randomUUID()}`);
  mkdirSync(dir, {recursive: true});
  if (statSync(file).isDirectory()) cpSync(file, path.join(dir, path.basename(file)), {recursive: true, verbatimSymlinks: true});
  else copyFileSync(file, path.join(dir, path.basename(file)));
  return {file: path.relative(root, path.join(dir, path.basename(file))).split(path.sep).join('/'), cleanup() { rmSync(dir, {recursive: true, force: true}); }};
}

export function nativeEvidenceVerify({root, kind, file: given, extra = [], environment = process.env, group = 'evidence'}) {
  const staged = stagedInput(root, given);
  try { return runNativeVerify({root, kind, file: staged.file, extra, environment, group}); } finally { staged.cleanup(); }
}

function runNativeVerify({root, kind, file, extra, environment, group}) {
  const {binary} = contextBinary(environment);
  // lifecycle 领域的资产选择器是 --checkpoint，其余领域是 --kind 加 --file。
  const selector = group === 'lifecycle' ? ['--checkpoint', file] : group === 'handoff' && (kind === 'package' || kind === 'spec-baseline') ? ['--kind', kind, '--package', file] : ['--kind', kind, '--file', file];
  const args = [group, 'verify', '--root', root, ...selector, ...extra, '--json'];
  const run = spawnSync(binary, args, {cwd: root, env: environment, encoding: 'utf8', timeout: 120000, maxBuffer: 32 * 1024 * 1024});
  if (run.error || run.signal || !Number.isInteger(run.status)) throw new Error(`NATIVE_INTERRUPTED: ${run.error?.message || run.signal}`);
  let envelope;
  try { envelope = JSON.parse(run.stdout); } catch { throw new Error(`NATIVE_PROTOCOL: 非 JSON 响应（退出码 ${run.status}）：${run.stderr || run.stdout}`.slice(0, 600)); }
  const diagnostics = envelope.result?.diagnostics ?? [];
  return {exitCode: run.status, status: envelope.status, code: envelope.code, diagnostics, message: diagnostics.map((item) => `${item.code}: ${item.message}`).join('；') || envelope.code, envelope};
}

// 进程内调用方（工作流里校验已落盘的用户决定）的适配：只在能唯一定位 yss 且根是合法项目身份时才委托；
// 自定义 rolesDoc/read 等注入项意味着调用方要的是进程内语义，不委托。
// 每个委托路径依赖的 yss 能力令牌（yss capabilities --json 的 nodeDelegation）。缺令牌说明 yss 比这些脚本旧，
// 进程内入口退回 Node 实现，命令行薄壳给出明确的升级提示，而不是把 yss 的 ARGUMENT 错误当成校验结论。
export const NEEDS = {
  userDecision: ['user-decision.requirements-object.v1', 'user-decision.validated-rows.v1'],
  approval: ['approval.expected.v1', 'approval.binding.v1', 'approval.rule-rows.v1'],
  task: ['task.directory-write-scope.v1'],
  checkpoint: ['lifecycle.legacy-untracked-checkpoint.v1', 'template-source.verify-root.v1'],
  handoffPackage: ['handoff.package-identity.v1'],
  handoffConsumption: ['handoff.consumption-report.v1'],
  specBaselinePackage: ['handoff.spec-baseline-package.v1'],
  contextReconciliation: ['evidence.context-reconciliation.v1'],
};
const capabilityCache = new Map();
export function nativeCapabilities(environment = process.env) {
  const {binary, digest} = contextBinary(environment);
  const key = `${binary}\0${digest}`;
  if (!capabilityCache.has(key)) {
    const run = spawnSync(binary, ['capabilities', '--json'], {encoding: 'utf8', timeout: 30000});
    let tokens = [];
    try { tokens = JSON.parse(run.stdout).result?.nodeDelegation ?? []; } catch { tokens = []; }
    capabilityCache.set(key, new Set(tokens));
  }
  return capabilityCache.get(key);
}
// 找不到 yss 视为缺少全部能力（调用方据此退回进程内实现）；需要明确报错的薄壳用 assertNativeCapabilities。
export function missingCapabilities(needs, environment = process.env) {
  let have;
  try { have = nativeCapabilities(environment); } catch { return [...needs]; }
  return needs.filter((token) => !have.has(token));
}
export function assertNativeCapabilities(needs, environment = process.env) {
  contextBinary(environment); // 找不到 yss 时给出定位错误，而不是「缺少能力」
  const missing = missingCapabilities(needs, environment);
  if (missing.length) throw new Error(`NATIVE_CAPABILITY: 当前 yss 缺少能力 ${missing.join('、')}，请升级 yss（yss upgrade）后重试`);
}

// 标记「只是按项目根读取」的读取器：与默认读取等价，不影响委托；任何其他自带读取器（虚拟源、内存夹具）仍然阻止委托。
export const rootBoundRead = (read) => Object.assign(read, {rootBound: true});

export function nativeDelegationAvailable(root, options = {}, environment = process.env, refs = [], needs = []) {
  // 调用方自己注入的规则/读取器要的是进程内语义；defaultAuthorities 表示 rolesDoc/registry 只是从同一个根加载的默认值，可以委托。
  if (options.native === false || (options.read && options.read.rootBound !== true) || ((options.rolesDoc || options.registry) && options.defaultAuthorities !== true)) return false;
  // yss 只读项目根内的路径；引用落在根外（合成夹具等）时无法委托。
  const real = (target) => { try { return realpathSync(target); } catch { return path.resolve(target); } };
  const inside = (ref) => typeof ref === 'string' && ref !== '' && !/^\w+:\/\//.test(ref) && !path.relative(real(root), real(path.resolve(root, ref))).startsWith('..');
  if (!refs.every(inside)) return false;
  try {
    contextBinary(environment);
    if (needs.length && missingCapabilities(needs, environment).length) return false; // yss 比这些脚本旧：退回进程内实现
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
    const coverage = result.envelope.result?.coverage ?? {};
    return {validated: coverage.user_decision_validated ?? [], ...(continuation ? {continued: coverage.user_decision_continuation?.continued === true, review_ref: coverage.user_decision_continuation?.review_ref} : {})};
  } finally {
    rmSync(candidate, {force: true});
  }
}

// 期望的来源绑定：approvalExpectationFrom*/ForBoundAsset 算出期望时登记「它是怎么来的」，委托时让 yss 自己按同一绑定重新计算期望。
// 只有期望对象与登记时完全一致才采用绑定；调用方改过任何字段就退回显式期望，避免绑定与实际期望不一致。
const expectationBindings = new WeakMap();
export function attachExpectationBinding(expected, binding) {
  expectationBindings.set(expected, {binding, snapshot: JSON.stringify(expected)});
  return expected;
}
function bindingFor(expected) {
  const entry = expectationBindings.get(expected);
  return entry && entry.snapshot === JSON.stringify(expected) ? entry.binding : null;
}

// 批准记录引用的、需要在项目根内才能委托的全部资产路径（含 v2 审查任务与组合包依据）。
export function approvalDelegationRefs(record, expected) {
  return [record.subject_ref, record.user_decision_ref, record.continuation_ref, record.decision_reuse_ref, record.review_task_ref, expected.subject_ref, expected.review_context?.review_task_ref,
    ...(record.basis ?? []).map((asset) => asset?.ref), ...(record.review_bundle_basis ?? []).map((asset) => asset?.ref), ...(expected.basis ?? []).map((asset) => asset?.ref)].filter((ref) => ref !== undefined && ref !== null);
}

// 委托校验当前批准：record 为待验记录（内存对象，写成候选文件）或 file 为已落盘的记录/组合包路径；
// expected 为调用方独立算出的当前消费期望（单个对象，或组合包按 boundary 区分的数组）。拒绝时抛出带 yss 拒绝码的错误。
export function nativeApprovalRecord({root: given, record, file, gate, expected, environment = process.env}) {
  const root = realpathSync(given);
  const dir = path.join(root, '.work', 'native-candidates', `approval-${process.pid}-${randomUUID()}`);
  mkdirSync(dir, {recursive: true});
  const expectedFile = path.join(dir, 'expected.json');
  const rows = Array.isArray(expected) ? expected : [expected];
  const bindings = rows.map(bindingFor);
  const byBinding = bindings.every(Boolean);
  writeFileSync(expectedFile, JSON.stringify(byBinding ? bindings.map((binding, i) => ({...binding, boundary: rows[i].boundary, frozen: rows[i]})) : expected));
  let target = file ? path.resolve(root, file) : path.join(dir, 'candidate.json');
  if (!file) writeFileSync(target, JSON.stringify(record));
  try {
    const result = nativeEvidenceVerify({root, kind: 'approval', file: path.relative(root, target), extra: ['--require-approved', byBinding ? '--binding' : '--expected', path.relative(root, expectedFile), ...(gate ? ['--gate', gate] : [])], environment});
    if (result.exitCode !== 0) throw Object.assign(new Error(result.message), {code: result.diagnostics[0]?.code ?? result.code, native: true});
    const rules = result.envelope.result?.coverage?.approval_validated ?? [];
    // 与进程内一致：返回会签规则（bucket 等）再加主体、范围；组合包时 rules 按 gate 对应各行
    const done = rows.map((row) => ({...(rules.find((entry) => entry.gate_id === row.boundary)?.rule ?? {}), subject_ref: row.subject_ref, approval_scope: [...row.approval_scope], execution_authorization: 'not-evaluated'}));
    if (byBinding) Object.defineProperty(done[0], 'expected_by_yss', {value: result.envelope.result?.coverage?.approval_expected, enumerable: false}); // 供对拍测试读取 yss 自己算出的期望（组合包时为最后一行）
    return Array.isArray(expected) ? done : done[0];
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
}

// contract 领域（slice、task、scaffold、frontend-delivery）的校验，与 evidence 同一信封。
export function nativeContractVerify(options) {
  return nativeEvidenceVerify({...options, group: 'contract'});
}

// lifecycle 领域（checkpoint）的校验。
export function nativeLifecycleVerify(options) {
  return nativeEvidenceVerify({...options, kind: 'checkpoint', group: 'lifecycle'});
}

// 委托校验一份战略交接消费（战术/前端接收合同）：data 为内存里的合同，写成候选文件交给 yss；
// 返回 yss 的消费报告（通过或阻断都有报告）；没有报告（输入非法、拒绝）时抛出带 yss 拒绝码的错误。
export function nativeHandoffConsumption({root: given, data, sliceRef, consumer = 'tactical', environment = process.env}) {
  const root = realpathSync(given);
  const dir = path.join(root, '.work', 'native-candidates', `consumption-${process.pid}-${randomUUID()}`);
  mkdirSync(dir, {recursive: true});
  const file = path.join(dir, 'candidate.json');
  writeFileSync(file, JSON.stringify(data));
  try {
    const extra = [...(sliceRef ? ['--slice', sliceRef] : []), ...(consumer === 'tactical' ? [] : ['--consumer', consumer])];
    const result = nativeEvidenceVerify({root, kind: 'consumption', file: path.relative(root, file), group: 'handoff', extra, environment});
    const report = result.envelope.result?.coverage?.handoff_consumption;
    if (report) return report;
    throw Object.assign(new Error(result.message), {code: result.diagnostics[0]?.code ?? result.code, native: true});
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
}
