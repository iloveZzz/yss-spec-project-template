import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { resolveRuntimeLocation } from './runtime-store.mjs';
import { readRepositoryMode } from './repository-mode.mjs';

const PREFIX = 'maintenance:';
const inside = (base, target) => {
  const relative = path.relative(base, target);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};

export function resolveMaintenanceLocation({ root, home } = {}) {
  if (readRepositoryMode(root) !== 'template-source') throw new TypeError('maintenance 引用仅适用于 template-source');
  // Formal maintenance materials must survive the CI runner's temporary directory.
  const selectedHome = home ?? process.env.YSS_RUNTIME_HOME ?? path.join(os.homedir(), '.yss-harness', 'runtime');
  assertNoSymlinks(selectedHome);
  const location = resolveRuntimeLocation({ root, home: selectedHome });
  assertNoSymlinks(path.join(selectedHome, location.workspaceId));
  const directory = path.join(location.directory, 'maintenance');
  assertNoSymlinks(directory);
  return { ...location, runtimeDirectory: location.directory, directory };
}

function assertNoSymlinks(target) {
  let cursor = path.resolve(target);
  while (true) {
    try {
      if (fs.lstatSync(cursor).isSymbolicLink()) throw new TypeError(`维护路径不得穿越符号链接: ${cursor}`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
}

function relativePath(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes('\0') || path.posix.isAbsolute(value) || /^[A-Za-z]:/.test(value) || path.posix.normalize(value) !== value || value === '.' || value === '..' || value.startsWith('../')) {
    throw new TypeError('maintenance 引用必须使用规范的包内相对路径');
  }
  return value;
}

export function resolveMaintenanceOutput(value, options = {}) {
  const location = resolveMaintenanceLocation(options);
  if (typeof value !== 'string' || !value) throw new TypeError('维护输出路径不能为空');
  const target = value.startsWith(PREFIX)
    ? path.join(location.directory, relativePath(value.slice(PREFIX.length)))
    : path.resolve(value);
  if (!inside(location.directory, target) || target === location.directory) throw new TypeError('维护输出必须位于当前工作区的仓外 maintenance 目录');
  assertNoSymlinks(target);
  return target;
}

export function maintenanceReference(target, options = {}) {
  const location = resolveMaintenanceLocation(options);
  const absolute = resolveMaintenanceOutput(target, options);
  return PREFIX + relativePath(path.relative(location.directory, absolute).split(path.sep).join('/'));
}

export function resolveMaintenanceReference(reference, { root, home, digest, directory = false } = {}) {
  if (typeof reference !== 'string' || !reference.startsWith(PREFIX)) throw new TypeError('需要显式 maintenance: 引用');
  const target = resolveMaintenanceOutput(reference, { root, home });
  const metadata = fs.lstatSync(target);
  if (directory ? !metadata.isDirectory() : !metadata.isFile()) throw new TypeError(`维护引用类型不符: ${reference}`);
  if (digest !== undefined) {
    if (directory || !/^(?:sha256:)?[a-f0-9]{64}$/.test(digest)) throw new TypeError('维护文件摘要必须为 SHA-256');
    const actual = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
    if (actual !== digest.replace(/^sha256:/, '')) throw new TypeError(`维护证据摘要漂移: ${reference}`);
  }
  return target;
}

export function resolveMaintenanceBundleFile(bundleDirectory, reference) {
  const target = path.resolve(bundleDirectory, relativePath(reference));
  if (!inside(bundleDirectory, target)) throw new TypeError('维护包引用越界');
  assertNoSymlinks(target);
  if (!fs.lstatSync(target).isFile()) throw new TypeError('维护包成员必须为普通文件');
  return target;
}
