#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";
import { parseArgs } from "node:util";
import { parseDocument } from "../../../../scripts/vendor/yaml.mjs";
import { loadApprovalRecord, resolveApprovalRef, validateApprovalRecordFile } from "../../../../scripts/lib/approval-record.mjs";
import { verifyContextSnapshot } from "../../../../scripts/lib/context-contract.mjs";

import { extractTraceability } from "../../../../scripts/lib/strategic-handoff-rules.mjs";

const required = ["schema_version", "domain_strategy_id", "domain_version", "status", "contexts", "subdomains", "relationships", "scenarios", "concept_candidates", "invariants", "context_snapshot", "downstream_mapping", "evidence_refs", "approval"];
const idPatterns = {
  context_id: /^[A-Z][A-Za-z0-9]+$/,
  domain_strategy_id: /^domain-strategy\.[a-z0-9][a-z0-9-]*$/,
  subdomain_id: /^subdomain\.[a-z0-9][a-z0-9-]*$/,
  relationship_id: /^relationship\.[a-z0-9][a-z0-9-]*$/,
  scenario_id: /^scenario\.[a-z0-9][a-z0-9-]*$/,
  concept_id: /^domain-concept\.[a-z0-9][a-z0-9-]*$/,
  invariant_id: /^invariant\.[a-z0-9][a-z0-9-]*$/
};
const relationshipPatterns = new Set(["Partnership", "Customer/Supplier", "Conformist", "Anti-Corruption Layer", "Open Host Service", "Published Language", "Shared Kernel", "Separate Ways"]);

function fail(errors) {
  process.stderr.write(`${JSON.stringify({ result: "blocked", errors }, null, 2)}\n`);
  process.exitCode = 1;
}

function nonEmpty(value) { return typeof value === "string" && value.trim().length > 0; }
function list(value) { return Array.isArray(value); }
function unique(items, label, errors) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item)) errors.push(`${label} 重复: ${item}`);
    seen.add(item);
  }
}
function requireField(object, field, path, errors) {
  if (!(field in object) || object[field] === null || object[field] === undefined) errors.push(`${path}.${field} 缺失`);
}
function requireString(object, field, path, errors) {
  requireField(object, field, path, errors);
  if (field in object && !nonEmpty(object[field])) errors.push(`${path}.${field} 必须是非空字符串`);
}
function requireArray(object, field, path, errors, min = 0, itemKind = "string") {
  requireField(object, field, path, errors);
  if (field in object && (!list(object[field]) || object[field].length < min)) errors.push(`${path}.${field} 必须是至少 ${min} 项的数组`);
  if (field in object && list(object[field]) && itemKind === "string") object[field].forEach((item, index) => { if (!nonEmpty(item)) errors.push(`${path}.${field}[${index}] 必须是非空字符串`); });
}

