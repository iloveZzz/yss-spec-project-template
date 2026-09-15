import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateApiContractDecision } from "./api-contract-decision.mjs";

const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

function write(root, ref, value) {
  const file = path.join(root, ref);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
  return { ref, file, digest: digest(readFileSync(file)) };
}

function notApplicableFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "api-contract-decision-"));
  const assessment = write(root, "api-impact.json", { api: false, project_id: "demo" });
  const evidence = write(root, "api-impact-evidence.md", "无 API 影响证据。\n");
  const decision = {
    schema_version: 1,
    kind: "api-contract-decision",
    decision_id: "api-contract.demo",
    decision_version: "v1",
    status: "approved",
    current_version: true,
    impact: "not-applicable",
    assessment_ref: assessment.ref,
    assessment_digest: assessment.digest,
    evidence_refs: [evidence.ref],
    reason: "不新增或修改 HTTP、消息或集成接口",
  };
  const asset = write(root, "api-contract-decision.json", decision);
  return { root, assessment, evidence, decision, asset, binding: { ref: asset.ref, version: "v1", digest: asset.digest, impact: "not-applicable" } };
}

test("API not-applicable 决定必须绑定影响评估、原因和可读证据", () => {
  const data = notApplicableFixture();
  try {
    assert.equal(validateApiContractDecision(data.binding, { root: data.root }).decision.impact, "not-applicable");
    for (const mutation of [
      (value) => { delete value.reason; },
      (value) => { value.evidence_refs = []; },
      (value) => { value.openapi = { id: "openapi.demo", ref: "empty.yaml", version: "v1", digest: `sha256:${"0".repeat(64)}` }; },
    ]) {
      const value = structuredClone(data.decision);
      mutation(value);
      const changed = write(data.root, "api-contract-decision.json", value);
      assert.throws(() => validateApiContractDecision({ ...data.binding, digest: changed.digest }, { root: data.root }));
    }
  } finally {
    rmSync(data.root, { recursive: true, force: true });
  }
});

test("API Decision 或影响评估原始字节漂移即失效", () => {
  const data = notApplicableFixture();
  try {
    writeFileSync(data.asset.file, "\n", { flag: "a" });
    assert.throws(() => validateApiContractDecision(data.binding, { root: data.root }), /摘要漂移/);
    const restored = write(data.root, data.asset.ref, data.decision);
    writeFileSync(data.assessment.file, "\n", { flag: "a" });
    assert.throws(() => validateApiContractDecision({ ...data.binding, digest: restored.digest }, { root: data.root }), /摘要漂移/);
  } finally {
    rmSync(data.root, { recursive: true, force: true });
  }
});
