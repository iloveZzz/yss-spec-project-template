#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";
import { parseDocument } from "../../../../scripts/vendor/yaml.mjs";

import { parseArgs } from "node:util";
import { verifyConsumption } from "../../../../scripts/lib/strategic-handoff-consumption.mjs";

const required = [
  "schema_version", "tactical_design_id", "tactical_version", "status", "context_ref",
  "aggregate_catalog", "entity_catalog", "value_object_catalog", "behavior_catalog",
  "invariant_catalog", "state_transition_catalog", "consistency_policy", "domain_event_catalog",
  "gateway_catalog", "persistence_mapping", "test_seams", "adr_candidates", "upstream_impact",
  "version", "digest", "evidence_refs"
];
const statuses = new Set(["draft", "ready-for-human", "approved", "blocked", "stale", "drift", "new_impacts", "not-applicable"]);
const idPatterns = {
  tactical_design_id: /^tactical-design\.[a-z0-9][a-z0-9-]*$/,
  aggregate_id: /^aggregate\.[a-z0-9][a-z0-9-]*$/,
  entity_id: /^entity\.[a-z0-9][a-z0-9-]*$/,
  value_object_id: /^value-object\.[a-z0-9][a-z0-9-]*$/,
  behavior_id: /^behavior\.[a-z0-9][a-z0-9-]*$/,
  invariant_id: /^invariant\.[a-z0-9][a-z0-9-]*$/,
  transition_id: /^transition\.[a-z0-9][a-z0-9-]*$/,
  event_id: /^domain-event\.[a-z0-9][a-z0-9-]*$/,
  gateway_id: /^gateway\.[a-z0-9][a-z0-9-]*$/,
  seam_id: /^test-seam\.[a-z0-9][a-z0-9-]*$/,
  version: /^v[0-9]+$/
};

const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
const list = (value) => Array.isArray(value);

function unique(items, label, errors) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item)) errors.push(`${label} 重复: ${item}`);
    seen.add(item);
  }
}

function requireField(object, field, path, errors) {
  if (!Object.prototype.hasOwnProperty.call(object ?? {}, field) || object[field] === null || object[field] === undefined) {
    errors.push(`${path}.${field} 缺失`);
  }
}

function requireString(object, field, path, errors) {
  requireField(object, field, path, errors);
  if (Object.prototype.hasOwnProperty.call(object ?? {}, field) && !nonEmpty(object[field])) errors.push(`${path}.${field} 必须是非空字符串`);
}

function requireArray(object, field, path, errors, minimum = 0) {
  requireField(object, field, path, errors);
  if (Object.prototype.hasOwnProperty.call(object ?? {}, field) && (!list(object[field]) || object[field].length < minimum)) {
    errors.push(`${path}.${field} 必须是至少 ${minimum} 项的数组`);
  }
}

function requireId(value, kind, path, errors) {
  if (value !== undefined && value !== null && !idPatterns[kind].test(String(value))) errors.push(`${path} 格式非法`);
}

function refsExist(values, known, path, errors) {
  for (const [index, value] of (values ?? []).entries()) {
    if (!known.has(value)) errors.push(`${path}[${index}] 引用了未声明对象: ${value}`);
  }
}

