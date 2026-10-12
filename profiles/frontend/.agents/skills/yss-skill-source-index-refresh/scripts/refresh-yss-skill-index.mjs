#!/usr/bin/env node
import { lstat, mkdir, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FRONTEND = {
  'yss-ui': ['components', 'hooks', 'skills'],
  'yss-hook': ['hooks'],
  'yss-ui-business-page-generation': ['components', 'hooks', 'skills'],
  'ytable-usage': ['hooks'],
  'yedit-table-usage': ['hooks'],
  'ytree-usage': ['hooks']
};
const URLS = {
  components: 'http://192.168.164.27:3200/components',
  hooks: 'http://192.168.164.27:3200/hooks',
  skills: 'http://192.168.164.27:3200/skills'
};
async function stat(file) {
  try { return await lstat(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
export async function refresh({ skillsRoot, now = new Date().toISOString() }) {
  const root = await realpath(skillsRoot);
  const outputs = [];
  for (const [skill, keys] of Object.entries(FRONTEND)) {
    const directory = path.join(root, skill);
    const info = await stat(directory);
    if (!info) continue;
    if (!info.isDirectory()) throw new Error(`必须使用 canonical 技能目录: ${directory}`);
    const references = path.join(directory, 'references');
    const referenceInfo = await stat(references);
    if (referenceInfo && !referenceInfo.isDirectory()) throw new Error(`非法引用目录: ${references}`);
    const target = path.join(references, 'frontend-docs.md');
    const targetInfo = await stat(target);
    if (targetInfo && !targetInfo.isFile()) throw new Error(`非法索引文件: ${target}`);
    outputs.push({ target, text: [
      `# ${skill} Frontend Documentation`, '', `Generated: ${now}`, '',
      'This entry-point index does not fetch or verify documentation contents.', '',
      ...keys.map(key => `- ${key}: ${URLS[key]}`), '',
      'Read current version documentation and local component evidence before implementation.', ''
    ].join('\n') });
  }
  for (const {target, text} of outputs) {
    await mkdir(path.dirname(target), {recursive:true});
    await writeFile(target, text, 'utf8');
  }
  return { frontend: outputs.length, files: outputs.map(({target}) => path.relative(root, target)) };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  try {
    const result = await refresh({skillsRoot: process.env.YSS_SKILLS_ROOT || path.resolve(here, '../..')});
    console.log(`Updated ${result.frontend} frontend documentation indexes.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
