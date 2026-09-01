import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "../vendor/yaml.mjs";
import { validateMaintenanceReviewEvidence } from "./maintenance-review.mjs";

const LEVELS = ["L1", "L2", "L3"];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const INTENSITY_POLICY = path.join(root, "docs/process/maintenance-intensity.yaml");

const REQUIRED_EVIDENCE = {
  L1: ["relevant-check"],
  L2: ["counterexample", "fresh-verification", "focused-independent-review"],
  L3: ["fresh-verification", "self-check"]
};

const REVIEW_MODES = {
  L1: new Set(["self-check", "human-checkpoint"]),
  L2: new Set(["focused-independent"]),
  L3: new Set(["self-check", "formal-independent"])
};

function ensure(condition, message) {
  if (!condition) throw new TypeError(message);
}

function loadTriggerLevels() {
  const document = parseDocument(readFileSync(INTENSITY_POLICY, "utf8"), { uniqueKeys: true });
  ensure(document.errors.length === 0, document.errors[0]?.message || "维护强度策略无法解析");
  const policy = document.toJS({ maxAliasCount: 0 });
  ensure(policy?.schema_version === 1 && LEVELS.includes(policy.default_level) && policy.levels && typeof policy.levels === "object", "维护强度策略 schema 无效");
  const pairs = [];
  for (const level of LEVELS) {
    const triggers = policy.levels[level]?.triggers;
    ensure(Array.isArray(triggers) && triggers.length > 0, `维护强度策略缺少 ${level} triggers`);
    for (const trigger of triggers) {
      ensure(typeof trigger === "string" && trigger.trim(), `${level} 包含无效 trigger`);
      pairs.push([trigger, level]);
    }
  }
  const map = new Map(pairs);
  ensure(map.size === pairs.length, "维护强度策略包含重复 trigger");
  return { defaultLevel: policy.default_level, map };
}

const triggerLevels = loadTriggerLevels();

function levelRank(level) {
  return LEVELS.indexOf(level);
}

export function minimumIntensity(triggers) {
  ensure(Array.isArray(triggers), "triggers 必须是数组");
  if (triggers.length === 0) return triggerLevels.defaultLevel;
  let required = "L1";
  for (const trigger of triggers) {
    ensure(triggerLevels.map.has(trigger), `未知 trigger: ${trigger}`);
    const candidate = triggerLevels.map.get(trigger);
    if (levelRank(candidate) > levelRank(required)) required = candidate;
  }
  return required;
}

export function validateMaintenanceCheckpoint(data, options = {}) {
  ensure(data && typeof data === "object" && !Array.isArray(data), "checkpoint 必须是对象");
  const v1Fields = ["schema_version", "intensity", "classification_reason", "triggers", "changed_assets", "verification_evidence", "review_mode", "escalation"];
  const v2Fields = [...v1Fields, "target_state", "current_state", "verification_profile", "review_round", "candidate_digest"];
  const exactFields = data.schema_version === 2 ? v2Fields : v1Fields;
  const unknown = Object.keys(data).filter((key) => !exactFields.includes(key));
  ensure(unknown.length === 0, `checkpoint 包含未知字段: ${unknown.join(", ")}`);
  ensure([1, 2].includes(data.schema_version), "schema_version 必须为 1 或 2");
  ensure(LEVELS.includes(data.intensity), "intensity 必须是 L1、L2 或 L3");
  ensure(typeof data.classification_reason === "string" && data.classification_reason.trim(), "classification_reason 不能为空");
  ensure(Array.isArray(data.changed_assets) && data.changed_assets.length > 0 && data.changed_assets.every((item) => typeof item === "string" && item.trim()), "changed_assets 必须包含至少一个路径或资产引用");
  const minimum = minimumIntensity(data.triggers);
  ensure(levelRank(data.intensity) >= levelRank(minimum), `${data.triggers.join(", ") || "默认"} 至少要求 ${minimum}，不得声明为 ${data.intensity}`);
  ensure(typeof data.escalation === "string" && data.escalation.trim(), "escalation 必须说明 none 或升级原因");
  ensure(Array.isArray(data.verification_evidence), "verification_evidence 必须是数组");
  const kinds = new Set();
  for (const evidence of data.verification_evidence) {
    ensure(evidence && typeof evidence === "object" && !Array.isArray(evidence), "verification_evidence 条目必须是对象");
    ensure(typeof evidence.kind === "string" && evidence.kind.trim(), "verification_evidence.kind 不能为空");
    ensure(typeof evidence.command === "string" && evidence.command.trim(), "verification_evidence.command 不能为空");
    ensure(evidence.result === "pass", `验证证据必须是本轮实际通过结果: ${evidence.kind ?? "unknown"}`);
    if (["focused-independent-review", "formal-independent-review"].includes(evidence.kind)) {
      validateMaintenanceReviewEvidence(evidence, options);
    }
    kinds.add(evidence.kind);
  }
  const legacyFormalL3 = data.intensity === "L3" && data.review_mode === "formal-independent";
  const reviewKind = data.intensity === "L2" ? "focused-independent-review" : data.intensity === "L3" ? (legacyFormalL3 ? "formal-independent-review" : "self-check") : null;
  if (data.schema_version === 2) validateCheckpointState(data, kinds, reviewKind);
  const requiredEvidence = legacyFormalL3
    ? ["red", "green", "refactor", "pressure-scenario", "fresh-verification", "formal-independent-review"]
    : REQUIRED_EVIDENCE[data.intensity];
  for (const required of requiredEvidence) {
    const pendingByV2State = data.schema_version === 2 && data.current_state !== "release-ready" && required === reviewKind;
    if ((options.allowPendingReview === true || pendingByV2State) && required === reviewKind) continue;
    ensure(kinds.has(required), `${data.intensity} 缺少 ${required} 证据`);
  }
  ensure(REVIEW_MODES[data.intensity].has(data.review_mode), `${data.intensity} 不允许 review_mode=${data.review_mode}`);
  return { intensity: data.intensity, minimum_intensity: minimum, current_state: data.schema_version === 2 ? data.current_state : "release-ready" };
}

