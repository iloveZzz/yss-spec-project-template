<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import {
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  useId,
  type VNode,
} from 'vue'
import { Button } from '@/components/ui/button'
import { FORM_SECTION_REGISTRY_KEY } from './section-registry'
import CollapsePanel from './CollapsePanel.vue'

withDefaults(
  defineProps<{ title: string; description?: string; headingLevel?: 'h2' | 'h3' }>(),
  { headingLevel: 'h3' },
)
defineSlots<{ default(): VNode[]; actions?(): VNode[] }>()

const open = defineModel<boolean>('open', { default: true })
const revealingInvalid = shallowRef(false)
const rootEl = ref<HTMLElement | null>(null)
const contentId = useId() + '-section-content'

function toggle() {
  open.value = !open.value
}

async function reveal() {
  if (open.value) return
  revealingInvalid.value = true
  open.value = true
  await nextTick()
  revealingInvalid.value = false
}

const registry = inject(FORM_SECTION_REGISTRY_KEY, null)
let unregister: (() => void) | undefined
onMounted(() => {
  unregister = registry?.register({ rootEl, open, reveal })
})
onBeforeUnmount(() => {
  unregister?.()
})

async function revealInvalid(event: Event) {
  if (open.value) return
  event.preventDefault()
  const field = event.target as HTMLInputElement
  const first = Array.from(field.form?.elements || []).find(
    (element) =>
      (element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement) &&
      element.willValidate &&
      !element.validity.valid,
  )
  if (first && first !== field) return
  revealingInvalid.value = true
  open.value = true
  await nextTick()
  field.focus()
  field.scrollIntoView({ block: 'center' })
  field.reportValidity()
  revealingInvalid.value = false
}
</script>

<template>
  <section
    ref="rootEl"
    class="form-section"
    :data-open="open ? 'true' : 'false'"
    :data-state="open ? 'open' : 'closed'"
    :aria-label="title"
  >
    <div class="form-section-header" :class="{ 'has-actions': Boolean($slots.actions) }">
      <component :is="headingLevel">
        <Button
          type="button"
          variant="ghost"
          data-slot="collapsible-trigger"
          class="form-section-trigger"
          :aria-expanded="open"
          :aria-controls="contentId"
          :data-state="open ? 'open' : 'closed'"
          @click="toggle"
        >
          <ChevronDown :class="{ 'is-closed': !open }" aria-hidden="true" />
          <span>{{ title }}</span>
          <small v-if="description">{{ description }}</small>
        </Button>
      </component>
      <div v-if="$slots.actions" class="form-section-actions"><slot name="actions" /></div>
    </div>
    <CollapsePanel
      :id="contentId"
      :open="open"
      :instant="revealingInvalid"
      panel-class="form-section-collapse"
      clip-class="form-section-clip"
      content-class="form-section-content"
      content-slot="collapsible-content"
      @invalid-capture="revealInvalid"
    >
      <slot />
    </CollapsePanel>
  </section>
</template>

<style scoped>
.form-section {
  min-width: 0;
  margin: 0;
}
.form-section[data-open='true'] + .form-section {
  margin-block-start: 20px;
}
.form-section[data-open='false'] + .form-section {
  margin-block-start: 12px;
}
.form-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-block-end: 4px;
  border-block-end: 1px solid var(--yss-colors-border-secondary);
  background: transparent;
}
.form-section-header > :is(h2, h3) {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0;
}
/* 触发器布局盒严格 0px 对齐不撑宽容器；悬停浅底由伪元素向外微扩，避免窄容器横向滚动。 */
.form-section-trigger[data-slot='collapsible-trigger'] {
  position: relative;
  z-index: 0;
  width: 100%;
  margin: 0;
  height: auto;
  min-height: var(--prototype-control-height);
  justify-content: flex-start;
  gap: 4px;
  padding: 4px 0;
  border: 0;
  border-radius: var(--yss-rounded-md);
  background: transparent;
  color: var(--yss-colors-text-title, var(--yss-colors-text));
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  white-space: normal;
  text-align: left;
}
.form-section-trigger[data-slot='collapsible-trigger']::before {
  content: '';
  position: absolute;
  inset: 0 -6px;
  z-index: -1;
  border-radius: var(--yss-rounded-md);
  background: transparent;
  pointer-events: none;
}
.form-section-header.has-actions .form-section-trigger[data-slot='collapsible-trigger']::before {
  inset-inline-end: 0;
}
.form-section-trigger[data-slot='collapsible-trigger']:hover {
  background: transparent;
}
.form-section-trigger[data-slot='collapsible-trigger']:hover::before {
  background: var(--yss-colors-surface-hover);
}
.form-section-trigger[data-slot='collapsible-trigger']:focus-visible {
  outline: 2px solid var(--yss-colors-primary);
  outline-offset: 2px;
  box-shadow: none;
}
.form-section-trigger > svg {
  width: 12px;
  height: 12px;
  flex: none;
  color: var(--yss-colors-text-secondary);
}
.form-section-trigger > small {
  font-size: 12px;
  font-weight: 400;
  color: var(--yss-colors-text-secondary);
}
.form-section-trigger > svg.is-closed {
  transform: rotate(-90deg);
}
.form-section-actions {
  display: flex;
  align-items: center;
  flex: none;
  gap: 8px;
  padding-inline-end: 0;
}
.form-section :deep(.form-section-content) {
  display: grid;
  min-width: 0;
  gap: 14px;
  padding: 12px 0 0;
}
@media (prefers-reduced-motion: no-preference) {
  .form-section-trigger > svg {
    transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .form-section-trigger[data-slot='collapsible-trigger']::before {
    transition: background-color 140ms ease;
  }
}
@media (prefers-reduced-motion: reduce) {
  .form-section-trigger > svg,
  .form-section-trigger[data-slot='collapsible-trigger']::before {
    transition: none;
  }
}
@media (width < 720px) {
  .form-section-trigger[data-slot='collapsible-trigger'] {
    min-height: 44px;
  }
}
@media (forced-colors: active) {
  .form-section-trigger[data-slot='collapsible-trigger']:focus-visible {
    outline-color: Highlight;
  }
}
</style>
