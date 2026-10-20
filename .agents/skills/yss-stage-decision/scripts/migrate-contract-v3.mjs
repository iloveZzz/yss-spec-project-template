#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { parseDocument } from "../../../../scripts/vendor/yaml.mjs";
import { validateAssetStructure } from "../../../../scripts/lib/structured-assets.mjs";

function blocked(message) {
  process.stderr.write(`${JSON.stringify({ result: "blocked", reason_code: "migration-required", errors: [message] }, null, 2)}\n`);
  process.exitCode = 1;
}

function parse(source, label) {
  const document = parseDocument(source, { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length) throw new TypeError(`${label} YAML 非法: ${document.errors[0].message}`);
  const value = document.toJS({ maxAliasCount: 0 });
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} 必须是对象`);
  return value;
}

function nextVersion(value) {
  const matched = String(value ?? "v2").match(/^v(\d+)$/);
  return `v${Math.max(3, Number(matched?.[1] ?? 2) + 1)}`;
}

function token(value, fallback) {
  const normalized = String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return normalized || fallback;
}

function resetApproval(value, version, context) {
  value.status = "draft";
  value.approval = {
    ...(context ? { schema_version: 2, approval_context: context } : { approver: "unassigned" }),
    approval_ref: "migration-required",
    persisted_ref: value.approval?.persisted_ref || "migration-output-not-persisted",
    current_version: version
  };
}

function migrateDomain(input, context) {
  const output = structuredClone(input);
  if (output.schema_version !== 2) throw new TypeError("Domain Strategy 迁移仅支持 schema_version: 2");
  const evidence = Array.isArray(output.evidence_refs) && output.evidence_refs.length ? output.evidence_refs : ["migration-required:evidence"];
  const rules = [];
  const statementToId = new Map();
  for (const [scenarioIndex, scenario] of (output.scenarios ?? []).entries()) {
    scenario.rule_refs = [];
    for (const [ruleIndex, statement] of (scenario.rules ?? []).entries()) {
      let ruleId = statementToId.get(statement);
      if (!ruleId) {
        ruleId = `rule.${token(scenario.scenario_id?.replace(/^scenario\./, ""), `scenario-${scenarioIndex + 1}`)}-${ruleIndex + 1}`;
        statementToId.set(statement, ruleId);
        rules.push({ rule_id: ruleId, statement, responsible_context: scenario.responsible_context, status: "confirmed", evidence_refs: [...evidence] });
      }
      scenario.rule_refs.push(ruleId);
    }
    scenario.critical = false;
    scenario.success_results = Array.isArray(scenario.events) && scenario.events.length ? [...scenario.events] : ["migration-required: 补充成功结果"];
    scenario.evidence_refs = [...evidence];
  }
  for (const [index, invariant] of (output.invariants ?? []).entries()) {
    let ruleId = statementToId.get(invariant.statement);
    if (!ruleId) {
      ruleId = `rule.${token(invariant.invariant_id?.replace(/^invariant\./, ""), `invariant-${index + 1}`)}`;
      statementToId.set(invariant.statement, ruleId);
      rules.push({ rule_id: ruleId, statement: invariant.statement, responsible_context: invariant.responsible_context, status: "confirmed", evidence_refs: [...evidence] });
    }
    invariant.rule_ref = ruleId;
    invariant.evidence_refs = [...evidence];
  }
  const sourceRefs = [...(output.scenarios ?? []).map((item) => item.scenario_id), ...(output.invariants ?? []).map((item) => item.invariant_id)].filter(Boolean);
  output.downstream_mapping = (output.downstream_mapping ?? []).map((mapping, index) => {
    const impacts = Array.isArray(mapping.impacts) ? mapping.impacts : ["migration-required"];
    const isFrontend = impacts.some((item) => /frontend|ui|visual/i.test(item));
    return {
      mapping_id: `mapping.${token(mapping.domain_change, `migrated-${index + 1}`)}`,
      source_refs: sourceRefs.length ? sourceRefs : [rules[0]?.rule_id].filter(Boolean),
      consumer_capability: isFrontend ? "frontend-engineering-design" : "backend-technical-design",
      impacts,
      propagation: mapping.propagation,
      reapproval_condition: mapping.reapproval_condition,
      evidence_refs: [...evidence]
    };
  });
  output.schema_version = 3;
  output.traceability_version = 1;
  output.rule_catalog = rules;
  output.domain_version = nextVersion(output.domain_version);
  resetApproval(output, output.domain_version, context);
  return output;
}

async function migrateStage(input, root, context) {
  const output = structuredClone(input);
  if (output.schema_version !== 2) throw new TypeError("Stage Decision 迁移仅支持 schema_version: 2");
  const evidence = Array.isArray(output.evidence_refs) && output.evidence_refs.length ? output.evidence_refs : ["migration-required:evidence"];
  let sourceRefs = [];
  try {
    const domainSource = await readFile(resolve(root, output.domain_strategy_ref.persisted_ref), "utf8");
    const domain = parse(domainSource, "Domain Strategy");
    sourceRefs = [...(domain.rule_catalog ?? []).map((item) => item.rule_id), ...(domain.scenarios ?? []).map((item) => item.scenario_id), ...(domain.invariants ?? []).map((item) => item.invariant_id)].filter(Boolean);
  } catch {
    sourceRefs = [];
  }
  const prefixes = { success_criteria: "success-criterion", test_seams: "test-seam", confirmed_decisions: "decision", assumptions: "assumption", constraints: "constraint" };
  for (const [field, prefix] of Object.entries(prefixes)) {
    output[field] = (output[field] ?? []).map((statement, index) => ({
      id: `${prefix}.${token(statement, `migrated-${index + 1}`)}`,
      statement,
      source_refs: sourceRefs.slice(0, 1),
      evidence_refs: [...evidence],
      status: "candidate"
    }));
  }
  output.downstream_mapping = (output.downstream_mapping ?? []).map((mapping, index) => ({
    mapping_id: `mapping.${token(mapping.domain_change, `migrated-${index + 1}`)}`,
    source_refs: sourceRefs.slice(0, 1),
    consumer_capability: /frontend|ui/i.test(mapping.consumer ?? "") ? "frontend-engineering-design" : /coord/i.test(mapping.consumer ?? "") ? "delivery-coordination" : "backend-technical-design",
    propagation: mapping.propagation,
    reapproval_condition: mapping.reapproval_condition,
    evidence_refs: [...evidence]
  }));
  output.schema_version = 3;
  output.package_version = nextVersion(output.package_version);
  resetApproval(output, output.package_version, context);
  return output;
}

try {
  const { values, positionals } = parseArgs({
    options: { kind: { type: "string" }, root: { type: "string", default: process.cwd() }, "approval-context": { type: "string" }, "target-version": {type:"string",default:"4"} },
    allowPositionals: true,
    strict: true
  });
  const file = positionals[0];
  if (!file || !["domain-strategy", "stage-decision"].includes(values.kind)) throw new TypeError("用法: migrate-contract-v3.mjs <contract.yaml> --kind <domain-strategy|stage-decision> [--root <project-root>] [--approval-context <context.json>]");
  const value = parse(await readFile(file, "utf8"), "合同");
  const identity = parse(await readFile(resolve(values.root, "yss-project.yaml"), "utf8"), "项目身份");
  if (![1, 2].includes(identity.schema_version) || !["template-source", "project-instance"].includes(identity.repository_mode)
    || (identity.schema_version === 2 && identity.repository_mode !== "project-instance")) throw new TypeError("项目身份不受支持");
  if(!["3","4"].includes(values["target-version"]))throw new TypeError("target-version 必须为 3 或 4");
  const context = values["approval-context"]
    ? parse(await readFile(resolve(values.root, values["approval-context"]), "utf8"), "批准上下文")
    : value.approval?.schema_version === 2 ? value.approval.approval_context : undefined;
  if (values["target-version"]==="3" && !context && (identity.schema_version === 2 || value.schema_version === 3)) {
    throw new TypeError("当前批准注解迁移需要 --approval-context <context.json>，提供实际 Plan 审阅主体、范围和依据；不生成角色或批准证据");
  }
  let migrated;
  if (value.schema_version === 3) {
    migrated = structuredClone(value);
    const version = values.kind === "domain-strategy" ? "domain_version" : "package_version";
    migrated[version] = nextVersion(migrated[version]);
    resetApproval(migrated, migrated[version], context);
  } else {
    migrated = values.kind === "domain-strategy" ? migrateDomain(value, context) : await migrateStage(value, values.root, context);
  }
  if(values["target-version"]==="4") {
    migrated.schema_version=4;migrated.status="draft";delete migrated.approval;
    if(values.kind==="stage-decision")migrated.domain_strategy_ref.status="ready";
  }
  if (context||values["target-version"]==="4") validateAssetStructure(migrated, values.kind === "domain-strategy" ? "domain-strategy" : "stage-decision-package");
  process.stdout.write(`${JSON.stringify(migrated, null, 2)}\n`);
} catch (error) {
  blocked(error.message);
}
