import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync, statSync, openSync, closeSync } from 'node:fs';
import path from 'node:path';
import { parseDocument, stringify } from '../vendor/yaml.mjs';
import { TRACKER_REF, STAGE_WORK_UNITS, sha256, safeTrackingPath, readTracking, parseYaml, trackerConfig, isDesign, binding, assertStageTracking, refreshTracking } from './stage-tracking.mjs';

const descriptor = (root, ref) => { const p = safeTrackingPath(root, ref); return existsSync(p) ? { digest: sha256(readFileSync(p)), mode: statSync(p).mode & 0o777 } : null; };
const json = x => `${JSON.stringify(x, null, 2)}\n`;
function featureFrom(ref) {
  const match = /^docs\/\.scratch\/([a-z0-9][a-z0-9-]*)\/[^/]+\.(yaml|json)$/.exec(ref);
  if (!match) throw new Error('tracking-checkpoint-path-invalid');
  return match[1];
}
function identity(root) {
  const value = parseYaml(readTracking(root, 'yss-project.yaml'));
  if (value?.schema_version !== 1 || value.repository_mode !== 'project-instance') throw new Error('stage-tracking-project-instance-required');
}
function enabledTracker(bytes) {
  const match = bytes.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('tracking-tracker-frontmatter-required');
  const doc = parseDocument(match[1], { uniqueKeys: true });
  doc.setIn(['tracker', 'lifecycle_tracking_version'], 1);
  return `---\n${doc.toString()}---${bytes.slice(match[0].length)}`;
}
function definition(item, checkpointRef) {
  const fields = { kind: item.kind, id: item.id, checkpoint_ref: checkpointRef };
  return `---\n${stringify(fields)}---\n# ${item.title}\n\n负责人：${item.owner}\n\n${item.scope}\n\n## 验收\n\n${item.acceptance.map(x => `- ${x}`).join('\n')}\n\n当前进度、依赖与完成证据以 ${checkpointRef} 中的 ${item.id} 为准。\n`;
}
export function checkTracking(root, checkpointRef) {
  identity(root);
  const feature = featureFrom(checkpointRef);
  const config = trackerConfig(root);
  if (!existsSync(safeTrackingPath(root, checkpointRef))) return { status: 'missing-checkpoint', feature_id: feature, enabled: config.lifecycle_tracking_version === 1 };
  const checkpoint = parseYaml(readTracking(root, checkpointRef));
  try {
    const result = assertStageTracking(checkpoint, { root, checkpointRef });
    return { ...result, feature_id: checkpoint.feature_id || feature, enabled: config.lifecycle_tracking_version === 1, migration_required: !checkpoint.stage_tracking };
  } catch (error) { return { status: 'blocked', feature_id: feature, enabled: config.lifecycle_tracking_version === 1, error: error.message, migration_required: !checkpoint.stage_tracking }; }
}
export function planTracking(root, { checkpoint_ref, items = [], refresh = false } = {}) {
  root = path.resolve(root); identity(root);
  const feature = featureFrom(checkpoint_ref);
  trackerConfig(root);
  const changes = [], observed = {}, gaps = [];
  function watch(ref) { observed[ref] = descriptor(root, ref); }
  function change(ref, after) {
    watch(ref);
    if (!observed[ref] || sha256(after) !== observed[ref].digest) changes.push({ ref, before: observed[ref], after, after_digest: sha256(after) });
  }
  for (const ref of ['yss-project.yaml', 'CONTEXT.md', TRACKER_REF, '.template-spec/process/lifecycle-registry.yaml', '.template-spec/process/schemas/stage-tracking.schema.json', '.template-spec/process/harness-profile.yaml', checkpoint_ref]) watch(ref);
  const exists = observed[checkpoint_ref] !== null;
  let checkpoint;
  if (exists) checkpoint = parseYaml(readTracking(root, checkpoint_ref));
  else {
    const template = '.template-spec/process/templates/lifecycle-checkpoint-template.yaml'; watch(template);
    checkpoint = parseYaml(readTracking(root, template));
    checkpoint.feature_id = feature;
    checkpoint.mode = 'orchestrate'; checkpoint.status = 'running';
    checkpoint.stage = items[0]?.stage || 'stage.plan';
    checkpoint.next_work_unit = items[0]?.work_unit || 'work-unit.plan-requirements';
  }
  checkpoint.feature_id ??= feature;
  const design = isDesign(root);
  checkpoint.stage_tracking ??= { schema_version: 1, feature_id: checkpoint.feature_id, checkpoint_ref, entry_stage: checkpoint.stage,
    entry: { kind: design ? 'checkpoint' : 'parent-ticket', ref: design ? checkpoint_ref : `docs/.scratch/${feature}/parent-ticket.md` }, items: [] };
  if (refresh) checkpoint = refreshTracking(root, checkpoint).checkpoint;
  const tracking = checkpoint.stage_tracking;
  const ids = new Set(tracking.items.map(x => x.id));
  for (const seed of items) {
    if (ids.has(seed.id)) {
      // Resume never overwrites a live item with an older task definition.
      const existing = tracking.items.find(x => x.id === seed.id);
      for (const key of ['title', 'owner', 'scope', 'stage', 'work_unit', 'acceptance', 'dependencies', 'split_reasons']) if (JSON.stringify(seed[key] ?? existing[key]) !== JSON.stringify(existing[key])) throw new Error(`tracking-existing-item-conflict: ${seed.id}.${key}`);
      continue;
    }
    if (seed.progress && seed.progress !== 'pending') throw new Error('tracking-migration-cannot-infer-completion');
    const item = { id: seed.id, kind: 'stage-work-item', title: seed.title, stage: seed.stage, work_unit: seed.work_unit, owner: seed.owner, scope: seed.scope,
      acceptance: seed.acceptance, dependencies: seed.dependencies || [], source_refs: (seed.source_refs || []).map(ref => binding(root, typeof ref === 'string' ? ref : ref.ref)),
      progress: 'pending', split_reasons: seed.split_reasons || [], completion: [] };
    if (seed.deferred) { item.deferred = seed.deferred; if (!item.split_reasons.includes('cross-stage-deferral')) item.split_reasons.push('cross-stage-deferral'); }
    tracking.items.push(item); ids.add(item.id);
  }
  for (const item of tracking.items) {
    if (tracking.items.some(other => other.dependencies.includes(item.id)) && !item.split_reasons.includes('blocks-other-work')) item.split_reasons.push('blocks-other-work');
    if (tracking.items[0]?.owner && item.owner !== tracking.items[0].owner && !item.split_reasons.includes('different-owner')) item.split_reasons.push('different-owner');
  }
  if (!tracking.items.length) gaps.push('需要明确当前阶段工作项及负责人、范围和验收条件；不从历史文件推断完成');
  if (!tracking.items.some(i => i.stage === checkpoint.stage) && ['stage.plan', 'stage.spec-architecture', 'stage.product-design'].includes(checkpoint.stage)) gaps.push('当前阶段缺少工作项');
  for (const item of tracking.items) {
    for (const key of ['id', 'title', 'owner', 'scope', 'stage', 'work_unit']) if (typeof item[key] !== 'string' || !item[key].trim()) gaps.push(`${item.id || '?'} 缺少 ${key}`);
    if (!item.acceptance?.length) gaps.push(`${item.id || '?'} 缺少验收条件`);
    for (const source of [...item.source_refs, ...item.completion.flatMap(x => x.evidence_refs)]) watch(source.ref);
    if (item.deferred) watch(item.deferred.decision_ref);
    if (item.split_reasons?.length && !gaps.length) {
      const ref = `docs/.scratch/${feature}/work-items/${item.id}.md`;
      if (!item.definition_ref) {
        if (descriptor(root, ref)) throw new Error(`tracking-unowned-file-conflict: ${ref}`);
        item.definition_ref = ref;
        const content = definition(item, checkpoint_ref);
        item.definition_digest = sha256(content); change(ref, content);
      } else watch(item.definition_ref);
    }
  }
  const entryRef = tracking.entry.ref;
  if (!design) {
    watch(entryRef);
    const link = `\n阶段工作进度与证据：${checkpoint_ref}\n`;
    if (!observed[entryRef]) change(entryRef, `# ${feature}\n\nStatus: needs-triage\n${link}${trackerConfig(root).platform !== 'local-markdown' ? `\npublication: pending\npending_publication_to: ${trackerConfig(root).platform}\n` : ''}`);
    else if (!readTracking(root, entryRef).includes(checkpoint_ref)) change(entryRef, readTracking(root, entryRef) + link);
  }
  const mapRef = `docs/.scratch/${feature}/map.md`; watch(mapRef);
  if (!observed[mapRef]) change(mapRef, `---\ncheckpoint_ref: ${checkpoint_ref}\n---\n# ${feature}\n\n阶段工作与证据见 ${checkpoint_ref}。\n`);
  else if (!readTracking(root, mapRef).includes(checkpoint_ref)) change(mapRef, readTracking(root, mapRef) + `\n阶段工作与证据：${checkpoint_ref}\n`);
  change(checkpoint_ref, checkpoint_ref.endsWith('.json') ? json(checkpoint) : stringify(checkpoint));
  change(TRACKER_REF, enabledTracker(readTracking(root, TRACKER_REF)));
  const input = { checkpoint_ref, items, refresh };
  const payload = { schema_version: 1, root, input, gaps, observed, changes };
  return { ...payload, plan_id: sha256(JSON.stringify(payload)).slice(7) };
}
export function applyTracking(root, plan, { afterWrite } = {}) {
  root = path.resolve(root); identity(root);
  if (plan.root !== root || plan.schema_version !== 1 || !/^[a-f0-9]{64}$/.test(plan.plan_id)) throw new Error('tracking-plan-identity-invalid');
  const { plan_id, ...payload } = plan;
  if (sha256(JSON.stringify(payload)).slice(7) !== plan_id) throw new Error('tracking-plan-digest-mismatch');
  const feature = featureFrom(plan.input.checkpoint_ref);
  const transactionRef = `docs/.scratch/${feature}/verification/stage-tracking-migrations/${plan_id}`;
  const receiptRef = `${transactionRef}/receipt.json`;
  if (existsSync(safeTrackingPath(root, receiptRef))) {
    const receipt = JSON.parse(readTracking(root, receiptRef));
    if (receipt.plan_id !== plan_id) throw new Error('tracking-receipt-conflict');
    return { status: 'unchanged', plan_id, receipt_ref: receiptRef };
  }
  if (plan.gaps.length) throw new Error(`tracking-migration-needs-info: ${plan.gaps.join('; ')}`);
  const fresh = planTracking(root, plan.input);
  if (JSON.stringify(fresh) !== JSON.stringify(plan)) throw new Error('tracking-plan-stale');
  if (!plan.changes.length) return { status: 'unchanged', plan_id };
  const transactionPath = safeTrackingPath(root, transactionRef);
  if (existsSync(transactionPath)) throw new Error(`tracking-transaction-needs-recovery: ${transactionRef}`);
  mkdirSync(transactionPath, { recursive: true });
  const backups = plan.changes.map(c => ({ ref: c.ref, before: c.before, bytes: c.before ? readFileSync(safeTrackingPath(root, c.ref)).toString('base64') : null }));
  writeFileSync(path.join(transactionPath, 'backup.json'), json(backups), { flag: 'wx' });
  writeFileSync(path.join(transactionPath, 'plan.json'), json(plan), { flag: 'wx' });
  const written = [], temporary = new Set();
  try {
    for (const [ref, before] of Object.entries(plan.observed)) if (JSON.stringify(descriptor(root, ref)) !== JSON.stringify(before)) throw new Error('tracking-concurrent-change');
    for (const change of plan.changes) {
      const file = safeTrackingPath(root, change.ref);
      if (JSON.stringify(descriptor(root, change.ref)) !== JSON.stringify(change.before)) throw new Error('tracking-concurrent-change');
      mkdirSync(path.dirname(file), { recursive: true });
      const temp = `${file}.stage-tracking-${plan_id}`;
      const fd = openSync(temp, 'wx', change.before?.mode || 0o644);
      temporary.add(temp);
      try { writeFileSync(fd, change.after); } finally { closeSync(fd); }
      renameSync(temp, file); temporary.delete(temp); written.push(change);
      afterWrite?.(change, written.length);
    }
    for (const [ref, before] of Object.entries(plan.observed)) {
      const changed = written.find(x => x.ref === ref);
      const actual = descriptor(root, ref);
      if (changed ? actual?.digest !== changed.after_digest : JSON.stringify(actual) !== JSON.stringify(before)) throw new Error('tracking-concurrent-change');
    }
    const cp = parseYaml(readTracking(root, plan.input.checkpoint_ref));
    assertStageTracking(cp, { root, checkpointRef: plan.input.checkpoint_ref });
    writeFileSync(safeTrackingPath(root, receiptRef), json({ plan_id, status: 'applied', changed_refs: written.map(x => x.ref) }), { flag: 'wx' });
    return { status: 'applied', plan_id, receipt_ref: receiptRef, changed_refs: written.map(x => x.ref) };
  } catch (error) {
    const conflicts = [];
    for (const temp of temporary) { try { unlinkSync(temp); } catch (cleanupError) { if (cleanupError.code !== 'ENOENT') conflicts.push(temp); } }
    for (const change of written.reverse()) {
      if (descriptor(root, change.ref)?.digest !== change.after_digest) { conflicts.push(change.ref); continue; }
      const backup = backups.find(x => x.ref === change.ref), file = safeTrackingPath(root, change.ref);
      if (backup.bytes === null) unlinkSync(file); else writeFileSync(file, Buffer.from(backup.bytes, 'base64'), { mode: backup.before.mode });
    }
    writeFileSync(path.join(transactionPath, 'failure.json'), json({ error: error.message, recovery_conflicts: conflicts }));
    throw new Error(`${error.message}; tracking-rollback-${conflicts.length ? `conflict:${conflicts.join(',')}` : 'complete'}`);
  }
}
