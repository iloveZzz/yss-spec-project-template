// Recovery-only acceptance helper for isolated fixtures. It is never packaged
// into a generated plugin and grants no permission to alter a real project.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { hash, safe } from '../runtime.mjs';

export function inventory(root, prefix = '') {
  const rows = [];
  for (const name of fs.readdirSync(path.join(root, prefix)).sort()) {
    const ref = prefix ? `${prefix}/${name}` : name, file = safe(root, ref), stat = fs.lstatSync(file);
    assert.ok(stat.isFile() || stat.isDirectory(), 'nonregular recovery input: ' + ref);
    rows.push({ ref, type: stat.isDirectory() ? 'directory' : 'file', mode: stat.mode & 0o777,
      ...(stat.isFile() ? { sha256: hash(fs.readFileSync(file)) } : {}) });
    if (stat.isDirectory()) rows.push(...inventory(root, ref));
  }
  return rows;
}
const ordered = rows => rows.toSorted((a, b) => a.ref.localeCompare(b.ref));
const nativeArchive = row => row.ref === '.yss' || row.ref.startsWith('.yss/');

export function restoreHistoricalBridge(parent, target) {
  // The initial fixture receipt binds this operation to our isolated copy.
  const authority = JSON.parse(fs.readFileSync(path.join(parent, 'historical-before-inventory.json')));
  assert.equal(authority.target, target); assert.equal(path.dirname(target), parent);
  const plan = JSON.parse(fs.readFileSync(path.join(parent, 'historical-bridge-plan.json')));
  assert.equal(plan.target, target); assert.ok(path.isAbsolute(plan.backup_path));
  assert.ok(plan.backup_path.startsWith(parent + path.sep), 'recovery archive must belong to this isolated fixture');
  const backupRoot = safe(parent, path.relative(parent, plan.backup_path).split(path.sep).join('/'));
  assert.deepEqual(JSON.parse(fs.readFileSync(safe(backupRoot, 'plan.json'))), plan);
  const before = authority.inventory;
  assert.equal(before.some(nativeArchive), false, 'fixture must precede native installation');
  const expected = new Map(before.filter(row => row.type === 'file').map(row => [row.ref, row]));
  const protectedFile = path.join(parent, 'historical-protected-context.json');
  const protectedContext = fs.existsSync(protectedFile) ? JSON.parse(fs.readFileSync(protectedFile)) : null;
  const prepared = [];
  // Read and verify every before byte and both sides of every planned change
  // before the first write. An unrelated later user edit also blocks recovery.
  for (const change of plan.changes) {
    assert.equal(typeof change.ref, 'string');
    if (change.before) {
      assert.deepEqual(expected.get(change.ref), { ref: change.ref, type: 'file', ...change.before });
      const backup = safe(backupRoot, 'before/' + change.ref), stat = fs.lstatSync(backup), bytes = fs.readFileSync(backup);
      assert.ok(stat.isFile()); assert.equal(hash(bytes), change.before.sha256); assert.equal(stat.mode & 0o777, change.before.mode);
      prepared.push({ ...change, bytes });
    } else { assert.equal(expected.has(change.ref), false); prepared.push(change); }
    if (change.ref === 'CONTEXT.md' && protectedContext) {
      assert.equal(protectedContext.bridge_plan_id, plan.plan_id);
      assert.deepEqual(protectedContext.before, change.before); assert.deepEqual(protectedContext.after, change.after);
      assert.equal(protectedContext.restored_sha256, change.before.sha256);
      expected.set(change.ref, { ref: change.ref, type: 'file', ...change.before });
    } else if (change.after) expected.set(change.ref, { ref: change.ref, type: 'file', ...change.after });
    else expected.delete(change.ref);
  }
  const current = inventory(target), native = current.filter(nativeArchive);
  assert.deepEqual(ordered(current.filter(row => row.type === 'file' && !nativeArchive(row))), ordered([...expected.values()]), 'later edits block recovery before any write');
  for (const change of prepared.toReversed()) {
    const destination = path.join(target, change.ref);
    if (change.before) {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      const temporary = destination + '.fixture-restore-' + plan.plan_id.slice(0, 12);
      fs.writeFileSync(temporary, change.bytes, { flag: 'wx', mode: change.before.mode });
      fs.chmodSync(temporary, change.before.mode); fs.renameSync(temporary, destination);
    } else if (fs.existsSync(destination)) fs.rmSync(safe(target, change.ref));
  }
  const originalDirs = new Set(before.filter(row => row.type === 'directory').map(row => row.ref));
  for (const row of inventory(target).filter(row => row.type === 'directory' && !nativeArchive(row)).sort((a, b) => b.ref.split('/').length - a.ref.split('/').length)) {
    if (!originalDirs.has(row.ref)) {
      assert.equal(fs.readdirSync(safe(target, row.ref)).length, 0, 'unexpected directory contents after restore');
      fs.rmdirSync(safe(target, row.ref));
    }
  }
  const restored = inventory(target);
  assert.deepEqual(ordered(restored.filter(row => !nativeArchive(row))), ordered(before), 'complete historical before inventory restored');
  assert.deepEqual(restored.filter(nativeArchive), native, 'native transaction archives remain intact');
  const result = { kind: 'recovery-only-layered-restore', target, backup: backupRoot, plan_id: plan.plan_id,
    verified_before_files: prepared.filter(change => change.before).length, verified_current_files: expected.size,
    complete_before_inventory_sha256: hash(JSON.stringify(ordered(before))), native_archive_sha256: hash(JSON.stringify(native)),
    old_public_rollback: false, fixture_only: true, result: 'restored' };
  fs.writeFileSync(path.join(parent, 'historical-layered-restore.json'), JSON.stringify(result, null, 2) + '\n');
  return result;
}
