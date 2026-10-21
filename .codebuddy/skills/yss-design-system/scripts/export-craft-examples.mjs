#!/usr/bin/env node
import { existsSync, realpathSync } from 'node:fs';
import { readFile, writeFile, mkdir, readdir, lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
const digest = value => `sha256:${createHash('sha256').update(value).digest('hex')}`;
export async function exportCraftExamples({ projectRoot, output }) {
  const root = await realpath(projectRoot);
  const target = path.resolve(output);
  try { if ((await lstat(target)).isSymbolicLink()) throw new Error('示例输出不允许符号链接'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  try { if ((await readdir(target)).length) throw new Error('示例目录非空，拒绝覆盖'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const tokenRef = '.template-spec/design/tokens/variables.css';
  const tokens = await readFile(path.join(root, tokenRef)); const design = await readFile(path.join(root, 'DESIGN.md'));
  await mkdir(target, { recursive: true });
  for (const file of ['index.html','styles.css','app.js','scenarios.js']) {
    const text = await readFile(new URL(`../assets/enterprise-craft/${file}`, import.meta.url), 'utf8');
    await writeFile(path.join(target,file), text.replace('../../../../../.template-spec/design/tokens/variables.css','tokens.css'));
  }
  await writeFile(path.join(target,'tokens.css'), tokens);
  const files = {};
  for (const file of (await readdir(target)).sort()) files[file] = digest(await readFile(path.join(target,file)));
  await writeFile(path.join(target,'example-provenance.json'), JSON.stringify({ purpose:'teaching-only', design_source:{ref:'DESIGN.md',digest:digest(design)}, token_source:{ref:tokenRef,digest:digest(tokens)}, files },null,2)+'\n');
  return { root:target, entry:path.join(target,'index.html') };
}
if (process.argv[1] && existsSync(process.argv[1]) && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try { const { values } = parseArgs({ options: {'project-root':{type:'string'},output:{type:'string'}} }); console.log(JSON.stringify(await exportCraftExamples({projectRoot:values['project-root'],output:values.output}))); }
  catch (error) { console.error(error.message); process.exitCode=1; }
}
