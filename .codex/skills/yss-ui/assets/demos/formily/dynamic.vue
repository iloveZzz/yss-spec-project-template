<template>
  <div>
    <YssFormily :schema="schema" :initial-values="{ userType: 'personal' }" />
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
            userType: {
              type: 'string',
              title: '用户类型',
              'x-decorator': 'FormItem',
              'x-component': 'Radio.Group',
              enum: [
                { label: '个人', value: 'personal' },
                { label: '企业', value: 'company' },
              ],
            },
            name: {
              type: 'string',
              title: '姓名',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-visible': "{{ $values.userType === 'personal' }}",
            },
            companyName: {
              type: 'string',
              title: '公司名称',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-visible': "{{ $values.userType === 'company' }}",
            },
            taxNumber: {
              type: 'string',
              title: '税号',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-visible': "{{ $values.userType === 'company' }}",
            },
          },
        },
      },
    },
  },
};
</script>
