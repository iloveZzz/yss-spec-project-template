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
  title: { text: '堆叠面积图' },
  tooltip: { trigger: 'axis' },
  legend: {},
  xAxis: { type: 'category', boundaryGap: false, data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  yAxis: { type: 'value' },
  series: [
    {
      name: '邮件',
      type: 'line',
      stack: 'Total',
      smooth: true,
      areaStyle: {},
      data: [120, 132, 101, 134, 90, 230, 210],
    },
    {
      name: '联盟',
      type: 'line',
      stack: 'Total',
      smooth: true,
      areaStyle: {},
      data: [220, 182, 191, 234, 290, 330, 310],
    },
    {
      name: '视频',
      type: 'line',
      stack: 'Total',
      smooth: true,
      areaStyle: {},
      data: [150, 232, 201, 154, 190, 330, 410],
    },
    {
      name: '直接',
      type: 'line',
      stack: 'Total',
      smooth: true,
      areaStyle: {},
      data: [320, 332, 301, 334, 390, 330, 320],
    },
  ],
});
</script>

<style scoped></style>
