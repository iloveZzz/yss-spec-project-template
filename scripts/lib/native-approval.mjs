import path from 'node:path';
import {createHash} from 'node:crypto';
import * as fs from './validation-phase.mjs';
import {readFileSync,existsSync} from './validation-phase.mjs';
import {ROOT} from './lifecycle-registry.mjs';
import {parseAsset,canonicalValue} from './structured-assets.mjs';
import {loadDigitalHumanRoles,countersignRuleForGate} from './digital-human-roles.mjs';

import {assertHandoffEvidenceRef} from './strategic-handoff-io.mjs';
import {approvalExpectedFromTask} from './review-capabilities.mjs';
import {nativeEvidenceVerify,nativeContractVerify,nativeCoverage,nativeApprovalRecord,NEEDS} from './native-evidence.mjs';
import {assertImportedSpecPrerequisite} from './spec-baseline.mjs';
import {assertWorkUnitUserDecision} from './native-user-decision.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const hex=value=>typeof value==='string'?value.replace(/^sha256:/,''):value;
const text=value=>typeof value==='string'&&value.trim();
const sameScope=(a,b)=>Array.isArray(a)&&a.length>0&&Array.isArray(b)&&b.length>0&&new Set(a).size===a.length&&new Set(b).size===b.length&&JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
const rootFor=options=>path.resolve(options.root||ROOT);
export function assertCurrentApprovalEvidenceRef(ref){if(typeof ref==='string')assertHandoffEvidenceRef(ref);}
export function assertCurrentApprovalReferences(record){for(const ref of [record?.subject_ref,record?.review_task_ref,record?.continuation_ref,...(record?.basis||[]).map(row=>row.ref),...(record?.review_bundle_basis||[]).map(row=>row.ref),...(record?.evidence_refs||[])])assertCurrentApprovalEvidenceRef(ref);}
export const approvalError = (code, detail) => { throw Object.assign(new TypeError(`${code}: ${detail}`), {code}); };
export function approvalIO({root = ROOT, read = ref => readFileSync(ref)} = {}) {
  root = path.resolve(root);
  const resolve = ref => {
    if (typeof ref !== 'string' || !ref.trim()) approvalError('APPROVAL_REFERENCE_REQUIRED', '缺少可读取引用');
    return path.isAbsolute(ref) ? ref : path.resolve(root, ref);
  };
  const bytes = ref => read(resolve(ref));
  const document = ref => parseAsset(bytes(ref), resolve(ref));
  return {root, resolve, bytes, document};
}
export function approvalExpectationFromState(boundary, state, context = {}) {
  if (!state || !text(state.subject_ref) || !sameScope(state.approval_scope, state.approval_scope)) approvalError('APPROVAL_CONTEXT_REQUIRED','当前消费边界缺少主体或批准范围');
  assertCurrentApprovalEvidenceRef(state.subject_ref);assertCurrentApprovalEvidenceRef(state.approval_ref);
  const io = approvalIO(context), bytes = io.bytes(state.subject_ref);
  let subject;
  try {subject = parseAsset(bytes,io.resolve(state.subject_ref));} catch {subject = null;}
  return ({boundary,subject_ref:state.subject_ref,subject_digest:state.subject_digest || state.basis?.find(asset=>asset.ref===state.subject_ref)?.digest || hash(bytes),approval_scope:[...state.approval_scope],basis:state.basis?.filter(asset => ![state.approval_ref,state.subject_ref].includes(asset.ref)),drafter_principal_ref:state.drafter_principal_ref || subject?.drafter_principal_ref,review_package:context.review_package ?? state.review_package ?? boundary.startsWith('gate.'),review_context:state.review_context});
}
export function approvalExpectationFromSubject(boundary, subjectRef, context = {}) {
  assertCurrentApprovalEvidenceRef(subjectRef);
  const io=approvalIO(context),bytes=io.bytes(subjectRef),subject=parseAsset(bytes,io.resolve(subjectRef)),scope=subject.approval_scope || subject.scope;
  if (!sameScope(scope,scope) || !subject.basis?.length) approvalError('APPROVAL_CONTEXT_REQUIRED','当前主体缺少独立范围及依据；请提供 checkpoint/task 消费上下文');
  return ({boundary,subject_ref:subjectRef,subject_digest:hash(bytes),approval_scope:[...scope],basis:subject.basis,drafter_principal_ref:subject.drafter_principal_ref,review_package:context.review_package ?? boundary.startsWith('gate.')});
}
/** The consumer's current binding chooses the review subject, never the approval record. */
export function approvalExpectationForBoundAsset(boundary, binding, context = {}) {
  const io = approvalIO(context);
  const assetRef = typeof binding === 'string' ? binding : binding?.ref;
  if (!assetRef) approvalError('APPROVAL_CONTEXT_REQUIRED', '消费方缺少当前资产引用');
  const bytes = io.bytes(assetRef);
  if (typeof binding === 'object' && binding.digest && hex(binding.digest) !== hash(bytes)) approvalError('APPROVAL_CURRENT_INVALID', '消费方当前资产摘要过期');
  let asset;
  try { asset = io.document(assetRef); } catch { asset = null; }
  const current = binding?.approval_context || asset?.approval_context;
  if (!current && !asset) approvalError('APPROVAL_CONTEXT_REQUIRED', '原始资产缺少消费方独立批准上下文');
  // A current structured review package can be consumed directly. Raw assets
  // need an independently selected approval_context in their current binding.
  const expected = current
    ? approvalExpectationFromState(boundary, current, context)
    : approvalExpectationFromSubject(boundary, assetRef, context);
  if (io.resolve(assetRef) !== io.resolve(expected.subject_ref)) {
    const frozen = expected.basis?.find(item => io.resolve(item.ref) === io.resolve(assetRef));
    if (frozen && hex(frozen.digest) !== hash(bytes)) approvalError('APPROVAL_CURRENT_INVALID', '当前资产批准上下文摘要过期');
    if (!frozen) expected.basis = [...(expected.basis || []), {ref:assetRef,digest:hash(bytes)}];
  }
  if (context.scope && JSON.stringify([...context.scope].sort()) !== JSON.stringify([...expected.approval_scope].sort())) approvalError('APPROVAL_CURRENT_INVALID', '当前资产消费范围与审阅包不匹配');
  return {...expected,review_package:context.review_package ?? expected.review_package};
}

