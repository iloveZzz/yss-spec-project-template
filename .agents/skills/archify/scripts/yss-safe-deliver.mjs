#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDirectory, '..');
const archifyCli = path.join(skillRoot, 'bin', 'archify.mjs');
const diagramTypes = new Set(['architecture', 'workflow', 'sequence', 'dataflow', 'lifecycle']);
const diagramIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(message, code = 2) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function isWithin(base, target) {
  const relative = path.relative(base, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function findProjectRoot(start) {
  let current = fs.realpathSync(path.resolve(start));
  while (true) {
    if (fs.existsSync(path.join(current, 'yss-project.yaml'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function findRequestedProjectRoot(start) {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, 'yss-project.yaml'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function repositoryMode(projectRoot) {
  const manifest = fs.readFileSync(path.join(projectRoot, 'yss-project.yaml'), 'utf8');
  const match = manifest.match(/^repository_mode:\s*(template-source|project-instance)\s*$/m);
  if (!match) fail('yss-project.yaml 缺少受支持的 repository_mode');
  return match[1];
}

function regularFile(target, label) {
  let metadata;
  try {
    metadata = fs.lstatSync(target);
  } catch (error) {
    if (error.code === 'ENOENT') fail(`${label}不存在: ${target}`);
    throw error;
  }
  if (!metadata.isFile() || metadata.isSymbolicLink()) fail(`${label}必须是非符号链接普通文件: ${target}`);
}

function prepareParent(base, output) {
  fs.mkdirSync(base, { recursive: true });
  const realBase = fs.realpathSync(base);
  const parent = path.dirname(output);
  fs.mkdirSync(parent, { recursive: true });
  const realParent = fs.realpathSync(parent);
  if (!isWithin(realBase, realParent)) fail(`输出目录越过允许根: ${output}`);
  return realBase;
}

function assertReplaceableHtml(output) {
  if (!fs.existsSync(output)) return;
  const metadata = fs.lstatSync(output);
  if (!metadata.isFile() || metadata.isSymbolicLink()) fail(`拒绝覆盖非普通 HTML 文件: ${output}`);
  const head = fs.readFileSync(output, { encoding: 'utf8' }).slice(0, 2048);
  if (!/<meta name="generator" content="archify [^"]+">/.test(head)) {
    fail(`拒绝覆盖非 Archify 产物: ${output}`);
  }
}

function assertReplaceableReceipt(receipt) {
  if (!fs.existsSync(receipt)) return;
  const metadata = fs.lstatSync(receipt);
  if (!metadata.isFile() || metadata.isSymbolicLink()) fail(`拒绝覆盖非普通 receipt: ${receipt}`);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(receipt, 'utf8'));
  } catch {
    fail(`拒绝覆盖无法识别的 receipt: ${receipt}`);
  }
  if (parsed?.yssArchifyReceipt !== true) fail(`拒绝覆盖非 YSS Archify receipt: ${receipt}`);
}

function stableContract(projectRoot, mode, input, output) {
  const relativeBase = mode === 'project-instance'
    ? 'docs/architecture/diagrams'
    : '.template-source/evidence/maintenance/diagrams';
  const base = path.join(projectRoot, relativeBase);
  const relativeOutput = path.relative(base, output);
  const segments = relativeOutput.split(path.sep);
  if (segments.length !== 2 || !diagramIdPattern.test(segments[0])) {
    fail(`稳定图必须位于 ${relativeBase}/<diagram-id>/<diagram-id>.html`);
  }
  const diagramId = segments[0];
  if (segments[1] !== `${diagramId}.html`) {
    fail(`稳定图文件名必须与 diagram-id 一致: ${diagramId}.html`);
  }
  const expectedInput = path.join(base, diagramId, `${diagramId}.archify.json`);
  if (input !== expectedInput) fail(`稳定图源必须为: ${expectedInput}`);
  return { base, diagramId, receipt: path.join(base, diagramId, `${diagramId}.receipt.json`) };
}

const [type, inputArgument, outputArgument, ...forwardedArguments] = process.argv.slice(2);
if (!diagramTypes.has(type)) fail(`未知图类型: ${type || '<missing>'}`);
if (!inputArgument || !outputArgument) {
  fail('用法: yss-safe-deliver <type> <input.archify.json> <output.html> [Archify flags]');
}
if (forwardedArguments.includes('--open')) fail('YSS 安全交付不允许 --open；交付后由用户显式打开产物');

const input = fs.realpathSync(path.resolve(inputArgument));
const requestedOutput = path.resolve(outputArgument);
let outputParent;
try {
  outputParent = fs.realpathSync(path.dirname(requestedOutput));
} catch (error) {
  if (error.code === 'ENOENT') fail(`输出目录必须先随配对的 JSON 源建立: ${path.dirname(requestedOutput)}`);
  throw error;
}
const output = path.join(outputParent, path.basename(requestedOutput));
if (path.extname(output).toLowerCase() !== '.html') fail(`输出必须使用 .html 扩展名: ${output}`);
regularFile(input, 'Archify JSON 源');

const projectRoot = findProjectRoot(process.cwd());
const requestedProjectRoot = findRequestedProjectRoot(path.dirname(requestedOutput));
const temporaryBase = fs.realpathSync(os.tmpdir());
// A repository-relative request stays under the repository contract even when a
// parent symlink resolves into the OS temporary directory. Otherwise the
// temporary-delivery exception could be used to escape the stable output root.
const requestedWithinProject = requestedProjectRoot !== null;
const isTemporary = !requestedWithinProject && isWithin(temporaryBase, output);
let mode = null;
let receipt;
let allowedBase;

if (isTemporary) {
  allowedBase = temporaryBase;
  receipt = output.replace(/\.html$/i, '.receipt.json');
} else {
  if (!projectRoot) fail('稳定交付必须从包含 yss-project.yaml 的仓库内运行');
  mode = repositoryMode(projectRoot);
  const contract = stableContract(projectRoot, mode, input, output);
  allowedBase = contract.base;
  receipt = contract.receipt;
}

prepareParent(allowedBase, output);
assertReplaceableHtml(output);
assertReplaceableReceipt(receipt);

const hasQuality = forwardedArguments.some((argument) => argument === '--quality' || argument.startsWith('--quality='));
const archifyArguments = [
  archifyCli,
  'deliver',
  type,
  input,
  output,
  ...forwardedArguments.filter((argument) => argument !== '--json'),
  ...(hasQuality ? [] : ['--quality', 'showcase']),
  '--json',
];
const result = spawnSync(process.execPath, archifyArguments, {
  cwd: projectRoot || process.cwd(),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

if (result.status !== 0) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

let upstreamReceipt;
try {
  upstreamReceipt = JSON.parse(result.stdout);
} catch {
  fail('Archify 成功返回但 receipt 不是有效 JSON', 1);
}
if (upstreamReceipt?.ok !== true || !fs.existsSync(output)) fail('Archify 未产生可验证交付物', 1);
assertReplaceableHtml(output);

const wrapperReceipt = {
  schemaVersion: 1,
  yssArchifyReceipt: true,
  repositoryMode: mode || 'temporary',
  source: input,
  output,
  archify: upstreamReceipt,
};
const temporaryReceipt = `${receipt}.tmp-${process.pid}`;
fs.writeFileSync(temporaryReceipt, `${JSON.stringify(wrapperReceipt, null, 2)}\n`, { encoding: 'utf8', mode: 0o644 });
fs.renameSync(temporaryReceipt, receipt);
process.stdout.write(`${JSON.stringify(wrapperReceipt, null, 2)}\n`);
