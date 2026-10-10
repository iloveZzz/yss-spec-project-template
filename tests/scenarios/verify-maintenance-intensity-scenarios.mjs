import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { validateMaintenanceCheckpoint } from "../../scripts/lib/maintenance-intensity.mjs";
import { validateMaintenanceReviewEvidence } from "../../scripts/lib/maintenance-review.mjs";

const checkerSource = readFileSync(new URL("../../scripts/lib/maintenance-intensity.mjs", import.meta.url), "utf8");
if (checkerSource.includes("LEVEL_BY_TRIGGER = new Map")) {
  throw new TypeError("触发项映射必须由 .template-source/process/maintenance-intensity.yaml 唯一维护");
}
if (!checkerSource.includes("maintenance-intensity.yaml")) {
  throw new TypeError("维护强度校验器必须加载权威触发项映射");
}

const evidence = (...kinds) => kinds.map((kind) => ({ kind, command: `verify ${kind}`, result: "pass" }));
const releaseEvidence = (kind) => ({ kind, command: "scripts/verify-template", result: "pass" });
// 以下旧夹具只验证 checkpoint 状态机；不构造当前运行通过证据。
const historicalStateFixture = { history: true };
const reviewRequestOnly = "scripts/fixtures/maintenance-review/maintenance-review-request-only.md";
const focusedReview = "scripts/fixtures/maintenance-review/maintenance-focused-review-approved.md";
const formalReview = "scripts/fixtures/maintenance-review/maintenance-review/formal-review-record.yaml";
const sameActorReview = "scripts/fixtures/maintenance-review/maintenance-review/formal-review-same-actor.yaml";
const wrongDigestReview = "scripts/fixtures/maintenance-review/maintenance-review/formal-review-wrong-digest.yaml";
const negativeReview = "scripts/fixtures/maintenance-review/maintenance-formal-review-negative.md";
const negativeStructuredReview = "scripts/fixtures/maintenance-review/maintenance-review/formal-review-negative-record.yaml";
const openFindingReview = "scripts/fixtures/maintenance-review/maintenance-review/formal-review-open-finding.yaml";
const invalidTaskReview = "scripts/fixtures/maintenance-review/maintenance-review/formal-review-invalid-task.yaml";
const base = {
  schema_version: 1,
  classification_reason: "场景验证",
  changed_assets: ["docs/example.md"],
  escalation: "none"
};

const v2Base = {
  ...base,
  schema_version: 2,
  intensity: "L2",
  triggers: ["core-validator"],
  review_mode: "formal-independent",
  target_state: "implementation-ready",
  current_state: "implementation-ready",
  verification_profile: "fast",
  review_round: 0,
  candidate_digest: null,
  verification_evidence: evidence("red", "green", "refactor", "pressure-scenario", "fresh-verification")
};

const accepted = [
  { ...base, intensity: "L1", triggers: ["textual-only"], verification_evidence: evidence("relevant-check"), review_mode: "self-check" },
  { ...base, intensity: "L2", triggers: ["local-rule"], verification_evidence: [...evidence("fresh-verification"), { kind: "focused-independent-review", command: focusedReview, result: "pass" }], review_mode: "focused-independent" },
  { ...base, intensity: "L2", triggers: [], verification_evidence: [...evidence("fresh-verification"), { kind: "focused-independent-review", command: focusedReview, result: "pass" }], review_mode: "focused-independent" },
  { ...base, intensity: "L3", triggers: ["core-validator"], verification_evidence: [...evidence("red", "green", "refactor", "pressure-scenario", "fresh-verification"), { kind: "formal-independent-review", command: formalReview, result: "pass" }], review_mode: "formal-independent" }
];

