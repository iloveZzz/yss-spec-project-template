<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type Variant = { id: string; label: string; entry: string }
type Case = { id: string; label: string; scenario: string; dataDigest: string }
type Load = { id: string; url: string; title: string; scenario: Case }
const data = (window as any).prototypeComparison
const title = typeof data?.title === 'string' ? data.title : '方案比较'
const variants: Variant[] = Array.isArray(data?.variants) ? data.variants : []
const cases: Case[] = Array.isArray(data?.cases) ? data.cases : []
function configurationError() {
  for (const [items, fields] of [[variants, ['id', 'label', 'entry']], [cases, ['id', 'label', 'scenario', 'dataDigest']]] as const) {
    if (!items.length || items.some(item => fields.some(field => typeof (item as any)?.[field] !== 'string' || !(item as any)[field].trim())) || new Set(items.map(item => item.id)).size !== items.length) return '比较数据缺失或无效：请提供不重复的候选、场景及数据摘要。'
  }
  for (const variant of variants) {
    try {
      const url = new URL(variant.entry, location.href), base = new URL('.', location.href)
      if (/^(?:[a-z][\w+.-]*:|[\/\\])/i.test(variant.entry) || url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || url.hash) return '候选入口必须是当前包内的相对页面路径，场景由比较工具指定。'
    } catch { return '候选入口路径无效。' }
  }
  return ''
}
const configError = configurationError()
const variantId = ref(''), caseId = ref(''), error = ref(configError), status = ref(''), link = ref('')
const load = shallowRef<Load | null>(null), frame = shallowRef<HTMLIFrameElement | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
function fail(message: string) {
  clearTimeout(timer); load.value = null; error.value = message; status.value = ''; link.value = ''
}
function render() {
  clearTimeout(timer)
  if (configError) { fail(configError); return }
  const hash = new URLSearchParams(location.hash.slice(1))
  const variant = variants.find(item => item.id === (hash.has('variant') ? hash.get('variant') : variants[0].id))
  const scenario = cases.find(item => item.id === (hash.has('case') ? hash.get('case') : cases[0].id))
  if (hash.getAll('variant').length > 1 || hash.getAll('case').length > 1 || !variant || !scenario || [...hash.keys()].some(key => !['variant', 'case'].includes(key))) {
    fail('比较链接无效：候选或场景不存在。请选择有效候选和场景。'); return
  }
  variantId.value = variant.id; caseId.value = scenario.id; error.value = ''
  link.value = '#' + new URLSearchParams({ variant: variant.id, case: scenario.id })
  const current: Load = { id: crypto.randomUUID(), url: variant.entry + '#scenario=' + encodeURIComponent(scenario.scenario), title: `${variant.label} · ${scenario.label}`, scenario }
  load.value = current; status.value = '正在加载共同场景…'
  timer = setTimeout(() => { if (load.value === current) fail('候选加载超时，请检查入口和所需资源。') }, 8000)
}
function select(kind: 'variant' | 'case', value: unknown) {
  if (typeof value !== 'string') return
  if (kind === 'variant') variantId.value = value; else caseId.value = value
  const next = '#' + new URLSearchParams({ variant: variantId.value || variants[0].id, case: caseId.value || cases[0].id })
  if (location.hash === next) render(); else location.hash = next
}
function currentFrame(event: Event) {
  const element = event.currentTarget as HTMLIFrameElement
  return load.value && element === frame.value && element.dataset.requestId === load.value.id ? element : null
}
function requestScene(event: Event) {
  currentFrame(event)?.contentWindow?.postMessage({ type: 'yss-scenario-request', requestId: load.value!.id }, location.origin)
}
function frameError(event: Event) { if (currentFrame(event)) fail('候选入口加载失败，请检查入口和所需资源。') }
function receive(event: MessageEvent) {
  const current = load.value, result = event.data
  if (!current || event.source !== frame.value?.contentWindow || event.origin !== location.origin || result?.type !== 'yss-scenario-result' || result.requestId !== current.id) return
  if (result.status === 'error') { fail(`候选初始化失败：${result.error}`); return }
  if (result.status === 'pending') return
  if (result.status !== 'ready' || result.scenarioId !== current.scenario.scenario || result.dataDigest !== current.scenario.dataDigest) { fail('候选初始化场景或数据不一致。'); return }
  clearTimeout(timer); status.value = '场景已初始化；实际业务行为仍须评审。'
}
onMounted(() => { document.title = title; addEventListener('hashchange', render); addEventListener('message', receive); render() })
onUnmounted(() => { clearTimeout(timer); load.value = null; removeEventListener('hashchange', render); removeEventListener('message', receive) })
</script>

<template>
 <div class="comparison-shell">
  <header>
   <h1 id="title">{{title}}</h1><p>评审辅助 · 选择仅切换候选，不表示批准</p>
   <nav v-if="!configError" aria-label="方案比较">
    <Label for="variant">候选</Label><Select :model-value="variantId" @update:model-value="value => select('variant', value)"><SelectTrigger id="variant"><SelectValue placeholder="选择候选"/></SelectTrigger><SelectContent><SelectItem v-for="variant in variants" :key="variant.id" :value="variant.id">{{variant.label}}</SelectItem></SelectContent></Select>
    <Label for="case">场景</Label><Select :model-value="caseId" @update:model-value="value => select('case', value)"><SelectTrigger id="case"><SelectValue placeholder="选择场景"/></SelectTrigger><SelectContent><SelectItem v-for="item in cases" :key="item.id" :value="item.id">{{item.label}}</SelectItem></SelectContent></Select>
    <Button id="reset" type="button" variant="outline" @click="render">重置当前场景</Button>
    <a id="direct" :href="load?.url" target="_blank" rel="noopener">原尺寸单独打开</a><a id="link" :href="link || undefined">当前比较链接</a>
   </nav>
   <p id="status" role="status">{{status}}</p><p v-if="error" id="error" role="alert">{{error}}</p>
  </header>
  <main id="preview" aria-label="候选原尺寸预览"><iframe v-if="load" :key="load.id" ref="frame" :data-request-id="load.id" :src="load.url" :title="load.title" @load="requestScene" @error="frameError"/></main>
 </div>
</template>
