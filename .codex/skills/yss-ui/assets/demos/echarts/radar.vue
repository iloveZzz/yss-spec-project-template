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
  title: { text: '雷达图' },
  legend: { data: ['预算', '开销'] },
  radar: {
    indicator: [
      { name: '销售', max: 6500 },
      { name: '管理', max: 16000 },
      { name: '信息技术', max: 30000 },
      { name: '客服', max: 38000 },
      { name: '研发', max: 52000 },
      { name: '市场', max: 25000 },
    ],
  },
  series: [
    {
      name: '预算 vs 开销',
      type: 'radar',
      data: [
        { value: [4300, 10000, 28000, 35000, 50000, 19000], name: '预算' },
        { value: [5000, 14000, 28000, 31000, 42000, 21000], name: '开销' },
      ],
    },
  ],
});
</script>

<style scoped></style>
