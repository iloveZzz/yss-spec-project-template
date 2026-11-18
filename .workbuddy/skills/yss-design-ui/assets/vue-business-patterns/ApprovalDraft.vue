<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import Notice from './Notice.vue'

type Row = { id: string; name: string; owner: string; status: string }
const props = defineProps<{ scene: { id: string; data: { rows: Row[] } }; mode: 'single' | 'batch' | 'queue' }>()
const root = ref<HTMLElement | null>(null)
const rows = ref<Row[]>(props.scene.data.rows), selected = ref<string[]>([])
const attempted = ref(false), failed = ref(false), message = ref('')
const visibleRows = computed(() => props.mode === 'queue' ? rows.value.slice(0, 1) : rows.value)
const allSelected = computed(() => rows.value.length > 0 && selected.value.length === rows.value.length)
function choose(id: string, checked: boolean) {
  selected.value = checked ? [...new Set([...selected.value, id])] : selected.value.filter(item => item !== id)
}
async function act(ids: string[]) {
  const chosen = rows.value.filter(row => ids.includes(row.id)).map(row => row.id)
  if (!chosen.length) return
  const origin = document.activeElement as HTMLElement | null
  failed.value = props.scene.id === 'failure' && !attempted.value
  attempted.value = true
  if (failed.value) { message.value = '处理失败，资料和选择已保留，可重试。'; return }
  rows.value = rows.value.filter(row => !chosen.includes(row.id))
  selected.value = selected.value.filter(id => !chosen.includes(id))
  message.value = `已处理 ${chosen.length} 项（本地模拟）。`
  await nextTick()
  if (origin && (!origin.isConnected || origin.matches(':disabled')) && (document.activeElement === document.body || document.activeElement === origin)) {
    const target = root.value?.querySelector<HTMLElement>('.queue button:not(:disabled), .queue [role="checkbox"]:not([disabled])') || root.value?.querySelector<HTMLElement>('#draft-heading')
    target?.focus()
  }
}
</script>

<template>
 <section ref="root" class="surface" aria-labelledby="draft-heading">
  <h2 id="draft-heading" tabindex="-1">待处理资料 · {{rows.length}} 项</h2>
  <p class="muted">核对编号、名称、负责人和状态后处理资料；三条教学资料均可处理。</p>
  <div v-if="mode === 'batch'" class="toolbar">
   <Checkbox id="draft-all" :disabled="!rows.length" :model-value="allSelected ? true : selected.length ? 'indeterminate' : false" @update:model-value="value => selected = value === true ? rows.map(row => row.id) : []"/>
   <Label for="draft-all">选择全部资料</Label>
   <Button type="button" :disabled="!selected.length" @click="act(selected)">通过所选</Button>
   <span>已选择 {{selected.length}} 项</span>
  </div>
  <Notice v-if="message" :error="failed">{{message}}</Notice>
  <p role="status">剩余 {{rows.length}} 项{{mode === 'queue' ? '；按编号逐项处理' : ''}}。</p>
  <ul class="queue">
   <li v-for="row in visibleRows" :key="row.id">
    <div class="toolbar">
     <template v-if="mode === 'batch'"><Checkbox :id="`draft-choice-${row.id}`" :model-value="selected.includes(row.id)" @update:model-value="value => choose(row.id, value === true)"/><Label :for="`draft-choice-${row.id}`">选择 {{row.id}}</Label></template>
     <strong>{{row.id}} · {{row.name}}</strong>
    </div>
    <p>负责人：{{row.owner}} · 状态：{{row.status}}</p>
    <Button v-if="mode !== 'batch'" type="button" variant="outline" :aria-label="`通过 ${row.id}`" @click="act([row.id])">通过</Button>
   </li>
  </ul>
  <Notice v-if="!rows.length">当前没有待处理事项。</Notice>
 </section>
</template>
