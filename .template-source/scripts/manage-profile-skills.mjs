#!/usr/bin/env node
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { readRepositoryMode } from '../../scripts/lib/repository-mode.mjs';
import { assertWorkBuddyProfilePaths } from '../../scripts/lib/workbuddy-projection.mjs';


function syncDailyDeliveryReference(root, { check }) {
  const sourceRef = '.agents/skills/yss-product-lifecycle/references/daily-delivery.md';
  const targetRef = 'profiles/backend/.agents/skills/harness-orchestrator/references/daily-delivery.md';
  const ordinaryFile = ref => {
    let cursor = root;
    for (const [index, part] of ref.split('/').entries()) {
      cursor = path.join(cursor, part);
      const info = lstatSync(cursor, { throwIfNoEntry: false });
      if (info && !(index === ref.split('/').length - 1 ? info.isFile() : info.isDirectory())) throw new TypeError(`普通交付参考路径不是普通文件或目录: ${cursor}`);
    }
    return cursor;
  };
  const source = ordinaryFile(sourceRef), target = ordinaryFile(targetRef);
  const sourceBytes = readFileSync(source);
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  const wanted = Buffer.concat([Buffer.from(`<!-- Generated from ${sourceRef}; source-sha256=${digest(sourceBytes)}. Do not edit. -->\n`), sourceBytes]);
  const before = lstatSync(target, { throwIfNoEntry: false }) ? readFileSync(target) : null;
  if (before) {
    const newline = before.indexOf(10);
    const banner = before.subarray(0, newline).toString('utf8');
    const prefix = `<!-- Generated from ${sourceRef}; source-sha256=`;
    const sha = banner.slice(prefix.length, prefix.length + 64);
    if (!banner.startsWith(prefix) || !/^[a-f0-9]{64}$/.test(sha) || banner !== `${prefix}${sha}. Do not edit. -->` || digest(before.subarray(newline + 1)) !== sha) throw new TypeError('普通交付参考包含用户改动，拒绝覆盖');
    if (before.equals(wanted)) return { changed: false };
  }
  if (check) throw new TypeError('普通交付参考缺失或过期，请先 sync --profile backend');
  mkdirSync(path.dirname(target), { recursive: true });
  ordinaryFile(sourceRef); ordinaryFile(targetRef);
  if (!readFileSync(source).equals(sourceBytes) || (before ? !lstatSync(target, { throwIfNoEntry: false }) || !readFileSync(target).equals(before) : lstatSync(target, { throwIfNoEntry: false }))) throw new TypeError('普通交付参考在生成时发生变化');
  writeFileSync(target, wanted);
  return { changed: true };
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

try {
  const { values, positionals } = parseArgs({ options: { profile: { type: 'string' }, check: { type: 'boolean', default: false } }, allowPositionals: true, strict: true });
  const [action] = positionals;
  if (positionals.length !== 1 || !['sync', 'lock'].includes(action) || values.profile !== 'backend') throw new TypeError('仅支持 sync|lock --profile backend [--check]');
  if (readRepositoryMode(root) !== 'template-source') throw new TypeError('Profile 生成仅适用于 template-source');
  const overlay = assertWorkBuddyProfilePaths(root);
  const target = path.join(overlay, 'skills-lock.json');
  if (!lstatSync(target).isFile()) throw new TypeError('Profile 锁必须为普通文件');
  const before = readFileSync(target);
  syncDailyDeliveryReference(root, { check: action !== 'sync' || values.check });
  const { syncBackendRetirementProjection } = await import('../../scripts/lib/skill-retirement-projection.mjs');
  syncBackendRetirementProjection({ root, check: values.check });
  const { composeProfileTree } = await import('../../scripts/lib/profile-tree.mjs');
  const tree = composeProfileTree('backend', { root });
  const supply = await import(pathToFileURL(path.join(tree, 'scripts/lib/skill-supply-chain.mjs')));
  assertWorkBuddyProfilePaths(root);
  if (action === 'sync') {
    process.stdout.write(`${supply.syncSkills({ check: values.check, workbuddyRepositoryRoot: overlay, templateSourceRoot: root })}\n`);
  } else {
    const result = supply.updateSkillLock(values.check ? ['--check'] : []);
    if (!values.check) {
      const wanted = readFileSync(path.join(tree, 'skills-lock.json'));
      assertWorkBuddyProfilePaths(root);
      if (!lstatSync(target).isFile() || !readFileSync(target).equals(before)) throw new TypeError('Profile 锁在生成时发生变化');
      if (!before.equals(wanted)) writeFileSync(target, wanted);
    }
    process.stdout.write(`${result}\n`);
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
