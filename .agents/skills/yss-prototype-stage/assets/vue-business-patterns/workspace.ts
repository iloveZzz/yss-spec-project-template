import { createApp, type Component } from 'vue'
import Workspace from './Workspace.vue'
import { validateWorkspace } from './workspace-model.js'

export type WorkspaceDefinition = {
  brand: string
  modules: { id: string; label: string }[]
  groups: { id: string; label: string; moduleId: string }[]
  pages: { id: string; title: string; moduleId: string; groupId: string; component: Component; icon?: Component; sceneKey?: string; mapScene?: (scene: any) => any }[]
  defaultPage: string
  sceneMode?: 'pages' | 'direct'
  appearance?: 'standard' | 'glass'
}
export function singlePageDefinition(page: Component, title: string, appearance: 'standard' | 'glass' = 'standard', id = 'main'): WorkspaceDefinition {
  return { brand: 'YSS 资料中心', modules: [{ id: 'records', label: '资料管理' }], groups: [{ id: 'tasks', label: '业务任务', moduleId: 'records' }], pages: [{ id, title, moduleId: 'records', groupId: 'tasks', component: page }], defaultPage: id, sceneMode: 'direct', appearance }
}
export function mountWorkspace(definition: WorkspaceDefinition) {
  validateWorkspace(definition)
  document.documentElement.dataset.appearance = definition.appearance || 'standard'
  const app = createApp(Workspace, { definition })
  app.config.errorHandler = error => (window as any).prototypeRuntime.showError(error)
  app.mount('#app')
  return app
}

import './business-controls.css'
