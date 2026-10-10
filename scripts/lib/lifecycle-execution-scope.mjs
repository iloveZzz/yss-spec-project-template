import { existsSync, readFileSync } from './validation-phase.mjs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { safe } from './strategic-handoff-io.mjs';
import { ROOT } from './lifecycle-registry.mjs';
import { parseDocument } from '../vendor/yaml.mjs';
import { createHash } from 'node:crypto';
import {readProgressionTarget} from './lifecycle-progression.mjs';
import {readInstanceMetadata} from './instance-metadata.mjs';

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
  const current=path.join(root,'.yss-backend-plugin.json');
  const marker = path.join(root, '.yss-plugin.json');
  const plugin = existsSync(current)?read(root,'.yss-backend-plugin.json'):existsSync(marker)?read(root,'.yss-plugin.json'):null;
  if(existsSync(current)) {
    check(plugin?.schema_version===2&&plugin?.plugin==='yss-backend-delivery'&&plugin?.execution_scope==='plan-to-backend','native插件职责绑定无效');
    if(existsSync(marker)) {
      const legacy=read(root,'.yss-plugin.json');
      check(['yss-plan-to-backend','yss-backend-delivery'].includes(legacy?.plugin)&&legacy?.execution_scope===plugin.execution_scope,'历史插件与native职责绑定不一致');
      if(plugin.legacy_binding) check(plugin.legacy_binding.path==='.yss-plugin.json'&&plugin.legacy_binding.sha256===createHash('sha256').update(readFileSync(safe(root,'.yss-plugin.json'))).digest('hex'),'历史插件绑定原字节已漂移');
    } else check(!plugin.legacy_binding,'历史插件绑定缺失');
  }
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

/** Bind a native specialist delivery or an explicitly requested Spec package to one feature. */
export function authorizeBackendDelivery({root = ROOT, checkpointRef, assetRef, readOnly = false, deliveryMode} = {}) {
  const scope = loadExecutionScope(root);
  if (scope) return {mode: 'execution-scope', checkpoint_ref: checkpointRef ?? null, terminal_ref: TERMINAL_REF};
  const metadata = readInstanceMetadata(root), identity = read(root, 'yss-project.yaml');
  if (metadata?.kind === 'native' && metadata.profile === 'backend') {
    check(identity.schema_version === 1 && identity.repository_mode === 'project-instance'
      && read(root, '.template-spec/process/harness-profile.yaml').profile_id === 'harness.backend-delivery', '后端专职实例身份不一致');
    check(typeof checkpointRef === 'string' && checkpointRef, '后端专职交付需要明确功能 checkpoint');
    if(deliveryMode === 'local-evidence') check(read(root,'.agents/skills/harness-orchestrator/references/orchestration-contract.yaml').progression_target?.local_implementation_inputs === 'native-profile-current-feature-approved-assets','当前后端合同未支持本地业务交付证据');
    const feature = readProgressionTarget({root, checkpointRef, includeDefault: true});
    check(feature?.target === 'profile-terminal' && feature.policy.required_checks?.includes('backend-delivery'), '当前后端合同缺少本端交付完成政策');
    const checkpoint = read(root, feature.checkpoint_ref);
    check(!checkpoint.profile_id || checkpoint.profile_id === 'harness.backend-delivery', 'checkpoint Profile 与后端工程不一致');
    return {mode: 'backend-profile', checkpoint_ref: feature.checkpoint_ref,
      terminal_ref: `${path.posix.dirname(feature.map_ref)}/backend-delivery.json`};
  }
  if(metadata?.kind==='native'&&metadata.profile==='spec')check(read(root,'.template-spec/process/harness-profile.yaml').profile_id==='harness.spec-template','native Spec metadata 与 Harness Profile 身份不一致');
  const intent = readProgressionTarget({root, checkpointRef, assetRef, includeDefault: true});
  check(intent, '后端交付需要显式职责范围或本功能交付意图');
  check(identity.schema_version === 1 && identity.repository_mode === 'project-instance' && metadata?.kind === 'native' && metadata.profile === 'spec', '条件后端交付仅适用于真实 native Spec 实例，不能扩专职 Profile');
  const checkpoint = read(root, intent.checkpoint_ref);
  check(!checkpoint.profile_id || checkpoint.profile_id === 'harness.spec-template', 'checkpoint Profile 与 Spec 工程不一致');
  const contract = read(root, intent.contract_ref);
  check(contract.work_unit_routes?.['work-unit.backend-delivery']?.applies_when === 'backend-delivery-requested', '当前合同不支持条件后端交付');
  const terminalRef = `${path.posix.dirname(intent.map_ref)}/backend-delivery.json`;
  const external = intent.consumers.some(consumer => consumer.profile === 'backend' && path.resolve(consumer.root) !== intent.root);
  const existing = readOnly && existsSync(safe(root, terminalRef));
  const existingLocal = existing && read(root, terminalRef).delivery_mode === 'local-evidence';
  const business = !external && (['backend-deliverable', 'frontend-accepted', 'business-accepted'].includes(intent.target) || existingLocal);
  if (business) {
    check(contract.progression_target?.completion_policy?.['business-accepted']?.conditional_required_checks?.['backend-delivery'] === 'backend-api-data-impact', '当前业务政策缺少本地后端条件核验');
    const sliceRef = checkpoint.human_review?.implementation?.slice_contract_ref || checkpoint.review_input?.slice_contract_ref
      || checkpoint.artifacts?.['artifact.slice-implementation-contract']?.ref || checkpoint.slice_contract?.ref
      || checkpoint.gates?.['gate.slice-contract-approved']?.subject_ref;
    check(sliceRef, '本地业务交付缺少当前功能 Slice');
    const saved = read(root, sliceRef), slice = saved.slice_contract || saved;
    check(slice.status === 'approved' && (slice.schema_version === 3 ? slice.applicability?.backend?.status : slice.backend?.status) === 'required', '本地业务交付需要当前批准且适用的后端 Slice');
    const gate = checkpoint.gates?.['gate.slice-contract-approved'];
    check(gate?.status === 'approved' && gate.subject_ref === sliceRef, '本地业务交付需要当前 checkpoint 的 Slice 批准门禁');
  }
  const requested = external || business
    || (deliveryMode === 'local-evidence' && intent.target === 'backend-deliverable');
  check(requested || existing, '本功能未请求后端交付；不能扩大职责或按其他功能推断');
  return {mode: 'feature-target', checkpoint_ref: intent.checkpoint_ref, terminal_ref: terminalRef,
    ...(business ? {local_scope: 'business'} : {})};
}

