<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field'
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton, InputGroupText } from '@/components/ui/input-group'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Pagination, PaginationContent, PaginationPrevious, PaginationNext } from '@/components/ui/pagination'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import Notice from './Notice.vue'
import CombinedQuery from './CombinedQuery.vue'
import controlsSource from './combined-query.scenarios.json'
const controlsScene={id:'primary',data:controlsSource.scenarios[0].initial_data}
defineProps<{scene:any}>()
const value=ref(''),note=ref(''),checked=ref(false),choice=ref('normal'),dialog=ref(false),sheet=ref(false),message=ref(''),page=ref(1),invalid=ref(false)
let origin:HTMLElement|null=null
function validate(){if(!value.value.trim()){invalid.value=true;document.getElementById('catalog-input')?.focus()}else message.value='字段演示完成'}
function open(mode:string,e:Event){origin=e.currentTarget as HTMLElement;if(mode==='sheet')sheet.value=true;else dialog.value=true}
function returnFocus(e:Event){e.preventDefault();origin?.focus()}
</script>
<template><TooltipProvider :delay-duration="0"><Notice>27 个固定来源组件；仅用于主题、组件状态与键盘检查。场景重置清除所有临时状态。</Notice><div class="catalog-grid"><Card><CardHeader><CardTitle>字段、输入与反馈</CardTitle><CardDescription>Field / InputGroup / Input / Label / Textarea / Checkbox / Select</CardDescription></CardHeader><CardContent><Field :data-invalid="invalid"><FieldLabel for="catalog-input">资料标记</FieldLabel><InputGroup><InputGroupInput id="catalog-input" v-model="value" :aria-invalid="invalid" :aria-describedby="invalid?'catalog-help catalog-error':'catalog-help'" @update:model-value="invalid=false"/><InputGroupAddon align="inline-end"><InputGroupButton aria-label="清除资料标记" @click="value=''">清除</InputGroupButton><InputGroupText>演示</InputGroupText></InputGroupAddon></InputGroup><FieldDescription id="catalog-help">输入本地演示值，检查附加按钮和边框。</FieldDescription><FieldError v-if="invalid" id="catalog-error">请输入资料标记</FieldError></Field><div class="toolbar"><Button @click="validate">验证字段</Button><Button disabled>禁用操作</Button></div><Label for="disabled-input">禁用输入</Label><Input id="disabled-input" model-value="无可编辑权限" disabled/><Label for="catalog-note">多行说明</Label><Textarea id="catalog-note" v-model="note"/><Label for="catalog-select">展示状态</Label><Select v-model="choice"><SelectTrigger id="catalog-select"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="normal">普通</SelectItem><SelectItem value="selected">选中</SelectItem><SelectItem value="disabled" disabled>禁用选项</SelectItem></SelectContent></Select><div class="toolbar"><Checkbox id="catalog-check" v-model="checked"/><Label for="catalog-check">选中演示</Label><Badge variant="secondary">{{checked?'已选中':'未选中'}}</Badge></div></CardContent></Card>
<Card><CardHeader><CardTitle>浮层与操作</CardTitle><CardDescription>Sheet / Dialog / AlertDialog / DropdownMenu / Tooltip</CardDescription></CardHeader><CardContent><div class="toolbar"><Button variant="outline" @click="e=>open('sheet',e)">打开详情侧栏</Button><Button variant="outline" @click="e=>open('dialog',e)">打开对话框</Button><DropdownMenu><DropdownMenuTrigger as-child><Button variant="outline">更多操作</Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem @select="message='菜单演示完成'">执行本地演示</DropdownMenuItem><DropdownMenuItem disabled>导出（未模拟）</DropdownMenuItem></DropdownMenuContent></DropdownMenu><Tooltip><TooltipTrigger as-child><Button variant="outline">帮助说明</Button></TooltipTrigger><TooltipContent>提示补充说明，关键操作无需依赖提示。</TooltipContent></Tooltip><AlertDialog><AlertDialogTrigger as-child><Button variant="outline">确认动作演示</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>确认完成本地演示？</AlertDialogTitle><AlertDialogDescription>不会改变真实资料；取消保留当前输入。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction @click="message='确认演示完成'">确认演示</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div><Notice v-if="message">{{message}}</Notice><Separator/><Alert><AlertTitle>持续反馈</AlertTitle><AlertDescription>错误与权限原因必须保留在页面，不仅使用浮层。</AlertDescription></Alert><div role="status" class="loading-example"><Spinner aria-hidden="true"/>正在加载（固定评审状态）<Skeleton class="skeleton-line"/><Skeleton class="skeleton-line"/></div><Empty><EmptyHeader><EmptyTitle>暂无符合条件的资料</EmptyTitle><EmptyDescription>空态给出原因和下一步；本展示无业务查询。</EmptyDescription></EmptyHeader></Empty></CardContent></Card></div>
<Card><CardHeader><CardTitle>结构与数据</CardTitle><CardDescription>Card / Separator / Breadcrumb / Tabs / Table / Pagination / Alert / Empty / Skeleton / Spinner</CardDescription></CardHeader><CardContent><Tabs default-value="data"><TabsList aria-label="组件视图"><TabsTrigger value="data">资料示例</TabsTrigger><TabsTrigger value="description">状态说明</TabsTrigger></TabsList><TabsContent value="data"><Table class="responsive-list"><TableHeader><TableRow><TableHead>编号</TableHead><TableHead>名称</TableHead><TableHead>状态</TableHead></TableRow></TableHeader><TableBody><TableRow v-for="r in scene.data.rows.slice((page-1)*2,page*2)" :key="r.id" :data-state="checked?'selected':undefined"><TableCell data-label="编号">{{r.id}}</TableCell><TableCell data-label="名称">{{r.name}}</TableCell><TableCell data-label="状态">{{r.status}}</TableCell></TableRow></TableBody></Table><Pagination v-model:page="page" :total="scene.data.rows.length" :items-per-page="2" aria-label="展示分页"><PaginationContent><PaginationPrevious aria-label="上一页">上一页</PaginationPrevious><span>第 {{page}} 页</span><PaginationNext aria-label="下一页">下一页</PaginationNext></PaginationContent></Pagination></TabsContent><TabsContent value="description"><p>默认、禁用、错误、加载、选中及浮层状态均可在本页重现。场景 ID 与初始资料来自共同 JSON。</p></TabsContent></Tabs></CardContent></Card>
<CombinedQuery :scene="controlsScene"/><Sheet v-model:open="sheet"><SheetContent @close-auto-focus="returnFocus"><SheetHeader><SheetTitle>演示详情</SheetTitle><SheetDescription>Escape 或关闭后返回来源按钮。</SheetDescription></SheetHeader><p>固定虚构资料，仅验证详情侧栏。</p><SheetFooter><SheetClose as-child><Button variant="outline">关闭详情</Button></SheetClose></SheetFooter></SheetContent></Sheet>
<Dialog v-model:open="dialog"><DialogContent @close-auto-focus="returnFocus"><DialogHeader><DialogTitle>演示对话框</DialogTitle><DialogDescription>关闭不修改页面输入。</DialogDescription></DialogHeader><Button variant="outline" @click="dialog=false">关闭对话框</Button></DialogContent></Dialog></TooltipProvider></template>
