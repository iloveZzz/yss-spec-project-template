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
