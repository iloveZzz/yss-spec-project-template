<template>
  <div>
    <YssFormily :schema="schema" :initial-values="{ name: '', customField: '自定义值' }">
      <template #customField="{ values }">
        <div style="display: flex; align-items: center; gap: 8px">
          <span>自定义字段1: {{ values.customField }}</span>
          <YButton size="small" @click="handleCustomAction(values, 'customField')">操作</YButton>
        </div>
      </template>
    </YssFormily>
  </div>
</template>

<script setup lang="ts">
import { YButton, YssFormily, type ISchema } from '@yss-ui/components';

const handleCustomAction = (values: any, fieldName: string) => {
  alert(`操作: ${values[fieldName]}`);
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
            name: {
              type: 'string',
              title: '姓名',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-decorator-props': { gridSpan: 1 },
            },
            customField: {
              type: 'void',
              title: '插槽字段',
              'x-decorator': 'FormItem',
              'x-decorator-props': { gridSpan: 2 },
              'x-component': 'Slot',
              'x-component-props': { name: 'customField', params: ['field', '$values'] },
            },
          },
        },
      },
    },
  },
};
</script>
