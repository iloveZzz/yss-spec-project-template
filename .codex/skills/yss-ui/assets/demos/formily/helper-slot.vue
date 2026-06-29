<template>
  <div>
    <YssFormily :schema="schema" :initial-values="{ username: '' }">
      <!-- 使用具名插槽 + schema 中的 Slot 组件进行桥接（kebab-case） -->
      <template #help-user>
        <span style="color: #999">用户名可包含字母、数字、下划线，长度 4~16</span>
      </template>
    </YssFormily>
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
            username: {
              type: 'string',
              title: '用户名',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              // 方式一：直接使用 FormItem 的 extra（更简单）
              'x-decorator-props': { extra: '用户名可包含字母、数字、下划线，长度 4~16' },
              // 方式二：通过自定义插槽（更灵活，可含复杂节点）
              // 注意：插槽字段不能放在该输入字段的 properties 内部；应作为并列的 void 字段渲染
            },
            usernameHelp: {
              type: 'void',
              'x-decorator': 'FormItem',
              'x-component': 'Slot',
              'x-component-props': { name: 'help-user', params: [] as string[] },
              'x-decorator-props': { gridSpan: 3, colon: false },
            },
          },
        },
      },
    },
  },
};
</script>
