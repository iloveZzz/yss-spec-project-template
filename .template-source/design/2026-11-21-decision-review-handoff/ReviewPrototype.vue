<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ModalDialog from '@/components/ModalDialog.vue'
import { Badge } from '@prototype-ui/badge'
import { Label } from '@prototype-ui/label'
import { Textarea } from '@prototype-ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@prototype-ui/table'
import { Tabs, TabsList, TabsTrigger } from '@prototype-ui/tabs'

type Reply = {
  id: string
  version: number
  kind: 'answer' | 'defer'
  text: string
  impact?: string
  excluded?: string
  reviewDate?: string
  reviewWhen?: string
}
type HistoryEntry = { reply: Reply; reason: string }
type Question = {
  id: string
  title: string
  scope: string
  version: number
  current: Reply | null
  history: HistoryEntry[]
  state: 'changed' | 'overdue' | 'pending'
}
const sampleDate = '2026-11-21'
function initialQuestions(): Question[] {
  return [
    {
      id: 'OQ-01',
      title: '转交生效以后，按谁的身份判断撤回权限？',
      scope: '撤回权限',
      version: 2,
      state: 'changed',
      current: null,
      history: [
        {
          reason: '问题已改为转交生效后的场景。',
          reply: {
            id: 'D-01',
            version: 1,
            kind: 'answer',
            text: '由打开页面时的负责人撤回。',
          },
        },
      ],
    },
    {
      id: 'OQ-02',
      title: '拒绝撤回后，事项保留什么数据？',
      scope: '拒绝结果',
      version: 1,
      state: 'pending',
      current: { id: 'D-02', version: 1, kind: 'answer', text: '事项仍为待处理，当前负责人保持为乙。' },
      history: [],
    },
    {
      id: 'OQ-03',
      title: '转交与撤回同时发生时，向用户显示什么结果？',
      scope: '并发处理结果',
      version: 1,
      state: 'overdue',
      current: null,
      history: [
        {
          reason: '复查日期 2026-11-20 已到。',
          reply: {
            id: 'D-03',
            version: 1,
            kind: 'defer',
            text: '等待业务方核对同时操作的案例。',
            impact: '同时操作时的提示尚待确定。',
            excluded: '并发处理结果',
            reviewDate: '2026-11-20',
          },
        },
      ],
    },
  ]
}
const questions = ref(initialQuestions())
const selected = ref<Question | null>(null)
const editorOpen = ref(false)
const requestOpen = ref(false)
const mode = ref<'answer' | 'defer'>('answer')
const nextNumber = ref(4)
const openedVersion = ref(0)
const answer = ref(''),
  reason = ref(''),
  impact = ref(''),
  excluded = ref(''),
  reviewDate = ref(''),
  reviewWhen = ref('')
const initialForm = ref(''),
  error = ref(''),
  feedback = ref(''),
  editingFeedback = ref(''),
  discardPrompt = ref(false)