export function verifyDeliveryTerminal(root = ROOT, {checkpointRef, assetRef} = {}) {
  const authorization = authorizeBackendDelivery({root, checkpointRef, assetRef, readOnly: true});
  check(existsSync(safe(root, authorization.terminal_ref)), '缺少正式后端交付终点记录');
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/complete-backend-delivery'), 'verify', '--root', root, ...(authorization.checkpoint_ref ? ['--checkpoint', authorization.checkpoint_ref] : [])], {
    cwd: root, encoding: 'utf8', input: '', timeout: 120000, maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, NODE_OPTIONS: '', NODE_PATH: '' },
  });
  check(!result.error && result.status === 0, result.error?.message || result.stderr || '后端交付终点复验失败');
  return JSON.parse(result.stdout);
}

export function assertScopeWorkUnit(workUnit, { root = ROOT, readOnly = false, checkpointRef, assetRef } = {}) {
  const scope = loadExecutionScope(root);
  if (!scope) { if (workUnit === 'work-unit.backend-delivery') authorizeBackendDelivery({root, readOnly, checkpointRef, assetRef}); return null; }
  check(scope.allowed_work_units.includes(workUnit), `职责范围不允许 ${workUnit}`);
  if (existsSync(path.join(root, TERMINAL_REF))) {
    verifyDeliveryTerminal(root);
    check(readOnly, '后端交付已完成；不能恢复实现或自动发布');
  }
  return scope;
}

export function scopedNextRoutes(workUnit, routes, { root = ROOT, checkpointRef, assetRef } = {}) {
  const scope = loadExecutionScope(root);
  if (!scope) return routes.filter(id => {if (id !== 'work-unit.backend-delivery') return true; try {authorizeBackendDelivery({root, checkpointRef, assetRef}); return true;} catch {return false;} });
  assertScopeWorkUnit(workUnit, { root, readOnly: true });
  if (existsSync(path.join(root, TERMINAL_REF))) return [];
  return (scope.route_overrides[workUnit] || routes).filter(id => scope.allowed_work_units.includes(id));
}

export function assertScopeTransition(current, next, state, { root = ROOT } = {}) {
  const scope = loadExecutionScope(root);
  if (!scope) {
    if (current === 'work-unit.backend-delivery' || next === 'work-unit.backend-delivery') {
      authorizeBackendDelivery({root, checkpointRef: state?.checkpoint_ref, readOnly: current === 'work-unit.backend-delivery'});
      if (current === 'work-unit.backend-delivery') verifyDeliveryTerminal(root, {checkpointRef: state?.checkpoint_ref});
    }
    return;
  }
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
