<script setup lang="ts">
/**
 * 共享 CSS Grid 0fr ↔ 1fr 折叠原语（纯内存状态）：
 * 集中维护展开后焦点环释放（settled）、收起态 visibility/inert 同步、
 * transitionend 与兜底定时回收，以及校验首错时的瞬时展开（instant）。
 */
import { useTimeoutFn } from '@vueuse/core'
import { computed, onBeforeUnmount, ref, shallowRef, watch, type HTMLAttributes } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    instant?: boolean
    enabled?: boolean
    id?: string
    panelClass?: HTMLAttributes['class']
    clipClass?: HTMLAttributes['class']
    contentClass?: HTMLAttributes['class']
    contentSlot?: string
  }>(),
  {
    instant: false,
    enabled: true,
    id: undefined,
    panelClass: undefined,
    clipClass: undefined,
    contentClass: undefined,
    contentSlot: undefined,
  },
)

const emit = defineEmits<{ invalidCapture: [event: Event] }>()

const collapseEl = ref<HTMLElement | null>(null)
const settledOpen = shallowRef(props.open)
const hiddenContent = shallowRef(!props.open)

const { start: scheduleHide, stop: cancelHide } = useTimeoutFn(
  () => {
    if (!props.open) hiddenContent.value = true
  },
  220,
  { immediate: false },
)

const { start: scheduleSettle, stop: cancelSettle } = useTimeoutFn(
  () => {
    if (props.open) settledOpen.value = true
  },
  220,
  { immediate: false },
)

function hasActiveTransition() {
  if (props.instant || !props.enabled) return false
  const el = collapseEl.value
  if (!el || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return false
  }
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  const duration = window.getComputedStyle(el).transitionDuration
  if (!duration) return false
  return duration.split(',').some((part) => Number.parseFloat(part.trim()) > 0)
}

watch(
  () => [props.open, props.enabled, props.instant] as const,
  ([isOpen, isEnabled, isInstant]) => {
    cancelHide()
    cancelSettle()
    if (!isEnabled) {
      hiddenContent.value = false
      settledOpen.value = true
      return
    }
    if (isOpen) {
      hiddenContent.value = false
      if (isInstant || !hasActiveTransition()) {
        settledOpen.value = true
      } else {
        settledOpen.value = false
        scheduleSettle()
      }
      return
    }
    settledOpen.value = false
    if (isInstant || !hasActiveTransition()) {
      hiddenContent.value = true
    } else {
      scheduleHide()
    }
  },
  { flush: 'sync', immediate: true },
)

function onTransitionEnd(event: TransitionEvent) {
  if (event.target !== collapseEl.value || event.propertyName !== 'grid-template-rows') return
  cancelHide()
  cancelSettle()
  if (props.open) {
    settledOpen.value = true
  } else {
    hiddenContent.value = true
  }
}

onBeforeUnmount(() => {
  cancelHide()
  cancelSettle()
})

const contentStyle = computed(() =>
  props.enabled && hiddenContent.value ? { visibility: 'hidden' as const } : undefined,
)
</script>

<template>
  <div
    :id="id"
    ref="collapseEl"
    :class="enabled ? ['crm-grid-collapse', panelClass] : 'contents'"
    :data-open="open ? 'true' : 'false'"
    :data-instant="enabled && instant ? 'true' : undefined"
    :data-settled="enabled && settledOpen ? 'true' : undefined"
    @transitionend="onTransitionEnd"
  >
    <div :class="enabled ? ['crm-grid-collapse-clip', clipClass] : 'contents'">
      <div
        :class="enabled ? contentClass : 'contents'"
        :data-slot="contentSlot"
        :data-state="open ? 'open' : 'closed'"
        :inert="enabled && !open ? true : undefined"
        :style="contentStyle"
        @invalid.capture="emit('invalidCapture', $event)"
      >
        <slot />
      </div>
    </div>
  </div>
</template>
