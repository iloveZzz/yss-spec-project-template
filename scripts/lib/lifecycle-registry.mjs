import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "../vendor/yaml.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const DEFAULT_REGISTRY = path.join(ROOT, "docs/process/lifecycle-registry.yaml");
export const DEFAULT_BASELINE = path.join(ROOT, "docs/process/lifecycle-registry-baseline.json");
const ID_PATTERN = /^(stage|gate|artifact|work-unit|evidence)\.[a-z0-9][a-z0-9-]*$/;
const COLLECTIONS = ["stages", "gates", "artifacts", "work_units", "evidence"];

function fail(message) {
  throw new TypeError(message);
}

function yamlFromFile(filePath, label) {
  let source;
  try {
    source = readFileSync(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") fail(`缺少${label}: ${filePath}`);
    throw error;
  }
  const document = parseDocument(source, { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length > 0) fail(`无法解析${label}: ${document.errors[0].message}`);
  let value;
  try {
    value = document.toJS({ maxAliasCount: 0 });
  } catch (error) {
    fail(`无法解析${label}: ${error.message}`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label}必须是对象`);
  return value;
}

export function loadRegistry(filePath = DEFAULT_REGISTRY) {
  return yamlFromFile(filePath, "生命周期注册表");
}

function requireReference(ids, reference, field) {
  if (!ids.has(reference)) fail(`${field} 引用了不存在的引用: ${reference}`);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function semanticProjection(registry) {
  return COLLECTIONS.flatMap((kind) => registry[kind].map((record) => ({ kind, record: canonicalize(record) })))
    .sort((left, right) => left.record.id.localeCompare(right.record.id));
}

export function semanticDigest(registry) {
  return createHash("sha256").update(JSON.stringify(semanticProjection(registry))).digest("hex");
}

function validateBaseline(registry, ids, baselinePath) {
  let baseline;
  try {
    baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") fail(`缺少生命周期已发布基线: ${path.relative(ROOT, baselinePath)}`);
    if (error instanceof SyntaxError) fail(`无法解析生命周期已发布基线: ${error.message}`);
    throw error;
  }
  if (baseline.schema_version !== 1 || baseline.registry_id !== registry.registry_id) {
    fail("生命周期已发布基线版本或 registry_id 不匹配");
  }
  const publishedIds = baseline.published_ids;
  if (!Array.isArray(publishedIds) || new Set(publishedIds).size !== publishedIds.length) {
    fail("生命周期已发布基线缺少 published_ids");
  }
  for (const id of publishedIds) {
    if (typeof id !== "string" || !ID_PATTERN.test(id)) fail(`生命周期已发布基线包含无效 ID: ${JSON.stringify(id)}`);
  }
  const activeIds = [...ids.keys()].sort();
  const deprecated = registry.id_policy.deprecated_ids;
  if (new Set(deprecated).size !== deprecated.length || deprecated.some((id) => !publishedIds.includes(id)) || deprecated.some((id) => activeIds.includes(id))) {
    fail("deprecated_ids 必须唯一、来自已发布 ID，且不得仍为活跃对象");
  }
  const expected = publishedIds.filter((id) => !deprecated.includes(id)).sort();
  if (JSON.stringify(activeIds) !== JSON.stringify(expected)) {
    fail("生命周期活跃 ID 与已发布基线不一致；新增、移除或弃用必须先更新发布基线");
  }
  if (baseline.semantic_sha256 !== semanticDigest(registry)) fail("生命周期稳定 ID 的语义快照已变化；不得复用已发布 ID");
}

export function validateRegistry(registry, { baseline = DEFAULT_BASELINE } = {}) {
  const required = ["schema_version", "registry_id", "status", "id_policy", ...COLLECTIONS];
  const missing = required.filter((key) => !(key in registry));
  if (missing.length > 0) fail(`生命周期注册表缺少字段: ${missing.join(", ")}`);
  if (registry.schema_version !== 1) fail("仅支持 lifecycle registry schema_version: 1");
  if (registry.registry_id !== "yss.lifecycle") fail("registry_id 必须为 yss.lifecycle");
  if (!new Set(["shadow", "active"]).has(registry.status)) fail("status 必须为 shadow 或 active");
  const policy = registry.id_policy;
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) fail("id_policy 必须是对象");
  for (const key of ["pattern", "published_ids_immutable", "baseline", "deprecated_ids"]) {
    if (!(key in policy)) fail(`id_policy 缺少字段: ${key}`);
  }
  if (policy.published_ids_immutable !== true) fail("published_ids_immutable 必须为 true");
  if (policy.pattern !== "^(stage|gate|artifact|work-unit|evidence)\\.[a-z0-9][a-z0-9-]*$") fail("id_policy.pattern 不符合固定命名空间");
  if (policy.baseline !== "docs/process/lifecycle-registry-baseline.json") fail("id_policy.baseline 必须指向发布基线");
  if (!Array.isArray(policy.deprecated_ids)) fail("deprecated_ids 必须是数组");
  const ids = new Map();
  for (const collection of COLLECTIONS) {
    const records = registry[collection];
    if (!Array.isArray(records) || records.length === 0) fail(`${collection} 必须是非空数组`);
    for (const record of records) {
      const id = record?.id;
      if (typeof id !== "string" || !ID_PATTERN.test(id)) fail(`${collection} 中存在无效 ID: ${JSON.stringify(id)}`);
      if (ids.has(id)) fail(`生命周期 ID 重复: ${id}`);
      const prefix = collection === "work_units" ? "work-unit." : collection === "evidence" ? "evidence." : `${collection.slice(0, -1)}.`;
      if (!id.startsWith(prefix)) fail(`${id} 与 ${collection} 类型不匹配`);
      if (typeof record.name !== "string" || record.name.length === 0) fail(`${id} 缺少名称`);
      ids.set(id, collection);
    }
  }
  for (const gate of registry.gates) {
    requireReference(ids, gate.stage, `${gate.id}.stage`);
    if (ids.get(gate.stage) !== "stages") fail(`${gate.id}.stage 必须引用 stage.*`);
    if (!Array.isArray(gate.evidence) || gate.evidence.length === 0) fail(`${gate.id}.evidence 必须是非空数组`);
    for (const reference of gate.evidence) {
      requireReference(ids, reference, `${gate.id}.evidence`);
      if (ids.get(reference) !== "evidence") fail(`${gate.id}.evidence 必须引用 evidence.*`);
    }
  }
  for (const artifact of registry.artifacts) {
    requireReference(ids, artifact.stage, `${artifact.id}.stage`);
    if (ids.get(artifact.stage) !== "stages") fail(`${artifact.id}.stage 必须引用 stage.*`);
  }
  if (baseline) validateBaseline(registry, ids, baseline);
  return registry;
}

export function renderLifecycleStructure(registry) {
  const lines = [
    "<!-- lifecycle-registry:structure:start -->",
    `> 此结构区由 \`docs/process/lifecycle-registry.yaml\` 生成。当前为 \`${registry.status}\` 模式：它校验结构和派生文档，不改变运行时状态 schema 或人工批准语义。`, "",
    "## 1. 主阶段", "", "| 稳定 ID | 阶段 | 目标 | 退出标准 |", "|---|---|---|---|"
  ];
  for (const stage of registry.stages) lines.push(`| \`${stage.id}\` | ${stage.name} | ${stage.goal} | ${stage.exit_criteria} |`);
  lines.push("", "## 2. 生命周期对象", "", "门禁是需要裁决的审查点；产物、工作单元和证据不是门禁的同义词。未命中条件的门禁记录 \`not-applicable\` 及原因，不生成空文档。", "", "### 2.1 条件门禁", "", "| 稳定 ID | 门禁 | 所属阶段 | 触发条件 | 必须留下的证据 |", "|---|---|---|---|---|");
  for (const gate of registry.gates) lines.push(`| \`${gate.id}\` | ${gate.name} | \`${gate.stage}\` | ${gate.trigger} | ${gate.evidence.map((id) => `\`${id}\``).join("、")} |`);
  lines.push("", "### 2.2 生命周期产物", "", "| 稳定 ID | 产物 | 所属阶段 | 触发条件 |", "|---|---|---|---|");
  for (const artifact of registry.artifacts) lines.push(`| \`${artifact.id}\` | ${artifact.name} | \`${artifact.stage}\` | ${artifact.trigger} |`);
  lines.push("", "### 2.3 执行证据", "", "| 稳定 ID | 证据 | 说明 |", "|---|---|---|");
  for (const evidence of registry.evidence) lines.push(`| \`${evidence.id}\` | ${evidence.name} | ${evidence.description} |`);
  lines.push("<!-- lifecycle-registry:structure:end -->");
  return `${lines.join("\n")}\n`;
}

