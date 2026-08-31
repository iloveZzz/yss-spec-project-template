#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const root = dirname(fileURLToPath(import.meta.url));
const validator = join(root, "..", "scripts", "validate-domain-strategy.mjs");
const packageValidator = join(root, "..", "scripts", "validate-stage-decision-package.mjs");
const valid = join(root, "fixtures", "valid-supplier-domain.yaml");
const invalid = join(root, "fixtures", "invalid-direction.yaml");
const validPackage = join(root, "fixtures", "valid-stage-decision-package.yaml");
const invalidPackage = join(root, "fixtures", "invalid-stage-decision-blocker.yaml");
const run = (file) => spawnSync(process.execPath, [validator, file], { encoding: "utf8" });
const pass = run(valid);
if (pass.status !== 0) throw new Error(`valid fixture should pass: ${pass.stderr}`);
const fail = run(invalid);
if (fail.status === 0 || !fail.stderr.includes("direction_explanation")) throw new Error("invalid direction fixture should be blocked");
const packagePass = spawnSync(process.execPath, [packageValidator, validPackage], { encoding: "utf8" });
if (packagePass.status !== 0) throw new Error(`valid stage decision package should pass: ${packagePass.stderr}`);
const packageFail = spawnSync(process.execPath, [packageValidator, invalidPackage], { encoding: "utf8" });
if (packageFail.status === 0 || !packageFail.stderr.includes("blocker")) throw new Error("blocker package should be blocked");

const temporaryRoot = await mkdtemp(join(tmpdir(), "yss-stage-decision-pressure-"));
try {
  const validSource = await readFile(valid, "utf8");
  const sharedKernel = join(temporaryRoot, "shared-kernel.yaml");
  await writeFile(sharedKernel, validSource.replace("relationship_pattern: Customer/Supplier", "relationship_pattern: Shared Kernel"));
  const sharedKernelResult = run(sharedKernel);
  if (sharedKernelResult.status === 0 || !sharedKernelResult.stderr.includes("shared_kernel_approval_ref")) throw new Error("unapproved Shared Kernel should be blocked");
  const unknownContext = join(temporaryRoot, "unknown-context.yaml");
  await writeFile(unknownContext, validSource.replace("to_context: ComplianceReview", "to_context: UnknownContext"));
  const unknownContextResult = run(unknownContext);
  if (unknownContextResult.status === 0 || !unknownContextResult.stderr.includes("未引用已声明上下文")) throw new Error("unknown context should be blocked");
  const wrongArrayType = join(temporaryRoot, "wrong-array-type.yaml");
  await writeFile(wrongArrayType, validSource.replace("responsibilities: [供应商申请、资料生命周期]", "responsibilities: [42]"));
  const wrongArrayTypeResult = run(wrongArrayType);
  if (wrongArrayTypeResult.status === 0 || !wrongArrayTypeResult.stderr.includes("responsibilities[0]")) throw new Error("non-string array item should be blocked");
  const missingSubdomainType = join(temporaryRoot, "missing-subdomain-type.yaml");
  await writeFile(missingSubdomainType, validSource.replace("    subdomain_type: Supporting Subdomain\n", ""));
  const missingSubdomainTypeResult = run(missingSubdomainType);
  if (missingSubdomainTypeResult.status === 0 || !missingSubdomainTypeResult.stderr.includes("subdomain_type 缺失")) throw new Error("missing subdomain type should be blocked");
  const wrongReferenceType = join(temporaryRoot, "wrong-reference-type.yaml");
  await writeFile(wrongReferenceType, validSource.replace("terminology_refs: [contexts/SupplierManagement/CONTEXT.md, contexts/ComplianceReview/CONTEXT.md]", "terminology_refs: [42]"));
  const wrongReferenceTypeResult = run(wrongReferenceType);
  if (wrongReferenceTypeResult.status === 0 || !wrongReferenceTypeResult.stderr.includes("terminology_refs[0]")) throw new Error("non-string terminology reference should be blocked");
  const emptyDomainCollections = join(temporaryRoot, "empty-domain-collections.yaml");
  await writeFile(emptyDomainCollections, validSource.replace(/contexts:\n[\s\S]*?subdomains:/, "contexts: []\nsubdomains:").replace(/subdomains:\n[\s\S]*?relationships:/, "subdomains: []\nrelationships:").replace(/scenarios:\n[\s\S]*?concept_candidates:/, "scenarios: []\nconcept_candidates:"));
  const emptyDomainCollectionsResult = run(emptyDomainCollections);
  if (emptyDomainCollectionsResult.status === 0 || !emptyDomainCollectionsResult.stderr.includes("contexts 必须是至少 1 项的数组")) throw new Error("empty DDD collections should be blocked");
  const wrongDomainApproval = join(temporaryRoot, "wrong-domain-approval.yaml");
  await writeFile(wrongDomainApproval, validSource.replace("approval_ref: .agents/skills/yss-stage-decision/tests/fixtures/domain-strategy-approval.yaml", "approval_ref: docs/.scratch/does-not-exist.yaml"));
  const wrongDomainApprovalResult = run(wrongDomainApproval);
  if (wrongDomainApprovalResult.status === 0 || !wrongDomainApprovalResult.stderr.includes("approval.approval_ref")) throw new Error("unreadable domain approval ref should be blocked");
  const packageSource = await readFile(validPackage, "utf8");
  const packageWrongArrayType = join(temporaryRoot, "package-wrong-array-type.yaml");
  await writeFile(packageWrongArrayType, packageSource.replace("target_users: [采购专员、合规专员]", "target_users: [42]"));
  const packageWrongArrayTypeResult = spawnSync(process.execPath, [packageValidator, packageWrongArrayType], { encoding: "utf8" });
  if (packageWrongArrayTypeResult.status === 0 || !packageWrongArrayTypeResult.stderr.includes("target_users[0]")) throw new Error("package non-string array item should be blocked");
  const packageWrongApproval = join(temporaryRoot, "package-wrong-approval.yaml");
  await writeFile(packageWrongApproval, packageSource.replace("approval_ref: .agents/skills/yss-stage-decision/tests/fixtures/stage-decision-approval.yaml", "approval_ref: docs/.scratch/does-not-exist.yaml"));
  const packageWrongApprovalResult = spawnSync(process.execPath, [packageValidator, packageWrongApproval], { encoding: "utf8" });
  if (packageWrongApprovalResult.status === 0 || !packageWrongApprovalResult.stderr.includes("approval_ref")) throw new Error("unreadable approval ref should be blocked");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
process.stdout.write("DDD strategic design scenarios passed\n");
