<script setup lang="ts">
import { YButton, YEcharts } from '@yss-ui/components';
import type { EChartsCoreOption } from 'echarts';
import { computed, ref } from 'vue';

const theme = ref<'light' | 'dark'>('light');
const darkMode = ref(true);

const option = ref<EChartsCoreOption>({
  xAxis: { type: 'category', data: ['A', 'B', 'C', 'D', 'E', 'F'] },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: [12, 20, 15, 8, 18, 25] }],
});

// 使用 CSS 变量 + 计算样式，避免硬编码颜色
const containerStyle = computed(() => ({
  width: '100%',
  height: '360px',
  background: darkMode.value ? '#141414' : 'var(--ant-bg-container, #ffffff)',
  border: '1px solid var(--demo-border-color, #d9d9d9)',
  borderRadius: '8px',
}));
</script>

<template>
  <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 8px">
    <span>主题：</span>
    <YButton :type="theme === 'light' ? 'primary' : 'default'" @click="theme = 'light'">light</YButton>
    <YButton :type="theme === 'dark' ? 'primary' : 'default'" @click="theme = 'dark'">dark</YButton>
    <span style="margin-left: 12px">darkMode: </span>
    <YButton :type="darkMode ? 'primary' : 'default'" @click="darkMode = !darkMode">{{
      darkMode ? 'On' : 'Off'
    }}</YButton>
  </div>
  <div :style="containerStyle">
    <YEcharts :options="option" :theme="theme" :dark-mode="darkMode" />
  </div>
</template>

<style scoped></style>
