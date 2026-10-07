import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { gunzipSync } from 'node:zlib';
import { hash } from '../runtime.mjs';

// Consume the public review/replan interface through both real plugin wrappers.
// Candidate bytes remain outside the instance and binding shares the transaction.
export function upgradeReview(build, name, profile) {
  const binary = process.env.YSS_PLUGIN_TEST_BINARY;
  assert.ok(binary, 'fixed native binary required');
  const parent = fs.realpathSync(fs.mkdtempSync(path.join(process.env.YSS_PLUGIN_TEST_ROOT || tmpdir(), `review-${profile}-`)));
  const plugin = path.join(parent, name), target = path.join(parent, 'project');
  const receipt = profile === 'spec' ? '.yss-backend-plugin.json' : '.yss-product-design-plugin.json';
  let passed = false;
  const run = (args, expected = 0) => {
    const r = spawnSync(process.execPath, [path.join(plugin, 'scripts/plugin.mjs'), ...args], { encoding: 'utf8', timeout: 180000, maxBuffer: 128 * 1024 * 1024 });
    assert.equal(r.status, expected, r.error?.message || r.stderr || r.stdout);
    return JSON.parse(expected === 0 ? r.stdout : r.stderr.trim().split('\n').at(-1));
  };
  const save = (name, value) => { const file = path.join(parent, name); fs.writeFileSync(file, JSON.stringify(value)); return file; };
  try {
    build({ output: plugin, binary });
    const init = run(['project-plan', '--target-dir', target, '--project-name', '决议升级验收', '--business-domain', '治理', '--issue-tracker', 'github']);
    run(['project-apply', '--plan', save('init.json', init)]);
    const originalBinding = fs.readFileSync(path.join(target, receipt));
    fs.writeFileSync(path.join(target, 'business.txt'), '客户业务文件\n', { mode: 0o751 });
    const local = Buffer.concat([fs.readFileSync(path.join(target, 'AGENTS.md')), Buffer.from('\n本项目保留的入口规则。\n')]);
    fs.writeFileSync(path.join(target, 'AGENTS.md'), local);
    const base = path.join(parent, 'base');
    const exported = spawnSync(binary, ['bundle', 'export', '--profile', profile, '--out', base, '--json'], { encoding: 'utf8', timeout: 180000, maxBuffer: 128 * 1024 * 1024 });
    assert.equal(exported.status, 0, exported.error?.message || exported.stderr || exported.stdout);
    const review = path.join(parent, 'review');
    const original = run(['project-upgrade-plan', '--target-dir', target, '--review-out', review, '--base-bundle', path.join(base, '.yss-bundle.snapshot.json')]);
    assert.equal(original.preview.result.readyToApply, false);
    assert.equal(original.preview.result.coverage.percent, 100);
    const native = JSON.parse(gunzipSync(Buffer.from(original.native_plan.data, 'base64')));
    const asset = native.assets.find(a => a.path === 'AGENTS.md');
    assert.equal(asset.candidate.clean, true);
    const candidate = path.join(review, 'candidates/AGENTS.md');
    const decisions = save('decisions.json', { schemaVersion: 1, planDigest: native.digest, decisions: [{ path: asset.path, choice: 'use-merged', before: asset.before, target: asset.target, candidateFile: candidate, candidateDigest: hash(fs.readFileSync(candidate)) }] });
    const saved = save('original.json', original);
    const resolved = run(['project-upgrade-plan', '--target-dir', target, '--plan', saved, '--resolution-file', decisions]);
    assert.equal(resolved.preview.result.readyToApply, true);
    assert.deepEqual(fs.readFileSync(path.join(target, receipt)), originalBinding, 'replanning changed binding');
    assert.deepEqual(fs.readFileSync(path.join(target, 'AGENTS.md')), local, 'candidate was written during review');
    const applied = run(['project-upgrade-apply', '--plan', save('resolved.json', resolved)]);
    assert.equal(applied.native.result.fileApplication, 'applied');
    assert.equal(applied.native.result.verification, 'passed');
    assert.equal(run(['project-check', '--target-dir', target]).result, 'binding-matched');
    const repeated = run(['project-upgrade-plan', '--target-dir', target]);
    assert.equal(repeated.preview.result.changes.length, 0);
    assert.equal(repeated.preview.result.readyToApply, true);
    assert.deepEqual(fs.readFileSync(path.join(target, 'AGENTS.md')), local);
    assert.equal(fs.readFileSync(path.join(target, 'business.txt'), 'utf8'), '客户业务文件\n');
    assert.equal(fs.statSync(path.join(target, 'business.txt')).mode & 0o777, 0o751);
    run(['project-rollback', '--target-dir', target, '--apply']);
    assert.deepEqual(fs.readFileSync(path.join(target, receipt)), originalBinding);
    assert.deepEqual(fs.readFileSync(path.join(target, 'AGENTS.md')), local);
    passed = true;
    return { profile, review: true, offline_base_file: true, bound_replanning: true, verified_application: true, repeated_changes: 0, protected_changes: 0, whole_rollback: true };
  } finally {
    if (passed || !process.env.YSS_PLUGIN_RETAIN_FAILED) fs.rmSync(parent, { recursive: true, force: true });
  }
}
