import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseDocument } from '../vendor/yaml.mjs';
import { loadRegistry } from './lifecycle-registry.mjs';
import { readWorkLayout, TRACKER_REF } from './work-layout.mjs';

export const MIGRATION_KIND = 'strategic-gate-migration-plan-v1';
export const MIGRATION_REQUIRED = 'STRATEGIC_GATE_MIGRATION_REQUIRED';

export const OLD_TO_CURRENT = Object.freeze({
  'gate.repository-identity-valid': 'check.repository-identity-valid',
  'gate.domain-strategy-approved': 'check.domain-strategy-approved',
  'gate.stage-decision-package-approved': 'check.stage-decision-package-approved',
  'gate.prototype-reviewed': 'check.prototype-reviewed',
  'gate.prototype-verified': 'check.prototype-verified',
  'gate.user-confirmation': 'gate.product-design-approved'
});

const AGGREGATE_GATES = ['gate.plan-approved', 'gate.spec-baseline-approved', 'gate.product-design-approved'];
const HANDOFF_GATE = 'gate.strategic-design-handoff-approved';
const EXTENSIONS = new Set(['.json', '.yaml', '.yml']);
const fail = message => { throw new TypeError(message); };
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const render = value => `${JSON.stringify(canonical(value), null, 2)}\n`;

function parse(bytes, ref) {
  const document = parseDocument(String(bytes), { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length) fail(`无法解析 ${ref}: ${document.errors[0].message}`);
  const value = document.toJS({ maxAliasCount: 0 });
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`迁移输入必须是对象: ${ref}`);
  return value;
}

function walk(root, relative = '') {
  const base = path.join(root, relative);
  if (!existsSync(base)) return [];
  return readdirSync(base).sort().flatMap(name => {
    const ref = path.posix.join(relative.split(path.sep).join('/'), name);
    const full = path.join(root, ref);
    const stat = lstatSync(full);
    if (stat.isSymbolicLink()) fail(`活动迁移范围禁止 symlink: ${ref}`);
    if (stat.isDirectory()) return walk(root, ref);
    return stat.isFile() ? [ref] : [];
  });
}

const clone = value => structuredClone(value);
const refsFrom = value => [...new Set([
  ...(Array.isArray(value?.evidence_refs) ? value.evidence_refs : []),
  value?.approval_ref,
  value?.subject_ref
].filter(item => typeof item === 'string' && item.trim()))];

function migratedCheck(oldId, newId, oldState = {}) {
  const evidenceRefs = refsFrom(oldState);
  const passed = ['approved', 'passed'].includes(oldState.status);
  return {
    ...clone(oldState),
    status: passed ? 'passed' : oldState.status === 'not-applicable' ? 'not-applicable' : 'pending',
    applicable: oldState.status === 'not-applicable' ? false : true,
    evidence_refs: evidenceRefs,
    historical_gate_id: oldId,
    historical_approval_ref: oldState.approval_ref,
    migration_note: `${oldId} 已转换为 ${newId}；原记录仅作为历史证据。`
  };
}

function pendingGate(existing, reason) {
  return {
    ...(existing && typeof existing === 'object' ? clone(existing) : {}),
    status: 'ready-for-human',
    reason,
    approval_ref: null,
    user_decision_ref: null,
    historical_approval_ref: existing?.approval_ref || null
  };
}

