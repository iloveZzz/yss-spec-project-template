<template>
  <div>
    <YssFormily
      :schema="schema"
      :initial-values="{ country: 'CN', level: 1, vip: false }"
      :scope="{ onCountryChange, onLevelChange }"
      :form="form"
    />
  </div>
  <!-- 以上保持不变 -->
</template>

<script setup lang="ts">
import type { Form } from '@formily/core';
import { createForm, onFieldValueChange } from '@formily/core';
import { YssFormily, type ISchema } from '@yss-ui/components';

// 作用域方法：就近处理本字段联动
// 注意：不再通过事件参数传入 form，直接使用外层 createForm 的实例，避免作用域参数 ctx 不存在导致失效
const onCountryChange = (val: string) => {
  // 仅示意：CN/US 两套城市
  const cityOptions =
    val === 'US'
      ? [
          { label: 'New York', value: 'NY' },
          { label: 'Los Angeles', value: 'LA' },
        ]
      : [
          { label: '北京', value: 'BJ' },
          { label: '上海', value: 'SH' },
        ];
  form.setFieldState('city', (state: any) => {
    state.dataSource = cityOptions;
    state.value = undefined;
  });
};

const onLevelChange = (val: number) => {
  form.setFieldState('quota', (state: any) => {
    state.value = val >= 3 ? 1000 : 100;
  });
};

// 表单级副作用：综合多依赖（country、vip、level）影响 city/quota 的可用性
// 提前设置初始值，避免在传入外部 form 时 :initialValues 不生效的情况
const form: Form = createForm({
  values: { country: 'CN', level: 1, vip: false },
  effects() {
    onFieldValueChange(['country', 'vip', 'level'] as any, field => {
      const values: any = (field as any).form?.values || {};
      const { country, vip, level } = values;
      // 例：VIP 且 level 高时允许更多城市
      field.form.setFieldState('city', s => {
        s.disabled = !vip && level < 2;
      });
      // 例：US 且 level>=2 时配额上限更高（仅展示状态联动）
      field.form.setFieldState('quota', s => {
        s.disabled = !(country === 'US' && level >= 2);
      });
    });
  },
});

// 初始化城市下拉数据（根据初始国家）
onCountryChange(form.values?.country);

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
            country: {
              type: 'string',
              title: '国家',
              'x-decorator': 'FormItem',
              'x-component': 'Select',
              enum: [
                { label: '中国', value: 'CN' },
                { label: '美国', value: 'US' },
              ],
              // 直接调用作用域方法，避免依赖不存在的 ctx.form
              'x-component-props': { onChange: '{{ (val) => onCountryChange(val) }}' },
            },
            city: {
              type: 'string',
              title: '城市',
              'x-decorator': 'FormItem',
              'x-component': 'Select',
            },
            level: {
              type: 'number',
              title: '等级',
              'x-decorator': 'FormItem',
              'x-component': 'Select',
              enum: [
                { label: '1', value: 1 },
                { label: '2', value: 2 },
                { label: '3', value: 3 },
              ],
              'x-component-props': { onChange: '{{ (val) => onLevelChange(val) }}' },
            },
            vip: {
              type: 'boolean',
              title: 'VIP',
              'x-decorator': 'FormItem',
              'x-component': 'Switch',
            },
            quota: {
              type: 'number',
              title: '配额',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
            },
          },
        },
      },
    },
  },
};
</script>
