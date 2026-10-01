import path from 'node:path';
import {createHash} from 'node:crypto';
import {readFileSync} from './validation-phase.mjs';
import {parseDocument} from '../vendor/yaml.mjs';
import {safe} from './strategic-handoff-io.mjs';

const collections = ['stages', 'gates', 'checks', 'artifacts', 'work_units', 'evidence'];
const token = /(?<![\w./-])(?:stage|gate|check|artifact|work-unit|evidence|role)\.[a-z0-9][a-z0-9-]*(?![\w./-])/g;
export const presentationRefs = {
  registry: '.template-spec/process/lifecycle-registry.yaml',
  roles: '.template-spec/agents/digital-human-roles.yaml',
};

/** Names describe identities, never approval, readiness or execution authority. */
export function createLifecyclePresenter(registry = {}, roles = {}) {
  const records = [...collections.flatMap(key => registry[key] ?? []), ...(roles.roles ?? []), ...(roles.orchestrator ? [roles.orchestrator] : [])];
  const byId = new Map(records.filter(record => record && typeof record.id === 'string').map(record => [record.id, record]));
  const describe = id => {
    const record = byId.get(id);
    const name = record?.public_name ?? record?.name;
    return {id, name: typeof name === 'string' && name.trim() ? name : '名称未识别', known: typeof name === 'string' && !!name.trim()};
  };
  const label = (id, {trace = true} = {}) => {
    const item = describe(id);
    return item.known && !trace ? item.name : `${item.name}（${id}）`;
  };
  const text = (value, options) => String(value).replace(token, id => label(id, options));
  const catalog = value => {
    const ids = new Set();
    const visit = item => {
      if (typeof item === 'string') for (const id of item.match(token) ?? []) ids.add(id);
      else if (item && typeof item === 'object') for (const [key, child] of Object.entries(item)) { visit(key); visit(child); }
    };
    visit(value);
    return Object.fromEntries([...ids].sort().map(id => [id, describe(id)]));
  };
  return {describe, label, text, catalog, roleIds: records.filter(record => typeof record?.id === 'string' && record.id.startsWith('role.')).map(record => record.id)};
}

/** Optional presentation sources: legacy instances remain readable when names are unavailable. */
export function loadLifecyclePresenter(root) {
  const values = {}, sources = [], warnings = [];
  for (const [key, ref] of Object.entries(presentationRefs)) {
    let digest = null;
    try {
      const bytes = readFileSync(safe(path.resolve(root), ref));
      digest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
      const doc = parseDocument(String(bytes), {uniqueKeys: true, maxAliasCount: 0});
      if (doc.errors.length) throw Error(doc.errors[0].message);
      const value = doc.toJS({maxAliasCount: 0});
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('名称来源须为对象');
      for (const collection of key === 'registry' ? collections : ['roles']) {
        if (value[collection] !== undefined && !Array.isArray(value[collection])) throw Error(`${collection} 须为数组`);
      }
      values[key] = value;
    } catch (error) {
      warnings.push(`名称来源不可用：${ref}；${error.message}`);
    }
    sources.push({ref, digest});
  }
  return {...createLifecyclePresenter(values.registry, values.roles), sources, warnings};
}

export function renderLifecycleStatus(result) {
  const view = result.presentation;
  if (!view) throw Error('缺少状态阅读信息');
  return [
    `当前阶段：${view.stage}。登记状态：${view.checkpoint_status}。`,
    `当前阻塞：${view.blockers.length ? view.blockers.join('；') : '未登记阻塞；完整就绪与批准仍待核验'}。`,
    `负责人：${view.owner}。`,
    `下一项工作：${view.work_unit}。`,
    ...(view.expected_output ? [`预期产出：${view.expected_output}`] : []),
    `下一动作：${view.next_action}。`,
    ...view.warnings,
    '本次为只读查询，未核验完整批准或执行授权。',
  ].join('\n') + '\n';
}
