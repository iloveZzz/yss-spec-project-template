<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Notice from './Notice.vue'
const props=defineProps<{scene:any}>()
const query=ref(''),selected=ref<any>(null)
const rows=computed(()=>props.scene.data.rows.filter((r:any)=>(r.name+r.owner).includes(query.value))),pending=computed(()=>rows.value.filter((r:any)=>r.status==='待核对').length)
function scroll(e:KeyboardEvent){if(e.target===e.currentTarget&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const el=e.currentTarget as HTMLElement;el.scrollBy({left:(e.key==='ArrowRight'?1:-1)*el.clientWidth/2})}}
</script>
<template><section class="surface"><Label for="keyword">按资料或负责人筛选</Label><div class="actions"><Input id="keyword" v-model="query" @update:model-value="selected=null"/><Button variant="outline" @click="query='';selected=null">重置筛选</Button></div></section><div class="metrics"><Card v-for="metric in [['当前资料',rows.length],['待核对',pending],['已更新',rows.length-pending]]" :key="metric[0]"><CardHeader><CardTitle>{{metric[0]}}</CardTitle></CardHeader><CardContent><div class="metric-value">{{metric[1]}}</div></CardContent></Card></div><section class="surface"><Tabs default-value="summary"><TabsList aria-label="分析视图"><TabsTrigger value="summary">概览</TabsTrigger><TabsTrigger value="detail">明细</TabsTrigger></TabsList><TabsContent value="summary"><h2>优先核对待处理资料</h2><p class="muted">指标与明细使用同一筛选结果；优先处理待核对事项，再查看完整明细。</p><Separator/><ul class="queue"><li v-for="r in rows" :key="r.id"><strong>{{r.name}}</strong><p>{{r.owner}} · {{r.status}}</p><Button variant="outline" :aria-label="`定位 ${r.id}`" @click="selected=r">定位资料</Button></li></ul></TabsContent><TabsContent value="detail"><p id="scroll-hint">表格可横向滚动查看完整列；编号固定，资料定位也可从概览完成。</p><div class="dense-region" @keydown="scroll" tabindex="0" role="region" aria-label="分析明细" aria-describedby="scroll-hint"><Table class="dense"><TableHeader><TableRow><TableHead v-for="name in ['编号','资料名称','负责人','状态','版本']" :key="name">{{name}}</TableHead></TableRow></TableHeader><TableBody><TableRow v-for="r in rows" :key="r.id"><TableCell v-for="(value,i) in [r.id,r.name,r.owner,r.status,r.version]" :key="i">{{value}}</TableCell></TableRow></TableBody></Table></div></TabsContent></Tabs><Notice v-if="!rows.length">{{scene.id==='loading'?'正在加载（固定评审状态）':'暂无符合条件的资料。'}}</Notice><section v-if="selected" aria-label="定位资料"><h2>{{selected.id}} · {{selected.name}}</h2><p>负责人：{{selected.owner}}；版本：{{selected.version}}</p><Button variant="outline" @click="selected=null">关闭定位</Button></section></section></template>
