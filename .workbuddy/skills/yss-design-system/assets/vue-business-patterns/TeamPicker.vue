<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {ChevronDown,ChevronRight,Folder,Search,UsersRound,X,Minus,Check} from '@lucide/vue'
import {Popover,PopoverTrigger,PopoverContent} from '@/components/ui/popover'
import {Button} from '@/components/ui/button'
import {Checkbox} from '@/components/ui/checkbox'
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from '@/components/ui/collapsible'
import {InputGroup,InputGroupAddon,InputGroupInput} from '@/components/ui/input-group'
import {Label} from '@/components/ui/label'
import {restoreControlFocus} from './business-controls.js'
import {useWorkspacePage} from './workspace-page'
type Employee={id:string;name:string;enabled:boolean}
type Department={id:string;name:string;employees:Employee[]}
const props=defineProps<{id:string;label:string;modelValue:string[];departments:Department[];disabled?:boolean}>()
const emit=defineEmits<{'update:modelValue':[value:string[]]}>()
const open=ref(false),draft=ref<string[]>([]),query=ref(''),showAll=ref(false),expanded=ref<string[]>([]),error=ref('')
const employees=computed(()=>props.departments.flatMap(department=>department.employees.map(employee=>({...employee,department:department.name}))))
const selected=computed(()=>draft.value.map(id=>employees.value.find(employee=>employee.id===id)||{id,name:`不可用员工 (${id})`,department:''}))
const summary=computed(()=>{const names=props.modelValue.map(id=>employees.value.find(employee=>employee.id===id)?.name||'不可用员工');return names.length?names.length>2?`${names.slice(0,2).join('、')} 等 ${names.length} 人`:names.join('、'):'请选择员工/部门'})
const visible=computed(()=>{const term=query.value.trim().toLocaleLowerCase('zh-CN');return props.departments.map(department=>({...department,employees:department.employees.filter(employee=>(showAll.value||employee.enabled)&&(!term||`${department.name} ${employee.name} ${employee.id}`.toLocaleLowerCase('zh-CN').includes(term)))})).filter(department=>department.employees.length)})
useWorkspacePage().onLeave(()=>{open.value=false})
watch(()=>props.disabled,value=>{if(value)open.value=false})
function changeOpen(value:boolean){if(props.disabled)return;if(value&&!open.value){draft.value=[...props.modelValue];query.value='';error.value=''}open.value=value}
function toggle(id:string,value:boolean){if(props.disabled)return;draft.value=value?[...new Set([...draft.value,id])]:draft.value.filter(selected=>selected!==id);error.value=''}
function departmentState(department:Department):boolean|'indeterminate'{const count=department.employees.filter(employee=>draft.value.includes(employee.id)).length;return count===department.employees.length?true:count?'indeterminate':false}
function toggleDepartment(department:Department,value:boolean){if(props.disabled)return;const ids=department.employees.map(employee=>employee.id);draft.value=value?[...new Set([...draft.value,...ids])]:draft.value.filter(id=>!ids.includes(id));error.value=''}
function toggleExpanded(id:string,value:boolean){expanded.value=value?[...new Set([...expanded.value,id])]:expanded.value.filter(current=>current!==id)}
function apply(){if(props.disabled)return;if(draft.value.some(id=>!employees.value.some(employee=>employee.id===id))){error.value='存在不可用员工，请移除后重新选择。';return}emit('update:modelValue',[...draft.value]);open.value=false}
</script>
<template>
 <Popover :open="open" @update:open="changeOpen"><PopoverTrigger as-child><Button :id="id" variant="outline" class="team-picker-trigger" :class="{'has-value':modelValue.length}" :disabled="disabled" :aria-label="`${label}：${summary}`"><span>{{summary}}</span><ChevronDown aria-hidden="true"/></Button></PopoverTrigger>
  <PopoverContent class="team-picker-popover" align="start" :collision-padding="8" :aria-label="`选择${label}`" @close-auto-focus="restoreControlFocus(id,$event)">
   <div class="team-picker-main">
    <section class="team-picker-browser" aria-label="部门和员工"><header class="team-picker-heading"><h3>员工</h3></header><InputGroup><InputGroupAddon><Search aria-hidden="true"/></InputGroupAddon><InputGroupInput :id="`${id}-search`" v-model="query" :aria-label="`搜索${label}员工或部门`" placeholder="搜索员工/部门"/></InputGroup>
     <div class="team-tree"><p v-if="!visible.length" role="status" class="field-hint">没有匹配的员工或部门</p><Collapsible v-for="department in visible" :key="department.id" :open="Boolean(query.trim())||expanded.includes(department.id)" @update:open="toggleExpanded(department.id,$event)">
      <div class="team-tree-row"><CollapsibleTrigger as-child><Button variant="ghost" class="tree-expand" :aria-label="`${expanded.includes(department.id)||query.trim()?'收起':'展开'}${department.name}`"><ChevronRight aria-hidden="true" :class="{'is-expanded':expanded.includes(department.id)||query.trim()}"/></Button></CollapsibleTrigger><Checkbox :id="`${id}-department-${department.id}`" :model-value="departmentState(department)" :aria-label="`选择${department.name}当前显示的员工`" @update:model-value="toggleDepartment(department,$event===true)"><Minus v-if="departmentState(department)==='indeterminate'"/><Check v-else/></Checkbox><Folder class="team-folder" aria-hidden="true"/><Label :for="`${id}-department-${department.id}`">{{department.name}}</Label></div>
      <CollapsibleContent><div v-for="employee in department.employees" :key="employee.id" class="team-tree-row team-employee"><Checkbox :id="`${id}-employee-${employee.id}`" :model-value="draft.includes(employee.id)" @update:model-value="toggle(employee.id,$event===true)"/><Label :for="`${id}-employee-${employee.id}`"><span>{{employee.name}}</span><small>{{employee.id}}{{employee.enabled?'':' · 未启用'}}</small></Label></div></CollapsibleContent>
     </Collapsible></div>
    </section>
    <section class="team-picker-selected" aria-label="已选员工"><header class="team-selection-heading"><span aria-live="polite">已选：{{draft.length}}</span><Button variant="ghost" :disabled="!draft.length" @click="draft=[];error=''">清空</Button></header><ul v-if="selected.length" class="team-selected-list"><li v-for="employee in selected" :key="employee.id"><UsersRound aria-hidden="true"/><div><span>{{employee.name}}</span><small>{{employee.department}} · {{employee.id}}</small></div><Button variant="ghost" :aria-label="`移除${employee.name}`" @click="toggle(employee.id,false)"><X aria-hidden="true"/></Button></li></ul><div v-else class="team-selection-empty"><UsersRound aria-hidden="true"/><p>暂未选择员工</p></div></section>
   </div>
   <footer class="team-picker-footer"><div><div class="team-show-all"><Checkbox :id="`${id}-all`" v-model="showAll"/><Label :for="`${id}-all`">显示所有员工</Label></div><p class="field-hint">未勾选时仅显示已启用员工</p></div><div class="team-picker-actions"><Button variant="outline" @click="open=false">取消</Button><Button @click="apply">确定</Button></div><p v-if="error" role="alert" class="range-error">{{error}}</p></footer>
  </PopoverContent>
 </Popover>
</template>
