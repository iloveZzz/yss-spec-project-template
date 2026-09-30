<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import Notice from './Notice.vue'
const props=defineProps<{scene:any}>()
const rows=ref(props.scene.data.rows),selected=ref<string[]>([]),attempted=ref(false),message=ref('')
const denied=computed(()=>props.scene.id==='no-permission')
function allowed(r:any){return !denied.value&&r.owner!=='李华'}
function choose(id:string,checked:any){selected.value=checked===true?[...selected.value,id]:selected.value.filter(x=>x!==id)}
function act(ids:string[]){const eligible=rows.value.filter((r:any)=>ids.includes(r.id)&&allowed(r)),failed=props.scene.id==='failure'&&!attempted.value?eligible.slice(-1).map((r:any)=>r.id):[];const success=eligible.filter((r:any)=>!failed.includes(r.id)).map((r:any)=>r.id);rows.value=rows.value.filter((r:any)=>!success.includes(r.id));selected.value=selected.value.filter(id=>!success.includes(id));attempted.value=true;message.value=`已处理 ${success.length} 项${failed.length?'；1 项失败，保留在待处理列表，可重试。':'（本地模拟）。'}`}
</script>
<template><section class="surface"><h2>待处理资料 · {{rows.length}} 项</h2><Notice v-if="denied">当前角色无审批权限。</Notice><div class="toolbar approval-toolbar"><Button :disabled="!selected.length||denied" @click="act(selected)">批量通过</Button><span>已选择 {{selected.length}} 项</span></div><Notice v-if="message" :error="message.includes('失败')">{{message}}</Notice><p class="muted" role="status">剩余 {{rows.length}} 项；其中 {{rows.filter(allowed).length}} 项可处理。失败事项保留在列表，主操作可直接重试。</p><ul class="queue"><li v-for="r in rows" :key="r.id"><div class="toolbar"><Checkbox :model-value="selected.includes(r.id)" :disabled="!allowed(r)" :aria-label="`选择 ${r.id}`" @update:model-value="v=>choose(r.id,v)"/><strong>{{r.id}} · {{r.name}}</strong><Badge variant="outline">{{r.status}}</Badge></div><p>负责人：{{r.owner}}</p><p v-if="!allowed(r)">不可处理：{{denied?'当前角色无权限':'关联资料尚未补齐，请联系负责人补齐后重新进入审批。'}}</p><Button :disabled="!allowed(r)" variant="outline" :aria-label="`通过 ${r.id}`" @click="act([r.id])">通过</Button></li></ul><Notice v-if="!rows.length">{{scene.id==='loading'?'正在加载（固定评审状态）':'当前没有待处理事项。'}}</Notice></section></template>
