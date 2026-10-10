import { businessTicketVersion, businessAuthoringEnabled, businessSetRef, checkBusinessTickets, businessSyncDiagnostics, summarizeBusinessImplementation } from './business-tickets.mjs';
import { orchestrationRef } from './governance-io.mjs';
import {checkReadingViews} from './reading-view-bundle.mjs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseDocument } from '../vendor/yaml.mjs';
import { safeTrackingPath, trackingDrift } from './stage-tracking.mjs';
import { loadLifecyclePresenter } from './lifecycle-presentation.mjs';
import { summarizePlanReview } from './plan-review-control.mjs';
import {evaluateProgressionTarget} from './lifecycle-progression.mjs';

const sha = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
function parse(bytes) {
  const document = parseDocument(String(bytes), { uniqueKeys: true, maxAliasCount: 0 });
  if (document.errors.length) throw new TypeError(document.errors[0].message);
  return document.toJS({ maxAliasCount: 0 });
}
function source(root, ref) {
  try {
    const bytes = readFileSync(safeTrackingPath(root, ref));
    return { value: parse(bytes), digest: sha(bytes) };
  } catch (error) {
    error.lifecycle_input_ref ??= ref;
    throw error;
  }
}

/** Read-only projection; checkpoint, registry and orchestration remain authoritative. */
export function lifecycleStatus({ root, checkpointRef, taskPackageRef, env }) {
  if (!root || !checkpointRef) throw new TypeError('root and checkpoint are required');
  root = path.resolve(root);
  let identity;
  try {
    identity = source(root, 'yss-project.yaml').value;
    if (identity.schema_version !== 1 || identity.repository_mode !== 'project-instance') throw new TypeError('生命周期状态仅适用于 project-instance');
  } catch (error) {
    error.lifecycle_input_ref ??= 'yss-project.yaml';
    error.lifecycle_input_kind = identity?.schema_version === 1 && identity?.repository_mode === 'template-source' ? 'template-source' : 'manifest';
    throw error;
  }
  const registryRef = '.template-spec/process/lifecycle-registry.yaml';
  const contractRef = orchestrationRef(root);
  const checkpoint = source(root, checkpointRef), registry = source(root, registryRef), contract = source(root, contractRef);
  const value = checkpoint.value;
  const registeredText = value => typeof value === 'string' && value.trim() ? value : null;
  if (value.schema_version !== 1 || value.repository_mode !== 'project-instance') throw new TypeError('checkpoint 身份或版本无效');
  const items = value.stage_tracking?.items ?? [];
  if (!Array.isArray(items)) throw new TypeError('阶段追踪 items 必须为数组');
  const activeItems = items.filter(item => item.work_unit === value.next_work_unit && item.progress !== 'cancelled');
  const pauseOwner = registeredText(value.pause?.owner_or_authority);
  const workUnitOwner = registeredText(activeItems.find(item => item.progress !== 'completed')?.owner);
  const owner = pauseOwner ?? workUnitOwner ?? '未登记';
  const defaultOwnerScope = pauseOwner ? 'checkpoint-pause' : workUnitOwner ? 'work-unit' : 'not-recorded';
  const diagnostics = [], verification_scope = [];
  const check = (id, status, refs, reason) => verification_scope.push({ id, status, refs, reason });
  const issue = (code, message, source_ref, recovery, severity = 'error', issueOwner = owner, ownerScope = defaultOwnerScope) => diagnostics.push({ code, message, source_ref, owner: issueOwner, owner_scope: issueOwner === '未登记' ? 'not-recorded' : ownerScope, recovery, severity });
  let progression = null;
  try {progression = evaluateProgressionTarget({root, checkpointRef, env});}
  catch (error) {issue('progression-target-unverifiable', error.message, checkpointRef, '核对固定 CLI 的 lifecycle-target-v1 能力、唯一 map 登记与当前批准证据后复验');}
  if (!Object.hasOwn(value, 'blockers')) {
    issue('registered-blockers-missing', 'checkpoint 缺少 blockers；不能据此判定无已登记阻塞', checkpointRef, '核对原始状态并补齐真实阻塞记录后重验');
  } else if (!Array.isArray(value.blockers)) {
    issue('registered-blockers-invalid', 'checkpoint.blockers 必须为数组；当前登记不可核验', checkpointRef, '修复阻塞记录类型，保留原有阻塞内容后重验');
  } else {
    for (const item of value.blockers) {
      const record = item && typeof item === 'object' && !Array.isArray(item) ? item : {};
      issue('registered-blocker', registeredText(item) ?? registeredText(record.message) ?? registeredText(record.reason) ?? '已登记阻塞，具体问题尚未说明', registeredText(record.source_ref) ?? checkpointRef, registeredText(record.recovery) ?? '核对原阻塞记录、责任方和证据，明确处理动作后复验', 'error', registeredText(record.owner) ?? owner, registeredText(record.owner) ? 'issue' : defaultOwnerScope);
    }
  }
  check('registered-blockers', diagnostics.length ? 'failed' : 'passed', [checkpointRef], '仅读取已登记阻塞，不代表完整就绪');
  const stage = registry.value.stages?.find(item => item.id === value.stage);
  const workUnit = registry.value.work_units?.find(item => item.id === value.next_work_unit);
  // Only explicit recorded associations identify a target stage. Stage order is not a route.
  const stageAssociations = workUnit ? [
    ...(registeredText(workUnit?.stage) ? [{stage: workUnit.stage, ref: registryRef}] : []),
    ...activeItems.filter(item => registeredText(item.stage)).map(item => ({stage: item.stage, ref: checkpointRef})),
  ] : [];
  const stageIds = [...new Set(stageAssociations.map(item => item.stage))];
  const nextStage = stageIds.length === 1 && registry.value.stages?.some(item => item.id === stageIds[0]) ? stageIds[0] : null;
  const nextStageReason = !value.next_work_unit ? '未登记下一工作单元；需核验当前阶段验收与终点，不能据此判定完成'
    : stageIds.length > 1 ? '下一工作单元的已登记阶段归属存在冲突；核对权威记录后重验'
    : stageIds.length === 1 && !nextStage ? '下一工作单元的阶段归属未在注册表中识别；核对当前来源后重验'
    : !nextStage ? '下一工作单元尚未登记阶段归属；核验当前路由与阶段追踪后确认'
    : nextStage === value.stage ? '下一工作单元仍在当前阶段，先完成当前单元并验收，再核验后续流转；不代表已批准或可进入'
    : '来自下一工作单元的已登记阶段归属，仅为路由目标，不代表已批准或可进入';
  check('next-stage-association', nextStage ? 'passed' : 'not-checked', [...new Set(stageAssociations.map(item => item.ref))], nextStageReason);
  if (stageIds.length > 1 || (stageIds.length === 1 && !nextStage)) issue('next-stage-unverifiable', nextStageReason, checkpointRef, '核对下一工作单元的已登记阶段归属并执行适用预检，不按阶段顺序猜目标', 'warning');
  if (!stage) issue('unknown-stage', `未知阶段: ${value.stage}`, registryRef, '按注册表核对当前阶段');
  if (value.next_work_unit && !workUnit) issue('unknown-work-unit', `未知下一工作单元: ${value.next_work_unit}`, registryRef, '按注册表核对下一工作单元');
  if (workUnit && workUnit.id !== 'work-unit.entry-triage' && !contract.value.work_unit_routes?.[workUnit.id]) issue('missing-route', `缺少执行路由: ${workUnit.id}`, contractRef, '修复当前合同路由后重验');
  check('stage-and-route', diagnostics.some(x => ['unknown-stage', 'unknown-work-unit', 'missing-route'].includes(x.code)) ? 'failed' : 'passed', [registryRef, contractRef], '仅检查身份与路由存在，不计算完整 frontier');
  if (value.context_reconciliation?.status === 'blocked') issue('context-blocked', '术语对账受阻', checkpointRef, '修复词汇对账并执行适用校验');
  check('context-reconciliation', value.context_reconciliation?.status === 'blocked' ? 'failed' : 'not-checked', [value.context_reconciliation?.ref].filter(Boolean), '读取登记状态；当前对账内容和摘要仍须由原验证器核验');
  const gateNames = {blocked: '受阻', stale: '依据已过期', pending: '等待处理', failed: '未通过', 'ready-for-human': '等待会签', 'not-evaluated': '尚未评估'};
  const gates = value.gates && typeof value.gates === 'object' && !Array.isArray(value.gates) ? Object.entries(value.gates) : [];
  if (!Object.hasOwn(value, 'gates') || !value.gates || typeof value.gates !== 'object' || Array.isArray(value.gates)) issue('gates-unverifiable', '门禁登记缺失或格式不可核验', checkpointRef, '核对原始门禁记录并执行正式预检', 'warning');
  for (const [id, gate] of gates) {
    const status = gateNames[gate?.status];
    const hardBlocked = ['blocked', 'stale'].includes(gate?.status);
    const failed = hardBlocked || (['pending', 'failed', 'ready-for-human', 'not-evaluated'].includes(gate?.status) && gate?.applicable === true);
    if (status) {
      const blocked = hardBlocked || (failed && gate?.applicable !== false);
      const reason = registeredText(gate?.reason);
      const applicability = hardBlocked && gate?.applicable === false ? '；登记状态与适用性标记冲突，需正式预检' : blocked ? '' : '；适用性与当前处理要求待核验';
      const recovery = registeredText(gate?.recovery) ?? (['pending', 'ready-for-human'].includes(gate?.status) ? '核对适用范围、当前资产和已登记责任方；取得所需真实决定或有效延续后复验' : '核对适用范围、失败原因或过期依据，修复并重验受影响检查与批准');
      issue(blocked ? 'gate-blocked' : 'gate-unverified', `${id}：${status}${reason ? `；${reason}` : ''}${applicability}`, checkpointRef, hardBlocked && gate?.applicable === false ? `${recovery}；保留阻断状态，核对冲突登记并执行正式预检` : recovery, blocked ? 'error' : 'warning', registeredText(gate?.owner) ?? owner, registeredText(gate?.owner) ? 'issue' : defaultOwnerScope);
    } else if (!['approved', 'not-applicable'].includes(gate?.status)) {
      issue('gate-unverified', `${id}：登记状态未识别，适用性与处理要求待核验`, checkpointRef, '保留原记录，核对门禁状态与适用性后执行正式预检', 'warning', registeredText(gate?.owner) ?? owner, registeredText(gate?.owner) ? 'issue' : defaultOwnerScope);
    }
  }
  const gateDiagnostics = diagnostics.filter(x => ['gate-blocked', 'gate-unverified', 'gates-unverifiable'].includes(x.code));
  check('registered-gates', gateDiagnostics.some(x => x.severity === 'error') ? 'failed' : gateDiagnostics.length || !gates.length ? 'not-checked' : 'passed', [checkpointRef], '仅读取已登记状态；适用性未登记、待处理或记录缺失时不能判定门禁通过；不核验完整批准');
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
  let planReview = null;
  if (value.plan_review_control || value.stage === 'stage.plan') {
    try {
      planReview = summarizePlanReview(value.plan_review_control, { root });
      const stopped = ['diagnosis-required','diagnosis-ready','blocked','history-unknown'].includes(planReview.status);
      if (stopped) issue('plan-review-control-blocked', planReview.next_condition, checkpointRef, planReview.next_condition);
      if (planReview.status === 'migration-required') issue('plan-review-control-missing', planReview.next_condition, checkpointRef, '保留历史记录并受控初始化或接入当前周期，不按零轮恢复', 'warning');
      check('plan-review-control', stopped ? 'failed' : 'not-checked', [checkpointRef], '累计额度和问题处置只读视图；当前批准仍须正式核验');
    } catch (error) { issue('plan-review-control-invalid', error.message, checkpointRef, '升级协议读取能力并核对原周期与历史次数，不重置额度'); }
  }
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
  if (['reached', 'not-applicable'].includes(progression?.status)) {
    next_step.action_type = 'stop'; next_step.command = null;
    next_action = '本次推进目标已达成；保留已登记下一工作单元。明确改变终点后复验当前来源并续推';
  } else if (progression && progression.status !== 'pending') {
    next_step.action_type = 'repair'; next_step.command = null;
    next_action = '本次目标尚不可验证；核对影响依据和当前证据后再决定推进';
  }
  const implementationCoverage=setRef && implementationArtifact?.ref?.endsWith('.md')?summarizeBusinessImplementation({root,setRef,sliceRefs:[implementationArtifact.ref]}):null;
  const presenter = loadLifecyclePresenter(root);
  const statusNames = { routing: '正在确定下一步', running: '正在推进', blocked: '受阻', 'paused-human-gate': '等待会签', completed: '记录为已完成，仍需核验' };
  const readable = text => presenter.text(text, {trace: false}).replace(/: (blocked|stale)$/, (_, status) => status === 'blocked' ? '：受阻' : '：依据已过期，需重新核验');
  const presentation = {
    ...(progression ? {progression} : {}),
    ...(planReview ? { plan_review: planReview } : {}),
    read_only: true, execution_allowed: false, approval_validity: 'not-checked',
    stage: value.stage ? presenter.label(value.stage, {trace: false}) : '未登记',
    next_stage: nextStage ? presenter.label(nextStage, {trace: false}) : '待核验', next_stage_reason: readable(nextStageReason),
    checkpoint_status: Object.hasOwn(statusNames, value.status) ? statusNames[value.status] : `未识别状态（${value.status ?? '未登记'}）`,
    work_unit: value.next_work_unit ? presenter.label(value.next_work_unit, {trace: false}) : '未登记',
    owner: presenter.text(owner, {trace: false}), blockers: blockers.map(readable),
    issues: diagnostics.map(item => ({code: item.code, severity: item.severity, message: readable(item.message), source_ref: item.source_ref, owner: presenter.text(item.owner, {trace: false}), owner_scope: item.owner_scope, recovery: readable(item.recovery)})),
    pending_verification: verification_scope.filter(item => !['passed', 'failed'].includes(item.status)).map(item => ({id: item.id, reason: readable(item.reason), refs: item.refs})),
    continue_conditions: [...(registeredText(value.pause?.resume_condition) ? [readable(value.pause.resume_condition)] : []), ...next_step.prerequisites.map(readable), ...(blockers.length ? ['逐项处理当前阻塞，并由适用验证器确认恢复条件满足'] : []), '由主控验收当前证据并核验授权后决定继续或重新路由'],
    expected_output: workUnit ? readable(workUnit.public_output ?? workUnit.output ?? '产出说明未登记') : null,
    next_action: readable(next_action), sources: presenter.sources, warnings: presenter.warnings,
    names: presenter.catalog({stage: value.stage, next_stage: nextStage, work_unit: value.next_work_unit, owner, gates: value.gates, artifacts: value.artifacts}),
  };
  return {
    ...(progression ? {progression} : {}),
    ...(planReview ? { plan_review: planReview } : {}),
    presentation,
    decomposition: {business, implementation: {status:implementationArtifact?'recorded':'not-recorded',recorded_status:implementationArtifact?.status??null,ref:implementationArtifact?.ref??null,coverage:implementationCoverage}, readiness:{status:'not-evaluated',reason:'阶段工作完成不替代批准与实现就绪校验'}},
    schema_version: 1, read_only: true, stage: value.stage, next_stage: nextStage, next_stage_reason: nextStageReason, next_stage_source_refs: [...new Set(stageAssociations.map(item => item.ref))], checkpoint_status: value.status,
    work_unit: value.next_work_unit ?? null, owner, blockers, next_action,
    execution_authorization: 'not-evaluated', verification_scope, diagnostics, next_step, recovery,
    reading_views: checkReadingViews(root,checkpointRef),
    source_digests: { checkpoint: { ref: checkpointRef, digest: checkpoint.digest }, registry: { ref: registryRef, digest: registry.digest }, orchestration: { ref: contractRef, digest: contract.digest }, ...(taskSource?{task:{ref:taskPackageRef,digest:taskSource.digest}}:{}), ...(contractSource?{slice_contract:{ref:task.contract.slice_contract_ref,digest:contractSource.digest}}:{}) },
  };
}