function validateCheckpointState(data, evidenceKinds, reviewKind) {
  const states = ["implementation-ready", "review-ready", "release-ready", "needs-human"];
  const targets = ["implementation-ready", "review-ready", "release-ready"];
  const profiles = ["fast", "candidate", "release"];
  ensure(targets.includes(data.target_state), "target_state 无效");
  ensure(states.includes(data.current_state), "current_state 无效");
  ensure(profiles.includes(data.verification_profile), "verification_profile 无效");
  ensure(Number.isInteger(data.review_round) && data.review_round >= 0 && data.review_round <= 2, "review_round 必须为 0、1 或 2");
  ensure(data.candidate_digest === null || /^(?:sha256:)?[a-f0-9]{64}$/.test(data.candidate_digest), "candidate_digest 必须为 null 或 SHA-256");
  const targetRank = targets.indexOf(data.target_state);
  const currentRank = targets.indexOf(data.current_state);
  if (data.current_state !== "needs-human") ensure(currentRank <= targetRank, "current_state 不得越过 target_state");

  if (data.current_state === "implementation-ready") {
    ensure(data.verification_profile === "fast", "implementation-ready 必须使用 fast profile");
    ensure(data.review_round === 0, "implementation-ready 的 review_round 必须为 0");
    ensure(data.candidate_digest === null, "implementation-ready 不得冻结 candidate_digest");
    return;
  }

  const selfCheckL3 = data.intensity === "L3" && data.review_mode === "self-check";
  if (!selfCheckL3) {
    ensure(data.candidate_digest !== null, `${data.current_state} 必须绑定 candidate_digest`);
    ensure(data.review_round >= 1, `${data.current_state} 的 review_round 必须为 1 或 2`);
    for (const required of ["candidate-verification", "initial-release-verification", "review-task-packages"]) {
      ensure(evidenceKinds.has(required), `${data.current_state} 缺少 ${required} 证据`);
    }
    validateReleaseVerificationCommand(data, "initial-release-verification");
  } else {
    ensure(data.review_round === 0, "L3 self-check 不需要审查轮次");
    ensure(data.candidate_digest === null, "L3 self-check 不得冻结 candidate_digest");
  }
  if (data.current_state === "review-ready") {
    if (selfCheckL3) {
      ensure(data.verification_profile === "fast", "L3 self-check 的 review-ready 必须使用 fast profile");
    } else {
      ensure(data.verification_profile === "candidate", "review-ready 必须使用 candidate profile");
    }
    return;
  }
  if (data.current_state === "needs-human") {
    ensure(data.target_state === "release-ready", "needs-human 必须保留 release-ready 目标");
    ensure(data.review_round === 2, "needs-human 只允许在第二轮审查后进入");
    ensure(["candidate", "release"].includes(data.verification_profile), "needs-human 必须来自 candidate 或 release profile");
    return;
  }
  ensure(data.verification_profile === "release", "release-ready 必须使用 release profile");
  ensure(evidenceKinds.has("final-release-verification"), "release-ready 缺少 final-release-verification 证据");
  validateReleaseVerificationCommand(data, "final-release-verification");
  if (reviewKind) ensure(evidenceKinds.has(reviewKind), `release-ready 缺少 ${reviewKind} 证据`);
}

function validateReleaseVerificationCommand(data, kind) {
  const evidence = data.verification_evidence.filter((item) => item.kind === kind);
  ensure(evidence.length === 1, `${kind} 必须恰好提供一条完整门禁证据`);
  ensure(evidence[0].command === "scripts/verify-template", `${kind}.command 必须为 scripts/verify-template`);
}

export function loadMaintenanceCheckpoint(source) {
  const raw = source === "-" ? readFileSync(0, "utf8") : readFileSync(source, "utf8");
  const document = parseDocument(raw, { uniqueKeys: true });
  ensure(document.errors.length === 0, document.errors[0]?.message || "checkpoint 无法解析");
  return document.toJS({ maxAliasCount: 0 });
}
