<template>
  <div>
    <YssFormily :schema="schema" />
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
          // 关键：打开响应式能力
          // 'x-component-props': { maxColumns: 3, minColumns: 1, columnGap: 16, rowGap: 0, minWidth: 260 },
          properties: {
            firstName: {
              type: 'string',
              title: '名',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-decorator-props': { gridSpan: 1 },
            },
            lastName: {
              type: 'string',
              title: '姓',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-decorator-props': { gridSpan: 1 },
            },
            email: {
              type: 'string',
              title: '邮箱',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-decorator-props': { gridSpan: 2 },
            },
            address: {
              type: 'string',
              title: '地址',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-decorator-props': { gridSpan: 2 },
            },
            city: {
              type: 'string',
              title: '城市',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-decorator-props': { gridSpan: 1 },
            },
            zip: {
              type: 'string',
              title: '邮编',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-decorator-props': { gridSpan: 1 },
            },
          },
        },
      },
    },
  },
};
</script>
