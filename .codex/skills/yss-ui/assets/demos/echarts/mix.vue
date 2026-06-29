<template>
  <div style="width: 100%; height: 360px">
    <YEcharts :options="option" />
  </div>
</template>

<script setup lang="ts">
import { YEcharts } from '@yss-ui/components';
import type { EChartsCoreOption } from 'echarts';
import { ref } from 'vue';

const option = ref<EChartsCoreOption>({
  title: { text: '折柱混合' },
  tooltip: { trigger: 'axis' },
  legend: {},
  xAxis: [{ type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }],
  yAxis: [
    { type: 'value', name: '销量' },
    {
      type: 'value',
      name: '均价',
      alignTicks: true,
      splitLine: { show: false },
    },
  ],
  series: [
    { name: '销量', type: 'bar', data: [23, 19, 36, 10, 15, 22, 18] },
    { name: '均价', type: 'line', yAxisIndex: 1, smooth: true, data: [12, 14, 15, 16, 12, 10, 9] },
  ],
});
</script>

<style scoped></style>
