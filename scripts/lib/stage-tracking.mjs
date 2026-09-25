import { readFileSync, existsSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseDocument } from '../vendor/yaml.mjs';
import { validateJsonSchema } from './json-schema.mjs';

export const TRACKER_REF = '.template-spec/agents/issue-tracker.md';
export const STAGE_WORK_UNITS = Object.freeze({
  'work-unit.plan-opportunity': 'stage.plan',
  'work-unit.plan-requirements': 'stage.plan',
  'work-unit.domain-strategy-design': 'stage.plan',
  'work-unit.stage-decision': 'stage.plan',
  'work-unit.spec-synthesis': 'stage.spec-architecture',
  'work-unit.prototype-design': 'stage.product-design',
});
export const sha256 = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
export function parseYaml(bytes) {
  const doc = parseDocument(String(bytes), { uniqueKeys: true });
  if (doc.errors.length) throw new Error(doc.errors[0].message);
  return doc.toJS({ maxAliasCount: 0 });
}
export function safeTrackingPath(root, ref) {
  if (typeof ref !== 'string' || !ref || path.isAbsolute(ref) || ref.includes('\\') || ref.split('/').some(p => !p || p === '.' || p === '..')) throw new Error(`tracking-path-invalid: ${ref}`);
  const base = realpathSync(root);
  let file = base;
  for (const part of ref.split('/')) {
    file = path.join(file, part);
    if (existsSync(file) || (() => { try { lstatSync(file); return true; } catch { return false; } })()) {
      if (lstatSync(file).isSymbolicLink()) throw new Error(`tracking-symlink-forbidden: ${ref}`);
    }
  }
  return file;
}
export const readTracking = (root, ref) => readFileSync(safeTrackingPath(root, ref), 'utf8');
export const binding = (root, ref) => ({ ref, digest: sha256(readTracking(root, ref)) });
export function trackerConfig(root) {
  const bytes = readTracking(root, TRACKER_REF);
  const match = bytes.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error('tracking-tracker-frontmatter-required');
  const config = parseYaml(match[1])?.tracker;
  if (!config || !['local-markdown', 'github', 'gitlab'].includes(config.platform)) throw new Error('tracking-tracker-invalid');
  if (config.lifecycle_tracking_version !== undefined && config.lifecycle_tracking_version !== 1) throw new Error('tracking-version-unsupported');
  return config;
}
export function trackingProfile(root) {
  const ref = '.template-spec/process/harness-profile.yaml';
  return existsSync(safeTrackingPath(root, ref)) ? parseYaml(readTracking(root, ref)) : null;
}
export const isDesign = root => trackingProfile(root)?.profile_id === 'harness.business-ddd-strategy-handoff';
function current(root, value) {
  try { return binding(root, value.ref).digest === value.digest; } catch { return false; }
}
export function trackingDrift(root, tracking) {
  const changed = new Set(tracking.items.filter(item => [...item.source_refs, ...item.completion.flatMap(c => c.evidence_refs)].some(b => !current(root, b))).map(item => item.id));
  let size;
  do {
    size = changed.size;
    for (const item of tracking.items) if (item.dependencies.some(id => changed.has(id))) changed.add(item.id);
  } while (size !== changed.size);
  return [...changed];
}
export function refreshTracking(root, checkpoint) {
  const next = structuredClone(checkpoint);
  const changed = trackingDrift(root, next.stage_tracking);
  for (const item of next.stage_tracking.items) {
    if (changed.includes(item.id) && item.progress !== 'cancelled') {
      item.progress = 'pending';
      item.recheck_required = true;
      // Old bindings and evidence remain historical; only explicit re-verification replaces them.
    }
  }
  return { checkpoint: next, stale_item_ids: changed };
}
export function assertStageTracking(checkpoint, { root, checkpointRef, currentWorkUnit, nextWorkUnit, transition = false, entering = false, now = new Date() } = {}) {
  const identity = parseYaml(readTracking(root, 'yss-project.yaml'));
  if (identity?.schema_version !== 1 || !['template-source', 'project-instance'].includes(identity.repository_mode)) throw new Error('tracking-repository-identity-invalid');
  const config = trackerConfig(root);
  const tracking = checkpoint?.stage_tracking;
  const relevant = STAGE_WORK_UNITS[currentWorkUnit] || STAGE_WORK_UNITS[nextWorkUnit] || ['stage.plan', 'stage.spec-architecture', 'stage.product-design'].includes(checkpoint?.stage);
  if (!tracking) {
    if (identity.repository_mode === 'project-instance' && config.lifecycle_tracking_version === 1 && relevant) throw new Error('stage-tracking-required');
    return { status: 'not-applicable', stale_item_ids: [] };
  }
  validateJsonSchema(tracking, path.join(root, '.template-spec/process/schemas/stage-tracking.schema.json'));
  const feature = checkpoint.feature_id;
  if (feature !== tracking.feature_id || typeof feature !== 'string' || !feature.trim()) throw new Error('tracking-feature-mismatch');
  const location = /^(docs\/\.scratch\/[a-z0-9][a-z0-9-]*\/)[^/]+\.(yaml|json)$/.exec(tracking.checkpoint_ref);
  if (!location) throw new Error('tracking-checkpoint-path-invalid');
  const base = location[1];
  if (!tracking.checkpoint_ref.startsWith(base) || (checkpointRef && tracking.checkpoint_ref !== checkpointRef)) throw new Error('tracking-checkpoint-mismatch');
  safeTrackingPath(root, tracking.checkpoint_ref);
  if (isDesign(root)) {
    if (tracking.entry.kind !== 'checkpoint' || tracking.entry.ref !== tracking.checkpoint_ref) throw new Error('tracking-design-parent-forbidden');
  } else if (tracking.entry.kind !== 'parent-ticket' || tracking.entry.ref !== `${base}parent-ticket.md`) throw new Error('tracking-parent-required');
  const entry = readTracking(root, tracking.entry.ref);
  if (tracking.entry.kind === 'parent-ticket' && !entry.includes(tracking.checkpoint_ref)) throw new Error('tracking-parent-checkpoint-link-required');
  const registry = parseYaml(readTracking(root, '.template-spec/process/lifecycle-registry.yaml'));
  const stages = new Set(registry.stages.map(x => x.id));
  const units = new Set(registry.work_units.map(x => x.id));
  if (!stages.has(tracking.entry_stage)) throw new Error('tracking-entry-stage-invalid');
  const profile = trackingProfile(root);
  const allowed = profile?.lifecycle?.allowed_work_units ?? profile?.allowed_work_units;
  const index = new Map();
  for (const item of tracking.items) {
    if (index.has(item.id)) throw new Error(`tracking-duplicate-id: ${item.id}`);
    index.set(item.id, item);
    if (!stages.has(item.stage) || !units.has(item.work_unit) || STAGE_WORK_UNITS[item.work_unit] !== item.stage) throw new Error(`tracking-stage-work-unit-mismatch: ${item.id}`);
    if (allowed && !allowed.includes(item.work_unit)) throw new Error(`tracking-profile-work-unit-forbidden: ${item.id}`);
    if (item.split_reasons.length && !item.definition_ref) throw new Error(`tracking-independent-item-required: ${item.id}`);
    if (item.definition_ref) {
      if (item.definition_ref !== `${base}work-items/${item.id}.md`) throw new Error('tracking-definition-path-invalid');
      const definition = readTracking(root, item.definition_ref);
      if (!definition.includes(`kind: stage-work-item`) || !definition.includes(`id: ${item.id}\n`) || !definition.includes(tracking.checkpoint_ref) || /ready-for-agent|^Status:|^progress:/m.test(definition)) throw new Error('tracking-definition-invalid');
      if (item.definition_digest !== sha256(definition)) throw new Error('tracking-definition-drift');
    }
    if (item.deferred) {
      if (!item.split_reasons.includes('cross-stage-deferral') || !item.definition_ref) throw new Error('tracking-deferral-independent-item-required');
      if (item.progress === 'completed' || item.progress === 'cancelled') throw new Error('tracking-deferred-not-completed');
      if (!Number.isFinite(Date.parse(item.deferred.resolve_by)) || Date.parse(item.deferred.resolve_by) <= now.getTime()) throw new Error('tracking-deferral-expired');
      readTracking(root, item.deferred.decision_ref);
    }
    if (item.progress === 'cancelled' && !item.cancellation_reason) throw new Error('tracking-cancellation-reason-required');
    if (item.progress === 'completed') {
      if (!item.source_refs.length) throw new Error('tracking-completion-source-required');
      if (item.recheck_required) throw new Error('tracking-recheck-required');
      for (const criterion of item.acceptance) if (!item.completion.some(c => c.criterion === criterion && c.evidence_refs.length)) throw new Error(`tracking-acceptance-evidence-required: ${item.id}`);
      for (const c of item.completion) if (!item.acceptance.includes(c.criterion)) throw new Error('tracking-unknown-acceptance-criterion');
    }
  }
  const visited = new Set(), visiting = new Set();
  function visit(id) {
    if (visiting.has(id)) throw new Error('tracking-dependency-cycle');
    if (visited.has(id)) return;
    const item = index.get(id);
    if (!item) throw new Error(`tracking-dependency-missing: ${id}`);
    visiting.add(id); item.dependencies.forEach(visit); visiting.delete(id); visited.add(id);
  }
  index.forEach((_, id) => visit(id));
  for (const item of tracking.items) {
    if ((item.owner !== tracking.items[0].owner || tracking.items.some(other => other.dependencies.includes(item.id))) && !item.definition_ref) throw new Error(`tracking-independent-item-required: ${item.id}`);

    if (['running', 'completed'].includes(item.progress) && item.dependencies.some(id => index.get(id).progress !== 'completed')) throw new Error(`tracking-dependency-blocked: ${item.id}`);
  }
  const stale = trackingDrift(root, tracking);
  if (stale.some(id => ['running', 'completed'].includes(index.get(id).progress))) throw new Error(`tracking-stale-completion: ${stale.join(',')}`);
  if (entering && STAGE_WORK_UNITS[nextWorkUnit] && !tracking.items.some(i => i.work_unit === nextWorkUnit)) throw new Error('tracking-entry-work-item-required');
  if (transition && STAGE_WORK_UNITS[currentWorkUnit]) {
    const items = tracking.items.filter(i => i.work_unit === currentWorkUnit);
    if (!items.length) throw new Error('tracking-current-work-item-required');
    if (items.some(i => !['completed', 'cancelled'].includes(i.progress) && !i.deferred)) throw new Error('tracking-current-work-incomplete');
    if (STAGE_WORK_UNITS[currentWorkUnit] !== STAGE_WORK_UNITS[nextWorkUnit] && tracking.items.some(i => i.stage === STAGE_WORK_UNITS[currentWorkUnit] && !['completed', 'cancelled'].includes(i.progress) && !i.deferred)) throw new Error('tracking-stage-incomplete');
  }
  return { status: 'valid', stale_item_ids: stale };
}
export function assertTrackingTransition(currentWorkUnit, nextWorkUnit, state, { root } = {}) {
  // Persisted checkpoint is authoritative. Inline WER status cannot replace it.
  if (!STAGE_WORK_UNITS[currentWorkUnit] && !STAGE_WORK_UNITS[nextWorkUnit] && !state?.stage_tracking && !state?.checkpoint_ref) return { status: 'not-applicable', stale_item_ids: [] };
  const repository = parseYaml(readTracking(root, 'yss-project.yaml'));
  if (repository.repository_mode === 'template-source' && !state?.stage_tracking) return { status: 'not-applicable', stale_item_ids: [] };
  if (!state?.checkpoint_ref) {
    const identity = parseYaml(readTracking(root, 'yss-project.yaml'));
    if (state?.stage_tracking || (identity.repository_mode === 'project-instance' && trackerConfig(root).lifecycle_tracking_version === 1 && (STAGE_WORK_UNITS[currentWorkUnit] || STAGE_WORK_UNITS[nextWorkUnit]))) throw new Error('tracking-persisted-checkpoint-ref-required');
    return assertStageTracking(state, { root, currentWorkUnit, nextWorkUnit, transition: true });
  }
  const checkpoint = parseYaml(readTracking(root, state.checkpoint_ref));
  if (state.feature_id && checkpoint.feature_id !== state.feature_id) throw new Error('tracking-feature-mismatch');
  return assertStageTracking(checkpoint, { root, checkpointRef: state.checkpoint_ref, currentWorkUnit, nextWorkUnit, transition: true });
}

export function assertTrackingEntry(workUnit, state, { root } = {}) {
  if (!STAGE_WORK_UNITS[workUnit]) return;
  const repository = parseYaml(readTracking(root, 'yss-project.yaml'));
  if (repository.repository_mode === 'template-source') return;
  const enabled = trackerConfig(root).lifecycle_tracking_version === 1;
  if (!state?.checkpoint_ref) {
    if (enabled) throw new Error('tracking-entry-checkpoint-required');
    return;
  }
  const checkpoint = parseYaml(readTracking(root, state.checkpoint_ref));
  assertStageTracking(checkpoint, { root, checkpointRef: state.checkpoint_ref, nextWorkUnit: workUnit, entering: true });
  const items = checkpoint.stage_tracking?.items.filter(i => i.work_unit === workUnit) || [];
  const stale = new Set(checkpoint.stage_tracking ? trackingDrift(root, checkpoint.stage_tracking) : []);
  if (items.length && !items.some(i => !['blocked', 'cancelled'].includes(i.progress) && !i.deferred && !i.recheck_required && !stale.has(i.id) && i.dependencies.every(id => checkpoint.stage_tracking.items.find(d => d.id === id)?.progress === 'completed'))) throw new Error('tracking-entry-no-runnable-work');
}