for (const checkpoint of accepted) validateMaintenanceCheckpoint(checkpoint, { history: checkpoint.intensity === "L3" });
validateMaintenanceCheckpoint({ ...accepted[3], intensity: "L2", verification_evidence: [...evidence("fresh-verification"), { kind: "formal-independent-review", command: formalReview, result: "pass" }] });
validateMaintenanceCheckpoint(v2Base);
validateMaintenanceCheckpoint({
  ...v2Base,
  intensity: "L3",
  target_state: "review-ready",
  current_state: "review-ready",
  verification_profile: "candidate",
  review_round: 1,
  candidate_digest: "a".repeat(64),
  verification_evidence: [...v2Base.verification_evidence, ...evidence("candidate-verification", "review-task-packages"), releaseEvidence("initial-release-verification")]
}, historicalStateFixture);
validateMaintenanceCheckpoint({
  ...v2Base,
  intensity: "L3",
  target_state: "release-ready",
  current_state: "release-ready",
  verification_profile: "release",
  review_round: 2,
  candidate_digest: "d6bf78f58d2cf0e24528bfb7806bdf255124ed5f1b2973b5bf5fbc6aac5753dc",
  verification_evidence: [...v2Base.verification_evidence, ...evidence("candidate-verification", "review-task-packages"), releaseEvidence("initial-release-verification"), releaseEvidence("final-release-verification"), { kind: "formal-independent-review", command: formalReview, result: "pass" }]
}, historicalStateFixture);
validateMaintenanceCheckpoint({
  ...v2Base,
  intensity: "L3",
  target_state: "release-ready",
  current_state: "needs-human",
  verification_profile: "candidate",
  review_round: 2,
  candidate_digest: "a".repeat(64),
  verification_evidence: [...v2Base.verification_evidence, ...evidence("candidate-verification", "review-task-packages"), releaseEvidence("initial-release-verification")]
}, historicalStateFixture);

// 日常 L2 自检必须闭合；不能再借 pending review 跳过自检。
for (const intensity of ["L1", "L2"]) {
  const kinds = intensity === "L1" ? ["relevant-check"] : ["fresh-verification", "self-check"];
  const daily = { ...v2Base, intensity, triggers: [intensity === "L1" ? "textual-only" : "core-validator"], review_mode: "self-check", verification_evidence: evidence(...kinds) };
  validateMaintenanceCheckpoint(daily);
  const released = { ...daily, target_state: "release-ready", current_state: "release-ready", verification_profile: "release", verification_evidence: [...daily.verification_evidence, releaseEvidence("final-release-verification")] };
  validateMaintenanceCheckpoint({ ...released, intensity: intensity === "L1" ? "L1" : "L3" }, historicalStateFixture);
  let unboundReleaseRejected = false;
  try { validateMaintenanceCheckpoint(released); } catch { unboundReleaseRejected = true; }
  if (!unboundReleaseRejected) throw new TypeError("当前发布证据缺少实际报告、args 和退出码必须阻断");
  for (const invalid of [
    { ...released, verification_evidence: daily.verification_evidence },
    ...(intensity === "L1" ? [] : ["self-check", "fresh-verification"].map(missing => ({ ...daily, verification_evidence: evidence(...kinds.filter(kind => kind !== missing)) })))
  ]) {
    let failed = false;
    try { validateMaintenanceCheckpoint(invalid); } catch { failed = true; }
    if (!failed) throw new TypeError("自检、fresh verification 或发布证据缺失必须阻断");
  }
}

const pendingFormalReview = {
  ...accepted[3],
  verification_evidence: evidence("red", "green", "refactor", "pressure-scenario", "fresh-verification")
};
validateMaintenanceCheckpoint(pendingFormalReview, { history: true, allowPendingReview: true });
let pendingPassedStrictClosure = true;
try { validateMaintenanceCheckpoint(pendingFormalReview, historicalStateFixture); } catch { pendingPassedStrictClosure = false; }
if (pendingPassedStrictClosure) throw new TypeError("待审合同不得通过最终 checkpoint 校验");

assert.throws(() => validateMaintenanceCheckpoint({ ...accepted[0], triggers: ["generation-semantics"] }), /至少要求 L2/);
for (const trigger of ["ticket-state", "historical-important-escape", "aggregate-behavior-change", "release-candidate"]) {
  const checkpoint = { ...base, intensity: "L2", triggers: [trigger], verification_evidence: evidence("fresh-verification", "self-check"), review_mode: "self-check" };
  assert.throws(() => validateMaintenanceCheckpoint(checkpoint), new RegExp(`未知 trigger: ${trigger}`));
  assert.equal(validateMaintenanceCheckpoint({ ...checkpoint, intensity: "L3" }, { history: true }).current_state, "historical-only");
}

