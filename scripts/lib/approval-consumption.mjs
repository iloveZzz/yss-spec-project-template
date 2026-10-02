import {createHash} from 'node:crypto';
import {approvalIO, approvalError} from './approval-record-io.mjs';
import {approvalExpectationFromSubject, approvalExpectationFromState} from './approval-current.mjs';

const hex = value => value?.replace(/^sha256:/, '');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

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
  return {...expected, review_package: context.review_package ?? expected.review_package};
}

export function approvalExpectationForCheckpoint(boundary, state, context = {}) {
  return approvalExpectationFromState(boundary, state, context);
}