function validate(data, contextRoot) {
  const errors = [];
  if (data?.traceability_version !== undefined) { try { extractTraceability(data); } catch(error) { errors.push(error.message); } }
  if (!data || typeof data !== "object" || Array.isArray(data)) return ["合同必须是对象"];
  if (data.schema_version === 1) return ["migration-required: domain strategy v1 必须迁移到 v2 context_snapshot"];
  for (const field of required) requireField(data, field, "root", errors);
  if (data.schema_version !== 2) errors.push("schema_version 必须为 2");
  if (!idPatterns.domain_strategy_id.test(String(data.domain_strategy_id ?? ""))) errors.push("domain_strategy_id 格式非法");
  if (!/^v[0-9]+$/.test(String(data.domain_version ?? ""))) errors.push("domain_version 必须形如 v1");
  if (!["draft", "ready-for-human", "approved", "stale", "blocked"].includes(data.status)) errors.push("status 非法");

  requireArray(data, "contexts", "root", errors, 1, "object");
  const contexts = list(data.contexts) ? data.contexts : [];
  const contextIds = contexts.map((item) => item?.context_id).filter(Boolean);
  unique(contextIds, "context_id", errors);
  for (const [index, context] of contexts.entries()) {
    const path = `contexts[${index}]`;
    for (const field of ["context_id", "name", "owner", "status", "subdomain_type"]) requireString(context ?? {}, field, path, errors);
    for (const field of ["responsibilities", "non_responsibilities"]) requireArray(context ?? {}, field, path, errors, field === "responsibilities" ? 1 : 0);
    if (context?.context_id && !idPatterns.context_id.test(context.context_id)) errors.push(`${path}.context_id 格式非法`);
    if (context?.status && !["candidate", "confirmed", "stale"].includes(context.status)) errors.push(`${path}.status 非法`);
    if (context?.subdomain_type && !["Core Domain", "Supporting Subdomain", "Generic Subdomain"].includes(context.subdomain_type)) errors.push(`${path}.subdomain_type 非法`);
  }

  requireArray(data, "subdomains", "root", errors, 1, "object");
  const subdomains = list(data.subdomains) ? data.subdomains : [];
  unique(subdomains.map((item) => item?.subdomain_id).filter(Boolean), "subdomain_id", errors);
  for (const [index, item] of subdomains.entries()) {
    const path = `subdomains[${index}]`;
    for (const field of ["subdomain_id", "name", "type", "rationale"]) requireString(item ?? {}, field, path, errors);
    requireArray(item ?? {}, "evidence_refs", path, errors, 1);
    if (item?.subdomain_id && !idPatterns.subdomain_id.test(item.subdomain_id)) errors.push(`${path}.subdomain_id 格式非法`);
    if (item?.type && !["Core Domain", "Supporting Subdomain", "Generic Subdomain"].includes(item.type)) errors.push(`${path}.type 非法`);
  }

  const relationships = list(data.relationships) ? data.relationships : [];
  unique(relationships.map((item) => item?.relationship_id).filter(Boolean), "relationship_id", errors);
  for (const [index, relationship] of relationships.entries()) {
    const path = `relationships[${index}]`;
    for (const field of ["relationship_id", "from_context", "to_context", "relationship_pattern", "semantic_upstream", "semantic_downstream", "business_authority", "model_change_impact", "transport_direction", "translation_responsibility", "direction_explanation"]) requireString(relationship ?? {}, field, path, errors);
    if (relationship?.relationship_id && !idPatterns.relationship_id.test(relationship.relationship_id)) errors.push(`${path}.relationship_id 格式非法`);
    for (const field of ["from_context", "to_context", "semantic_upstream", "semantic_downstream"]) {
      if (relationship?.[field] && !contextIds.includes(relationship[field])) errors.push(`${path}.${field} 未引用已声明上下文`);
    }
    if (relationship?.from_context === relationship?.to_context) errors.push(`${path} 不允许上下文自环`);
    if (relationship?.semantic_upstream && ![relationship.from_context, relationship.to_context].includes(relationship.semantic_upstream)) errors.push(`${path}.semantic_upstream 必须是关系端点`);
    if (relationship?.semantic_downstream && ![relationship.from_context, relationship.to_context].includes(relationship.semantic_downstream)) errors.push(`${path}.semantic_downstream 必须是关系端点`);
    if (relationship?.relationship_pattern && !relationshipPatterns.has(relationship.relationship_pattern)) errors.push(`${path}.relationship_pattern 非法`);
    if (relationship?.relationship_pattern === "Shared Kernel" && !nonEmpty(relationship.shared_kernel_approval_ref)) errors.push(`${path} Shared Kernel 必须有 shared_kernel_approval_ref`);
    if (relationship?.semantic_upstream && relationship?.semantic_downstream && relationship.semantic_upstream === relationship.semantic_downstream) errors.push(`${path} semantic_upstream 与 semantic_downstream 不能相同`);
  }

  requireArray(data, "scenarios", "root", errors, 1, "object");
  const scenarios = list(data.scenarios) ? data.scenarios : [];
  const scenarioIds = scenarios.map((item) => item?.scenario_id).filter(Boolean);
  unique(scenarioIds, "scenario_id", errors);
  for (const [index, scenario] of scenarios.entries()) {
    const path = `scenarios[${index}]`;
    for (const field of ["scenario_id", "actor", "responsible_context", "status"]) requireString(scenario ?? {}, field, path, errors);
    for (const field of ["preconditions", "commands", "rules", "events", "failure_results", "consumers"]) requireArray(scenario ?? {}, field, path, errors, field === "commands" || field === "rules" || field === "failure_results" ? 1 : 0);
    if (scenario?.scenario_id && !idPatterns.scenario_id.test(scenario.scenario_id)) errors.push(`${path}.scenario_id 格式非法`);
    if (scenario?.responsible_context && !contextIds.includes(scenario.responsible_context)) errors.push(`${path}.responsible_context 未声明`);
    for (const consumer of scenario?.consumers ?? []) if (!contextIds.includes(consumer)) errors.push(`${path}.consumers 引用了未声明上下文: ${consumer}`);
  }

  const concepts = list(data.concept_candidates) ? data.concept_candidates : [];
  unique(concepts.map((item) => item?.concept_id).filter(Boolean), "concept_id", errors);
  for (const [index, concept] of concepts.entries()) {
    const path = `concept_candidates[${index}]`;
    for (const field of ["concept_id", "name", "context_id", "confidence", "status"]) requireString(concept ?? {}, field, path, errors);
    for (const field of ["identity_features", "lifecycle"]) requireArray(concept ?? {}, field, path, errors, 1);
    if (concept?.concept_id && !idPatterns.concept_id.test(concept.concept_id)) errors.push(`${path}.concept_id 格式非法`);
    if (concept?.context_id && !contextIds.includes(concept.context_id)) errors.push(`${path}.context_id 未声明`);
    if (concept?.confidence && !["low", "medium", "high"].includes(concept.confidence)) errors.push(`${path}.confidence 非法`);
  }

  const invariants = list(data.invariants) ? data.invariants : [];
  unique(invariants.map((item) => item?.invariant_id).filter(Boolean), "invariant_id", errors);
  for (const [index, invariant] of invariants.entries()) {
    const path = `invariants[${index}]`;
    for (const field of ["invariant_id", "statement", "responsible_context", "verification_method"]) requireString(invariant ?? {}, field, path, errors);
    requireArray(invariant ?? {}, "scenario_refs", path, errors, 1);
    if (invariant?.invariant_id && !idPatterns.invariant_id.test(invariant.invariant_id)) errors.push(`${path}.invariant_id 格式非法`);
    if (invariant?.responsible_context && !contextIds.includes(invariant.responsible_context)) errors.push(`${path}.responsible_context 未声明`);
    for (const reference of invariant?.scenario_refs ?? []) if (!scenarioIds.includes(reference)) errors.push(`${path}.scenario_refs 引用了未声明场景: ${reference}`);
  }

  try {
    verifyContextSnapshot(data.context_snapshot, { root: contextRoot, allowedContextIds: contextIds });
  } catch (error) {
    errors.push(...(error.problems ?? [error.message]));
  }
  requireArray(data, "evidence_refs", "root", errors, 1);
  const mappings = list(data.downstream_mapping) ? data.downstream_mapping : [];
  for (const [index, mapping] of mappings.entries()) {
    const path = `downstream_mapping[${index}]`;
    for (const field of ["domain_change", "propagation", "reapproval_condition"]) requireString(mapping ?? {}, field, path, errors);
    requireArray(mapping ?? {}, "impacts", path, errors, 1);
    if (mapping?.propagation && !["direct", "transitive", "stale"].includes(mapping.propagation)) errors.push(`${path}.propagation 非法`);
  }
  const approval = data.approval ?? {};
  for (const field of ["approval_ref", "approver", "persisted_ref", "current_version"]) requireString(approval, field, "approval", errors);
  if (data.status === "approved") {
    if (contexts.some((context) => context.status !== "confirmed")) errors.push("approved 合同要求所有上下文 status=confirmed");
    if (approval.current_version !== data.domain_version) errors.push("approval.current_version 必须等于 domain_version");
    try {
      const approvalPath = resolveApprovalRef(approval.approval_ref);
      validateApprovalRecordFile(approvalPath, { requireApproved: true });
      const record = loadApprovalRecord(approvalPath);
      if (record.gate_id !== "gate.domain-strategy-approved") errors.push("approval.approval_ref 的 gate_id 必须为 gate.domain-strategy-approved");
      if (record.role_id !== approval.approver) errors.push("approval.approver 必须与会签记录 role_id 一致");
    } catch (error) { errors.push(`approval.approval_ref 会签记录无效: ${error.message}`); }
  }
  return errors;
}

const { values, positionals } = parseArgs({ options: { root: { type: "string", default: process.cwd() } }, allowPositionals: true, strict: true });
const file = positionals[0];
if (!file) fail(["用法: validate-domain-strategy.mjs <contract.yaml> [--root <project-root>]"]);
else {
  try {
    const source = await readFile(file, "utf8");
    const document = parseDocument(source, { maxAliasCount: 0, uniqueKeys: true });
    if (document.errors.length) fail([document.errors[0].message]);
    else {
      const errors = validate(document.toJS({ maxAliasCount: 0 }), values.root);
      if (errors.length) fail(errors);
      else process.stdout.write(JSON.stringify({ result: "completed", contract: file }, null, 2) + "\n");
    }
  } catch (error) { fail([error.message]); }
}
