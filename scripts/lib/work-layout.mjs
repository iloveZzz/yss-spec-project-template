import fs from 'node:fs';
import path from 'node:path';
import { parseDocument } from '../vendor/yaml.mjs';

export const TRACKER_REF = '.template-spec/agents/issue-tracker.md';
export const DEFAULT_WORK_ROOT = '.work';
export const HISTORICAL_WORK_ROOTS = Object.freeze(['docs/.scratch', '.scratch', 'docs/requirements/tickets']);
const reserved = ['.git', '.yss', '.agents', '.codex', '.cursor', '.pi', '.github', '.vscode', '.template-spec', '.template-source', 'apps', 'app', 'packages', 'node_modules'];
const featurePattern = /^[a-z0-9][a-z0-9-]*$/;

function safeRef(ref) {
  if (typeof ref !== 'string' || !ref || path.isAbsolute(ref) || /[\\\x00-\x1f\x7f<>:"|?*]/.test(ref) || ref.split('/').some(p => !p || p === '.' || p === '..' || /[. ]$/.test(p) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p))) throw new Error(`WORK_LAYOUT_PATH: ${ref}`);
  return ref;
}
function safePath(root, ref) {
  safeRef(ref);
  let current = root;
  for (const part of ref.split('/')) {
    current = path.join(current, part);
    try { if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`WORK_LAYOUT_PATH: symlink ${ref}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return current;
}
export function workLayout(root, tracker) {
  root = fs.realpathSync(root);
  if (!tracker || !['local-markdown', 'github', 'gitlab'].includes(tracker.platform) || typeof tracker.root !== 'string') throw new Error('WORK_LAYOUT_CONFIG: tracker.root required');
  const base = tracker.root.replace(/\/$/, '');
  safePath(root, base);
  try { if (!fs.statSync(path.join(root,base)).isDirectory()) throw new Error(`WORK_LAYOUT_CONFIG: root is not a directory: ${base}`); } catch(error) { if(error.code !== 'ENOENT') throw error; }
  if (reserved.includes(base.split('/')[0].toLowerCase())) throw new Error(`WORK_LAYOUT_RESERVED: ${base}`);
  if (['.scratch', 'docs/requirements/tickets'].includes(base.toLowerCase())) throw new Error(`WORK_LAYOUT_MIGRATION_REQUIRED: ${base}`);
  if (tracker.legacy_roots !== undefined && (!Array.isArray(tracker.legacy_roots) || tracker.legacy_roots.some(ref => typeof ref !== 'string'))) throw new Error('WORK_LAYOUT_CONFIG: legacy_roots must be an array');
  const scanRoots = [...new Set([base, DEFAULT_WORK_ROOT, ...HISTORICAL_WORK_ROOTS, ...(tracker.legacy_roots ?? []).map(ref => {
    safeRef(ref); if (reserved.includes(ref.split('/')[0].toLowerCase())) throw new Error(`WORK_LAYOUT_RESERVED: ${ref}`); return ref;
  })])].sort();
  function featureRoot(feature) {
    if (!featurePattern.test(feature ?? '')) throw new Error(`WORK_LAYOUT_FEATURE: ${feature}`);
    const ref = `${base}/${feature}`; safePath(root, ref); return ref;
  }
  function checkpointFeature(ref) {
    safePath(root, ref);
    const suffix = ref.startsWith(`${base}/`) ? ref.slice(base.length + 1) : '';
    const match = /^([a-z0-9][a-z0-9-]*)\/[^/]+\.(json|ya?ml)$/.exec(suffix);
    if (!match) throw new Error(`WORK_LAYOUT_CHECKPOINT: ${ref}; root=${base}`);
    return match[1];
  }
  function featureOf(ref) {
    safePath(root,ref);
    if (!ref.startsWith(`${base}/`)) throw new Error(`WORK_LAYOUT_FEATURE: ${ref}`);
    const feature=ref.slice(base.length+1).split('/')[0];featureRoot(feature);return feature;
  }
  function isTicket(ref) {
    try { safePath(root, ref); }
    catch { return false; }
    return typeof ref === 'string' && ref.startsWith(`${base}/`) && /^[a-z0-9][a-z0-9-]*\/issues\/[^/]+\.md$/.test(ref.slice(base.length + 1));
  }
  return Object.freeze({ root: base, scanRoots: Object.freeze(scanRoots), featureRoot, featureOf, checkpointFeature, isTicket });
}
export function readWorkLayout(root, { read = ref => fs.readFileSync(safePath(fs.realpathSync(root), ref), 'utf8') } = {}) {
  const source = String(read(TRACKER_REF));
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (!frontmatter) throw new Error('WORK_LAYOUT_CONFIG: tracker frontmatter required');
  const doc = parseDocument(frontmatter[1], { uniqueKeys: true });
  if (doc.errors.length) throw new Error(`WORK_LAYOUT_CONFIG: ${doc.errors[0].message}`);
  return workLayout(root, doc.toJS({ maxAliasCount: 0 })?.tracker);
}

// Read-only protection scans may run before project initialization. This does
// not select a writing root: every asset writer still requires readWorkLayout.
export function workScanRoots(root) {
  let roots;
  try { fs.lstatSync(safePath(root, TRACKER_REF)); roots = readWorkLayout(root).scanRoots; }
  catch (error) { if (error.code !== 'ENOENT') throw error; roots = [DEFAULT_WORK_ROOT, ...HISTORICAL_WORK_ROOTS]; }
  for (const ref of roots) safePath(root, ref);
  return Object.freeze([...new Set(roots)].sort());
}
