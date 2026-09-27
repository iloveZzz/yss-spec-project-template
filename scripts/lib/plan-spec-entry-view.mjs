import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseDocument } from '../vendor/yaml.mjs';
import { safeTrackingPath } from './stage-tracking.mjs';

const digest = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const read = (root, ref) => readFileSync(safeTrackingPath(root, ref));
const parse = bytes => {
  const document = parseDocument(String(bytes), { uniqueKeys: true, maxAliasCount: 0 });
  if (document.errors.length) throw new TypeError(document.errors[0].message);
  return document.toJS({ maxAliasCount: 0 });
};

/** Draft data only: no checks, impacts, approvals or user decisions are inferred. */
export function preparePlanSpecEntry({ root, featureId, planRef, contextRef }) {
  if (![root, featureId, planRef, contextRef].every(value => typeof value === 'string' && value.trim())) throw new TypeError('root, feature, plan and context-reconciliation are required');
  const identity = parse(read(root, 'yss-project.yaml'));
  if (identity.schema_version !== 1 || identity.repository_mode !== 'project-instance') throw new TypeError('Plan 入口仅适用于 project-instance');
  const registryRef = '.template-spec/process/lifecycle-registry.yaml';
  const registry = parse(read(root, registryRef));
  const policy = registry.stages?.find(stage => stage.id === 'stage.plan')?.spec_entry;
  if (!policy?.required_checks?.length) throw new TypeError('Plan 入口检查合同缺失');
  const refs = [...new Set([planRef, 'CONTEXT.md', registryRef, contextRef])];
  const basis = refs.map(ref => ({ ref, digest: digest(read(root, ref)) }));
  const review_candidate = {
    schema_version: 1, kind: 'plan-entry-review', gate_id: 'gate.plan-approved', feature_id: featureId,
    plan_ref: planRef, context_reconciliation_ref: contextRef, basis,
    checks: Object.fromEntries(policy.required_checks.map(id => [id, { status: 'pending', evidence_refs: [] }])),
    open_items: [],
    impacts: Object.fromEntries(Object.values(policy.check_impacts ?? {}).map(impact => [impact, null])),
    internal_checks: Object.fromEntries(Object.keys(policy.check_impacts ?? {}).map(id => [id, { status: 'pending', evidence_refs: [] }])),
  };
  return { schema_version: 1, status: 'draft', review_candidate, missing_requirements: ['补齐检查证据与影响判断', '展示当前审阅包并提供真实用户决定，或按用户决定协议核验绑定当前范围的 plan_continuation_ref；未知或实质变化须重新决定'], approval_created: false };
}

export function diffPlanSpecEntry({ root, reviewRef }) {
  if (!root || !reviewRef) throw new TypeError('root and review are required');
  const review = parse(read(root, reviewRef));
  if (review.kind !== 'plan-entry-review' || review.schema_version !== 1 || !Array.isArray(review.basis)) throw new TypeError('不是 Plan 入口审阅包');
  const changed_refs = [], missing_refs = [];
  for (const item of review.basis) {
    if (!item?.ref || !item?.digest) throw new TypeError('basis 缺少 ref 或 digest');
    try { if (digest(read(root, item.ref)) !== item.digest) changed_refs.push(item.ref); }
    catch { missing_refs.push(item.ref); }
  }
  return { schema_version: 1, review_ref: reviewRef, status: changed_refs.length || missing_refs.length ? 'stale' : 'current', changed_refs, missing_refs, approval_created: false };
}
