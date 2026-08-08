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
          // 'x-component-props': { maxColumns: 3, minColumns: 1, columnGap: 16, rowGap: 0, minWidth: 260 },
          properties: {
            name: {
              type: 'string',
              title: '姓名',
              'x-decorator': 'FormItem',
              'x-decorator-props': { tooltip: '请输入您的真实姓名' },
              'x-component': 'Input',
            },
            idCard: {
              type: 'string',
              title: '身份证号',
              'x-decorator': 'FormItem',
              'x-decorator-props': { tooltip: '请输入18位身份证号码' },
              'x-component': 'Input',
            },
          },
        },
      },
    },
  },
};
</script>
