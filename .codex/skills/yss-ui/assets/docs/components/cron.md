---
title: Cron 表达式
description: Cron 表达式可视化编辑器，支持秒/分/时/天/月/年六个维度的配置。
toc: content
---

# Cron 表达式

Cron 表达式可视化编辑器，支持秒/分/时/天/月/年六个维度的配置。

## 何时使用

- 需要配置定时任务的执行时间
- 需要可视化编辑 Cron 表达式
- 需要在抽屉、弹窗等容器中使用

## 代码演示

### 基础用法

最基础的用法，支持 `v-model` 双向绑定。

<code id="cron-basic" src="./demos/cron/basic/index.vue"></code>

### 在下拉面板中使用
将组件放入 Popover 下拉面板，模拟类似日期选择器的交互方式，适合表单场景。

<code id="cron-select" src="./demos/cron/select/index.vue"></code>

## API

### Props

| 属性名 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| modelValue / v-model | Cron 表达式 | `string` | `''` |
| disabled | 是否禁用 | `boolean` | `false` |
| showSecond | 是否显示秒配置 | `boolean` | `true` |
| showYear | 是否显示年配置 | `boolean` | `true` |

### Events

| 事件名 | 说明 | 回调参数 |
| --- | --- | --- |
| update:modelValue | 表达式变化时触发 | `(value: string) => void` |
| change | 表达式变化时触发 | `(value: string) => void` |

## Cron 表达式说明

组件生成的 Cron 表达式格式为：

```
秒 分 时 天 月 周 年
```

各字段说明：

| 字段 | 允许值 | 允许的特殊字符 |
| --- | --- | --- |
| 秒 | 0-59 | `, - * /` |
| 分 | 0-59 | `, - * /` |
| 时 | 0-23 | `, - * /` |
| 天 | 1-31 | `, - * / ? L W` |
| 月 | 1-12 | `, - * /` |
| 周 | 1-7 (SUN-SAT) | `, - * / ? L #` |
| 年 | 1970-2099 | `, - * /` |

### 特殊字符说明

- `*`：表示所有值
- `?`：表示不指定值（仅用于天和周）
- `-`：表示范围，如 `1-5`
- `,`：表示列举，如 `1,3,5`
- `/`：表示间隔，如 `0/5` 表示从 0 开始每隔 5
- `L`：表示最后，如 `L` 在天字段表示本月最后一天
- `W`：表示最近的工作日
- `#`：表示第几个，如 `2#3` 表示第三个星期一
