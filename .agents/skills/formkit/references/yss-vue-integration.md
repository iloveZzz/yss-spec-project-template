# 在 YSS Vue 工程中接入 FormKit 和 shadcn-vue

工程已使用或本次明确选定 FormKit 时，先核对实际版本、注册配置和本地控件 API。示例使用 Vue 3.5、FormKit 2.10.0 和 YSS starter 的 `Input`、`Button`。沿用工程的 FormKit 注册和页面主题。TypeScript 示例从 `@formkit/core` 导入类型，使用严格依赖解析的工程应声明与 `@formkit/vue` 同版本的直接类型依赖。

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
