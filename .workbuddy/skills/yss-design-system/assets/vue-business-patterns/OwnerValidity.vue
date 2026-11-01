<script setup lang="ts">
import {computed,ref} from 'vue'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import SearchSelect from './SearchSelect.vue'
import DateRange from './DateRange.vue'
import Notice from './Notice.vue'
import {rangeError,selectedOption} from './business-controls.js'
import {useWorkspacePage} from './workspace-page'
const props=defineProps<{scene:any}>()
const initial={name:props.scene.data.name,ownerId:props.scene.data.ownerId,range:{...props.scene.data.range}}
const draft=ref(structuredClone(initial)),saved=ref(false),failed=ref(false),error=ref(''),invalidOwner=ref(false)
const readonly=props.scene.id==='no-permission'
useWorkspacePage().trackDirty(computed(()=>!saved.value&&!readonly&&JSON.stringify(draft.value)!==JSON.stringify(initial)))
function save(){
 invalidOwner.value=false
 if(!draft.value.name.trim()){error.value='请输入资料名称';document.getElementById('validity-name')?.focus();return}
 const option=selectedOption(props.scene.data.options,draft.value.ownerId)
 if(!option||option.disabled){invalidOwner.value=true;error.value='请从可用选项中选择负责人，搜索文字不能代替选择';document.getElementById('form-owner')?.focus();return}
 const issue=rangeError(draft.value.range);if(issue){error.value=issue.message;document.getElementById('form-range')?.focus();return}
 if(props.scene.id==='failure'&&!failed.value){failed.value=true;error.value='保存失败，负责人和有效期已保留，请重试。';return}
 error.value='';saved.value=true
}
</script>
<template><Notice>维护 fixture：负责人按编号保存；有效期两端均空表示未限定，起止日均包含。</Notice><section class="surface"><h2>负责人及有效期</h2><div class="business-form-fields"><div><Label for="validity-name">资料名称</Label><Input id="validity-name" v-model="draft.name" :disabled="readonly||saved"/></div><SearchSelect id="form-owner" label="负责人" v-model="draft.ownerId" :options="scene.data.options" :status="scene.data.optionState" :disabled="readonly||saved" :invalid="invalidOwner"/><DateRange id="form-range" label="有效期" v-model="draft.range" :reference-date="scene.data.referenceDate" :disabled="readonly||saved"/></div><Notice v-if="error" error>{{error}}</Notice><Notice v-if="saved">保存成功（本地模拟）：{{draft.ownerId}}；{{draft.range.start?`${draft.range.start} 至 ${draft.range.end}`:'不限日期'}}。</Notice><div class="toolbar"><Button :disabled="readonly||saved" @click="save">{{failed?'重试保存':'保存资料'}}</Button></div></section></template>
