<template>
  <div>
    <YssFormily :schema="schema" :initial-values="initial" :scope="{ formStep, goNext, goBack, onSubmit }" />
  </div>
</template>

<script setup lang="ts">
import { FormStep } from '@formily/antdv';
import { YssFormily, type ISchema } from '@yss-ui/components';

const initial = { base: { name: '', gender: 'male' }, contact: { phone: '', email: '' } };

// 创建并通过 scope 注入 formStep 实例，统一由它来前进/后退
const formStep = FormStep.createFormStep();

const goNext = async () => formStep?.next?.();

const goBack = () => formStep?.back?.();

const onSubmit = (values: any) => {
  console.log('steps submit:', values);
};

const schema: ISchema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'horizontal', labelWidth: 90 },
      properties: {
        stepper: {
          type: 'void',
          'x-component': 'FormStep',
          // 直接透传已创建的 formStep 实例
          'x-component-props': { formStep: '{{ formStep }}' },
          properties: {
            step1: {
              type: 'void',
              'x-component': 'FormStep.StepPane',
              'x-component-props': { title: '基础信息' },
              properties: {
                grid1: {
                  type: 'void',
                  'x-component': 'FormGrid',
                  properties: {
                    'base.name': {
                      type: 'string',
                      title: '姓名',
                      'x-decorator': 'FormItem',
                      'x-component': 'Input',
                      'x-validator': [{ required: true, message: '请输入姓名' }],
                    },
                    'base.gender': {
                      type: 'string',
                      title: '性别',
                      'x-decorator': 'FormItem',
                      'x-component': 'Radio.Group',
                      enum: [
                        { label: '男', value: 'male' },
                        { label: '女', value: 'female' },
                      ],
                      'x-validator': [{ required: true, message: '请选择性别' }],
                    },
                    next: {
                      type: 'void',
                      'x-decorator': 'FormItem',
                      'x-decorator-props': { gridSpan: 3, colon: false },
                      'x-component': 'AutoButtonGroup',
                      properties: {
                        // Submit 会先进行校验，通过后再触发 onSubmit → 下一步
                        toNext: {
                          type: 'void',
                          'x-component': 'Submit',
                          'x-content': '下一步',
                          'x-component-props': { onSubmit: '{{ goNext }}' },
                        },
                      },
                    },
                  },
                },
              },
            },
            step2: {
              type: 'void',
              'x-component': 'FormStep.StepPane',
              'x-component-props': { title: '联系信息' },
              properties: {
                grid2: {
                  type: 'void',
                  'x-component': 'FormGrid',
                  properties: {
                    'contact.phone': {
                      type: 'string',
                      title: '电话',
                      'x-decorator': 'FormItem',
                      'x-component': 'Input',
                    },
                    'contact.email': {
                      type: 'string',
                      title: '邮箱',
                      'x-decorator': 'FormItem',
                      'x-component': 'Input',
                    },
                    actions: {
                      type: 'void',
                      'x-decorator': 'FormItem',
                      'x-decorator-props': { gridSpan: 3, colon: false },
                      'x-component': 'AutoButtonGroup',
                      properties: {
                        back: {
                          type: 'void',
                          'x-component': 'Reset',
                          'x-content': '上一步',
                          'x-component-props': { onClick: '{{ goBack }}' },
                        },
                        submit: {
                          type: 'void',
                          'x-component': 'Submit',
                          'x-content': '提交',
                          'x-component-props': { onSubmit: '{{ onSubmit }}' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
</script>
