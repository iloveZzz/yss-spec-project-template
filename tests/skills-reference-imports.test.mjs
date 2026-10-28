import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {shipped} from '../scripts/lib/profile-distribution.mjs';

const root = path.resolve(import.meta.dirname, '..');
const imports = /(?:from\s*|import\s*\(\s*|import\s*)["'](\.[^"']+)["']/g;
function filesBelow(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    if (['tests', 'test', 'fixtures'].includes(entry.name)) return [];
    const ref = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesBelow(ref);
    return entry.isFile() && /\.(mjs|js)$/.test(entry.name) && !/\.(test|spec)\.mjs$/.test(entry.name) ? [ref] : [];
  });
}

test('按技能安装声明覆盖实际模块的递归脚本导入', () => {
  for (const profile of ['spec', 'backend']) {
    const overlayRoot = path.join(root, 'profiles/backend');
    const policyFile = profile === 'spec' ? '.template-source/distribution/bundle-profile.json' : 'profiles/backend/.template-source/distribution/bundle-profile.json';
    const policy = JSON.parse(fs.readFileSync(path.join(root, policyFile), 'utf8'));
    const source = ref => {
      const overlay = path.join(overlayRoot, ref);
      return profile === 'backend' && fs.existsSync(overlay) ? overlay : path.join(root, ref);
    };
    const skillDirs = [path.join(root, '.agents/skills'), ...(profile === 'backend' ? [path.join(overlayRoot, '.agents/skills')] : [])];
    const skillNames = new Set(skillDirs.flatMap(directory => fs.existsSync(directory) ? fs.readdirSync(directory, {withFileTypes: true}).filter(entry => entry.isDirectory()).map(entry => entry.name) : []));
    for (const skill of skillNames) {
      const prefix = `.agents/skills/${skill}`;
      if (!shipped(`${prefix}/SKILL.md`, policy.manifest) || !fs.existsSync(source(`${prefix}/SKILL.md`))) continue;
      const cfg = policy.installations.skills;
      const declared = [...(cfg.skillReferences[skill] ?? []), ...(cfg.skillReferenceGroups[skill] ?? []).flatMap(group => cfg.referenceGroups[group] ?? [])];
      const candidates = [...filesBelow(path.join(root, prefix)), ...(profile === 'backend' ? filesBelow(path.join(overlayRoot, prefix)) : [])];
      const refs = new Set(candidates.map(file => path.relative(file.startsWith(`${overlayRoot}${path.sep}`) ? overlayRoot : root, file).split(path.sep).join('/')).filter(ref => shipped(ref, policy.manifest)));
      const queue = [...refs];
      for (const ref of declared) {
        if (!/\.(md|yaml|json)$/.test(ref) || !fs.existsSync(source(ref))) continue;
        const doc = fs.readFileSync(source(ref), 'utf8');
        for (const match of doc.matchAll(/(?<![\w./-])scripts\/[\w./-]+/g)) {
          const dependency = match[0].replace(/[.,:;]+$/, '');
          if (!fs.existsSync(source(dependency)) || !fs.statSync(source(dependency)).isFile() || !shipped(dependency, policy.manifest)) continue;
          assert.ok(declared.includes(dependency), `${profile}/${skill}: ${ref} 引用 ${dependency} 但未声明`);
          queue.push(dependency);
        }
      }
      const visited = new Set();
      while (queue.length) {
        const ref = queue.pop();
        if (visited.has(ref) || ref.startsWith('scripts/vendor/')) continue;
        visited.add(ref);
        const text = fs.readFileSync(source(ref), 'utf8');
        if (ref.startsWith('scripts/')) {
          for (const match of text.matchAll(/(?<![\w./-])\.template-spec\/[\w./-]+\.(?:md|yaml|json)/g)) {
            const dependency = match[0];
            if (!fs.existsSync(source(dependency)) || !fs.statSync(source(dependency)).isFile() || !shipped(dependency, policy.manifest)) continue;
            assert.ok(declared.includes(dependency), `${profile}/${skill}: ${ref} 引用 ${dependency} 但未声明`);
          }
        }
        for (const match of text.matchAll(imports)) {
          const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(ref), match[1]));
          if (!dependency.startsWith('scripts/')) continue;
          // Only template-source identities dynamically load this maintenance-only module.
          if (ref === 'scripts/lib/task-package.mjs' && dependency === 'scripts/lib/maintenance-intensity.mjs') continue;
          assert.ok(declared.includes(dependency), `${profile}/${skill}: ${ref} 导入 ${dependency} 但未声明`);
          assert.ok(fs.existsSync(source(dependency)) && shipped(dependency, policy.manifest), `${profile}/${skill}: 缺少可分发模块 ${dependency}`);
          if (/\.(mjs|js)$/.test(dependency)) queue.push(dependency);
        }
      }
      if (declared.some(ref => ref.startsWith('scripts/vendor/'))) assert.ok(declared.includes('scripts/vendor/NOTICES.md'), `${profile}/${skill}: 缺少 vendor 许可说明`);
    }
  }
});