function transformCheckpoint(value, deprecated, active, blockers, reapproval) {
  if (value.repository_mode !== 'project-instance' || !value.gates || typeof value.gates !== 'object' || Array.isArray(value.gates)) return false;
  value.checks ||= {};
  let changed = false;
  for (const [gateId, state] of Object.entries(clone(value.gates))) {
    if (active.has(gateId)) continue;
    if (!deprecated.has(gateId)) {
      blockers.push(`未知 gate: ${gateId}`);
      continue;
    }
    const mapped = OLD_TO_CURRENT[gateId];
    if (mapped?.startsWith('check.')) {
      if (value.checks[mapped]) blockers.push(`重复迁移目标: ${mapped}`);
      else value.checks[mapped] = migratedCheck(gateId, mapped, state);
      delete value.gates[gateId];
      changed = true;
    } else if (mapped === 'gate.product-design-approved') {
      if (value.gates[mapped]) blockers.push(`重复迁移目标: ${mapped}`);
      else if (state?.status === 'not-applicable' && state?.reason?.trim() && refsFrom(state).length) value.gates[mapped] = { ...clone(state), status: 'not-applicable' };
      else value.gates[mapped] = pendingGate(state, '迁移后须针对当前产品设计资产重新确认');
      delete value.gates[gateId];
      if (value.gates[mapped].status !== 'not-applicable') reapproval.add(mapped);
      changed = true;
    } else {
      blockers.push(`已退役 gate 无安全映射: ${gateId}`);
    }
  }
  for (const gateId of AGGREGATE_GATES) {
    const existing = value.gates[gateId];
    const productNotApplicable = gateId === 'gate.product-design-approved' && existing?.status === 'not-applicable' && existing?.reason?.trim() && refsFrom(existing).length;
    if (productNotApplicable) continue;
    value.gates[gateId] = pendingGate(existing, '战略门禁聚合迁移后须绑定当前资产重新确认');
    reapproval.add(gateId);
    changed = true;
  }
  if (value.gates[HANDOFF_GATE]) {
    value.gates[HANDOFF_GATE] = { ...clone(value.gates[HANDOFF_GATE]), status: 'stale', reason: '上游聚合门禁迁移后须重新 finalize', approval_ref: null };
  } else value.gates[HANDOFF_GATE] = { status: 'stale', reason: '上游聚合门禁迁移后须重新 finalize' };
  value.blockers = [...new Set([...(value.blockers || []), 'STRATEGIC_GATE_MIGRATION_REAPPROVAL_REQUIRED'])];
  value.strategic_gate_migration = { schema_version: 1, status: 'reapproval-required', deprecated_approvals: 'historical-only' };
  return true;
}

function transformPlanReview(value, blockers, reapproval) {
  if (value.kind !== 'plan-entry-review') return false;
  let changed = false;
  value.gate_id = 'gate.plan-approved';
  value.internal_checks ||= {};
  for (const [oldId, newId] of Object.entries(OLD_TO_CURRENT)) {
    if (!newId.startsWith('check.')) continue;
    const oldState = value.gates?.[oldId] || value.internal_checks?.[oldId];
    if (!oldState) continue;
    if (value.internal_checks[newId]) blockers.push(`重复迁移目标: ${newId}`);
    else value.internal_checks[newId] = migratedCheck(oldId, newId, oldState);
    if (value.gates) delete value.gates[oldId];
    delete value.internal_checks[oldId];
    changed = true;
  }
  if (value.gates && Object.keys(value.gates).length === 0) delete value.gates;
  value.approval = { status: 'ready-for-human', boundary: 'gate.plan-approved', reason: '迁移后须重新确认当前 Plan 审阅包' };
  reapproval.add('gate.plan-approved');
  return true || changed;
}

function isApproval(value) {
  return value.schema_version === 1 && typeof value.gate_id === 'string' && typeof value.decision === 'string' && typeof value.actor_kind === 'string';
}

export function inspectStrategicGateMigration({ root, feature } = {}) {
  const projectRoot = path.resolve(root || '.');
  const registry = loadRegistry();
  const deprecated = new Set(registry.id_policy.deprecated_ids);
  const active = new Set(registry.gates.map(item => item.id));
  const layout = readWorkLayout(projectRoot);
  const base = feature ? layout.featureRoot(feature) : layout.root;
  const refs = [TRACKER_REF, ...walk(projectRoot, base)];
  const inputs = [], operations = [], historical = [], blockers = [], reapproval = new Set();
  for (const ref of refs) {
    const bytes = readFileSync(path.join(projectRoot, ref));
    inputs.push({ ref, digest: sha256(bytes) });
    if (!EXTENSIONS.has(path.extname(ref))) continue;
    const value = parse(bytes, ref);
    if (isApproval(value) && deprecated.has(value.gate_id)) {
      historical.push({ ref, gate_id: value.gate_id, disposition: 'historical-only' });
      continue;
    }
    const next = clone(value);
    const localBlockers = [];
    const changed = transformCheckpoint(next, deprecated, active, localBlockers, reapproval) || transformPlanReview(next, localBlockers, reapproval);
    blockers.push(...localBlockers.map(message => `${ref}: ${message}`));
    if (changed) {
      const output = Buffer.from(render(next));
      if (!bytes.equals(output)) operations.push({ ref, input_digest: sha256(bytes), output_digest: sha256(output), output: output.toString('base64') });
    }
  }
  return {
    schema_version: 1,
    kind: MIGRATION_KIND,
    root: projectRoot,
    feature: feature || null,
    generated_at: new Date().toISOString(),
    inputs,
    mappings: OLD_TO_CURRENT,
    historical_evidence: historical,
    reapproval_required: [...reapproval].sort(),
    blockers: [...new Set(blockers)].sort(),
    operations
  };
}

