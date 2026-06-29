<template>
  <div>
    <YssFormily :schema="schema" :initial-values="{ alignMode: 'right' }" />
  </div>
</template>
<script setup lang="ts">
import { YssFormily, type ISchema } from '@yss-ui/components';

const baseFields = {
  name: { type: 'string', title: '姓名', 'x-decorator': 'FormItem', 'x-component': 'Input' },
  email: { type: 'string', title: '邮箱', 'x-decorator': 'FormItem', 'x-component': 'Input' },
  phone: { type: 'string', title: '电话', 'x-decorator': 'FormItem', 'x-component': 'Input' },
};

const grid = (properties: any) => ({
  type: 'void',
  'x-component': 'FormGrid',
  // 响应式三列：窄屏降级两列/一列
  // 'x-component-props': { maxColumns: 3, minColumns: 1, columnGap: 16, rowGap: 0, minWidth: 260 },
  properties,
});

const schema: ISchema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'horizontal', labelAlign: 'left', labelWidth: 90 },
      // 用一个开关（单选）切换三种对齐模式：left/right/vertical
      'x-reactions': (field: any) => {
        const m = field.form.values.alignMode;
        field.componentProps =
          m === 'vertical' ? { layout: 'vertical' } : { layout: 'horizontal', labelAlign: m || 'left', labelWidth: 90 };
      },
      properties: {
        alignMode: {
          type: 'string',
          title: '对齐方式',
          'x-decorator': 'FormItem',
          'x-component': 'Radio.Group',
          enum: [
            { label: '左', value: 'left' },
            { label: '右', value: 'right' },
            { label: '上', value: 'vertical' },
          ],
          'x-component-props': {
            optionType: 'button',
          },
        },
        grid: grid(baseFields),
      },
    },
  },
};
</script>
