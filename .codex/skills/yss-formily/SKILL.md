---
name: yss-formily
description: 指导在 YSS UI 业务页面中正确使用 @yss-ui/components 的 YFormily；当新增、编辑、查看、查询、联动、详情插槽、分步表单或动态 schema 需求出现时使用，并校验组件导入、提交与错误处理边界。
---

# YFormily 表单开发 Skill

## 触发条件

- 生成或修改新增、编辑、查看、弹窗表单、详情表单、查询表单。
- 需要 JSON Schema、字段联动、动态显隐、远程字典、Slot 自定义渲染。
- 需要 `mode=0/1/2`、详情 Descriptions、分步表单。

## 不适用场景

- 页面只有普通列表，不涉及表单：使用 `../page-list-module/SKILL.md`。
- 只处理表格操作列或分页：使用 `../ytable-usage/SKILL.md`。
- 组件库内部改造 YFormily 源码：使用 `../component-development/SKILL.md`。

## 文档检索

1. 当前会话可用 yss-ui MCP 时，先用 `get_component_docs` 查询 `YFormily` 的 Props、Events、Slots、Methods 和 Types；再按需求用 `get_demo` 获取 `formily/basic`、`formily/linkage`、`formily/modes`、`formily/effects`、`formily/steps` 等官方 Demo。
2. MCP 查询未命中时先用 `search_docs/list_components` 校正名称；只有 MCP 不可用、调用失败或校正后仍无结果时，才读取最新 `llms-full.txt`。文档与当前项目依赖版本不一致时，用当前源码和可编译导出核验，不猜测 API。
3. 本 Skill 已加载时不得用 `get_skill` 重复查询自身；只在所需 Formily 子 Skill 未同步到本地时使用 `get_skill` 兜底。

## 硬约束（禁止/必须）

- 业务生成代码统一使用 `import { YFormily, type ISchema } from '@yss-ui/components'`。
- `YFormily` 是标准推荐名称；`YssFormily` 仅作为历史兼容别名，除非维护旧代码，不用于新代码。
- 业务层禁止导入 `@formily/antdv` UI 组件，禁止导入不存在的 `@formily/antd-v3`。
- 所有业务 `YFormily` schema 必须包含 `FormLayout -> FormGrid -> 字段` 基础层级，禁止直接以字段或单独 `FormGrid` 作为顶层布局。
- `Submit` 组件必须传 `onSubmit`，否则不会触发提交校验。
- 标准业务列表/CRUD 查询区默认让 `YFormily` 只渲染查询字段；“查询/重置”用外部 `YButton` 放在 `.xxx__search-actions`，由 hook 的 `handleSearch/handleReset` 控制分页重置和请求。
- `AutoButtonGroup + Submit + Reset` 仅用于纯 Formily 表单提交场景，不作为业务列表查询区默认方案。
- 查询区禁止把 `.xxx__search-content` 写成横向“表单 + 按钮”并用大 `gap`、`align-items: flex-start`、`padding-top` 硬调按钮位置；字段换行时按钮必须仍在搜索卡片右下角。
- 横向业务表单必须显式设置 `FormLayout` 的 `labelWidth` 和 `labelAlign: 'right'`；抽屉/弹窗表单不得让 label 宽度随文本抖动。
- `FormGrid` 必须保持响应式：默认 `minColumns: 1`，通过 `maxColumns`、`minWidth` 控制宽屏列数；禁止把 `minColumns` 写成与 `maxColumns` 相同的固定列数，除非用户明确要求固定不响应。
- 抽屉/弹窗编辑表单默认 `labelWidth: 140`、`labelAlign: 'right'`、`FormGrid { maxColumns: 2, minColumns: 1, minWidth: 320~360 }`；备注、长文本等字段用 `gridSpan` 占满整行。
- **数据前置同步原则（必守）**：弹窗/抽屉表单数据必须在 `openCreate`/`openEdit` 打开方法中**同步赋好 `formModel.value`**，严禁在子组件内部通过 `watch(visible) + await nextTick() + initForm()` 滞后回填数据。
- **单一信任源**：优先使用 `v-model="formModel"` + `ref="formRef"` 调用 `formRef.value.submit()` 获取校验后数据；严禁在业务组件顶层写 `const form = createForm()` 单例并与 `v-model`、`form.setValues()`、`form.reset()` 混用导致状态死锁。
- **禁止滥用动态 `:key`**：严禁在 `YFormily`/`YssFormily` 上使用 `:key="isEdit ? 'edit' : 'create'"` 强制 Remount，必须通过响应式数据或 `:mode` 驱动。
- **弹窗生命周期隔离**：Modal/Drawer 必须配置 `:destroy-on-close="true"`，且内部 `YFormily` 必须带 `v-if="visible/open"` 随容器打开挂载、关闭销毁，保证数据干净无残留。
- 下拉/选择器（`Select`, `TreeSelect`, `Radio.Group` 等）异步数据源**必须使用 `enum` 或 `x-reactions` / `field.dataSource` 注入**；**严禁将异步 options 数组直接写入 `x-component-props.options`**（会导致 Formily 首次挂载覆盖为空数组且外部响应式无法通知，产生首次打开弹窗显示“暂无数据”、关闭再打开才展示的经典 Bug）。
- 弹窗/抽屉表单的基础字典下拉数据，优先在打开前 `await fetchOptions()` 或在页面 `onMounted` 提前拉取；在组件内部 `watch` 更新选项时，必须使用精确字段路径并在 `await nextTick()` 后调用 `form.setFieldState('fieldName', state => { state.dataSource = options })`。
- `mode=2` 自动进入详情查看态；不要生成旧式详情开关 prop，配置描述列表用 `detail-options`。
- 只使用源码已公开的 Props 和实例方法；当前没有 `show-button-group`、`detail-as`、`validate`、`reset`、`clearValidate` 等 YFormily API，禁止根据旧 demo 猜测。
- 分步表单默认使用 AntDV `Steps + 多 YFormily`，不默认使用 `FormStep`。
- Orval API 的网络错误及 `success === false` 业务错误已由 `mutator.ts` 统一 `message.error` 并 reject；提交 hook 的 `else`/`catch` 只做状态恢复或业务补偿，禁止重复 `message.error`。
- 需要统一提示客户端校验失败时使用 `onFormSubmitValidateFailed`；禁止在 `onFormSubmitFailed` 或 `Submit.onSubmitFailed` 中调用 `message.error`，因为 API reject 也会进入这些通用失败回调。

