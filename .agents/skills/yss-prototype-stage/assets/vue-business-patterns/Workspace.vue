<script setup lang="ts">
import { ref, shallowRef, computed, reactive, markRaw, defineComponent, h, provide, onMounted, onUnmounted, nextTick } from 'vue'
import { Layers3, PanelLeftClose, PanelLeftOpen, Menu, X, ChevronDown, Files, ShieldCheck } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { createWorkspaceState, readPageId, openPage, closePage, pageScene, pageLink, pageTagFocusTarget } from './workspace-model.js'
import { workspacePageKey } from './workspace-page'
import type { WorkspaceDefinition } from './workspace'
import './patterns.css'
import './refinement.css'
import './workspace.css'

const props = defineProps<{ definition: WorkspaceDefinition }>()
const definition = props.definition
const runtime = (window as any).prototypeRuntime
const scenes = (window as any).prototypeScenarios
const scene = shallowRef<any>(null), error = ref('')
const state = reactive<any>(createWorkspaceState(definition))
const pageScenes = shallowRef<Record<string, any>>({})
const mobileNav = ref(false), tabMenu = ref(false), moduleMenu = ref(false), confirmId = ref('')
const confirmOpen = ref(false)
const narrow = ref(false), collapsed = ref(false), closedGroups = ref<string[]>([]), reduced = ref(false)
const scroller = ref<HTMLElement | null>(null), pageTags = ref<HTMLElement | null>(null)
const navigationHint = ref('')
let navigationSelected = false
let currentHash = '', closeOrigin: HTMLElement | null = null
const activePage = computed(() => definition.pages.find(p => p.id === state.activeId)!)
const groups = computed(() => definition.groups.filter(g => g.moduleId === activePage.value.moduleId))
const cacheNames = computed(() => state.opened.map((id: string) => `WorkspacePage_${id}`))
// Named cache entries allow closing one page without discarding another page's draft.
const wrappers = Object.fromEntries(definition.pages.map(page => [page.id, markRaw(defineComponent({
  name: `WorkspacePage_${page.id}`,
  setup() {
    provide(workspacePageKey, { reportDirty(dirty) { state.dirty[page.id] = dirty } })
    const initial = JSON.parse(JSON.stringify(pageScenes.value[page.id]))
    return () => h(page.component, { scene: initial })
  },
}))]))
function writePage(id: string) {
  const target = pageLink(location.href, definition, id)
  if (target !== location.href) history.pushState(null, '', target)
}
async function selectPage(id: string, origin = 'navigation', write = true) {
  if (scroller.value) state.scroll[state.activeId] = scroller.value.scrollTop
  openPage(state, definition, id)
  closedGroups.value = closedGroups.value.filter(group => group !== activePage.value.groupId)
  navigationSelected = mobileNav.value
  mobileNav.value = false; tabMenu.value = false; moduleMenu.value = false; navigationHint.value = ''
  if (write) writePage(id)
  await nextTick()
  if (scroller.value) { scroller.value.scrollTop = state.scroll[id] || 0; if (origin === 'navigation') scroller.value.focus({ preventScroll: true }) }
  revealPageTag(id)
}
function revealPageTag(id: string) {
  const container = pageTags.value
  const tag = container?.querySelector<HTMLElement>(`[data-workspace-page="${id}"]`)?.closest<HTMLElement>('.workspace-page-tag')
  if (!container || !tag) return
  const bounds = container.getBoundingClientRect(), item = tag.getBoundingClientRect()
  if (item.left < bounds.left) container.scrollLeft -= bounds.left - item.left
  else if (item.right > bounds.right) container.scrollLeft += item.right - bounds.right
}
function pageTagKey(event: KeyboardEvent, id: string) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  if (event.key === 'Delete') { event.preventDefault(); requestClose(id, false, event.currentTarget as HTMLElement); return }
  const target = pageTagFocusTarget(narrow.value ? [state.activeId] : state.opened, id, event.key)
  if (!target) return
  event.preventDefault()
  pageTags.value?.querySelector<HTMLElement>(`[data-workspace-page="${target}"]`)?.focus({ preventScroll: true })
  revealPageTag(target)
}
function setNavigationHint(id: string, open: boolean) { if (open) navigationHint.value = id; else if (navigationHint.value === id) navigationHint.value = '' }
function toggleSidebar() { navigationHint.value = ''; collapsed.value = !collapsed.value }
function selectModule(id: string) {
  const last = [...state.opened].reverse().find(pageId => definition.pages.some(p => p.id === pageId && p.moduleId === id))
  selectPage(last || definition.pages.find(p => p.moduleId === id)!.id)
}
function navigationFocus(event: Event) { event.preventDefault(); nextTick(() => { if (navigationSelected) scroller.value?.focus({ preventScroll: true }); else document.getElementById('mobile-navigation')?.focus({ preventScroll: true }); navigationSelected = false }) }
function toggleGroup(id: string) { closedGroups.value = closedGroups.value.includes(id) ? closedGroups.value.filter(x => x !== id) : [...closedGroups.value, id] }
async function requestClose(id: string, discard = false, trigger?: HTMLElement) {
  if (scroller.value) state.scroll[state.activeId] = scroller.value.scrollTop
  if (!discard) closeOrigin = trigger || document.activeElement as HTMLElement
  const result = closePage(state, definition, id, discard)
  if (result === 'confirm') { confirmId.value = id; confirmOpen.value = true; return }
  if (result !== 'closed') return
  confirmOpen.value = false; confirmId.value = ''; writePage(state.activeId)
  await nextTick()
  if (scroller.value) scroller.value.scrollTop = state.scroll[state.activeId] || 0
  document.querySelector<HTMLElement>(`[data-workspace-page="${state.activeId}"]`)?.focus({ preventScroll: true })
  revealPageTag(state.activeId)
}
function confirmFocus(event: Event) {
  event.preventDefault()
  nextTick(() => { const target = closeOrigin?.isConnected && closeOrigin.getClientRects().length ? closeOrigin : document.querySelector<HTMLElement>(`[data-workspace-page="${state.activeId}"]`); target?.focus({ preventScroll: true }) })
}
async function reset() {
  mobileNav.value = false; tabMenu.value = false; moduleMenu.value = false; navigationHint.value = ''; confirmOpen.value = false; confirmId.value = ''
  if (small) viewport()
  // Unmount the old cache before rebuilding, including Teleport children.
  scene.value = null; await nextTick()
  try {
    const id = readPageId(location.search, definition)
    const fresh = runtime.initialize()
    const inputs = Object.fromEntries(definition.pages.map(page => [page.id, pageScene(fresh, page, definition.sceneMode)]))
    Object.assign(state, createWorkspaceState(definition, id))
    pageScenes.value = inputs; error.value = ''; closedGroups.value = []; scene.value = fresh
    currentHash = location.hash
    await nextTick()
    if (scroller.value) scroller.value.scrollTop = 0
    if (scene.value?.ticket === fresh.ticket) runtime.ready(fresh.ticket)
  } catch (failure: any) { error.value = failure.message; runtime.fail(failure) }
}
function changeScenario(event: Event) { const hash = `#scenario=${(event.target as HTMLSelectElement).value}`; if (location.hash === hash) reset(); else location.hash = hash }
function popstate() {
  if (location.hash !== currentHash) return
  if (!scene.value) { reset(); return }
  try { selectPage(readPageId(location.search, definition), 'navigation', false) }
  catch (failure: any) { error.value = failure.message; scene.value = null; runtime.fail(failure) }
}
function transparency(event: Event) { reduced.value = (event.target as HTMLInputElement).checked; document.documentElement.dataset.transparency = reduced.value ? 'reduced' : 'normal' }
let small: MediaQueryList, wide: MediaQueryList
function viewport() { navigationHint.value = ''; narrow.value = small.matches; collapsed.value = !wide.matches; mobileNav.value = false }
onMounted(() => {
  small = matchMedia('(max-width: 767px)'); wide = matchMedia('(min-width: 1200px)'); viewport()
  small.addEventListener('change', viewport); wide.addEventListener('change', viewport)
  addEventListener('hashchange', reset); addEventListener('popstate', popstate); reset()
})
onUnmounted(() => { small?.removeEventListener('change', viewport); wide?.removeEventListener('change', viewport); removeEventListener('hashchange', reset); removeEventListener('popstate', popstate) })
</script>

