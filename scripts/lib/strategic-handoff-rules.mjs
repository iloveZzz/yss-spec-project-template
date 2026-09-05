import { ensure, digest } from './strategic-handoff-io.mjs';
const nonempty = value => typeof value === 'string' && value.trim();
const strings = value => Array.isArray(value) && value.length && value.every(nonempty);
export function extractTraceability(strategy) {
  ensure(strategy.traceability_version === 1, 'migration-required: 导出前必须补齐 traceability_version: 1、稳定规则 ID 与场景关联并重新批准');
  ensure(Array.isArray(strategy.rule_catalog) && strategy.rule_catalog.length, 'rule_catalog 不能为空');
  const contexts = new Set((strategy.contexts || []).map(x => x.context_id));
  const rules = new Map(), scenarios = new Map(), used = new Set();
  for (const rule of strategy.rule_catalog) {
    ensure(/^rule\.[a-z0-9][a-z0-9-]*$/.test(rule.rule_id) && !rules.has(rule.rule_id), `规则 ID 无效或重复: ${rule.rule_id}`);
    ensure(nonempty(rule.statement) && contexts.has(rule.responsible_context) && rule.status === 'confirmed', `规则未确认或责任区无效: ${rule.rule_id}`);
    rules.set(rule.rule_id, { ...rule, source_digest: digest(rule) });
  }
  ensure(Array.isArray(strategy.scenarios) && strategy.scenarios.length, 'scenarios 不能为空');
  for (const scenario of strategy.scenarios) {
    const id = scenario.scenario_id;
    ensure(/^scenario\.[a-z0-9][a-z0-9-]*$/.test(id) && !scenarios.has(id), `场景 ID 无效或重复: ${id}`);
    ensure(scenario.status === 'confirmed' && typeof scenario.critical === 'boolean' && contexts.has(scenario.responsible_context), `场景必须已确认并明确 critical 与责任区: ${id}`);
    ensure(strings(scenario.rule_refs) && new Set(scenario.rule_refs).size === scenario.rule_refs.length, `场景缺少唯一 rule_refs: ${id}`);
    ensure(strings(scenario.commands) && strings(scenario.success_results) && strings(scenario.failure_results), `场景缺成功/失败路径: ${id}`);
    for (const ref of scenario.rule_refs) { ensure(rules.has(ref), `场景规则悬空: ${ref}`); used.add(ref); }
    ensure(JSON.stringify([...(scenario.rules || [])].sort()) === JSON.stringify(scenario.rule_refs.map(ref => rules.get(ref).statement).sort()), `场景规则正文与 rule_refs 不一致: ${id}`);
    scenarios.set(id, { ...scenario, source_digest: digest(scenario) });
  }
  for (const inv of strategy.invariants || []) {
    ensure(rules.has(inv.rule_ref) && rules.get(inv.rule_ref).statement === inv.statement, `不变量必须关联一致的源规则: ${inv.invariant_id}`);
    ensure(strings(inv.scenario_refs) && inv.scenario_refs.every(ref => scenarios.has(ref) && scenarios.get(ref).rule_refs.includes(inv.rule_ref)), `不变量场景引用未覆盖规则: ${inv.invariant_id}`);
    used.add(inv.rule_ref);
  }
  ensure([...rules.keys()].every(ref => used.has(ref)), '存在未关联场景/不变量的规则');
  return { rules: [...rules.values()].sort((a,b) => a.rule_id.localeCompare(b.rule_id)), scenarios: [...scenarios.values()].sort((a,b) => a.scenario_id.localeCompare(b.scenario_id)) };
}
export function compareIndexes(current, previous) {
  const index = data => new Map([...data.rules.map(x => [x.rule_id, x.source_digest]), ...data.scenarios.map(x => [x.scenario_id, x.source_digest])]);
  const now = index(current), old = index(previous || { rules: [], scenarios: [] });
  return { added: [...now.keys()].filter(k => !old.has(k)).sort(), updated: [...now.keys()].filter(k => old.has(k) && now.get(k) !== old.get(k)).sort(), removed: [...old.keys()].filter(k => !now.has(k)).sort() };
}
