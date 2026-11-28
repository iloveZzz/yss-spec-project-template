import type { AgentToRendererMessage } from '@a2ui/web_core/v1_0'
import { catalogId } from './surface'

export const surfaceId = 'registration'
export const registrationId = 'R24'

function button(name: 'showEntry' | 'showSummary') {
  return {
    id: 'navigation', component: 'Button', child: 'label', variant: 'primary',
    action: { event: { name, context: { registrationId: { '@path': '/registrationId' } } } },
  } as const
}

const create: AgentToRendererMessage = {
  version: '1.0',
  createSurface: {
    surfaceId, catalogId,
    dataModel: { registrationId, status: '已报名 · 1 个名额', venue: '二楼 · 分享厅', time: '周六 14:00 开始' },
    components: [
      { id: 'root', component: 'Card', child: 'content' },
      { id: 'content', component: 'Column', children: ['status', 'navigation'] },
      { id: 'status', component: 'Text', text: { '@path': '/status' } },
      button('showEntry'),
      { id: 'label', component: 'Text', text: '查看入场指引' },
    ],
  },
}

export const summary: readonly AgentToRendererMessage[] = [create]
export const entry: readonly AgentToRendererMessage[] = [
  create,
  {
    version: '1.0',
    updateComponents: {
      surfaceId, components: [
        { id: 'content', component: 'Column', children: ['venue', 'time', 'navigation'] },
        { id: 'venue', component: 'Text', text: { '@path': '/venue' } },
        { id: 'time', component: 'Text', variant: 'caption', text: { '@path': '/time' } },
        button('showSummary'),
        { id: 'label', component: 'Text', text: '返回报名摘要' },
      ],
    },
  },
  { version: '1.0', updateDataModel: { surfaceId, path: '/time', value: '周六 13:45 开始入场' } },
]
