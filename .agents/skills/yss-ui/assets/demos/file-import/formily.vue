<template>
  <div>
    <YssFormily :schema="schema" :scope="{ open }" />
    <YFileImport v-model:model-value="visible" @final-import="finalImport" />
  </div>
</template>

<script setup lang="ts">
import { YFileImport, YssFormily } from '@yss-ui/components';
import { ref } from 'vue';

const visible = ref(false);
const schema = {
  type: 'object',
  properties: {
    actions: {
      type: 'void',
      'x-component': 'AutoButtonGroup',
      'x-component-props': { align: 'left' },
      properties: {
        importBtn: {
          type: 'void',
          'x-component': 'YButton',
          'x-content': '导入',
          'x-component-props': {
            type: 'primary',
            onClick: '{{ open }}',
          },
        },
      },
    },
  },
};

function open() {
  visible.value = true;
}
function finalImport({ close }: any) {
  (window as any).$message?.success?.('导入成功');
  close();
}
</script>
