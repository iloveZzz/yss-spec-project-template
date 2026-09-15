import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import { loadApprovalRecord, validateApprovalRecord } from "./approval-record.mjs";
import { validateJsonSchema } from "./json-schema.mjs";
import { ROOT } from "./lifecycle-registry.mjs";
import { validateTechnicalDesign } from "../../.agents/skills/yss-technical-design/scripts/validate-technical-design.mjs";
import { validateApiContractDecision } from "./api-contract-decision.mjs";

const DATA_DECISION_SCHEMA = path.join(ROOT, "docs/process/schemas/data-architecture-decision.schema.json");

const fail = (message) => { throw new TypeError(message); };
const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const text = (value) => typeof value === "string" && value.trim().length > 0;

function resolveLocalRef(root, ref, label) {
  if (!text(ref) || /^[a-z][a-z0-9+.-]*:\/\//i.test(ref)) fail(`${label} 必须是可读取的本地文件引用`);
  const resolved = path.isAbsolute(ref) ? path.normalize(ref) : path.resolve(root, ref);
  if (!existsSync(resolved)) fail(`${label} 不可读取: ${ref}`);
  return resolved;
}

export function findGovernanceRoot(contractFile) {
  let current = path.dirname(path.resolve(contractFile));
  const fallback = current;
  while (true) {
    if (existsSync(path.join(current, "yss-project.yaml"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return fallback;
    current = parent;
  }
}

function readDocument(root, binding, label) {
  if (!binding || !text(binding.ref) || !text(binding.digest)) fail(`${label} 缺少 ref/digest`);
  const file = resolveLocalRef(root, binding.ref, label);
  const bytes = readFileSync(file);
  if (digest(bytes) !== binding.digest) fail(`${label} 原始字节摘要漂移`);
  const document = parseDocument(bytes.toString("utf8"), { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length) fail(`${label} 无法解析: ${document.errors[0].message}`);
  const value = document.toJS({ maxAliasCount: 0 });
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} 必须是对象`);
  return { file, bytes, value };
}

function requireReadableRefs(root, refs, label) {
  if (!Array.isArray(refs) || refs.length === 0) fail(`${label} 必须包含可读取证据`);
  for (const ref of refs) resolveLocalRef(root, ref, label);
}

function requireArtifactBinding(record, expected, label) {
  const binding = (record.artifact_bindings || []).find((item) => item?.id === expected.id);
  if (!binding || binding.version !== expected.version || binding.digest !== expected.digest) fail(`${label} 未绑定当前资产版本和摘要`);
}

function requireExactBinding(actual, expected, label, { impact = false, id = false } = {}) {
  const keys = ["ref", "version", "digest", ...(impact ? ["impact"] : []), ...(id ? ["id"] : [])];
  if (!actual || keys.some((key) => actual[key] !== expected[key])) fail(`${label} 未原子绑定当前资产`);
}

function requireEngineeringPackage(root, approval, contract, technical, data, api, prerequisites) {
  const packageFile = resolveLocalRef(root, approval.subject_ref, "工程合同批准主体");
  const packageDocument = parseDocument(readFileSync(packageFile, "utf8"), { maxAliasCount: 0, uniqueKeys: true });
  if (packageDocument.errors.length) fail(`工程合同批准主体无法解析: ${packageDocument.errors[0].message}`);
  const value = packageDocument.toJS({ maxAliasCount: 0 });
  if (value?.schema_version !== 1 || value?.kind !== "engineering-contract-package" || value?.project_id !== contract.project_name) fail("工程合同批准主体必须是当前项目的 engineering-contract-package v1");
  requireExactBinding(value.technical_design, { ...prerequisites.technical_design, version: technical.value.version }, "工程合同包 Technical Design");
  requireExactBinding(value.data_architecture_decision, { ...prerequisites.data_architecture_decision, version: data.value.decision_version, impact: data.value.impact }, "工程合同包 Data Architecture Decision", { impact: true });
  requireExactBinding(value.api_contract_decision, { ...prerequisites.api_contract_decision, version: api.decision.decision_version, impact: api.decision.impact }, "工程合同包 API Contract Decision", { impact: true });
  if (api.decision.impact === "required") {
    requireExactBinding(value.frozen_openapi, api.decision.openapi, "工程合同包冻结 OpenAPI", { id: true });
  } else if (Object.hasOwn(value, "frozen_openapi")) {
    fail("API not-applicable 的工程合同包禁止携带 frozen_openapi 占位字段");
  }
}

export async function validateBackendScaffoldPrerequisites(contract, { contractFile, root = findGovernanceRoot(contractFile) } = {}) {
  if (contract?.schema_version !== 4 || contract?.delivery_role !== "backend") fail("后端新生成只接受 Project Scaffold Contract v4");
  const prerequisites = contract.design_prerequisites;
  if (!prerequisites || typeof prerequisites !== "object") fail("后端脚手架合同缺少 design_prerequisites");

  const technical = readDocument(root, prerequisites.technical_design, "Technical Design");
  if (technical.value.schema_version !== 2 || technical.value.status !== "approved" || technical.value.version !== prerequisites.technical_design.version) fail("Technical Design 必须是 approved 的当前 v2 合同");
  if (technical.value.architecture?.family !== contract.architecture_family || technical.value.architecture?.project_id !== contract.project_name || technical.value.architecture?.decision_digest !== contract.decision_digest) fail("Technical Design 与脚手架架构决定不一致");
  await validateTechnicalDesign(technical.value, { root });

  const data = readDocument(root, prerequisites.data_architecture_decision, "数据架构决定");
  validateJsonSchema(data.value, DATA_DECISION_SCHEMA, { label: "Data Architecture Decision v1" });
  if (data.value.decision_version !== prerequisites.data_architecture_decision.version) fail("数据架构决定版本不匹配");
  const assessment = resolveLocalRef(root, data.value.assessment_ref, "数据影响评估");
  if (digest(readFileSync(assessment)) !== data.value.assessment_digest) fail("数据影响评估摘要漂移");
  requireReadableRefs(root, data.value.evidence_refs, "数据架构决定证据");
  if (data.value.impact === "required") {
    const architecture = resolveLocalRef(root, data.value.data_architecture_ref, "数据架构文档");
    if (digest(readFileSync(architecture)) !== data.value.data_architecture_digest) fail("数据架构文档摘要漂移");
    requireReadableRefs(root, data.value.review_evidence_refs, "数据架构评审证据");
  }

  const api = validateApiContractDecision(prerequisites.api_contract_decision, { root });

  const approvalRef = prerequisites.engineering_contract_approval_ref;
  if (approvalRef !== contract.lifecycle_approval_ref || approvalRef !== contract.approval?.approval_ref) fail("工程合同批准引用与脚手架合同不一致");
  const approvalFile = resolveLocalRef(root, approvalRef, "工程合同批准记录");
  const approval = loadApprovalRecord(approvalFile);
  validateApprovalRecord(approval, { requireApproved: true, root });
  if (approval.gate_id !== "gate.engineering-contract-approved") fail("工程合同批准记录 gate_id 必须为 gate.engineering-contract-approved");
  if (!Array.isArray(approval.approval_scope) || !approval.approval_scope.includes(contract.contract_id) || !approval.approval_scope.includes(contract.project_name)) fail("工程合同批准范围未覆盖当前合同和项目");
  requireEngineeringPackage(root, approval, contract, technical, data, api, prerequisites);
  requireArtifactBinding(approval, { id: technical.value.technical_design_id, version: technical.value.version, digest: prerequisites.technical_design.digest }, "工程合同批准记录");
  requireArtifactBinding(approval, { id: data.value.decision_id, version: data.value.decision_version, digest: prerequisites.data_architecture_decision.digest }, "工程合同批准记录");
  requireArtifactBinding(approval, { id: api.decision.decision_id, version: api.decision.decision_version, digest: prerequisites.api_contract_decision.digest }, "工程合同批准记录");
  if (api.decision.impact === "required") {
    requireArtifactBinding(approval, { id: api.decision.openapi.id, version: api.decision.openapi.version, digest: api.decision.openapi.digest }, "工程合同批准记录");
  }

  return {
    technical_design: { ref: prerequisites.technical_design.ref, version: technical.value.version, digest: prerequisites.technical_design.digest },
    data_architecture_decision: { ref: prerequisites.data_architecture_decision.ref, version: data.value.decision_version, digest: prerequisites.data_architecture_decision.digest, impact: data.value.impact },
    api_contract_decision: { ref: prerequisites.api_contract_decision.ref, version: api.decision.decision_version, digest: prerequisites.api_contract_decision.digest, impact: api.decision.impact },
    engineering_contract_approval_ref: approvalRef,
  };
}
