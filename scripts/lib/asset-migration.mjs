import fs from 'node:fs';
import path from 'node:path';
import { safeFile } from './governance-io.mjs';
import { parseAsset, readAsset, serializeAsset, byteDigest, semanticDigest, assetComments, TOOL_ROOT } from './structured-assets.mjs';
import { planAssetWrite, applyAssetWrite, assertAssetTransactionIdle } from './asset-transactions.mjs';

export function identifyAsset(value) {
  if (value.stage_decision_id) return 'stage-decision-package';
  if (value.domain_strategy_id) return 'domain-strategy';
  if (value.task_id && value.contract && value.execution_state) return 'task-package';
  if (value.gate_id && value.decision || value.kind === 'review-bundle') return 'approval-record';
  if (value.repository_mode && value.stage && value.gates) return 'checkpoint';
  return null;
}
const immutable = key => ['verification', 'result', 'source', 'captures', 'history', 'git_checkpoint'].includes(key);
function refs(value, out = new Set(), key = '') {
  if (immutable(key)) return out;
  if (typeof value === 'string' && /(?:^ref$|_ref$|_refs$|^inputs$)/.test(key) && /\.(yaml|json)$/.test(value)) out.add(value);
  else if (Array.isArray(value)) value.forEach(v => refs(v, out, key));
  else if (value && typeof value === 'object') for (const [name, child] of Object.entries(value)) refs(child, out, name);
  return out;
}
function replaceRefs(value, mapping, key = '') {
  if (immutable(key)) return structuredClone(value);
  if (typeof value === 'string' && /(?:^ref$|_ref$|_refs$|^inputs$)/.test(key)) return mapping[value] || value;
  if (Array.isArray(value)) return value.map(v => replaceRefs(v, mapping, key));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name, child]) => [name, replaceRefs(child, mapping, name)]));
  return value;
}

/** Produces reviewable candidates, never approval or a second live checkpoint. */
export function planAssetMigration(root, checkpointRef, { schemaRoot = TOOL_ROOT } = {}) {
  root = fs.realpathSync(root); assertAssetTransactionIdle(root);
  const queue = [checkpointRef], sources = {}, candidates = [], blockers = [], currentJson = [];
  while (queue.length) {
    const ref = queue.shift(); if (Object.hasOwn(sources, ref)) continue;
    const file = safeFile(root, ref);
    if (!fs.existsSync(file)) { blockers.push({ code: 'missing-reference', ref }); continue; }
    const bytes = fs.readFileSync(file), value = parseAsset(bytes, ref), kind = identifyAsset(value);
    if (!kind) continue; // Original user messages and other evidence keep their format and bytes.
    sources[ref] = byteDigest(bytes);
    // Completed execution packages and old reviews remain immutable evidence.
    if (kind === 'task-package' && ['resolved', 'failed'].includes(value.workflow_status)) continue;
    readAsset(file, kind, { schemaRoot });
    queue.push(...refs(value));
    if (ref.endsWith('.json')) { currentJson.push({ref,value,kind,bytes}); continue; }
    const target = ref.replace(/\.yaml$/, '.json');
    if (fs.existsSync(safeFile(root, target))) { blockers.push({ code: 'target-exists', ref: target }); continue; }
    const comments = assetComments(bytes);
    if (comments.length) blockers.push({ code: 'comment-review-required', ref, comments });
    candidates.push({ source_ref: ref, ref: target, kind, source_digest: byteDigest(bytes), source_semantic_digest: semanticDigest(value), value });
  }
  const mapping = Object.fromEntries(candidates.map(c => [c.source_ref, c.ref]));
  for (const item of currentJson) if (semanticDigest(item.value) !== semanticDigest(replaceRefs(item.value, mapping))) {
    if (item.kind === 'approval-record') blockers.push({code:'current-json-reference-rebind-required',ref:item.ref,reason:'Issue a new approval record; an existing approval is immutable.'});
    else candidates.push({source_ref:item.ref,ref:item.ref,kind:item.kind,source_digest:byteDigest(item.bytes),source_semantic_digest:semanticDigest(item.value),value:item.value});
  }
  for (const c of candidates) {
    c.value = replaceRefs(c.value, mapping);
    if (c.kind === 'approval-record' || ['domain-strategy', 'stage-decision-package'].includes(c.kind) && c.value.status === 'approved') {
      blockers.push({ code: 'approval-rebind-required', ref: c.ref, reason: 'Candidate bytes do not inherit the source approval; issue independent current evidence.' });
    }
  }
  // Updating digests is mechanical only for direct current bindings, not historical proof.
  const byTarget = new Map(candidates.map(c => [c.ref, c]));
  const ordered = candidates.sort((a,b) => ['domain-strategy','approval-record','stage-decision-package','task-package','checkpoint'].indexOf(a.kind) - ['domain-strategy','approval-record','stage-decision-package','task-package','checkpoint'].indexOf(b.kind));
  function bind(value, key = '') {
    if (!value || typeof value !== 'object' || immutable(key)) return;
    if (value.domain_strategy_ref && byTarget.has(value.domain_strategy_ref.persisted_ref)) value.domain_strategy_ref.digest = semanticDigest(byTarget.get(value.domain_strategy_ref.persisted_ref).value);
    if (typeof value.ref === 'string' && typeof value.digest === 'string' && byTarget.has(value.ref)) value.digest = byteDigest(serializeAsset(byTarget.get(value.ref).value));
    for (const [name, child] of Object.entries(value)) bind(child, name);
  }
  for (const c of ordered) bind(c.value);
  const payload = { schema_version: 1, kind: 'asset-migration-plan', root, checkpoint_ref: checkpointRef, sources, candidates: ordered, blockers, history_policy: 'preserve-original-bytes', execution_authorization: 'not-granted' };
  return { ...payload, plan_id: byteDigest(serializeAsset(payload)).slice(7) };
}

