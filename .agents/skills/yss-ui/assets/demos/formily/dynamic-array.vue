<template>
  <div>
    <YssFormily :schema="schema" :initial-values="{ list: [{ name: '张三', role: 'admin' }] }" />
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
        list: {
          type: 'array',
          title: '成员列表',
          'x-decorator': 'FormItem',
          'x-component': 'ArrayItems',
          // 每项使用响应式 FormGrid 布局：序号 + 两列字段 + 操作
          items: {
            type: 'object',
            properties: {
              row: {
                type: 'void',
                'x-component': 'FormGrid',
                'x-component-props': { maxColumns: 3, minWidth: 260 },
                properties: {
                  name: {
                    type: 'string',
                    title: '姓名',
                    'x-decorator': 'FormItem',
                    'x-component': 'Input',
                    'x-validator': [{ required: true, message: '请输入姓名' }],
                  },
                  role: {
                    type: 'string',
                    title: '角色',
                    'x-decorator': 'FormItem',
                    'x-component': 'Select',
                    enum: [
                      { label: '管理员', value: 'admin' },
                      { label: '成员', value: 'member' },
                    ],
                  },
                  remove: {
                    type: 'void',
                    'x-decorator': 'FormItem',
                    'x-decorator-props': { colon: false, label: ' ' },
                    'x-component': 'ArrayItems.Remove',
                    'x-component-props': {
                      title: '',
                      type: 'text',
                      danger: true,
                      shape: 'circle',
                      icon: 'DeleteOutlined',
                    },
                  },
                },
              },
            },
          },
          properties: {
            add: { type: 'void', 'x-component': 'ArrayItems.Addition', 'x-component-props': { title: '新增成员' } },
          },
        },
      },
    },
  },
};
</script>
