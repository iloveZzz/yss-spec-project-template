import { inject, ref, onActivated, onDeactivated, onBeforeUnmount, watch, type Ref, type InjectionKey } from 'vue'

export type PageContext = { reportDirty: (dirty: boolean) => void }
export const workspacePageKey: InjectionKey<PageContext> = Symbol('workspace-page')
// Pages retain drafts in KeepAlive. Close only temporary overlays when leaving.
export function useWorkspacePage() {
  const context = inject(workspacePageKey, { reportDirty: (_dirty: boolean) => {} })
  const active = ref(true)
  onActivated(() => { active.value = true })
  onDeactivated(() => { active.value = false })
  onBeforeUnmount(() => { active.value = false })
  return {
    active,
    reportDirty: context.reportDirty,
    onLeave(cleanup: () => void) { onDeactivated(cleanup); onBeforeUnmount(cleanup) },
    trackDirty(dirty: Ref<boolean>) { watch(dirty, context.reportDirty, { immediate: true, flush: 'sync' }) },
  }
}
