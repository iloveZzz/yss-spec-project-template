import { businessTicketVersion, businessAuthoringEnabled, businessSetRef, checkBusinessTickets, businessSyncDiagnostics, summarizeBusinessImplementation } from './business-tickets.mjs';
import { orchestrationRef } from './governance-io.mjs';
import {checkReadingViews} from './reading-view-bundle.mjs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseDocument } from '../vendor/yaml.mjs';
import { safeTrackingPath, trackingDrift } from './stage-tracking.mjs';

const sha = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
function parse(bytes) {
  const document = parseDocument(String(bytes), { uniqueKeys: true, maxAliasCount: 0 });
  if (document.errors.length) throw new TypeError(document.errors[0].message);
  return document.toJS({ maxAliasCount: 0 });
}
function source(root, ref) {
  const bytes = readFileSync(safeTrackingPath(root, ref));
  return { value: parse(bytes), digest: sha(bytes) };
}

/** Read-only projection; checkpoint, registry and orchestration remain authoritative. */
export function lifecycleStatus({ root, checkpointRef, taskPackageRef }) {
  if (!root || !checkpointRef) throw new TypeError('root and checkpoint are required');
  root = path.resolve(root);
  const identity = source(root, 'yss-project.yaml').value;
  if (identity.schema_version !== 1 || identity.repository_mode !== 'project-instance') throw new TypeError('生命周期状态仅适用于 project-instance');
  const registryRef = '.template-spec/process/lifecycle-registry.yaml';
  const contractRef = orchestrationRef(root);
  const checkpoint = source(root, checkpointRef), registry = source(root, registryRef), contract = source(root, contractRef);
  const value = checkpoint.value;
  if (value.schema_version !== 1 || value.repository_mode !== 'project-instance') throw new TypeError('checkpoint 身份或版本无效');
  const items = value.stage_tracking?.items ?? [];
  if (!Array.isArray(items)) throw new TypeError('阶段追踪 items 必须为数组');
  const activeItems = items.filter(item => item.work_unit === value.next_work_unit && item.progress !== 'cancelled');
  const owner = value.pause?.owner_or_authority ?? activeItems.find(item => item.progress !== 'completed')?.owner ?? '未登记';
  const diagnostics = [], verification_scope = [];
  const check = (id, status, refs, reason) => verification_scope.push({ id, status, refs, reason });
  const issue = (code, message, source_ref, recovery, severity = 'error') => diagnostics.push({ code, message, source_ref, owner, recovery, severity });
  if (!Object.hasOwn(value, 'blockers')) {
    issue('registered-blockers-missing', 'checkpoint 缺少 blockers；不能据此判定无已登记阻塞', checkpointRef, '核对原始状态并补齐真实阻塞记录后重验');
  } else if (!Array.isArray(value.blockers)) {
    issue('registered-blockers-invalid', 'checkpoint.blockers 必须为数组；当前登记不可核验', checkpointRef, '修复阻塞记录类型，保留原有阻塞内容后重验');
  } else {
    for (const item of value.blockers) {
      issue('registered-blocker', typeof item === 'string' ? item : JSON.stringify(item), checkpointRef, '按原阻塞证据处理并复验');
    }
  }
  check('registered-blockers', diagnostics.length ? 'failed' : 'passed', [checkpointRef], '仅读取已登记阻塞，不代表完整就绪');
  const stage = registry.value.stages?.find(item => item.id === value.stage);
  const workUnit = registry.value.work_units?.find(item => item.id === value.next_work_unit);
  if (!stage) issue('unknown-stage', `未知阶段: ${value.stage}`, registryRef, '按注册表核对当前阶段');
  if (value.next_work_unit && !workUnit) issue('unknown-work-unit', `未知下一工作单元: ${value.next_work_unit}`, registryRef, '按注册表核对下一工作单元');
  if (workUnit && workUnit.id !== 'work-unit.entry-triage' && !contract.value.work_unit_routes?.[workUnit.id]) issue('missing-route', `缺少执行路由: ${workUnit.id}`, contractRef, '修复当前合同路由后重验');
  check('stage-and-route', diagnostics.some(x => ['unknown-stage', 'unknown-work-unit', 'missing-route'].includes(x.code)) ? 'failed' : 'passed', [registryRef, contractRef], '仅检查身份与路由存在，不计算完整 frontier');
  if (value.context_reconciliation?.status === 'blocked') issue('context-blocked', 'Context reconciliation blocked', checkpointRef, '修复词汇对账并执行适用校验');
  check('context-reconciliation', value.context_reconciliation?.status === 'blocked' ? 'failed' : 'not-checked', [value.context_reconciliation?.ref].filter(Boolean), '读取登记状态；当前对账内容和摘要仍须由原验证器核验');
  for (const [id, gate] of Object.entries(value.gates ?? {})) {
    if (['blocked', 'stale'].includes(gate?.status)) issue('gate-blocked', `${id}: ${gate.status}`, checkpointRef, '核对受影响依据和当前批准');
  }
  check('registered-gates', diagnostics.some(x => x.code === 'gate-blocked') ? 'failed' : 'passed', [checkpointRef], '仅检查登记的 blocked/stale 标志');
  const evidenceRefs = [value.context_reconciliation?.ref, ...Object.values(value.artifacts ?? {}).filter(item => item?.status === 'approved').map(item => item.ref)].filter(Boolean);
  for (const ref of evidenceRefs) {
    try { readFileSync(safeTrackingPath(root, ref)); }
    catch { issue('evidence-unreadable', `证据不可读: ${ref}`, ref, '恢复正确来源或重新取得证据，不伪造历史批准'); }
  }
  check('evidence-readable', diagnostics.some(x => x.code === 'evidence-unreadable') ? 'failed' : 'passed', evidenceRefs, '仅检查已引用证据可读，不证明证据完整或当前有效');
  check('artifact-digests', 'not-checked', evidenceRefs, '未核验批准资产原字节摘要；恢复时运行资产所有者的适用预检');
  check('approval-validity', 'not-checked', [checkpointRef], '未核验真实决定、延续、外部审批及完整执行授权');
  if (value.stage_tracking?.items) {
    try {
      const drift = trackingDrift(root, value.stage_tracking);
      for (const id of drift) issue('tracking-drift', `阶段工作项来源漂移: ${id}`, checkpointRef, '按依赖重验受影响项，保留未受影响记录');
      check('stage-tracking', drift.length ? 'failed' : 'passed', [checkpointRef], '只核对已登记工作项来源及完成证据摘要；结构与流转仍须原预检');
    } catch (error) {
      issue('tracking-unverifiable', `阶段追踪不可核验: ${error.message}`, checkpointRef, '修复追踪输入后重新检查');
      check('stage-tracking', 'failed', [checkpointRef], error.message);
    }
  } else {
    check('stage-tracking', 'not-checked', [checkpointRef], '未登记追踪；按实例既有兼容或显式迁移入口处理，不自动补建');
  }
  if (value.status === 'blocked' && !diagnostics.some(x => x.severity === 'error')) issue('reason-missing', 'checkpoint 已标 blocked，原因未登记', checkpointRef, '补齐真实阻塞原因');
  let taskSource, task, contractSource;
  const recovery = {sequence: ['read-status', 'inspect-actual-result', 'verify-current-inputs', 'continue-or-reroute'], task_package_ref: taskPackageRef ?? null, contract_view: null, result_refs: [], prechecks: [], verification_items: [], checks: 'read-only; execution and approval not evaluated'};
  if(taskPackageRef) {
    try {
      taskSource=source(root,taskPackageRef);task=taskSource.value;
      if(task.work_unit_id!==value.next_work_unit && task.convergence?.parent_work_unit!==value.next_work_unit)throw Error('任务包与 checkpoint 工作单元不一致');
      if(!['not-started','active','paused','resolved','failed'].includes(task.workflow_status))throw Error('任务运行状态未知');
      recovery.prechecks.push({status:'not-checked',cwd:root,command:['node','scripts/verify-digital-human-task-package',taskPackageRef]});
      if(task.contract?.kind==='slice-implementation') {
        contractSource=source(root,task.contract.slice_contract_ref);
        const c=contractSource.value.slice_contract||contractSource.value;
        if(c.contract_id!==task.contract.contract_id||c.contract_version!==task.contract.contract_version)throw Error('任务与当前合同版本不一致');
        recovery.contract_view={cwd:root,command:['node','scripts/contract','view',task.contract.slice_contract_ref,'--kind','slice','--profile','task','--unit',task.work_unit_id]};
        const approval=task.contract.gate_refs?.[0];
        recovery.prechecks.push({status:'not-checked',cwd:root,command:['node','scripts/slice-contract','verify',task.contract.slice_contract_ref,'--unit',task.work_unit_id,...(approval?['--approval-ref',approval]:[])],approval_scope:approval?'current-approval-required':'not-checked: approval reference missing'});
        if(c.schema_version===3){
          const unit=c.work_units?.find(x=>x.id===task.work_unit_id);
          if(!unit)throw Error('当前合同不存在该工作单元');
          recovery.verification_items=Object.entries(c.verification||{}).filter(([id,check])=>unit.verification_refs?.includes(id)||check.required_for_all===true).map(([id,check])=>({id,...check,status:'not-checked'}));
        }
      }
      recovery.result_refs=[...new Set([...(task.result?.evidence_refs||[]),...(task.verification_results||[]).map(x=>x.evidence_ref)].filter(Boolean))];
      for(const ref of recovery.result_refs)readFileSync(safeTrackingPath(root,ref));
      check('task-recovery','passed',[taskPackageRef,...recovery.result_refs],'仅读取任务身份、状态和结果引用；继续前仍须正式验收');
    } catch(error) {issue('task-recovery-invalid',error.message,taskPackageRef,'核对任务身份与实际结果，再执行适用预检');}
  }
  const setRef=businessSetRef(value);
  const business = setRef ? checkBusinessTickets({root,setRef,mode:'draft'}) : {status:businessTicketVersion(root)===1?(businessAuthoringEnabled(root)?'missing':'strategic-consumption-not-checked'):'legacy-unassessed',tickets:[],diagnostics:[]};
  for(const item of business.diagnostics)issue(item.code,item.message,item.source_ref,item.recovery);
  for(const item of businessSyncDiagnostics(root,setRef,business))issue(item.code,'已声明同步的业务集合引用或摘要过期',item.ref,'重新核对视图引用，不自动修复历史批准');
  const registered=value.artifacts?.['artifact.business-ticket-set'];
  const actual=business.inputs?.find(item=>item.ref===setRef)?.digest;
  if(registered?.digest && registered.digest!==actual)issue('business-sync-stale','业务集合已登记同步但摘要过期',setRef,'重验受影响来源与引用，保留历史批准');
  if(business.status==='missing'&&!['stage.entry-triage','stage.plan','stage.spec-architecture'].includes(value.stage))issue('business-decomposition-missing','Spec 后业务拆分尚未登记',checkpointRef,'补齐业务草案与覆盖，并回到业务正式化');
  check('business-decomposition',business.status,[setRef].filter(Boolean),'结构与来源只读检查；不证明批准或实现资格');
  const blockers = [...new Set(diagnostics.filter(x => x.severity === 'error').map(x => x.message))];
  const next_step = {
    action_type: 'verify', work_unit: value.next_work_unit ?? null, cwd: root,
    command: null, input_refs: [checkpointRef,...(taskPackageRef?[taskPackageRef]:[])],
    prerequisites: ['核验当前来源、Context、适用门禁与决定或延续', '核对当前范围、任务结果和允许写路径；输入变化时重验'],
  };
  let next_action;
  if (blockers.length) {
    next_step.action_type = 'repair';
    next_action = `处理当前阻塞：${blockers[0]}`;
  } else if (value.status === 'paused-human-gate') {
    next_step.action_type = 'wait';
    next_action = '核对当前会签责任方、资产与决定范围；满足已登记恢复条件后复验';
  } else if (activeItems.some(item => item.progress === 'running') || task?.workflow_status === 'active') {
    next_step.action_type = 'inspect';
    next_action = '核对运行中任务身份与实际结果；状态未知时不得重复派发';
  } else if ((activeItems.length && activeItems.every(item => item.progress === 'completed')) || task?.workflow_status === 'resolved') {
    next_step.action_type = 'inspect';
    next_action = '核验已有完成证据并重算下一工作单元，不直接重做';
  } else {
    next_action = value.next_work_unit ? `先核验当前输入及适用门禁，再由主控恢复 ${value.next_work_unit}` : '复核当前阶段验收与下一动作';
    // Commands are argv arrays. They are recommendations, never executed by this view.
    const script = value.next_work_unit === 'work-unit.spec-synthesis' ? 'scripts/verify-plan-spec-entry' : 'scripts/verify-lifecycle-checkpoint';
    try { readFileSync(safeTrackingPath(root, script)); next_step.command = ['node', script, checkpointRef]; }
    catch { issue('precheck-unavailable', `预检入口不可读: ${script}`, script, '补齐当前实例工具后执行预检', 'warning'); }
  }
  const implementationArtifact=value.artifacts?.['artifact.vertical-slice-ticket'];
  const implementationCoverage=setRef && implementationArtifact?.ref?.endsWith('.md')?summarizeBusinessImplementation({root,setRef,sliceRefs:[implementationArtifact.ref]}):null;
  return {
    decomposition: {business, implementation: {status:implementationArtifact?'recorded':'not-recorded',recorded_status:implementationArtifact?.status??null,ref:implementationArtifact?.ref??null,coverage:implementationCoverage}, readiness:{status:'not-evaluated',reason:'阶段工作完成不替代批准与实现就绪校验'}},
    schema_version: 1, read_only: true, stage: value.stage, checkpoint_status: value.status,
    work_unit: value.next_work_unit ?? null, owner, blockers, next_action,
    execution_authorization: 'not-evaluated', verification_scope, diagnostics, next_step, recovery,
    reading_views: checkReadingViews(root,checkpointRef),
    source_digests: { checkpoint: { ref: checkpointRef, digest: checkpoint.digest }, registry: { ref: registryRef, digest: registry.digest }, orchestration: { ref: contractRef, digest: contract.digest }, ...(taskSource?{task:{ref:taskPackageRef,digest:taskSource.digest}}:{}), ...(contractSource?{slice_contract:{ref:task.contract.slice_contract_ref,digest:contractSource.digest}}:{}) },
  };
}
