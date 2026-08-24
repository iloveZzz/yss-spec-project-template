---
name: formily-linkage-effects
description: 指导 YFormily 字段联动与表单级副作用；当实现动态显隐、禁用、级联选项、scope 事件、x-reactions、effects、异步联动或客户端校验失败兜底时使用。
---

# Formily Linkage Effects Skill

## 触发条件

- 需要字段联动（A 影响 B）、动态显隐/禁用、级联下拉。
- 需要 `scope`、`x-reactions` 或 `createForm + effects`。
- 需要处理异步选项竞态、旧值清理或 Formily 校验失败反馈。

## 不适用场景

- 纯基础字段与提交：使用 `../formily-foundation/SKILL.md`。
- 详情态渲染和 mode 切换：使用 `../formily-mode-slot-detail/SKILL.md`。
- 分步流程：使用 `../formily-step-flow/SKILL.md`。

## 文档检索

1. 当前会话可用 yss-ui MCP 时，先用 `get_component_docs` 查询 `YFormily` 的 `scope`/Schema/表单实例边界；实现字段联动、多字段反应或 effects 时，再用 `get_demo` 获取 `formily/linkage`、`formily/linkage-multi`、`formily/effects` 等官方 Demo。
2. MCP 查询未命中时先用 `search_docs/list_components` 校正名称；MCP 不可用、调用失败或校正后仍无结果时，才读取最新 `llms-full.txt`。若文档与当前项目依赖版本不一致，用当前源码和导出核验。

## 硬约束（禁止/必须）

- 按复杂度选择机制：表达式 < `x-reactions` < `scope` < `effects`，避免同一联动在多处重复实现。
- 仅显隐/禁用优先使用 `$values` 表达式；当前字段依赖其他字段时优先 `x-reactions`；跨字段事件用 `scope`；表单级监听才用 `effects`。
- `effects` 需要首屏即生效时，同时注册 `onFieldInit` 和 `onFieldValueChange`，禁止只监听变化导致初始状态错误。
- 修改其他字段状态时使用 `form.setFieldState`；级联选项变化后，只有旧值不在新选项中时才清空，避免初始化误删合法回填值。
- 异步联动必须处理空依赖、loading、请求竞态与卸载；旧请求不得覆盖新选择。
- 客户端校验提示使用 `onFormSubmitValidateFailed`。禁止在 `onFormSubmitFailed` 或 `Submit.onSubmitFailed` 中调用 `message.error`：Formily 会把 `onSubmit` 中的 API reject 也交给这些通用失败回调，导致与 `mutator.ts` 重复提示。
- Orval API 的网络/业务错误已由 `mutator.ts` 提示并 reject，业务 `else`/`catch` 禁止重复 `message.error`。
- 分步需求默认走 `formily-step-flow`，不在此 skill 中给 `FormStep` 默认方案。

## 标准代码骨架

```vue
<script setup lang="ts">
import type { DataField, Form, IFieldState } from '@formily/core';
import { createForm, onFieldInit, onFieldValueChange, onFormSubmitValidateFailed } from '@formily/core';
import { YFormily, type ISchema } from '@yss-ui/components';
import { message } from 'ant-design-vue';

/** 下拉选项。 */
interface OptionItem {
  label: string;
  value: string;
}

/** 根据省份返回城市选项。 */
const getCityOptions = (province?: string): OptionItem[] =>
  province === 'zhejiang'
    ? [{ label: '杭州', value: 'hangzhou' }]
    : province === 'jiangsu'
      ? [{ label: '南京', value: 'nanjing' }]
      : [];

/** 同步城市选项并清理已经失效的旧值。 */
const syncCity = (field: DataField) => {
  const options = getCityOptions(field.value as string | undefined);
  field.form.setFieldState('city', (state: IFieldState) => {
    state.dataSource = options;
    if (!options.some(item => item.value === state.value)) state.value = undefined;
  });
};

/** 外部 Form 实例，用于承载表单级 effects。 */
const form: Form = createForm({
  values: { province: 'zhejiang', city: 'hangzhou' },
  effects() {
    onFieldInit('province', field => syncCity(field as DataField));
    onFieldValueChange('province', field => syncCity(field as DataField));
    onFormSubmitValidateFailed(() => {
      const feedbacks = form.queryFeedbacks({ type: 'error' });
      message.error(feedbacks[0]?.messages?.[0] ?? '请检查表单');
    });
  },
});

/** 表单保存回调 Props。 */
interface SaveFormProps {
  onSave: (values: Record<string, any>) => Promise<void>;
}

/** 表单保存回调。 */
const props = defineProps<SaveFormProps>();

/** 校验通过后提交；API 错误由 mutator 统一提示。 */
const onSubmit = (values: Record<string, any>) => {
  return props.onSave(values);
};

/** 级联表单 Schema。 */
const schema: ISchema = {
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
          'x-component-props': { maxColumns: 2, minColumns: 1, minWidth: 320 },
          properties: {
            province: {
              type: 'string',
              title: '省份',
              required: true,
              enum: [
                { label: '浙江', value: 'zhejiang' },
                { label: '江苏', value: 'jiangsu' },
              ],
              'x-decorator': 'FormItem',
              'x-component': 'Select',
            },
            city: {
              type: 'string',
              title: '城市',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Select',
            },
            actions: {
              type: 'void',
              'x-decorator': 'FormItem',
              'x-decorator-props': { gridSpan: 2, colon: false },
              'x-component': 'AutoButtonGroup',
              properties: {
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
    },
  },
};
</script>

<template>
  <YFormily :schema="schema" :form="form" :scope="{ onSubmit }" />
</template>
```

## 交付检查清单

- [ ] 已说明为何选择表达式、`x-reactions`、`scope` 或 `effects`。
- [ ] 首屏需要联动时同时覆盖初始化与变更事件。
- [ ] 字段切换后旧值、选项和 loading 状态正确，异步请求有竞态保护。
- [ ] Formily 客户端校验提示集中在 `onFormSubmitValidateFailed`，未用通用 `onFormSubmitFailed`/`Submit.onSubmitFailed` 处理 API reject。
- [ ] API 错误只由 `mutator.ts` 提示，业务 `else`/`catch` 未重复 `message.error`。
- [ ] 无 DOM hack、无无意义 `setTimeout`，未把分步逻辑塞入本 skill。

## 失败兜底策略

- `x-reactions` 失效时先校验字段路径和实际 schema 层级，再决定是否升级为 `setFieldState`。
- 首屏状态错误时检查是否遗漏 `onFieldInit`；回填值丢失时检查是否无条件清空了级联字段。
- 异步结果乱序时使用请求序号或 `AbortController`，只接受最后一次请求结果。
- API 调用 reject 时只恢复 loading 或回滚局部状态，不重复弹出错误提示。
