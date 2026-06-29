<template>
  <div style="width: 100%; height: 360px">
    <YEcharts :options="option" />
  </div>
  <YButton type="primary" size="small" @click="randomize">随机数据</YButton>
  <span style="margin-left: 8px; color: var(--demo-text-muted)">点击更新 options，验证响应式 setOption</span>
</template>

<script setup lang="ts">
import { YButton, YEcharts } from '@yss-ui/components';
import type { EChartsCoreOption } from 'echarts';
import { ref } from 'vue';

const option = ref<EChartsCoreOption>({
  title: { text: '基础柱状图' },
  tooltip: {},
  xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: [23, 19, 36, 10, 15, 22, 18], name: '销量' }],
});

const randomize = () => {
  option.value = {
    ...option.value,
    series: [{ type: 'bar', data: Array.from({ length: 7 }, () => Math.floor(Math.random() * 50 + 5)) }],
  };
};
</script>

<style scoped></style>
