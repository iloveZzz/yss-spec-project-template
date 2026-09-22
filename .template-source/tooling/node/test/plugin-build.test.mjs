import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, cpSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const BUILD = path.join(ROOT, '.template-source/plugins/yss-backend-delivery/build.mjs');
const NAME = 'yss-backend-delivery';
function run(file, args, cwd) {
  return spawnSync(process.execPath, [file, ...args], { cwd, encoding: 'utf8', timeout: 60000,
    env: { ...process.env, NODE_PATH: '', NODE_OPTIONS: '' } });
}

test('generated development plugin is portable, deterministic and fails closed on corruption', async t => {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'yss plugin m2 ')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const first = path.join(dir, 'first', NAME), moved = path.join(dir, 'detached', NAME);
  const empty = path.join(dir, 'empty'); mkdirSync(empty);
  const built = run(BUILD, ['--output', first], empty);
  assert.equal(built.status, 0, built.stderr);
  assert.equal(JSON.parse(built.stdout).development_only, true);
  cpSync(first, moved, { recursive: true }); rmSync(first, { recursive: true });
  const cli = path.join(moved, 'scripts/plugin.mjs');

  await t.test('moved artifact runs verification and real Plan query from an unrelated cwd', () => {
    for (const command of ['verify', 'doctor', 'query-plan']) {
      const result = run(cli, [command], empty);
      assert.equal(result.status, 0, result.stderr);
      const output = JSON.parse(result.stdout);
      assert.equal(output.ready_for_agent, false); assert.equal(output.release_ready, false);
      assert.equal(output.source.distribution, 'development-only');
      if (command === 'query-plan') assert.ok(output.query);
    }
  });

  await t.test('all source, generated entry and external dependency provenance is retained', () => {
    const lock = JSON.parse(readFileSync(path.join(moved, 'bundle-lock.json')));
    assert.ok(lock.files.some(x => x.ref === 'skills/backend-delivery/SKILL.md' && x.transformation === 'project-local-entry'));
    assert.ok(lock.files.some(x => x.source_ref === '.agents/skills/yss-design-system/SKILL.md' && x.transformation === 'historical-path-redaction'));
    assert.ok(lock.external_dependencies.platform.some(x => x.requested === 'product-design:index' && x.packaging === 'external'));
    assert.ok(!lock.files.some(x => x.ref.includes('/.codex/skills/')));
    assert.ok(!lock.files.some(x => x.ref.includes('/fixtures/') || x.ref.endsWith('.test.mjs')));
    for (const file of lock.files) {
      const bytes = readFileSync(path.join(moved, file.ref));
      if (!bytes.includes(0)) assert.doesNotMatch(bytes.toString('utf8'), /\/(?:Users|home)\//, file.ref);
    }
    if (lock.source.state === 'working-tree') assert.equal(lock.source.content_commit, null);
  });

  await t.test('same source yields identical lock regardless of output directory', () => {
    const second = path.join(dir, 'second', NAME);
    const result = run(BUILD, ['--output', second], empty);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(path.join(second, 'bundle-lock.json'), 'utf8'), readFileSync(path.join(moved, 'bundle-lock.json'), 'utf8'));
  });

  await t.test('existing output is preserved and symlink parents are rejected', () => {
    const marker = path.join(moved, 'user-file'); writeFileSync(marker, 'keep');
    assert.equal(run(BUILD, ['--output', moved], empty).status, 1);
    assert.equal(readFileSync(marker, 'utf8'), 'keep'); rmSync(marker);
    const link = path.join(dir, 'link'); symlinkSync(empty, link);
    assert.equal(run(BUILD, ['--output', path.join(link, NAME)], empty).status, 1);
  });

  await t.test('missing, altered, executable-mode and directory replacements are rejected', () => {
    const ref = path.join(moved, 'assets/template/docs/process/lifecycle-registry.yaml');
    const bytes = readFileSync(ref);
    for (const corrupt of [() => rmSync(ref), () => writeFileSync(ref, 'altered'),
      () => chmodSync(ref, 0o755), () => { rmSync(ref); mkdirSync(ref); writeFileSync(path.join(ref, 'copy'), bytes); }]) {
      corrupt(); assert.equal(run(cli, ['verify'], empty).status, 1);
      rmSync(ref, { recursive: true, force: true }); writeFileSync(ref, bytes); chmodSync(ref, 0o644);
    }
    assert.equal(run(cli, ['verify'], empty).status, 0);
  });

  await t.test('undeclared file and symlink cannot join the artifact', () => {
    const extra = path.join(moved, 'extra'); writeFileSync(extra, 'extra');
    assert.equal(run(cli, ['verify'], empty).status, 1); rmSync(extra);
    symlinkSync(path.join(moved, 'README.md'), extra);
    assert.equal(run(cli, ['verify'], empty).status, 1); rmSync(extra);
  });
});
