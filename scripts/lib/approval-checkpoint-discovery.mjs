import { readWorkLayout } from './work-layout.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {approvalIO, approvalError} from './approval-record-io.mjs';

/** Finds a declared owner; ambiguity is an error, never a guessed approval context. */
export function findApprovalCheckpoint(root, approvalRef) {
  const selected = path.resolve(root, approvalRef), matches = [];
  const visit = ref => {
    const full = path.resolve(root, ref);
    if (!fs.existsSync(full)) return;
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) return;
    if (stat.isDirectory()) { for (const name of fs.readdirSync(full).sort()) visit(`${ref}/${name}`); return; }
    if (!/\.(?:json|ya?ml)$/.test(ref)) return;
    let value;
    try { value = approvalIO({root}).document(ref); } catch { return; }
    if (!value || value.gate_id || !value.gates) return;
    const rows = [...Object.values(value.gates), ...Object.values(value.checks || {})];
    if (rows.some(row => row?.approval_ref && path.resolve(root,row.approval_ref) === selected)) matches.push(ref);
  };
  const workRoots = readWorkLayout(root).scanRoots;
  for (const ref of workRoots.filter(ref => !ref.startsWith('docs/'))) visit(ref);
  for (const name of fs.readdirSync(root).sort()) {
    if (name === 'docs' || name === '.yss' || /\.(?:json|ya?ml)$/.test(name)) visit(name);
  }
  if (matches.length !== 1) approvalError('APPROVAL_CONTEXT_REQUIRED', `批准记录需要唯一当前 checkpoint（找到 ${matches.length} 个）；请显式提供上下文`);
  return matches[0];
}
