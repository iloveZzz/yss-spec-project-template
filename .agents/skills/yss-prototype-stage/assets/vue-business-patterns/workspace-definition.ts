import { Search, FilePenLine, ClipboardList, RefreshCw, ChartColumn } from '@lucide/vue'
import listSource from './list-detail.scenarios.json'
import formSource from './multi-step.scenarios.json'
import approvalSource from './approval.scenarios.json'
import conflictSource from './conflict.scenarios.json'
import analysisSource from './analysis.scenarios.json'
import ListDetail from './ListDetail.vue'
import MultiStep from './MultiStep.vue'
import Approval from './Approval.vue'
import Conflict from './Conflict.vue'
import Analysis from './Analysis.vue'
import CombinedQuery from './CombinedQuery.vue'
import OwnerValidity from './OwnerValidity.vue'
import querySource from './combined-query.scenarios.json'
import validitySource from './owner-validity.scenarios.json'
import type { WorkspaceDefinition } from './workspace'
function fromSource(name: string, source: any) {
  return (scene: any) => {
    const page = scene.data.pages?.[name]
    const original = source.scenarios.find((item: any) => item.id === page?.id)
    if (!original || JSON.stringify(page.initial_data) !== JSON.stringify(original.initial_data) || page.state_ref !== original.state_ref) throw Error(`页面 ${name} 场景与登记来源不一致`)
    return page
  }
}
export function workspaceDefinition(appearance: 'standard' | 'glass' = 'standard'): WorkspaceDefinition {
  return {
    brand: 'YSS 资料中心', appearance, defaultPage: 'list-detail',
    modules: [{ id: 'records', label: '资料管理' }, { id: 'operations', label: '工作事项' }, { id: 'insights', label: '分析中心' }],
    groups: [{ id: 'records-pages', moduleId: 'records', label: '资料任务' }, { id: 'operations-pages', moduleId: 'operations', label: '处理与恢复' }, { id: 'insights-pages', moduleId: 'insights', label: '分析视图' }],
    pages: [
      { id: 'combined-query', title: '组合查询', moduleId: 'records', groupId: 'records-pages', component: CombinedQuery, icon: Search, mapScene: fromSource('combined-query', querySource) },
      { id: 'owner-validity', title: '负责人及有效期表单', moduleId: 'records', groupId: 'records-pages', component: OwnerValidity, icon: FilePenLine, mapScene: fromSource('owner-validity', validitySource) },
      { id: 'list-detail', title: '查询与详情', moduleId: 'records', groupId: 'records-pages', component: ListDetail, icon: Search, mapScene: fromSource('list-detail', listSource) },
      { id: 'multi-step', title: '分步表单', moduleId: 'records', groupId: 'records-pages', component: MultiStep, icon: FilePenLine, mapScene: fromSource('multi-step', formSource) },
      { id: 'approval', title: '审批与权限', moduleId: 'operations', groupId: 'operations-pages', component: Approval, icon: ClipboardList, mapScene: fromSource('approval', approvalSource) },
      { id: 'conflict', title: '冲突与恢复', moduleId: 'operations', groupId: 'operations-pages', component: Conflict, icon: RefreshCw, mapScene: fromSource('conflict', conflictSource) },
      { id: 'analysis', title: '高密度分析', moduleId: 'insights', groupId: 'insights-pages', component: Analysis, icon: ChartColumn, mapScene: fromSource('analysis', analysisSource) },
    ],
  }
}
