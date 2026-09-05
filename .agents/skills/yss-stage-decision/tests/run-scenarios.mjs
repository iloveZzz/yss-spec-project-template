#!/usr/bin/env node
import { buildDecisionFixture } from "../../../../scripts/fixtures/user-decision/build-fixture.mjs";
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

const temporaryRoot = await mkdtemp(join(tmpdir(), "yss-stage-decision-v2-"));
try {
  await writeFile(join(temporaryRoot, "CONTEXT.md"), contextSource);
  const contextResult = spawnSync(process.execPath, [contextValidator, "--root", temporaryRoot, "--allowed-context", "SupplierManagement", "--allowed-context", "ComplianceReview", "--allowed-context", "ProcurementExecution", "--term-ref", "Global/Supplier", "--term-ref", "ComplianceReview/AdmissionDecision", "--json"], { cwd: projectRoot, encoding: "utf8" });
  if (contextResult.status !== 0) throw new Error(`context fixture should pass: ${contextResult.stderr}`);
  const context = JSON.parse(contextResult.stdout);

  const domainApprovalRef = join(temporaryRoot, "domain-approval.json");
  const domainSource = (await readFile(validTemplate, "utf8"))
    .replace(".agents/skills/yss-stage-decision/tests/fixtures/domain-strategy-approval.yaml", domainApprovalRef)
    .replace("<document-digest>", context.document_digest)
    .replace("<referenced-terms-digest>", context.referenced_terms_digest);
  const domainFile = join(temporaryRoot, "domain-strategy.yaml");
  await writeFile(domainFile, domainSource);
  const domainDecision = buildDecisionFixture(join(temporaryRoot, "domain-decision"), { boundary: "gate.domain-strategy-approved", subjectRef: domainFile });
  const domainApproval = parseDocument(await readFile(join(testsRoot, "fixtures/domain-strategy-approval.yaml"), "utf8")).toJS();
  await writeFile(domainApprovalRef, JSON.stringify({ ...domainApproval, subject_ref: domainFile, approval_scope: domainDecision.requirement.scope, user_decision_ref: domainDecision.ref }));
  const pass = run(validator, domainFile, temporaryRoot);
  if (pass.status !== 0) throw new Error(`valid v2 fixture should pass: ${pass.stderr}`);

  const legacyFile = join(temporaryRoot, "legacy-domain.yaml");
  await writeFile(legacyFile, domainSource.replace("schema_version: 2", "schema_version: 1"));
  expectBlocked(run(validator, legacyFile, temporaryRoot), /migration-required/, "legacy domain contract");

  const migratableLegacy = join(temporaryRoot, "migratable-legacy-domain.yaml");
  const migratableLegacySource = domainSource
    .replace("schema_version: 2", "schema_version: 1")
    .replace(/context_snapshot:\n[\s\S]*?\ndownstream_mapping:/, "terminology_refs: [CONTEXT.md#Supplier, contexts/ComplianceReview/CONTEXT.md#AdmissionDecision]\ndownstream_mapping:");
  await writeFile(migratableLegacy, migratableLegacySource);
  const migrated = spawnSync(process.execPath, [migrationTool, migratableLegacy, "--root", temporaryRoot], { cwd: projectRoot, encoding: "utf8" });
  if (migrated.status !== 0) throw new Error(`migratable v1 contract should migrate: ${migrated.stderr}`);
  const migratedValue = JSON.parse(migrated.stdout);
  if (migratedValue.schema_version !== 2 || migratedValue.terminology_refs !== undefined || migratedValue.context_snapshot.context_ref !== "CONTEXT.md" || migratedValue.context_snapshot.term_refs.join(",") !== "ComplianceReview/AdmissionDecision,Global/Supplier") throw new Error("migrated context snapshot is incomplete");

  const ambiguousLegacy = join(temporaryRoot, "ambiguous-legacy-domain.yaml");
  await writeFile(ambiguousLegacy, migratableLegacySource.replace("CONTEXT.md#Supplier, contexts/ComplianceReview/CONTEXT.md#AdmissionDecision", "contexts/ComplianceReview/CONTEXT.md"));
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

  const packageApprovalRef = join(temporaryRoot, "package-approval.json");
  const packageSource = (await readFile(validPackageTemplate, "utf8"))
    .replace(".agents/skills/yss-stage-decision/tests/fixtures/stage-decision-approval.yaml", packageApprovalRef)
    .replace("<document-digest>", context.document_digest)
    .replace("<referenced-terms-digest>", context.referenced_terms_digest)
    .replace("<domain-strategy-digest>", digestYaml(domainSource));
  const packageFile = join(temporaryRoot, "stage-decision.yaml");
  await writeFile(packageFile, packageSource);
  const packageDecision = buildDecisionFixture(join(temporaryRoot, "package-decision"), { boundary: "gate.stage-decision-package-approved", subjectRef: packageFile });
  const packageApproval = parseDocument(await readFile(join(testsRoot, "fixtures/stage-decision-approval.yaml"), "utf8")).toJS();
  await writeFile(packageApprovalRef, JSON.stringify({ ...packageApproval, subject_ref: packageFile, approval_scope: packageDecision.requirement.scope, user_decision_ref: packageDecision.ref }));
  const packagePass = run(packageValidator, packageFile, temporaryRoot);
  if (packagePass.status !== 0) throw new Error(`valid v2 stage decision package should pass: ${packagePass.stderr}`);

  const packageLegacy = join(temporaryRoot, "legacy-stage-decision.yaml");
  await writeFile(packageLegacy, packageSource.replace("schema_version: 2", "schema_version: 1"));
  expectBlocked(run(packageValidator, packageLegacy, temporaryRoot), /migration-required/, "legacy stage decision contract");

  const packageBlocker = join(temporaryRoot, "stage-decision-blocker.yaml");
  await writeFile(packageBlocker, packageSource.replace("type: deferred", "type: blocker"));
  expectBlocked(run(packageValidator, packageBlocker, temporaryRoot), /blocker/, "blocker package");

  const packageWrongArray = join(temporaryRoot, "stage-decision-wrong-array.yaml");
  await writeFile(packageWrongArray, packageSource.replace("target_users: [采购专员、合规专员]", "target_users: [42]"));
  expectBlocked(run(packageValidator, packageWrongArray, temporaryRoot), /target_users\[0\]/, "package non-string array item");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
process.stdout.write("业务边界与规则设计 v2 场景验证通过\n");
