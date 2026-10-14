import * as fs from './validation-phase.mjs';
import {parseAsset} from './structured-assets.mjs';
import {readWorkLayout} from './work-layout.mjs';
import { createHash } from "node:crypto";
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import { readFileSync } from './validation-phase.mjs';
import { ROOT } from "./lifecycle-registry.mjs";

// core 层：用户决定的错误、摘要与读取。其他领域模块只经这里取这些工具，不再互相导入。
export function decisionError(code, detail) {
  const error = new TypeError(`${code}: ${detail}`);
  error.code = code;
  throw error;
}
export const requireText = (value, label) => {
  if (typeof value !== "string" || !value.trim()) decisionError("user-decision-missing", label);
};
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
export const decisionDigest = (value) => `sha256:${createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(canonical(value))).digest("hex")}`;
export function requestDigest(request) {
  const { presented_source, ...snapshot } = request;
  return decisionDigest(snapshot);
}
export function decisionIO({ root = ROOT, read = (ref) => readFileSync(ref), ...rest } = {}) {
  const resolve = (ref) => /^(?:https?:|\w+:\/\/)/.test(ref) ? ref : path.resolve(root, ref);
  const bytes = (ref) => {
    requireText(ref, "可读引用");
    try { return read(resolve(ref)); } catch { decisionError("user-decision-source-unreadable", ref); }
  };
  const document = (ref) => {
    const doc = parseDocument(String(bytes(ref)), { maxAliasCount: 0, uniqueKeys: true });
    if (doc.errors.length || !doc.toJS()) decisionError("user-decision-source-invalid", ref);
    return doc.toJS({ maxAliasCount: 0 });
  };
  return { root, bytes, document, ...rest };
}

export function renderDecisionRequest(request) {
  return [
    `决定请求 ${request.id} (${requestDigest(request)})`,
    `提问者：${request.requester_ref}`,
    ...request.items.flatMap((item) => [
      `事项 ${item.id} / ${item.boundary}：${item.title}`,
      `资产：${item.subject.ref}；版本：${item.subject.version}；摘要：${item.subject.digest}`,
      `依据：${item.basis.map((asset) => `${asset.ref}@${asset.version} (${asset.digest})`).join("；") || "无额外依据"}`,
      `关键变化：${item.changes}`,
      `范围：${item.scope.join("；")}`,
      `风险：${item.risks.join("；") || "已评估，无已知残余风险"}`,
      `推荐方案：${item.recommendation}`,
      `批准后动作：${item.next_actions.join("；")}`,
      `回复负责人：${item.responder_ref}`,
    ]),
    "请明确批准、拒绝或提出修改；多事项回复须说明事项，或明确批准以上全部事项。",
  ].join("\n");
}

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
    try { value = parseAsset(fs.readFileSync(full),full); } catch { return; }
    if (!value || value.gate_id || !value.gates) return;
    const rows = [...Object.values(value.gates), ...Object.values(value.checks || {})];
    if (rows.some(row => row?.approval_ref && path.resolve(root,row.approval_ref) === selected)) matches.push(ref);
  };
  const workRoots = readWorkLayout(root).scanRoots;
  for (const ref of workRoots.filter(ref => !ref.startsWith('docs/'))) visit(ref);
  for (const name of fs.readdirSync(root).sort()) {
    if (name === 'docs' || name === '.yss' || /\.(?:json|ya?ml)$/.test(name)) visit(name);
  }
  if (matches.length !== 1) decisionError('APPROVAL_CONTEXT_REQUIRED', `批准记录需要唯一当前 checkpoint（找到 ${matches.length} 个）；请显式提供上下文`);
  return matches[0];
}
