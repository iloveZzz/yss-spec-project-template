#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import process from "node:process";
import { parseDocument } from "../../../../scripts/vendor/yaml.mjs";
import { loadApprovalRecord, resolveApprovalRef, validateApprovalRecordFile } from "../../../../scripts/lib/approval-record.mjs";

const required = ["schema_version", "stage_decision_id", "package_version", "status", "problem_statement", "target_users", "mvp", "non_goals", "success_criteria", "test_seams", "confirmed_decisions", "assumptions", "constraints", "unresolved_items", "terminology_refs", "domain_strategy_ref", "impact_assessment", "downstream_mapping", "evidence_refs", "approval"];
const idPattern = /^stage-decision\.[a-z0-9][a-z0-9-]*$/;

function fail(errors) {
  process.stderr.write(`${JSON.stringify({ result: "blocked", errors }, null, 2)}\n`);
  process.exitCode = 1;
}
function nonEmpty(value) { return typeof value === "string" && value.trim().length > 0; }
function requireField(object, field, path, errors) { if (!(field in object) || object[field] === null || object[field] === undefined) errors.push(`${path}.${field} 缺失`); }
function requireString(object, field, path, errors) { requireField(object, field, path, errors); if (field in object && !nonEmpty(object[field])) errors.push(`${path}.${field} 必须是非空字符串`); }
function requireArray(object, field, path, errors, min = 0) { requireField(object, field, path, errors); if (field in object && (!Array.isArray(object[field]) || object[field].length < min)) errors.push(`${path}.${field} 必须是至少 ${min} 项的数组`); if (field in object && Array.isArray(object[field])) object[field].forEach((item, index) => { if (!nonEmpty(item)) errors.push(`${path}.${field}[${index}] 必须是非空字符串`); }); }
function canonical(value) { if (Array.isArray(value)) return value.map(canonical); if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])); return value; }
function digest(value) { return `sha256:${createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex")}`; }

