<script setup lang="ts">
import {computed,ref,nextTick} from 'vue'
import {parseDate} from '@internationalized/date'
import {RangeCalendar} from '@/components/ui/range-calendar'
import {Popover,PopoverTrigger,PopoverContent} from '@/components/ui/popover'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {rangeError,validDate,restoreControlFocus} from './business-controls.js'
import {useWorkspacePage} from './workspace-page'
const props=defineProps<{id:string;label:string;modelValue:{start:string;end:string};referenceDate:string;disabled?:boolean}>()
const emit=defineEmits<{'update:modelValue':[value:{start:string;end:string}]}>()
const open=ref(false),draft=ref({...props.modelValue}),error=ref<any>(null),placeholder=ref(parseDate(props.referenceDate))
const calendar=computed(()=>({start:validDate(draft.value.start)?parseDate(draft.value.start):undefined,end:validDate(draft.value.end)?parseDate(draft.value.end):undefined}))
const summary=computed(()=>props.modelValue.start||props.modelValue.end?`${props.modelValue.start||'未填'} 至 ${props.modelValue.end||'未填'}`:'不限日期')
const workspace=useWorkspacePage();workspace.onLeave(()=>{open.value=false})
function changeOpen(value:boolean){if(value){draft.value={...props.modelValue};error.value=null;placeholder.value=parseDate(validDate(draft.value.start)?draft.value.start:props.referenceDate)}open.value=value}
function calendarChange(value:any){draft.value={start:value?.start?.toString()||'',end:value?.end?.toString()||''};error.value=null}
function startChange(value:any){draft.value={start:value?.toString()||'',end:''};error.value=null}
async function apply(){error.value=rangeError(draft.value);if(error.value){await nextTick();document.getElementById(`${props.id}-${error.value.field}`)?.focus();return}emit('update:modelValue',{...draft.value});open.value=false}
function focusBack(e:Event){e.preventDefault();nextTick(()=>restoreControlFocus(props.id))}
</script>
<template><div class="date-range"><Label :for="id">{{label}}</Label><Popover :open="open" @update:open="changeOpen"><PopoverTrigger as-child><Button :id="id" variant="outline" :disabled="disabled" :aria-describedby="`${id}-summary`">编辑{{label}}</Button></PopoverTrigger><PopoverContent class="date-range-popover" align="start" :aria-label="`编辑${label}`" @close-auto-focus="focusBack">
 <p class="field-hint">起止日均包含；应用前为临时值。</p>
 <div class="range-fields"><div><Label :for="`${id}-start`">起始日期</Label><Input :id="`${id}-start`" v-model="draft.start" placeholder="YYYY-MM-DD" :aria-invalid="error?.field==='start'" :aria-describedby="error?`${id}-error`:undefined" @update:model-value="error=null"/></div><div><Label :for="`${id}-end`">截止日期</Label><Input :id="`${id}-end`" v-model="draft.end" placeholder="YYYY-MM-DD" :aria-invalid="error?.field==='end'" :aria-describedby="error?`${id}-error`:undefined" @update:model-value="error=null"/></div></div>
 <p v-if="error" :id="`${id}-error`" role="alert" class="range-error">{{error.message}}</p>
 <RangeCalendar :model-value="calendar" v-model:placeholder="placeholder" locale="zh-CN" :week-starts-on="1" :calendar-label="label" @update:start-value="startChange" @update:model-value="calendarChange"/>
 <div class="toolbar range-actions"><Button variant="outline" @click="draft={start:'',end:''};error=null">清空临时日期</Button><Button variant="outline" @click="open=false">取消</Button><Button @click="apply">应用日期</Button></div>
 </PopoverContent></Popover><output :id="`${id}-summary`" aria-live="polite">{{summary}}</output></div></template>
