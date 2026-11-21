---
name: vueuse-functions
description: 选用 VueUse 组合式函数处理浏览器事件、元素状态、防抖节流、计时与轮询，并在作用域结束时清理资源。
license: MIT
metadata:
    author: SerKo <https://github.com/serkodev>
    version: "1.0"
compatibility: Requires Vue 3 (or above) or Nuxt 3 (or above) project
---

# VueUse hooks 选用

先确定要处理的事件、状态或时间语义，以及负责清理的组件或 effect scope。在目标工程的锁文件中核对 `@vueuse/core` 版本，按下面的场景查对应函数。随附的上游参考对应 VueUse 15.0.0，调用签名和默认值以工程已安装的类型为准。

| 场景 | 选用与实现 |
| --- | --- |
| DOM 交互 | 监听事件用 [useEventListener](references/useEventListener.md)，元素尺寸或进入视口分别用 [useResizeObserver](references/useResizeObserver.md)、[useIntersectionObserver](references/useIntersectionObserver.md)。传元素 ref，使挂载、替换和清理跟随作用域。 |
| 浏览器能力 | 复制用 [useClipboard](references/useClipboard.md)，检查支持情况并反馈失败。交互确需根据媒体条件分支时用 [useMediaQuery](references/useMediaQuery.md)，标签页是否可见用 [useDocumentVisibility](references/useDocumentVisibility.md)。 |
| 连续输入与高频事件 | 搜索框停顿后查询可用 [useDebounceFn](references/useDebounceFn.md)，滚动期间限制执行频率可用 [useThrottleFn](references/useThrottleFn.md)。按交互需要确认首次和末次执行、等待时间及待执行调用的清理。 |
| 单次延迟与重复任务 | 延迟一次用 [useTimeoutFn](references/useTimeoutFn.md)，周期更新用 [useIntervalFn](references/useIntervalFn.md)。选择开始时机，暂停或卸载时停止对应任务。 |
| 异步轮询 | 上一次请求结束后再安排下一次，可用 [useTimeoutPoll](references/useTimeoutPoll.md)。已有请求层负责轮询时沿用其控制器。持续轮询时保留默认的 `immediateCallback: false`。暂停后先处理在途请求再恢复，并为失败明确下次执行策略。 |
| 倒计时与截止时间 | 本地相对秒数用 [useCountdown](references/useCountdown.md)。订单等有服务端截止时刻的场景，用 [useNow](references/useNow.md) 按所需精度刷新，以截止时间减当前时间重新计算剩余秒数，切回页面时重新对时。到期动作以服务端结果为准。 |
| 日期和时间显示 | 已确认显示时区时按约定格式化。本地日历日期可用 [useDateFormat](references/useDateFormat.md)，指定业务时区可用 `Intl.DateTimeFormat` 的 `timeZone`。区分纯日期、带偏移的时间戳和持续时长。 |

### 搜索防抖与组件卸载

以下示例使用 YSS starter 的本地 shadcn-vue Input。输入停止 200 毫秒后向父组件发送最后一次查询，实际请求由原有请求层处理。

```vue
<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { onScopeDispose } from 'vue'
import { Input } from '@/components/ui/input'

const emit = defineEmits<{ search: [query: string] }>()
const publishSearch = useDebounceFn((value: string | number) => emit('search', String(value)), 200)
onScopeDispose(publishSearch.cancel)
</script>

<template>
  <Input type="search" aria-label="搜索" @update:model-value="publishSearch" />
</template>
```

在同步 setup 或有效 effect scope 内创建有副作用的 hook。按所选函数的 API 清理 timer、监听器及防抖队列；异步轮询还要处理组件卸载后的响应。SSR 场景在客户端挂载后使用浏览器能力。按改动验证连续触发、暂停/恢复、离开页面及临界时间等实际路径。

Vue 自身的状态和数据流按 `vue-best-practices` 处理，抽取需要兼容 ref/getter 的业务 hook 时可用 `create-adaptable-composable`。静态文案和布局修改沿用页面现有实现。