const eligible = computed(() => questions.value.filter((q) => q.current))
const archived = computed(() =>
  questions.value.flatMap((q) => q.history.map((h) => ({ question: q, ...h }))),
)
const needsReview = computed(() => questions.value.filter((q) => !q.current))
const oldAnswer = computed(() => selected.value?.history.find((h) => h.reply.kind === 'answer')?.reply)
function stateName(q: Question) {
  if (q.state === 'changed') return '问题有变，待复查'
  if (q.state === 'overdue') return '延期到期'
  return q.current?.kind === 'defer' ? '延期安排待回写' : '答复待回写'
}
function fullText(reply: Reply) {
  if (reply.kind === 'answer') return reply.text
  const lines = ['延期原因　' + reply.text, '影响　' + reply.impact, '排除范围　' + reply.excluded]
  if (reply.reviewDate) lines.push('复查日期　' + reply.reviewDate + '（UTC+08:00）')
  if (reply.reviewWhen) lines.push('复查条件　' + reply.reviewWhen)
  return lines.join('\n')
}
function formValue() {
  return JSON.stringify([
    mode.value,
    answer.value,
    reason.value,
    impact.value,
    excluded.value,
    reviewDate.value,
    reviewWhen.value,
  ])
}
function openEditor(q: Question) {
  selected.value = q
  openedVersion.value = q.version
  const current = q.current
  mode.value = current?.kind ?? 'answer'
  answer.value = current?.kind === 'answer' ? current.text : ''
  reason.value = current?.kind === 'defer' ? current.text : ''
  impact.value = current?.impact ?? ''
  excluded.value = current?.excluded ?? q.scope
  reviewDate.value = current?.reviewDate ?? ''
  reviewWhen.value = current?.reviewWhen ?? ''
  initialForm.value = formValue()
  discardPrompt.value = false
  editingFeedback.value = ''
  error.value = ''
  editorOpen.value = true
}
function allowClose() {
  if (formValue() === initialForm.value) return true
  discardPrompt.value = true
  return false
}
function cancelEdit() {
  if (allowClose()) editorOpen.value = false
}
function reuseAnswer() {
  if (!oldAnswer.value) return
  mode.value = 'answer'
  answer.value = oldAnswer.value.text
  error.value = ''
  editingFeedback.value = '已填入编辑区，可修改后保存。'
  nextTick(() => document.getElementById('answer-field')?.focus())
}
function conflictDemo() {
  const q = selected.value
  if (!q || openedVersion.value !== q.version) return
  if (q.current) q.history.unshift({ reply: q.current, reason: '问题版本已变化，原答复待复查。' })
  q.current = null
  q.version += 1
  q.title = q.title.replace(/？$/, '') + '（请区分成功与失败情形）？'
  q.state = 'changed'
  editingFeedback.value = '已模拟另一处更新问题。'
}
function save() {
  const q = selected.value
  if (!q) return
  error.value = ''
  if (openedVersion.value !== q.version) {
    error.value = '问题已更新，本次输入已保留。核对新版后，可继续编辑并另行保存。'
    return
  }
  if (mode.value === 'answer' && !answer.value.trim()) {
    error.value = '请填写本次答复，或选择沿用原答复。'
    nextTick(() => document.getElementById('answer-field')?.focus())
    return
  }
  if (mode.value === 'defer') {
    if (
      !reason.value.trim() ||
      !impact.value.trim() ||
      excluded.value.trim() !== q.scope ||
      (!reviewDate.value && !reviewWhen.value.trim())
    ) {
      error.value = '请填写延期原因、影响、完整排除范围，以及复查日期或条件。'
      return
    }
    if (reviewDate.value && reviewDate.value <= sampleDate) {
      error.value = '复查日期须晚于本次演示日期 2026-11-21。'
      return
    }
  }
  if (q.current) q.history.unshift({ reply: q.current, reason: '同一问题已有更新的答复。' })
  const id = 'D-' + String(nextNumber.value++).padStart(2, '0')
  q.current =
    mode.value === 'answer'
      ? { id, version: q.version, kind: 'answer', text: answer.value }
      : {
          id,
          version: q.version,
          kind: 'defer',
          text: reason.value,
          impact: impact.value,
          excluded: excluded.value.trim(),
          reviewDate: reviewDate.value,
          reviewWhen: reviewWhen.value,
        }
  q.state = 'pending'
  feedback.value = q.id + ' 已保存（' + id + '），等待回写。'
  editorOpen.value = false
}
function reviewLatestVersion() {
  if (!selected.value) return
  openedVersion.value = selected.value.version
  error.value = ''
  editingFeedback.value = '已切换到当前问题版本。请核对本次输入后保存。'
}
function reset() {
  editorOpen.value = false
  requestOpen.value = false
  selected.value = null
  questions.value = initialQuestions()
  nextNumber.value = 4
  feedback.value = '已恢复初始演示数据。'
}
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <span class="mark">Y</span>
      <strong>YSS</strong>
      <span class="product">个人工作台</span>
    </div>
    <div class="tools">
      <span>本地交互原型</span>
      <Button type="button" variant="outline" @click="reset">重置演示</Button>
    </div>
  </header>
  <main>
    <div class="crumb">
      Spec 详情
      <span aria-hidden="true">/</span>
      待确认事项
    </div>
    <h1>事项转交与撤回</h1>
    <p class="context">
      教学工程
      <span aria-hidden="true">·</span>
      演示日期 2026-11-21
    </p>
    <section class="panel summary" aria-label="内容确认">
      <div>
        <h2>
          内容确认
          <Badge variant="secondary" class="tag neutral">草稿</Badge>
        </h2>
        <p>{{ needsReview.length }} 项待复查，{{ eligible.length }} 项待回写。</p>
      </div>
      <Button type="button" variant="outline" @click="requestOpen = true">查看 Agent 续办文本</Button>
    </section>
    <section class="panel rows" aria-label="待确认事项">
      <div class="bar">
        <h2>待确认事项</h2>
        <span>3 个问题</span>
      </div>
      <Table class="questions">
        <TableHeader>
          <TableRow>
            <TableHead>问题</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>涉及范围</TableHead>
            <TableHead>答复 / 建议摘要</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="q in questions" :key="q.id">
            <TableCell>
              <small>{{ q.id }}</small>
              <strong>{{ q.title }}</strong>
            </TableCell>
            <TableCell>
              <Badge variant="secondary" :class="['tag', q.current ? 'blue' : 'amber']">
                {{ stateName(q) }}
              </Badge>
            </TableCell>
            <TableCell>{{ q.scope }}</TableCell>
            <TableCell class="reply-summary">
              {{
                q.current?.text ??
                (q.state === 'overdue' ? '原延期已到期，需重新处理。' : '原答复仅供复查。')
              }}
            </TableCell>
            <TableCell>
              <Button
                type="button"
                variant="outline"
                :aria-label="q.id + ' ' + (q.current ? '修改答复' : '复查')"
                @click="openEditor(q)"
              >
                {{ q.current ? '修改答复' : '复查' }}
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </section>
    <p class="feedback" role="status">{{ feedback }}</p>
  </main>

  <ModalDialog v-model="editorOpen" title="答复与延期" :before-close="allowClose">
    <form v-if="selected" class="stack" @submit.prevent="save">
      <div>
        <p class="eyebrow">{{ selected.id }} · 问题版本 {{ selected.version }}</p>
        <h3>{{ selected.title }}</h3>
      </div>
      <section v-if="selected.history.length" class="history-block" aria-label="历史记录">
        <div class="history-title">
          <strong>历史记录</strong>
          <span>仅供复查</span>
        </div>
        <article v-for="h in selected.history" :key="h.reply.id">
          <small>{{ h.reply.id }} · 问题版本 {{ h.reply.version }} · {{ h.reason }}</small>
          <p class="verbatim">{{ fullText(h.reply) }}</p>
        </article>
      </section>
      <Tabs v-model="mode">
        <TabsList aria-label="处理方式">
          <TabsTrigger value="answer">答复问题</TabsTrigger>
          <TabsTrigger value="defer">延期处理</TabsTrigger>
        </TabsList>
      </Tabs>
      <div v-if="mode === 'answer'" class="field">
        <div class="labelrow">
          <Label for="answer-field">本次答复</Label>
          <Button
            v-if="!selected.current && oldAnswer"
            type="button"
            variant="outline"
            @click="reuseAnswer"
          >
            沿用原答复
          </Button>
        </div>
        <Textarea
          id="answer-field"
          v-model="answer"
          rows="3"
          placeholder="填写适用于当前问题的答复"
          :aria-invalid="!!error && !answer.trim()"
        />
      </div>
      <div v-else class="fields">
        <div class="field">
          <Label for="reason">延期原因</Label>
          <Textarea id="reason" v-model="reason" rows="2" />
        </div>
        <div class="field">
          <Label for="impact">影响</Label>
          <Input id="impact" v-model="impact" />
        </div>
        <div class="field">
          <Label for="exclude">本次排除范围</Label>
          <Input id="exclude" v-model="excluded" />
        </div>
        <div class="twocol">
          <div class="field">
            <Label for="review-date">复查日期</Label>
            <Input id="review-date" v-model="reviewDate" type="date" />
          </div>
          <div class="field">
            <Label for="review-when">或复查条件</Label>
            <Input id="review-when" v-model="reviewWhen" />
          </div>
        </div>
      </div>
      <p class="muted">保存后进入待回写。业务规则以原规格中的验收条款为准。</p>
      <p v-if="editingFeedback" class="message" role="status">{{ editingFeedback }}</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div v-if="error && openedVersion !== selected.version">
        <Button type="button" variant="outline" @click="reviewLatestVersion">核对新版并保留输入</Button>
      </div>
      <div v-if="discardPrompt" class="discard" role="group" aria-label="放弃编辑确认">
        <strong>放弃本次编辑？</strong>
        <p>未保存的内容将被丢弃。</p>
        <Button type="button" variant="outline" @click="discardPrompt = false">继续编辑</Button>
        <Button type="button" variant="outline" @click="editorOpen = false">放弃编辑</Button>
      </div>
      <div class="form-actions">
        <Button type="button" variant="ghost" class="sim" @click="conflictDemo">模拟问题更新</Button>
        <Button type="button" variant="outline" @click="cancelEdit">取消</Button>
        <Button type="submit">保存答复</Button>
      </div>
    </form>
  </ModalDialog>

  <ModalDialog v-model="requestOpen" title="Agent 续办文本">
    <div class="stack">
      <section aria-label="当前可回写">
        <h3>当前可回写</h3>
        <p v-if="!eligible.length" class="muted">当前没有可回写的答复。</p>
        <article v-for="q in eligible" :key="q.id" class="request-card active-card">
          <small>
            {{ q.id }} · {{ q.current!.id }} · 问题版本 {{ q.version }} ·
            {{ q.current!.kind === 'defer' ? '仅回写延期安排' : '回写业务答复' }}
          </small>
          <strong>{{ q.title }}</strong>
          <p class="verbatim">{{ fullText(q.current!) }}</p>
        </article>
      </section>
      <section v-if="needsReview.length" aria-label="待复查问题">
        <h3>待复查问题</h3>
        <article v-for="q in needsReview" :key="q.id" class="request-card">
          <small>{{ q.id }} · 当前问题版本 {{ q.version }} · {{ stateName(q) }}</small>
          <strong>{{ q.title }}</strong>
          <p>请复查本题后再回写涉及{{ q.scope }}的内容。</p>
        </article>
      </section>
      <section aria-label="历史原文">
        <h3>历史原文</h3>
        <p class="muted">供追溯。只有当前有效答复可以用于回写。</p>
        <article v-for="h in archived" :key="h.reply.id" class="request-card history-block">
          <small>{{ h.question.id }} · {{ h.reply.id }} · 问题版本 {{ h.reply.version }}</small>
          <strong>{{ h.reason }}</strong>
          <p class="verbatim">{{ fullText(h.reply) }}</p>
        </article>
      </section>
      <div class="form-actions">
        <Button type="button" variant="outline" @click="requestOpen = false">关闭</Button>
      </div>
    </div>
  </ModalDialog>
