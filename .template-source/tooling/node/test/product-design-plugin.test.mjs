import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { build } from '../../../plugins/yss-product-design/build.mjs';
import { measureTestBuild } from '../scripts/tooling-fixture.mjs';

test('design plugin uses fixed native yss binary and a bounded project-local lifecycle', async t => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), 'yss-product-design-test-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const plugin = path.join(dir, 'plugin/yss-product-design'), target = path.join(dir, '设计 治理');
  await measureTestBuild(plugin, () => build({ output: plugin }));
  const call = (command, args = [], env = {}) => spawnSync(process.execPath, [path.join(plugin, 'scripts/plugin.mjs'), command, ...args], {
    encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, ...env } });
  const ok = r => { assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };
  const put = (name, data) => { const file = path.join(dir, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data)); return file; };
  const opts = ['--project-name', '设备借用', '--business-domain', '设备管理'];
  const plan = ok(call('project-plan', ['--target-dir', target, ...opts]));
  await t.test('plan is read-only; application creates a distinct design instance', () => {
    assert.equal(fs.existsSync(target), false);
    assert.equal(plan.profile, 'design');
    assert.equal(ok(call('project-apply', ['--plan', put('init.json', plan)])).result, 'applied');
    assert.ok(fs.existsSync(path.join(target, '.yss.json')));
    assert.equal(fs.existsSync(path.join(target, '.yss-template.json')), false);
  });
  await t.test('public entry resolves an actual readable local master and current contracts', () => {
    assert.deepEqual(fs.readdirSync(path.join(plugin, 'skills')), ['product-design']);
    const before = fs.readFileSync(path.join(target, 'CONTEXT.md'));
    const result = ok(call('project-entry', ['--target-dir', target, '--mode', 'new']));
    assert.ok(fs.readFileSync(result.effective_orchestrator, 'utf8').includes('yss-strategic-design'));
    assert.equal(result.next_work_unit, 'work-unit.plan-requirements');
    assert.equal(result.ready_for_agent, false);
    for (const workUnit of ['work-unit.spec-synthesis', 'work-unit.prototype-design', 'work-unit.strategic-design-handoff']) {
      const queried = spawnSync(process.execPath, [path.join(target, 'scripts/query-lifecycle-context'), '--mode', 'route', '--work-unit', workUnit], { cwd: target, encoding: 'utf8' });
      assert.equal(queried.status, 0, queried.stderr);
    }
    assert.deepEqual(fs.readFileSync(path.join(target, 'CONTEXT.md')), before);
    put('设计 治理/docs/draft.md', 'Unapproved synthetic Spec');
    assert.equal(ok(call('project-entry', ['--target-dir', target, '--mode', 'reuse', '--input', put('reuse.json', { artifact_refs: ['docs/draft.md'] })])).stage_verification_required, true);
  });
  await t.test('resume, path escapes and fake terminal records fail closed', () => {
    assert.equal(call('project-entry', ['--target-dir', target, '--mode', 'resume']).status, 1);
    assert.equal(call('project-entry', ['--target-dir', target, '--mode', 'reuse', '--input', put('bad-ref.json', { artifact_refs: ['../outside'] })]).status, 1);
    put('设计 治理/docs/fake-checkpoint.json', { status: 'completed', stage_trace: { completed_work_unit: 'work-unit.strategic-design-handoff' } });
    assert.equal(call('project-entry', ['--target-dir', target, '--mode', 'resume', '--input', put('fake.json', { checkpoint: 'docs/fake-checkpoint.json' })]).status, 1);
    assert.equal(call('project-dispatch', ['--target-dir', target]).status, 1);
  });
  await t.test('core drift and unrelated family metadata cannot be hidden by local metadata changes', () => {
    const file = path.join(target, '.agents/skills/yss-product-lifecycle/SKILL.md'), bytes = fs.readFileSync(file);
    fs.appendFileSync(file, '\nchange');
    assert.match(call('project-check', ['--target-dir', target]).stderr, /native-project-managed|CONFLICT|DRIFT/);
    fs.writeFileSync(file, bytes);
    put('设计 治理/.yss-template.json', {});
    try {
      const denied = call('project-check', ['--target-dir', target]);
      assert.equal(denied.status, 1);
      assert.ok(['IDENTITY', 'LEGACY'].includes(JSON.parse(denied.stderr).code));
    } finally { fs.rmSync(path.join(target, '.yss-template.json')); }
  });
  await t.test('exact existing instance binds only a receipt and preserves business content', () => {
    fs.rmSync(path.join(target, '.yss-product-design-plugin.json'));
    const before = fs.readFileSync(path.join(target, 'docs/draft.md'));
    const binding = ok(call('project-bind-plan', ['--target-dir', target]));
    assert.ok(binding.preview.result.changes.some(x => x.path === '.yss-product-design-plugin.json'));
    assert.equal(ok(call('project-bind-apply', ['--plan', put('bind.json', binding)])).result, 'applied');
    assert.deepEqual(fs.readFileSync(path.join(target, 'docs/draft.md')), before);
  });
  await t.test('stale initialization plans preserve newly created user work', () => {
    const other = path.join(dir, 'other');
    const preview = ok(call('project-plan', ['--target-dir', other, ...opts]));
    put('other/keep.txt', 'user work');
    assert.equal(call('project-apply', ['--plan', put('stale.json', preview)]).status, 1);
    assert.deepEqual(fs.readdirSync(other), ['keep.txt']);
  });
  await t.test('native binding apply and rollback preserve original empty target', () => {
    const other = path.join(dir, 'rollback'); fs.mkdirSync(other);
    const preview = ok(call('project-plan', ['--target-dir', other, ...opts]));
    ok(call('project-apply', ['--plan', put('rollback.json', preview)]));
    ok(call('project-rollback', ['--target-dir', other, '--apply']));
    assert.equal(fs.existsSync(path.join(other, '.yss-product-design-plugin.json')), false);
    assert.equal(fs.existsSync(path.join(other, '.yss.json')), false);
  });
});
