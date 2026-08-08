---
title: useTableHeight
description: 动态计算表格高度的 Hook
toc: content
---

# useTableHeight

用于动态计算 `YTable` 或 `YEditTable` 的高度，使其在 Flex 容器中自适应。
自动处理窗口缩放及容器尺寸变化，支持自动减去分页、工具栏等预设高度。

## 核心思路

Hook 通过 `ResizeObserver` 监听传入的父容器（`tableAreaRef`）高度，并根据配置减去内部固定元素（如分页、工具栏）的高度，从而计算出表格主体的精确 `height`。

```
容器 (固定高度/flex:1)
├── 工具栏 (可选，Hook 可自动减去高度)
├── 表格主体 (height = 容器高度 - 偏移量)
└── 分页 (可选，Hook 可自动减去高度)
```

## 代码演示

### 基础布局 (Flex)

最常见的场景：页面整体采用 Flex 布局，表格占据中间剩余空间。
使用 `withPagination` 和 `withToolbar` 自动扣除对应高度。

<code id="flex-layout" src="./demos/useTableHeight/flex-layout/index.vue"></code>

### 弹窗场景 (Modal)

在 Modal 中固定内容高度，让表格撑满弹窗主体。

<code id="in-modal" src="./demos/useTableHeight/in-modal/index.vue"></code>

### 抽屉场景 (Drawer)

在侧边抽屉中展示长列表，高度随抽屉高度自适应。

<code id="in-drawer" src="./demos/useTableHeight/in-drawer/index.vue"></code>

## API

```typescript
const { tableHeight, isReady, recalculateHeight } = useTableHeight(tableAreaRef, options?);
```

### Params

| 参数         | 说明                                                                 | 类型                                                  | 默认值 |
| ------------ | -------------------------------------------------------------------- | ----------------------------------------------------- | ------ |
| tableAreaRef | 表格父容器引用，支持原生 DOM 或 Vue 组件实例（如 YCard） | `Ref<HTMLElement \| ComponentPublicInstance \| undefined>` | -      |
| options      | 配置选项                                                             | `UseTableHeightOptions`                               | -      |

> [!TIP]
> 当 `ref` 绑定到 `YCard` 或 `AntCard` 组件时，Hook 会自动获取其内部的 `.ant-card-body` 元素进行高度计算，无需额外配置。

### UseTableHeightOptions

| 参数             | 说明                                                       | 类型      | 默认值  |
| ---------------- | ---------------------------------------------------------- | --------- | ------- |
| minHeight        | 最小高度限制                                               | `number`  | `200`   |
| defaultHeight    | 初始默认高度                                               | `number`  | `400`   |
| extraOffset      | 额外偏移量（用于边框、padding 等微调）                     | `number`  | `0`     |
| withPagination   | 是否包含分页（减去 48px）                                  | `boolean` | `false` |
| paginationHeight | 自定义分页高度，覆盖默认 48px                              | `number`  | -       |
| withToolbar      | 是否包含工具栏（减去 48px）                                | `boolean` | `false` |
| toolbarHeight    | 自定义工具栏高度，覆盖默认 48px                            | `number`  | -       |
| withAddButton    | 是否包含添加按钮（减去 40px，仅 EditTable）                | `boolean` | `false` |
| addButtonHeight  | 自定义添加按钮高度，覆盖默认 40px                          | `number`  | -       |

### UseTableHeightReturn

| 参数              | 说明                                                   | 类型            |
| ----------------- | ------------------------------------------------------ | --------------- |
| tableHeight       | 响应式的表格高度值                                     | `Ref<number>`   |
| isReady           | 高度是否已计算完成，可用于条件渲染或加载状态判断       | `Ref<boolean>`  |
| recalculateHeight | 手动重新计算高度（通常不需要，Hook 会自动监听）        | `() => void`    |

## 最佳实践与注意事项

1.  **容器样式**：`tableAreaRef` 指向的容器通常需要设置 `flex: 1` 和 `overflow: hidden`，以确保它能正确占据剩余空间且被 `ResizeObserver` 监听。

2.  **支持组件 ref**：可以直接将 `ref` 绑定到 Vue 组件上，Hook 会自动获取其根 DOM 元素：
    ```
    <!-- 两种写法都支持 -->
    <div ref="tableRef">...</div>
    <YCard ref="tableRef">...</YCard>
    ```

3.  **高度传递**：计算出的 `tableHeight` 应直接传递给 `YTable` 或 `YEditTable` 的 `height` 属性。

4.  **预设高度**：
    - `withPagination`: 对应 `YTable` 内部的分页区域（默认 48px）
    - `withToolbar`: 对应 `YTable` 顶部的工具栏（默认 48px）
    - 如需自定义高度，使用 `paginationHeight` / `toolbarHeight` 覆盖默认值
    - 如果使用非内置的自定义区域，建议将其放在 `tableAreaRef` 容器之外

5.  **边界处理**：当容器高度极小时（如用户极端缩小窗口），Hook 会优先保证分页/工具栏可见，而非强制 `minHeight`，避免分页被遮挡。
