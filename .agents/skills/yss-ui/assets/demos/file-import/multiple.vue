<template>
  <div>
    <YButton @click="visible = true">多文件导入</YButton>
    <YFileImport
      v-model:model-value="visible"
      title="多文件导入"
      :multiple="true"
      :file-type-list="['csv']"
      :import-result="{ successkey: '1', failkey: '0', success: 10, fail: 2, total: 12 }"
      @final-import="finalImport"
      @export-error-data="exportErrorData"
    >
      <template #footerRight>
        <span style="color: rgb(0 0 0 / 45%); margin-left: 8px">示例：仅允许 .csv</span>
      </template>
    </YFileImport>
  </div>
</template>

<script setup lang="ts">
import { YButton, YFileImport } from '@yss-ui/components';
import { ref } from 'vue';

const visible = ref(false);

async function finalImport() {
  (window as any).$message?.success?.('导入成功');
  visible.value = false;
}
async function exportErrorData() {
  (window as any).$message?.success?.('下载成功');
}
</script>
