import path from 'node:path';
import {decisionIO} from './user-decision-core.mjs';
import {loadPlanReviewPolicy,assertPlanReviewTask} from './plan-review-control.mjs';
import {validateJsonSchema} from './json-schema.mjs';
import {canonicalValue} from './structured-assets.mjs';
import {ROOT} from './lifecycle-registry.mjs';
import {nativeContractVerify,nativeCoverage,NEEDS} from './native-evidence.mjs';
const fail=message=>{throw new TypeError(`plan-spec-entry-blocked: ${message}`);};
const text=value=>typeof value==='string'&&value.trim().length>0;
const same=(a,b)=>JSON.stringify(canonicalValue(a))===JSON.stringify(canonicalValue(b));
export function assertPlanSpecEntry(state,options={}) {
 nativeCoverage(nativeContractVerify({root:options.root||ROOT,kind:'plan-entry',document:state,needs:NEEDS.planEntry}),'plan_entry');
 if(state.schema_version===2)return {result:'allowed',blocking_signals:[],missing_requirements:[],evidence_refs:[state.gates['gate.plan-approved'].record_ref],next_work_unit:null};
 const review=decisionIO(options).document(state.plan_review_ref);
 return {result:'allowed',blocking_signals:[],missing_requirements:[],evidence_refs:[state.plan_review_ref,state.plan_approval_ref||state.gates?.['gate.plan-approved']?.approval_ref,...review.basis.map(row=>row.ref)],next_work_unit:null};
}
export function planEntryPolicy(options = {}) {
  const registry = decisionIO(options).document('.template-spec/process/lifecycle-registry.yaml');
  const policy = registry.stages.find(stage => stage.id === 'stage.plan')?.spec_entry;
  if (!policy?.required_checks?.length || !policy?.gate_impacts) fail('缺少 Plan 入口策略');
  const gateIds = registry.gates.filter(gate => gate.stage === 'stage.plan').map(gate => gate.id).sort();
  if (!same(gateIds, Object.keys(policy.gate_impacts).sort())) fail('Plan 门禁触发策略覆盖不完整');
  const checkIds = registry.checks.filter(check => check.stage === 'stage.plan').map(check => check.id).sort();
  if (!same(checkIds, Object.keys(policy.check_impacts || {}).sort())) fail('Plan 内部检查触发策略覆盖不完整');
  return policy;
}

export function assertPlanAggregateApproval(state, options = {}) {
  if (state.schema_version!==2 && state?.gates?.['gate.plan-approved']?.status !== 'approved') fail('gate.plan-approved 未批准');
  return assertPlanSpecEntry(state, options);
}
export function validatePlanSpecEntry(state, options = {}) {
  try { return assertPlanSpecEntry(state, options); }
  catch (error) { return { result: 'blocked', blocking_signals: ['plan-spec-entry-blocked'], missing_requirements: [error.message], evidence_refs: [], next_work_unit: null }; }
}
export function assertPlanCheckpoint(checkpoint, options = {}) {
  if (checkpoint.repository_mode !== 'project-instance') return;
  if(checkpoint.schema_version===2){
    const entering=checkpoint.next_work_unit==='work-unit.spec-synthesis'||checkpoint.stage==='stage.spec-architecture';
    if(entering)return assertPlanSpecEntry(checkpoint,options);
    return;
  }
  const entering = checkpoint.next_work_unit === 'work-unit.spec-synthesis' || checkpoint.stage === 'stage.spec-architecture' || checkpoint.stage_trace?.completed_work_unit === 'work-unit.spec-synthesis';
  if (entering) return assertPlanSpecEntry(checkpoint, options);
  if (checkpoint.stage !== 'stage.plan' || !['resume','orchestrate'].includes(checkpoint.mode)) return;
  const ids = ['check.domain-strategy-approved','check.stage-decision-package-approved'];
  const priorReview = ids.some(id => checkpoint.checks?.[id]?.approval_ref || ['approved','passed'].includes(checkpoint.checks?.[id]?.status)) || checkpoint.gates?.['gate.plan-approved']?.status === 'approved';
  if (!checkpoint.plan_review_control && !priorReview) return;
  const io = decisionIO(options), policy = loadPlanReviewPolicy(options), control = checkpoint.plan_review_control;
  if (!control || control.protocol_version !== policy.protocol) fail('PLAN_REVIEW_HISTORY_ADOPTION_REQUIRED: 恢复新执行须受控升级并接入历史，不得清零');
  validateJsonSchema(control,path.resolve(io.root,'.template-spec/process/schemas/plan-review-control.schema.json'));
  if (control.feature_id !== checkpoint.feature_id || control.policy_ref !== policy.policy_ref || control.policy_digest !== policy.policy_digest) fail('PLAN_REVIEW_POLICY_DRIFT: 当前周期或策略不匹配');
  const count = control.history_count === null ? null : control.history_count + control.attempts.length;
  if ((count === null || count > policy.limits.total) && !['history-unknown','diagnosis-required','blocked'].includes(control.status)) fail('PLAN_REVIEW_BUDGET_EXHAUSTED: 超限或未知历史只能诊断、补证据');
  for (const attempt of control.attempts.filter(row => row.status !== 'completed')) assertPlanReviewTask(io.document(attempt.task_ref),{...options,checkpoint});
  return {result:'controlled',cycle_id:control.cycle_id,status:control.status,execution_authorization:'not-granted'};
}
