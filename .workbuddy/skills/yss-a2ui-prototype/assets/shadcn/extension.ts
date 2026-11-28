import { Catalog, getValue, ResolvedBinding, WritableBinding } from '@a2ui/web_core'
import { parseDate } from '@internationalized/date'
import type { PrototypeExtension } from '../surface'
import definition from './catalog.json'
import { views } from './registry'

export const shadcnCatalogId = definition.catalogId
const fields = new Set(['id', 'component', '@catalogId', 'children', 'text', 'options', 'model', 'modelProp', 'codec', 'action', 'event'])
const modelProps = ['modelValue', 'open', 'pressed', 'checked', 'page', 'expanded', 'collapsed', 'step', 'value']
const events = ['click', 'select', 'submit', 'change', 'complete', 'close']
const safeTags = new Set(['div', 'span', 'p', 'section', 'article', 'nav', 'main', 'header', 'footer', 'button', 'a', 'label', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function path(value: unknown) {
  return object(value) && typeof value['@path'] === 'string' && Object.keys(value).length === 1
}
function check(node: Record<string, unknown>) {
  for (const key of Object.keys(node)) if (!fields.has(key)) throw new Error('未登记的 shadcn 属性：' + key)
  for (const key of ['options', 'model']) if (key in node && !path(node[key])) throw new Error(key + ' 需要路径绑定')
  if ('children' in node && !(Array.isArray(node.children) && node.children.every(id => typeof id === 'string'))) {
    throw new Error('children 需要有序的组件 ID 列表')
  }
  if ('text' in node && typeof node.text !== 'string' && !path(node.text)) throw new Error('text 需要字符串或路径绑定')
  if ('action' in node) {
    const action = node.action
    if (!object(action) || Object.keys(action).length !== 1 || !object(action.event) || typeof action.event.name !== 'string' ||
        Object.keys(action.event).some(k => !['name', 'context'].includes(k))) throw new Error('action 需要具名事件')
    const context = action.event.context
    if (context !== undefined && (!object(context) || Object.values(context).some(v => v !== null && typeof v === 'object' && !path(v)))) {
      throw new Error('动作上下文需要标量或路径绑定')
    }
  }
  if ('event' in node && (!('action' in node) || !events.includes(String(node.event)))) throw new Error('event 需要对应的动作')
  if (('modelProp' in node || 'codec' in node) && !('model' in node)) throw new Error('modelProp 或 codec 需要 model')
}

function optionsFor(value: unknown): Record<string, unknown> {
  if (!object(value)) throw new Error('options 需要绑定到属性对象')
  for (const [key, val] of Object.entries(value)) {
    if (/^on|^vnode|^(?:key|ref.*|is|innerHTML|outerHTML|textContent|srcdoc|__proto__|prototype|constructor)$/i.test(key)) {
      throw new Error('不支持透传此属性：' + key)
    }
    if (key === 'as' && !safeTags.has(String(val))) throw new Error('不支持的语义标签')
    if (['href', 'src', 'action', 'formaction', 'xlink:href'].includes(key.toLowerCase()) &&
        (typeof val !== 'string' || !['https:', 'http:', 'mailto:', 'tel:'].includes(new URL(val, 'https://prototype.invalid/').protocol))) {
      throw new Error('不支持的资源地址')
    }
  }
  return { ...value }
}

function dateValue(v: unknown) {
  if (v == null || v === '') return undefined
  if (typeof v !== 'string') throw new Error('日期需要 YYYY-MM-DD 字符串')
  return parseDate(v)
}
function decode(v: unknown, codec: unknown) {
  if (codec === 'date') return Array.isArray(v) ? v.map(dateValue) : dateValue(v)
  if (codec === 'dateRange') {
    if (v != null && !object(v)) throw new Error('日期区间需要 start 和 end')
    return { start: dateValue(v?.start), end: dateValue(v?.end) }
  }
  return v
}
function encode(v: unknown, codec: unknown): unknown {
  if (codec === 'date') return Array.isArray(v) ? v.map(String) : v == null ? null : String(v)
  if (codec === 'dateRange' && object(v)) return { start: v.start == null ? null : String(v.start), end: v.end == null ? null : String(v.end) }
  return v ?? null
}
const unwrap = (v: unknown) => v instanceof ResolvedBinding ? v.value : v

export const shadcnExtension: PrototypeExtension = {
  catalog: Catalog.fromJson(definition),
  check,
  project(node, write) {
    const p = getValue(node.props)
    const props = p.options instanceof WritableBinding ? optionsFor(p.options.value) : {}
    if (p.model instanceof WritableBinding) {
      const binding = p.model
      const key = String(p.modelProp ?? 'modelValue')
      if (!modelProps.includes(key)) throw new Error('不支持的模型属性：' + key)
      props[key] = decode(binding.value, p.codec)
      props['onUpdate:' + key] = (value: unknown) => {
        if (!props.disabled && !props.readonly) write(binding, encode(value, p.codec))
      }
    }
    if (typeof p.action === 'function') {
      const activate = p.action
      const event = String(p.event ?? 'click')
      props['on' + event[0].toUpperCase() + event.slice(1)] = (nativeEvent?: Event) => {
        if (event === 'submit') nativeEvent?.preventDefault?.()
        if (!props.disabled) return activate()
      }
    }
    const slotText = unwrap(p.text)
    if (slotText != null && typeof slotText !== 'string') throw new Error('文本绑定需要字符串')
    return { view: views[node.type], props, children: Array.isArray(p.children) ? p.children : [], slotText: slotText ?? undefined }
  },
}
