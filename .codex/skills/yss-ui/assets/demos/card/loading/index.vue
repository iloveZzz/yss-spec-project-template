<script setup lang="ts">
import { ref } from 'vue';
import { Button } from 'ant-design-vue';
import { YCard } from '@yss-ui/components';

const loading = ref(true);
</script>

<template>
  <YCard title="加载中" :loading="loading" :padding="16" style="width: 360px">
    <div>这是加载完成后的内容。</div>
    <div>你可以用 loading 来包裹异步内容。</div>
  </YCard>
  <div style="margin-top: 12px">
    <Button size="small" @click="loading = !loading">{{ loading ? '停止' : '开始' }}加载</Button>
  </div>
  <br />
</template>

<style scoped lang="less"></style>
