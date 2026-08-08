<template>
  <div>
    <YssFormily :schema="schema" :form="form" />
  </div>
</template>

<script setup lang="ts">
import type { DataField, Form, IFieldState } from '@formily/core';
import { createForm, onFieldInit, onFieldValueChange } from '@formily/core';
import { YssFormily, type ISchema } from '@yss-ui/components';

//建议 更简洁方式：直接用表达式控制显隐，初始化与联动都会生效。
// name: { ..., 'x-visible': "{{ $values.userType === 'personal' }}" }
// companyName: { ..., 'x-visible': "{{ $values.userType === 'company' }}" }

const syncUserType = (form: Form, val: string) => {
  const isCompany = val === 'company';
  form.setFieldState('name', (s: IFieldState) => {
    s.visible = !isCompany;
    if (isCompany) s.value = '';
  });
  form.setFieldState('companyName', (s: IFieldState) => {
    s.visible = isCompany;
    if (!isCompany) s.value = '';
  });
};

const form = createForm<object>({
  values: { userType: 'personal', status: true },
  effects() {
    // 首屏生效
    onFieldInit('userType', f => syncUserType(f.form, (f as DataField).value as string));
    // 变更生效
    onFieldValueChange('userType', f => syncUserType(f.form, f.value));

    // 同理，若希望 status 初始就控制 age 的可用性，也补一条：
    onFieldInit('status', f =>
      f.form.setFieldState('age', (s: IFieldState) => {
        s.disabled = (f as DataField).value === false;
      })
    );
    onFieldValueChange('status', f =>
      f.form.setFieldState('age', (s: IFieldState) => {
        s.disabled = f.value === false;
      })
    );
  },
});

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
            userType: {
              type: 'string',
              title: '用户类型',
              'x-decorator': 'FormItem',
              'x-component': 'Radio.Group',
              enum: [
                { label: '个人', value: 'personal' },
                { label: '企业', value: 'company' },
              ],
              'x-decorator-props': { gridSpan: 1 },
            },
            name: {
              type: 'string',
              title: '姓名',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-decorator-props': { gridSpan: 2 },
            },
            companyName: {
              type: 'string',
              title: '公司名称',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-decorator-props': { gridSpan: 2 },
            },
            age: {
              type: 'number',
              title: '年龄',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-decorator-props': { gridSpan: 1 },
            },
            status: {
              type: 'boolean',
              title: '状态',
              'x-decorator': 'FormItem',
              'x-component': 'Switch',
              'x-decorator-props': { gridSpan: 1 },
            },
            actions: {
              type: 'void',
              'x-decorator': 'FormItem',
              'x-decorator-props': { gridSpan: 1, colon: false },
              'x-component': 'AutoButtonGroup',
              properties: {
                submit: { type: 'void', 'x-component': 'Submit', 'x-content': '提交' },
                reset: { type: 'void', 'x-component': 'Reset', 'x-content': '重置' },
              },
            },
          },
        },
      },
    },
  },
};
</script>
