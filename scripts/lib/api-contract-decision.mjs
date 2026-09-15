import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "../vendor/yaml.mjs";
import { validateJsonSchema } from "./json-schema.mjs";
import { openApiDigest, resolveOpenApiRef, validateOpenApiDraftValidationRecord } from "./openapi-draft-validation.mjs";

const TEMPLATE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCHEMA = path.join(TEMPLATE_ROOT, "docs/process/schemas/api-contract-decision.schema.json");
const fail = (message) => { throw new TypeError(message); };
const readBound = (root, ref, label) => {
  const file = resolveOpenApiRef(root, ref);
  const bytes = readFileSync(file);
  return { file, bytes, digest: openApiDigest(bytes), label };
};
const requireDigest = (asset, expected) => { if (asset.digest !== expected) fail(`${asset.label}摘要漂移`); };

export function validateApiContractDecision(binding, { root = TEMPLATE_ROOT } = {}) {
  if (!binding || !binding.ref || !binding.version || !binding.digest || !["required", "not-applicable"].includes(binding.impact)) fail("缺少 API Contract Decision 当前版本绑定");
  const projectRoot = path.resolve(root);
  const decisionAsset = readBound(projectRoot, binding.ref, "API Contract Decision");
  requireDigest(decisionAsset, binding.digest);
  const document = parseDocument(decisionAsset.bytes.toString("utf8"), { uniqueKeys: true, maxAliasCount: 0 });
  if (document.errors.length) fail(`API Contract Decision 无法解析: ${document.errors[0].message}`);
  const decision = document.toJS({ maxAliasCount: 0 });
  validateJsonSchema(decision, SCHEMA, { cwd: TEMPLATE_ROOT, label: "API Contract Decision v1" });
  if (decision.decision_version !== binding.version || decision.impact !== binding.impact) fail("API Contract Decision 版本或影响结论与合同不一致");
  requireDigest(readBound(projectRoot, decision.assessment_ref, "API 影响评估"), decision.assessment_digest);
  for (const ref of decision.evidence_refs) readBound(projectRoot, ref, "API Decision 证据");
  if (decision.impact === "not-applicable") return { decision, binding: { ref: binding.ref, version: binding.version, digest: binding.digest, impact: decision.impact } };

  const draft = readBound(projectRoot, decision.openapi.ref, "OpenAPI YAML");
  requireDigest(draft, decision.openapi.digest);
  const validation = readBound(projectRoot, decision.validation_record.ref, "OpenAPI Validation");
  requireDigest(validation, decision.validation_record.digest);
  const review = readBound(projectRoot, decision.draft_review.ref, "OpenAPI Draft Review");
  requireDigest(review, decision.draft_review.digest);
  const reviewDocument = parseDocument(review.bytes.toString("utf8"), { uniqueKeys: true, maxAliasCount: 0 });
  if (reviewDocument.errors.length) fail(`OpenAPI Draft Review 无法解析: ${reviewDocument.errors[0].message}`);
  const reviewRecord = reviewDocument.toJS({ maxAliasCount: 0 });
  if (reviewRecord?.result !== "approved" || !Array.isArray(reviewRecord.blocking_findings) || reviewRecord.blocking_findings.length > 0) fail("OpenAPI Draft Review 实际记录未批准或仍有阻断项");
  if (reviewRecord.draft_ref !== decision.openapi.ref || reviewRecord.draft_digest !== decision.openapi.digest) fail("OpenAPI Draft Review 实际记录未绑定当前权威 YAML");
  for (const ref of decision.draft_review.evidence_refs) readBound(projectRoot, ref, "OpenAPI Draft Review 证据");
  const validated = validateOpenApiDraftValidationRecord(validation.file, { root: projectRoot });
  if (validated.record.draft.ref !== decision.openapi.ref || validated.draftDigest !== decision.openapi.digest) fail("OpenAPI Validation 未绑定当前权威 YAML");
  if (decision.draft_review.draft_ref !== decision.openapi.ref || decision.draft_review.draft_digest !== decision.openapi.digest || decision.draft_review.blocking_findings.length) fail("OpenAPI Draft Review 未批准当前权威 YAML");
  if (decision.freeze.version !== decision.openapi.version || decision.freeze.draft_ref !== decision.openapi.ref || decision.freeze.draft_digest !== decision.openapi.digest) fail("OpenAPI Freeze 未绑定当前权威 YAML 版本和摘要");
  return { decision, openapi: decision.openapi, binding: { ref: binding.ref, version: binding.version, digest: binding.digest, impact: decision.impact } };
}
