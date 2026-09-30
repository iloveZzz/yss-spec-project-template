<script setup lang="ts">
import { shallowRef, onMounted, onUnmounted, nextTick } from 'vue'
import { Layers3, Files, ShieldCheck } from '@lucide/vue'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb'
import './patterns.css'
import './refinement.css'
const props=defineProps<{page:any,title:string}>()
const scene=shallowRef<any>(null)
function reset(){try{scene.value=(window as any).prototypeRuntime.initialize();const ticket=scene.value.ticket;nextTick(()=>{if(scene.value?.ticket===ticket)(window as any).prototypeRuntime.ready(ticket)})}catch(e){scene.value=null;(window as any).prototypeRuntime.fail(e)}}
const scenarios=(window as any).prototypeScenarios
function change(e:Event){location.hash=`scenario=${(e.target as HTMLSelectElement).value}`}
function transparency(e:Event){document.documentElement.dataset.transparency=(e.target as HTMLInputElement).checked?'reduced':'normal'}
onMounted(()=>{reset();addEventListener('hashchange',reset)})
onUnmounted(()=>removeEventListener('hashchange',reset))
</script>
<template>
 <template v-if="scene"><a class="skip-link" href="#workspace">跳到工作区</a><header class="workspace-bar material-surface"><div class="workspace-brand"><span class="brand-mark"><Layers3 aria-hidden="true"/></span><strong>YSS 资料中心</strong><span class="workspace-divider"/><span class="workspace-context">业务工作台</span></div><span class="environment"><ShieldCheck aria-hidden="true"/>演示空间</span></header>
 <main id="workspace" tabindex="-1"><Breadcrumb aria-label="当前位置"><BreadcrumbList><BreadcrumbItem>资料中心</BreadcrumbItem><BreadcrumbSeparator/><BreadcrumbItem><BreadcrumbPage>{{title}}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb><header class="heading"><div><p class="page-eyebrow">{{({ '查询与详情':'查询 · 核对 · 查看','分步表单':'填写 · 确认 · 提交','审批与权限':'选择 · 审批 · 跟进','冲突与恢复':'编辑 · 核对 · 恢复','高密度分析':'筛选 · 分析 · 定位','组件状态展示':'状态 · 交互 · 核验' })[title]}}</p><h1>{{title}}</h1><p class="muted">{{({ '查询与详情':'快速定位资料，在详情中核对完整信息。','分步表单':'分两步完成资料录入，返回修改时保留已填内容。','审批与权限':'区分可处理事项，保留失败记录并直接重试。','冲突与恢复':'保留本地草稿，确认放弃后加载完整服务端资料。','高密度分析':'查看指标与明细，在窄屏中保持资料可达。','组件状态展示':'核对项目主题下的组件状态、键盘与焦点。' })[title]}}</p></div><span class="page-symbol" aria-hidden="true"><Files/></span></header>
 <component :is="page" :key="scene.ticket" :scene="scene"/><footer class="workspace-footer"><span>虚构资料 · 本地模拟</span><span>数据仅保留在当前页面</span></footer>
 <details class="review-controls"><summary>评审工具：场景与辅助显示</summary><div class="review-options"><label for="scenario">场景</label><select id="scenario" :value="scene.id" @change="change"><option v-for="s in scenarios" :key="s.id" :value="s.id">{{s.label}}</option></select><button id="reset" @click="reset">重置场景</button><label class="transparency-option"><input type="checkbox" id="solid-surfaces" @change="transparency"/>减少透明效果</label></div></details></main></template>
 <main v-else><h1>场景入口错误</h1><p role="alert">未知或缺失的场景，请检查评审链接。</p></main>
</template>
