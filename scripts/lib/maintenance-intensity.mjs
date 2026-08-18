import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "../vendor/yaml.mjs";

const LEVELS = ["L1", "L2", "L3"];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const INTENSITY_POLICY = path.join(root, "docs/process/maintenance-intensity.yaml");

const REQUIRED_EVIDENCE = {
  L1: ["relevant-check"],
  L2: ["counterexample", "fresh-verification", "focused-independent-review"],
  L3: ["red", "green", "refactor", "pressure-scenario", "fresh-verification", "formal-independent-review"]
};

const REVIEW_MODES = {
  L1: new Set(["self-check", "human-checkpoint"]),
  L2: new Set(["focused-independent"]),
  L3: new Set(["formal-independent"])
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

export function validateMaintenanceCheckpoint(data) {
  ensure(data && typeof data === "object" && !Array.isArray(data), "checkpoint 必须是对象");
  const exactFields = ["schema_version", "intensity", "classification_reason", "triggers", "changed_assets", "verification_evidence", "review_mode", "escalation"];
  const unknown = Object.keys(data).filter((key) => !exactFields.includes(key));
  ensure(unknown.length === 0, `checkpoint 包含未知字段: ${unknown.join(", ")}`);
  ensure(data.schema_version === 1, "schema_version 必须为 1");
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
    kinds.add(evidence.kind);
  }
  for (const required of REQUIRED_EVIDENCE[data.intensity]) ensure(kinds.has(required), `${data.intensity} 缺少 ${required} 证据`);
  ensure(REVIEW_MODES[data.intensity].has(data.review_mode), `${data.intensity} 不允许 review_mode=${data.review_mode}`);
  return { intensity: data.intensity, minimum_intensity: minimum };
}

export function loadMaintenanceCheckpoint(source) {
  const raw = source === "-" ? readFileSync(0, "utf8") : readFileSync(source, "utf8");
  const document = parseDocument(raw, { uniqueKeys: true });
  ensure(document.errors.length === 0, document.errors[0]?.message || "checkpoint 无法解析");
  return document.toJS({ maxAliasCount: 0 });
}
