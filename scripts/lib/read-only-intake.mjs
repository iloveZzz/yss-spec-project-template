import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parse } from '../vendor/yaml.mjs';
import { runCommand } from './command-runner.mjs';
import { assertNodeVersion, beginRuntimeRun } from './runtime-store.mjs';

const ensure = (ok, message) => { if (!ok) throw new TypeError(`read-only-intake: ${message}`); };
export const digest = value => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const inside = (root, file) => { const rel = path.relative(root, file); return rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel); };
export function intakeEvidencePath(ref, { root, runDir }) {
  const runtime = ref.startsWith('run:');
  const base = runtime ? runDir : root;
  ensure(base && path.isAbsolute(base), '运行证据必须显式提供绝对 run-dir');
  const relative = runtime ? ref.slice(4) : ref;
  ensure(relative && !path.isAbsolute(relative) && !relative.split(/[\\/]/).includes('..'), '证据路径越界');
  const resolvedBase = fs.realpathSync(base), file = path.resolve(base, relative);
  ensure(inside(path.resolve(base), file) && inside(resolvedBase, fs.realpathSync(file)), '证据符号链接越界');
  ensure(fs.statSync(file).isFile(), '证据必须为文件');
  return file;
}
// Stream large preserved evidence archives instead of allocating the whole file.
export function fileDigest(file) {
  return fileDigestWithBuffer(file, Buffer.allocUnsafe(1024 * 1024));
}
function fileDigestWithBuffer(file, buffer) {
  const hash = createHash('sha256');
  const fd = fs.openSync(file, 'r');
  try {
    let size;
    while ((size = fs.readSync(fd, buffer, 0, buffer.length, null)) !== 0) hash.update(buffer.subarray(0, size));
    return `sha256:${hash.digest('hex')}`;
  } finally { fs.closeSync(fd); }
}
/** Final observable repository files, including ignored and untracked files; never follow links. */
export function intakeSnapshot(root, { excludeIgnoredToolState = false } = {}) {
  const result = spawnSync('git', ['ls-files', '-z', '--cached', '--others'], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  ensure(result.status === 0, result.stderr || '无法观察仓库');
  const refs = [...new Set(result.stdout.split('\0').filter(Boolean))].sort();
  const ignoredToolState = new Set();
  if (excludeIgnoredToolState) {
    const toolRefs = refs.filter(ref => /^(?:\.codegraph|\.idea)\//.test(ref));
    if (toolRefs.length) {
      const ignored = spawnSync('git', ['check-ignore', '-z', '--stdin'], { cwd: root, input: toolRefs.join('\0') + '\0', encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
      ensure([0, 1].includes(ignored.status), ignored.stderr || '无法识别工具运行缓存');
      for (const ref of ignored.stdout.split('\0').filter(Boolean)) ignoredToolState.add(ref);
    }
  }
  // Synchronous reads share scratch space only within this snapshot, never results.
  const rows = {}, buffer = Buffer.allocUnsafe(1024 * 1024);
  for (const ref of refs) {
    if (ignoredToolState.has(ref)) continue;
    const file = path.join(root, ref);
    try {
      const stat = fs.lstatSync(file);
      if (stat.isDirectory()) {
        const nested = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: file, encoding: 'utf8' });
        ensure(nested.status === 0 && fs.realpathSync(nested.stdout.trim()) === fs.realpathSync(file), `子仓未初始化: ${ref}`);
        const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: file, encoding: 'utf8' });
        ensure(nested.status === 0 && head.status === 0, `子仓不可观测: ${ref}`);
        rows[ref] = { kind: 'gitlink', head: head.stdout.trim(), files: intakeSnapshot(file, { excludeIgnoredToolState }) };
      } else rows[ref] = { kind: stat.isSymbolicLink() ? 'link' : 'file', mode: stat.mode, digest: stat.isSymbolicLink() ? digest(fs.readlinkSync(file)) : fileDigestWithBuffer(file, buffer) };
    } catch (error) { if (error.code === 'ENOENT') rows[ref] = null; else throw error; }
  }
  const head=spawnSync('git',['rev-parse','--verify','HEAD'],{cwd:root,encoding:'utf8'});
  const index=spawnSync('git',['ls-files','--stage','-z'],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});
  ensure(index.status===0,'无法观察 Git index');
  return {git:{head:head.status===0?head.stdout.trim():null,index_digest:digest(index.stdout)},files:rows};
}
export function validateReadOnlyIntake(value, { root, runDir, roles, lifecycle }) {
  const identity = parse(fs.readFileSync(path.join(root, 'yss-project.yaml'), 'utf8'));
  ensure(identity.schema_version === 1 && ['template-source', 'project-instance'].includes(identity.repository_mode), '仓库身份无效');
  ensure(value.contract.kind === 'read-only-intake' && value.schema_version === 2 && value.execution_state === 'Explorer' && value.allowed_write_paths.length === 0, '只读合同不授予写权限');
  ensure(lifecycle.work_units.some(x => x.id === value.work_unit_id) && ['work-unit.entry-triage', 'work-unit.harness-entry'].includes(value.work_unit_id), '只允许已登记分诊入口');
  ensure(roles.runtimes.some(x => x.id === value.runtime_id), '未知运行时');
  ensure(value.contract.status === 'issued' || value.workflow_status === 'paused', '过期合同必须暂停');
  for (const ref of [value.contract.contract_ref, ...value.inputs, ...value.expected_evidence_files]) intakeEvidencePath(ref, { root, runDir });
  if (value.result) {
    ensure(value.result.work_unit===value.work_unit_id && value.result.workflow_reference===value.contract.contract_ref,'结果必须绑定原分诊工作单元和合同来源');
    ensure(!value.result.changed_files?.length && !value.result.changed_artifacts?.length, '只读结果包含变更');
    ensure(value.result.next_route == null && !value.result.checkpoint_ref, '只读结果不得流转或修改 checkpoint');
    for (const ref of value.result.evidence_refs || []) intakeEvidencePath(ref, { root, runDir });
  }
  const commands = new Set(value.verification_commands);
  ensure((value.verification_status === 'not-executed') === (value.verification_results.length === 0), '执行状态与实际结果不一致');
  for (const row of value.verification_results) {
    ensure(commands.has(row.command) && row.evidence_ref.startsWith('run:'), '运行结果必须绑定声明的命令及真实运行日志');
    const evidence = fs.readFileSync(intakeEvidencePath(row.evidence_ref, { root, runDir }));
    ensure(row.evidence_digest === digest(evidence), '运行证据摘要不一致');
    const record = JSON.parse(evidence);
    for (const key of ['command','exit_code','duration_ms','executed_at']) ensure(record[key] === row[key], `运行记录 ${key} 不一致`);
    for (const stream of ['stdout','stderr']) {
      const ref = row[`${stream}_ref`];
      ensure(ref?.startsWith('run:'), '运行日志无效');
      ensure(record[`${stream}_digest`] === digest(fs.readFileSync(intakeEvidencePath(ref, { root, runDir }))), '运行日志摘要不一致');
    }
  }
  if (value.workflow_status === 'resolved' || value.result?.result === 'completed') {
    ensure(value.workflow_status === 'resolved' && value.result?.result === 'completed', '完成状态不一致');
    ensure(value.result.evidence_refs?.length && value.result.context_reconciliation?.status === 'not-applicable' && value.result.context_reconciliation?.reason, '只读结论缺少来源或不流转说明');
    for (const key of ['drift','violation','new_impacts','stale_candidates','blocking_signals','deferred_seams']) ensure(Array.isArray(value.result[key]) && !value.result[key].length, `完成结果 ${key} 必须为空`);
    ensure(value.verification_results.every(x => x.exit_code === 0) && [...commands].every(c => value.verification_results.some(x => x.command === c)), '实际验证缺失或失败');
    ensure(value.observation_ref?.startsWith('run:'), '完成结果缺少执行器仓库观测');
    const observation = JSON.parse(fs.readFileSync(intakeEvidencePath(value.observation_ref, { root, runDir }), 'utf8'));
    const dispatchedBytes=fs.readFileSync(intakeEvidencePath(observation.task_ref,{root,runDir}));
    ensure(observation.task_digest===digest(dispatchedBytes),'原派发任务摘要不一致');
    const dispatched=JSON.parse(dispatchedBytes);
    for(const key of ['task_id','work_unit_id','actor_id','role_id','runtime_id','contract','inputs','allowed_write_paths','objective','forbidden_actions','expected_outputs','expected_evidence_files','skill_source','downstream_consumers','convergence'])ensure(JSON.stringify(dispatched[key])===JSON.stringify(value[key]),`结果替换原任务 ${key}`);
    ensure(!dispatched.verification_commands.length || JSON.stringify(dispatched.verification_commands)===JSON.stringify(value.verification_commands),'结果替换验证要求');
    ensure(observation.kind === 'read-only-intake-observation' && observation.task_id === value.task_id && observation.root === fs.realpathSync(root), '观测身份不匹配');
    ensure(JSON.stringify(observation.before) === JSON.stringify(observation.after) && JSON.stringify(observation.after) === JSON.stringify(intakeSnapshot(root)), '仓库实际差异与只读声明冲突');
  }
  return value;
}
/** Runner-owned evidence is outside the repository; the child receives no new repository permissions. */
export async function observeReadOnlyIntake(task, { root, runDir, command, args = [], timeoutMs = 0, runtimeStore = 'off' }) {
  assertNodeVersion();
  ensure(['sqlite','off'].includes(runtimeStore), 'runtime-store 必须为 sqlite 或 off');
  const label = command ? JSON.stringify([command,...args]) : null;
  ensure(!command || !task.verification_commands.length || task.verification_commands.length===1 && task.verification_commands[0]===label,'执行命令与声明不一致，不得替换要求的验证');
  root = fs.realpathSync(root);
  ensure(path.isAbsolute(runDir) && !inside(root, path.resolve(runDir)), '运行目录必须位于仓库外');
  ensure(!inside(root, fs.realpathSync(path.dirname(runDir))), '运行目录父路径符号链接进入仓库');
  ensure(!fs.existsSync(runDir), '运行目录必须为新目录');
  const runtimeSession=beginRuntimeRun({root,kind:'read-only-intake',mode:runtimeStore,input:task,reportDir:runDir});
  const storageErrors=[];
  try {
  fs.mkdirSync(runDir, { recursive: false });
  runDir = fs.realpathSync(runDir);
  fs.writeFileSync(path.join(runDir,'task.json'),JSON.stringify(task,null,2)+'\n',{flag:'wx'});
  const before = intakeSnapshot(root), started = new Date().toISOString();
  const result = command ? await runCommand(command, args, { cwd: root, timeoutMs, stdoutFile: path.join(runDir, 'stdout.log'), stderrFile: path.join(runDir, 'stderr.log'), runtimeSession }) : null;
  if(result?.storageError)storageErrors.push(result.storageError);
  const after = intakeSnapshot(root);
  const observation = { schema_version: 1, kind: 'read-only-intake-observation', task_id: task.task_id, task_ref:'run:task.json', task_digest:digest(fs.readFileSync(path.join(runDir,'task.json'))), root, started_at: started, before, after };
  fs.writeFileSync(path.join(runDir, 'observation.json'), JSON.stringify(observation, null, 2)+'\n');
  const changed = JSON.stringify(before) !== JSON.stringify(after);
  let completed = !changed && !storageErrors.length && (!result || result.status === 0);
  const output = structuredClone(task);
  output.observation_ref = 'run:observation.json';
  output.verification_status = result ? 'executed' : 'not-executed';
  output.verification_results = [];
  if (result) {
    const label = JSON.stringify([command, ...args]);
    const record = { command: label, exit_code: result.status ?? 1, duration_ms: Math.round(result.duration_ms), executed_at: started, termination: result.termination ?? null, stdout_digest: digest(fs.readFileSync(path.join(runDir,'stdout.log'))), stderr_digest: digest(fs.readFileSync(path.join(runDir,'stderr.log'))) };
    const bytes = JSON.stringify(record, null, 2)+'\n'; fs.writeFileSync(path.join(runDir, 'execution.json'), bytes);
    output.verification_commands = [label];
    output.verification_results = [{command:label,exit_code:record.exit_code,duration_ms:record.duration_ms,executed_at:started,evidence_ref:'run:execution.json',evidence_digest:digest(bytes),stdout_ref:'run:stdout.log',stderr_ref:'run:stderr.log'}];
  }
  output.workflow_status = completed ? 'resolved' : 'failed';
  output.result = { result_schema: 'workflow-execution-result-v1', work_unit: task.work_unit_id, workflow_reference: task.contract.contract_ref, result: completed ? 'completed' : 'failed', skill: 'yss-research', changed_files: [], changed_artifacts: [], evidence_refs: [...task.inputs, 'run:observation.json'], context_reconciliation: {status:'not-applicable',ref:'CONTEXT.md',reason:'只读分诊，不批准资产或流转阶段'}, deferred_seams: [], drift: [], violation: changed ? ['repository-changed'] : [], new_impacts: [], stale_candidates: [], next_route: null, blocking_signals: completed ? [] : ['read-only-intake-failed'] };
  fs.writeFileSync(path.join(runDir, 'task-result.json'), JSON.stringify(output, null, 2)+'\n');
  if(runtimeSession)try {
    runtimeSession.recordEvent('repository-observation',{changed,started_at:started});
    runtimeSession.registerFiles(runDir);
    runtimeSession.finish({status:completed?'completed':'failed',exitCode:result?.status??0,report:path.join(runDir,'task-result.json')});
    runtimeSession.pin('read-only-intake-evidence');
  }catch(error){storageErrors.push(error.message);}
  if(storageErrors.length){
    output.workflow_status='failed';output.result.result='failed';output.result.blocking_signals.push('runtime-store-failed');
    fs.writeFileSync(path.join(runDir, 'task-result.json'), JSON.stringify(output, null, 2)+'\n');
    process.stderr.write(`运行存储异常，实际执行结果及日志已保留: ${storageErrors.join('; ')}\n`);
  }
  return output;
  } finally { runtimeSession?.close(); }
}
