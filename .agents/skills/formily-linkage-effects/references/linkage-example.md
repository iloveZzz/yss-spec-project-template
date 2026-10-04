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
