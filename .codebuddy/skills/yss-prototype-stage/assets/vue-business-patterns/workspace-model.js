// Framework state only. Business state remains in the supplied page scenes.
const validId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(value);
export function validateWorkspace(definition) {
  if (!definition?.brand?.trim()) throw Error('工作区缺少品牌名称');
  for (const key of ['modules', 'groups', 'pages']) {
    const values = definition[key];
    if (!Array.isArray(values) || !values.length) throw Error(`工作区缺少 ${key}`);
    const ids = new Set();
    for (const value of values) {
      if (!validId(value.id) || ids.has(value.id)) throw Error(`工作区 ${key} ID 非法或重复`);
      ids.add(value.id);
      if (!(value.title || value.label)?.trim()) throw Error(`工作区 ${key} 缺少名称`);
    }
  }
  for (const group of definition.groups) {
    if (!definition.modules.some(m => m.id === group.moduleId)) throw Error('导航分组引用未知模块');
  }
  for (const page of definition.pages) {
    if (!page.component || !definition.groups.some(g => g.id === page.groupId && g.moduleId === page.moduleId)) throw Error('页面组件或导航分组无效');
  }
  if (!definition.pages.some(p => p.id === definition.defaultPage)) throw Error('默认页面不存在');
  if (definition.modules.some(m => !definition.pages.some(p => p.moduleId === m.id))) throw Error('模块没有可操作页面');
  return definition;
}
export function readPageId(search, definition) {
  const params = new URLSearchParams(search);
  if (!params.size) return definition.defaultPage;
  if (params.size !== 1 || !params.has('page') || !definition.pages.some(p => p.id === params.get('page'))) throw Error('未知或缺失的页面，请检查工作区链接。');
  return params.get('page');
}
export function pageLink(href, definition, id) {
  if (!definition.pages.some(page => page.id === id)) throw Error('页面未登记');
  const url = new URL(href);
  if (!['file:', 'http:', 'https:'].includes(url.protocol)) throw Error('工作区入口协议无效');
  url.search = '';
  url.searchParams.set('page', id);
  return url.href;
}
export function createWorkspaceState(definition, pageId = definition.defaultPage) {
  if (!definition.pages.some(p => p.id === pageId)) throw Error('页面未登记');
  return { activeId: pageId, opened: [...new Set([definition.defaultPage, pageId])], dirty: {}, scroll: {} };
}
export function openPage(state, definition, id) {
  if (!definition.pages.some(p => p.id === id)) throw Error('页面未登记');
  if (!state.opened.includes(id)) state.opened.push(id);
  state.activeId = id;
}
export function closePage(state, definition, id, discard = false) {
  if (id === definition.defaultPage) return 'pinned';
  const position = state.opened.indexOf(id);
  if (position < 0) return 'absent';
  if (state.dirty[id] && !discard) return 'confirm';
  if (state.activeId === id) state.activeId = state.opened[position - 1] || definition.defaultPage;
  state.opened.splice(position, 1);
  delete state.dirty[id];
  delete state.scroll[id];
  return 'closed';
}
export function pageScene(scene, page, mode = 'pages') {
  const input = page.mapScene ? page.mapScene(scene) : mode === 'direct' ? scene : scene.data.pages?.[page.sceneKey || page.id];
  const data = input?.data ?? input?.initial_data;
  if (!input?.id || !data || typeof data !== 'object' || Array.isArray(data) || !(input.stateRef || input.state_ref)) throw Error(`页面 ${page.id} 缺少当前场景数据或来源`);
  return { id: input.id, label: input.label, stateRef: input.stateRef || input.state_ref, data: JSON.parse(JSON.stringify(data)), ticket: scene.ticket };
}

// Page Tags are navigation buttons, not a tablist: focus movement does not activate.
export function pageTagFocusTarget(opened, current, key) {
  const position = opened.indexOf(current);
  if (position < 0 || !opened.length) return null;
  if (key === 'Home') return opened[0];
  if (key === 'End') return opened.at(-1);
  if (key === 'ArrowLeft') return opened[(position + opened.length - 1) % opened.length];
  if (key === 'ArrowRight') return opened[(position + 1) % opened.length];
  return null;
}