<template>
 <TooltipProvider :delay-duration="300"><div class="prototype-workspace-root">
  <a class="skip-link" href="#workspace" @click.prevent="scroller?.focus()">跳到工作区</a>
  <div v-if="scene" :class="['enterprise-shell', { 'sidebar-collapsed': collapsed }]">
   <header class="enterprise-header material-surface">
    <Button v-if="narrow" id="mobile-navigation" variant="ghost" aria-label="打开导航" @click="mobileNav=true"><Menu aria-hidden="true"/></Button>
    <div class="enterprise-brand"><Layers3 aria-hidden="true"/><strong>{{definition.brand}}</strong></div>
    <nav v-if="!narrow" class="module-navigation" aria-label="模块导航"><Button v-for="module in definition.modules" :key="module.id" variant="ghost" :aria-current="activePage.moduleId===module.id?'true':undefined" @click="selectModule(module.id)">{{module.label}}</Button></nav>
    <DropdownMenu v-else v-model:open="moduleMenu"><DropdownMenuTrigger as-child><Button variant="ghost" aria-label="切换模块">模块<ChevronDown aria-hidden="true"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem v-for="module in definition.modules" :key="module.id" @select="selectModule(module.id)">{{module.label}}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
    <span class="workspace-environment"><ShieldCheck aria-hidden="true"/>演示空间</span>
   </header>
   <aside v-if="!narrow" class="enterprise-sidebar" aria-label="页面导航">
    <nav><section v-for="group in groups" :key="group.id" class="navigation-group">
     <Button v-if="!collapsed" variant="ghost" class="group-toggle" :aria-expanded="!closedGroups.includes(group.id)" :aria-controls="`navigation-${group.id}`" @click="toggleGroup(group.id)">{{group.label}}<ChevronDown aria-hidden="true"/></Button>
     <div :id="`navigation-${group.id}`" v-show="collapsed||!closedGroups.includes(group.id)">
      <Tooltip v-for="page in definition.pages.filter(p=>p.groupId===group.id)" :key="page.id" :open="collapsed&&navigationHint===page.id" @update:open="open=>setNavigationHint(page.id,open)"><TooltipTrigger as-child><Button variant="ghost" class="navigation-item" :aria-label="page.title" :aria-describedby="collapsed&&state.dirty[page.id]?`draft-${page.id}`:undefined" :aria-current="state.activeId===page.id?'page':undefined" @click="selectPage(page.id)"><component :is="page.icon||Files" aria-hidden="true"/><span v-if="!collapsed">{{page.title}}</span><span v-if="!collapsed&&state.dirty[page.id]" class="draft-indicator" aria-label="有未提交修改">●</span></Button></TooltipTrigger><TooltipContent v-if="collapsed" side="right">{{page.title}}<span v-if="state.dirty[page.id]"> · 有未提交修改</span></TooltipContent></Tooltip><span v-for="page in definition.pages.filter(p=>p.groupId===group.id&&state.dirty[p.id])" :key="`draft-${page.id}`" :id="`draft-${page.id}`" class="sr-only">有未提交修改</span>
     </div>
    </section></nav>
    <Button variant="ghost" class="sidebar-toggle" :aria-label="collapsed?'展开导航':'收起导航'" :aria-expanded="!collapsed" @click="toggleSidebar"><PanelLeftOpen v-if="collapsed" aria-hidden="true"/><PanelLeftClose v-else aria-hidden="true"/><span v-if="!collapsed">收起导航</span></Button>
   </aside>
   <div class="enterprise-workarea">
    <div class="workspace-tagbar">
     <nav ref="pageTags" class="workspace-page-tags" aria-label="已打开页面" aria-describedby="page-tag-help">
      <Badge v-for="id in state.opened" :key="id" as="div" variant="outline" :class="['workspace-page-tag',{'current-page-tag':state.activeId===id}]">
       <Button variant="ghost" class="page-tag-label" :data-workspace-page="id" :aria-current="state.activeId===id?'page':undefined" :aria-label="`${definition.pages.find(p=>p.id===id)?.title}${id===definition.defaultPage?'，固定页面':''}${state.dirty[id]?'，有未提交修改':''}`" @click="selectPage(id,'tag')" @keydown="pageTagKey($event,id)">{{definition.pages.find(p=>p.id===id)?.title}}<span v-if="state.dirty[id]" class="page-tag-draft" aria-hidden="true">●</span></Button>
       <Button v-if="id!==definition.defaultPage" variant="ghost" class="page-tag-close" :aria-label="`关闭 ${definition.pages.find(p=>p.id===id)?.title}`" @click="e=>requestClose(id,false,e.currentTarget as HTMLElement)"><X aria-hidden="true"/></Button>
      </Badge>
     </nav>
     <span id="page-tag-help" class="sr-only">方向键及 Home、End 移动焦点，Enter 或空格切换页面，Delete 关闭页面。窄屏可通过已打开页面菜单切换。</span>
     <DropdownMenu v-model:open="tabMenu"><DropdownMenuTrigger as-child><Button variant="ghost" aria-label="已打开页面菜单"><ChevronDown aria-hidden="true"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem v-for="id in state.opened" :key="id" @select="selectPage(id)">{{definition.pages.find(p=>p.id===id)?.title}}{{state.dirty[id]?' · 有未提交修改':''}}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
    </div>
    <div class="workspace-page-heading"><h1 :id="`page-title-${state.activeId}`">{{activePage.title}}</h1><span class="muted">{{definition.modules.find(m=>m.id===activePage.moduleId)?.label}} / {{definition.groups.find(g=>g.id===activePage.groupId)?.label}}</span></div>
    <div class="workspace-active-panel"><main id="workspace" ref="scroller" class="workspace-scroll" tabindex="-1" :aria-labelledby="`page-title-${state.activeId}`"><KeepAlive :key="scene.ticket" :include="cacheNames"><component :is="wrappers[state.activeId]" :key="state.activeId"/></KeepAlive><footer class="workspace-footer"><span>虚构资料 · 本地模拟</span><span>刷新或重置会清除本地输入</span></footer></main></div>
   </div>
  </div>
  <main v-else class="workspace-entry-error"><h1>{{error?'工作区入口错误':'正在初始化工作区'}}</h1><p v-if="error" role="alert">{{error}}</p></main>
  <section class="workspace-review" aria-label="原型评审工具"><details class="review-controls"><summary>评审工具：场景与辅助显示</summary><div class="review-options"><label for="scenario">场景</label><select id="scenario" :value="scene?.id" @change="changeScenario"><option v-for="item in scenes" :key="item.id" :value="item.id">{{item.label}}</option></select><button id="reset" @click="reset">重置场景</button><label class="transparency-option"><input type="checkbox" id="solid-surfaces" :checked="reduced" @change="transparency"/>减少透明效果</label><span>切换或重置场景将清除所有页签草稿。</span></div></details></section>
  <Sheet v-model:open="mobileNav"><SheetContent side="left" class="workspace-mobile-navigation" @close-auto-focus="navigationFocus"><SheetHeader><SheetTitle>页面导航</SheetTitle><SheetDescription>选择页面后关闭导航，已有草稿保留在页签中。</SheetDescription></SheetHeader><nav aria-label="窄屏页面导航"><section v-for="group in groups" :key="group.id"><h2>{{group.label}}</h2><Button v-for="page in definition.pages.filter(p=>p.groupId===group.id)" :key="page.id" variant="ghost" class="navigation-item" :aria-current="state.activeId===page.id?'page':undefined" @click="selectPage(page.id)">{{page.title}}</Button></section></nav></SheetContent></Sheet>
  <AlertDialog v-model:open="confirmOpen"><AlertDialogContent @close-auto-focus="confirmFocus"><AlertDialogHeader><AlertDialogTitle>放弃修改并关闭页面？</AlertDialogTitle><AlertDialogDescription>{{definition.pages.find(p=>p.id===confirmId)?.title}}包含尚未提交的修改。保留页面可继续编辑，关闭后草稿会被清除。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>保留页面</AlertDialogCancel><AlertDialogAction @click="requestClose(confirmId,true)">放弃修改并关闭</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </div></TooltipProvider>
</template>
