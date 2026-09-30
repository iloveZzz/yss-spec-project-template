<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldLabel, FieldDescription, FieldError, FieldGroup, FieldSet, FieldLegend } from '@/components/ui/field'
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupText } from '@/components/ui/input-group'
import Notice from './Notice.vue'
import { useWorkspacePage } from './workspace-page'
const props=defineProps<{scene:any}>()
const step=ref(1),draft=ref({...props.scene.data.form}),error=ref(''),failed=ref(false),done=ref(false)
const readonly=props.scene.id==='no-permission'
const workspace=useWorkspacePage()
workspace.trackDirty(computed(()=>!done.value&&!readonly&&JSON.stringify(draft.value)!==JSON.stringify(props.scene.data.form)))
function next(){if(!draft.value.name.trim()){error.value='请输入资料名称';document.getElementById('name')?.focus();return}error.value='';step.value=2}
function save(){if(!draft.value.owner.trim()){error.value='请输入负责人';document.getElementById('owner')?.focus();return}if(props.scene.id==='failure'&&!failed.value){failed.value=true;error.value='提交失败，所有步骤输入已保留，请重试。';return}error.value='';done.value=true}
function clear(message:string){if(error.value===message)error.value=''}
</script>
<template>
 <div class="form-layout"><aside class="step-aside" aria-label="填写进度"><ol class="step-list"><li :aria-current="step===1?'step':undefined" :class="step===1?'current':'completed'"><span class="step-number">{{step===1?'1':'✓'}}</span><div><strong>资料信息</strong><p>名称与补充说明</p></div></li><li :aria-current="step===2?'step':undefined" :class="{current:step===2}"><span class="step-number">2</span><div><strong>负责人及确认</strong><p>核对内容后提交</p></div></li></ol><div class="step-help"><strong>安心填写</strong><p>步骤之间可返回修改。提交失败后，已填内容会保留。</p><p>切换页签保留输入；关闭修改页时确认，刷新或重置会清除输入。</p></div></aside>
 <section class="surface form-surface"><h2>步骤 {{step}}/2：{{step===1?'资料信息':'负责人及确认'}}</h2><Notice v-if="readonly">当前资料仅可查看，不能提交修改。</Notice><div class="form-body"><FieldSet :disabled="readonly||done"><FieldLegend>{{step===1?'基本信息':'责任与确认'}}</FieldLegend><FieldGroup><template v-if="step===1"><Field :data-invalid="error==='请输入资料名称'"><FieldLabel for="name">资料名称</FieldLabel><InputGroup><InputGroupInput id="name" v-model="draft.name" :aria-invalid="error==='请输入资料名称'" :aria-describedby="error==='请输入资料名称'?'name-help name-error':'name-help'" @update:model-value="clear('请输入资料名称')"/><InputGroupAddon align="inline-end"><InputGroupText>必填</InputGroupText></InputGroupAddon></InputGroup><FieldDescription id="name-help">用于查询和确认；返回本步骤会保留输入。</FieldDescription><FieldError v-if="error==='请输入资料名称'" id="name-error">{{error}}</FieldError></Field><Field><FieldLabel for="note">说明</FieldLabel><Textarea id="note" v-model="draft.note"/></Field></template>
 <template v-else><p>资料：{{draft.name}}</p><p>说明：{{draft.note||'未填写'}}</p><Field :data-invalid="error==='请输入负责人'"><FieldLabel for="owner">负责人</FieldLabel><Input id="owner" v-model="draft.owner" :aria-invalid="error==='请输入负责人'" :aria-describedby="error==='请输入负责人'?'owner-help owner-error':'owner-help'" @update:model-value="clear('请输入负责人')"/><FieldDescription id="owner-help">确认资料的负责人；提交为本地模拟。</FieldDescription><FieldError v-if="error==='请输入负责人'" id="owner-error">{{error}}</FieldError></Field></template></FieldGroup></FieldSet><Notice v-if="error&&!['请输入资料名称','请输入负责人'].includes(error)" error>{{error}}</Notice><Notice v-if="done">提交成功（本地模拟）。</Notice></div>
 <div class="toolbar form-actions material-surface"><span class="action-context">{{done?'本次填写已完成':step===1?'下一步：负责人及确认':'请核对后提交'}}</span><Button v-if="step===2" variant="outline" :disabled="done" @click="step=1;error=''">上一步</Button><Button v-if="step===1" :disabled="readonly||done" @click="next">下一步</Button><Button v-else :disabled="readonly||done" @click="save">{{done?'已提交':failed?'重试提交':'确认提交'}}</Button></div></section></div>
</template>
