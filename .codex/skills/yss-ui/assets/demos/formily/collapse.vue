<template>
  <div>
    <div style="margin-bottom: 12px">
      <RadioGroup v-model:value="mode">
        <RadioButton :value="0">新增</RadioButton>
        <RadioButton :value="2">查看</RadioButton>
      </RadioGroup>
    </div>
    <YssFormily
      ref="formRef"
      :schema="schema"
      :mode="mode"
      :grid-defaults="{ maxColumns: 3 }"
      :initial-values="initialValues"
    />
  </div>
</template>

<script setup lang="ts">
import { YssFormily, type ISchema } from '@yss-ui/components';
import { RadioButton, RadioGroup } from 'ant-design-vue';
import { onMounted, ref } from 'vue';

const mode = ref(0);
const initialValues = ref({});
const formRef = ref<any>();

onMounted(() => {
  formRef.value?.setValues({
    name: '张三',
    age: 20,
    email: 'zhangsan@example.com',
    company: '蚂蚁金服',
    position: '前端工程师',
    address: '杭州市',
  });
});
/* 
    也可以通过 内核创建form实例，然后设置初始值
    import { createForm } from '@formily/core';
    import { onMounted } from 'vue';

    const form = createForm();
    onMounted(async () => {
      const data = await fetchUser();
      form.setValues(data);
    });

    <template>
        <YssFormily :schema="schema" :form="form" />
    </template>
*/

const schema: ISchema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'horizontal', labelWidth: 90 },
      properties: {
        collapse: {
          type: 'void',
          'x-component': 'FormCollapse',
          properties: {
            panel1: {
              type: 'void',
              'x-component': 'FormCollapse.CollapsePanel',
              'x-component-props': { header: '基本信息' },
              properties: {
                grid1: {
                  type: 'void',
                  'x-component': 'FormGrid',
                  properties: {
                    name: { type: 'string', title: '姓名', 'x-decorator': 'FormItem', 'x-component': 'Input' },
                    age: { type: 'number', title: '年龄', 'x-decorator': 'FormItem', 'x-component': 'Input' },
                    email: { type: 'string', title: '邮箱', 'x-decorator': 'FormItem', 'x-component': 'Input' },
                  },
                },
              },
            },
            panel2: {
              type: 'void',
              'x-component': 'FormCollapse.CollapsePanel',
              'x-component-props': { header: '工作信息' },
              properties: {
                grid2: {
                  type: 'void',
                  'x-component': 'FormGrid',
                  properties: {
                    company: { type: 'string', title: '公司', 'x-decorator': 'FormItem', 'x-component': 'Input' },
                    position: { type: 'string', title: '职位', 'x-decorator': 'FormItem', 'x-component': 'Input' },
                    address: { type: 'string', title: '工作地址', 'x-decorator': 'FormItem', 'x-component': 'Input' },
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
