<template>
  <div style="width: 100%; height: 360px">
    <YEcharts :options="option" />
  </div>
</template>

<script setup lang="ts">
import { YEcharts } from '@yss-ui/components';
import type { EChartsCoreOption } from 'echarts';
import { ref } from 'vue';

const getVirtualData = (year: number) => {
  const date = +new Date(year, 0, 1);
  const end = +new Date(year, 11, 31);
  const dayTime = 3600 * 24 * 1000;
  const data: [string, number][] = [];
  for (let time = date; time <= end; time += dayTime) {
    data.push([new Date(time).toISOString().slice(0, 10), Math.floor(Math.random() * 1000)]);
  }
  return data;
};

const year = new Date().getFullYear();

const option = ref<EChartsCoreOption>({
  title: { text: '日历热力图' },
  tooltip: {},
  visualMap: {
    min: 0,
    max: 1000,
    type: 'continuous',
    calculable: true,
    orient: 'horizontal',
    left: 'center',
    bottom: 20,
  },
  calendar: {
    range: year,
    cellSize: ['auto', 18],
  },
  series: {
    type: 'heatmap',
    coordinateSystem: 'calendar',
    data: getVirtualData(year),
  },
});
</script>

<style scoped></style>
