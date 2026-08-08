<script setup lang="ts">
import { YButton, YMonaco } from '@yss-ui/components';
import { ref } from 'vue';

const readonly = ref<boolean>(true);
const code = ref<string>(`SELECT *\nFROM users\nWHERE status = 'active';\n`);

function toggle() {
  readonly.value = !readonly.value;
}
</script>

<template>
  <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px">
    <YButton size="small" @click="toggle">切换只读：{{ readonly ? '开' : '关' }}</YButton>
  </div>
  <YMonaco v-model="code" language="sql" :readonly="readonly" />
</template>

<style scoped></style>
