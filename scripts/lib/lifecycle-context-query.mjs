import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "../vendor/yaml.mjs";
import { ROOT, loadRegistry, semanticDigest, validateRegistry } from "./lifecycle-registry.mjs";
import { loadSkillRegistry } from "./skill-registry.mjs";

const LIFECYCLE_REGISTRY_REF = "docs/process/lifecycle-registry.yaml";
const ORCHESTRATION_CONTRACT_REF = ".agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml";
const SKILL_REGISTRY_REF = "docs/agents/yss-skill-registry.yaml";

function read(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

function loadYaml(relativePath, label) {
  const document = parseDocument(read(relativePath), { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length) throw new TypeError(`无法解析${label}: ${document.errors[0].message}`);
  const value = document.toJS({ maxAliasCount: 0 });
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label}必须是对象`);
  return value;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function selectById(records, id, label) {
  if (!id) return null;
  const selected = records.find((record) => record.id === id);
  if (!selected) throw new TypeError(`未知${label}: ${id}`);
  return selected;
}

function collectPathReferences(value, references = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectPathReferences(item, references);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectPathReferences(item, references);
  } else if (typeof value === "string" && /(?:^|\/)[^\s]+\.(?:md|ya?ml|json|mjs)(?:#.*)?$/.test(value)) {
    references.add(value);
  }
  return references;
}

function selectedSkills(route, skillRegistry) {
  if (!route) return [];
  const ids = new Set([
    route.primary_skill,
    route.native?.skill,
    ...(route.supporting_skills ?? []),
    ...(route.skills ?? []),
  ].filter(Boolean));
  return skillRegistry.skills.filter((skill) => ids.has(skill.id));
}

export function queryLifecycleContext({ mode, stageId, workUnitId, include = [] } = {}) {
  if (!mode && !stageId && !workUnitId && include.length === 0) {
    throw new TypeError("至少提供 --mode、--stage、--work-unit 或 --include 之一");
  }

  const lifecycle = validateRegistry(loadRegistry());
  const orchestration = loadYaml(ORCHESTRATION_CONTRACT_REF, "生命周期编排合同");
  const skillRegistry = loadSkillRegistry();
  const stage = selectById(lifecycle.stages, stageId, "阶段");
  const workUnit = selectById(lifecycle.work_units, workUnitId, "工作单元");

  if (mode && !(mode in orchestration.modes)) throw new TypeError(`未知模式: ${mode}`);
  const normalizedIncludes = [...new Set(include.flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean))].sort();
  for (const key of normalizedIncludes) {
    if (!(key in orchestration)) throw new TypeError(`未知编排合同子树: ${key}`);
  }

  const route = workUnitId ? orchestration.work_unit_routes?.[workUnitId] ?? null : null;
  const gates = stageId ? lifecycle.gates.filter((gate) => gate.stage === stageId) : [];
  const artifacts = stageId ? lifecycle.artifacts.filter((artifact) => artifact.stage === stageId) : [];
  const evidenceIds = new Set(gates.flatMap((gate) => gate.evidence ?? []));
  const selected = Object.fromEntries(normalizedIncludes.map((key) => [key, orchestration[key]]));
  const transition = workUnitId ? {
    next: orchestration.transition_graph?.routes?.[workUnitId] ?? [],
    forbidden_shortcuts: (orchestration.transition_graph?.forbidden_shortcuts ?? [])
      .filter((edge) => edge.from === workUnitId || edge.to === workUnitId),
  } : null;

  const result = {
    schema_version: 1,
    query: {
      include: normalizedIncludes,
      mode: mode ?? null,
      stage: stageId ?? null,
      work_unit: workUnitId ?? null,
    },
    sources: {
      lifecycle_registry: {
        ref: LIFECYCLE_REGISTRY_REF,
        semantic_sha256: semanticDigest(lifecycle),
        status: lifecycle.status,
      },
      orchestration_contract: {
        ref: ORCHESTRATION_CONTRACT_REF,
        sha256: sha256(read(ORCHESTRATION_CONTRACT_REF)),
      },
      skill_registry: {
        ref: SKILL_REGISTRY_REF,
        sha256: sha256(read(SKILL_REGISTRY_REF)),
        status: skillRegistry.status,
      },
    },
    lifecycle: {
      artifacts,
      evidence: lifecycle.evidence.filter((item) => evidenceIds.has(item.id)),
      gates,
      stage,
      work_unit: workUnit,
    },
    execution: {
      mode: mode ? orchestration.modes[mode] : null,
      selected,
      transition,
      work_unit_route: route,
    },
    skills: selectedSkills(route, skillRegistry),
  };
  result.references = [...collectPathReferences(result), LIFECYCLE_REGISTRY_REF, ORCHESTRATION_CONTRACT_REF, SKILL_REGISTRY_REF]
    .filter((value, index, all) => all.indexOf(value) === index)
    .sort();
  return canonicalize(result);
}

