---
title: useTreeHeight
description: 动态计算虚拟滚动树组件高度的 Hook
toc: content
---

# useTreeHeight

动态计算虚拟滚动树组件的可用高度，支持响应式监听容器尺寸变化。

## 核心思路

**使用 flex 布局让树区域自动填充剩余空间**，Hook 直接监听树区域高度，无需手动计算 offset：

```
容器 (固定高度 + flex 布局)
├── 头部（搜索框、下拉框等）
├── 树区域 (flex: 1, ref 传给 hook) ← Hook 监听这里
└── 底部（操作按钮等）
```

## 代码演示

### 基础用法

使用 `ref` 指向树区域，Hook 自动监听其高度变化。

<code id="demo1-basic" src="./demos/useTreeHeight/demo1-basic/index.vue"></code>

### 头部 + 树区域

展示带搜索框头部的常见布局，树区域使用 `flex: 1` 自动填充。

<code id="demo2-ytree" src="./demos/useTreeHeight/demo2-ytree/index.vue"></code>

### 头部 + 树区域 + 底部

展示更复杂的三段式布局：头部下拉框 + 树区域 + 底部操作按钮。

<code id="demo3-offset" src="./demos/useTreeHeight/demo3-offset/index.vue"></code>

## API

```typescript
const { treeHeight, recalculateHeight } = useTreeHeight(treeAreaRef, options?);
```

### Params

| 参数        | 说明                                      | 类型                               | 默认值 |
| ----------- | ----------------------------------------- | ---------------------------------- | ------ |
| treeAreaRef | 树区域 DOM 引用（建议使用 flex:1 自动填充） | `Ref<HTMLDivElement \| undefined>` | -      |
| options     | 配置选项                                  | `UseTreeHeightOptions`             | -      |

### UseTreeHeightOptions

| 参数        | 说明                                   | 类型     | 默认值 |
| ----------- | -------------------------------------- | -------- | ------ |
| minHeight   | 最小高度限制                           | `number` | `200`  |
| defaultHeight | 初始默认高度                         | `number` | `400`  |
| extraOffset | 额外偏移量（用于边框、padding 等微调） | `number` | `0`    |

### UseTreeHeightReturn

| 参数              | 说明             | 类型          |
| ----------------- | ---------------- | ------------- |
| treeHeight        | 响应式的树高度值 | `Ref<number>` |
| recalculateHeight | 手动重新计算高度 | `() => void`  |

## 最佳实践

### 推荐布局结构

```
<template>
  <div class="container" style="height: 400px; display: flex; flex-direction: column;">
    <!-- 头部区域：固定高度 -->
    <div class="header">下拉框、搜索框</div>

    <!-- 树区域：flex: 1 自动填充，ref 传给 hook -->
    <div ref="treeAreaRef" style="flex: 1; overflow: hidden;">
      <YTree :height="treeHeight" :filterable="false" :tree-data="treeData" />
    </div>

    <!-- 底部区域：固定高度（可选） -->
    <div class="footer">操作按钮</div>
  </div>
</template>
```

### 注意事项

1. **容器需要固定高度**：确保最外层容器有明确的高度（如 `height: 400px` 或 `height: 100%`）。

2. **树区域使用 flex: 1**：让树区域自动填充剩余空间，Hook 监听这个区域的高度。

3. **YTree 自带搜索框处理**：
   - 如果自定义了头部搜索框，建议设置 `:filterable="false"` 禁用 YTree 内置搜索。
   - 如果需要使用 YTree 内置搜索框，可使用 `extraOffset: YTREE_SEARCH_HEIGHT`（48px）扣除内部搜索框高度。

4. **响应式监听**：Hook 内部使用 `ResizeObserver` 监听容器尺寸变化，无需手动触发。

5. **手动触发**：特殊场景可调用 `recalculateHeight()` 手动触发计算。

## 导出常量

```typescript
import { useTreeHeight, YTREE_SEARCH_HEIGHT } from '@yss-ui/hooks';

// YTREE_SEARCH_HEIGHT = 48，YTree 内置搜索框的固定高度
const { treeHeight } = useTreeHeight(treeAreaRef, {
  extraOffset: YTREE_SEARCH_HEIGHT, // 当 YTree 启用 filterable 时使用
});
```

