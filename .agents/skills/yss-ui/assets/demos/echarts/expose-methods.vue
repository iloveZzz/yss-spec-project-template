<script setup lang="ts">
import { YButton, YEcharts } from '@yss-ui/components';
import type { EChartsCoreOption } from 'echarts';
import { ref } from 'vue';

const chartRef = ref<InstanceType<typeof YEcharts> | null>(null);
const remountKey = ref(0);
const boxWidth = ref<string>('100%');
const lastAction = ref<string>('');
const instanceInfo = ref<string>('');

const option = ref<EChartsCoreOption>({
  title: { text: '实例方法演示' },
  tooltip: {},
  xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', name: '销量', data: [23, 19, 36, 10, 15, 22, 18] }],
});

const randomizeMerge = (): void => {
  const data = Array.from({ length: 7 }, () => Math.floor(Math.random() * 50 + 5));
  chartRef.value?.setOption({ series: [{ type: 'bar', name: '销量', data }] }, false);
  lastAction.value = 'setOption 合并更新 series 数据';
};

const replaceOption = (): void => {
  const newOption: EChartsCoreOption = {
    title: { text: '完全替换为折线图' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['一', '二', '三', '四', '五', '六', '日'] },
    yAxis: { type: 'value' },
    series: [{ type: 'line', smooth: true, name: '均价', data: [12, 14, 15, 16, 12, 10, 9] }],
  };
  chartRef.value?.setOption(newOption, true);
  lastAction.value = 'setOption(notMerge=true) 完全替换配置';
};

const getIns = (): void => {
  const ins = chartRef.value?.getInstance();
  instanceInfo.value = ins ? `已创建 (id=${(ins as any)?.id ?? 'n/a'})` : '实例为空 (已销毁或未挂载)';
  lastAction.value = 'getInstance 获取实例';
  // 控制台可展开查看原始实例
  // eslint-disable-next-line no-console
  console.log('[YEcharts getInstance]', ins);
};

const toggleWidth = (): void => {
  boxWidth.value = boxWidth.value === '100%' ? '60%' : '100%';
  lastAction.value = '改变容器宽度';
};

const manualResize = (): void => {
  chartRef.value?.resize();
  lastAction.value = '手动调用 resize 重绘';
};

const doDispose = (): void => {
  chartRef.value?.dispose();
  lastAction.value = 'dispose 销毁实例';
};

const recreate = (): void => {
  remountKey.value += 1;
  lastAction.value = '通过切换 key 重建实例';
};
</script>

<template>
  <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px">
    <YButton size="small" type="primary" @click="randomizeMerge">setOption 合并更新</YButton>
    <YButton size="small" @click="replaceOption">setOption 覆盖 (notMerge)</YButton>
    <YButton size="small" @click="getIns">getInstance</YButton>
    <YButton size="small" @click="toggleWidth">改变容器宽度</YButton>
    <YButton size="small" @click="manualResize">手动重绘 resize</YButton>
    <YButton size="small" danger @click="doDispose">dispose 销毁</YButton>
    <YButton size="small" @click="recreate">重建实例</YButton>
  </div>
  <div class="demo-hint-text" style="margin-bottom: 8px; color: var(--demo-text-muted)">
    本示例关闭了自动自适应 (autoresize=false)。改变容器宽度后需要手动调用 resize。
  </div>
  <div :style="{ width: boxWidth, height: '360px', border: '1px dashed var(--demo-border-color, #d9d9d9)' }">
    <YEcharts ref="chartRef" :key="remountKey" :options="option" :autoresize="false" />
  </div>
  <div style="margin-top: 8px; color: var(--demo-text-muted)">容器宽度：{{ boxWidth }}</div>
  <div v-if="lastAction" style="margin-top: 4px; color: var(--demo-text-muted)">最近操作：{{ lastAction }}</div>
  <div v-if="instanceInfo" style="margin-top: 4px; color: var(--demo-text-muted)">实例：{{ instanceInfo }}</div>
  <div class="demo-hint-text" style="margin-top: 8px; color: var(--demo-text-muted)">
    场景说明：
    <span>
      1) 在侧边栏伸缩/容器尺寸变化但未启用自动自适应时，调用 <code>resize</code>； 2) 基于已有配置动态更新数据时，使用
      <code>setOption</code> 合并； 3) 需要完全替换图表类型/结构时，使用 <code>setOption(notMerge=true)</code>； 4)
      离开路由或销毁时机手动释放资源，调用 <code>dispose</code>。
    </span>
  </div>
</template>

<style scoped></style>
