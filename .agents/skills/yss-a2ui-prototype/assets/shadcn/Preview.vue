<script setup lang="ts">
import { ref } from 'vue'
import SurfaceNode from '../SurfaceNode.vue'
import { catalogId, usePrototypeSurface } from '../surface'
import { shadcnExtension } from './extension'
import { NativeSelect, NativeSelectOption } from './ui/native-select'
import examples from './examples.json'

type Family = keyof typeof examples
const families = Object.keys(examples) as Family[]
const selected = ref<Family>(families[0])
const feedback = ref('')
const { root, error, show } = usePrototypeSurface('gallery', action => {
  feedback.value = action.name === 'saveDraft' ? '草稿已保存' : action.name
}, shadcnExtension)
function select(value: unknown) {
  if (typeof value !== 'string' || !Object.hasOwn(examples, value)) return
  const family = value as Family
  if (show([{ version: '1.0', createSurface: { surfaceId: 'gallery', catalogId, ...examples[family] } }])) {
    selected.value = family
    feedback.value = ''
  }
}
select(selected.value)
</script>

<template>
  <main class="mx-auto grid w-full max-w-3xl gap-6 px-5 py-12">
    <h1 class="text-3xl font-semibold">shadcn-vue 组件预览</h1>
    <div class="grid justify-items-start gap-2">
      <label for="family">组件组（{{ families.length }}）</label>
      <NativeSelect id="family" :model-value="selected" @update:model-value="select">
        <NativeSelectOption v-for="name in families" :key="name" :value="name">{{ name }}</NativeSelectOption>
      </NativeSelect>
    </div>
    <section :aria-label="selected" class="min-w-0 rounded-xl border bg-card p-6 text-card-foreground">
      <SurfaceNode v-if="root" :key="selected" :node="root" />
    </section>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="feedback" role="status">{{ feedback }}</p>
  </main>
</template>
