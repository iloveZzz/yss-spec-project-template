import {
  getValue, isComponentNode, MessageProcessor, NodeResolver, ResolvedBinding,
  STRICT_VALIDATION, type ActionPayload, type CatalogApi, type ComponentNode, type NodeAction,
  type WritableBinding,
} from '@a2ui/web_core'
import { basicCatalog } from '@a2ui/web_core/catalogs/basic/v1'
import { ActionMessageSchema, AgentToRendererMessageSchema } from '@a2ui/web_core/v1_0'
import { onScopeDispose, ref, shallowRef, type Component } from 'vue'

export const catalogId = 'https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json'

interface CustomView {
  view: Component
  props: Record<string, unknown>
  children?: unknown[]
  slotText?: string
}

type WriteValue = <T>(binding: WritableBinding<T>, value: T) => void

export interface PrototypeExtension {
  catalog: CatalogApi
  check?(node: Record<string, unknown>): void
  project(node: ComponentNode, write: WriteValue): CustomView
}

export type ViewNode =
  | { id: string; kind: 'Card' | 'Column'; children: ViewNode[] }
  | { id: string; kind: 'Text'; text: string; caption: boolean }
  | { id: string; kind: 'Button'; label: string; variant: 'default' | 'outline' | 'ghost'; activate: NodeAction }
  | { id: string; kind: 'custom'; view: Component; props: Record<string, unknown>; children: ViewNode[]; slotText?: string }

const fields: Record<string, readonly string[]> = {
  Card: ['child'], Column: ['children'], Text: ['text', 'variant'], Button: ['child', 'action', 'variant'],
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPath(value: unknown) {
  return record(value) && Object.keys(value).length === 1 && typeof value['@path'] === 'string'
}

function checkComponent(node: Record<string, unknown>, extensions: readonly PrototypeExtension[]) {
  const kind = String(node.component)
  if (node['@catalogId'] !== undefined) {
    const extension = extensions.find(item => item.catalog.id === node['@catalogId'])
    if (!extension?.catalog.components.has(kind)) {
      throw new Error('未注册的扩展组件：' + kind)
    }
    if (extension.check) return extension.check(node)
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('@') && key !== '@catalogId') throw new Error('尚未映射扩展属性：' + key)
      if (value !== null && typeof value === 'object' && !isPath(value)) {
        throw new Error('扩展属性仅接受标量或单一路径绑定：' + key)
      }
    }
    return
  }
  if (!Object.hasOwn(fields, kind)) throw new Error('原型尚未映射组件 ' + kind)
  const extra = Object.keys(node).find(key => !['id', 'component', ...fields[kind]].includes(key))
  if (extra) throw new Error(kind + ' 尚未映射属性 ' + extra)
  if (kind === 'Column' && !Array.isArray(node.children)) throw new Error('Column 需要静态子节点列表')
  if (kind === 'Text' && typeof node.text !== 'string' && !isPath(node.text)) {
    throw new Error('Text 需要纯文本或路径绑定')
  }
  if (kind === 'Button') {
    const action = node.action
    const event = record(action) && action.event
    if (!record(event) || !record(action) || Object.keys(action).length !== 1 ||
        Object.keys(event).some(key => key !== 'name' && key !== 'context')) {
      throw new Error('Button 仅支持具名事件和上下文')
    }
    if (event.context !== undefined && (!record(event.context) ||
        Object.values(event.context).some(v => typeof v === 'object' && v !== null && !isPath(v)))) {
      throw new Error('事件上下文需要标量或路径绑定')
    }
  }
}

