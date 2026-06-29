<script setup lang="ts">
import { YCard } from '@yss-ui/components';
import { ref } from 'vue';
import './style.less';

/** 定义示例数据 */
const metricsData = ref([
  {
    id: 1,
    title: 'CPU 使用率',
    value: '65%',
    trend: '+2.5%',
    trendType: 'up',
    description: '当前系统 CPU 平均使用率',
  },
  {
    id: 2,
    title: '内存使用',
    value: '8.2 GB',
    subValue: '/ 16 GB',
    trend: '+0.8 GB',
    trendType: 'up',
    description: '系统内存占用情况',
  },
  {
    id: 3,
    title: '活跃连接',
    value: '1,247',
    trend: '+156',
    trendType: 'up',
    description: '当前活跃网络连接数',
  },
  {
    id: 4,
    title: '磁盘 I/O',
    value: '256 MB/s',
    trend: '-12 MB/s',
    trendType: 'down',
    description: '磁盘读写速度',
  },
  {
    id: 5,
    title: '网络流量',
    value: '1.2 TB',
    subValue: '今日',
    trend: '+0.3 TB',
    trendType: 'up',
    description: '累计网络传输流量',
  },
  {
    id: 6,
    title: '响应时间',
    value: '128ms',
    trend: '-15ms',
    trendType: 'down',
    description: '平均 API 响应延迟',
  },
]);

/**
 * 获取趋势样式类
 * @param trendType - 趋势类型
 * @returns 样式类名
 */
const getTrendClass = (trendType: string) => {
  return `trend-${trendType}`;
};
</script>

<template>
  <div class="flexible-layout-demo">
    <div class="layout-info">
      <h3>自适应卡片布局</h3>
      <p>
        此布局使用 CSS Grid 的 <code>auto-fit</code> 特性，根据容器宽度自动调整列数。 卡片最小宽度为
        280px，确保内容的可读性。
      </p>
    </div>

    <!-- 自适应网格布局 -->
    <div class="flexible-grid">
      <YCard v-for="metric in metricsData" :key="metric.id" class="metric-card" hoverable>
        <template #title>
          <div class="metric-title">{{ metric.title }}</div>
        </template>

        <div class="metric-content">
          <div class="metric-value">
            {{ metric.value }}
            <span v-if="metric.subValue" class="sub-value">{{ metric.subValue }}</span>
          </div>

          <div class="metric-trend">
            <span :class="['trend-indicator', getTrendClass(metric.trendType)]">
              {{ metric.trend }}
            </span>
          </div>

          <div class="metric-description">
            {{ metric.description }}
          </div>
        </div>
      </YCard>
    </div>

    <!-- 布局说明 -->
    <div class="layout-explanation">
      <YCard title="布局特性">
        <ul class="feature-list">
          <li><strong>自适应列数：</strong>根据屏幕宽度自动调整列数（1-4列）</li>
          <li><strong>最小宽度保护：</strong>确保卡片最小宽度 280px，保证内容可读性</li>
          <li><strong>响应式间距：</strong>不同屏幕尺寸下使用不同的间距值</li>
          <li><strong>内容适配：</strong>卡片内容自动适应宽度变化</li>
        </ul>
      </YCard>
    </div>
  </div>
</template>

<style scoped lang="less">
@import url('./style.less');
</style>
