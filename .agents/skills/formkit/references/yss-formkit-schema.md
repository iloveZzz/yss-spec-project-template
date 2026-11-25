# 独立维护 FormKit 表单 JSON

YSS Vue 或 Nuxt 工程已选 FormKit 时，新建和本次改造的表单推荐将渲染结构集中在页面的 `schemas/<name>.form.schema.json`，通过 `FormKitSchema` 消费。按表单用途命名，例如 `profile.form.schema.json`。迁移已有表单时，按任务范围保留字段名、顺序、初值与错误路径，使 JSON 成为所迁移结构的唯一来源。

## 文件边界

| 位置 | 职责 |
| --- | --- |
| `*.form.schema.json` | FormKit 的可序列化渲染节点。维护字段名、标签、控件引用、布局、顺序和展示条件。表单用 FormKit 内置校验时，可在字段中声明相应规则 |
| Vue 页面和表单组件 | 维护弹窗、原生表单、提交按钮。以 `library` 提供稳定的本地组件，以 `data` 提供当前字段所需的选项、控件定义、权限结果和展示状态 |
| 页面校验与 service | 维护运行时输入校验、规范化、写入投影与 API 契约。表单 JSON、OpenAPI DTO 和 Zod 等运行时校验各有各的消费入口 |

已有应用统一管理校验时，JSON 维护渲染信息，提交前由现有校验器读取确定的快照并转换为写入输入。草稿、读写权限、可空值、删除语义、并发版本和保存恢复继续由应用层管理。

## 用 Vue 消费独立文件

将 [profile.form.schema.json](examples/profile.form.schema.json) 放到表单所在模块的 `schemas/`。本例使用 [已有控件适配](yss-vue-integration.md#绑定本地控件) 中的 `FormKitText.vue`、项目本地的 shadcn-vue `Button` 和 FormKit 2.10.0。JSON 声明两个字段，Vue 提供每个实例的 ID、展示条件和当前可写状态。表单回调把可写字段交给页面的 `save`。应用在发出请求前按实际契约校验输入、权限及版本，并处理保存结果。

`ProfileSchemaForm.vue`

```vue
<script setup lang="ts">
import { isNode, type FormKitGroupValue, type FormKitNode, type FormKitSchemaDefinition } from '@formkit/core'
import { FormKit, FormKitProvider, FormKitSchema, createInput, defaultConfig } from '@formkit/vue'
import { computed, nextTick, useId } from 'vue'
import { Button } from '@/components/ui/button'
import FormKitText from './FormKitText.vue'
import profileDefinition from './schemas/profile.form.schema.json'

const props = defineProps<{
  initialName: string
  showRemark: boolean
  canEditRemark: boolean
  save: (input: { displayName: string; remark?: string }) => Promise<void>
}>()

const schema: FormKitSchemaDefinition = profileDefinition
const library = { FormKit }
const config = defaultConfig()
const textInput = createInput(FormKitText)
const formId = useId()
const initialValues = { displayName: props.initialName }
const schemaData = computed(() => ({
  displayNameId: `${formId}-display-name`,
  remarkId: `${formId}-remark`,
  showRemark: props.showRemark,
  remarkReadOnly: !props.canEditRemark,
  textInput,
}))

function submit(values: FormKitGroupValue, node: FormKitNode) {
  const { displayName, remark } = values
  if (typeof displayName !== 'string') {
    node.setErrors(['表单字段未就绪，请重新打开。'])
    return
  }
  if (props.showRemark && props.canEditRemark && typeof remark === 'string') {
    return props.save({ displayName, remark })
  }
  return props.save({ displayName })
}

function focusInvalid(node: FormKitNode) {
  const invalidField = node.children.filter(isNode).find((field) => field.ledger.value('blocking') > 0)
  const fieldId = invalidField?.props.id
  if (typeof fieldId === 'string') {
    void nextTick(() => document.getElementById(fieldId)?.focus())
  }
}
</script>

<template>
  <FormKitProvider :config="config">
    <FormKit
      v-slot="{ disabled, state }"
      :id="formId"
      type="form"
      :actions="false"
      :incomplete-message="false"
      :value="initialValues"
      @submit="submit"
      @submit-invalid="focusInvalid"
    >
      <FormKitSchema :schema="schema" :data="schemaData" :library="library" />
      <Button type="submit" :disabled="disabled || state.loading">保存</Button>
    </FormKit>
  </FormKitProvider>
</template>
```

示例用项目内受信的 JSON 和最小的局部配置。已有 locale、插件、主题或控件注册时，从实际项目装配局部配置。上层按编辑会话或基线初始化表单，切换对象时更新实例键，或走明确的 reset 入口。`value` 用于初值，持续更新由受控值或草稿管理承担。本例在提交时显示必填错误并聚焦首个错误字段，避免点击时因失焦插入错误而移动提交按钮。弹窗页脚放在表单外时，可让原生提交按钮通过 `form` 指向稳定的表单 ID。

## 从服务端字段定义生成

运行时配置由服务端字段元数据驱动时，使用同一套 `FormKitSchema` 渲染接线。把元数据校验和转换放在项目代码中，运行时生成受限节点。独立 JSON 可承载本地固定字段与布局，生成节点由一个本地组合入口合入，字段名和来源保持唯一。

1. 校验实际契约的版本、字段类型、标识、路径和展示条件。把允许的字段类型、属性和条件映射到本地组件与表达式。遇到未知类型、重复标识、重复写路径或无效条件时，按项目约定报错或展示安全的只读回退。
2. 用稳定的业务字段 ID 或列表行 ID 保持组件身份。运行时 `library` 提供明确列出的组件，`data` 提供显示所需的值和经授权的选项。渲染器只消费本地生成的 Schema，远端字段标签、帮助和选项文本通过数据传入，按字面文本显示。提交、刷新及其他副作用由 Vue 或 service 持有。
3. 分别计算展示范围、可编辑范围、草稿和值写入投影。条件隐藏后可按业务保留草稿，再次显示时恢复。提交时遍历仍可写的字段，按 API 区分未修改省略、显式 `null`、只读历史值和附件写路径。服务端继续校验权限及业务约束。

## 验证接线

- 实际挂载 `FormKitSchema`，验证独立文件中的顺序、必填、展示条件、初值及 `library` 解析。核对标签、错误关联、Enter 提交和弹窗回焦。
- 配置化表单用同一组业务输入核对渲染与提交投影。覆盖历史停用选项或只读值、条件隐藏和恢复、草稿留存、拒写、未修改省略及显式清空。测试夹具的结果对应其覆盖的渲染和投影范围，真实写入按项目接口另行验证。
- 首次接入或调整局部 Provider 的导入位置时，核对生产构建产物的启动、目标路由和非目标路由。交互、外部校验、错误回填和写入恢复见 [Vue 工程接入](yss-vue-integration.md)。

[FormKit Vue Schema](https://formkit.com/essentials/schema.vue.md) · [FormKit Vue 配置](https://formkit.com/essentials/configuration.vue.md)
