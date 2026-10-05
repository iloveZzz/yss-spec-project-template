import path from 'node:path';
import {existsSync, readFileSync} from './validation-phase.mjs';
import {ROOT} from './lifecycle-registry.mjs';
import {parseAsset, validateAssetStructure} from './structured-assets.mjs';

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
export function readApprovalDocument(filePath, context = {}) {
  const io = approvalIO(context), value = io.document(filePath);
  validateAssetStructure(value, 'approval-record');
  return value;
}
export function reviewBundleRows(bundle) {
  if (![1, 2].includes(bundle?.schema_version) || bundle.kind !== 'review-bundle') approvalError('APPROVAL_BUNDLE_INVALID', '组合审查身份无效');
  if (!Array.isArray(bundle.reviews) || !bundle.reviews.length) approvalError('APPROVAL_BUNDLE_INVALID', '组合审查不能为空');
  if (new Set(bundle.reviews.map(row => row.gate_id)).size !== bundle.reviews.length) approvalError('APPROVAL_BUNDLE_INVALID', '组合审查 gate_id 重复');
  for (const row of bundle.reviews) {
    if (row.schema_version !== bundle.schema_version || row.role_id !== bundle.role_id || row.runtime_id !== bundle.runtime_id || row.principal_ref !== bundle.principal_ref) approvalError('APPROVAL_BUNDLE_INVALID', '组合审查必须来自同一复核角色、运行时和实例');
    if (row.review_session_id != null && row.review_session_id !== bundle.review_session_id) approvalError('APPROVAL_BUNDLE_INVALID', '组合审查 review_session_id 不一致');
    if (bundle.schema_version === 2) {
      for (const field of ['review_task_ref','review_task_digest']) if (row[field] !== bundle[field]) approvalError('APPROVAL_BUNDLE_INVALID', `组合审查 ${field} 不一致`);
      if (JSON.stringify([...(row.capability_ids || [])].sort()) !== JSON.stringify([...(bundle.capability_ids || [])].sort())) approvalError('APPROVAL_BUNDLE_INVALID', '组合审查 capability_ids 不一致');
      if (row.basis?.some(asset=>!bundle.basis?.some(bound=>bound.ref===asset.ref && bound.digest===asset.digest))) approvalError('APPROVAL_BUNDLE_INVALID', '组合审查未覆盖逐项 basis');
    }
  }
  return bundle.reviews;
}
export function selectApprovalRecord(record, gateId) {
  if (record.kind !== 'review-bundle') return record;
  const selected = reviewBundleRows(record).filter(row => row.gate_id === gateId);
  if (selected.length !== 1) approvalError('APPROVAL_BUNDLE_INVALID', '组合审查缺少当前检查的明确结论');
  return {...selected[0], review_bundle_id:record.bundle_id, review_task_id:record.task_id, review_work_unit_id:record.work_unit_id, review_session_id:record.review_session_id,...(record.schema_version===2?{review_bundle_basis:record.basis}:{}),...(record.plan_review_binding?{plan_review_binding:record.plan_review_binding}:{})};
}
export function loadApprovalRecord(filePath, gateId, context = {}) {
  return selectApprovalRecord(readApprovalDocument(filePath, context), gateId);
}
export function readApprovalHistory(filePath, context = {}) {
  const record = readApprovalDocument(filePath, context);
  if (record.kind === 'review-bundle') reviewBundleRows(record);
  return {record, bucket:'history-only', execution_authorization:'not-evaluated'};
}
export function resolveApprovalRef(ref, fromFile = ROOT, {root = ROOT} = {}) {
  if (typeof ref !== 'string' || !ref.trim()) approvalError('APPROVAL_REFERENCE_REQUIRED', 'approval_ref 不能为空');
  if (path.isAbsolute(ref)) return ref;
  const candidate = path.resolve(root, ref);
  return existsSync(candidate) ? candidate : path.resolve(path.dirname(fromFile), ref);
}
