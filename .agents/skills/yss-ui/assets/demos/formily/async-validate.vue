<template>
  <div>
    <YssFormily :schema="schema" :initial-values="{ username: '' }" :scope="{ asyncUsernameValidator, onSubmit }" />
  </div>
</template>

<script setup lang="ts">
import { YssFormily, type ISchema } from '@yss-ui/components';

// 作用域方法优先：异步校验用户名是否被占用
const asyncUsernameValidator = async (value: string) => {
  if (!value) return;
  await new Promise(r => setTimeout(r, 800));
  if (['admin', 'root', 'test'].includes((value || '').toLowerCase())) {
    return '该用户名已被占用';
  }
};

const onSubmit = (values: any) => {
  console.log('submit with values:', values);
};

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
            username: {
              type: 'string',
              title: '用户名',
              'x-decorator': 'FormItem',
              required: true,
              'x-component': 'Input',
              // 作用域方法作为异步校验器，触发时机为 onBlur（可根据需要调整）
              'x-validator': [
                { required: true, message: '请输入用户名' },
                { validator: '{{ asyncUsernameValidator }}', triggerType: 'onBlur' },
              ],
              'x-decorator-props': { gridSpan: 1 },
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
                  'x-component-props': { onSubmit: '{{ onSubmit }}' },
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
