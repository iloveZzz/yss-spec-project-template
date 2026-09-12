import { ensure } from './strategic-handoff-io.mjs';

export function designTargets(data) {
  const design = data.schema_version === 2 ? data.design : data;
  const catalogs = data.schema_version === 2 && data.design_scope === 'engineering-only' ? ['component_catalog'] : data.schema_version === 2 && data.architecture?.family === 'layered-mvc'
    ? ['module_catalog', 'use_case_catalog', 'rule_catalog', 'state_transition_catalog', 'persistence_mapping', 'integration_catalog']
    : ['aggregate_catalog', 'entity_catalog', 'value_object_catalog', 'behavior_catalog', 'invariant_catalog', 'state_transition_catalog', 'domain_event_catalog', 'gateway_catalog'];
  const primaryKeys = { component_catalog: 'component_id', module_catalog: 'module_id', use_case_catalog: 'use_case_id', rule_catalog: 'rule_id', state_transition_catalog: 'transition_id', persistence_mapping: 'mapping_id', integration_catalog: 'integration_id', aggregate_catalog: 'aggregate_id', entity_catalog: 'entity_id', value_object_catalog: 'value_object_id', behavior_catalog: 'behavior_id', invariant_catalog: 'invariant_id', domain_event_catalog: 'event_id', gateway_catalog: 'gateway_id' };
  const ids = catalogs.flatMap(key => (design?.[key] || []).map(item => item[primaryKeys[key]]).filter(Boolean));
  ensure(new Set(ids).size === ids.length, '设计对象 ID 重复');
  const seams = design?.test_seams || [];
  ensure(new Set(seams.map(item => item.seam_id)).size === seams.length, '测试 seam ID 重复');
  return { ids: new Set(ids), seams: new Map(seams.map(item => [item.seam_id, item])) };
}

