import path from 'node:path';
import {withValidationPhase, existsSync, readFileSync} from './validation-phase.mjs';
import {ROOT, loadRegistry} from './lifecycle-registry.mjs';
import {loadDigitalHumanRoles, countersignRuleForGate} from './digital-human-roles.mjs';
import {assertGateChecks} from './lifecycle-controls.mjs';
import {assertPlanAggregateApproval} from './plan-spec-entry.mjs';
import {assertUserDecisionRequirement, assertWorkUnitUserDecision, assertImplementationDecision} from './user-decision.mjs';
import {validateAssetStructure, canonicalValue} from './structured-assets.mjs';
import {assertCurrentApproval, approvalExpectationFromState} from './approval-current.mjs';
import {approvalExpectedFromTask} from './review-capabilities.mjs';
import {approvalIO, readApprovalDocument, reviewBundleRows, loadApprovalRecord, selectApprovalRecord, readApprovalHistory, resolveApprovalRef, approvalError} from './approval-record-io.mjs';
export {assertCurrentApproval, approvalExpectationFromState, approvalExpectationFromSubject} from './approval-current.mjs';
export {loadApprovalRecord, selectApprovalRecord, readApprovalHistory, resolveApprovalRef} from './approval-record-io.mjs';

function expectedFor(record, options) {
  if (options.expected) return Array.isArray(options.expected) ? options.expected.find(row => row.boundary === record.gate_id) : options.expected;
  if (options.checkpoint) {
    const state = options.checkpoint.gates?.[record.gate_id] || options.checkpoint.checks?.[record.gate_id];
    return approvalExpectationFromState(record.gate_id,state,options);
  }
  if (record.schema_version === 2 && record.review_task_ref) {
    const task = approvalIO(options).document(record.review_task_ref);
    return approvalExpectedFromTask(task,{...options,read:options.read || readFileSync,boundary:record.gate_id,reviewTaskRef:record.review_task_ref,reviewTaskDigest:record.review_task_digest});
  }
  return undefined;
}
function currentRoles(options) {
  const rolesPath = path.resolve(options.root || ROOT, '.template-spec/agents/digital-human-roles.yaml');
  return options.rolesDoc || loadDigitalHumanRoles(existsSync(rolesPath) ? rolesPath : undefined);
}
function boundedPlanApproval(record, options) {
  const roles = currentRoles(options);
  return Boolean(record?.plan_review_binding || options.checkpoint?.plan_review_control
    || roles.gate_policy.review_execution?.review_bundles?.some(rule =>
      rule.aggregate_gate === 'gate.plan-approved' && rule.aggregate_additional_review_task === 'forbidden'));
}
function validatePlanApproval(record, options) {
  const checkpoint = options.checkpoint;
  const ref = checkpoint?.plan_approval_ref || checkpoint?.gates?.['gate.plan-approved']?.approval_ref;
  if (!checkpoint || !ref) approvalError('APPROVAL_CONTEXT_REQUIRED', 'Plan 聚合批准须完整当前 checkpoint 与受控审查周期');
  if (JSON.stringify(canonicalValue(approvalIO(options).document(ref))) !== JSON.stringify(canonicalValue(record))) approvalError('APPROVAL_CURRENT_INVALID', '待验 Plan 记录不是 checkpoint 当前聚合批准');
  return assertPlanAggregateApproval(checkpoint, options);
}
export function validateApprovalRecord(record, options = {}) {
  if (options.history === true || options.requireApproved === false) {
    validateAssetStructure(record,'approval-record');
    if (record.kind === 'review-bundle') reviewBundleRows(record);
    return {bucket:'history-only',record,execution_authorization:'not-evaluated'};
  }
  if (record.gate_id === 'gate.plan-approved' && boundedPlanApproval(record, options)) return validatePlanApproval(record, options);
  return withValidationPhase({root:options.root || ROOT,purpose:'approval-current',readOnly:true},()=>assertCurrentApproval(record,expectedFor(record,options),options));
}
export function validateApprovalRecordFile(filePath, options = {}) {
  if (options.history === true || options.requireApproved === false) return readApprovalHistory(filePath,options);
  return withValidationPhase({root:options.root || ROOT,purpose:'approval-current',readOnly:true},()=>{
    const record = readApprovalDocument(filePath,options);
    if (record.gate_id === 'gate.plan-approved' && boundedPlanApproval(record, options)) return validatePlanApproval(record, options);
    if (record.kind !== 'review-bundle') return assertCurrentApproval(record,expectedFor(record,options),options);
    return reviewBundleRows(record).map(row=>assertCurrentApproval(loadApprovalRecord(filePath,row.gate_id,options),expectedFor(row,options),options));
  });
}
export function assertApprovedGateHasValidApproval(gateId,gateState,options = {}) {
  const rolesDoc=currentRoles(options);
  if (!countersignRuleForGate(rolesDoc.gate_policy,gateId)) return;
  if (!gateState || typeof gateState !== 'object') approvalError('APPROVAL_CONTEXT_REQUIRED',`${gateId} 缺少门禁状态`);
  if (gateState.status !== 'approved') return;
  if (!gateState.approval_ref) approvalError('APPROVAL_REFERENCE_REQUIRED',`${gateId} 已 approved 但缺少 approval_ref`);
  if (gateId === 'gate.plan-approved' && boundedPlanApproval(null, {...options, rolesDoc})) {
    if (!options.checkpoint || JSON.stringify(canonicalValue(options.checkpoint.gates?.[gateId])) !== JSON.stringify(canonicalValue(gateState))) approvalError('APPROVAL_CONTEXT_REQUIRED', 'Plan 聚合批准须完整当前 checkpoint 与受控审查周期');
    return assertPlanAggregateApproval(options.checkpoint, {...options,rolesDoc});
  }
  return withValidationPhase({root:options.root || ROOT,purpose:'approval-helper-current',readOnly:true},()=>{
    const file=resolveApprovalRef(gateState.approval_ref,options.checkpointPath || ROOT,options);
    // A gate assertion always consumes current authority. History options only
    // belong to the separate history reader and cannot weaken this boundary.
    return assertCurrentApproval(loadApprovalRecord(file,gateId,options),approvalExpectationFromState(gateId,gateState,options),{...options,rolesDoc});
  });
}
export function assertCheckpointApprovals(checkpoint,checkpointPath,options = {}) {
  const registry=options.registry || loadRegistry(),rolesDoc=currentRoles(options);
  return withValidationPhase({root:options.root || ROOT,purpose:'checkpoint-approvals',readOnly:true},()=>{
    const known=new Set(registry.gates.map(gate=>gate.id));
    for (const [gateId,state] of Object.entries(checkpoint?.gates || {})) {
      if (!known.has(gateId)) approvalError('APPROVAL_CURRENT_INVALID',`未知或已退役门禁: ${gateId}；历史记录只读，不自动迁移批准`);
      if (state.status === 'approved') assertGateChecks(gateId,checkpoint,{...options,registry,rolesDoc});
      assertApprovedGateHasValidApproval(gateId,state,{...options,checkpoint,checkpointPath,registry,rolesDoc});
    }
  });
}