const rejected = [
  { ...accepted[1], verification_evidence: evidence("fresh-verification") },
  { ...accepted[1], verification_evidence: evidence("counterexample", "fresh-verification") },
  { ...accepted[0], triggers: ["release-semantics"] },
  { ...accepted[0], triggers: ["generation-semantics"] },
  { ...accepted[2], verification_evidence: evidence("red", "green", "refactor", "pressure-scenario") },
  { ...accepted[2], verification_evidence: evidence("red", "green", "refactor", "pressure-scenario", "fresh-verification") },
  { ...accepted[1], escalation: "发现发布语义影响但仍维持 L2", triggers: ["release-semantics"] },
  { ...accepted[2], intensity: "L1" },
  { ...v2Base, current_state: "review-ready", target_state: "review-ready", verification_profile: "candidate", review_round: 0, candidate_digest: null },
  { ...v2Base, current_state: "release-ready", target_state: "release-ready", verification_profile: "release", review_round: 3, candidate_digest: "a".repeat(64) },
  { ...v2Base, current_state: "release-ready", target_state: "release-ready", verification_profile: "release", review_round: 1, candidate_digest: "a".repeat(64) },
  {
    ...v2Base,
    current_state: "review-ready",
    target_state: "review-ready",
    verification_profile: "candidate",
    review_round: 1,
    candidate_digest: "a".repeat(64),
    verification_evidence: [...v2Base.verification_evidence, ...evidence("candidate-verification", "review-task-packages"), { kind: "initial-release-verification", command: "echo pass", result: "pass" }]
  },
  {
    ...v2Base,
    current_state: "release-ready",
    target_state: "release-ready",
    verification_profile: "release",
    review_round: 2,
    candidate_digest: "d6bf78f58d2cf0e24528bfb7806bdf255124ed5f1b2973b5bf5fbc6aac5753dc",
    verification_evidence: [...v2Base.verification_evidence, ...evidence("candidate-verification", "review-task-packages"), releaseEvidence("initial-release-verification"), { kind: "final-release-verification", command: "scripts/verify-template-candidate", result: "pass" }, { kind: "formal-independent-review", command: formalReview, result: "pass" }]
  },
  {
    ...accepted[3],
    verification_evidence: [
      ...evidence("red", "green", "refactor", "pressure-scenario", "fresh-verification"),
      { kind: "formal-independent-review", command: reviewRequestOnly, result: "pass" }
    ]
  },
  {
    ...accepted[3],
    verification_evidence: [
      ...evidence("red", "green", "refactor", "pressure-scenario", "fresh-verification"),
      { kind: "formal-independent-review", command: sameActorReview, result: "pass" }
    ]
  },
  {
    ...accepted[3],
    verification_evidence: [
      ...evidence("red", "green", "refactor", "pressure-scenario", "fresh-verification"),
      { kind: "formal-independent-review", command: wrongDigestReview, result: "pass" }
    ]
  },
  {
    ...accepted[3],
    verification_evidence: [
      ...evidence("red", "green", "refactor", "pressure-scenario", "fresh-verification"),
      { kind: "formal-independent-review", command: negativeReview, result: "pass" }
    ]
  },
  {
    ...accepted[3],
    verification_evidence: [
      ...evidence("red", "green", "refactor", "pressure-scenario", "fresh-verification"),
      { kind: "formal-independent-review", command: negativeStructuredReview, result: "pass" }
    ]
  },
  {
    ...accepted[3],
    verification_evidence: [
      ...evidence("red", "green", "refactor", "pressure-scenario", "fresh-verification"),
      { kind: "formal-independent-review", command: openFindingReview, result: "pass" }
    ]
  },
  {
    ...accepted[3],
    verification_evidence: [
      ...evidence("red", "green", "refactor", "pressure-scenario", "fresh-verification"),
      { kind: "formal-independent-review", command: invalidTaskReview, result: "pass" }
    ]
  }
];

for (const checkpoint of rejected) {
  let failed = false;
  try { validateMaintenanceCheckpoint(checkpoint, { history: checkpoint.intensity === "L3" }); } catch { failed = true; }
  if (!failed) throw new TypeError(`错误 checkpoint 未被拒绝: ${JSON.stringify(checkpoint)}`);
}

const symlinkFixture = mkdtempSync(path.join(tmpdir(), "yss-maintenance-review-"));
try {
  const baseDir = path.join(symlinkFixture, "repo");
  mkdirSync(baseDir);
  writeFileSync(path.join(symlinkFixture, "outside.md"), "# 聚焦独立审查\n\n审查者：reviewer.outside\n\n审查结论：pass\n");
  symlinkSync(path.join(symlinkFixture, "outside.md"), path.join(baseDir, "review.md"));
  let symlinkEscaped = false;
  try { validateMaintenanceReviewEvidence({ kind: "focused-independent-review", command: "review.md" }, { baseDir }); } catch { symlinkEscaped = true; }
  if (!symlinkEscaped) throw new TypeError("symlink 越界证据未被拒绝");
} finally {
  rmSync(symlinkFixture, { recursive: true, force: true });
}

process.stdout.write("模板维护 L1/L2 强度与历史 L3 兼容场景验证通过\n");