export function renderWorkUnits(registry) {
  const lines = ["<!-- lifecycle-registry:work-units:start -->", "> 此表由 `docs/process/lifecycle-registry.yaml` 生成；它只描述 `template-source` 的 Harness 工作单元。", "", "| 稳定 ID | 工作单元 | 输入 | 输出 | 完成条件 |", "|---|---|---|---|---|"];
  for (const unit of registry.work_units) lines.push(`| \`${unit.id}\` | ${unit.name} | ${unit.input} | ${unit.output} | ${unit.completion} |`);
  lines.push("<!-- lifecycle-registry:work-units:end -->");
  return `${lines.join("\n")}\n`;
}

export function replaceRegion(filePath, startMarker, endMarker, replacement, { check = false } = {}) {
  const body = readFileSync(filePath, "utf8");
  const escaped = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(`${escaped(startMarker)}[\\s\\S]*?${escaped(endMarker)}\\n?`);
  if (!expression.test(body)) fail(`派生文档缺少生成区: ${path.relative(ROOT, filePath)}`);
  const expected = body.replace(expression, replacement);
  if (check) {
    if (expected !== body) fail(`派生文档与注册表漂移: ${path.relative(ROOT, filePath)}；运行 scripts/generate-lifecycle-artifacts --write`);
  } else {
    writeFileSync(filePath, expected, "utf8");
  }
}