</template>

<style>
:root {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 13px;
  line-height: 1.55;
  color: #25272b;
  background: #f7f8fa;
  font-synthesis: none;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
}
h1,
h2,
h3,
p {
  margin: 0;
}
h1,
h2,
h3,
strong {
  color: #171a20;
}
h1 {
  font-size: 24px;
  line-height: 1.4;
  letter-spacing: -0.4px;
  font-weight: 650;
}
h2 {
  font-size: 16px;
}
h3 {
  font-size: 15px;
}
button,
input,
textarea {
  font: inherit;
}
button {
  cursor: pointer;
}
:focus-visible {
  outline: 2px solid #3e6ae1;
  outline-offset: 3px;
}
.topbar,
.brand,
.tools,
.bar,
.summary,
.history-title,
.labelrow,
.form-actions,
.dialog-header,
.dialog-actions {
  display: flex;
  align-items: center;
}
.topbar {
  height: 56px;
  padding: 0 clamp(16px, 4vw, 52px);
  justify-content: space-between;
  background: white;
  border-bottom: 1px solid #e4e6eb;
}
.brand {
  gap: 9px;
  font-size: 17px;
}
.mark {
  display: grid;
  place-items: center;
  background: #171a20;
  color: white;
  font-size: 15px;
  font-weight: 700;
  border-radius: 7px;
  width: 26px;
  height: 26px;
}
.product {
  border-left: 1px solid #ddd;
  padding-left: 13px;
  margin-left: 5px;
}
.tools,
.product,
.context,
.bar > span,
.muted,
small,
.eyebrow,
.summary p {
  color: #62666c;
  font-size: 13px;
}
.tools {
  gap: 14px;
}
main {
  max-width: 1104px;
  margin: auto;
  padding: 34px 32px 58px;
}
.crumb {
  color: #62666c;
  margin-bottom: 14px;
}
.crumb span,
.context span {
  color: #9b9ea5;
  margin: 0 7px;
}
.context {
  margin-top: 6px;
}
.panel {
  border: 1px solid #e4e6eb;
  border-radius: 12px;
  background: white;
}
.summary {
  margin: 24px 0 16px;
  padding: 18px 22px;
  justify-content: space-between;
  gap: 14px;
}
.summary h2 {
  display: flex;
  align-items: center;
  gap: 10px;
}
.summary p {
  margin-top: 5px;
}
.rows {
  overflow: hidden;
}
.bar {
  padding: 17px 20px;
  justify-content: space-between;
  border-bottom: 1px solid #e4e6eb;
}
.questions {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.questions th {
  font-size: 12px;
  color: #62666c;
  font-weight: 500;
  background: #f7f8fa;
}
.questions :is(th, td) {
  padding: 12px 16px;
  border-bottom: 1px solid #e9ebef;
  text-align: left;
  vertical-align: middle;
}
.questions tr:last-child td {
  border-bottom: 0;
}
.questions td:first-child {
  width: 35%;
}
.reply-summary {
  color: #62666c;
}
.questions td strong,
.request-card strong {
  display: block;
  font-weight: 550;
}
.questions td small {
  font-size: 11px;
  color: #62666c;
  letter-spacing: 0.03em;
}
.tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 2px 8px;
  border: 1px solid transparent;
  font-size: 12px;
  white-space: nowrap;
}
.tag:before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.neutral {
  background: #f0f2f5;
  color: #535c6d;
}
.amber {
  background: #fff4df;
  color: #80540f;
}
.blue {
  background: #edf2ff;
  color: #3156aa;
}
[data-slot='button'] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 34px;
  border: 1px solid transparent;
  padding: 4px 12px;
  border-radius: 8px;
  background: #3e6ae1;
  color: white;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
}
[data-slot='button']:hover {
  background: #345cc9;
}
[data-slot='button'][data-variant='outline'] {
  background: white;
  color: #25272b;
  border-color: #cbd0da;
}
[data-slot='button'][data-variant='outline']:hover,
[data-slot='button'][data-variant='ghost']:hover {
  background: #edf2ff;
}
[data-slot='button'][data-variant='ghost'] {
  background: transparent;
  color: #48536a;
}
dialog {
  margin: auto;
  width: min(540px, calc(100vw - 32px));
  max-height: calc(100vh - 40px);
  border: 1px solid #e4e6eb;
  border-radius: 12px;
  padding: 24px;
  background: white;
  color: #25272b;
  box-shadow: 0 24px 70px #151e3730;
  overflow: auto;
}
dialog::backdrop {
  background: #17213660;
}
html:has(dialog:modal) {
  overflow: hidden;
}
.dialog-header {
  justify-content: space-between;
  margin-bottom: 18px;
}
.dialog-header h2 {
  font-size: 18px;
}
.stack,
.fields,
.field {
  display: grid;
  gap: 14px;
}
.field {
  gap: 6px;
}
.labelrow,
.history-title {
  justify-content: space-between;
  gap: 8px;
}
.field label {
  font-weight: 550;
}
.twocol {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 12px;
}
.history-block,
.request-card {
  padding: 12px 14px;
  border: 1px solid #e4e6eb;
  border-radius: 8px;
}
.history-block {
  background: #fff9ed;
  border-color: #ecddbe;
}
.history-title {
  margin-bottom: 6px;
}
.history-title span {
  color: #80540f;
  font-size: 12px;
}
.history-block article + article {
  border-top: 1px solid #ecddbe;
  margin-top: 9px;
  padding-top: 9px;
}
.verbatim {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin-top: 5px;
}
.request-card {
  margin-top: 9px;
}
.request-card strong {
  margin-top: 5px;
}
.active-card {
  background: #f4f7ff;
  border-color: #d9e2fb;
}
.eyebrow {
  font-size: 12px;
  margin-bottom: 3px;
}
.feedback,
.message {
  color: #3156aa;
}
.feedback {
  min-height: 22px;
  margin-top: 12px;
}
.error {
  color: #a52a30;
}
.discard {
  background: #f7f8fa;
  padding: 12px;
  border-radius: 8px;
}
.discard p {
  margin: 3px 0 8px;
}
.discard button + button {
  margin-left: 6px;
}
[data-slot='textarea'],
[data-slot='input'] {
  width: 100%;
  background: white;
  color: #25272b;
  border: 1px solid #cbd0da;
  border-radius: 8px;
  padding: 7px 10px;
  min-height: 34px;
}
[data-slot='textarea'] {
  resize: vertical;
  min-height: 74px;
}
[data-slot='tabs-list'] {
  display: inline-flex;
  gap: 2px;
  background: #f0f2f5;
  border-radius: 8px;
  padding: 3px;
}
[data-slot='tabs-trigger'] {
  border: 0;
  border-radius: 6px;
  background: transparent;
  padding: 4px 12px;
  font-size: 13px;
  color: #51555c;
}
[data-slot='tabs-trigger'][data-state='active'] {
  background: white;
  color: #171a20;
  box-shadow: 0 1px 3px #171a201c;
}
.form-actions {
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid #e4e6eb;
  padding-top: 13px;
}
.form-actions .sim {
  margin-right: auto;
  font-size: 12px;
}
@media (max-width: 780px) {
  .questions,
  .questions tbody,
  .questions tr,
  .questions td {
    display: block;
  }
  .questions thead {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  .questions tr {
    padding: 12px 16px;
    border-bottom: 1px solid #e4e6eb;
  }
  .questions tr:last-child {
    border: 0;
  }
  .questions td:first-child {
    width: auto;
  }
  .questions tbody tr td,
  .questions tbody tr:last-child td {
    padding: 3px 0;
    border: 0;
  }
  .questions td:nth-child(2),
  .questions td:nth-child(3) {
    display: inline-block;
    margin-right: 8px;
  }
  .questions td:last-child {
    margin-top: 4px;
  }
}
@media (max-width: 560px) {
  main {
    padding: 22px 16px 40px;
  }
  .topbar {
    padding: 0 12px;
  }
  .tools {
    gap: 7px;
  }
  .tools > span {
    font-size: 11px;
  }
  .brand {
    gap: 5px;
  }
  .product {
    margin-left: 1px;
    padding-left: 7px;
    font-size: 12px;
  }
  .summary {
    align-items: flex-start;
    flex-direction: column;
    padding: 16px;
  }
  [data-slot='button'],
  [data-slot='input'],
  [data-slot='tabs-trigger'] {
    min-height: 44px;
  }
  .form-actions {
    flex-wrap: wrap;
  }
  .twocol {
    grid-template-columns: 1fr;
  }
  dialog {
    padding: 18px;
    max-height: calc(100dvh - 24px);
  }
}
</style>
