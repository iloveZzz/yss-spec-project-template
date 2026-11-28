import { nextTick, ref } from 'vue'

type NativeField = HTMLInputElement | HTMLTextAreaElement

export function useClearNativeField(
  getControl: () => NativeField | null | undefined,
  setModel: (value: string | number) => void,
) {
  const controlKey = ref(0)
  let composingControl: EventTarget | null = null
  let clearing = false

  function endComposition(event: Event) {
    if (event.currentTarget === composingControl) composingControl = null
  }

  const compositionListeners = {
    compositionstart(event: CompositionEvent) {
      composingControl = event.currentTarget
    },
    compositionend: endComposition,
    change: endComposition,
  }

  function updateModel(value: string | number) {
    if (!clearing) setModel(value)
  }

  async function clear() {
    const control = getControl()
    if (!control || clearing || control.matches(':disabled, [readonly], [aria-readonly="true"], [aria-disabled="true"]')) return

    clearing = true
    const wasComposing = control === composingControl
    if (wasComposing) {
      // 结束当前输入节点的组字，迟到的提交事件无法写入替换后的控件。
      composingControl = null
      controlKey.value += 1
    }

    control.value = ''
    setModel('')
    // 业务字段仍通过原生 input 读取 validity、记录编辑状态。
    control.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContent' }))
    if (!wasComposing) control.focus({ preventScroll: true })
    await nextTick()
    clearing = false
    if (wasComposing) getControl()?.focus({ preventScroll: true })
  }

  return { clear, compositionListeners, controlKey, updateModel }
}
