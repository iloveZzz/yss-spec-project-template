<script setup lang="ts">
import { YEcharts } from '@yss-ui/components';
import type { EChartsCoreOption } from 'echarts';
import { computed } from 'vue';

const colors = ['#409eff', '#f5bf3c', '#909399', '#f95f53', '#43cf7c'];

const data = [
  { name: '运行中', value: 30 },
  { name: '等待中', value: 60 },
  { name: '暂停', value: 90 },
  { name: '失败', value: 100 },
  { name: '成功', value: 110 },
];

const max = computed(() => Math.max(...data.map(item => item.value)));
const sum = computed(() => data.reduce((acc, item) => acc + item.value, 0));

const getTooltipText = ({ name = '', value = 0 }: { name?: string; value?: number }): string => {
  const percent = sum.value === 0 ? '0.0' : ((value / sum.value) * 100).toFixed(1);
  return `${name}: ${value} (${percent}%)`;
};

const option = computed<EChartsCoreOption>(() => ({
  tooltip: {
    trigger: 'item',
    formatter: (params: { name?: string; value?: number }) => getTooltipText(params),
  },
  angleAxis: {
    show: false,
    clockwise: false,
    max: max.value + max.value / 3,
  },
  radiusAxis: {
    type: 'category',
    data: data.map(item => `${item.name}:(${((item.value / sum.value) * 100).toFixed(1)}%)`),
    z: 10,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      interval: 0,
      color: '#333',
      align: 'left',
      margin: -10,
    },
  },
  polar: {
    show: false,
    center: ['50%', '50%'],
  },
  series: [
    {
      type: 'bar',
      data: data.map((item, index) => ({
        value: item.value,
        name: item.name,
        itemStyle: { color: colors[index] },
      })),
      barWidth: 16,
      coordinateSystem: 'polar',
    },
  ],
}));
</script>

<template>
  <div class="ring-segment-demo">
    <YEcharts :options="option" />
  </div>
</template>

<style scoped lang="less">
.ring-segment-demo {
  width: 100%;
  height: 360px;
}
</style>
