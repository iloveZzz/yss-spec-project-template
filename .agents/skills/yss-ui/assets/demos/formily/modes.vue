<template>
  <div>
    <div style="margin-bottom: 12px">
      <RadioGroup v-model:value="mode">
        <RadioButton :value="0">新增</RadioButton>
        <RadioButton :value="1">编辑</RadioButton>
        <RadioButton :value="2">查看</RadioButton>
      </RadioGroup>
    </div>
    <YssFormily
      :key="mode"
      :schema="schema"
      :initial-values="initialValues"
      :mode="mode"
      detail-as="descriptions"
      :detail-options="{ columns: 3, bordered: true }"
    />
  </div>
</template>
<script setup lang="ts">
import { YssFormily, type ISchema } from '@yss-ui/components';
import { RadioButton, RadioGroup } from 'ant-design-vue';
import { computed, ref } from 'vue';

const mode = ref(0);
const initial = { name: '张三', age: 28, gender: 'male', desc: '这是一段描述', date: '2024-06-15' };
// 新增默认值（例如性别默认选中“男”）
const createDefaults = { gender: 'male' };

// 新增: 使用 createDefaults；编辑/查看: 使用反显数据
const initialValues = computed(() => (mode.value === 0 ? createDefaults : initial));

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
            name: { type: 'string', title: '姓名', 'x-decorator': 'FormItem', required: true, 'x-component': 'Input' },
            age: { type: 'number', title: '年龄', 'x-decorator': 'FormItem', 'x-component': 'Input' },
            gender: {
              type: 'string',
              title: '性别',
              'x-decorator': 'FormItem',
              'x-component': 'Radio.Group',
              enum: [
                { label: '男', value: 'male' },
                { label: '女', value: 'female' },
              ],
            },
            date: { type: 'string', title: '日期', 'x-decorator': 'FormItem', 'x-component': 'DatePicker' },
            desc: {
              type: 'string',
              title: '描述',
              'x-decorator': 'FormItem',
              'x-component': 'Input.TextArea',
              'x-component-props': { rows: 2 },
            },
          },
        },
      },
    },
  },
};
</script>
