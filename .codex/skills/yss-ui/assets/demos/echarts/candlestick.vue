<template>
  <div style="width: 100%; height: 360px">
    <YEcharts :options="option" />
  </div>
</template>

<script setup lang="ts">
import { YEcharts } from '@yss-ui/components';
import type { EChartsCoreOption } from 'echarts';
import { ref } from 'vue';

// 示例数据：开盘、收盘、最低、最高
const data = [
  [2320.26, 2320.26, 2287.3, 2362.94],
  [2300, 2291.3, 2288.26, 2308.38],
  [2295.35, 2346.5, 2295.35, 2346.92],
  [2347.22, 2358.98, 2337.35, 2363.8],
  [2360.75, 2382.48, 2347.89, 2383.76],
];

const option = ref<EChartsCoreOption>({
  title: { text: 'K 线图' },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], boundaryGap: true },
  yAxis: { scale: true },
  series: [{ type: 'candlestick', data }],
});
</script>

<style scoped></style>
