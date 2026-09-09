import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import { resolveContextTermRefs, verifyContextSnapshot } from "./context-contract.mjs";
import { validateJsonSchema } from "./json-schema.mjs";
const schemaPath = path.resolve(import.meta.dirname, "../../docs/process/schemas/context-reconciliation.schema.json");
export function parseReconciliationFile(file) {
  const document = parseDocument(readFileSync(file, "utf8"), { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length) throw new TypeError(document.errors[0].message);
  return document.toJS({ maxAliasCount: 0 });
}

export function verifyContextReconciliation(file, { root = process.cwd() } = {}) {
  root = path.resolve(root);
  const value = parseReconciliationFile(path.resolve(file));
  validateJsonSchema(value, schemaPath, { formatChecker: false });
  const manifest = parseReconciliationFile(path.join(root, "yss-project.yaml"));
  if (value.repository_mode !== manifest.repository_mode) throw new TypeError("repository_mode 必须与根目录 yss-project.yaml 一致");
  const contract = verifyContextSnapshot(value.context_snapshot, { root });
  const changedRefs = [...value.changes.added, ...value.changes.updated, ...value.changes.deprecated];
  resolveContextTermRefs(contract, changedRefs);
  if (new Set(changedRefs).size !== changedRefs.length) throw new TypeError("changes 中的术语引用不得跨分类重复");
  if (value.repository_mode === "project-instance" && value.status !== "reconciled") throw new TypeError("project-instance 工作单元只有 status=reconciled 才允许批准或进入下一步");
  if (value.status === "reconciled" && value.unresolved_terms.length) throw new TypeError("reconciled 不得包含 unresolved_terms");
  if (value.status === "blocked" && value.unresolved_terms.length === 0) throw new TypeError("blocked 必须说明 unresolved_terms");
  if (value.status === "not-applicable" && (value.repository_mode !== "template-source" || !value.reason)) throw new TypeError("not-applicable 只适用于 template-source 且必须说明 reason");
  for (const ref of value.evidence_refs) {
    if (/^https?:\/\//.test(ref)) continue;
    const resolved = path.resolve(root, ref);
    if (!resolved.startsWith(`${root}${path.sep}`) && resolved !== root) throw new TypeError(`evidence_ref 越出仓库: ${ref}`);
    if (!existsSync(resolved)) throw new TypeError(`evidence_ref 不可读: ${ref}`);
  }
  return contract;
}
