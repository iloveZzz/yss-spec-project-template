#!/usr/bin/env node
// Standalone diagnostic runtime, copied verbatim into the generated plugin.
import identity from './identity.json' with { type: 'json' };
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';

export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function safe(root, ref) {
  if (typeof ref !== 'string' || !ref || /[\\\x00-\x1f:]/u.test(ref)
      || path.isAbsolute(ref) || ref.split('/').some(x => !x || x === '.' || x === '..')) throw new Error(`unsafe-path: ${ref}`);
  let current = root;
  for (const part of ref.split('/')) {
    current = path.join(current, part);
    if (lstatSync(current).isSymbolicLink()) throw new Error(`symlink: ${ref}`);
  }
  return current;
}
export function files(root, prefix = '') {
  const result = [];
  for (const name of readdirSync(prefix ? safe(root, prefix) : root).sort()) {
    const ref = prefix ? `${prefix}/${name}` : name;
    const stat = lstatSync(safe(root, ref));
    if (stat.isDirectory()) result.push(...files(root, ref));
    else if (stat.isFile()) result.push(ref);
    else throw new Error(`unsupported-file: ${ref}`);
  }
  return result;
}
export function verify(root) {
  const lock = JSON.parse(readFileSync(safe(root, 'bundle-lock.json')));
  if (lock.schema_version !== 1 || lock.plugin !== identity.name || !Array.isArray(lock.files)
      || lock.files.length === 0) throw new Error('invalid-bundle-lock');
  const refs = lock.files.map(x => x.ref);
  if (new Set(refs).size !== refs.length || refs.includes('bundle-lock.json')) throw new Error('invalid-lock-inventory');
  if (JSON.stringify(files(root).filter(x => x !== 'bundle-lock.json').sort()) !== JSON.stringify([...refs].sort())) throw new Error('inventory-drift');
  for (const file of lock.files) {
    const absolute = safe(root, file.ref), stat = lstatSync(absolute);
    if (!stat.isFile() || hash(readFileSync(absolute)) !== file.sha256 || (stat.mode & 0o777) !== file.mode) throw new Error(`content-or-mode-drift: ${file.ref}`);
  }
  const manifest = JSON.parse(readFileSync(safe(root, '.codex-plugin/plugin.json')));
  if (manifest.name !== lock.plugin || manifest.version !== identity.version || manifest.skills !== './skills/') throw new Error('manifest-drift');
  const skills = files(root, 'skills').filter(x => x.endsWith('/SKILL.md'));
  const ids = skills.map(ref => readFileSync(safe(root, ref), 'utf8').match(/^name:\s*["']?([^\s"']+)/m)?.[1]);
  if (ids.some(x => !x) || new Set(ids).size !== ids.length || ids.length !== 1 || ids[0] !== identity.entry) throw new Error('skill-identity-collision');
  return { result: 'verified', files: refs.length, source: lock.source, skills: ids.length,
    integrity_only: true, ready_for_agent: false, release_ready: false,
    external_dependencies: lock.external_dependencies, cli: lock.cli,
    pending: ['business-lifecycle-verification', 'installed-session-verification'] };
}

export async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    'plugin-root': { type: 'string', default: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') },
    'target-dir': { type: 'string' }, 'project-name': { type: 'string' }, 'business-domain': { type: 'string' },
    'team-size': { type: 'string' }, 'issue-tracker': { type: 'string' }, 'backend-root': { type: 'string' }, plan: { type: 'string' }, checkpoint: { type: 'string' }, input: { type: 'string' }, 'work-unit': { type: 'string' }, mode: { type: 'string' }, bundle: { type: 'string' },
  } });
  const projectCommands = ['project-plan', 'project-apply', 'project-check', 'query-project', 'project-resume', 'project-dispatch', 'project-entry', 'project-migration-plan', 'project-migration-apply', 'project-import-design', 'project-bind-plan', 'project-bind-apply'];
  if (positionals.length !== 1 || !['verify', 'doctor', 'query-plan', ...projectCommands].includes(positionals[0])) throw new Error('usage: plugin.mjs verify|doctor|query-plan|project-plan|project-apply|project-check|query-project');
  const root = path.resolve(values['plugin-root']), result = verify(root);
  if (projectCommands.includes(positionals[0])) {
    const { runProjectCommand } = await import('./project.mjs');
    process.stdout.write(`${JSON.stringify(runProjectCommand(root, positionals[0], values), null, 2)}\n`);
    return;
  }
  if (positionals[0] === 'doctor') {
    const major = Number(process.versions.node.split('.')[0]);
    result.node = { version: process.versions.node, supported: major >= 22 && major < 27 };
    const python = spawnSync('python3', ['-c', 'import sys, jsonschema; print(sys.version.split()[0])'], { encoding: 'utf8', timeout: 10000 });
    result.python_jsonschema = { supported: !python.error && python.status === 0, version: python.status === 0 ? python.stdout.trim() : null };
    result.result = result.node.supported && result.python_jsonschema.supported ? 'diagnostics-passed' : 'blocked';
    // Provider availability must be checked by the actual Codex session, never inferred from a user-supplied boolean.
    result.provider_discovery = 'requires-codex-session';
  }
  if (positionals[0] === 'query-plan') {
    const template = safe(root, 'assets/template');
    const child = spawnSync(process.execPath, [safe(template, 'scripts/query-lifecycle-context'), '--mode', 'route', '--stage', 'stage.plan', '--work-unit', 'work-unit.plan-requirements'], { cwd: template, encoding: 'utf8', timeout: 30000 });
    if (child.error || child.status !== 0) throw new Error(`query-failed: ${child.error?.message || child.stderr}`);
    result.query = JSON.parse(child.stdout);
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.result === 'blocked') process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main(); } catch (error) {
    process.stderr.write(`${JSON.stringify({ result: 'blocked', error: error.message, ready_for_agent: false })}\n`);
    process.exitCode = 1;
  }
}
