<template>
  <div>
    <YssFormily ref="formRef" :schema="schema" />
  </div>
</template>
<script setup lang="ts">
import { YssFormily, type ISchema } from '@yss-ui/components';
import { ref } from 'vue';

const formRef = ref();

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
          // 'x-component-props': { maxColumns: 3, minColumns: 3, columnGap: 16, rowGap: 0 },
          properties: {
            name: {
              type: 'string',
              title: '姓名',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-decorator-props': { gridSpan: 1 },
            },
            email: {
              type: 'string',
              title: '邮箱',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-decorator-props': { gridSpan: 1 },
            },
            phone: {
              type: 'string',
              title: '电话',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-decorator-props': { gridSpan: 1 },
            },
            actions: {
              type: 'void',
              'x-component': 'AutoButtonGroup',
              'x-decorator-props': { gridSpan: 3 },
              properties: {
                submit: { type: 'void', 'x-component': 'Submit', 'x-content': '提交' },
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
