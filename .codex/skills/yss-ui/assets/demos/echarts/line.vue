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
  title: { text: '折线图' },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', boundaryGap: false, data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'] },
  yAxis: { type: 'value' },
  series: [
    { type: 'line', name: 'PV', smooth: true, data: [120, 200, 150, 80, 70, 110] },
    { type: 'line', name: 'UV', smooth: true, data: [90, 130, 120, 60, 50, 90] },
  ],
});
</script>

<style scoped></style>
