#!/usr/bin/env node
import { lstatSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { readRepositoryMode } from '../../scripts/lib/repository-mode.mjs';
import { assertWorkBuddyProfilePaths } from '../../scripts/lib/workbuddy-projection.mjs';

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