export function approvalExpectationForCheckpoint(boundary, state, context = {}) {
  return approvalExpectationFromState(boundary, state, context);
}

export function readApprovalDocument(ref,options={}){return approvalIO(options).document(ref);}
export function reviewBundleRows(record){
 if(record?.kind!=='review-bundle'||!Array.isArray(record.reviews)||!record.reviews.length||new Set(record.reviews.map(row=>row.gate_id)).size!==record.reviews.length)approvalError('APPROVAL_BUNDLE_INVALID','组合审查缺少唯一门禁行');
 return record.reviews;
}
export function selectApprovalRecord(record,gateId){
 if(record.kind!=='review-bundle')return record;
 const rows=reviewBundleRows(record).filter(row=>row.gate_id===gateId);
 if(rows.length!==1)approvalError('APPROVAL_BUNDLE_INVALID','组合审查缺少当前门禁');
 return {...rows[0],review_bundle_id:record.bundle_id,review_task_id:record.task_id,review_work_unit_id:record.work_unit_id,review_session_id:record.review_session_id,...(record.schema_version===2?{review_bundle_basis:record.basis}:{}),...(record.plan_review_binding?{plan_review_binding:record.plan_review_binding}:{})};
}
export const loadApprovalRecord=(file,gate,options={})=>selectApprovalRecord(readApprovalDocument(file,options),gate);
export function resolveApprovalRef(ref,fromFile=ROOT,{root=ROOT}={}){if(!text(ref))approvalError('APPROVAL_REFERENCE_REQUIRED','approval_ref 不能为空');if(path.isAbsolute(ref))return ref;const file=path.resolve(root,ref);return existsSync(file)?file:path.resolve(path.dirname(fromFile),ref);}
function expectedFor(record,options){
 if(options.expected)return Array.isArray(options.expected)?options.expected.find(row=>row.boundary===record.gate_id):options.expected;
 if(options.checkpoint)return approvalExpectationFromState(record.gate_id,options.checkpoint.gates?.[record.gate_id]||options.checkpoint.checks?.[record.gate_id],options);
 if(record.schema_version===2&&record.review_task_ref){const task=approvalIO(options).document(record.review_task_ref);return approvalExpectedFromTask(task,{...options,boundary:record.gate_id,reviewTaskRef:record.review_task_ref,reviewTaskDigest:record.review_task_digest});}
 return undefined;
}
function requireSuccess(result){if(result.exitCode!==0)throw Object.assign(new Error(result.message),{code:result.diagnostics[0]?.code??result.code,native:true});return result;}
function currentRoles(options){return loadDigitalHumanRoles(path.join(rootFor(options),'.template-spec/agents/digital-human-roles.yaml'));}
function isPlan(record,options){return record.gate_id==='gate.plan-approved'&&Boolean(record.plan_review_binding||options.checkpoint?.plan_review_control||currentRoles(options).gate_policy.review_execution?.review_bundles?.some(row=>row.aggregate_gate==='gate.plan-approved'&&row.aggregate_additional_review_task==='forbidden'));}
function plan(record,options){
 const state=options.checkpoint,ref=state?.plan_approval_ref||state?.gates?.['gate.plan-approved']?.approval_ref;
 if(!ref)approvalError('APPROVAL_CONTEXT_REQUIRED','Plan 聚合批准需要完整当前 checkpoint');
 if(JSON.stringify(canonicalValue(approvalIO(options).document(ref)))!==JSON.stringify(canonicalValue(record)))approvalError('APPROVAL_CURRENT_INVALID','待验 Plan 记录不是当前 checkpoint 的批准');
 return nativeCoverage(nativeContractVerify({root:rootFor(options),kind:'plan-entry',document:state,needs:NEEDS.planEntry}),'plan_entry');
}
export function validateApprovalRecord(record,options={}){
 if(options.history===true||options.requireApproved===false){requireSuccess(nativeEvidenceVerify({root:rootFor(options),kind:'approval',document:record,extra:['--history'],needs:NEEDS.approval}));return{record,bucket:'history-only',execution_authorization:'not-evaluated'};}
 if(isPlan(record,options))return plan(record,options);
 const expected=record.kind==='review-bundle'?reviewBundleRows(record).map(row=>expectedFor(row,options)):expectedFor(record,options);
 return nativeApprovalRecord({root:rootFor(options),record,expected});
}
export function validateApprovalRecordFile(file,options={}){
 const record=readApprovalDocument(file,options);
 if(options.history===true||options.requireApproved===false)return validateApprovalRecord(record,options);
 if(isPlan(record,options))return plan(record,options);
 const expected=record.kind==='review-bundle'?reviewBundleRows(record).map(row=>expectedFor(row,options)):expectedFor(record,options);
 return nativeApprovalRecord({root:rootFor(options),file,expected});
}
export const readApprovalHistory=(file,options={})=>validateApprovalRecordFile(file,{...options,history:true});
export const assertCurrentApproval=(record,expected,options={})=>validateApprovalRecord(record,{...options,expected,history:false,requireApproved:true});
export function assertApprovedGateHasValidApproval(gateId,state,options={}){
 if(!countersignRuleForGate(currentRoles(options).gate_policy,gateId))return;
 if(!state||typeof state!=='object')approvalError('APPROVAL_CONTEXT_REQUIRED','缺少门禁状态');
 if(state.status!=='approved')return;
 if(!state.approval_ref)approvalError('APPROVAL_REFERENCE_REQUIRED','已批准门禁缺少 approval_ref');
 assertCurrentApprovalEvidenceRef(state.approval_ref);
 const file=resolveApprovalRef(state.approval_ref,options.checkpointPath||ROOT,options),record=loadApprovalRecord(file,gateId,options);
 if(record.gate_id!==gateId)approvalError('APPROVAL_CURRENT_INVALID','批准记录门禁与请求门禁不一致');
 if(gateId==='gate.plan-approved'&&isPlan(record,options)){if(JSON.stringify(canonicalValue(state))!==JSON.stringify(canonicalValue(options.checkpoint?.gates?.[gateId])))approvalError('APPROVAL_CURRENT_INVALID','传入 Plan 状态与当前 checkpoint 不一致');return plan(record,options);}
 return nativeApprovalRecord({root:rootFor(options),file,gate:gateId,expected:approvalExpectationFromState(gateId,state,options)});
}
export function assertCheckpointApprovals(checkpoint,checkpointPath,options={}) {
 return nativeCoverage(nativeContractVerify({root:rootFor(options),kind:'checkpoint-approvals',document:checkpoint,needs:NEEDS.checkpointApprovals}),'checkpoint_approvals');
}
export function assertCheckpointUserDecisions(checkpoint,options={}){return nativeCoverage(nativeContractVerify({root:rootFor(options),kind:'checkpoint-user-decisions',document:checkpoint,needs:NEEDS.checkpointUserDecisions}),'checkpoint_user_decisions');}
export function assertStrategicWorkUnitDecision(workUnit,state,options={}){
 const roles=currentRoles(options),boundaries=workUnit==='work-unit.strategic-design-handoff'?['gate.strategic-design-handoff-approved']:[...(roles.user_decision_policy.work_unit_gates?.[workUnit]||[]),...(roles.user_decision_policy.work_units?.[workUnit]?[roles.user_decision_policy.work_units[workUnit]]:[])];
 for(const boundary of boundaries){
  if(state.upstream_spec_baseline&&state.gates?.[boundary]?.status!=='approved'&&['gate.plan-approved','gate.spec-baseline-approved'].includes(boundary)){assertImportedSpecPrerequisite(state,{root:rootFor(options)});continue;}
  if(state.gates?.[boundary]?.status==='approved'){nativeCoverage(nativeContractVerify({root:rootFor(options),kind:'gate-checks',document:state,extra:['--gate',boundary],needs:NEEDS.gateChecks}),'gate_checks');assertApprovedGateHasValidApproval(boundary,state.gates[boundary],{...options,checkpoint:state});}
  else if(workUnit==='work-unit.strategic-design-handoff')approvalError('APPROVAL_CURRENT_INVALID','strategic-gate-migration-required: '+boundary);
  else {assertWorkUnitUserDecision(workUnit,{user_decisions:state.user_decisions||state.human_review?.user_decisions||[],user_decision_not_applicable:state.user_decision_not_applicable||state.human_review?.not_applicable||[]},options);break;}
 }
}
