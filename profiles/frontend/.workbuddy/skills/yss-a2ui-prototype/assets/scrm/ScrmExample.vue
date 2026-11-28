<script setup lang="ts">
import { ref } from 'vue'
import SurfaceNode from '../SurfaceNode.vue'
import { usePrototypeSurface } from '../surface'
import { scrmExtension } from './extension'
import { recordId, scene, surfaceId } from './scenes'

const preview = ref(false)
const { root, error, show } = usePrototypeSurface(surfaceId, action => {
  if (action.surfaceId !== surfaceId || action.sourceComponentId !== 'navigate' ||
      action.context.recordId !== recordId || typeof action.context.note !== 'string' ||
      action.name !== (preview.value ? 'edit' : 'preview')) {
    error.value = '操作与当前记录或画面不匹配'
    return
  }
  if (show(scene(!preview.value, action.context.note))) preview.value = !preview.value
}, scrmExtension)
show(scene(false, ''))
</script>

<template>
  <main class="mx-auto grid w-full max-w-xl gap-6 px-5 py-12 text-foreground">
    <header class="grid gap-2">
      <p class="text-sm text-muted-foreground">销售机会 / 阶段变更</p>
      <h1 aria-live="polite" class="text-3xl font-semibold">{{ preview ? '变更预览' : '编辑阶段变更' }}</h1>
    </header>
    <SurfaceNode v-if="root" :node="root" />
    <p v-if="error" role="alert">{{ error }}</p>
  </main>
</template>

<style scoped>
main :deep(.form-section),
main :deep(.crm-stage-transition),
main :deep(.crm-form-callout) {
  width: 100%;
}
</style>
