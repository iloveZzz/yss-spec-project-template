import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as pause } from 'node:timers/promises';
import { hash } from '../runtime.mjs';

function inventory(root, prefix = '') {
  const rows = [];
  for (const name of fs.readdirSync(path.join(root, prefix)).sort()) {
    const ref = prefix ? `${prefix}/${name}` : name, file = path.join(root, ref), stat = fs.lstatSync(file);
    assert.equal(stat.isSymbolicLink(), false);
    if (stat.isDirectory()) rows.push(...inventory(root, ref));
    else rows.push([ref, hash(fs.readFileSync(file)), stat.mode & 0o777]);
  }
  return rows;
}

export async function cancellation(build, name, profile) {
  assert.ok(process.env.YSS_PLUGIN_TEST_BINARY, 'YSS_PLUGIN_TEST_BINARY required');
  const evidence = process.env.YSS_PLUGIN_TEST_ROOT;
  const parent = fs.realpathSync(fs.mkdtempSync(path.join(evidence || tmpdir(), `cancel-wrapper-${profile}-`)));
  const plugin = path.join(parent, name), receipt = profile === 'spec' ? '.yss-backend-plugin.json' : '.yss-product-design-plugin.json';
  const events = [], startedAt = new Date().toISOString();
  let passed = false;
  try {
    build({ output: plugin, binary: process.env.YSS_PLUGIN_TEST_BINARY });
    const entry = path.join(plugin, 'scripts/plugin.mjs');
    const run = args => {
      const result = spawnSync(process.execPath, [entry, ...args], { encoding: 'utf8', timeout: 120000, maxBuffer: 128 * 1024 * 1024 });
      assert.equal(result.status, 0, result.error?.message || result.signal || result.stderr || result.stdout);
      return JSON.parse(result.stdout);
    };
    for (const signal of ['SIGINT', 'SIGTERM']) {
      const target = path.join(parent, signal);
      const planned = run(['project-plan', '--target-dir', target, '--project-name', '插件取消恢复验证', '--business-domain', '治理', '--issue-tracker', 'github']);
      const saved = path.join(parent, `${signal}-plan.json`); fs.writeFileSync(saved, JSON.stringify(planned));
      const first = planned.preview.result.changes.find(change => change.before.type === 'missing' && change.after.type === 'file').path;
      const child = spawn(process.execPath, [entry, 'project-apply', '--plan', saved], { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '', stderr = '', closed = false;
      child.stdout.on('data', bytes => { stdout += bytes; }); child.stderr.on('data', bytes => { stderr += bytes; });
      const completed = new Promise((resolve, reject) => { child.on('error', reject); child.on('close', (code, endedBy) => { closed = true; resolve({ code, signal: endedBy }); }); });
      const deadline = Date.now() + 120000;
      while (!fs.existsSync(path.join(target, first)) && !closed && Date.now() < deadline) await pause(5);
      if (!fs.existsSync(path.join(target, first))) { child.kill('SIGTERM'); await completed; assert.fail('native target mutation was not observed: ' + stderr); }
      const mutation = { path: first, sha256: hash(fs.readFileSync(path.join(target, first))), observed_at: new Date().toISOString() };
      assert.equal(child.kill(signal), true);
      const termination = await completed;
      assert.equal(termination.signal, null, 'wrapper must wait for native cancellation instead of exiting by signal');
      assert.equal(termination.code, 1, stderr || stdout);
      const blocked = JSON.parse(stderr.trim().split('\n').at(-1));
      assert.equal(blocked.code, 'CANCELLED');
      assert.equal(blocked.native.status, 'error'); assert.equal(blocked.native.code, 'CANCELLED');
      assert.equal(blocked.native_exit_code, 1);
      assert.equal(fs.existsSync(path.join(target, '.yss.json')), false);
      assert.equal(fs.existsSync(path.join(target, receipt)), false);
      assert.equal(fs.existsSync(path.join(target, '.yss-execution-scope.yaml')), false);
      const restored = inventory(target);
      const status = run(['project-status', '--target-dir', target]);
      run(['project-recover', '--target-dir', target]); run(['project-rollback', '--target-dir', target]);
      assert.deepEqual(inventory(target), restored, 'default status/recover/rollback remain read-only');
      const recovery = run(['project-recover', '--target-dir', target, '--apply']);
      const repeated = run(['project-recover', '--target-dir', target, '--apply']);
      assert.deepEqual(inventory(target), restored, 'completed cancellation recovery is idempotent');
      const retry = run(['project-plan', '--target-dir', target, '--project-name', '插件取消恢复验证', '--business-domain', '治理', '--issue-tracker', 'github']);
      assert.equal(retry.kind, 'initialize'); assert.equal(retry.command, 'init');
      assert.deepEqual(inventory(target), restored, 'native-approved initialization retry remains a read-only preview');
      events.push({ signal, mutation, termination, blocked, status, recovery, repeated,
        metadata_missing: true, binding_missing: true, scope_missing: true, retry_plan_id: retry.plan_id,
        restored_inventory: restored });
    }
    passed = true;
    return { profile, started_at: startedAt, finished_at: new Date().toISOString(), result: 'passed', events };
  } finally {
    if (evidence) fs.writeFileSync(path.join(evidence, `${path.basename(parent)}-result.json`), JSON.stringify({
      profile, started_at: startedAt, finished_at: new Date().toISOString(), exit_code: passed ? 0 : 1,
      binary: process.env.YSS_PLUGIN_TEST_BINARY, fixture: parent, events,
    }, null, 2) + '\n');
    if (passed || !process.env.YSS_PLUGIN_RETAIN_FAILED) fs.rmSync(parent, { recursive: true, force: true });
  }
}