function validate(data) {
  const errors = [];
  if (!isObject(data)) return ["合同必须是对象"];
  for (const field of required) requireField(data, field, "root", errors);
  if (data.schema_version !== 1) errors.push("schema_version 必须为 1");
  requireId(data.tactical_design_id, "tactical_design_id", "tactical_design_id", errors);
  for (const field of ["tactical_version", "version"]) if (data[field] !== undefined && !idPatterns.version.test(String(data[field]))) errors.push(`${field} 必须形如 v1`);
  if (data.status !== undefined && !statuses.has(data.status)) errors.push(`status 非法: ${data.status}`);
  if (data.digest !== undefined && !/^sha256:[A-Fa-f0-9]{64}$/.test(String(data.digest))) errors.push("digest 必须为 sha256 加 64 位十六进制");

  for (const field of ["aggregate_catalog", "entity_catalog", "behavior_catalog", "invariant_catalog", "state_transition_catalog", "gateway_catalog", "persistence_mapping", "test_seams"]) {
    requireArray(data, field, "root", errors, 1);
  }
  for (const field of ["value_object_catalog", "domain_event_catalog", "adr_candidates", "evidence_refs"]) requireArray(data, field, "root", errors);
  if (!isObject(data.consistency_policy)) errors.push("consistency_policy 必须是对象");
  if (!isObject(data.upstream_impact)) errors.push("upstream_impact 必须是对象");
  if (isObject(data.consistency_policy)) {
    for (const field of ["transaction_boundary", "concurrency", "idempotency", "cross_aggregate_strategy"]) requireString(data.consistency_policy, field, "consistency_policy", errors);
  }
  if (isObject(data.upstream_impact)) {
    for (const field of ["spec_ref", "strategic_ref", "api_ref", "data_ref"]) requireString(data.upstream_impact, field, "upstream_impact", errors);
    if (data.upstream_impact.upstream_current === false && data.status !== "stale") errors.push("上游已过期时 status 必须为 stale");
  }

  const aggregates = list(data.aggregate_catalog) ? data.aggregate_catalog : [];
  const entities = list(data.entity_catalog) ? data.entity_catalog : [];
  const values = list(data.value_object_catalog) ? data.value_object_catalog : [];
  const behaviors = list(data.behavior_catalog) ? data.behavior_catalog : [];
  const invariants = list(data.invariant_catalog) ? data.invariant_catalog : [];
  const transitions = list(data.state_transition_catalog) ? data.state_transition_catalog : [];
  const events = list(data.domain_event_catalog) ? data.domain_event_catalog : [];
  const gateways = list(data.gateway_catalog) ? data.gateway_catalog : [];
  const mappings = list(data.persistence_mapping) ? data.persistence_mapping : [];
  const seams = list(data.test_seams) ? data.test_seams : [];
  const ids = (items, field, kind, label) => {
    const result = new Set();
    unique(items.map((item) => item?.[field]).filter(Boolean), label, errors);
    for (const [index, item] of items.entries()) {
      if (item?.[field]) { requireId(item[field], kind, `${label}[${index}].${field}`, errors); result.add(item[field]); }
    }
    return result;
  };
  const aggregateIds = ids(aggregates, "aggregate_id", "aggregate_id", "aggregate_id");
  const entityIds = ids(entities, "entity_id", "entity_id", "entity_id");
  const valueIds = ids(values, "value_object_id", "value_object_id", "value_object_id");
  const behaviorIds = ids(behaviors, "behavior_id", "behavior_id", "behavior_id");
  const invariantIds = ids(invariants, "invariant_id", "invariant_id", "invariant_id");
  const transitionIds = ids(transitions, "transition_id", "transition_id", "transition_id");
  const eventIds = ids(events, "event_id", "event_id", "event_id");
  const gatewayIds = ids(gateways, "gateway_id", "gateway_id", "gateway_id");
  ids(seams, "seam_id", "seam_id", "seam_id");

  for (const [index, aggregate] of aggregates.entries()) {
    const path = `aggregate_catalog[${index}]`;
    if (!isObject(aggregate)) { errors.push(`${path} 必须是对象`); continue; }
    for (const field of ["aggregate_id", "name", "context_ref", "root_entity", "consistency_boundary"]) requireString(aggregate, field, path, errors);
    requireArray(aggregate, "invariant_refs", path, errors, 1); requireArray(aggregate, "behavior_refs", path, errors, 1);
    if (aggregate.model_origin === "strategic-concept") errors.push(`${path}.model_origin 不得直接把战略概念当作 Aggregate`);
    if (aggregate.api_exposure !== "internal-only") errors.push(`${path}.api_exposure 必须为 internal-only`);
    if (aggregate.root_entity && !entityIds.has(aggregate.root_entity)) errors.push(`${path}.root_entity 未引用 Entity`);
    const rootEntity = entities.find((entity) => entity?.entity_id === aggregate.root_entity);
    if (rootEntity && rootEntity.aggregate_id !== aggregate.aggregate_id) errors.push(`${path}.root_entity 的 aggregate_id 必须与当前 Aggregate 一致`);
    refsExist(aggregate.invariant_refs, invariantIds, `${path}.invariant_refs`, errors);
    refsExist(aggregate.behavior_refs, behaviorIds, `${path}.behavior_refs`, errors);
  }
  for (const [index, entity] of entities.entries()) {
    const path = `entity_catalog[${index}]`;
    if (!isObject(entity)) { errors.push(`${path} 必须是对象`); continue; }
    for (const field of ["entity_id", "name", "aggregate_id", "identity", "lifecycle"]) requireString(entity, field, path, errors);
    if (entity.aggregate_id && !aggregateIds.has(entity.aggregate_id)) errors.push(`${path}.aggregate_id 未引用 Aggregate`);
  }
  for (const [index, value] of values.entries()) {
    const path = `value_object_catalog[${index}]`;
    if (!isObject(value)) { errors.push(`${path} 必须是对象`); continue; }
    for (const field of ["value_object_id", "name", "aggregate_id", "immutable"]) requireField(value, field, path, errors);
    if (typeof value.immutable !== "boolean" || value.immutable !== true) errors.push(`${path}.immutable 必须为 true`);
    if (value.aggregate_id && !aggregateIds.has(value.aggregate_id)) errors.push(`${path}.aggregate_id 未引用 Aggregate`);
  }
  for (const [index, behavior] of behaviors.entries()) {
    const path = `behavior_catalog[${index}]`;
    if (!isObject(behavior)) { errors.push(`${path} 必须是对象`); continue; }
    for (const field of ["behavior_id", "name", "aggregate_id", "command"]) requireString(behavior, field, path, errors);
    for (const field of ["preconditions", "invariant_refs", "postconditions", "event_refs"]) requireArray(behavior, field, path, errors, field === "invariant_refs" ? 1 : 0);
    if (behavior.aggregate_id && !aggregateIds.has(behavior.aggregate_id)) errors.push(`${path}.aggregate_id 未引用 Aggregate`);
    refsExist(behavior.invariant_refs, invariantIds, `${path}.invariant_refs`, errors);
    refsExist(behavior.event_refs, eventIds, `${path}.event_refs`, errors);
  }
  for (const [index, invariant] of invariants.entries()) {
    const path = `invariant_catalog[${index}]`;
    if (!isObject(invariant)) { errors.push(`${path} 必须是对象`); continue; }
    for (const field of ["invariant_id", "aggregate_id", "statement"]) requireString(invariant, field, path, errors);
    if (invariant.aggregate_id && !aggregateIds.has(invariant.aggregate_id)) errors.push(`${path}.aggregate_id 未引用 Aggregate`);
  }
  for (const [index, transition] of transitions.entries()) {
    const path = `state_transition_catalog[${index}]`;
    if (!isObject(transition)) { errors.push(`${path} 必须是对象`); continue; }
    for (const field of ["transition_id", "aggregate_id", "from", "to", "behavior_id"]) requireString(transition, field, path, errors);
    if (transition.aggregate_id && !aggregateIds.has(transition.aggregate_id)) errors.push(`${path}.aggregate_id 未引用 Aggregate`);
    if (transition.behavior_id && !behaviorIds.has(transition.behavior_id)) errors.push(`${path}.behavior_id 未引用行为`);
  }
  for (const [index, event] of events.entries()) {
    const path = `domain_event_catalog[${index}]`;
    if (!isObject(event)) { errors.push(`${path} 必须是对象`); continue; }
    for (const field of ["event_id", "name", "aggregate_id", "delivery"]) requireString(event, field, path, errors);
    requireArray(event, "consumers", path, errors, 0);
    if (event.aggregate_id && !aggregateIds.has(event.aggregate_id)) errors.push(`${path}.aggregate_id 未引用 Aggregate`);
  }
  for (const [index, gateway] of gateways.entries()) {
    const path = `gateway_catalog[${index}]`;
    if (!isObject(gateway)) { errors.push(`${path} 必须是对象`); continue; }
    for (const field of ["gateway_id", "name", "context_ref", "layer"]) requireString(gateway, field, path, errors);
    requireArray(gateway, "capabilities", path, errors, 1);
    if (gateway.layer !== "Domain") errors.push(`${path}.layer 必须为 Domain，Infrastructure 只实现 Gateway`);
  }
  for (const [index, mapping] of mappings.entries()) {
    const path = `persistence_mapping[${index}]`;
    if (!isObject(mapping)) { errors.push(`${path} 必须是对象`); continue; }
    for (const field of ["aggregate_id", "storage_model", "notes"]) requireString(mapping, field, path, errors);
    if (mapping.aggregate_id && !aggregateIds.has(mapping.aggregate_id)) errors.push(`${path}.aggregate_id 未引用 Aggregate`);
  }
  for (const [index, seam] of seams.entries()) {
    const path = `test_seams[${index}]`;
    if (!isObject(seam)) { errors.push(`${path} 必须是对象`); continue; }
    for (const field of ["seam_id", "kind", "subject_ref", "assertion"]) requireString(seam, field, path, errors);
    if (seam.subject_ref && !new Set([...aggregateIds, ...entityIds, ...valueIds, ...behaviorIds, ...invariantIds, ...transitionIds, ...gatewayIds]).has(seam.subject_ref)) errors.push(`${path}.subject_ref 未引用已声明领域对象`);
  }
  if (isObject(data.complexity) && data.complexity.escalate_to_standalone === true && !nonEmpty(data.complexity.standalone_ref)) errors.push("complexity.escalate_to_standalone 为 true 时必须提供 standalone_ref");
  return errors;
}

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { root: { type: "string", default: process.cwd() }, slice: { type: "string" } } });
  const file = positionals[0];
  if (!file) throw new Error("用法: validate-tactical-design.mjs <contract.yaml>");
  const source = await readFile(file, "utf8");
  const document = parseDocument(source, { maxAliasCount: 0, uniqueKeys: true });
  if (document.errors.length) throw new Error(`无法解析合同: ${document.errors[0].message}`);
  const data = document.toJS({ maxAliasCount: 0 });
  const errors = validate(data);
  if (data.strategic_handoff || data.strategic_context_import_ref || data.upstream_impact?.source_kind === "strategic-handoff") {
    try { const result = await verifyConsumption(data, { root: values.root, sliceRef: values.slice }); if (result.result !== "verified") errors.push(JSON.stringify(result)); } catch (error) { errors.push(error.message); }
  }
  if (errors.length) {
    process.stderr.write(`${JSON.stringify({ result: "blocked", errors }, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`${JSON.stringify({ result: "ready-for-lifecycle-review", tactical_design_id: document.get("tactical_design_id"), status: document.get("status") }, null, 2)}\n`);
}

main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
