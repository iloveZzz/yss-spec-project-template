<template>
  <div>
    <YssFormily :schema="schema" :initial-values="{ name: '', age: 18, gender: 'male', status: true }" />
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
          'x-component-props': { maxColumns: 3, minColumns: 1, columnGap: 16, rowGap: 0, minWidth: 260 },
          properties: {
            name: {
              type: 'string',
              title: '姓名',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-decorator-props': { gridSpan: 1 },
              'x-component-props': { placeholder: '请输入姓名' },
              'x-disabled': "{{ $values.gender === 'female' }}",
            },
            age: {
              type: 'number',
              title: '年龄',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-decorator-props': { gridSpan: 1 },
              'x-disabled': '{{ $values.status === false }}',
            },
            gender: {
              type: 'string',
              title: '性别',
              'x-decorator': 'FormItem',
              'x-component': 'Radio.Group',
              'x-decorator-props': { gridSpan: 1 },
              enum: [
                { label: '男', value: 'male' },
                { label: '女', value: 'female' },
              ],
            },
            address: {
              type: 'string',
              title: '地址',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-decorator-props': { gridSpan: 2 },
              'x-component-props': { placeholder: '请输入地址', disabled: true },
            },
            status: {
              type: 'boolean',
              title: '状态',
              'x-decorator': 'FormItem',
              'x-component': 'Switch',
              'x-decorator-props': { gridSpan: 1 },
            },
          },
        },
      },
    },
  },
};
</script>
