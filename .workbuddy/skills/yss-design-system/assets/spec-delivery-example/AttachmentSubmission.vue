<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldLabel, FieldDescription, FieldError, FieldGroup, FieldSet, FieldLegend } from '@/components/ui/field'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { useWorkspacePage } from '../vue-business-patterns/workspace-page'
import { canView, canEdit, validateTitle, missingAttachments, type ExampleData, type RequestRecord, type Draft } from './model'

const props = defineProps<{
  scene: { id: string; label: string; stateRef: string; data: ExampleData; ticket: number }
}>()
const actor = props.scene.data.actor
const records = ref(props.scene.data.requests.map(record => ({
  ...record, requiredAttachments: [...record.requiredAttachments], attachments: [...record.attachments],
})))
const selectedId = ref(props.scene.data.openRequestId)
const record = computed(() => records.value.find(item => item.id === selectedId.value))
const visibleRecords = computed(() => records.value.filter(item => canView(item, actor)))
const viewable = computed(() => !!record.value && canView(record.value, actor))
const editable = computed(() => !!record.value && canEdit(record.value, actor))
function copyDraft(item?: Draft): Draft {
  return item ? { title: item.title, note: item.note, attachments: [...item.attachments] }
    : { title: '', note: '', attachments: [] }
}
const draft = ref(copyDraft(viewable.value ? record.value : undefined))
const error = ref(''), missing = ref<string[]>([]), notice = ref('')
const confirmOpen = ref(false), validSubmissions = ref(0)
const requirementsReady = ref(!props.scene.data.failFirstRequirementsRead)
const titleInvalid = computed(() => error.value === '请输入申请标题')
const dirty = computed(() => editable.value && JSON.stringify(draft.value) !== JSON.stringify(copyDraft(record.value)))
const workspace = useWorkspacePage()
workspace.trackDirty(dirty)
workspace.onLeave(() => { confirmOpen.value = false })

function clearFeedback() { error.value = ''; missing.value = []; notice.value = '' }
function openRequest(id: string) {
  selectedId.value = id
  draft.value = copyDraft(viewable.value ? record.value : undefined)
  clearFeedback()
}
function toggleAttachment(name: string, checked: boolean) {
  if (!editable.value || !requirementsReady.value || !record.value) return
  const next = checked ? [...draft.value.attachments, name] : draft.value.attachments.filter(item => item !== name)
  draft.value.attachments = record.value.requiredAttachments.filter(item => next.includes(item))
  clearFeedback()
}
function validate(): boolean {
  clearFeedback()
  if (!editable.value) { error.value = '当前申请只读或无操作权限，不能保存或提交。'; return false }
  error.value = validateTitle(draft.value.title) || ''
  if (error.value) document.getElementById('request-title')?.focus()
  return !error.value
}
function commit(status: RequestRecord['status']) {
  Object.assign(record.value!, copyDraft(draft.value), { status })
}
function save() {
  if (!validate()) return
  commit('draft')
  notice.value = '草稿已保存（本地模拟）。'
}
function submit() {
  if (!validate()) return
  if (!requirementsReady.value) { error.value = '附件要求读取失败，请先重试读取。'; return }
  missing.value = missingAttachments(record.value!.requiredAttachments, draft.value.attachments)
  if (missing.value.length) { error.value = '请补齐必需附件。'; return }
  validSubmissions.value += 1
  if (props.scene.data.failFirstSubmit && validSubmissions.value === 1) {
    error.value = '提交失败，输入已保留，请重试。'
    return
  }
  commit('submitted')
  notice.value = '提交成功（本地模拟）。申请已转为只读。'
}
function retryRequirements() {
  if (!viewable.value) return
  requirementsReady.value = true
  clearFeedback()
  notice.value = '附件要求已重新读取，请核对后提交。'
}
function back() {
  selectedId.value = null
  draft.value = copyDraft()
  confirmOpen.value = false
  clearFeedback()
}
function requestBack() { if (dirty.value) confirmOpen.value = true; else back() }
function closeFocus(event: Event) {
  event.preventDefault()
  if (workspace.active.value)
    document.getElementById(selectedId.value ? 'back-to-list' : 'requests-title')?.focus()
}
</script>

