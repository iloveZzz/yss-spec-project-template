import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, cpSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const implementation = await import('../../../../scripts/lib/workbuddy-projection.mjs').catch(error => ({ loadError: error }));
function fixture(t) {
  const repositoryRoot = mkdtempSync(path.join(os.tmpdir(), 'workbuddy-projection-'));
  t.after(() => rmSync(repositoryRoot, { recursive: true, force: true }));
  const source = path.join(repositoryRoot, '.agents/skills/probe');
  const target = path.join(repositoryRoot, '.codebuddy/skills/probe');
  mkdirSync(path.join(source, 'scripts'), { recursive: true });
  writeFileSync(path.join(source, 'SKILL.md'), '---\nname: probe\n---\n');
  writeFileSync(path.join(source, 'scripts/run.sh'), '#!/bin/sh\nprintf probe\n', { mode: 0o755 });
  chmodSync(path.join(source, 'SKILL.md'), 0o644);
  chmodSync(path.join(source, 'scripts/run.sh'), 0o755);
  const git = (...args) => execFileSync('git', ['-c', 'user.name=Probe', '-c', 'user.email=probe@example.invalid', ...args], { cwd: repositoryRoot, stdio: ['ignore', 'pipe', 'pipe'] });
  git('init', '-q');
  const sync = (options = {}) => {
    assert.equal(typeof implementation.syncWorkBuddyProjection, 'function', 'WorkBuddy ordinary-file projection API is missing');
    return implementation.syncWorkBuddyProjection({ repositoryRoot, source, target, ...options });
  };
  const tracked = () => {
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(source, target, { recursive: true });
    git('add', '.codebuddy/skills');
    git('commit', '-qm', 'projection baseline');
  };
  return { repositoryRoot, source, target, sync, tracked, git };
}

test('WorkBuddy projection creates ordinary resources, preserves executable bits and is a no-op when equal', t => {
  const f = fixture(t);
  assert.equal(f.sync().status, 'created');
  assert.equal(lstatSync(f.target).isSymbolicLink(), false);
  assert.equal(readFileSync(path.join(f.target, 'SKILL.md'), 'utf8'), readFileSync(path.join(f.source, 'SKILL.md'), 'utf8'));
  const script = path.join(f.target, 'scripts/run.sh');
  assert.equal(statSync(script).mode & 0o777, 0o755);
  const before = statSync(script).mtimeMs;
  assert.equal(f.sync().status, 'unchanged');
  assert.equal(statSync(script).mtimeMs, before);
  assert.equal(f.sync({ check: true }).status, 'checked');
});

test('WorkBuddy projection updates only an unchanged committed baseline', t => {
  const f = fixture(t); f.tracked();
  writeFileSync(path.join(f.source, 'SKILL.md'), 'updated source\n');
  assert.equal(f.sync().status, 'updated');
  assert.equal(readFileSync(path.join(f.target, 'SKILL.md'), 'utf8'), 'updated source\n');
});

test('WorkBuddy projection preserves staged edits even when the worktree was restored to HEAD', t => {
  const f = fixture(t); f.tracked();
  const file = path.join(f.target, 'SKILL.md');
  writeFileSync(file, 'staged user change\n'); f.git('add', '.codebuddy/skills');
  writeFileSync(file, f.git('show', 'HEAD:.codebuddy/skills/probe/SKILL.md'));
  writeFileSync(path.join(f.source, 'SKILL.md'), 'new canonical\n');
  assert.throws(() => f.sync(), /WORKBUDDY_PROJECTION_CONFLICT/);
  assert.equal(f.git('show', ':.codebuddy/skills/probe/SKILL.md').toString(), 'staged user change\n');
  assert.notEqual(readFileSync(file, 'utf8'), 'new canonical\n');
});

for (const staged of [false, true]) test(`WorkBuddy preserves ${staged ? 'staged' : 'unstaged'} projection deletion`, t => {
  const f = fixture(t); f.tracked();
  if (staged) f.git('rm', '-qr', '.codebuddy/skills/probe');
  else rmSync(f.target, { recursive: true });
  assert.throws(() => f.sync(), /WORKBUDDY_PROJECTION_CONFLICT/);
  assert.equal(lstatSync(f.target, { throwIfNoEntry: false }), undefined);
});

