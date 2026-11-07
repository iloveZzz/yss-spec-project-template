<script setup lang="ts">
import {computed,ref,shallowRef,nextTick,watch} from 'vue'
import {useMediaQuery} from '@vueuse/core'
import {parseDate,type DateValue} from '@internationalized/date'
import {RangeCalendarRoot} from 'reka-ui'
import {CalendarDays,ChevronsLeft,ChevronsRight} from '@lucide/vue'
import {RangeCalendarCell,RangeCalendarCellTrigger,RangeCalendarGrid,RangeCalendarGridBody,RangeCalendarGridHead,RangeCalendarGridRow,RangeCalendarHeadCell,RangeCalendarPrevButton,RangeCalendarNextButton} from '@/components/ui/range-calendar'
import {Popover,PopoverAnchor,PopoverTrigger,PopoverContent} from '@/components/ui/popover'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {rangeError,validDate,restoreControlFocus} from './business-controls.js'
import {useWorkspacePage} from './workspace-page'
const props=defineProps<{id:string;label:string;modelValue:{start:string;end:string};referenceDate:string;disabled?:boolean;embedded?:boolean}>()
const emit=defineEmits<{'update:modelValue':[value:{start:string;end:string}]}>()
const open=ref(false),draft=ref({...props.modelValue}),error=ref<any>(null),placeholder=ref(parseDate(props.referenceDate))
const editing=ref<'start'|'end'>('start'),preset=ref(0),wide=useMediaQuery('(min-width: 720px)')
const calendar=shallowRef<{start:DateValue|undefined;end:DateValue|undefined}>({start:undefined,end:undefined})
let calendarSync=0,syncPending=false
// Reka normalizes ranges; typed invalid/reversed drafts must survive until validation.
function syncCalendar(){
 const version=++calendarSync;syncPending=true
 const start=validDate(draft.value.start)?parseDate(draft.value.start):undefined
 const end=start&&validDate(draft.value.end)&&draft.value.end>=draft.value.start?parseDate(draft.value.end):undefined
 calendar.value={start,end}
 nextTick(()=>{if(version===calendarSync)syncPending=false})
}
const displayed=computed(()=>open.value?draft.value:props.modelValue)
const summary=computed(()=>props.modelValue.start||props.modelValue.end?`${props.modelValue.start||'未填'} 至 ${props.modelValue.end||'未填'}`:'不限日期')
useWorkspacePage().onLeave(()=>{open.value=false})
watch(()=>props.disabled,value=>{if(value)open.value=false})
function changeOpen(value:boolean){
 if(props.disabled)return
 if(value&&!open.value){draft.value={...props.modelValue};error.value=null;preset.value=0;placeholder.value=parseDate(validDate(draft.value.start)?draft.value.start:props.referenceDate);syncCalendar()}
 open.value=value
}
function begin(field:'start'|'end'){editing.value=field;changeOpen(true)}
function edit(field:'start'|'end',value:string|number){if(props.disabled)return;draft.value={...draft.value,[field]:String(value)};error.value=null;preset.value=0;if(field==='start'&&validDate(String(value)))placeholder.value=parseDate(String(value));syncCalendar()}
function calendarChange(value:any){if(!open.value||syncPending)return;draft.value={start:value?.start?.toString()||'',end:value?.end?.toString()||''};error.value=null;preset.value=0;editing.value=draft.value.end?'start':'end';syncCalendar()}
function recent(days:number){const end=parseDate(props.referenceDate);draft.value={start:end.subtract({days:days-1}).toString(),end:end.toString()};placeholder.value=parseDate(draft.value.start);preset.value=days;error.value=null;syncCalendar()}
function clear(){draft.value={start:'',end:''};error.value=null;preset.value=0;syncCalendar()}
async function apply(){if(props.disabled)return;error.value=rangeError(draft.value);if(error.value){await nextTick();document.getElementById(`${props.id}-${error.value.field}`)?.focus();return}emit('update:modelValue',{...draft.value});open.value=false}
async function focusCalendar(){changeOpen(true);await nextTick();document.getElementById(`${props.id}-calendar-panel`)?.querySelector<HTMLElement>('[data-slot="range-calendar-trigger"][tabindex="0"]')?.focus()}
function focusOnOpen(event:Event){event.preventDefault();if(!document.getElementById(`${props.id}-control`)?.querySelector('input:focus'))focusCalendar()}
function keepInputInteraction(event:any){if(document.getElementById(`${props.id}-control`)?.contains(event.detail.originalEvent.target))event.preventDefault()}
</script>
<template>
 <div class="date-range" :class="{'date-range-embedded':embedded}">
  <Label v-if="!embedded" :for="`${id}-start`">{{label}}</Label>
  <Popover :open="open" @update:open="changeOpen">
   <PopoverAnchor as-child>
    <div :id="`${id}-control`" class="date-range-control" role="group" :aria-label="label" :data-open="open" :data-disabled="disabled||undefined" :data-invalid="open&&Boolean(error)">
     <Input :id="`${id}-start`" :model-value="displayed.start" :disabled="disabled" :aria-label="`${label}开始日期`" :aria-invalid="open&&error?.field==='start'" :aria-describedby="open&&error?`${id}-error`:undefined" :data-active="open&&editing==='start'" placeholder="开始日期" autocomplete="off" @focus="begin('start')" @update:model-value="edit('start',$event)" @keydown.down.prevent="focusCalendar" @keydown.esc="open=false"/>
     <span class="date-range-separator" aria-hidden="true">~</span>
     <Input :id="`${id}-end`" :model-value="displayed.end" :disabled="disabled" :aria-label="`${label}结束日期`" :aria-invalid="open&&error?.field==='end'" :aria-describedby="open&&error?`${id}-error`:undefined" :data-active="open&&editing==='end'" placeholder="结束日期" autocomplete="off" @focus="begin('end')" @update:model-value="edit('end',$event)" @keydown.down.prevent="focusCalendar" @keydown.esc="open=false"/>
     <PopoverTrigger as-child><Button :id="id" variant="ghost" class="date-calendar-trigger" :disabled="disabled" :aria-label="`打开${label}日历`"><CalendarDays aria-hidden="true"/></Button></PopoverTrigger>
    </div>
   </PopoverAnchor>
   <PopoverContent class="date-range-popover date-range-popover-wide" align="end" :collision-padding="8" :aria-label="`编辑${label}`" @open-auto-focus="focusOnOpen" @close-auto-focus="restoreControlFocus(id,$event)" @interact-outside="keepInputInteraction">
    <div :id="`${id}-calendar-panel`" class="date-range-layout">
     <div class="date-shortcuts" aria-label="快捷日期范围"><Button v-for="days in [7,30,90]" :key="days" variant="ghost" :aria-pressed="preset===days" @click="recent(days)">最近{{days}}天</Button></div>
     <RangeCalendarRoot v-slot="{grid,weekDays}" data-slot="range-calendar" class="date-range-calendar" :model-value="calendar" v-model:placeholder="placeholder" :number-of-months="wide?2:1" locale="zh-CN" :week-starts-on="1" :fixed-weeks="true" :calendar-label="label" @update:model-value="calendarChange">
      <div class="date-months">
       <section v-for="(month,index) in grid" :key="month.value.toString()" class="date-month" :aria-label="`${month.value.year}年${month.value.month}月`">
        <header class="date-month-header">
         <div class="date-month-nav"><template v-if="index===0"><Button variant="ghost" aria-label="上一年" @click="placeholder=placeholder.subtract({years:1})"><ChevronsLeft aria-hidden="true"/></Button><RangeCalendarPrevButton aria-label="上个月"/></template></div>
         <span class="date-month-title">{{month.value.year}}-{{String(month.value.month).padStart(2,'0')}}</span>
         <div class="date-month-nav"><template v-if="index===grid.length-1"><RangeCalendarNextButton aria-label="下个月"/><Button variant="ghost" aria-label="下一年" @click="placeholder=placeholder.add({years:1})"><ChevronsRight aria-hidden="true"/></Button></template></div>
        </header>
        <RangeCalendarGrid><RangeCalendarGridHead><RangeCalendarGridRow><RangeCalendarHeadCell v-for="day in weekDays" :key="day">{{day}}</RangeCalendarHeadCell></RangeCalendarGridRow></RangeCalendarGridHead><RangeCalendarGridBody><RangeCalendarGridRow v-for="(week,index) in month.rows" :key="index"><RangeCalendarCell v-for="day in week" :key="day.toString()" :date="day"><RangeCalendarCellTrigger :day="day" :month="month.value"/></RangeCalendarCell></RangeCalendarGridRow></RangeCalendarGridBody></RangeCalendarGrid>
       </section>
      </div>
     </RangeCalendarRoot>
    </div>
    <footer class="date-range-footer"><p v-if="error" :id="`${id}-error`" role="alert" class="range-error">{{error.message}}</p><p v-else class="field-hint">包含起止日，确认后生效。</p><div class="range-actions"><Button variant="ghost" @click="clear">清空</Button><Button variant="outline" @click="open=false">取消</Button><Button @click="apply">确定</Button></div></footer>
   </PopoverContent>
  </Popover>
  <output :id="`${id}-summary`" class="sr-only" aria-live="polite">{{summary}}</output>
 </div>
</template>
