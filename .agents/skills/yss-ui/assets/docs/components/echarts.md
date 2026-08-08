---
title: YssEcharts 图表组件
description: 基于 ECharts 6.0 封装的 Vue3 图表组件，支持响应式、主题切换、深色模式等特性。
toc: content
---
# Echarts 图表

基于 ECharts 6.0 封装的 Vue3 图表组件，支持响应式、主题、暗黑模式。

## 何时使用

- 需要在中后台快速接入标准化图表，保证响应式与主题一致性。
- 需要在不同页面中复用 `echarts` 初始化、销毁与自适应逻辑。

## 代码演示

### 基础柱状图

<code src="./demos/echarts/basic.vue"></code>

### 折线图

<code src="./demos/echarts/line.vue"></code>

### 饼图

<code src="./demos/echarts/pie.vue"></code>

### 环形分段占比图
<code src="./demos/echarts/ring-segment.vue"></code>

### 散点图

<code src="./demos/echarts/scatter.vue"></code>

### 雷达图

<code src="./demos/echarts/radar.vue"></code>

### 暗黑模式 + 主题切换

<code src="./demos/echarts/dark.vue"></code>

### 堆叠柱状图

<code src="./demos/echarts/stacked-bar.vue"></code>

### 堆叠面积图

<code src="./demos/echarts/stacked-area.vue"></code>

### 折柱混合

<code src="./demos/echarts/mix.vue"></code>

### 仪表盘

<code src="./demos/echarts/gauge.vue"></code>

### 漏斗图

<code src="./demos/echarts/funnel.vue"></code>

### 矩形树图

<code src="./demos/echarts/treemap.vue"></code>

### K 线图

<code src="./demos/echarts/candlestick.vue"></code>

### 日历热力图

<code src="./demos/echarts/calendar-heatmap.vue"></code>

### 实例方法示例（getInstance/resize/setOption/dispose）

<code src="./demos/echarts/expose-methods.vue"></code>

## API

### YEcharts Props

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| options | ECharts 配置项 | `EChartsCoreOption` | `{}` |
| width | 容器宽度，数字或 CSS 值 | `number \| string` | `'100%'` |
| height | 容器高度，数字或 CSS 值 | `number \| string` | `360` |
| theme | 图表主题 | `'light' \| 'dark' \| string` | `'light'` |
| renderer | 渲染器 | `'canvas' \| 'svg'` | `'canvas'` |
| autoresize | 自适应容器尺寸 | `boolean` | `true` |
| darkMode | 启用暗黑模式（合入 option.darkMode） | `boolean` | `false` |
| initOptions | 透传 `echarts.init` 的第三个参数 | `InitOpts` | `{}` |
| setOptionOpts | 透传 `setOption` 的参数 | `SetOptionOpts` | `{}` |

### YEcharts Expose

| 方法 | 说明 | 类型 |
| --- | --- | --- |
| getInstance | 获取原始 ECharts 实例 | `() => ECharts \| null` |
| resize | 手动触发重绘 | `() => void` |
| setOption | 更新配置项 | `(opt: EChartsCoreOption, notMerge?: boolean, setOptionOpts?: SetOptionOpts) => void` |
| dispose | 销毁实例 | `() => void` |

## 使用说明

- 组件默认通过 `ResizeObserver` 监听容器尺寸，父容器变化时将自动 `resize`。
- 切换 `theme`/`renderer` 会重建实例；切换 `darkMode` 仅通过 `setOption({ darkMode })` 更新，避免闪屏。
- `theme` 为主题包（`light`/`dark`/自定义）；`darkMode` 是 `option.darkMode` 布尔开关，两者可独立使用。
- 推荐按需引入各图表系列与组件以减小体积（ECharts 6 支持 tree-shaking）。