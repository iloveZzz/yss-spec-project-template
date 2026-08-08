<template>
  <div style="width: 100%; height: 360px">
    <YEcharts :options="option" />
  </div>
</template>

<script setup lang="ts">
import { YEcharts } from '@yss-ui/components';
import type { EChartsCoreOption } from 'echarts';
import { ref } from 'vue';

const data = Array.from({ length: 40 }, () => [Math.random() * 100, Math.random() * 100]);

const option = ref<EChartsCoreOption>({
  title: { text: '散点图' },
  tooltip: {},
  xAxis: {},
  yAxis: {},
  series: [{ symbolSize: 10, data, type: 'scatter' }],
});
</script>

<style scoped></style>
