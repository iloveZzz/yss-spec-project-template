import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

function conflict(message) { throw new TypeError(`WORKBUDDY_PROJECTION_CONFLICT: ${message}`); }
function ordinaryPath(root, file) {
  if (!lstatSync(root, { throwIfNoEntry: false })?.isDirectory()) conflict(`not an ordinary directory: ${root}`);
  const relative = path.relative(root, file);
  if (!relative || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) conflict(`path escapes repository: ${file}`);
  let cursor = root;
  for (const part of relative.split(path.sep)) {
    cursor = path.join(cursor, part);
    const info = lstatSync(cursor, { throwIfNoEntry: false });
    if (info && !info.isDirectory()) conflict(`not an ordinary directory: ${cursor}`);
  }
}
// The two source-only Profile entrypoints compose these fixed repository paths.
// Check from the trusted root, including parents, before reading or writing them.
export function assertWorkBuddyProfilePaths(repositoryRoot) {
  const root = path.resolve(repositoryRoot);
  for (const ref of ['.agents/skills', 'scripts', '.template-spec/process', '.template-spec/templates',
    'profiles/_specialist', 'profiles/_specialist/.agents/skills', 'profiles/_specialist/scripts',
    'profiles/backend', 'profiles/backend/.agents/skills', 'profiles/backend/scripts']) ordinaryPath(root, path.join(root, ref));
  return path.join(root, 'profiles/backend');
}

function checkedTarget(repositoryRoot, target, legacy = false) {
  const root = path.resolve(repositoryRoot), resolved = path.resolve(target);
  if (!lstatSync(root, { throwIfNoEntry: false })?.isDirectory()) conflict(`not an ordinary repository directory: ${root}`);
  const ref = path.relative(root, resolved).split(path.sep).join('/');
  if (!(legacy ? /^\.codebuddy\/skills\/[a-z0-9][a-z0-9-]*$/ : /^\.workbuddy\/skills\/[a-z0-9][a-z0-9-]*$/).test(ref)) conflict(`invalid projection path: ${target}`);
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
function gitLocation(root, ref) {
  const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' });
  if (top.status !== 0) return { root, ref };
  const gitRoot = realpathSync(top.stdout.trim());
  return { root: gitRoot, ref: path.relative(gitRoot, path.join(realpathSync(root), ref)).split(path.sep).join('/') };
}
function baseline(root, ref) {
  ({ root, ref } = gitLocation(root, ref));
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
  ({ root, ref } = gitLocation(root, ref));
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


// Preflight the complete runtime migration before changing any Skill. Profile
// callers provide a composed canonical tree but keep the real overlay Git root.
export function syncWorkBuddyProjections({ repositoryRoot, names, sourceRoot = path.join(repositoryRoot, '.agents/skills'), check = false, retireLegacy = false }) {
  const root = path.resolve(repositoryRoot);
  sourceRoot = path.resolve(sourceRoot);
  if (path.basename(sourceRoot) !== "skills" || path.basename(path.dirname(sourceRoot)) !== ".agents") conflict("source root must be composed canonical .agents/skills");
  const jobs = [];
  for (const name of names) {
    const target = checkedTarget(root, path.join(root, '.workbuddy/skills', name));
    const source = path.join(sourceRoot, name);
    ordinaryPath(path.dirname(path.dirname(sourceRoot)), source);
    if (!existsSync(source)) conflict(`missing canonical Skill: ${source}`);
    const wanted = files(source);
    const current = existsSync(target.target) ? files(target.target) : null;
    const legacy = retireLegacy ? checkedTarget(root, path.join(root, '.codebuddy/skills', name), true) : null;
    const old = legacy && existsSync(legacy.target) ? files(legacy.target) : null;
    if (check) {
      if (old) conflict(`legacy projection remains: ${legacy.ref}`);
      if (!current || !equal(wanted, current)) conflict(`projection missing or different: ${target.ref}`);
      continue;
    }
    if (old) {
      if (!equal(old, baseline(root, legacy.ref))) conflict(`local changes: ${legacy.ref}`);
      if (current) conflict(`migration destination is occupied: ${target.ref}`);
    }
    if (current && equal(wanted, current) && !old) continue;
    if (current && !equal(current, baseline(root, target.ref))) conflict(`local changes: ${target.ref}`);
    if (!current) {
      assertFirstGeneration(root, target.ref);
      // A missing tracked legacy tree is a user deletion, unless this is a
      // completed migration whose new canonical target was handled above.
      if (legacy && !old) assertFirstGeneration(root, legacy.ref);
    }
    jobs.push({ target, source, wanted, current, legacy: old ? legacy : null, old });
  }
  if (check || !jobs.length) return { status: check ? 'checked' : 'unchanged' };
  const prepared = [];
  let committed = false;
  try {
    for (const job of jobs) {
      mkdirSync(path.dirname(job.target.target), { recursive: true });
      const staged = mkdtempSync(path.join(path.dirname(job.target.target), '.workbuddy-'));
      const item = { ...job, staged, backup: staged + '-previous', oldBackup: staged + '-legacy', installed: false, replaced: false, retired: false };
      prepared.push(item);
      cpSync(job.source, staged, { recursive: true, preserveTimestamps: true });
      if (!equal(job.wanted, files(staged)) || !equal(job.wanted, files(job.source))) conflict('canonical Skill changed during copy');
    }
    // Recheck every touched path before the first rename.
    for (const item of prepared) {
      checkedTarget(root, item.target.target);
      if (item.current ? !existsSync(item.target.target) || !equal(item.current, files(item.target.target)) : lstatSync(item.target.target, { throwIfNoEntry: false })) conflict(`projection changed during copy: ${item.target.ref}`);
      if (item.current && !equal(item.current, baseline(root, item.target.ref))) conflict(`projection baseline changed: ${item.target.ref}`);
      if (item.legacy) {
        checkedTarget(root, item.legacy.target, true);
        if (!existsSync(item.legacy.target) || !equal(item.old, files(item.legacy.target)) || !equal(item.old, baseline(root, item.legacy.ref))) conflict(`legacy projection changed during copy: ${item.legacy.ref}`);
      }
    }
    for (const item of prepared) {
      if (item.current) { renameSync(item.target.target, item.backup); item.replaced = true; }
      renameSync(item.staged, item.target.target); item.installed = true;
      if (item.legacy) { renameSync(item.legacy.target, item.oldBackup); item.retired = true; }
    }
    committed = true;
  } catch (error) {
    for (const item of [...prepared].reverse()) {
      if (item.retired) renameSync(item.oldBackup, item.legacy.target);
      if (item.installed) rmSync(item.target.target, { recursive: true });
      if (item.replaced) renameSync(item.backup, item.target.target);
    }
    throw error;
  } finally {
    for (const item of prepared) for (const ref of committed ? [item.staged, item.backup, item.oldBackup] : [item.staged]) rmSync(ref, { recursive: true, force: true });
  }
  for (const ref of retireLegacy ? ['.codebuddy/skills', '.codebuddy'] : []) {
    const directory = path.join(root, ref);
    if (lstatSync(directory, { throwIfNoEntry: false })?.isDirectory() && readdirSync(directory).length === 0) rmdirSync(directory);
  }
  return { status: 'synchronized' };
}
