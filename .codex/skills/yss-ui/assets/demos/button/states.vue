<script setup lang="ts">
import { YButton } from '@yss-ui/components';
</script>

<template>
  <div style="display: flex; gap: 12px; align-items: center">
    <YButton type="primary" loading>加载中</YButton>
    <YButton disabled>禁用</YButton>
    <YButton ghost type="primary">幽灵</YButton>
    <YButton danger type="primary">危险</YButton>
  </div>
</template>
