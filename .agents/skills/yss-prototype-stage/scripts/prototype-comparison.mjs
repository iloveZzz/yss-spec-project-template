#!/usr/bin/env node
import { existsSync, realpathSync } from 'node:fs';
// Review-only snapshots. This tool never writes prototype approval or product evidence.
import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, writeFile, mkdir, mkdtemp, rename, rm, realpath } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { resourceErrors } from './offline-html.mjs';
import {parseScenarios,scenarioScript} from './scenario-contract.mjs';

const manifestName = 'comparison-manifest.json';
const assets = new URL('../assets/comparison/', import.meta.url);
const hash = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const id = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(value);
const requireThat = (test, message) => { if (!test) throw new Error(message); };
const json = value => JSON.stringify(value, null, 2) + '\n';

function relative(ref) {
  requireThat(typeof ref === 'string' && ref.length && !/[\\?#%\x00-\x1f]/.test(ref) && !/^(?:\/|[a-z][\w+.-]*:)/i.test(ref) && ref.split('/').every(x => x && x !== '.' && x !== '..'), `需要包内相对路径: ${ref}`);
  return ref;
}
async function safe(root, ref) {
  relative(ref);
  let current = root;
  for (const part of ref.split('/')) {
    current = path.join(current, part);
    try { requireThat(!(await lstat(current)).isSymbolicLink(), `不允许符号链接: ${ref}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return current;
}
async function inventory(root, prefix = '') {
  requireThat(!(await lstat(root)).isSymbolicLink(), '不允许符号链接目录');
  const files = {};
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const ref = prefix + entry.name;
    relative(ref);
    requireThat(!entry.isSymbolicLink(), `不允许符号链接: ${ref}`);
    if (entry.isDirectory()) Object.assign(files, await inventory(path.join(root, entry.name), ref + '/'));
    else {
      requireThat(entry.isFile(), `不是普通文件: ${ref}`);
      if (ref !== manifestName) files[ref] = hash(await readFile(path.join(root, entry.name)));
    }
  }
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b, 'en')));
}
function keys(object, allowed, name) {
  requireThat(object && typeof object === 'object' && !Array.isArray(object), `${name} 必须是对象`);
  requireThat(Object.keys(object).every(k => allowed.includes(k)), `${name} 存在未知字段；比较包不承载批准或业务状态定义`);
}
function definition(input, legacy = false) {
  keys(input, ['schema_version', 'comparison_id', 'title', 'comparison_ref', 'scenario_ref', 'variants', 'cases'], 'input');
  requireThat(input.schema_version === (legacy ? 1 : 2) && id(input.comparison_id) && typeof input.title === 'string' && input.title.trim(), '需要 schema_version=2、安全 comparison_id 和 title');
  relative(input.comparison_ref); relative(input.scenario_ref);
  requireThat(Array.isArray(input.variants) && input.variants.length >= 2 && input.variants.length <= 3, '需要 2–3 个候选');
  requireThat(Array.isArray(input.cases) && input.cases.length, '需要共同场景');
  for (const item of input.cases) {
    keys(item, ['id', 'label', 'scenario'], 'case');
    requireThat(id(item.id) && id(item.scenario) && typeof item.label === 'string' && item.label.trim(), '场景需要安全 id/scenario 和 label');
  }
  requireThat(new Set(input.cases.map(c => c.id)).size === input.cases.length, 'case id 重复');
  for (const item of input.variants) {
    keys(item, ['id', 'label', 'root', 'entry', 'cases'], 'variant');
    requireThat(id(item.id) && typeof item.label === 'string' && item.label.trim(), '候选需要安全 id 和 label');
    relative(item.root); relative(item.entry);
    requireThat(/\.html?$/.test(item.entry), '候选入口必须是 HTML');
    requireThat(Array.isArray(item.cases) && item.cases.length === input.cases.length && new Set(item.cases).size === item.cases.length && input.cases.every(c => item.cases.includes(c.id)), '候选缺少共同场景或场景重复');
  }
  requireThat(new Set(input.variants.map(v => v.id)).size === input.variants.length, 'variant id 重复');
}
function view(manifest) {
  return { title: manifest.title, variants: manifest.variants.map(({ id, label, entry }) => ({ id, label, entry })), cases: manifest.schema_version===1?manifest.cases:manifest.cases.map(c=>({...c,dataDigest:manifest.scenario_digests[c.scenario]})) };
}
function browserData(manifest) {
  return `window.prototypeComparison = ${JSON.stringify(view(manifest)).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029')};\n`;
}

export async function prepareComparison({ projectRoot, feature, input: inputPath }) {
  requireThat(id(feature), 'feature 必须为 kebab-case');
  const project = await realpath(projectRoot);
  const input = JSON.parse(await readFile(await safe(project, inputPath), 'utf8'));
  definition(input);
  const output = await safe(project, `docs/.scratch/${feature}/design/comparisons/${input.comparison_id}`);
  try { requireThat((await readdir(output)).length === 0, '比较目录非空，拒绝覆盖'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const sources = [input.comparison_ref, input.scenario_ref, 'DESIGN.md', '.template-spec/design/tokens/variables.css'];
  const bytes = await Promise.all(sources.map(async ref => readFile(await safe(project, ref))));
  const scenes=parseScenarios(bytes[1]);
  requireThat(input.cases.every(c=>scenes.scenarios.some(s=>s.id===c.scenario)), "共同场景 ID 不存在");
  const scenarioDigests=Object.fromEntries(scenes.scenarios.map(s=>[s.id,hash(JSON.stringify(s.initial_data))]));
  // Check all inputs before creating the review package. Candidate roots must not contain the output.
  const candidates = [];
  for (const variant of input.variants) {
    const source = await safe(project, variant.root);
    requireThat(output !== source && !output.startsWith(source + path.sep), '候选目录不能包含比较输出');
    const files = await inventory(source);
    requireThat(files[variant.entry], `候选入口缺失: ${variant.id}`);
    requireThat(files['scenarios.json'] === hash(bytes[1]) && files['scenarios.js'] === hash(scenarioScript(bytes[1])) && files['scenario-runtime.js'], `候选 ${variant.id} 的 scenarios.js 与共同来源不一致`);
    requireThat(files['tokens.css'] === hash(bytes[3]), `候选 ${variant.id} 的 tokens.css 与项目快照不一致`);
    for (const ref of Object.keys(files)) {
      if (/\.(?:css|js|html?)$/.test(ref)) requireThat(resourceErrors(ref, await readFile(path.join(source, ref), 'utf8'), files).length === 0, `候选 ${variant.id} 含非离线或缺失资源: ${ref}`);
    }
    candidates.push({ variant, source, files });
  }
  await mkdir(path.dirname(output), { recursive: true });
  const staging = await mkdtemp(path.join(path.dirname(output), '.comparison-'));
  try {
    const names = ['comparison-record.md', 'scenarios.json', 'DESIGN.md', 'tokens.css'];
    const bindings = [];
    await mkdir(path.join(staging, 'sources'));
    for (let i = 0; i < sources.length; i++) {
      const snapshot = `sources/${names[i]}`;
      await writeFile(path.join(staging, snapshot), bytes[i]);
      bindings.push({ source_ref: sources[i], snapshot, digest: hash(bytes[i]) });
    }
    for (const file of ['index.html', 'comparison.js', 'comparison.css']) await writeFile(path.join(staging, file), await readFile(new URL(file, assets)));
    const variants = [];
    for (const { variant, source, files } of candidates) {
      const base = `variants/${variant.id}`;
      for (const ref of Object.keys(files)) {
        const target = path.join(staging, base, ref);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, await readFile(path.join(source, ref)));
      }
      const entry = `${base}/${variant.entry}`;
      let html = await readFile(path.join(staging, entry), 'utf8');
      requireThat(/<\/body\s*>/i.test(html), `候选 ${variant.id} 缺少 body 结束标签`);
      await writeFile(path.join(staging, entry), html);
      variants.push({ id: variant.id, label: variant.label, entry, source_root: variant.root, cases: variant.cases });
    }
    const manifest = { schema_version: 2, scenario_digests:scenarioDigests, purpose: 'review-only', comparison_id: input.comparison_id, title: input.title, variants, cases: input.cases, bindings, files: {} };
    await writeFile(path.join(staging, manifestName), json(manifest));
    await writeFile(path.join(staging, 'comparison-data.js'), browserData(manifest));
    await sealComparison(staging);
    // rename replaces only an empty directory; a concurrent nonempty destination fails.
    await rename(staging, output);
    return { root: output, entry: path.join(output, 'index.html') };
  } catch (error) { await rm(staging, { recursive: true, force: true }); throw error; }
}

async function inspect(root, checkDigests, projectRoot, allowLegacy = false) {
  const files = await inventory(root);
  const manifest = JSON.parse(await readFile(path.join(root, manifestName), 'utf8'));
  keys(manifest, ['schema_version', 'purpose', 'comparison_id', 'title', 'variants', 'cases', 'bindings', 'files', 'scenario_digests'], 'manifest');
  const legacy=manifest.schema_version===1;
  requireThat((manifest.schema_version===2 || (legacy&&allowLegacy)) && manifest.purpose==='review-only', '当前比较包仅支持 review-only v2；v1 需要 --allow-legacy 只读检查');
  requireThat(Array.isArray(manifest.bindings) && manifest.bindings.length === 4, '来源绑定缺失');
  const [record, scenarios, design, tokens] = manifest.bindings;
  const snapshots = ['sources/comparison-record.md', legacy?'sources/scenarios.js':'sources/scenarios.json', 'sources/DESIGN.md', 'sources/tokens.css'];
  for (const [i, binding] of manifest.bindings.entries()) {
    keys(binding, ['source_ref', 'snapshot', 'digest'], 'binding'); relative(binding.source_ref);
    requireThat(binding.snapshot === snapshots[i] && files[binding.snapshot] === binding.digest, '来源快照摘要不一致');
    if (projectRoot) requireThat(hash(await readFile(await safe(await realpath(projectRoot), binding.source_ref))) === binding.digest, `来源已漂移: ${binding.source_ref}`);
  }
  requireThat(design.source_ref === 'DESIGN.md' && tokens.source_ref === '.template-spec/design/tokens/variables.css', '设计来源不符合项目合同');
  requireThat(Array.isArray(manifest.variants), '候选缺失');
  const input = { schema_version: manifest.schema_version, comparison_id: manifest.comparison_id, title: manifest.title, comparison_ref: record.source_ref, scenario_ref: scenarios.source_ref, cases: manifest.cases, variants: manifest.variants.map(v => {
    keys(v, ['id', 'label', 'entry', 'source_root', 'cases'], 'manifest variant');
    requireThat(id(v.id) && v.entry.startsWith(`variants/${v.id}/`), '候选入口越界');
    return { id: v.id, label: v.label, root: v.source_root, entry: v.entry, cases: v.cases };
  }) };
  definition(input,legacy);
  if(!legacy){const bytes=await readFile(path.join(root,scenarios.snapshot)),doc=parseScenarios(bytes);requireThat(manifest.cases.every(c=>doc.scenarios.some(s=>s.id===c.scenario)), '共同场景 ID 不存在');requireThat(JSON.stringify(manifest.scenario_digests)===JSON.stringify(Object.fromEntries(doc.scenarios.map(s=>[s.id,hash(JSON.stringify(s.initial_data))]))), '场景初始化摘要不一致');}
  for (const variant of manifest.variants) {
    requireThat(files[variant.entry], `候选入口缺失: ${variant.id}`);
    requireThat(files[`variants/${variant.id}/${legacy?'scenarios.js':'scenarios.json'}`] === scenarios.digest, '候选场景数据不一致');
    if(!legacy)requireThat(files[`variants/${variant.id}/scenarios.js`]===hash(scenarioScript(await readFile(path.join(root,scenarios.snapshot)))) && files[`variants/${variant.id}/scenario-runtime.js`], '候选场景脚本或运行时不一致');
    requireThat(files[`variants/${variant.id}/tokens.css`] === tokens.digest, '候选 Token 不一致');
  }
  for (const ref of Object.keys(files)) {
    requireThat(!/(^|\/)(?:node_modules|package\.json|(?:pnpm|package)-lock\.(?:yaml|json)|yarn\.lock)(\/|$)/.test(ref), `离线包不得携带 ${ref}`);
    if (/\.(?:css|js|html?)$/.test(ref)) {
      const errors = resourceErrors(ref, await readFile(path.join(root, ref), 'utf8'), files);
      requireThat(!errors.length, errors.join('\n'));
    }
  }
  for (const ref of ['index.html', 'comparison.js', 'comparison.css']) requireThat(files[ref], `评审资源缺失: ${ref}`);
  if (checkDigests) {
    requireThat(await readFile(path.join(root, 'comparison-data.js'), 'utf8') === browserData(manifest), '运行时比较配置与 manifest 不一致');
    requireThat(JSON.stringify(manifest.files) === JSON.stringify(files), '比较资源摘要或清单已变化，请审查后重新 seal');
  }
  return manifest;
}
export async function sealComparison(root) {
  const manifest = await inspect(root, false);
  await writeFile(path.join(root, 'comparison-data.js'), browserData(manifest));
  manifest.files = await inventory(root);
  await writeFile(path.join(root, manifestName), json(manifest));
  return manifest;
}
export async function validateComparison(root, projectRoot, {allowLegacy=false} = {}) {
  try { const manifest=await inspect(root, true, projectRoot,allowLegacy); return { errors: [], ...(manifest.schema_version===1?{warnings:["历史 v1 只读校验：未验证应用初始化"]}:{}) }; }
  catch (error) { return { errors: [error.message] }; }
}
if (process.argv[1] && existsSync(process.argv[1]) && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    const { values, positionals } = parseArgs({ allowPositionals: true, options: {...Object.fromEntries(['project-root', 'feature', 'input', 'root'].map(k => [k, { type: 'string' }])), 'allow-legacy':{type:'boolean'}} });
    const [command] = positionals;
    requireThat(positionals.length === 1, '用法: prepare --project-root ... --feature ... --input ... | seal/validate --root ...');
    let result;
    if (command === 'prepare') result = await prepareComparison({ projectRoot: values['project-root'], feature: values.feature, input: values.input });
    else if (command === 'seal') { await sealComparison(values.root); result = { result: 'sealed', purpose: 'review-only' }; }
    else if (command === 'validate') { result = await validateComparison(values.root, values['project-root'], {allowLegacy:values['allow-legacy']}); if (result.errors.length) process.exitCode = 1; }
    else throw new Error('未知比较命令');
    process.stdout.write(json(result));
  } catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
}
