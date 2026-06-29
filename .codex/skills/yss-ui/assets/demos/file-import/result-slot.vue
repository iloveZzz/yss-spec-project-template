<template>
  <div>
    <YButton type="primary" @click="visible = true">自定义结果插槽</YButton>
    <YFileImport v-model:model-value="visible" :import-result="resultInfo">
      <template #result="{ result }">
        <div style="padding: 8px 0">
          <strong>自定义结果：</strong>
          <span>总计 {{ result.total }} 行，其中成功 {{ result.success }} 行，失败 {{ result.fail }} 行</span>
        </div>
      </template>
      <template #footerLeft>
        <YButton size="small" theme="warning" @click="mockAdjust">刷新结果</YButton>
      </template>
    </YFileImport>
  </div>
</template>

<script setup lang="ts">
import { YButton, YFileImport } from '@yss-ui/components';
import { ref } from 'vue';

const visible = ref(false);
const resultInfo = ref({ successkey: 'ok', failkey: 'bad', success: 2, fail: 1, total: 3 });

function mockAdjust() {
  const s = Math.floor(Math.random() * 10) + 1;
  const f = Math.floor(Math.random() * 5);
  resultInfo.value = { successkey: 'ok', failkey: 'bad', success: s, fail: f, total: s + f } as any;
}
</script>
