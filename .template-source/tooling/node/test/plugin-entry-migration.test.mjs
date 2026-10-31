import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { materializeTestPlugin } from '../scripts/tooling-fixture.mjs';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const SOURCE = path.join(ROOT, '.template-source/plugins/yss-backend-delivery');
test('current entry hands off to the local orchestrator and fails closed', async t => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), 'yss-entry-migration-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const plugin = path.join(dir, 'plugin/yss-backend-delivery'), target = path.join(dir, 'project');
  const run = (file, args) => spawnSync(process.execPath, [file, ...args], { cwd: dir, encoding: 'utf8', timeout: 120000, maxBuffer: 32 * 1024 * 1024 });
  const ok = result => { assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout); };
  materializeTestPlugin({ sourceRoot: ROOT, output: plugin, build: () => ok(run(path.join(SOURCE, 'build.mjs'), ['--output', plugin])) });
  const command = (name, args = []) => run(path.join(plugin, 'scripts/plugin.mjs'), [name, ...args]);
  const put = (ref, value) => { const file = path.join(dir, ref); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); return file; };
  const plan = ok(command('project-plan', ['--target-dir', target, '--project-name', '迁移机制测试', '--business-domain', '合成测试', '--team-size', '3', '--issue-tracker', 'github']));
  ok(command('project-apply', ['--plan', put('init.json', plan)]));
  await t.test('entry hands off to the bound local orchestrator without granting stage approval', () => {
    const entry = ok(command('project-entry', ['--target-dir', target, '--mode', 'new']));
    assert.equal(entry.result, 'project-local-handoff'); assert.equal(entry.next_work_unit, 'work-unit.harness-entry');
    assert.equal(entry.effective_orchestrator, path.join(target, '.agents/skills/harness-orchestrator/SKILL.md'));
    assert.equal(entry.execution_started, false); assert.equal(entry.ready_for_agent, false);
    put('project/docs/synthetic-spec.md', 'Unapproved synthetic Spec');
    const reuse = ok(command('project-entry', ['--target-dir', target, '--mode', 'reuse', '--input', put('reuse.json', { artifact_refs: ['docs/synthetic-spec.md'] })]));
    assert.equal(reuse.next_work_unit, 'work-unit.harness-entry'); assert.equal(reuse.stage_verification_required, true);
    const ref = { url: 'https://github.com/example/spec/pull/10', head_sha: 'a'.repeat(40), paths: ['docs/requirements.md'] };
    const pr = ok(command('project-entry', ['--target-dir', target, '--mode', 'reuse', '--input', put('pr-reuse.json', { pull_request_ref: ref })]));
    assert.deepEqual(pr.pull_request_ref, ref);
    assert.equal(pr.source_verification_required, true); assert.equal(pr.ready_for_agent, false);
    assert.equal(pr.execution_started, false); assert.equal(fs.existsSync(path.join(target, 'docs/requirements.md')), false);
    assert.equal(command('project-entry', ['--target-dir', target, '--mode', 'resume']).status, 1);
    assert.equal(command('project-entry', ['--target-dir', target, '--mode', 'reuse', '--input', put('bad.json', { artifact_refs: ['../outside'] })]).status, 1);
    assert.deepEqual(fs.readdirSync(path.join(plugin, 'skills')), ['backend-delivery']);
  });
});
