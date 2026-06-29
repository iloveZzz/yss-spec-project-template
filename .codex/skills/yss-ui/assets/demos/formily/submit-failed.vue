<template>
  <div>
    <YssFormily :schema="schema" :initial-values="{ email: '' }" :form="form" />
  </div>
</template>

<script setup lang="ts">
import { createForm, onFormSubmit, onFormSubmitFailed } from '@formily/core';
import { YssFormily, type ISchema } from '@yss-ui/components';
import { message } from 'ant-design-vue';

// 表单级副作用优先处理失败提示
const form = createForm({
  effects() {
    onFormSubmit((payload: any) => {
      console.log('submit:', payload?.values);
    });
    onFormSubmitFailed(() => {
      // 统一兜底：从表单反馈中提取首个错误
      const list: any[] = (form as any).queryFeedbacks?.({ type: 'error' }) || [];
      const first = list[0];
      message.error(first?.messages?.[0] || '提交失败，请检查表单信息');
    });
  },
});

const schema: ISchema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'horizontal', labelWidth: 90 },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          properties: {
            email: {
              type: 'string',
              title: '邮箱',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              required: true,
              'x-validator': [
                { required: true, message: '请输入邮箱' },
                { format: 'email', message: '邮箱格式不正确' },
              ],
            },
            actions: {
              type: 'void',
              'x-decorator': 'FormItem',
              'x-decorator-props': { gridSpan: 3, colon: false },
              'x-component': 'AutoButtonGroup',
              properties: {
                submit: {
                  type: 'void',
                  'x-component': 'Submit',
                  'x-content': '提交',
                  // 重要：@formily/antdv 的 Submit 只有在传入 onSubmit 时才会调用 form.submit()
                  'x-component-props': { onSubmit: '{{ () => {} }}' },
                },
                reset: { type: 'void', 'x-component': 'Reset', 'x-content': '重置' },
              },
            },
          },
        },
      },
    },
  },
};
</script>
