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
  title: { text: '饼图', left: 'center' },
  tooltip: { trigger: 'item' },
  legend: { orient: 'vertical', left: 'left' },
  series: [
    {
      name: '访问来源',
      type: 'pie',
      radius: '60%',
      data: [
        { value: 1048, name: '搜索' },
        { value: 735, name: '直接' },
        { value: 580, name: '邮件' },
        { value: 484, name: '联盟' },
        { value: 300, name: '视频' },
      ],
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0 } },
    },
  ],
});
</script>

<style scoped></style>
