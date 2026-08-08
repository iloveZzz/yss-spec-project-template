<template>
  <div>
    <div style="margin-bottom: 12px">
      <RadioGroup v-model:value="mode">
        <RadioButton :value="0">新增</RadioButton>
        <RadioButton :value="2">查看</RadioButton>
      </RadioGroup>
    </div>
    <YssFormily :schema="schema" :mode="mode" :grid-defaults="{ maxColumns: 2 }" :initial-values="initialValues">
      <!-- 只读描述视图自定义插槽：字段 path 为 email => #detail-email -->
      <template #detail-email="{ value }">
        <template v-if="Array.isArray(value) && value.length">
          <Tag v-for="(v, i) in value" :key="i" color="blue" style="margin-right: 4px">{{ v }}</Tag>
        </template>
        <template v-else>
          <span>-</span>
        </template>
      </template>
    </YssFormily>
  </div>
</template>
<script setup lang="ts">
import { YssFormily, type ISchema } from '@yss-ui/components';
import { RadioButton, RadioGroup, Tag } from 'ant-design-vue';
import { ref } from 'vue';

const mode = ref(0);
const initialValues = {
  name: '张三',
  age: 28,
  email: ['a@example.com', 'b@example.com'],
  email1: ['a@example.com', 'b@example.com'],
  company: 'YSS',
  position: 'FE',
  address: '杭州市西湖区',
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
          // 'x-component-props': { columnGap: 0 }, 等同于 :gridDefaults="{ columnGap: 0, rowGap: 0 }" 配置
          properties: {
            header1: {
              type: 'void',
              title: '基本信息基本信息基本信息',
              'x-decorator': 'FormItem',
              'x-decorator-props': { feedbackLayout: 'none', colon: false },
              'x-component': 'GroupHeader',
              'x-component-props': { description: '这是一段分组描述信息' },
            },
            name: { type: 'string', title: '姓名', 'x-decorator': 'FormItem', 'x-component': 'Input' },
            age: { type: 'number', title: '年龄', 'x-decorator': 'FormItem', 'x-component': 'Input' },
            email1: {
              type: 'array',
              title: '邮箱',
              'x-decorator': 'FormItem',
              'x-component': 'Select',
              enum: [
                { label: 'a@example.com', value: 'a@example.com' },
                { label: 'b@example.com', value: 'b@example.com' },
                { label: 'c@example.com', value: 'c@example.com' },
              ],
              'x-component-props': { mode: 'multiple', placeholder: '请选择邮箱' },
            },
            // 新增/编辑时可为下拉多选（这里为演示，仍用 Input 占位）
            email: {
              type: 'array',
              title: '插槽',
              'x-decorator': 'FormItem',
              'x-component': 'Select',
              enum: [
                { label: 'a@example.com', value: 'a@example.com' },
                { label: 'b@example.com', value: 'b@example.com' },
                { label: 'c@example.com', value: 'c@example.com' },
              ],
              'x-component-props': { mode: 'multiple', placeholder: '请选择邮箱' },
            },

            header2: {
              type: 'void',
              title: '工作信息',
              'x-decorator': 'FormItem',
              'x-decorator-props': { feedbackLayout: 'none', colon: false },
              'x-component': 'GroupHeader',
            },
            company: { type: 'string', title: '公司', 'x-decorator': 'FormItem', 'x-component': 'Input' },
            position: { type: 'string', title: '职位', 'x-decorator': 'FormItem', 'x-component': 'Input' },
            address: { type: 'string', title: '工作地址', 'x-decorator': 'FormItem', 'x-component': 'Input' },
          },
        },
      },
    },
  },
};
</script>
