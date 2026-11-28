import type { AgentToRendererMessage } from '@a2ui/web_core/v1_0'
import { catalogId } from '../surface'
import definition from './catalog.json'

export const surfaceId = 'stagePreview'
export const recordId = 'demoOpportunity'
const scrm = { '@catalogId': definition.$id }

function navigation(name: 'preview' | 'edit') {
  return {
    id: 'navigate', component: 'Button', child: 'buttonLabel', variant: 'primary',
    action: { event: { name, context: { recordId: { '@path': '/recordId' }, note: { '@path': '/note' } } } },
  }
}

export function scene(preview: boolean, note: string): AgentToRendererMessage[] {
  const create: AgentToRendererMessage = {
    version: '1.0',
    createSurface: {
      surfaceId, catalogId,
      dataModel: { recordId, note, from: '需求沟通', to: '方案确认' },
      components: [
        { id: 'root', component: 'Card', child: 'content' },
        { id: 'content', component: 'Column', children: ['section', 'navigate'] },
        { ...scrm, id: 'section', component: 'ScrmFormSection', title: '变更说明', child: 'note' },
        { ...scrm, id: 'note', component: 'ScrmCountedTextarea', label: '备注', maxLength: 120, value: { '@path': '/note' } },
        navigation('preview'), { id: 'buttonLabel', component: 'Text', text: '预览变更' },
      ],
    },
  }
  if (!preview) return [create]
  return [create, {
    version: '1.0', updateComponents: {
      surfaceId, components: [
        { id: 'content', component: 'Column', children: ['transition', 'callout', 'navigate'] },
        { ...scrm, id: 'transition', component: 'ScrmStageTransition', fromLabel: { '@path': '/from' }, toLabel: { '@path': '/to' } },
        { ...scrm, id: 'callout', component: 'ScrmFormCallout', tone: 'neutral', child: 'previewNote' },
        { id: 'previewNote', component: 'Text', text: note ? { '@path': '/note' } : '未填写备注' },
        navigation('edit'), { id: 'buttonLabel', component: 'Text', text: '返回修改' },
      ],
    },
  }]
}
