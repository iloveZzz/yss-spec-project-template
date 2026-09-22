import { existsSync, readFileSync } from './validation-phase.mjs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { safe } from './strategic-handoff-io.mjs';
import { ROOT } from './lifecycle-registry.mjs';
import { parseDocument } from '../vendor/yaml.mjs';

export const SCOPE_REF = '.yss-execution-scope.yaml';
export const TERMINAL_REF = '.yss-backend-delivery.json';
const read = (root, ref) => {
  const file = safe(root, ref);
  const doc = parseDocument(readFileSync(file, 'utf8'), { uniqueKeys: true });
  if (doc.errors.length) throw new TypeError(doc.errors[0].message);
  return doc.toJS({ maxAliasCount: 0 });
};
const check = (ok, message) => { if (!ok) throw new TypeError(`execution-scope-blocked: ${message}`); };

/** The project opt-in selects a policy; callers cannot supply a replacement policy. */
export function loadExecutionScope(root = ROOT) {
  const marker = path.join(root, '.yss-plugin.json');
  const plugin = existsSync(marker) ? read(root, '.yss-plugin.json') : null;
  const file = path.join(root, SCOPE_REF);
  if (!existsSync(file)) {
    check(!['yss-plan-to-backend', 'yss-backend-delivery'].includes(plugin?.plugin), '插件项目缺少职责范围；迁移后才能继续');
    return null;
  }
  const config = read(root, SCOPE_REF), identity = read(root, 'yss-project.yaml');
  check(identity.schema_version === 1 && identity.repository_mode === 'project-instance', '职责范围仅适用于项目实例');
  check(config.schema_version === 1 && config.scope_id === 'plan-to-backend'
    && Object.keys(config).every(key => ['schema_version', 'scope_id'].includes(key)), '未知或被扩大的职责配置');
  if (plugin) check(['yss-plan-to-backend', 'yss-backend-delivery'].includes(plugin.plugin) && plugin.execution_scope === config.scope_id, '插件与项目职责绑定不一致');
  const contract = read(root, '.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml');
  const policy = contract.execution_scopes?.[config.scope_id];
  check(policy?.terminal_work_unit === 'work-unit.backend-delivery' && Array.isArray(policy.allowed_work_units), '匹配版本的主控合同缺少职责策略');
  return { ...policy, scope_id: config.scope_id };
}

export function verifyDeliveryTerminal(root = ROOT) {
  check(existsSync(path.join(root, TERMINAL_REF)), '缺少正式后端交付终点记录');
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/complete-backend-delivery'), 'verify', '--root', root], {
    cwd: root, encoding: 'utf8', input: '', timeout: 120000, maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, NODE_OPTIONS: '', NODE_PATH: '' },
  });
  check(!result.error && result.status === 0, result.error?.message || result.stderr || '后端交付终点复验失败');
  return JSON.parse(result.stdout);
}

export function assertScopeWorkUnit(workUnit, { root = ROOT, readOnly = false } = {}) {
  const scope = loadExecutionScope(root);
  if (!scope) { check(workUnit !== 'work-unit.backend-delivery', '后端终点需要显式职责范围'); return null; }
  check(scope.allowed_work_units.includes(workUnit), `职责范围不允许 ${workUnit}`);
  if (existsSync(path.join(root, TERMINAL_REF))) {
    verifyDeliveryTerminal(root);
    check(readOnly, '后端交付已完成；不能恢复实现或自动发布');
  }
  return scope;
}

export function scopedNextRoutes(workUnit, routes, { root = ROOT } = {}) {
  const scope = loadExecutionScope(root);
  if (!scope) return routes.filter(id => id !== 'work-unit.backend-delivery');
  assertScopeWorkUnit(workUnit, { root, readOnly: true });
  if (existsSync(path.join(root, TERMINAL_REF))) return [];
  return (scope.route_overrides[workUnit] || routes).filter(id => scope.allowed_work_units.includes(id));
}

export function assertScopeTransition(current, next, state, { root = ROOT } = {}) {
  const scope = loadExecutionScope(root);
  if (!scope) { check(current !== 'work-unit.backend-delivery' && next !== 'work-unit.backend-delivery', '后端终点需要显式职责范围'); return; }
  if (current === scope.terminal_work_unit && next === null) { verifyDeliveryTerminal(root); return; }
  assertScopeWorkUnit(current, { root });
  if (next) assertScopeWorkUnit(next, { root });
  check(next !== null, '不能把中间阶段声明为后端交付完成');
  assertScopeImpacts(state, { root });
}

export function assertScopeImpacts(state, { root = ROOT } = {}) {
  if (!loadExecutionScope(root)) return;
  check(state?.delivery_impacts?.frontend !== true, '产品 UI 设计保留，生产前端实现必须交给下游');
  if (state?.ui_impact === true) {
    const deferred = state.downstream_frontend;
    check(deferred && ['owner', 'ticket_ref', 'verification_plan', 'target_version'].every(key => typeof deferred[key] === 'string' && deferred[key].trim()), 'UI 产品须明确下游前端责任、Ticket、验证计划和目标版本');
  }
}

export function assertScopeSlice(contract, { root = ROOT } = {}) {
  if (!loadExecutionScope(root)) return;
  check(contract.backend?.status === 'required' && contract.frontend?.status === 'not-applicable', '本职责仅允许后端 Slice；产品 UI 设计不能混作前端实现批准');
  check(!(contract.common?.impacted_areas || []).some(x => ['ui', 'frontend'].includes(x)), 'Slice 仍包含生产前端实现影响');
  const roles = (contract.work_units || []).map(unit => unit.role_id);
  check(!roles.includes('role.frontend-engineer'), '禁止派发前端实现');
}
