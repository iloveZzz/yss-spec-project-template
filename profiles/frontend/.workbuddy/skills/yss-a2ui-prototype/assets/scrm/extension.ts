import { Catalog, getValue, ResolvedBinding, WritableBinding } from '@a2ui/web_core'
import type { PrototypeExtension } from '../surface'
import FormSection from './components/FormSection.vue'
import FormCallout from './components/FormCallout.vue'
import StageTransitionSummary from './components/StageTransitionSummary.vue'
import LabeledNote from './LabeledNote.vue'
import definition from './catalog.json'
import './components.css'

function text(value: unknown, key: string): string {
  const result = value instanceof ResolvedBinding ? value.value : value
  if (typeof result !== 'string') throw new Error('组件需要文本值：' + key)
  return result
}

function optionalText(value: unknown, key: string) {
  const result = value instanceof ResolvedBinding ? value.value : value
  return result == null ? undefined : text(result, key)
}

export const scrmExtension: PrototypeExtension = {
  catalog: Catalog.fromJson(definition),
  project(node, write) {
    const p = getValue(node.props)
    switch (node.type) {
      case 'ScrmFormSection':
        return { view: FormSection, props: { title: text(p.title, 'title'), description: optionalText(p.description, 'description') }, children: [p.child] }
      case 'ScrmFormCallout':
        return { view: FormCallout, props: { tone: p.tone }, children: [p.child] }
      case 'ScrmStageTransition':
        return {
          view: StageTransitionSummary,
          props: {
            fromLabel: text(p.fromLabel, 'fromLabel'), fromStatus: optionalText(p.fromStatus, 'fromStatus'),
            toLabel: text(p.toLabel, 'toLabel'), toTone: p.toTone,
            hint: optionalText(p.hint, 'hint'), reopenHint: optionalText(p.reopenHint, 'reopenHint'),
          },
        }
      case 'ScrmCountedTextarea': {
        const binding = p.value
        if (!(binding instanceof WritableBinding) || typeof binding.value !== 'string') {
          throw new Error('备注框需要绑定当前数据模型中的字符串')
        }
        const limit = p.maxLength
        if (typeof limit !== 'number' || !Number.isSafeInteger(limit) || limit < 1) throw new Error('备注字数上限必须是正整数')
        return {
          view: LabeledNote,
          props: {
            label: text(p.label, 'label'), modelValue: binding.value, maxLength: limit,
            readonly: p.readonly, disabled: p.disabled,
            'onUpdate:modelValue': (value: string) => {
              if (!p.readonly && !p.disabled) write(binding, value)
            },
          },
        }
      }
      default: throw new Error('未映射的 SCRM 组件：' + node.type)
    }
  },
}
