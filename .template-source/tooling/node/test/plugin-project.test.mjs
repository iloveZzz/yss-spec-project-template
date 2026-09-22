import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const BUILD = path.join(ROOT, '.template-source/plugins/yss-backend-delivery/build.mjs');
function run(file, args, cwd, env = {}) {
  return spawnSync(process.execPath, [file, ...args], { cwd, encoding: 'utf8', timeout: 120000, maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, NODE_OPTIONS: '', NODE_PATH: '', ...env } });
}
function success(result) { assert.equal(result.status, 0, result.stderr || result.stdout); return JSON.parse(result.stdout); }

test('fixed CLI initializes, binds and resumes a separate governance project without overwriting user work', async t => {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'yss m3 ')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const build = path.join(dir, 'build', 'yss-backend-delivery');
  success(run(BUILD, ['--output', build], dir));
  const plugin = path.join(dir, 'relocated', 'yss-backend-delivery');
  cpSync(build, plugin, { recursive: true }); rmSync(build, { recursive: true });
  const entry = path.join(plugin, 'scripts/plugin.mjs');
  const target = path.join(dir, 'governance'), backend = path.join(dir, 'existing-backend');
  mkdirSync(backend); writeFileSync(path.join(backend, 'keep.txt'), 'user code');
  const opts = ['--project-name', '工具隔离验证', '--business-domain', '模板工具', '--team-size', '1', '--issue-tracker', 'github'];
  const call = (command, args = [], env = {}) => run(entry, [command, ...args], dir, env);
  const planFile = path.join(dir, 'plan.json');
  let initial;

  await t.test('public dry-run lists writes while leaving target and backend unchanged', () => {
    initial = success(call('project-plan', ['--target-dir', target, '--backend-root', backend, ...opts]));
    assert.equal(initial.kind, 'initialize'); assert.equal(existsSync(target), false);
    assert.ok(initial.write_files.includes('.yss-template.json')); assert.ok(initial.write_files.includes('.yss-plugin.json'));
    assert.equal(initial.backend.registration_status, 'pending-lifecycle-onboarding');
    assert.equal(readFileSync(path.join(backend, 'keep.txt'), 'utf8'), 'user code');
    writeFileSync(planFile, JSON.stringify(initial));
  });

  await t.test('actual offline CLI initialization succeeds, uses fixed provenance and does not initialize Git', () => {
    const result = success(call('project-apply', ['--plan', planFile]));
    assert.equal(result.result, 'initialized'); assert.equal(result.ready_for_agent, false);
    assert.equal(existsSync(path.join(target, '.git')), false);
    const metadata = JSON.parse(readFileSync(path.join(target, '.yss-template.json')));
    assert.equal(metadata.cliVersion, initial.cli.version); assert.equal(metadata.templateCommit, initial.cli.template_commit);
    assert.match(readFileSync(path.join(target, 'yss-project.yaml'), 'utf8'), /repository_mode: project-instance/);
    assert.equal(readFileSync(path.join(backend, 'keep.txt'), 'utf8'), 'user code');
  });

  await t.test('a new process binds to project-local rules and accepts project-owned Context edits', () => {
    const context = path.join(target, 'CONTEXT.md'); writeFileSync(context, readFileSync(context, 'utf8') + '\n测试接入说明。\n');
    const result = success(call('query-project', ['--target-dir', target]));
    assert.equal(result.result, 'binding-matched'); assert.ok(result.query);
    assert.equal(result.effective_orchestrator, path.join(target, '.agents/skills/yss-product-lifecycle/SKILL.md'));
    assert.equal(result.ready_for_agent, false);
  });

  await t.test('M4 queries use scoped local routes and reject release, missing checkpoint and unapproved dispatch', () => {
    const review = success(call('query-project', ['--target-dir', target, '--work-unit', 'work-unit.code-review']));
    assert.equal(review.query.execution.responsibility_scope.scope_id, 'plan-to-backend');
    assert.deepEqual(review.query.execution.transition.next, ['work-unit.slice-implementation', 'work-unit.backend-delivery']);
    assert.equal(call('query-project', ['--target-dir', target, '--work-unit', 'work-unit.release-and-retrospective']).status, 1);
    assert.equal(success(call('query-project', ['--target-dir', target, '--work-unit', 'work-unit.prototype-design'])).query.lifecycle.work_unit.id, 'work-unit.prototype-design');
    assert.equal(call('project-resume', ['--target-dir', target, '--checkpoint', 'missing.yaml']).status, 1);
    writeFileSync(path.join(target, 'dispatch-input.json'), JSON.stringify({binding:{},work_unit_id:'work-unit.synthetic',runtime_id:'runtime.generic'}));
    assert.equal(call('project-dispatch', ['--target-dir', target, '--input', 'dispatch-input.json']).status, 1);
    assert.equal(existsSync(path.join(target, '.yss-backend-delivery.json')), false);
  });

  await t.test('core drift cannot be hidden by rewriting local managed-file hashes', () => {
    const ref = '.agents/skills/yss-product-lifecycle/SKILL.md';
    const file = path.join(target, ref), old = readFileSync(file);
    writeFileSync(file, Buffer.concat([old, Buffer.from('\nchanged\n')]));
    const metadataFile = path.join(target, '.yss-template.json'), oldMetadata = readFileSync(metadataFile);
    const metadata = JSON.parse(oldMetadata);
    metadata.managedFiles[ref].contentHash = createHash('sha256').update(readFileSync(file)).digest('hex');
    writeFileSync(metadataFile, JSON.stringify(metadata));
    const result = call('project-check', ['--target-dir', target]);
    assert.equal(result.status, 1); assert.match(result.stderr, /project-core-drift/);
    writeFileSync(file, old); writeFileSync(metadataFile, oldMetadata);
  });

  await t.test('wrong template and plugin versions fail closed without migration or writes', () => {
    for (const [ref, key, value] of [['.yss-template.json', 'templateCommit', '0'.repeat(40)], ['.yss-plugin.json', 'plugin_bundle_sha256', '0'.repeat(64)]]) {
      const file = path.join(target, ref), old = readFileSync(file); const data = JSON.parse(old); data[key] = value;
      const modified = JSON.stringify(data); writeFileSync(file, modified);
      assert.equal(call('project-check', ['--target-dir', target]).status, 1);
      assert.equal(readFileSync(file, 'utf8'), modified); writeFileSync(file, old);
    }
  });

  await t.test('compatible existing governance binds by writing only the new receipt', () => {
    rmSync(path.join(target, '.yss-plugin.json'));
    const marker = path.join(target, 'user-note.txt'); writeFileSync(marker, 'keep existing work');
    const context = readFileSync(path.join(target, 'CONTEXT.md'));
    const existing = success(call('project-plan', ['--target-dir', target, '--backend-root', backend]));
    assert.equal(existing.kind, 'bind-existing'); assert.deepEqual(existing.write_files, ['.yss-plugin.json']);
    writeFileSync(planFile, JSON.stringify(existing));
    assert.equal(success(call('project-apply', ['--plan', planFile])).result, 'bound');
    assert.equal(readFileSync(marker, 'utf8'), 'keep existing work');
    assert.deepEqual(readFileSync(path.join(target, 'CONTEXT.md')), context);
  });

  await t.test('nonempty code directories and plans made stale by user files cannot be overwritten', () => {
    assert.equal(call('project-plan', ['--target-dir', backend, ...opts]).status, 1);
    const other = path.join(dir, 'new-target');
    const plan = success(call('project-plan', ['--target-dir', other, ...opts]));
    writeFileSync(planFile, JSON.stringify(plan)); mkdirSync(other); writeFileSync(path.join(other, 'keep'), 'new user work');
    assert.equal(call('project-apply', ['--plan', planFile]).status, 1);
    assert.deepEqual(readdirSync(other), ['keep']);
  });

  await t.test('initializer failure preserves an existing empty target and cleans only its staging directory', () => {
    const other = path.join(dir, 'failure-target'); mkdirSync(other);
    const plan = success(call('project-plan', ['--target-dir', other, ...opts])); writeFileSync(planFile, JSON.stringify(plan));
    const result = call('project-apply', ['--plan', planFile], { PATH: path.join(dir, 'missing-tools') });
    assert.equal(result.status, 1); assert.deepEqual(readdirSync(other), []);
    assert.ok(!readdirSync(dir).some(name => name.startsWith('.yss-governance-init-')));
  });
});