for (const profile of ['spec', 'backend']) test(`WorkBuddy ${profile} sync preserves an unlocked dangling user link`, async t => {
  const f = fixture(t);
  mkdirSync(path.join(f.repositoryRoot, 'scripts/lib'), { recursive: true });
  const origin = profile === 'spec' ? '../../../../scripts/lib/skill-supply-chain.mjs' : '../../../../profiles/backend/scripts/lib/skill-supply-chain.mjs';
  cpSync(new URL(origin, import.meta.url), path.join(f.repositoryRoot, 'scripts/lib/skill-supply-chain.mjs'));
  cpSync(new URL('../../../../scripts/lib/workbuddy-projection.mjs', import.meta.url), path.join(f.repositoryRoot, 'scripts/lib/workbuddy-projection.mjs'));
  writeFileSync(path.join(f.repositoryRoot, 'skills-lock.json'), JSON.stringify({version:3,skills:{shared:{},platform:{}}}));
  mkdirSync(path.dirname(f.target), { recursive: true });
  const link = path.join(path.dirname(f.target), 'personal');
  symlinkSync('user-missing-location', link); f.git('add', '.codebuddy/skills/personal');
  const {syncSkills} = await import(pathToFileURL(path.join(f.repositoryRoot, 'scripts/lib/skill-supply-chain.mjs')).href);
  assert.throws(() => syncSkills(), /unlocked projection|WORKBUDDY_PROJECTION_CONFLICT/);
  assert.equal(readlinkSync(link), 'user-missing-location');
});

for (const kind of ['untracked', 'unstaged', 'staged', 'extra-file', 'mode', 'crlf']) test(`WorkBuddy projection preserves ${kind} conflicts`, t => {
  const f = fixture(t);
  if (kind !== 'untracked') f.tracked();
  else { mkdirSync(f.target, { recursive: true }); writeFileSync(path.join(f.target, 'SKILL.md'), 'local owner\n'); }
  const file = path.join(f.target, 'SKILL.md');
  if (['unstaged', 'staged'].includes(kind)) writeFileSync(file, 'local edit\n');
  if (kind === 'staged') f.git('add', '.codebuddy/skills');
  if (kind === 'extra-file') writeFileSync(path.join(f.target, 'personal.txt'), 'keep me');
  if (kind === 'mode') chmodSync(file, 0o600);
  if (kind === 'crlf') writeFileSync(file, readFileSync(file, 'utf8').replaceAll('\n', '\r\n'));
  const before = readFileSync(file), mode = statSync(file).mode;
  assert.throws(() => f.sync(), /WORKBUDDY_PROJECTION_CONFLICT/);
  assert.deepEqual(readFileSync(file), before);
  assert.equal(statSync(file).mode, mode);
  if (kind === 'extra-file') assert.equal(readFileSync(path.join(f.target, 'personal.txt'), 'utf8'), 'keep me');
});

test('WorkBuddy check is read-only and rejects a missing or outdated target', t => {
  const f = fixture(t);
  assert.throws(() => f.sync({ check: true }), /WORKBUDDY_PROJECTION_CONFLICT/);
  assert.equal(lstatSync(path.dirname(f.target), { throwIfNoEntry: false }), undefined);
  f.tracked(); writeFileSync(path.join(f.source, 'SKILL.md'), 'new\n');
  assert.throws(() => f.sync({ check: true }), /WORKBUDDY_PROJECTION_CONFLICT/);
  assert.notEqual(readFileSync(path.join(f.target, 'SKILL.md'), 'utf8'), 'new\n');
});

for (const kind of ['target-link', 'dangling-link', 'parent-link', 'source-link', 'escape']) test(`WorkBuddy rejects ${kind} without changing its destination`, t => {
  const f = fixture(t);
  if (kind === 'parent-link') symlinkSync(f.source, path.join(f.repositoryRoot, '.codebuddy'));
  else if (kind === 'source-link') symlinkSync('SKILL.md', path.join(f.source, 'linked.md'));
  else if (kind !== 'escape') {
    mkdirSync(path.dirname(f.target), { recursive: true });
    symlinkSync(kind === 'target-link' ? f.source : 'missing', f.target);
  }
  const before = readFileSync(path.join(f.source, 'SKILL.md'));
  assert.throws(() => f.sync(kind === 'escape' ? { target: path.join(f.repositoryRoot, '../escape') } : {}), /WORKBUDDY_PROJECTION_CONFLICT/);
  assert.deepEqual(readFileSync(path.join(f.source, 'SKILL.md')), before);
});

test('WorkBuddy obsolete projection removal preserves edited and untracked trees', t => {
  const f = fixture(t); f.tracked();
  assert.equal(typeof implementation.removeWorkBuddyProjection, 'function');
  const remove = options => implementation.removeWorkBuddyProjection({ repositoryRoot: f.repositoryRoot, target: f.target, ...options });
  assert.throws(() => remove({ check: true }), /WORKBUDDY_PROJECTION_CONFLICT/);
  writeFileSync(path.join(f.target, 'SKILL.md'), 'edited\n');
  assert.throws(() => remove({}), /WORKBUDDY_PROJECTION_CONFLICT/);
  assert.equal(readFileSync(path.join(f.target, 'SKILL.md'), 'utf8'), 'edited\n');
  f.git('restore', '--worktree', '.codebuddy/skills');
  chmodSync(path.join(f.target, 'SKILL.md'), 0o644);
  assert.equal(remove({}).status, 'removed');
  assert.equal(lstatSync(f.target, { throwIfNoEntry: false }), undefined);
});
