<script setup lang="ts">
import { Button } from '@/components/ui/button'
const title = '前端应用已就绪'
</script>

<template>
  <main class="home">
    <p class="eyebrow">YSS · Vue 3</p>
    <h1>{{ title }}</h1>
    <p>从 <code>src/views/Home/index.vue</code> 开始实现页面。</p>
    <p>按项目规格组织页面、组件与状态；请求和 OpenAPI 按任务接入。</p>
    <Button as-child>
      <a href="https://cn.vuejs.org/guide/introduction.html">阅读 Vue 开发指南</a>
    </Button>
  </main>
</template>

<style scoped>
.home { display: grid; gap: 16px; max-width: 720px; margin: 64px auto; padding: 24px; background: var(--yss-colors-surface); border-radius: var(--yss-rounded-sm); }
.home p { overflow-wrap: anywhere; }
.home a { justify-self: start; }
.eyebrow { color: var(--yss-colors-text-secondary); }
@media (width < 720px) { .home { margin: 16px; } }
</style>
