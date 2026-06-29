<script setup lang="ts">
import { YCard } from '@yss-ui/components';

/** 指标数据 */
const metricsData = [
  {
    id: 'cpu',
    title: 'CPU使用率',
    value: '54%',
    icon: '💻',
    color: '#1890ff',
    bgColor: '#e6f7ff',
  },
  {
    id: 'memory',
    title: '内存使用率',
    value: '41.09%',
    icon: '🧠',
    color: '#52c41a',
    bgColor: '#f6ffed',
  },
  {
    id: 'disk',
    title: '磁盘使用率',
    value: '28%',
    icon: '💾',
    color: '#faad14',
    bgColor: '#fff7e6',
  },
  {
    id: 'alerts',
    title: '告警规则个数',
    value: '4',
    icon: '⚠️',
    color: '#ff4d4f',
    bgColor: '#fff2f0',
  },
];
</script>

<template>
  <div class="metrics-cards-dashboard">
    <div class="metrics-cards-row">
      <YCard
        v-for="metric in metricsData"
        :key="metric.id"
        :span="6"
        :gutter="16"
        class="metric-card"
        :xs="24"
        :sm="12"
        :md="6"
      >
        <div class="metric-content">
          <div class="metric-icon" :style="{ backgroundColor: metric.bgColor }">
            <span class="icon-text">{{ metric.icon }}</span>
          </div>
          <div class="metric-info">
            <div class="metric-title">{{ metric.title }}</div>
            <div class="metric-value" :style="{ color: metric.color }">
              {{ metric.value }}
            </div>
          </div>
        </div>
      </YCard>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
