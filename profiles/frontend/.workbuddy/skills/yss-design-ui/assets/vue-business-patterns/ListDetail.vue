<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import Notice from './Notice.vue'
import { useWorkspacePage } from './workspace-page'
const props=defineProps<{scene:any}>()
const query=ref(''),status=ref('all'),sort=ref('asc'),page=ref(1),selected=ref<string[]>([]),detail=ref<any>(null)
const wide=ref(false),statusOpen=ref(false),menuId=ref('')
const workspace=useWorkspacePage()
let media:MediaQueryList
let scrollMedia:MediaQueryList
const bounded=ref(false)
function resizeList(){bounded.value=scrollMedia.matches}
function resize(){wide.value=media.matches}
onMounted(()=>{media=matchMedia('(min-width: 1200px)');resize();media.addEventListener('change',resize);scrollMedia=matchMedia('(min-width: 900px) and (min-height: 680px)');resizeList();scrollMedia.addEventListener('change',resizeList)})
onUnmounted(()=>{media?.removeEventListener('change',resize);scrollMedia?.removeEventListener('change',resizeList)})
workspace.onLeave(()=>{detail.value=null;statusOpen.value=false;menuId.value='';stopRead();suspendEditor()})
let origin:HTMLElement|null=null
type Row = { id: string; name: string; owner: string; status: string; version: number; notes?: string }
const records=ref<Row[]>(props.scene.data.rows)
// The fixture describes an eventual server update. Saves write to this simulated authority too.
let serverRecords:Row[]=props.scene.data.server_rows||props.scene.data.rows
const readState=ref<'idle'|'initial'|'refresh'|'error'>(props.scene.id==='loading'?'initial':'idle')
const stale=computed(()=>readState.value==='refresh'||readState.value==='error')
const hideSnapshot=ref(false)
let request=0, readTimer:ReturnType<typeof setTimeout>|undefined
function stopRead(){++request;clearTimeout(readTimer);readState.value='idle';hideSnapshot.value=false}
function refresh(fail=false,replace=false){
  if(!workspace.active.value||readonly.value||readState.value==='refresh')return
  const ticket=++request, filter=[query.value,status.value]
  hideSnapshot.value=hideSnapshot.value||replace
  readState.value=rows.value.length?'refresh':'initial'
  clearTimeout(readTimer)
  readTimer=setTimeout(()=>{
    if(ticket!==request||!workspace.active.value||filter[0]!==query.value||filter[1]!==status.value)return
    if(fail){readState.value='error';return}
    records.value=serverRecords;hideSnapshot.value=false
    selected.value=selected.value.filter(id=>serverRecords.some(row=>row.id===id))
    page.value=Math.min(page.value,pages.value);readState.value='idle'
    if(detail.value){
      const updated=rows.value.find(row=>row.id===detail.value.id)
      if(updated)detail.value=updated
      else closeDetail()
    }
  },650)
}
watch([query,status],()=>{
  const replacing=readState.value!=='idle'
  stopRead();page.value=1;selected.value=[];detail.value=null;menuId.value=''
  if(replacing)refresh(false,true)
}, {flush:'sync'})
onUnmounted(stopRead)
const rows=computed(()=>hideSnapshot.value?[]:records.value.filter((r:any)=>(r.name+r.id).includes(query.value)&&(status.value==='all'||r.status===status.value)).sort((a:any,b:any)=>sort.value==='asc'?a.id.localeCompare(b.id):b.id.localeCompare(a.id)))
const perPage=computed(()=>props.scene.id==='long-list'?8:2)
const pages=computed(()=>Math.max(1,Math.ceil(rows.value.length/perPage.value))),visible=computed(()=>rows.value.slice((page.value-1)*perPage.value,page.value*perPage.value)),readonly=computed(()=>props.scene.id==='no-permission')
function toggle(id:string){selected.value=selected.value.includes(id)?selected.value.filter(x=>x!==id):[...selected.value,id]}
function open(row:any,trigger:HTMLElement|null){if(!workspace.active.value)return;origin=trigger;detail.value=row;if(wide.value)nextTick(()=>{if(workspace.active.value&&detail.value?.id===row.id)document.getElementById('inline-detail-title')?.focus({preventScroll:true})})}
function closeDetail(){detail.value=null;nextTick(()=>{if(workspace.active.value)(origin?.isConnected?origin:heading.value)?.focus({preventScroll:true})})}
function fromMenu(row:any){nextTick(()=>open(row,document.getElementById(`more-${row.id}`)))}
function focusReturn(e:Event){e.preventDefault();if(workspace.active.value)(origin?.isConnected?origin:heading.value)?.focus()}
function resetFilters(){query.value='';status.value='all';page.value=1}
const heading=ref<HTMLElement|null>(null)
const editor=ref<Row|null>(null),draft=ref({name:'',owner:'',notes:''}),editorOrigin=ref<HTMLElement|null>(null)
const invalid=ref(false),confirmClose=ref(false),saving=ref(false),saveError=ref(''),suspended=ref(false)
let saveTimer:ReturnType<typeof setTimeout>|undefined
const dirty=computed(()=>!!editor.value&&(draft.value.name!==editor.value.name||draft.value.owner!==editor.value.owner||draft.value.notes!==(editor.value.notes||'')))
workspace.trackDirty(dirty)
function suspendEditor(){
  if(!editor.value)return
  clearTimeout(saveTimer)
  if(saving.value)saveError.value='保存已中断。草稿已保留，可以再次保存。'
  saving.value=false;confirmClose.value=false;suspended.value=true
}
function resumeEditor(trigger:HTMLElement){
  if(readonly.value||stale.value||!workspace.active.value)return
  if(!editorOrigin.value?.isConnected)editorOrigin.value=trigger
  suspended.value=false
}
function edit(row:Row,trigger:HTMLElement){
  if(readonly.value||stale.value||!workspace.active.value)return
  if(editor.value){if(editor.value.id===row.id)resumeEditor(trigger);return}
  suspended.value=false;editorOrigin.value=trigger;editor.value=row;draft.value={name:row.name,owner:row.owner,notes:row.notes||''}
  invalid.value=false;saveError.value='';confirmClose.value=false
}
function closeEditor(){
  clearTimeout(saveTimer);saving.value=false;confirmClose.value=false;editor.value=null
}
function editorFocusReturn(e:Event){
  e.preventDefault();if(!workspace.active.value)return
  const source=editorOrigin.value
  if(source?.isConnected&&!source.matches(':disabled,[aria-disabled="true"]'))source.focus()
  else heading.value?.focus()
}
function requestClose(){
  if(saving.value)return
  if(!dirty.value){closeEditor();return}
  confirmClose.value=true
  nextTick(()=>document.getElementById('edit-keep')?.focus())
}
function keepEditing(){confirmClose.value=false;nextTick(()=>document.getElementById('edit-name')?.focus())}
function save(fail=false){
  const row=editor.value
  if(!row||saving.value||readonly.value||stale.value||!workspace.active.value)return
  invalid.value=!draft.value.name.trim()
  if(invalid.value){nextTick(()=>document.getElementById('edit-name')?.focus());return}
  saving.value=true;saveError.value=''
  saveTimer=setTimeout(()=>{
    if(!workspace.active.value||editor.value?.id!==row.id)return
    saving.value=false
    const latest=serverRecords.find(item=>item.id===row.id)
    if(fail||!latest){
      saveError.value=latest?'保存失败。草稿已保留，可以再次保存。':'资料已不可用，不能保存。草稿未被清除。'
      nextTick(()=>document.getElementById('edit-save-error')?.focus());return
    }
    const updated={...row,...draft.value,name:draft.value.name.trim(),version:Math.max(row.version,latest.version)+1}
    serverRecords=serverRecords.map(item=>item.id===row.id?updated:item)
    records.value=records.value.map(item=>item.id===row.id?updated:item)
    if(detail.value?.id===row.id)detail.value=updated
    page.value=Math.min(page.value,pages.value)
    closeEditor()
  },450)
}
onUnmounted(()=>clearTimeout(saveTimer))
const labels:Record<string,string>={id:'编号',name:'资料名称',owner:'负责人',status:'状态',version:'版本',notes:'补充说明'}
</script>
<template>
 <div :class="['query-workspace',{'with-detail':wide&&detail}]"><div class="query-main">
 <section class="surface filter-surface"><div class="section-heading"><h2>查询条件</h2><span class="muted">组合条件即时生效</span></div><div class="filters query-filters"><div><Label for="keyword">资料名称或编号</Label><Input id="keyword" v-model="query" @update:model-value="page=1"/></div><div><Label for="status">状态</Label><Select v-model="status" v-model:open="statusOpen" @update:model-value="page=1"><SelectTrigger id="status" aria-label="状态"><SelectValue/></SelectTrigger><SelectContent position="popper" align="start" :side-offset="4"><SelectItem value="all">全部状态</SelectItem><SelectItem value="待核对">待核对</SelectItem><SelectItem value="已更新">已更新</SelectItem></SelectContent></Select></div><Button variant="outline" @click="resetFilters">重置筛选</Button></div></section>
 <section class="surface results-surface"><div class="toolbar results-toolbar"><h2 ref="heading" tabindex="-1">资料列表 · 共 {{rows.length}} 条</h2><Button variant="outline" :disabled="readonly||readState==='refresh'" @click="refresh()">刷新结果</Button><Button variant="ghost" :disabled="readonly||readState==='refresh'" @click="refresh(true)">模拟刷新失败</Button><Button variant="outline" @click="sort=sort==='asc'?'desc':'asc'">编号{{sort==='asc'?'降序':'升序'}}</Button><span :class="['selection-count',{'has-selection':selected.length}]" role="status">已选择 {{selected.length}} 项</span></div><p class="muted result-context">{{query?`关键词：${query}；`:''}}状态：{{status==='all'?'全部':status}}；同一筛选的选择跨页保留，换筛选或场景清除。</p><Notice v-if="readonly">当前为只读；可查询和查看详情，不可选择处理。</Notice>
 <div v-if="editor&&suspended"><Notice>有未提交的资料草稿。</Notice><Button variant="outline" :disabled="readonly||stale" @click="resumeEditor($event.currentTarget as HTMLElement)">继续资料草稿</Button></div>
 <p v-if="readState==='refresh'" role="status">正在刷新，暂时显示同一查询的上次结果；编辑和选择暂停。</p>
 <div v-if="readState==='error'"><Notice error>刷新失败{{rows.length?'，仍显示上次结果；编辑和选择暂停。':'，未取得结果。'}}</Notice><Button variant="outline" @click="refresh()">重试刷新</Button></div>
 <div v-if="readState==='initial'" class="result-placeholder" aria-busy="true"><p role="status">正在加载资料</p><Skeleton class="h-8 w-full" aria-hidden="true"/><Skeleton class="h-8 w-full" aria-hidden="true"/></div>
 <Table v-if="rows.length" class="responsive-list material-results-table" :class="{'bounded-results':bounded&&visible.length>2}" :role="bounded&&visible.length>2?'region':undefined" :aria-label="bounded&&visible.length>2?'资料结果，可滚动':undefined" :tabindex="bounded&&visible.length>2?0:undefined"><TableHeader><TableRow><TableHead v-for="x in ['选择','编号','资料名称','状态','操作']" :key="x">{{x}}</TableHead></TableRow></TableHeader><TableBody><TableRow v-for="row in visible" :key="row.id" :data-state="selected.includes(row.id)?'selected':undefined" :class="{'detail-current-row':detail?.id===row.id}"><TableCell><Checkbox :aria-label="`选择 ${row.id}`" :disabled="readonly||stale" :model-value="selected.includes(row.id)" @update:model-value="toggle(row.id)"/></TableCell><TableCell data-label="编号">{{row.id}}</TableCell><TableCell data-label="资料名称">{{row.name}}</TableCell><TableCell data-label="状态"><Badge variant="secondary" :class="row.status==='待核对'?'status-pending':'status-current'"><span class="status-dot" aria-hidden="true"/>{{row.status}}</Badge></TableCell><TableCell><div class="row-actions"><Button variant="outline" class="detail-action" :aria-label="`查看 ${row.id}`" @click="open(row,$event.currentTarget)">查看详情</Button><Button variant="outline" :aria-label="`编辑 ${row.id}`" :disabled="readonly||stale||!!(editor&&editor.id!==row.id)" @click="edit(row,$event.currentTarget as HTMLElement)">编辑</Button><DropdownMenu :open="menuId===row.id" @update:open="v=>menuId=v?row.id:''"><DropdownMenuTrigger as-child><Button variant="outline" :aria-label="`更多 ${row.id}`" :id="`more-${row.id}`">更多</Button></DropdownMenuTrigger><DropdownMenuContent align="end" @close-auto-focus="e=>{if(detail)e.preventDefault()}"><DropdownMenuItem @select="fromMenu(row)">查看详情</DropdownMenuItem><DropdownMenuItem disabled>导出（未模拟）</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></TableCell></TableRow></TableBody></Table>
 <template v-if="!rows.length&&readState==='idle'"><Empty><EmptyHeader><EmptyTitle>暂无符合条件的资料</EmptyTitle><EmptyDescription>调整筛选条件或重置筛选后重试。</EmptyDescription></EmptyHeader></Empty></template>
 <Pagination v-if="rows.length" v-model:page="page" :total="rows.length" :items-per-page="perPage" aria-label="资料分页"><PaginationContent><PaginationPrevious :disabled="page===1" aria-label="上一页">上一页</PaginationPrevious><span aria-live="polite">第 {{page}} 页 / 共 {{pages}} 页</span><PaginationNext :disabled="page>=pages" aria-label="下一页">下一页</PaginationNext></PaginationContent></Pagination>
 </section>
 </div><aside v-if="wide&&detail" class="surface inline-detail" aria-labelledby="inline-detail-title" @keydown.esc.stop="closeDetail"><div class="detail-heading"><h2 id="inline-detail-title" tabindex="-1">资料详情</h2><Button variant="ghost" aria-label="关闭详情" @click="closeDetail">关闭</Button></div><p class="muted">核对选中资料；关闭后返回来源操作。</p><dl><template v-for="(v,k) in detail" :key="k"><dt>{{labels[k]}}</dt><dd>{{v}}</dd></template></dl></aside></div>
 <Sheet :open="!wide&&!!detail" @update:open="v=>{if(!v)detail=null}"><SheetContent @close-auto-focus="focusReturn"><SheetHeader><SheetTitle>资料详情</SheetTitle><SheetDescription>核对选中资料；关闭后返回来源操作。</SheetDescription></SheetHeader><dl v-if="detail"><template v-for="(v,k) in detail" :key="k"><dt>{{labels[k]}}</dt><dd>{{v}}</dd></template></dl><SheetFooter class="sheet-actions material-surface"><SheetClose as-child><Button variant="outline">关闭详情</Button></SheetClose></SheetFooter></SheetContent></Sheet>
 <Sheet :open="!!editor&&!suspended" @update:open="v=>{if(!v)requestClose()}">
 <SheetContent class="material-editor" @escape-key-down="e=>{e.preventDefault();requestClose()}" @interact-outside="e=>e.preventDefault()" @close-auto-focus="editorFocusReturn">
  <SheetHeader><SheetTitle>编辑资料</SheetTitle><SheetDescription>修改 {{editor?.id}} 的资料，示例仅保存在当前页面。</SheetDescription></SheetHeader>
  <form id="material-edit" class="material-editor-form" @submit.prevent="save()">
   <div class="material-editor-body">
    <Label for="edit-name">资料名称（必填）</Label><Input id="edit-name" v-model="draft.name" :disabled="saving" :aria-invalid="invalid||undefined" :aria-describedby="invalid?'edit-name-error':undefined" @update:model-value="invalid=false"/>
    <p v-if="invalid" id="edit-name-error" role="alert">请输入资料名称。</p>
    <Label for="edit-owner">负责人</Label><Input id="edit-owner" v-model="draft.owner" :disabled="saving"/>
    <Label for="edit-notes">补充说明</Label><Textarea id="edit-notes" v-model="draft.notes" :disabled="saving" rows="8"/>
    <p v-if="saveError" id="edit-save-error" role="alert" tabindex="-1">{{saveError}}</p>
   </div>
   <SheetFooter class="sheet-actions material-surface material-editor-actions">
    <div v-if="confirmClose" role="group" aria-label="放弃草稿确认">
     <p>关闭将放弃本次未保存修改。</p><Button id="edit-keep" type="button" variant="outline" @click="keepEditing">继续编辑</Button><Button type="button" variant="destructive" @click="closeEditor()">放弃并关闭</Button>
    </div>
    <template v-else><Button type="button" variant="outline" :disabled="saving" @click="requestClose">取消</Button><Button type="button" variant="ghost" :disabled="saving" @click="save(true)">模拟保存失败</Button><Button type="submit" :disabled="saving">{{saving?'保存中…':'保存'}}</Button></template>
   </SheetFooter>
  </form>
 </SheetContent>
 </Sheet>
</template>
