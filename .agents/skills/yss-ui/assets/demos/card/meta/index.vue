<script setup lang="ts">
import { YCard } from '@yss-ui/components';
</script>

<template>
  <YCard :hoverable="true" style="width: 320px">
    <template #meta-title>业务服务 A</template>
    <template #meta-description>服务说明：核心交易服务，负责订单处理等。</template>
    <template #meta-avatar>
      <img
        alt="avatar"
        src="https://avatars.githubusercontent.com/u/69631?v=4"
        style="width: 40px; height: 40px; border-radius: 50%"
      />
    </template>
  </YCard>
</template>

<style scoped lang="less"></style>
