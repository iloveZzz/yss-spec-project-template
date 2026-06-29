<template>
  <div>
    <YssFormily :schema="schema" :initial-values="{ name: '', gender: 'male', status: true }" />
  </div>
</template>

<script setup lang="ts">
import { YssFormily, type ISchema } from '@yss-ui/components';

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
            name: {
              type: 'string',
              title: '姓名',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-component-props': {
                // 更贴近 v-model 的输入事件
                'onUpdate:value': '{{ (val) => console.log("name update:", val) }}',
                // 选择/失焦时触发（依据 antdv 行为）
                '@change': '{{ (e) => console.log("name change:", e?.target?.value) }}',
              },
              'x-decorator-props': { gridSpan: 1 },
            },
            gender: {
              type: 'string',
              title: '性别',
              'x-decorator': 'FormItem',
              'x-component': 'Radio.Group',
              enum: [
                { label: '男', value: 'male' },
                { label: '女', value: 'female' },
              ],
              'x-component-props': {
                onChange: '{{ (e) => console.log("gender change:", e?.target?.value) }}',
              },
              'x-decorator-props': { gridSpan: 1 },
            },
            status: {
              type: 'boolean',
              title: '状态',
              'x-decorator': 'FormItem',
              'x-component': 'Switch',
              'x-component-props': {
                onChange: '{{ (checked) => console.log("status:", checked) }}',
              },
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
                  'x-component-props': {
                    onSubmit: '{{ (values) => console.log("submit values:", values) }}',
                  },
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
