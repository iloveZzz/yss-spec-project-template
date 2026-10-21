<script setup lang="ts">
import {computed,ref} from 'vue'
import {Button} from '@/components/ui/button'
import {Table,TableHeader,TableHead,TableBody,TableRow,TableCell} from '@/components/ui/table'
import SearchSelect from './SearchSelect.vue'
import DateRange from './DateRange.vue'
import Notice from './Notice.vue'
import {inRange,rangeError,selectedOption} from './business-controls.js'
const props=defineProps<{scene:any}>()
const owner=ref(props.scene.data.ownerId),range=ref({...props.scene.data.range}),page=ref(1),error=ref('')
const applied=ref({ownerId:owner.value,range:{...range.value}})
const readonly=props.scene.id==='no-permission'
const rows=computed(()=>props.scene.data.rows.filter((r:any)=>(!applied.value.ownerId||r.ownerId===applied.value.ownerId)&&inRange(r.date,applied.value.range)))
function apply(){if(owner.value&&!selectedOption(props.scene.data.options,owner.value)){error.value='负责人编号无效，请重新选择';document.getElementById('query-owner')?.focus();return}const issue=rangeError(range.value);if(issue){error.value=issue.message;document.getElementById('query-range')?.focus();return}applied.value={ownerId:owner.value,range:{...range.value}};page.value=1;error.value=''}
</script>
<template><Notice>维护 fixture：本地单选搜索与纯日期组合查询，不访问真实业务数据。</Notice><section class="surface"><h2>组合条件</h2><div class="business-filter-grid"><SearchSelect id="query-owner" label="负责人" v-model="owner" :options="scene.data.options" :status="scene.data.optionState" :disabled="readonly"/><DateRange id="query-range" label="查询日期" v-model="range" :reference-date="scene.data.referenceDate" :disabled="readonly"/></div><div class="toolbar"><Button :disabled="readonly" @click="apply">应用查询</Button><span>选择后应用查询；两端为空时不限日期。</span></div><Notice v-if="error" error>{{error}}</Notice><p id="applied-query" role="status">已应用：{{applied.ownerId||'全部负责人'}}；{{applied.range.start?`${applied.range.start} 至 ${applied.range.end}`:'不限日期'}}；共 {{rows.length}} 条</p></section>
<section class="surface"><h2>查询结果</h2><Notice v-if="!rows.length">暂无符合条件的资料</Notice><Table v-else class="responsive-list"><TableHeader><TableRow><TableHead>编号</TableHead><TableHead>资料</TableHead><TableHead>负责人编号</TableHead><TableHead>登记日期</TableHead></TableRow></TableHeader><TableBody><TableRow v-for="r in rows.slice((page-1)*2,page*2)" :key="r.id"><TableCell data-label="编号">{{r.id}}</TableCell><TableCell data-label="资料">{{r.name}}</TableCell><TableCell data-label="负责人编号">{{r.ownerId}}</TableCell><TableCell data-label="登记日期">{{r.date}}</TableCell></TableRow></TableBody></Table><nav class="toolbar" aria-label="查询结果分页"><Button variant="outline" :disabled="page===1" @click="page--">上一页</Button><span>第 {{page}} 页</span><Button variant="outline" :disabled="page*2>=rows.length" @click="page++">下一页</Button></nav></section></template>