/** Resolutions carry reviewed candidate objects and evidence; they do not bypass semantic validators. */
export function prepareAssetMigrationWrite(root, plan, resolutions, options = {}) {
  const { plan_id, ...payload } = plan;
  if (fs.realpathSync(root) !== plan.root || plan.kind !== 'asset-migration-plan' || plan_id !== byteDigest(serializeAsset(payload)).slice(7)) throw new Error('ASSET_MIGRATION_PLAN_INVALID');
  for (const [ref, digest] of Object.entries(plan.sources)) if (byteDigest(fs.readFileSync(safeFile(root, ref))) !== digest) throw new Error(`ASSET_MIGRATION_DRIFT: ${ref}`);
  if (plan.blockers.some(b => ['missing-reference', 'target-exists', 'current-json-reference-rebind-required'].includes(b.code))) throw new Error('ASSET_MIGRATION_BLOCKED: rebuild the plan after resolving missing/conflicting inputs');
  if (plan.blockers.length && (!resolutions || resolutions.plan_id !== plan_id)) throw new Error('ASSET_MIGRATION_REVIEW_REQUIRED');
  for (const b of plan.blockers) {
    const resolution = resolutions.items?.find(r => r.ref === b.ref && r.code === b.code);
    if (!resolution?.evidence_ref || !resolution.evidence_digest || byteDigest(fs.readFileSync(safeFile(root, resolution.evidence_ref))) !== resolution.evidence_digest) throw new Error(`ASSET_MIGRATION_EVIDENCE_REQUIRED: ${b.ref}`);
  }
  const replacements = resolutions?.candidates || [];
  for (const replacement of replacements) if (!plan.candidates.some(c => c.ref === replacement.ref && c.kind === replacement.kind)) throw new Error('ASSET_MIGRATION_SCOPE_CHANGED');
  const specs = plan.candidates.map(c => replacements.find(r => r.ref === c.ref) || c);
  const migration={plan_id:plan.plan_id,sources:plan.sources,source_to_target:Object.fromEntries(plan.candidates.filter(c=>c.source_ref!==c.ref).map(c=>[c.source_ref,c.ref]))};
  return planAssetWrite(root, specs, {...options,migration});
}

export function applyAssetMigration(root, plan, resolutions, options = {}) {
  const writePlan = prepareAssetMigrationWrite(root, plan, resolutions, options);
  const result = applyAssetWrite(root, writePlan, options);
  const updated = new Set(writePlan.changes.filter(c => Object.hasOwn(plan.sources,c.ref)).map(c => c.ref));
  return { ...result, migration_plan_id: plan.plan_id, preserved_sources: Object.keys(plan.sources).filter(ref => !updated.has(ref)), rebound_json_sources: [...updated] };
}