## 标准代码骨架

```vue
<script setup lang="ts">
import { YFormily, type ISchema } from '@yss-ui/components';

/** 表单保存回调 Props。 */
interface SaveFormProps {
  onSave: (values: Record<string, any>) => Promise<void>;
}

/** 表单保存回调。 */
const props = defineProps<SaveFormProps>();

/** 校验通过后提交表单数据。 */
const onSubmit = (values: Record<string, any>) => {
  return props.onSave(values);
};

/** 基础业务表单 Schema。 */
const schema: ISchema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'horizontal', labelWidth: 100, labelAlign: 'right' },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          'x-component-props': { maxColumns: 3, minColumns: 1, minWidth: 260 },
          properties: {
            name: {
              type: 'string',
              title: '名称',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-component-props': { placeholder: '请输入' },
            },
            submit: {
              type: 'void',
              'x-component': 'Submit',
              'x-content': '提交',
              'x-component-props': { onSubmit: '{{ onSubmit }}' },
            },
          },
        },
      },
    },
  },
};
</script>

<template>
  <YFormily :schema="schema" :scope="{ onSubmit }" />
</template>
```

### 表单布局基准

- 普通业务表单：`FormLayout { layout: 'horizontal', labelWidth: 120, labelAlign: 'right' }`，`FormGrid { maxColumns: 3, minColumns: 1, minWidth: 260 }`。
- 抽屉/弹窗表单：长 label 较多时用 `labelWidth: 140`，`FormGrid { maxColumns: 2, minColumns: 1, minWidth: 320 或 360 }`。
- 查询表单：字段少时用 `labelWidth: 100~120`，`FormGrid { maxColumns: 3 或 4, minColumns: 1, minWidth: 260~360 }`；查询/重置按钮放在表单外部的右下角按钮行。
- 不要为了复刻宽屏两列布局写 `minColumns: 2`；这会破坏组件库 demo 中默认的响应式收缩行为。
- 备注、说明、富文本、长输入框等横跨整行字段，在字段 `x-decorator-props` 上设置 `gridSpan`，例如两列表单使用 `gridSpan: 2`。

### 业务列表查询区固定模板

