<script setup lang="ts">
import {computed,ref} from 'vue'
import {Combobox,ComboboxAnchor,ComboboxInput,ComboboxList,ComboboxViewport,ComboboxItem,ComboboxItemIndicator} from '@/components/ui/combobox'
import {Button} from '@/components/ui/button'
import {Label} from '@/components/ui/label'
import {filterOptions,selectedOption} from './business-controls.js'
import {useWorkspacePage} from './workspace-page'
const props=withDefaults(defineProps<{id:string;label:string;modelValue:string;options:{id:string;name:string;disabled?:boolean}[];disabled?:boolean;status?:string;invalid?:boolean}>(),{status:'ready'})
const emit=defineEmits<{'update:modelValue':[value:string]}>()
const search=ref(''),open=ref(false),retried=ref(false),composing=ref(false)
const state=computed(()=>retried.value?'ready':props.status)
const options=computed(()=>state.value==='ready'?filterOptions(props.options,search.value):[])
const selected=computed(()=>selectedOption(props.options,props.modelValue))
useWorkspacePage().onLeave(()=>{open.value=false;composing.value=false})
function choose(id:any){if(composing.value||props.disabled||state.value!=='ready')return;const option=selectedOption(props.options,id);if(!option||option.disabled)return;emit('update:modelValue',option.id);open.value=false}
function guard(event:KeyboardEvent){if(event.key==='Enter'&&(composing.value||event.isComposing||event.keyCode===229)){event.preventDefault();event.stopImmediatePropagation()}}
function clear(){if(props.disabled)return;emit('update:modelValue','');search.value='';open.value=false;document.getElementById(props.id)?.focus()}
</script>
<template><div class="search-select" @keydown.capture="guard">
 <Label :for="id">{{label}}</Label>
 <Combobox :model-value="modelValue" v-model:open="open" :disabled="disabled" :ignore-filter="true" :reset-search-term-on-blur="false" :reset-search-term-on-select="false" :reset-model-value-on-clear="false" open-on-click @update:model-value="choose">
  <ComboboxAnchor><ComboboxInput :id="id" v-model="search" :disabled="disabled" :display-value="()=>search" placeholder="输入名称或编号搜索" :aria-invalid="invalid||Boolean(modelValue&&!selected)" :aria-describedby="`${id}-help ${id}-selected`" @compositionstart="composing=true" @compositionend="composing=false"/></ComboboxAnchor>
  <ComboboxList :aria-label="`${label}选项`"><ComboboxViewport>
   <p v-if="state==='loading'" role="status" class="control-message">正在加载选项（固定评审状态）</p>
   <div v-else-if="state==='failure'" class="control-message"><p role="alert">选项加载失败，搜索词和已选值已保留。</p><Button variant="outline" @click="retried=true">重试加载</Button></div>
   <p v-else-if="!options.length" role="status" class="control-message">无匹配选项，请更换名称或编号。</p>
   <ComboboxItem v-for="option in options" :key="option.id" :value="option.id" :disabled="option.disabled" :text-value="`${option.name} ${option.id}`"><span>{{option.name}} · {{option.id}}</span><ComboboxItemIndicator/></ComboboxItem>
  </ComboboxViewport></ComboboxList>
 </Combobox>
 <p :id="`${id}-help`" class="field-hint">搜索文字不代表选择；请确认带编号的选项。</p>
 <div class="selection-summary"><output :id="`${id}-selected`" aria-live="polite">{{selected?`已选：${selected.name} · ${selected.id}`:modelValue?'所选编号无效，请重新选择':'未选择'}}</output><Button variant="outline" :disabled="disabled||!modelValue" :aria-label="`清空${label}`" @click="clear">清空</Button></div>
</div></template>