<template>
  <section class="surface example-context" aria-label="教学范围">
    <p class="muted">同一份规则 · 业务规格 / 原型 / 交互说明</p>
    <h2>附件提交校验</h2>
    <p>当前身份：{{ actor.role === 'editor' ? '经办人' : '团队观察者' }} · {{ actor.userId }} · {{ actor.teamId }}</p>
    <p class="muted">教学数据。附件仅模拟齐备状态，保存与提交只影响当前内存；刷新或重置恢复初始数据。</p>
  </section>

  <section v-if="!selectedId" class="surface" aria-labelledby="requests-title">
    <div class="example-heading"><h2 id="requests-title" tabindex="-1">申请列表</h2><span class="muted">可见 {{ visibleRecords.length }} 项</span></div>
    <div class="example-table" role="region" aria-label="可见申请" tabindex="0">
      <Table>
        <TableHeader><TableRow><TableHead>编号</TableHead><TableHead>标题</TableHead><TableHead>申请人</TableHead><TableHead>状态</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
        <TableBody><TableRow v-for="item in visibleRecords" :key="item.id">
          <TableCell>{{ item.id }}</TableCell><TableCell class="example-title">{{ item.title }}</TableCell>
          <TableCell>{{ item.ownerId }}</TableCell><TableCell>{{ item.status === 'draft' ? '草稿' : '已提交' }}</TableCell>
          <TableCell><Button variant="outline" :aria-label="'查看 ' + item.id" @click="openRequest(item.id)">查看</Button></TableCell>
        </TableRow></TableBody>
      </Table>
    </div>
    <p v-if="!visibleRecords.length" role="status">当前身份没有可见申请。</p>
  </section>

  <section v-else class="surface example-detail" aria-labelledby="detail-title">
    <div class="example-heading"><h2 id="detail-title">申请详情</h2><Button id="back-to-list" variant="outline" @click="requestBack">返回列表</Button></div>
    <template v-if="viewable && record">
      <dl class="example-facts">
        <div><dt>编号</dt><dd>{{ record.id }}</dd></div><div><dt>归属团队</dt><dd>{{ record.teamId }}</dd></div>
        <div><dt>申请人</dt><dd>{{ record.ownerId }}</dd></div><div><dt>状态</dt><dd>{{ record.status === 'draft' ? '草稿' : '已提交' }}</dd></div>
      </dl>
      <p v-if="!editable" class="example-readonly" role="status">{{ record.status === 'submitted' ? '申请已提交，详情只读。' : '团队观察者仅可查看，不能保存或提交。' }}</p>
      <form @submit.prevent="submit">
        <FieldGroup>
          <Field :data-invalid="titleInvalid">
            <FieldLabel for="request-title">申请标题</FieldLabel>
            <Input id="request-title" v-model="draft.title" :disabled="!editable" :aria-invalid="titleInvalid" :aria-describedby="titleInvalid ? 'title-help title-error' : 'title-help'" @update:model-value="clearFeedback"/>
            <FieldDescription id="title-help">必填；仅包含空白的标题不能保存或提交。</FieldDescription>
            <FieldError v-if="titleInvalid" id="title-error">{{ error }}</FieldError>
          </Field>
          <Field><FieldLabel for="request-note">备注</FieldLabel><Textarea id="request-note" v-model="draft.note" :disabled="!editable" @update:model-value="clearFeedback"/></Field>
          <FieldSet>
            <FieldLegend>必需附件</FieldLegend>
            <FieldDescription>勾选表示教学场景中该附件已齐备，不上传或校验真实文件。</FieldDescription>
            <div v-if="!requirementsReady" class="example-readonly" role="alert">
              <p>附件要求读取失败，输入已保留；清单恢复前不能提交。</p>
              <Button type="button" variant="outline" @click="retryRequirements">重试读取附件要求</Button>
            </div>
            <div v-else class="example-attachments">
              <Field v-for="(name, index) in record.requiredAttachments" :key="name" orientation="horizontal">
                <Checkbox :id="'attachment-' + index" :model-value="draft.attachments.includes(name)" :disabled="!editable" @update:model-value="checked => toggleAttachment(name, checked === true)"/>
                <FieldLabel :for="'attachment-' + index">{{ name }}</FieldLabel>
              </Field>
            </div>
          </FieldSet>
        </FieldGroup>
        <div v-if="error && !titleInvalid" class="example-error" role="alert">
          <p>{{ error }}</p><ul v-if="missing.length"><li v-for="name in missing" :key="name">{{ name }}</li></ul>
        </div>
        <p v-if="notice" class="example-success" role="status">{{ notice }}</p>
        <div class="example-actions">
          <span class="muted">{{ dirty ? '有未保存修改' : editable ? '当前内容与已保存值一致' : '只读' }}</span>
          <Button type="button" variant="outline" :disabled="!editable" @click="save">保存草稿</Button>
          <Button type="submit" :disabled="!editable">{{ error === '提交失败，输入已保留，请重试。' ? '重试提交' : '提交申请' }}</Button>
        </div>
      </form>
    </template>
    <p v-else class="example-error" role="alert">无查看权限。该记录不属于当前身份的可见范围，详情未展示。</p>
  </section>

  <AlertDialog v-model:open="confirmOpen">
    <AlertDialogContent @close-auto-focus="closeFocus">
      <AlertDialogHeader><AlertDialogTitle>放弃未保存修改？</AlertDialogTitle><AlertDialogDescription>留在当前页会保留全部输入；放弃后返回列表，已保存的数据保持不变。</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>留在当前页</AlertDialogCancel><AlertDialogAction @click="back">放弃并返回</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<style scoped>
.example-context h2 { margin-block: 8px; }
.example-context p { overflow-wrap: anywhere; }
.example-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.example-heading h2 { margin: 0; }
.example-table { overflow-x: auto; }
.example-title { min-width: 160px; max-width: 420px; white-space: normal; overflow-wrap: anywhere; }
.example-detail form { max-width: 760px; }
.example-facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px; }
.example-facts dt { color: var(--brand-color-text-secondary); font-size: 12px; }
.example-facts dd { margin: 4px 0 0; overflow-wrap: anywhere; }
.example-readonly { padding: 12px; margin-block: 16px; background: var(--brand-color-bg-layout); border-radius: var(--brand-border-radius); }
.example-attachments { display: grid; gap: 12px; }
.example-error { color: var(--brand-color-error-active); margin-block: 16px; overflow-wrap: anywhere; }
.example-error ul { padding-left: 20px; list-style: disc; }
.example-success { color: var(--brand-color-success); margin-block: 16px; }
.example-actions { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
.example-actions > span { margin-right: auto; }
@media (width < 720px) {
  .example-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .example-actions > span { width: 100%; }
}
</style>