async function validate(data) {
  const errors = [];
  if (!data || typeof data !== "object" || Array.isArray(data)) return ["合同必须是对象"];
  for (const field of required) requireField(data, field, "root", errors);
  if (data.schema_version !== 1) errors.push("schema_version 必须为 1");
  if (!idPattern.test(String(data.stage_decision_id ?? ""))) errors.push("stage_decision_id 格式非法");
  if (!/^v[0-9]+$/.test(String(data.package_version ?? ""))) errors.push("package_version 必须形如 v1");
  if (!["draft", "ready-for-human", "approved", "stale", "blocked"].includes(data.status)) errors.push("status 非法");
  for (const field of ["problem_statement"]) requireString(data, field, "root", errors);
  for (const field of ["target_users", "mvp", "non_goals", "success_criteria", "test_seams", "confirmed_decisions", "assumptions", "constraints", "terminology_refs", "evidence_refs"]) requireArray(data, field, "root", errors, ["target_users", "mvp", "success_criteria", "test_seams", "confirmed_decisions", "evidence_refs"].includes(field) ? 1 : 0);

  const unresolved = Array.isArray(data.unresolved_items) ? data.unresolved_items : [];
  for (const [index, item] of unresolved.entries()) {
    const path = `unresolved_items[${index}]`;
    for (const field of ["item", "type", "owner", "next_action", "target_version"]) requireString(item ?? {}, field, path, errors);
    if (item?.type && !["blocker", "deferred"].includes(item.type)) errors.push(`${path}.type 非法`);
  }
  const domainRef = data.domain_strategy_ref ?? {};
  for (const field of ["domain_strategy_id", "domain_version", "digest", "status", "persisted_ref"]) requireString(domainRef, field, "domain_strategy_ref", errors);
  if (domainRef.status && !["approved", "stale", "blocked"].includes(domainRef.status)) errors.push("domain_strategy_ref.status 非法");
  if (data.status === "approved" && domainRef.status !== "approved") errors.push("approved 阶段包必须引用 approved 的 domain strategy");
  if (nonEmpty(domainRef.persisted_ref)) {
    try {
      const strategySource = await readFile(resolve(process.cwd(), domainRef.persisted_ref), "utf8");
      const strategyDocument = parseDocument(strategySource, { maxAliasCount: 0, uniqueKeys: true });
      if (strategyDocument.errors.length) errors.push(`domain_strategy_ref.persisted_ref YAML 非法: ${strategyDocument.errors[0].message}`);
      else {
        const strategy = strategyDocument.toJS({ maxAliasCount: 0 });
        if (strategy.domain_strategy_id !== domainRef.domain_strategy_id) errors.push("domain_strategy_ref.domain_strategy_id 与实际文件不一致");
        if (strategy.domain_version !== domainRef.domain_version) errors.push("domain_strategy_ref.domain_version 与实际文件不一致");
        if (strategy.status !== domainRef.status) errors.push("domain_strategy_ref.status 与实际文件不一致");
        if (domainRef.digest !== digest(strategy)) errors.push("domain_strategy_ref.digest 与实际领域战略内容不一致");
      }
    } catch (error) { errors.push(`domain_strategy_ref.persisted_ref 无法读取: ${error.message}`); }
  }

  const impact = data.impact_assessment ?? {};
  for (const field of ["ui", "api", "data", "backend", "frontend", "cross_repo", "high_risk"]) {
    requireField(impact, field, "impact_assessment", errors);
    if (field in impact && typeof impact[field] !== "boolean") errors.push(`impact_assessment.${field} 必须是 boolean`);
  }
  const mappings = Array.isArray(data.downstream_mapping) ? data.downstream_mapping : [];
  if (mappings.length < 1) errors.push("downstream_mapping 至少需要一项");
  for (const [index, mapping] of mappings.entries()) {
    const path = `downstream_mapping[${index}]`;
    for (const field of ["domain_change", "consumer", "propagation", "reapproval_condition"]) requireString(mapping ?? {}, field, path, errors);
    if (mapping?.propagation && !["direct", "transitive", "not-applicable", "stale"].includes(mapping.propagation)) errors.push(`${path}.propagation 非法`);
  }
  const approval = data.approval ?? {};
  for (const field of ["approval_ref", "approver", "persisted_ref", "current_version"]) requireString(approval, field, "approval", errors);
  if (data.status === "approved" && approval.current_version !== data.package_version) errors.push("approval.current_version 必须等于 package_version");
  if (unresolved.some((item) => item?.type === "blocker") && data.status === "approved") errors.push("存在 blocker 未决项时不得 approved");
  if (data.status === "approved" && nonEmpty(approval.approval_ref)) {
    try {
      const approvalPath = resolveApprovalRef(approval.approval_ref);
      validateApprovalRecordFile(approvalPath, { requireApproved: true });
      const record = loadApprovalRecord(approvalPath);
      if (record.gate_id !== "gate.stage-decision-package-approved") errors.push("approval_ref 的 gate_id 必须为 gate.stage-decision-package-approved");
      if (record.role_id !== approval.approver) errors.push("approval.approver 必须与会签记录 role_id 一致");
    } catch (error) { errors.push(`approval_ref 会签记录无效: ${error.message}`); }
  }
  return errors;
}

const file = process.argv[2];
if (!file) fail(["用法: validate-stage-decision-package.mjs <package.yaml>"]);
else {
  try {
    const source = await readFile(file, "utf8");
    const document = parseDocument(source, { maxAliasCount: 0, uniqueKeys: true });
    if (document.errors.length) fail([document.errors[0].message]);
    else {
      const errors = await validate(document.toJS({ maxAliasCount: 0 }));
      if (errors.length) fail(errors);
      else process.stdout.write(JSON.stringify({ result: "completed", contract: file }, null, 2) + "\n");
    }
  } catch (error) { fail([error.message]); }
}
