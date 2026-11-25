# 在 YSS Vue 工程中接入 FormKit 和 shadcn-vue

工程已使用或本次明确选定 FormKit 时，先核对实际版本、注册配置和本地控件 API。示例使用 Vue 3.5、FormKit 2.10.0 和 YSS starter 的 `Input`、`Button`。沿用工程的 FormKit 注册和页面主题。TypeScript 示例从 `@formkit/core` 导入类型，使用严格依赖解析的工程应声明与 `@formkit/vue` 同版本的直接类型依赖。

少数路由接入 FormKit，或已有页面校验和保存命令时，见[复用现有表单校验与保存逻辑](#复用现有表单校验与保存逻辑)。

## 绑定本地控件

`createInput` 将本地输入接入 FormKit 默认的标签、帮助和错误区。FormKit 保存字段值和校验状态，shadcn-vue 提供控件样式。将节点的 ID、名称、禁用、帮助与错误关联传到真实输入。客户端校验和服务端字段错误共用同一个视觉和可访问错误状态。示例通过标签和 `aria-required` 标记必填，由 FormKit 处理校验与错误焦点。

`FormKitText.vue`

```vue
<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { Input } from '@/components/ui/input'

defineProps<{ context: FormKitFrameworkContext<string> }>()
</script>

<template>
  <Input
    v-bind="context.attrs"
    :id="context.id"
    :name="String(context.node.name)"
    :model-value="context._value ?? ''"
    :disabled="context.disabled"
    :aria-describedby="context.describedBy"
    :aria-invalid="context.state.invalid || context.state.errors"
    @update:model-value="context.node.input($event)"
    @blur="context.handlers.blur"
  />
</template>
```

## 提交和错误回填

下面的 `saveProfile` 代表工程现有的 service。它接收对象、字段和值以及服务端可以核对的操作标识，成功返回 `{ ok: true }`，已确认拒绝返回 `{ ok: false, message?, fieldErrors? }`。字段错误可为字符串或字符串数组。示例在 HTTPS 或 localhost 生成操作标识，生产接法使用项目实际支持的请求结果或幂等契约。请求结果未知时，核对该次操作的结果。同值回读无法区分其他写入。

由已认证会话的上层组件创建一次 `createProfileSaveScope()`，把同一实例作为 `saveScope` 传给各次打开的编辑器。编辑器用实例键区分每次打开，换对象、切换会话或重开时重建。重开同一对象时读取上层保存的未决操作和草稿。父级通过 `verify-save` 收到原操作标识，使用已有查询核对。只有结果明确且会话、对象、权限和操作仍匹配时，才应用结果并调用 `settle(attempt, 'known')`。确认可重试时保留草稿，结果仍未知时保持保护。跨页面或刷新后的恢复沿用服务端契约。

`profile-save-scope.ts`

```ts
import { shallowReactive } from 'vue'

export type SaveAttempt = {
  operationId: string
  profileId: string
  displayName: string
}

type SaveState = {
  attempt: SaveAttempt
  phase: 'pending' | 'unconfirmed'
}

export function createProfileSaveScope() {
  const writes = shallowReactive(new Map<string, SaveState>())
  return {
    current(profileId: string) {
      return writes.get(profileId)
    },
    begin(profileId: string, displayName: string) {
      if (writes.has(profileId)) return
      const attempt = { operationId: crypto.randomUUID(), profileId, displayName }
      writes.set(profileId, { attempt, phase: 'pending' })
      return attempt
    },
    settle(attempt: SaveAttempt, outcome: 'known' | 'unknown') {
      if (writes.get(attempt.profileId)?.attempt.operationId !== attempt.operationId) return false
      if (outcome === 'unknown') {
        writes.set(attempt.profileId, { attempt, phase: 'unconfirmed' })
      } else {
        writes.delete(attempt.profileId)
      }
      return true
    },
  }
}

export type ProfileSaveScope = ReturnType<typeof createProfileSaveScope>
```

`ProfileEditor.vue`

```vue
<script setup lang="ts">
import type { FormKitNode } from '@formkit/core'
import { FormKit, createInput } from '@formkit/vue'
import { computed, nextTick, onBeforeUnmount, ref, useId, useTemplateRef } from 'vue'
import { Button } from '@/components/ui/button'
import { saveProfile } from '@/services/profile'
import FormKitText from './FormKitText.vue'
import type { ProfileSaveScope, SaveAttempt } from './profile-save-scope'

const props = defineProps<{ profileId: string; initialName: string; saveScope: ProfileSaveScope }>()
const emit = defineEmits<{ saved: [profileId: string]; verifySave: [attempt: SaveAttempt] }>()
const textInput = createInput(FormKitText)
const displayNameId = useId()
const feedback = useTemplateRef<HTMLParagraphElement>('feedback')
const rejected = ref(false)
const operation = computed(() => props.saveScope.current(props.profileId))

let active = true
onBeforeUnmount(() => {
  active = false
})

function focusName() {
  void nextTick(() => document.getElementById(displayNameId)?.focus())
}

async function restoreFeedbackFocus() {
  await nextTick()
  if (active && document.activeElement === document.body) feedback.value?.focus()
}

function reset(node: FormKitNode) {
  node.reset()
  rejected.value = false
}

function submit(values: Record<string, unknown>, node: FormKitNode) {
  const displayName = values.displayName
  if (!active || typeof displayName !== 'string') return
  const scope = props.saveScope
  const attempt = scope.begin(props.profileId, displayName)
  if (!attempt) return
  rejected.value = false
  node.setErrors([], { displayName: [] })
  return persist(scope, attempt, node)
}

async function persist(scope: ProfileSaveScope, attempt: SaveAttempt, node: FormKitNode) {
  const { profileId, displayName, operationId } = attempt
  let result: Awaited<ReturnType<typeof saveProfile>>
  try {
    result = await saveProfile(profileId, { displayName }, operationId)
  } catch {
    if (scope.settle(attempt, 'unknown') && active) await restoreFeedbackFocus()
    return
  }
  if (!scope.settle(attempt, 'known') || !active) return

  if (result.ok) {
    emit('saved', profileId)
    return
  }

  const formErrors = result.message ? [result.message] : []
  const inputErrors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
    const texts = (typeof messages === 'string' ? [messages] : messages).filter(Boolean)
    if (!texts.length) continue
    if (field === 'profile.displayName') {
      inputErrors.displayName = texts.join('\n')
    } else {
      formErrors.push(...texts)
    }
  }
  if (!formErrors.length && !Object.keys(inputErrors).length) {
    formErrors.push('保存未成功，请检查后再提交。')
  }
  node.setErrors(formErrors.length ? [formErrors.join('\n')] : [], inputErrors)
  rejected.value = true
  await restoreFeedbackFocus()
}
</script>

<template>
  <FormKit
    v-slot="{ state, disabled, node }"
    type="form"
    :actions="false"
    :incomplete-message="false"
    messages-class="whitespace-pre-line text-sm text-destructive"
    @submit="submit"
    @submit-invalid="focusName"
  >
    <FormKit
      :id="displayNameId"
      :type="textInput"
      name="displayName"
      label="显示名称（必填）"
      help="此名称会显示在成员列表中。"
      :value="operation?.attempt.displayName ?? initialName"
      :readonly="!!operation"
      aria-required="true"
      validation="required"
      validation-visibility="blur"
      :validation-messages="{ required: '请输入显示名称。' }"
      outer-class="space-y-1.5"
      label-class="text-sm font-medium"
      help-class="text-sm text-muted-foreground"
      messages-class="whitespace-pre-line text-sm text-destructive"
    />
    <div class="mt-4 flex gap-2">
      <Button type="submit" :disabled="disabled || state.loading || !!operation">保存</Button>
      <Button
        type="button"
        variant="outline"
        :disabled="disabled || state.loading || !!operation"
        @click="reset(node)"
      >
        重置
      </Button>
      <Button
        v-if="operation?.phase === 'unconfirmed'"
        type="button"
        variant="outline"
        @click="emit('verifySave', operation.attempt)"
      >
        核对保存结果
      </Button>
    </div>
    <p ref="feedback" role="status" tabindex="-1">
      <template v-if="operation?.phase === 'unconfirmed'">暂时无法确认保存结果，请先核对已保存状态。</template>
      <template v-else-if="rejected">保存未成功，请检查后再次提交。</template>
      <template v-else-if="operation?.phase === 'pending' || state.loading">正在保存…</template>
    </p>
  </FormKit>
</template>
```

以 FormKit 提交回调收到的值为准，返回实际写入 Promise。重复触发时同步返回，避免第二个 Promise 提前结束第一次提交的等待反馈。开始新提交时，用空错误清掉本示例上一回执的同源消息。确认失败后用状态区域通知用户，提交按钮失焦时将焦点落到该区域。FormKit 2.10.0 可能为同一节点的多条纯中文错误生成相同的键，所以示例按节点合并为一条多行消息，保留全部内容。父级收到 `saved` 后按业务处理关闭、草稿清理或回读。保存成功后的回读失败沿用 `yss-frontend-loading` 的读取恢复。

核对初值与重置、Tab 失焦、Enter 提交和提交期间禁用。验证多条中文错误全部可读、原样重试时旧错误清除、服务端失败后焦点有效。分别在请求在途和结果未知时重开同一对象，确认草稿与保护保留，核对动作仍带同一操作标识。切换对象后再使原请求完成，检查当前对象的草稿、消息和等待状态。

[FormKit 自定义输入](https://formkit.com/essentials/custom-inputs.vue.md) · [FormKit 表单提交与错误](https://formkit.com/inputs/form.vue.md)

## 复用现有表单校验与保存逻辑

- **局部配置。** 只有少数页面使用 FormKit 时，可在实际表单子树内使用 `FormKitProvider`，传入含所需语言、输入、规则和插件的配置。Provider 在其范围使用自己的配置，接入前核对项目的全局约定。其他页面可以继续使用原有表单库。局部 Provider 控制配置范围，若目标还包括减少入口包体积，配合路由或弹层惰性导入并检查生产构建的入口依赖。[FormKit 配置](https://formkit.com/essentials/configuration)
- **字段和草稿。** 页面已用 shadcn-vue `Field`、`FieldLabel`、`FieldError` 时，可用本地 `FormKitTypeDefinition` 接入这些控件，由同一套 Field 呈现标签和错误。把 ID、名称、值、禁用、失焦和错误关联传到实际交互元素。弹窗底部按钮可通过 `type="submit"` 和 `form` 属性关联表单，点击和 Enter 走同一提交入口。弹窗重开或页面重新激活后需恢复草稿时，使用一份受控草稿，提交时取 FormKit 回调给出的已稳定快照。即时业务交互要求父级读到本次修改时才考虑 `node.input(value, false)`。独立于提交入口读取节点值时，按需等待 `node.settled`。[FormKit 表单提交](https://formkit.com/inputs/form.vue.md)
- **请求校验。** 工程已用 Zod 4 时，由页面或现有 service 对提交快照执行 `safeParseAsync`，校验成功后把 `parsed.data` 交给写入命令。按实际契约复用生成的请求校验，另在手写层转换页面值，如空选项到 `null`，并保留原始草稿用于回显。FormKit 节点收集值，页面负责这份请求校验及错误回显。已存在内部 FormKit 校验时，明确两层职责，避免同一规则、错误或提交由两套机制同时管理。`@formkit/zod` 2.10.0 声明 Zod 3 peer，其字段变更回调用同步 `safeParse`，提交才用 `safeParseAsync`。已有 Zod 4 或异步规则的工程可直接在提交入口调用自身 schema，局部重校验也按规则的同步或异步性质处理。用 [FormKit Schema 文件](yss-formkit-schema.md) 管界面声明时，接口字段和值的转换仍放在工程原有的请求边界。[@formkit/zod 2.10.0 包元数据](https://registry.npmjs.org/@formkit%2fzod/2.10.0) · [固定版本适配器源码](https://github.com/formkit/formkit/blob/922642ee49989216c281e5cc8442ce01dc5986a0/packages/zod/src/zod.ts#L76)
- **错误和焦点。** 按服务端实际协议识别校验拒绝，例如约定的 422。把能匹配当前可编辑字段的错误归到实际字段标识，未匹配或不可编辑字段的提示保留在表单区域。字段改动时清该字段的服务端错误，保留其他字段和表单错误。解锁后聚焦仍可操作的首个错误控件，找不到时聚焦表单提示，并校验弹窗仍处于本次编辑实例。
- **失活和回执。** `KeepAlive` 失活会保留实例。用活跃态控制弹窗是否显示、查询是否继续和焦点能否转移，草稿和未决命令交给已有状态所有者。发起异步校验、提交或重放时记录会话、对象和编辑实例，异步校验结束后复核权限，回执只更新仍匹配的操作，旧会话的数据与 UI 状态随会话边界清理。[Vue KeepAlive](https://vuejs.org/guide/built-ins/keep-alive.html)
- **未知结果。** 按上例用可靠的操作标识查询结果。服务端明确支持原请求幂等重放时，也可保留一个未决命令，用原幂等键、保存时冻结的请求体和原预期版本重放，重试入口继续防重复。确认版本冲突时，例如接口约定的 409，保留草稿并重新读取服务端快照。由用户按工程约定重新载入或合并后才用新版本提交。回读值与草稿相同也可能来自其他操作，确认结果以服务端契约为准。

这一路径来自 SCRM 获客来源试点，核对的是 `scrm-frontend` 在 `96f972d` 基线之上的工作树。局部配置和适配见 `src/views/Acquisition/Sources/components/SourceEditDialog.vue`、`SourceFormKitField.vue`，Zod 校验和写入见同页的 `schemas/sourceSchema.ts`、`hooks/useAcquisitionSources.ts` 及 `src/hooks/useVersionedCommand.ts`。已有 `tests/acquisition-source-formkit.test.ts` 用模拟响应覆盖重复提交、字段错误与焦点、同键同请求重放、版本冲突及会话切换后的迟到回执。缓存失活与恢复、生产分包、真实服务重放按消费工程另行验证。