```typescript
import { YButton, YCard, YFormily, type ISchema } from '@yss-ui/components';

/** 查询表单 Schema。 */
const searchSchema: ISchema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'horizontal', labelWidth: 120, labelAlign: 'right' },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          'x-component-props': { maxColumns: 4, minColumns: 1, minWidth: 260, columnGap: 16, rowGap: 0 },
          properties: {
            keyword: {
              type: 'string',
              title: '关键字',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-component-props': { placeholder: '请输入关键字', allowClear: true },
            },
          },
        },
      },
    },
  },
};
```

```vue
<template>
  <YCard class="demo-page__search-card" :padding="16">
    <div class="demo-page__search-content">
      <div class="demo-page__search-form">
        <YFormily v-model="queryModel" :schema="searchSchema" />
      </div>
      <div class="demo-page__search-actions">
        <YButton type="primary" @click="handleSearch">查询</YButton>
        <YButton @click="handleReset">重置</YButton>
      </div>
    </div>
  </YCard>
</template>
```

```less
.demo-page {
  &__search-content {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  &__search-form {
    width: 100%;
    min-width: 0;

    :deep(.ant-formily-form-item) {
      margin-bottom: 0;
    }

    :deep(.ant-formily-form-grid) {
      width: 100%;
    }
  }

  &__search-actions {
    display: flex;
    width: 100%;
    flex: 0 0 auto;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
  }
}
```

> 只有纯 Formily 提交表单才把按钮放回 schema 内，例如 `AutoButtonGroup -> Submit/Reset`。

### 抽屉/弹窗表单模板

```typescript
/** 抽屉或弹窗内的编辑表单 Schema。 */
const formSchema: ISchema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'horizontal', labelWidth: 140, labelAlign: 'right' },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          'x-component-props': { maxColumns: 2, minColumns: 1, minWidth: 360, columnGap: 24, rowGap: 16 },
          properties: {
            orgName: {
              type: 'string',
              title: '机构名称',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-component-props': { placeholder: '请输入机构名称' },
            },
            remark: {
              type: 'string',
              title: '备注',
              'x-decorator': 'FormItem',
              'x-decorator-props': { gridSpan: 2 },
              'x-component': 'Input.TextArea',
              'x-component-props': { placeholder: '请输入备注', rows: 4 },
            },
          },
        },
      },
    },
  },
};
```

## 关联 skill

- 基础表单：`../formily-foundation/SKILL.md`
- 联动副作用：`../formily-linkage-effects/SKILL.md`
- 模式与详情插槽：`../formily-mode-slot-detail/SKILL.md`
- 分步流程：`../formily-step-flow/SKILL.md`
- 完整示例：`../formily-foundation/references/examples.md`

## 交付检查清单

- [ ] 使用 `YFormily`，模板名和 import 一致。
- [ ] 只使用文档和源码已公开的 Props/实例方法，未出现 `show-button-group`、`detail-as` 等旧式或虚构 API。
- [ ] 未生成旧式详情开关 prop。
- [ ] 未导入业务层 `@formily/antdv` UI 组件。
- [ ] Schema 层级完整：`FormLayout -> FormGrid -> 字段`，`Submit.onSubmit` 可触发校验。
- [ ] 所有横向表单已设置固定 `labelWidth` 和 `labelAlign: 'right'`。
- [ ] `FormGrid` 保持响应式，未用 `minColumns: maxColumns` 固定列数。
- [ ] 业务列表查询区的查询/重置按钮在外部 `.xxx__search-actions`，按钮行独占下一行并右对齐；缩窄后不会贴在第一行字段旁。
- [ ] 抽屉/弹窗表单 label 宽度统一、右对齐，窄屏可响应式换列，长字段已占满整行。
- [ ] 复杂联动已选择表达式、`x-reactions`、`scope` 或 `effects` 中合适的一种。
- [ ] API 失败仅由 `mutator.ts` 统一提示，hook 的 `else`/`catch` 未重复 `message.error`。

## 失败兜底策略

- 字段不显示时，先检查 `FormLayout -> FormGrid -> 字段` 层级。
- 提交不触发时，先检查 `Submit.x-component-props.onSubmit` 或外部 `formRef.submit()`。
- 查看态显示异常时，先检查 `mode=2`、`detail-options` 和 `detail-<path>` 插槽命名。
- API 调用被 reject 时，让错误继续中断当前流程；只在 `finally` 恢复 loading，不在业务 hook 重复提示。
