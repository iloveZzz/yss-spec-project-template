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
  title: { text: '漏斗图' },
  tooltip: { trigger: 'item', formatter: '{b} : {c}%' },
  series: [
    {
      name: '转化',
      type: 'funnel',
      left: '10%',
      top: 60,
      bottom: 20,
      width: '80%',
      min: 0,
      max: 100,
      minSize: '0%',
      maxSize: '100%',
      sort: 'descending',
      gap: 2,
      label: { show: true, position: 'inside' },
      data: [
        { value: 100, name: '展现' },
        { value: 80, name: '点击' },
        { value: 60, name: '访问' },
        { value: 30, name: '咨询' },
        { value: 10, name: '订单' },
      ],
    },
  ],
});
</script>

<style scoped></style>
