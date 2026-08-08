<template>
  <div>
    <YssFormily
      ref="formRef"
      :schema="schema"
      :initial-values="{ name: '', desc: '', status: true, age: 18 }"
      :scope="{ onNameUpdate, onStatusChange, onSubmit }"
    />
  </div>
</template>

<script setup lang="ts">
import { YssFormily, type ISchema } from '@yss-ui/components';
import { ref } from 'vue';

const formRef = ref<any>();

const onNameUpdate = (val: string) => {
  console.log('name via scope:', val);
  // 跨字段：实时回填描述
  formRef.value?.setFieldState('desc', (state: any) => {
    state.value = val ? `你好，${val}` : '';
  });
};

const onStatusChange = (checked: boolean) => {
  console.log('status via scope:', checked);
  // 跨字段：根据开关禁用/启用年龄
  formRef.value?.setFieldState('age', (state: any) => {
    state.disabled = !checked;
  });
};

const onSubmit = (values: any) => {
  console.log('submit via scope:', values);
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
              'x-component-props': {
                'onUpdate:value': '{{ onNameUpdate }}',
              },
            },
            desc: {
              type: 'string',
              title: '描述',
              'x-decorator': 'FormItem',
              'x-component': 'Input.TextArea',
              'x-component-props': { rows: 2 },
              'x-decorator-props': { gridSpan: 2 },
            },
            age: {
              type: 'number',
              title: '年龄',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
            },
            status: {
              type: 'boolean',
              title: '状态',
              'x-decorator': 'FormItem',
              'x-component': 'Switch',
              'x-component-props': { onChange: '{{ onStatusChange }}' },
            },
            actions: {
              type: 'void',
              'x-decorator': 'FormItem',
              'x-decorator-props': { gridSpan: 3, colon: false },
              'x-component': 'AutoButtonGroup',
              properties: {
                submit: {
                  type: 'void',
                  'x-component': 'Submit',
                  'x-content': '提交',
                  'x-component-props': { onSubmit: '{{ onSubmit }}' },
                },
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