// Called on resume/transition as well as completion; drafting while waiting stays allowed.
export function assertCheckpointUserDecisions(checkpoint, options = {}) {
  if (checkpoint.repository_mode !== "project-instance") return;
  const review = checkpoint.human_review || {};
  const advancing = ["running", "completed"].includes(checkpoint.status) || (checkpoint.mode === "resume" && checkpoint.status === "routing");
  if (!advancing) return;
  const state = { user_decisions: review.user_decisions || [], user_decision_not_applicable: review.not_applicable || [] };
  const completedUnit = checkpoint.stage_trace?.completed_work_unit;
  if (completedUnit) assertWorkUnitUserDecision(completedUnit, state, options);
  if (checkpoint.next_work_unit === "work-unit.slice-implementation") assertImplementationDecision({ ...review.implementation, ...state }, options);
  for (const requirement of review.required_decisions || []) assertUserDecisionRequirement(requirement, options);
  if (review.external_input) assertUserDecisionRequirement({ ...review.external_input, boundary: "external-input" }, options);
  if (checkpoint.status === "completed") {
    if (checkpoint.blockers?.length || Object.values(checkpoint.gates || {}).some(gate => !["approved", "not-applicable"].includes(gate.status))) throw new TypeError("lifecycle-control-blocked: 仍有阻塞或未通过门禁，不可完成");
    const completionGate=loadRegistry().gates.some(gate=>gate.id==="gate.strategic-design-handoff-approved")?"gate.strategic-design-handoff-approved":"gate.delivery-accepted";
    if (checkpoint.gates?.[completionGate]?.status !== "approved") throw new TypeError("lifecycle-control-blocked: 阶段完成须当前交付或战略交接验收，不等于发布授权");
  }
}

// Strategic profiles retain their bounded stage-transition API while using the same current kernel.
export function assertStrategicWorkUnitDecision(workUnit, state, options = {}) {
  const roles=currentRoles(options);
  const boundaries=workUnit==='work-unit.strategic-design-handoff' ? ['gate.strategic-design-handoff-approved'] : [...(roles.user_decision_policy.work_unit_gates?.[workUnit] || []), ...(roles.user_decision_policy.work_units?.[workUnit] ? [roles.user_decision_policy.work_units[workUnit]] : [])];
  for(const boundary of boundaries) {
    const gate=state.gates?.[boundary];
    if(gate?.status==='approved') {
      assertGateChecks(boundary,state,options);
      assertApprovedGateHasValidApproval(boundary,gate,{...options,checkpoint:state,rolesDoc:roles});
    } else if(workUnit==='work-unit.strategic-design-handoff') {
      approvalError('APPROVAL_CURRENT_INVALID','strategic-gate-migration-required: '+boundary);
    } else {
      assertWorkUnitUserDecision(workUnit,{user_decisions:state.user_decisions || state.human_review?.user_decisions || [],user_decision_not_applicable:state.user_decision_not_applicable || state.human_review?.not_applicable || []},{...options,rolesDoc:roles});break;
    }
  }
}