function project(node: unknown, extensions: readonly PrototypeExtension[], write: WriteValue): ViewNode {
  if (!isComponentNode(node) || node.state !== 'resolved') throw new Error('组件引用未解析')
  const { componentId: id, type: kind } = node
  const props = getValue(node.props)
  const childView = (child: unknown) => project(child, extensions, write)
  const extension = extensions.find(item => item.catalog.components.get(kind) === node.impl)
  if (extension) {
    const custom = extension.project(node, write)
    return { id, kind: 'custom', view: custom.view, props: custom.props, slotText: custom.slotText, children: (custom.children ?? []).map(childView) }
  }
  switch (kind) {
    case 'Card': return { id, kind, children: [childView(props.child)] }
    case 'Column': {
      if (!Array.isArray(props.children)) throw new Error('Column 缺少子节点')
      return { id, kind, children: props.children.map(childView) }
    }
    case 'Text': {
      const value = props.text instanceof ResolvedBinding ? props.text.value : props.text
      if (typeof value !== 'string') throw new Error('文本绑定缺少字符串值：' + id)
      return { id, kind, text: value, caption: props.variant === 'caption' }
    }
    case 'Button': {
      const child = childView(props.child)
      if (child.kind !== 'Text' || !child.text.trim() || typeof props.action !== 'function') {
        throw new Error('Button 需要可见名称和事件')
      }
      const variant = props.variant === 'primary' ? 'default' : props.variant === 'borderless' ? 'ghost' : 'outline'
      return { id, kind, label: child.text, variant, activate: props.action as NodeAction }
    }
    default: throw new Error('未映射的组件：' + kind)
  }
}

// Each call receives a short, complete local scene transcript starting with createSurface.
export function usePrototypeSurface(surfaceId: string, onAction: (action: ActionPayload) => void, ...extensions: PrototypeExtension[]) {
  const root = shallowRef<ViewNode>()
  const error = ref('')
  let active: MessageProcessor | undefined
  let activeResolver: NodeResolver | undefined

  function show(messages: readonly unknown[]) {
    const catalogs: CatalogApi[] = [basicCatalog]
    catalogs.push(...extensions.map(extension => extension.catalog))
    const candidate: MessageProcessor = new MessageProcessor(catalogs, action => {
      if (active !== candidate) return
      const outgoing = ActionMessageSchema.safeParse({ version: '1.0', action })
      if (outgoing.success) onAction(outgoing.data.action)
      else error.value = '动作未通过 A2UI 1.0 校验'
    }, { version: '1.0', validationConfig: { ...STRICT_VALIDATION, allowOrphanComponents: true } })
    let resolver: NodeResolver | undefined
    try {
      for (const message of messages) {
        const packet = AgentToRendererMessageSchema.parse(message)
        const body = 'createSurface' in packet ? packet.createSurface
          : 'updateComponents' in packet ? packet.updateComponents
          : 'updateDataModel' in packet ? packet.updateDataModel : undefined
        if (!body || body.surfaceId !== surfaceId) throw new Error('消息不属于当前原型或操作未映射')
        if ('createSurface' in packet && packet.createSurface.catalogId !== catalogId) {
          throw new Error('需要 v1.0 Basic Catalog')
        }
        if ('components' in body) body.components?.forEach(node => checkComponent(node, extensions))
        const errors = candidate.processMessagesWithErrors(packet)
        if (errors.length) throw new Error(errors.map(item => item.error.code).join('、'))
      }
      const surface = candidate.model.getSurface(surfaceId)
      if (!surface) throw new Error('场景缺少 createSurface')
      resolver = new NodeResolver(surface)
      const sceneResolver = resolver
      function write<T>(binding: WritableBinding<T>, value: T) {
        if (active !== candidate) return
        binding.set(value)
        root.value = project(getValue(sceneResolver.rootNode), extensions, write)
      }
      const next = project(getValue(sceneResolver.rootNode), extensions, write)
      activeResolver?.dispose()
      active?.dispose()
      active = candidate
      activeResolver = resolver
      root.value = next
      error.value = ''
      return true
    } catch (cause) {
      resolver?.dispose()
      candidate.dispose()
      error.value = cause instanceof Error ? cause.message : '无法显示此场景'
      return false
    }
  }

  onScopeDispose(() => {
    activeResolver?.dispose()
    active?.dispose()
    active = undefined
  })
  return { root, error, show }
}
