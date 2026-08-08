<script setup lang="ts">
import { YButton, YMonaco, YssFormily } from '@yss-ui/components';
import { ref } from 'vue';

const formRef = ref<any>();

const initialValues = {
  code: 'SELECT 1 AS id;',
};

const schema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'vertical', labelWidth: 90 },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          'x-component-props': { maxColumns: 1, minColumns: 1 },
          properties: {
            code: {
              type: 'string',
              title: 'SQL',
              'x-decorator': 'FormItem',
              // 使用插槽承载自定义编辑器，与 field.value/field.setValue 联动
              'x-component': 'Slot',
              'x-component-props': { name: 'monacoSlot', params: ['field'] },
              'x-decorator-props': { gridSpan: 1 },
            },
          },
        },
      },
    },
  },
} as const;

const onGet = (): void => {
  const values = formRef.value?.getValues?.();
  // eslint-disable-next-line no-console
  console.log('[Formily + YMonaco] 当前 code 值:', values?.code);
};

const sampleSQL = 'SELECT *\nFROM demo_table\nWHERE status = 1;';
const onSet = (): void => {
  formRef.value?.setValues?.({ code: sampleSQL });
};
</script>

<template>
  <div>
    <YssFormily ref="formRef" :schema="schema" :initial-values="initialValues">
      <template #monacoSlot="{ field }">
        <YMonaco v-model="field.value" language="sql" height="360px" />
      </template>
    </YssFormily>
    <div style="margin-top: 12px; display: flex; justify-content: flex-end">
      <YButton theme="primary" type="primary" @click="onGet">获取值</YButton>
      <YButton style="margin-left: 8px" @click="onSet">设置示例 SQL</YButton>
    </div>
  </div>
</template>

<style scoped></style>