export function applyStrategicGateMigration(plan, { root } = {}) {
  if (plan?.schema_version !== 1 || plan?.kind !== MIGRATION_KIND) fail('迁移计划身份无效');
  const projectRoot = path.resolve(root || plan.root || '.');
  if (path.resolve(plan.root) !== projectRoot) fail('迁移计划 root 与目标不一致');
  if (plan.blockers?.length) fail(`迁移计划存在阻塞: ${plan.blockers.join('; ')}`);
  const operations = plan.operations || [];
  const alreadyApplied = operations.length > 0 && operations.every(op => existsSync(path.join(projectRoot, op.ref)) && sha256(readFileSync(path.join(projectRoot, op.ref))) === op.output_digest);
  if (alreadyApplied) return { result: 'already-applied', files: operations.map(op => op.ref) };
  for (const input of plan.inputs || []) {
    const file = path.join(projectRoot, input.ref);
    if (!existsSync(file) || sha256(readFileSync(file)) !== input.digest) fail(`输入摘要漂移: ${input.ref}`);
  }
  for (const op of operations) if (sha256(Buffer.from(op.output, 'base64')) !== op.output_digest) fail(`计划输出摘要无效: ${op.ref}`);
  const staged = [], backups = [];
  try {
    for (const op of operations) {
      const target = path.join(projectRoot, op.ref);
      mkdirSync(path.dirname(target), { recursive: true });
      const temp = `${target}.strategic-gate-migration.tmp`;
      writeFileSync(temp, Buffer.from(op.output, 'base64'), { flag: 'wx' });
      staged.push(temp);
    }
    for (let i = 0; i < operations.length; i++) {
      const target = path.join(projectRoot, operations[i].ref);
      const backup = `${target}.strategic-gate-migration.bak`;
      renameSync(target, backup); backups.push([target, backup]);
      renameSync(staged[i], target);
    }
    for (const [, backup] of backups) rmSync(backup, { force: true });
  } catch (error) {
    for (const temp of staged) rmSync(temp, { force: true });
    for (const [target, backup] of backups.reverse()) {
      rmSync(target, { force: true });
      if (existsSync(backup)) renameSync(backup, target);
    }
    throw error;
  }
  return { result: 'applied', files: operations.map(op => op.ref) };
}

export function findStrategicGateMigrationIssues({ root, feature } = {}) {
  const projectRoot = path.resolve(root || '.');
  const deprecated = new Set(loadRegistry().id_policy.deprecated_ids);
  const layout = readWorkLayout(projectRoot);
  const base = feature ? layout.featureRoot(feature) : layout.root;
  const issues = [];
  for (const ref of walk(projectRoot, base)) {
    if (!EXTENSIONS.has(path.extname(ref))) continue;
    const value = parse(readFileSync(path.join(projectRoot, ref)), ref);
    if (isApproval(value)) continue;
    const visit = (node, at = '') => {
      if (Array.isArray(node)) return node.forEach((item, index) => visit(item, `${at}[${index}]`));
      if (!node || typeof node !== 'object') return;
      for (const [key, item] of Object.entries(node)) {
        const location = at ? `${at}.${key}` : key;
        if ((key === 'gate_id' || key.startsWith('gate.')) && typeof item === 'string' && deprecated.has(item)) issues.push({ ref, location, gate_id: item });
        if ((at.endsWith('gates') || key === 'gates') && deprecated.has(key)) issues.push({ ref, location, gate_id: key });
        visit(item, location);
      }
    };
    visit(value);
  }
  return issues;
}
