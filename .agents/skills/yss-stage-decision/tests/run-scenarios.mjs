#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { parseDocument } from "../../../../scripts/vendor/yaml.mjs";

const testsRoot = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(testsRoot, "../../../..");
const validator = join(testsRoot, "..", "scripts", "validate-domain-strategy.mjs");
const packageValidator = join(testsRoot, "..", "scripts", "validate-stage-decision-package.mjs");
const contextValidator = join(projectRoot, "scripts", "verify-context-contract");
const migrationTool = join(testsRoot, "..", "scripts", "migrate-context-references.mjs");
const v3MigrationTool = join(testsRoot, "..", "scripts", "migrate-contract-v3.mjs");
const validTemplate = join(testsRoot, "fixtures", "valid-supplier-domain.yaml");
const validPackageTemplate = join(testsRoot, "fixtures", "valid-stage-decision-package.yaml");

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

function digestYaml(source) {
  const document = parseDocument(source, { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length) throw new Error(document.errors[0].message);
  return `sha256:${createHash("sha256").update(JSON.stringify(canonical(document.toJS({ maxAliasCount: 0 })))).digest("hex")}`;
}

function parseYaml(source) {
  const document = parseDocument(source, { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length) throw new Error(document.errors[0].message);
  return document.toJS({ maxAliasCount: 0 });
}

function toV2Domain(source) {
  const value = structuredClone(parseYaml(source));
  value.schema_version = 2;
  value.domain_version = "v2";
  delete value.traceability_version;
  delete value.rule_catalog;
  for (const scenario of value.scenarios) {
    delete scenario.rule_refs;
    delete scenario.critical;
    delete scenario.success_results;
    delete scenario.evidence_refs;
  }
  for (const invariant of value.invariants) {
    delete invariant.rule_ref;
    delete invariant.evidence_refs;
  }
  value.downstream_mapping = [{
    domain_change: "admission-decision-validity",
    impacts: ["spec", "openapi", "procurement-acceptance-tests"],
    propagation: "stale",
    reapproval_condition: "ComplianceReview 决定和有效期重新批准"
  }];
  value.approval.current_version = "v2";
  return value;
}

function toV2Stage(source, domainDigest) {
  const value = structuredClone(parseYaml(source));
  value.schema_version = 2;
  value.package_version = "v2";
  for (const field of ["success_criteria", "test_seams", "confirmed_decisions", "assumptions", "constraints"]) {
    value[field] = value[field].map((item) => item.statement);
  }
  value.domain_strategy_ref.domain_version = "v2";
  value.domain_strategy_ref.digest = domainDigest;
  value.domain_strategy_ref.persisted_ref = "domain-strategy-v2.yaml";
  value.downstream_mapping = [{
    domain_change: "admission-decision-validity",
    consumer: "spec-synthesis",
    propagation: "direct",
    reapproval_condition: "领域策略版本或有效性规则变化"
  }];
  value.approval.current_version = "v2";
  return value;
}

function run(command, file, contextRoot) {
  return spawnSync(process.execPath, [command, file, "--root", contextRoot], { cwd: projectRoot, encoding: "utf8" });
}

function expectBlocked(result, pattern, label) {
  if (result.status === 0 || !pattern.test(`${result.stdout}\n${result.stderr}`)) throw new Error(`${label} should be blocked: ${result.stderr}`);
}

const contextSource = `---
context_schema_version: 1
---
# 领域上下文

## 流程术语

| 术语 | 含义 | 英文标识 | 避免 / 备注 |
|---|---|---|---|
| Spec | 产品研发规格。 | — |  |

## 业务术语

| 术语 | 含义 | 英文标识 | 适用业务责任区 | 避免 / 备注 |
|---|---|---|---|---|
| 供应商 | 提供商品或服务的业务主体。 | Supplier | Global | 避免：\`厂商\` |
| 准入决定 | 合规审查形成的准入结论。 | AdmissionDecision | ComplianceReview | 避免：\`审批结果\` |
`;

const temporaryRoot = await mkdtemp(join(tmpdir(), "yss-stage-decision-v3-"));
try {
  await writeFile(join(temporaryRoot, "CONTEXT.md"), contextSource);
  const contextResult = spawnSync(process.execPath, [contextValidator, "--root", temporaryRoot, "--allowed-context", "SupplierManagement", "--allowed-context", "ComplianceReview", "--allowed-context", "ProcurementExecution", "--term-ref", "Global/Supplier", "--term-ref", "ComplianceReview/AdmissionDecision", "--json"], { cwd: projectRoot, encoding: "utf8" });
  if (contextResult.status !== 0) throw new Error(`context fixture should pass: ${contextResult.stderr}`);
  const context = JSON.parse(contextResult.stdout);

  const domainSource = (await readFile(validTemplate, "utf8"))
    .replace("<document-digest>", context.document_digest)
    .replace("<referenced-terms-digest>", context.referenced_terms_digest);
  const domainFile = join(temporaryRoot, "domain-strategy.yaml");
  await writeFile(domainFile, domainSource);
  const pass = run(validator, domainFile, temporaryRoot);
  if (pass.status !== 0) throw new Error(`valid v3 fixture should pass: ${pass.stderr}`);

  const v2Domain = toV2Domain(domainSource);
  const v2DomainSource = JSON.stringify(v2Domain, null, 2);
  const v2DomainFile = join(temporaryRoot, "domain-strategy-v2.yaml");
  await writeFile(v2DomainFile, v2DomainSource);
  const v2Pass = run(validator, v2DomainFile, temporaryRoot);
  if (v2Pass.status !== 0) throw new Error(`read-only v2 fixture should pass: ${v2Pass.stderr}`);

  const migratedDomainV3 = spawnSync(process.execPath, [v3MigrationTool, v2DomainFile, "--kind", "domain-strategy", "--root", temporaryRoot], { cwd: projectRoot, encoding: "utf8" });
  if (migratedDomainV3.status !== 0) throw new Error(`v2 domain strategy should migrate: ${migratedDomainV3.stderr}`);
  const migratedDomainV3Value = JSON.parse(migratedDomainV3.stdout);
  if (migratedDomainV3Value.schema_version !== 3 || migratedDomainV3Value.status !== "draft" || migratedDomainV3Value.approval.approval_ref !== "migration-required") throw new Error("domain v2 -> v3 migration must reset approval and status");

  const duplicateRule = join(temporaryRoot, "duplicate-rule.yaml");
  const duplicateRuleValue = parseYaml(domainSource);
  duplicateRuleValue.rule_catalog.push(structuredClone(duplicateRuleValue.rule_catalog[0]));
  await writeFile(duplicateRule, JSON.stringify(duplicateRuleValue, null, 2));
  expectBlocked(run(validator, duplicateRule, temporaryRoot), /rule_id.*重复|重复.*rule_id/, "duplicate v3 rule id");

  const danglingRule = join(temporaryRoot, "dangling-rule.yaml");
  const danglingRuleValue = parseYaml(domainSource);
  danglingRuleValue.scenarios[0].rule_refs = ["rule.missing"];
  await writeFile(danglingRule, JSON.stringify(danglingRuleValue, null, 2));
  expectBlocked(run(validator, danglingRule, temporaryRoot), /rule_refs.*未声明|悬空/, "dangling v3 rule ref");

  const missingEvidence = join(temporaryRoot, "missing-rule-evidence.yaml");
  const missingEvidenceValue = parseYaml(domainSource);
  missingEvidenceValue.rule_catalog[0].evidence_refs = [];
  await writeFile(missingEvidence, JSON.stringify(missingEvidenceValue, null, 2));
  expectBlocked(run(validator, missingEvidence, temporaryRoot), /evidence_refs/, "missing v3 evidence");

  const legacyFile = join(temporaryRoot, "legacy-domain.yaml");
  await writeFile(legacyFile, JSON.stringify({ ...v2Domain, schema_version: 1 }, null, 2));
  expectBlocked(run(validator, legacyFile, temporaryRoot), /migration-required/, "legacy domain contract");

  const migratableLegacy = join(temporaryRoot, "migratable-legacy-domain.yaml");
  const migratableLegacyValue = { ...structuredClone(v2Domain), schema_version: 1, terminology_refs: ["CONTEXT.md#Supplier", "contexts/ComplianceReview/CONTEXT.md#AdmissionDecision"] };
  delete migratableLegacyValue.context_snapshot;
  const migratableLegacySource = JSON.stringify(migratableLegacyValue, null, 2);
  await writeFile(migratableLegacy, migratableLegacySource);
  const migrated = spawnSync(process.execPath, [migrationTool, migratableLegacy, "--root", temporaryRoot], { cwd: projectRoot, encoding: "utf8" });
  if (migrated.status !== 0) throw new Error(`migratable v1 contract should migrate: ${migrated.stderr}`);
  const migratedValue = JSON.parse(migrated.stdout);
  if (migratedValue.schema_version !== 2 || migratedValue.terminology_refs !== undefined || migratedValue.context_snapshot.context_ref !== "CONTEXT.md" || migratedValue.context_snapshot.term_refs.join(",") !== "ComplianceReview/AdmissionDecision,Global/Supplier") throw new Error("migrated context snapshot is incomplete");

  const ambiguousLegacy = join(temporaryRoot, "ambiguous-legacy-domain.yaml");
  await writeFile(ambiguousLegacy, JSON.stringify({ ...migratableLegacyValue, terminology_refs: ["contexts/ComplianceReview/CONTEXT.md"] }, null, 2));
  const ambiguousMigration = spawnSync(process.execPath, [migrationTool, ambiguousLegacy, "--root", temporaryRoot], { cwd: projectRoot, encoding: "utf8" });
  expectBlocked(ambiguousMigration, /migration-required.*无法唯一定位|无法唯一定位.*migration-required/, "ambiguous legacy reference");

  const wrongPath = join(temporaryRoot, "wrong-context-path.yaml");
  await writeFile(wrongPath, domainSource.replace("context_ref: CONTEXT.md", "context_ref: contexts/ComplianceReview/CONTEXT.md"));
  expectBlocked(run(validator, wrongPath, temporaryRoot), /context_ref.*CONTEXT\.md/, "nested context path");

  const staleContext = join(temporaryRoot, "stale-context.yaml");
  await writeFile(staleContext, domainSource.replace(context.document_digest, "sha256:stale"));
  expectBlocked(run(validator, staleContext, temporaryRoot), /document_digest/, "stale context digest");

  const invalidDirection = join(temporaryRoot, "invalid-direction.yaml");
  await writeFile(invalidDirection, domainSource.replace("direction_explanation: 申请资料由", "direction_explanation: \n    ignored: 申请资料由"));
  expectBlocked(run(validator, invalidDirection, temporaryRoot), /direction_explanation/, "missing direction explanation");

  const sharedKernel = join(temporaryRoot, "shared-kernel.yaml");
  await writeFile(sharedKernel, domainSource.replace("relationship_pattern: Customer/Supplier", "relationship_pattern: Shared Kernel"));
  expectBlocked(run(validator, sharedKernel, temporaryRoot), /shared_kernel_approval_ref/, "unapproved Shared Kernel");

  const unknownContext = join(temporaryRoot, "unknown-context.yaml");
  await writeFile(unknownContext, domainSource.replace("to_context: ComplianceReview", "to_context: UnknownContext"));
  expectBlocked(run(validator, unknownContext, temporaryRoot), /未引用已声明上下文|未在领域战略中登记/, "unknown context");

  const packageSource = (await readFile(validPackageTemplate, "utf8"))
    .replace("<document-digest>", context.document_digest)
    .replace("<referenced-terms-digest>", context.referenced_terms_digest)
    .replace("<domain-strategy-digest>", digestYaml(domainSource));
  const packageFile = join(temporaryRoot, "stage-decision.yaml");
  await writeFile(packageFile, packageSource);
  const packagePass = run(packageValidator, packageFile, temporaryRoot);
  if (packagePass.status !== 0) throw new Error(`valid v3 stage decision package should pass: ${packagePass.stderr}`);

  const v2Stage = toV2Stage(packageSource, digestYaml(v2DomainSource));
  const v2StageFile = join(temporaryRoot, "stage-decision-v2.yaml");
  await writeFile(v2StageFile, JSON.stringify(v2Stage, null, 2));
  const v2StagePass = run(packageValidator, v2StageFile, temporaryRoot);
  if (v2StagePass.status !== 0) throw new Error(`read-only v2 stage decision package should pass: ${v2StagePass.stderr}`);

  const migratedV3 = spawnSync(process.execPath, [v3MigrationTool, v2StageFile, "--kind", "stage-decision", "--root", temporaryRoot], { cwd: projectRoot, encoding: "utf8" });
  if (migratedV3.status !== 0) throw new Error(`v2 stage decision should migrate: ${migratedV3.stderr}`);
  const migratedV3Value = JSON.parse(migratedV3.stdout);
  if (migratedV3Value.schema_version !== 3 || migratedV3Value.status !== "draft" || migratedV3Value.approval.approval_ref !== "migration-required") throw new Error("v2 -> v3 migration must reset approval and status");

  const wrongSourceRef = join(temporaryRoot, "stage-decision-wrong-source-ref.yaml");
  const wrongSourceRefValue = parseYaml(packageSource);
  wrongSourceRefValue.success_criteria[0].source_refs = ["rule.missing"];
  await writeFile(wrongSourceRef, JSON.stringify(wrongSourceRefValue, null, 2));
  expectBlocked(run(packageValidator, wrongSourceRef, temporaryRoot), /source_refs.*未在领域战略中声明|悬空/, "stage decision dangling source ref");

  const packageLegacy = join(temporaryRoot, "legacy-stage-decision.yaml");
  await writeFile(packageLegacy, JSON.stringify({ ...v2Stage, schema_version: 1 }, null, 2));
  expectBlocked(run(packageValidator, packageLegacy, temporaryRoot), /migration-required/, "legacy stage decision contract");

  const packageBlocker = join(temporaryRoot, "stage-decision-blocker.yaml");
  const blockerValue = parseYaml(packageSource);
  blockerValue.unresolved_items[0].type = "blocker";
  await writeFile(packageBlocker, JSON.stringify(blockerValue, null, 2));
  expectBlocked(run(packageValidator, packageBlocker, temporaryRoot), /blocker/, "blocker package");

  const packageWrongArray = join(temporaryRoot, "stage-decision-wrong-array.yaml");
  const wrongArrayValue = parseYaml(packageSource);
  wrongArrayValue.target_users = [42];
  await writeFile(packageWrongArray, JSON.stringify(wrongArrayValue, null, 2));
  expectBlocked(run(packageValidator, packageWrongArray, temporaryRoot), /target_users\[0\]/, "package non-string array item");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
process.stdout.write("业务边界与规则设计 v2/v3 场景验证通过\n");
