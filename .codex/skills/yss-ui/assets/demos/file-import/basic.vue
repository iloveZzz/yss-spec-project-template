<template>
  <div>
    <YButton type="primary" @click="visible = true">导入</YButton>
    <YFileImport
      v-model:model-value="visible"
      :loadings="loadings"
      :file-type-list="['xls', 'xlsx', 'csv']"
      @final-import="finalImport"
      @download-template="downloadTemplate"
      @export-error-data="exportErrorData"
      @next-step="nextStep"
    />
  </div>
</template>

<script setup lang="ts">
import { YButton, YFileImport } from '@yss-ui/components';
import { ref } from 'vue';

const visible = ref(false);
const loadings = ref<string[]>([]);

function show(name: string) {
  loadings.value = [...loadings.value, name];
}
function hide(name: string) {
  loadings.value = loadings.value.filter(n => n !== name);
}
async function mockAsync(name: string) {
  try {
    show(name);
    await new Promise(r => setTimeout(r, 800));
  } finally {
    hide(name);
  }
}

async function finalImport({ loadingName, close }: any) {
  await mockAsync(loadingName);
  (window as any).$message?.success?.('导入成功');
  close();
}
async function downloadTemplate({ loadingName }: any) {
  await mockAsync(loadingName);
  (window as any).$message?.success?.('下载成功');
}
async function exportErrorData({ loadingName }: any) {
  await mockAsync(loadingName);
  (window as any).$message?.success?.('下载成功');
}
function nextStep() {
  // 这里可做额外校验或预检接口
}
</script>
