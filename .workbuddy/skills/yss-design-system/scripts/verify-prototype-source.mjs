#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const revision = '67c9a3926dc0a854507b325c6337ff2210d16379';
const repo = 'https://github.com/unovue/shadcn-vue';
const defaultManifest = fileURLToPath(new URL('../assets/prototype/registry-manifest.json', import.meta.url));
function main(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    if (!['--entry','--file','--manifest'].includes(key) || key in options || !args[i+1] || args[i+1].startsWith('--')) throw Error('用法: verify-prototype-source --entry <path> --file <file> [--manifest <path>]');
    options[key] = args[i+1];
  }
  const entry = options['--entry'];
  if (!entry || !options['--file'] || !/^ui\/[a-z0-9-]+\/[A-Za-z0-9_-]+\.(vue|ts)$/.test(entry)) throw Error('无效组件路径或缺少文件');
  const doc = JSON.parse(readFileSync(options['--manifest'] || defaultManifest, 'utf8'));
  const manifestHash = createHash('sha256').update(JSON.stringify(doc)).digest('hex');
  if (manifestHash !== '5ead555ae2619a25946dc7ace39ffdc7e6a3165913366dc147839ac6b54310cd') throw Error('组件清单摘要不匹配');
  if (doc.repository !== repo || doc.revision !== revision || !Array.isArray(doc.components)) throw Error('组件来源或固定版本无效');
  const items = doc.components.filter(item => item?.path === entry);
  if (items.length !== 1) throw Error('组件条目缺失或重复');
  const item = items[0];
  const expected = `${repo}/blob/${revision}/apps/v4/registry/new-york-v4/${entry}`;
  if (item.source_url !== expected || !/^sha256:[a-f0-9]{64}$/.test(item.digest)) throw Error('组件来源或摘要无效');
  const actual = 'sha256:' + createHash('sha256').update(readFileSync(options['--file'])).digest('hex');
  if (actual !== item.digest) throw Error('组件源码摘要不匹配');
  console.log(`组件来源校验通过: ${entry}`);
}
try { main(process.argv.slice(2)); }
catch (error) { console.error(`组件来源校验失败: ${error.message}`); process.exitCode = 1; }
