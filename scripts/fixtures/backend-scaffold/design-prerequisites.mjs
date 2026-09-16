// Synthetic design and approval sources for generator mechanism tests only.
import { countersignRuleForGate, loadDigitalHumanRoles } from "../../lib/digital-human-roles.mjs";
import { attachPlatformFixture } from "./platform-fixture.mjs";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDecisionFixture } from "../user-decision/build-fixture.mjs";
import { mvcFixture } from "../../../.agents/skills/yss-technical-design/tests/fixtures.mjs";
import { technicalDigest } from "../../../.agents/skills/yss-technical-design/scripts/validate-technical-design.mjs";
import { hash, read } from "../../lib/strategic-handoff-io.mjs";

function write(root, ref, value) {
  const file = path.join(root, ref);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
  return { ref, file, digest: hash(readFileSync(file)) };
}

function approvedTechnicalDesign(root, contract) {
  const data = mvcFixture(root);
  data.status = "approved";
  data.technical_design_id = `technical-design.${contract.project_name}`;
  data.architecture = {
    family: contract.architecture_family,
    project_id: contract.project_name,
    source_kind: "scaffold-decision",
    decision_ref: path.basename(contract.decision_ref),
    decision_digest: contract.decision_digest,
  };
  if (contract.architecture_family === "domain-driven") {
    const ddd = read(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../.agents/skills/yss-tactical-design/tests/fixtures/valid-tactical-design.yaml"));
    ddd.status = "approved";
    data.design = ddd;
    data.inputs.push({ kind: "strategic", ref: "spec.md", version: "v1", digest: hash(readFileSync(path.join(root, "spec.md"))) });
    for (const row of data.traceability) {
      row.tactical_refs = [ddd.test_seams[0].subject_ref];
      row.test_seam_refs = [ddd.test_seams[0].seam_id];
      row.scenario_tests = ["success", "failure"].map((outcome) => ({ outcome, seam_ref: ddd.test_seams[0].seam_id }));
    }
  }
  data.digest = technicalDigest(data);
  return write(root, "technical-design.json", data);
}

export function attachDesignPrerequisites(root, contract, { dataImpact = "not-applicable", apiImpact = "not-applicable" } = {}) {
  attachPlatformFixture(root, contract);
  const technical = approvedTechnicalDesign(root, contract);
  const assessment = write(root, "data-impact.json", { schema_version: 1, backend: true, data: dataImpact === "required", project_id: contract.project_name });
  const review = write(root, "data-review.md", "数据影响和数据架构评审测试证据；不构成真实项目批准。\n");
  const dataDecision = {
    schema_version: 1,
    kind: "data-architecture-decision",
    decision_id: `data-architecture.${contract.project_name}`,
    decision_version: "v1",
    status: "approved",
    current_version: true,
    impact: dataImpact,
    assessment_ref: assessment.ref,
    assessment_digest: assessment.digest,
    evidence_refs: [review.ref],
  };
  if (dataImpact === "required") {
    const architecture = write(root, "data-architecture.md", "# 数据架构\n\n概念模型、逻辑模型、存储、一致性、迁移和查询策略已评审。\n");
    Object.assign(dataDecision, { data_architecture_ref: architecture.ref, data_architecture_digest: architecture.digest, review_evidence_refs: [review.ref] });
  } else {
    dataDecision.reason = "当前机械后端骨架不绑定生产存储，数据模型、存储和一致性均无变化";
  }
  const data = write(root, "data-architecture-decision.json", dataDecision);
  const apiAssessment = write(root, "api-impact.json", { schema_version: 1, backend: true, api: apiImpact === "required", project_id: contract.project_name });
  const apiEvidence = write(root, "api-decision-evidence.md", "API 影响决定测试证据；不构成真实项目批准。\n");
  const apiDecision = {
    schema_version: 1,
    kind: "api-contract-decision",
    decision_id: `api-contract.${contract.project_name}`,
    decision_version: "v1",
    status: "approved",
    current_version: true,
    impact: apiImpact,
    assessment_ref: apiAssessment.ref,
    assessment_digest: apiAssessment.digest,
    evidence_refs: [apiEvidence.ref],
  };
  let openapi = null;
  if (apiImpact === "required") {
    const slug = contract.project_name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "demo";
    openapi = write(root, `docs/.scratch/${slug}/api/${slug}.yaml`, [
      "openapi: 3.1.0",
      "info:",
      `  title: ${contract.project_name} API`,
      "  version: 1.0.0",
      "paths:",
      "  /health:",
      "    get:",
      "      operationId: getHealth",
      "      responses:",
      "        '204':",
      "          description: healthy",
      "",
    ].join("\n"));
    write(root, "pnpm-lock.yaml", "lockfileVersion: '9.0'\npackages:\n  '@redocly/cli@2.0.0': {}\n");
    const lintEvidence = write(root, `docs/.scratch/${slug}/api/redocly-lint.txt`, "synthetic redocly lint exit_code=0\n");
    const validation = write(root, `docs/.scratch/${slug}/api/${slug}-validation.json`, {
      schema_version: 1,
      kind: "openapi-draft-validation",
      template: false,
      status: "passed",
      draft: { ref: openapi.ref, sha256: openapi.digest, oas_version: "3.1.0" },
      toolchain: {
        package: "@redocly/cli",
        version: "2.0.0",
        lockfile_ref: "pnpm-lock.yaml",
        command: `pnpm exec redocly lint ${openapi.ref}`,
        exit_code: 0,
        executed_at: "2026-09-14T00:00:00Z",
        evidence_ref: lintEvidence.ref,
      },
      checks: {
        single_document: "passed",
        oas_3_1: "passed",
        ref_resolution: "passed",
        path_parameters: "passed",
        operation_ids: "passed",
        lint: "passed",
      },
    });
    const reviewEvidence = write(root, `docs/.scratch/${slug}/api/draft-review-evidence.md`, "独立 Draft Review 测试证据：无阻断项。\n");
    const reviewRecord = write(root, `docs/.scratch/${slug}/api/draft-review.json`, {
      schema_version: 1,
      kind: "openapi-draft-review",
      result: "approved",
      blocking_findings: [],
      draft_ref: openapi.ref,
      draft_digest: openapi.digest,
      evidence_refs: [reviewEvidence.ref],
    });
    Object.assign(apiDecision, {
      openapi: { id: `openapi.${contract.project_name}`, ref: openapi.ref, version: "v1", digest: openapi.digest },
      validation_record: { ref: validation.ref, digest: validation.digest },
      draft_review: {
        ref: reviewRecord.ref,
        digest: reviewRecord.digest,
        result: "approved",
        blocking_findings: [],
        draft_ref: openapi.ref,
        draft_digest: openapi.digest,
        evidence_refs: [reviewEvidence.ref],
      },
      freeze: { version: "v1", frozen_at: "2026-09-14T00:01:00Z", draft_ref: openapi.ref, draft_digest: openapi.digest },
    });
  } else {
    apiDecision.reason = "当前机械后端骨架不新增或修改对外 API、消息契约或集成接口";
  }
  const api = write(root, "api-contract-decision.json", apiDecision);
  const engineeringPackage = write(root, "engineering-contract-package.json", {
    schema_version: 1,
    kind: "engineering-contract-package",
    project_id: contract.project_name,
    technical_design: { ref: technical.ref, version: "v1", digest: technical.digest },
    data_architecture_decision: { ref: data.ref, version: "v1", digest: data.digest, impact: dataImpact },
    api_contract_decision: { ref: api.ref, version: "v1", digest: api.digest, impact: apiImpact },
    ...(openapi ? { frozen_openapi: { id: apiDecision.openapi.id, ref: openapi.ref, version: "v1", digest: openapi.digest } } : {}),
  });
  const scope = [contract.contract_id, contract.project_name];
  const decision = buildDecisionFixture(path.join(root, "engineering-contract-decision"), { boundary: "gate.engineering-contract-approved", scope, subjectRef: engineeringPackage.file });
  const rule = countersignRuleForGate(loadDigitalHumanRoles().gate_policy, "gate.engineering-contract-approved");
  const reviewer = rule.countersigners[0];
  const approval = write(root, "engineering-contract-approval.json", {
    schema_version: 1,
    gate_id: "gate.engineering-contract-approved",
    decision: "approved",
    actor_kind: "digital-human",
    role_id: reviewer,
    runtime_id: "runtime.generic",
    principal_ref: "synthetic-product-reviewer",
    subject_ref: engineeringPackage.file,
    approval_scope: scope,
    drafter_role_id: rule.drafter,
    user_decision_ref: decision.ref,
    artifact_bindings: [
      { id: `technical-design.${contract.project_name}`, version: "v1", digest: technical.digest },
      { id: dataDecision.decision_id, version: "v1", digest: data.digest },
      { id: apiDecision.decision_id, version: "v1", digest: api.digest },
      ...(openapi ? [{ id: apiDecision.openapi.id, version: apiDecision.openapi.version, digest: openapi.digest }] : []),
    ],
    evidence_refs: [review.ref, apiEvidence.ref],
  });
  contract.lifecycle_approval_ref = approval.file;
  contract.approval = { approval_ref: approval.file, approver: reviewer, persisted_ref: contract.persisted_ref, current_version: contract.contract_version };
  contract.design_prerequisites = {
    technical_design: { ref: technical.ref, version: "v1", digest: technical.digest },
    data_architecture_decision: { ref: data.ref, version: "v1", digest: data.digest, impact: dataImpact },
    api_contract_decision: { ref: api.ref, version: "v1", digest: api.digest, impact: apiImpact },
    engineering_contract_approval_ref: approval.file,
  };
  return { technical, data, api, openapi, engineeringPackage, approval };
}
