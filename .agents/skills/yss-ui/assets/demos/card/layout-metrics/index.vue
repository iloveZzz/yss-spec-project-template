<script setup lang="ts">
import { YCard, YEcharts } from '@yss-ui/components';
import { ref } from 'vue';
import { createCpuGaugeOption, createDiskGaugeOption, THREAD_STATS_DATA, DISK_USAGE_INFO } from './constants';
import './style.less';

/** CPU使用率仪表盘配置 */
const cpuGaugeOption = ref(createCpuGaugeOption());

/** 活动线程数配置 */
const threadStats = ref(THREAD_STATS_DATA);

/** 磁盘使用率仪表盘配置 */
const diskGaugeOption = ref(createDiskGaugeOption());
</script>

<template>
  <div class="metrics-dashboard">
    <!-- 三个卡片在一行展示 -->
    <div class="metrics-row">
      <!-- CPU使用率仪表盘 -->
      <YCard class="gauge-card">
        <template #title>
          <div class="gauge-title">最大内存使用率</div>
        </template>
        <div class="gauge-container">
          <YEcharts :options="cpuGaugeOption" style="width: 100%; height: 280px" />
        </div>
      </YCard>

      <!-- 活动线程数 -->
      <YCard class="thread-card">
        <template #title>
          <div class="thread-title">当前活动线程数</div>
        </template>
        <div class="thread-container">
          <div class="thread-total">{{ threadStats.total }}</div>
          <div class="thread-details">
            <div v-for="item in threadStats.details" :key="item.label" class="thread-item">
              <span class="thread-label">{{ item.label }}</span>
              <span class="thread-value" :style="{ color: item.color }">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </YCard>

      <!-- 磁盘使用率仪表盘 -->
      <YCard class="gauge-card">
        <template #title>
          <div class="gauge-title">最大磁盘使用率</div>
        </template>
        <div class="gauge-container">
          <YEcharts :options="diskGaugeOption" style="width: 100%; height: 280px" />
        </div>
      </YCard>

      <!-- 磁盘使用量卡片 -->
      <YCard class="storage-card">
        <template #title>
          <div class="storage-title">磁盘使用量（{{ DISK_USAGE_INFO.unit }}）</div>
        </template>
        <div class="storage-container">
          <div class="storage-value">{{ DISK_USAGE_INFO.used }}/{{ DISK_USAGE_INFO.total }}</div>
        </div>
      </YCard>
    </div>
  </div>
</template>

<style scoped lang="less">
@import url('./style.less');
</style>
