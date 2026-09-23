import { chmodSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import identity from './identity.json' with { type: 'json' };
import { hash, safe } from './runtime.mjs';

const RECEIPT = '.yss-plugin.json';
const json = value => JSON.stringify(value, null, 2) + '\n';
function snapshot(root, prefix = '') {
  return readdirSync(prefix ? safe(root, prefix) : root).sort().flatMap(name => {
    if (name === '.git') return [];
    const ref = prefix ? `${prefix}/${name}` : name, file = safe(root, ref), stat = lstatSync(file);
    if (stat.isDirectory()) return snapshot(root, ref);
    if (!stat.isFile()) throw new Error(`unsupported-migration-file: ${ref}`);
    return [{ ref, sha256: hash(readFileSync(file)), mode: stat.mode & 0o777 }];
  });
}
function current(root, ref) {
  if (!existsSync(path.join(root, ref))) return null;
  const file = safe(root, ref), stat = lstatSync(file);
  if (!stat.isFile()) throw new Error(`migration-path-conflict: ${ref}`);
  return { sha256: hash(readFileSync(file)), mode: stat.mode & 0o777 };
}
function prepare(root, target, cli, api) {
  if (existsSync(path.join(target, '.yss-backend-delivery.json'))) throw new Error('completed-project-migration-forbidden: retain old read-only verifier');
  const original = JSON.parse(readFileSync(safe(target, RECEIPT)));
  const legacy = ['legacy-m4.json', 'legacy-0.2.json'].map(ref => JSON.parse(readFileSync(safe(root, `assets/${ref}`))))
    .find(item => item.plugin === original.plugin && item.bundle_digest === original.plugin_bundle_sha256);
  if (!legacy) throw new Error('unsupported-legacy-binding');
  api.withLegacyCli(root, oldCli => {
    if (api.digest(oldCli.pin) !== api.digest(legacy.cli)) throw new Error('unsupported-cli-migration');
    api.projectCheck(root, target, { ...oldCli, binding: legacy.binding, expectedPlugin: legacy.plugin, expectedBundle: legacy.bundle_digest });
  });
  const oldReceipt = JSON.parse(readFileSync(safe(target, RECEIPT)));
  if (oldReceipt.plugin !== legacy.plugin || oldReceipt.plugin_bundle_sha256 !== legacy.bundle_digest) throw new Error('unsupported-legacy-binding');
  const before = snapshot(target);
  const parent = realpathSync(mkdtempSync(path.join(tmpdir(), 'yss-migration-preview-'))), stage = path.join(parent, 'project');
  try {
    cpSync(target, stage, { recursive: true, filter: source => path.basename(source) !== '.git' });
    rmSync(path.join(stage, RECEIPT));
    api.execute(cli.bin, ['sync', '--target-dir', stage], cli.root);
    const oldMetadata = JSON.parse(readFileSync(safe(target, '.yss-template.json')));
    const metadataFile = safe(stage, '.yss-template.json');
    const syncedMetadata = JSON.parse(readFileSync(metadataFile));
    syncedMetadata.lastSyncedAt = oldMetadata.lastSyncedAt;
    writeFileSync(metadataFile, json(syncedMetadata));
    const expected = new Set(cli.binding.map(file => file.ref));
    for (const ref of api.coreFiles(stage)) if (!expected.has(ref)) rmSync(safe(stage, ref));
    api.applyBaseline(stage, cli);
    api.applyOverlay(stage, cli);
    api.projectCheck(root, stage, cli);
    const receipt = { ...oldReceipt, plugin: identity.name, cli: cli.pin, plugin_bundle_sha256: hash(readFileSync(safe(root, 'bundle-lock.json'))),
      core_digest: api.digest(cli.binding), business_execution_ready: false,
      migration: { from_plugin: legacy.plugin, from_bundle_sha256: legacy.bundle_digest, previous_binding_sha256: hash(readFileSync(safe(target, RECEIPT))), requires_current_contract_validation: true } };
    writeFileSync(path.join(stage, RECEIPT), json(receipt), { flag: 'wx' });
    api.projectCheck(root, stage, cli);
    const after = snapshot(stage), old = new Map(before.map(f => [f.ref, f])), updated = new Map(after.map(f => [f.ref, f]));
    const changes = [...new Set([...old.keys(), ...updated.keys()])].sort().flatMap(ref => {
      const a = old.get(ref), b = updated.get(ref);
      return api.digest(a || null) === api.digest(b || null) ? [] : [{ ref, before: a ? { sha256: a.sha256, mode: a.mode } : null,
        after: b ? { sha256: b.sha256, mode: b.mode } : null }];
    });
    const plan = { schema_version: 1, kind: 'plugin-migration', target, from_plugin: legacy.plugin, to_plugin: identity.name,
      source_bundle_sha256: legacy.bundle_digest, target_bundle_sha256: receipt.plugin_bundle_sha256,
      project_guard: api.digest(before), changes, evidence_impact: '规则变化后由本地主控重新核验合同、批准及 checkpoint；不改写原批准。',
      backup_path: `${target}.yss-migration-${receipt.plugin_bundle_sha256.slice(0, 12)}`, ready_for_agent: false };
    plan.plan_id = api.digest(plan);
    return { plan, stage, parent };
  } catch (error) { rmSync(parent, { recursive: true, force: true }); throw error; }
}

export function migrationPlan(root, target, cli, api) {
  const prepared = prepare(root, target, cli, api);
  try { return prepared.plan; } finally { rmSync(prepared.parent, { recursive: true, force: true }); }
}

/** Only an exact revalidated plan may write; backups remain outside the governance root. */
export function migrationApply(root, plan, cli, api) {
  const target = api.physical(plan.target), prepared = prepare(root, target, cli, api), written = [];
  try {
    if (api.digest(plan) !== api.digest(prepared.plan)) throw new Error('stale-or-edited-migration-plan');
    if (existsSync(plan.backup_path)) throw new Error('migration-backup-already-exists');
    mkdirSync(plan.backup_path);
    writeFileSync(path.join(plan.backup_path, 'plan.json'), json(plan), { flag: 'wx' });
    for (const change of plan.changes) if (change.before) {
      const backup = path.join(plan.backup_path, 'before', change.ref);
      mkdirSync(path.dirname(backup), { recursive: true }); cpSync(safe(target, change.ref), backup);
    }
    if (api.digest(snapshot(target)) !== plan.project_guard) throw new Error('project-changed-during-migration');
    for (const change of plan.changes) {
      if (api.digest(current(target, change.ref)) !== api.digest(change.before)) throw new Error(`concurrent-migration-edit: ${change.ref}`);
      const dest = path.join(target, change.ref);
      if (change.after) {
        // Validate every existing parent before mkdir/write, including additions.
        let cursor = target;
        for (const part of change.ref.split('/').slice(0, -1)) {
          cursor = path.join(cursor, part);
          if (existsSync(cursor) && (lstatSync(cursor).isSymbolicLink() || !lstatSync(cursor).isDirectory())) throw new Error('unsafe-migration-parent');
        }
        mkdirSync(path.dirname(dest), { recursive: true });
        const temp = `${dest}.yss-migration-${plan.plan_id.slice(0, 12)}`;
        writeFileSync(temp, readFileSync(safe(prepared.stage, change.ref)), { flag: 'wx', mode: change.after.mode });
        // Set permissions before replacing the original, so chmod failure leaves it untouched.
        try { chmodSync(temp, change.after.mode); renameSync(temp, dest); }
        finally {
          if (existsSync(temp) && !lstatSync(temp).isSymbolicLink()
              && hash(readFileSync(temp)) === change.after.sha256) rmSync(temp);
        }
      } else rmSync(safe(target, change.ref));
      written.push(change);
    }
    const check = api.projectCheck(root, target, cli);
    writeFileSync(path.join(plan.backup_path, 'result.json'), json({ result: 'migrated', plan_id: plan.plan_id }), { flag: 'wx' });
    return { ...check, result: 'migrated', backup_path: plan.backup_path, requires_current_contract_validation: true };
  } catch (error) {
    const conflicts = [];
    for (const change of written.reverse()) {
      try {
        if (api.digest(current(target, change.ref)) !== api.digest(change.after)) { conflicts.push(change.ref); continue; }
        const dest = path.join(target, change.ref);
        if (change.before) { cpSync(path.join(plan.backup_path, 'before', change.ref), dest); chmodSync(dest, change.before.mode); }
        else rmSync(dest);
      } catch { conflicts.push(change.ref); }
    }
    throw new Error(`${error.message}; rollback_conflicts=${JSON.stringify(conflicts)}; backup=${plan.backup_path}`);
  } finally { rmSync(prepared.parent, { recursive: true, force: true }); }
}
