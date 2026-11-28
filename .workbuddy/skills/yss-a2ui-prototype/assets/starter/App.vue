<script setup lang="ts">
import { ref } from 'vue'
import SurfaceNode from './SurfaceNode.vue'
import { usePrototypeSurface } from './surface'
import { entry, registrationId, summary, surfaceId } from './scenes'

const page = ref<'summary' | 'entry'>('summary')
const { root, error, show } = usePrototypeSurface(surfaceId, action => {
  if (action.surfaceId !== surfaceId || action.sourceComponentId !== 'navigation' ||
      action.context.registrationId !== registrationId) {
    error.value = '动作与当前报名记录不匹配'
    return
  }
  if (page.value === 'summary' && action.name === 'showEntry') {
    if (show(entry)) page.value = 'entry'
  } else if (page.value === 'entry' && action.name === 'showSummary') {
    if (show(summary)) page.value = 'summary'
  } else {
    error.value = '当前页面不支持此操作'
  }
})
show(summary)
</script>

<template>
  <main class="mx-auto grid w-full max-w-xl gap-6 px-5 py-12 text-foreground">
    <header class="grid gap-2">
      <p class="text-sm text-muted-foreground">我的活动 / 产品设计分享会</p>
      <h1 aria-live="polite" class="text-3xl font-semibold tracking-tight">
        {{ page === 'summary' ? '报名摘要' : '入场指引' }}
      </h1>
    </header>
    <SurfaceNode v-if="root" :node="root" />
    <p v-if="error" role="alert">{{ error }}</p>
  </main>
</template>
