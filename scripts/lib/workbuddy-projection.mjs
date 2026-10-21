import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

function conflict(message) { throw new TypeError(`WORKBUDDY_PROJECTION_CONFLICT: ${message}`); }
function ordinaryPath(root, file) {
  const relative = path.relative(root, file);
  if (!relative || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) conflict(`path escapes repository: ${file}`);
  let cursor = root;
  for (const part of relative.split(path.sep)) {
    cursor = path.join(cursor, part);
    const info = lstatSync(cursor, { throwIfNoEntry: false });
    if (info && !info.isDirectory()) conflict(`not an ordinary directory: ${cursor}`);
  }
}
function checkedTarget(repositoryRoot, target) {
  const root = path.resolve(repositoryRoot), resolved = path.resolve(target);
  const ref = path.relative(root, resolved).split(path.sep).join('/');
  if (!/^\.codebuddy\/skills\/[a-z0-9][a-z0-9-]*$/.test(ref)) conflict(`invalid projection path: ${target}`);
  ordinaryPath(root, resolved);
  return { root, target: resolved, ref };
}
function files(directory) {
  const result = new Map();
  function walk(current, prefix = '') {
    for (const name of readdirSync(current).sort()) {
      const file = path.join(current, name), ref = prefix ? `${prefix}/${name}` : name;
      const info = lstatSync(file);
      if (info.isDirectory()) walk(file, ref);
      else if (info.isFile()) result.set(ref, { mode: info.mode & 0o777, bytes: readFileSync(file) });
      else conflict(`unsupported resource: ${file}`);
    }
  }
  walk(directory);
  return result;
}
function equal(left, right) {
  return left.size === right.size && [...left].every(([name, entry]) => {
    const other = right.get(name);
    return other && entry.mode === other.mode && entry.bytes.equals(other.bytes);
  });
}
function baseline(root, ref) {
  const run = args => spawnSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
  const staged = run(['diff', '--cached', '--quiet', 'HEAD', '--', ref]);
  if (staged.status !== 0) conflict(`staged changes or unavailable index: ${ref}`);
  const listing = run(['ls-tree', '-rz', '--full-tree', 'HEAD', '--', ref]);
  if (listing.status !== 0) conflict(`no committed baseline for ${ref}`);
  const result = new Map();
  for (const line of listing.stdout.toString('utf8').split('\0').filter(Boolean)) {
    const match = /^(100644|100755) blob ([a-f0-9]+)\t([\s\S]+)$/.exec(line);
    if (!match || !match[3].startsWith(ref + '/')) conflict(`invalid baseline resource: ${ref}`);
    const content = run(['cat-file', 'blob', match[2]]);
    if (content.status !== 0) conflict(`cannot read baseline for ${ref}`);
    result.set(match[3].slice(ref.length + 1), { mode: match[1] === '100755' ? 0o755 : 0o644, bytes: content.stdout });
  }
  if (!result.size) conflict(`unmanaged projection: ${ref}`);
  return result;
}
function assertFirstGeneration(root, ref) {
  const run = args => spawnSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
  const index = run(['ls-files', '--stage', '-z', '--', ref]);
  const head = run(['ls-tree', '-rz', '--full-tree', 'HEAD', '--', ref]);
  if ((index.status === 0 && index.stdout.length) || (head.status === 0 && head.stdout.length)) conflict(`projection was deleted locally: ${ref}`);
  // Composed Profile trees have no Git metadata and can generate new paths.
  if (index.status !== 0 && existsSync(path.join(root, '.git'))) conflict(`cannot inspect projection index: ${ref}`);
}

// This is a template-source generator. Instance writes belong to CLI transactions.
export function syncWorkBuddyProjection({ repositoryRoot, source, target, check = false }) {
  const location = checkedTarget(repositoryRoot, target);
  source = path.resolve(source);
  if (source !== path.join(location.root, '.agents/skills', path.basename(location.target))) conflict('source must be the matching canonical Skill');
  ordinaryPath(location.root, source);
  if (!existsSync(source)) conflict(`missing canonical Skill: ${source}`);
  const wanted = files(source), present = existsSync(location.target);
  const current = present ? files(location.target) : null;
  if (current && equal(wanted, current)) return { status: check ? 'checked' : 'unchanged' };
  if (check) conflict(`projection missing or different: ${location.ref}`);
  if (current && !equal(current, baseline(location.root, location.ref))) conflict(`local changes: ${location.ref}`);
  if (!current) assertFirstGeneration(location.root, location.ref);
  mkdirSync(path.dirname(location.target), { recursive: true });
  const staged = mkdtempSync(path.join(path.dirname(location.target), '.workbuddy-'));
  const backup = staged + '-previous';
  try {
    cpSync(source, staged, { recursive: true, preserveTimestamps: true });
    if (!equal(wanted, files(staged))) conflict('canonical Skill changed during copy');
    if (present) {
      ordinaryPath(location.root, location.target);
      if (!equal(current, files(location.target))) conflict('projection changed during copy');
      renameSync(location.target, backup);
    } else if (lstatSync(location.target, { throwIfNoEntry: false })) conflict('projection path became occupied');
    try { renameSync(staged, location.target); }
    catch (error) { if (present) renameSync(backup, location.target); throw error; }
    if (present) rmSync(backup, { recursive: true });
  } finally { rmSync(staged, { recursive: true, force: true }); }
  return { status: present ? 'updated' : 'created' };
}

export function removeWorkBuddyProjection({ repositoryRoot, target, check = false }) {
  const location = checkedTarget(repositoryRoot, target);
  if (!existsSync(location.target)) return { status: 'unchanged' };
  if (check) conflict(`obsolete projection remains: ${location.ref}`);
  const current = files(location.target);
  if (!equal(current, baseline(location.root, location.ref))) conflict(`local changes: ${location.ref}`);
  rmSync(location.target, { recursive: true });
  return { status: 'removed' };
}
