import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { hash } from '../runtime.mjs';
import { digest } from '../native-tool.mjs';
import { inventory } from './recovery-only.mjs';

// Recovery-only fixture. The production plugin never imports or packs a retired executor.
export function historicalProject(parent, target, history) {
  const archiveRoot = process.env.YSS_PLUGIN_LEGACY_ARCHIVE_ROOT;
  assert.ok(archiveRoot, 'YSS_PLUGIN_LEGACY_ARCHIVE_ROOT required for historical coverage');
  const plugin = path.join(archiveRoot, 'yss-backend-delivery');
  const packed = JSON.parse(gunzipSync(fs.readFileSync(path.join(plugin, 'assets/legacy-cli-package.json.gz')), { maxOutputLength: 256 * 1024 * 1024 }));
  const executor = path.join(parent, 'historical-executor'); fs.mkdirSync(executor);
  const refs = new Set();
  for (const file of packed.files) {
    assert.ok(file.ref && !path.isAbsolute(file.ref) && !/[\\\x00-\x1f:]/.test(file.ref));
    assert.ok(!file.ref.split('/').some(x => !x || x === '.' || x === '..') && !refs.has(file.ref)); refs.add(file.ref);
    const bytes = Buffer.from(file.content, 'base64'); assert.equal(hash(bytes), file.sha256);
    assert.ok(Number.isInteger(file.mode) && file.mode >= 0 && file.mode <= 0o777);
    const dest = path.join(executor, file.ref); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, bytes, { flag: 'wx' }); fs.chmodSync(dest, file.mode);
  }
  const init = spawnSync(process.execPath, [path.join(executor, 'bin/create-yss-spec.js'), '--target-dir', target,
    '--project-name', '历史公开迁移验证', '--business-domain', '治理', '--team-size', '1', '--issue-tracker', 'github', '--no-example-docs'],
  { encoding: 'utf8', timeout: 120000, maxBuffer: 128 * 1024 * 1024 });
  assert.equal(init.status, 0, init.stderr || init.stdout);
  const policy = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '..', history === 'm4' ? 'legacy-m4.json' : 'legacy-0.2.json')));
  const fixture = path.resolve(import.meta.dirname, '../../../tooling/node/fixtures/plugin-migration', history === 'm4' ? 'm4-overlay.json.gz' : 'v02-overlay.json.gz');
  const overlay = JSON.parse(gunzipSync(fs.readFileSync(fixture)));
  const packedFiles = new Map(packed.files.map(file => [file.ref, file]));
  const snapshot = JSON.parse(Buffer.from(packedFiles.get('template.snapshot.json').content, 'base64'));
  const overlayFiles = new Map(overlay.files.map(file => [file.ref, file]));
  for (const item of policy.binding) {
    const source = overlayFiles.get(item.ref) || packedFiles.get('template/' + (snapshot.encodedPaths?.[item.ref] || item.ref));
    assert.ok(source, 'historical file missing: ' + item.ref);
    const bytes = Buffer.from(source.content, 'base64'); assert.equal(hash(bytes), item.sha256, item.ref);
    const file = path.join(target, item.ref); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); fs.chmodSync(file, item.mode);
  }
  // Historical lock regeneration is exercised by its archived public entrypoint.
  const lock = spawnSync(process.execPath, [path.join(target, 'scripts/update-skill-lock')], { cwd: target, encoding: 'utf8', timeout: 120000 });
  assert.equal(lock.status, 0, lock.stderr || lock.stdout);
  fs.writeFileSync(path.join(target, '.yss-plugin.json'), JSON.stringify({ schema_version: 1, plugin: policy.plugin,
    cli: policy.cli, plugin_bundle_sha256: policy.bundle_digest, core_digest: digest(policy.binding),
    execution_owner: 'project-local-yss-product-lifecycle', execution_scope: 'plan-to-backend', business_execution_ready: false }));
  fs.mkdirSync(path.join(target, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(target, 'docs/historical-business.md'), '历史业务和批准证据\n');
  fs.writeFileSync(path.join(target, 'docs/historical-index.json'), '{"business":"historical-business.md"}\n');
  const preserved = ['CONTEXT.md', 'docs/historical-business.md', 'docs/historical-index.json'].map(ref => [ref, fs.readFileSync(path.join(target, ref))]);
  const original = { metadata: fs.readFileSync(path.join(target, '.yss-template.json')).toString('base64'),
    receipt: fs.readFileSync(path.join(target, '.yss-plugin.json')).toString('base64') };
  fs.writeFileSync(path.join(parent, 'historical-original.json'), JSON.stringify(original));
  fs.writeFileSync(path.join(parent, 'historical-before-inventory.json'), JSON.stringify({ target, inventory: inventory(target) }));
  const publicOld = args => {
    const result = spawnSync(process.execPath, [path.join(plugin, 'scripts/plugin.mjs'), ...args], { encoding: 'utf8', timeout: 120000, maxBuffer: 128 * 1024 * 1024 });
    assert.equal(result.status, 0, result.error?.message || result.signal || result.stderr || result.stdout); return result.stdout;
  };
  // Explicitly bridge the retired historical protocol with its archived public
  // executor, then migrate the supported installed binding through native yss.
  const plan = publicOld(['project-migration-plan', '--target-dir', target]);
  const planned = JSON.parse(plan);
  assert.ok(planned.backup_path, 'historical bridge retains its independent backup');
  const saved = path.join(parent, 'historical-bridge-plan.json'); fs.writeFileSync(saved, plan);
  publicOld(['project-migration-apply', '--plan', saved]);
  const contextChange = planned.changes.find(change => change.ref === 'CONTEXT.md');
  if (contextChange) {
    // The archived bridge predates protected Context behavior. Restore only the
    // original project-owned bytes from its independent, digest-guarded backup.
    const file = path.join(target, 'CONTEXT.md'), backup = path.join(planned.backup_path, 'before/CONTEXT.md');
    assert.equal(hash(fs.readFileSync(file)), contextChange.after.sha256);
    assert.equal(fs.lstatSync(file).mode & 0o777, contextChange.after.mode);
    assert.equal(hash(fs.readFileSync(backup)), contextChange.before.sha256);
    assert.equal(fs.lstatSync(backup).mode & 0o777, contextChange.before.mode);
    fs.copyFileSync(backup, file); fs.chmodSync(file, contextChange.before.mode);
    fs.writeFileSync(path.join(parent, 'historical-protected-context.json'), JSON.stringify({ kind: 'protected-context-restore',
      bridge_plan_id: planned.plan_id, backup, before: contextChange.before, after: contextChange.after,
      restored_sha256: hash(fs.readFileSync(file)), template_metadata_rewritten: false }));
  }
  publicOld(['project-check', '--target-dir', target]);
  for (const [ref, bytes] of preserved) assert.deepEqual(fs.readFileSync(path.join(target, ref)), bytes, 'historical bridge preserves ' + ref);
  return policy;
}
