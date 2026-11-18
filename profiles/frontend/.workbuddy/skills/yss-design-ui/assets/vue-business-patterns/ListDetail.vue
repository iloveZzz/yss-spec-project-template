<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Pagination, PaginationContent, PaginationPrevious, PaginationNext } from '@/components/ui/pagination'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import Notice from './Notice.vue'
import { useWorkspacePage } from './workspace-page'
const props=defineProps<{scene:any}>()
const query=ref(''),status=ref('all'),sort=ref('asc'),page=ref(1),selected=ref<string[]>([]),detail=ref<any>(null)
const wide=ref(false),statusOpen=ref(false),menuId=ref('')
const workspace=useWorkspacePage()
let media:MediaQueryList
function resize(){wide.value=media.matches}
onMounted(()=>{media=matchMedia('(min-width: 1200px)');resize();media.addEventListener('change',resize)})
onUnmounted(()=>media?.removeEventListener('change',resize))
workspace.onLeave(()=>{detail.value=null;statusOpen.value=false;menuId.value=''})
let origin:HTMLElement|null=null
const rows=computed(()=>props.scene.data.rows.filter((r:any)=>(r.name+r.id).includes(query.value)&&(status.value==='all'||r.status===status.value)).sort((a:any,b:any)=>sort.value==='asc'?a.id.localeCompare(b.id):b.id.localeCompare(a.id)))
const pages=computed(()=>Math.max(1,Math.ceil(rows.value.length/2))),visible=computed(()=>rows.value.slice((page.value-1)*2,page.value*2)),readonly=computed(()=>props.scene.id==='no-permission')
function toggle(id:string){selected.value=selected.value.includes(id)?selected.value.filter(x=>x!==id):[...selected.value,id]}
function open(row:any,trigger:HTMLElement|null){if(!workspace.active.value)return;origin=trigger;detail.value=row;if(wide.value)nextTick(()=>{if(workspace.active.value&&detail.value?.id===row.id)document.getElementById('inline-detail-title')?.focus({preventScroll:true})})}
function closeDetail(){detail.value=null;nextTick(()=>{if(workspace.active.value&&origin?.isConnected)origin.focus({preventScroll:true})})}
function fromMenu(row:any){nextTick(()=>open(row,document.getElementById(`more-${row.id}`)))}
function focusReturn(e:Event){e.preventDefault();workspace.active.value&&origin?.isConnected&&origin.focus()}
function resetFilters(){query.value='';status.value='all';page.value=1}
const labels:Record<string,string>={id:'编号',name:'资料名称',owner:'负责人',status:'状态',version:'版本'}
</script>
<template>
 <div :class="['query-workspace',{'with-detail':wide&&detail}]"><div class="query-main">
 <section class="surface filter-surface"><div class="section-heading"><h2>查询条件</h2><span class="muted">组合条件即时生效</span></div><div class="filters query-filters"><div><Label for="keyword">资料名称或编号</Label><Input id="keyword" v-model="query" @update:model-value="page=1"/></div><div><Label for="status">状态</Label><Select v-model="status" v-model:open="statusOpen" @update:model-value="page=1"><SelectTrigger id="status" aria-label="状态"><SelectValue/></SelectTrigger><SelectContent position="popper" align="start" :side-offset="4"><SelectItem value="all">全部状态</SelectItem><SelectItem value="待核对">待核对</SelectItem><SelectItem value="已更新">已更新</SelectItem></SelectContent></Select></div><Button variant="outline" @click="resetFilters">重置筛选</Button></div></section>
 <section class="surface results-surface"><div class="toolbar results-toolbar"><h2>资料列表 · 共 {{rows.length}} 条</h2><Button variant="outline" @click="sort=sort==='asc'?'desc':'asc'">编号{{sort==='asc'?'降序':'升序'}}</Button><span :class="['selection-count',{'has-selection':selected.length}]" role="status">已选择 {{selected.length}} 项</span></div><p class="muted result-context">{{query?`关键词：${query}；`:''}}状态：{{status==='all'?'全部':status}}；选择跨页保留，重置场景清除。</p><Notice v-if="readonly">当前为只读；可查询和查看详情，不可选择处理。</Notice>
 <Table class="responsive-list"><TableHeader><TableRow><TableHead v-for="x in ['选择','编号','资料名称','状态','操作']" :key="x">{{x}}</TableHead></TableRow></TableHeader><TableBody><TableRow v-for="row in visible" :key="row.id" :data-state="selected.includes(row.id)?'selected':undefined" :class="{'detail-current-row':detail?.id===row.id}"><TableCell><Checkbox :aria-label="`选择 ${row.id}`" :disabled="readonly" :model-value="selected.includes(row.id)" @update:model-value="toggle(row.id)"/></TableCell><TableCell data-label="编号">{{row.id}}</TableCell><TableCell data-label="资料名称">{{row.name}}</TableCell><TableCell data-label="状态"><Badge variant="secondary" :class="row.status==='待核对'?'status-pending':'status-current'"><span class="status-dot" aria-hidden="true"/>{{row.status}}</Badge></TableCell><TableCell><div class="row-actions"><Button variant="outline" class="detail-action" :aria-label="`查看 ${row.id}`" @click="open(row,$event.currentTarget)">查看详情</Button><DropdownMenu :open="menuId===row.id" @update:open="v=>menuId=v?row.id:''"><DropdownMenuTrigger as-child><Button variant="outline" :aria-label="`更多 ${row.id}`" :id="`more-${row.id}`">更多</Button></DropdownMenuTrigger><DropdownMenuContent align="end" @close-auto-focus="e=>{if(detail)e.preventDefault()}"><DropdownMenuItem @select="fromMenu(row)">查看详情</DropdownMenuItem><DropdownMenuItem disabled>导出（未模拟）</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></TableCell></TableRow></TableBody></Table>
 <template v-if="!rows.length"><Notice v-if="scene.id==='loading'"><Spinner aria-hidden="true"/>正在加载（固定评审状态）</Notice><Empty v-else><EmptyHeader><EmptyTitle>暂无符合条件的资料</EmptyTitle><EmptyDescription>调整筛选条件或重置筛选后重试。</EmptyDescription></EmptyHeader></Empty></template>
 <Pagination v-model:page="page" :total="rows.length" :items-per-page="2" aria-label="资料分页"><PaginationContent><PaginationPrevious :disabled="page===1" aria-label="上一页">上一页</PaginationPrevious><span aria-live="polite">第 {{page}} 页 / 共 {{pages}} 页</span><PaginationNext :disabled="page>=pages" aria-label="下一页">下一页</PaginationNext></PaginationContent></Pagination>
 </section>
 </div><aside v-if="wide&&detail" class="surface inline-detail" aria-labelledby="inline-detail-title" @keydown.esc.stop="closeDetail"><div class="detail-heading"><h2 id="inline-detail-title" tabindex="-1">资料详情</h2><Button variant="ghost" aria-label="关闭详情" @click="closeDetail">关闭</Button></div><p class="muted">核对选中资料；关闭后返回来源操作。</p><dl><template v-for="(v,k) in detail" :key="k"><dt>{{labels[k]}}</dt><dd>{{v}}</dd></template></dl></aside></div>
 <Sheet :open="!wide&&!!detail" @update:open="v=>{if(!v)detail=null}"><SheetContent @close-auto-focus="focusReturn"><SheetHeader><SheetTitle>资料详情</SheetTitle><SheetDescription>核对选中资料；关闭后返回来源操作。</SheetDescription></SheetHeader><dl v-if="detail"><template v-for="(v,k) in detail" :key="k"><dt>{{labels[k]}}</dt><dd>{{v}}</dd></template></dl><SheetFooter class="sheet-actions material-surface"><SheetClose as-child><Button variant="outline">关闭详情</Button></SheetClose></SheetFooter></SheetContent></Sheet>
</template>
