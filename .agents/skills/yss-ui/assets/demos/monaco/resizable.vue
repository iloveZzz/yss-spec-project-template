<script setup lang="ts">
import { YMonaco } from '@yss-ui/components';
import { ref } from 'vue';

const code = ref<string>(`-- 拖动右下角可以改变编辑器宽高\nSELECT * FROM dual;`);
</script>

<template>
  <YMonaco
    v-model="code"
    language="sql"
    theme="vs"
    :height="260"
    :width="'100%'"
    :resizable="true"
    :resize-directions="['se', 'e', 's']"
    :min-width="360"
    :min-height="160"
  />
</template>

<style scoped></style>
