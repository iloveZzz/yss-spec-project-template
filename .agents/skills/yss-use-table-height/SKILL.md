---
name: yss-use-table-height
description: 指导 YTable、YEditTable、左树右表、分页列表、工具栏表格和弹窗/抽屉内表格使用 @yss-ui/hooks 的 useTableHeight 实现稳定自适应高度；当需要避免双滚动条、底部空白、容器撑开闪烁，或需要计入分页、工具栏、添加按钮偏移时使用。
---

# useTableHeight 使用

## 触发条件

- YTable/YEditTable 需要自适应滚动高度，或页面出现双滚动条、底部空白和容器撑开闪烁。
- 表格内含分页、工具栏、添加按钮，或位于弹窗/抽屉/shrink-wrap 容器内。

## 不适用场景

- 纯短表且页面不需要独立滚动区。
- 当前布局组件已完整托管表格高度，且没有内部偏移需要扣减。

## 实施流程

1. MCP 可用时，先用 `get_component_docs` 精确查询 `useTableHeight`，需要示例时再调用 `get_demo`；不要仅凭 Skill 中的静态签名推断当前 API。
2. 精确查询无结果时，先用 `search_docs` 校正名称；仅在 MCP 不可用、调用失败或仍无结果时，回退读取最新 `llms-full.txt`。文档版本与当前依赖不一致时，再核对 Hook 源码、CodeGraph 和真实导出。
3. 先确认容器是稳定 flex 区域还是被表格内容撑开的 shrink-wrap 区域。
4. 盘点表格内部实际开启的分页、工具栏、YEditTable 添加按钮和额外 padding。
5. 把受约束的容器 `ref` 传给 Hook，将 `tableHeight` 绑定到表格 `height`。
6. 在弹窗/抽屉动画结束或布局切换后视情况调用 `recalculateHeight()` 验证最终高度。

## 硬约束（禁止/必须）

- 使用真实签名 `useTableHeight(tableAreaRef, options)` 和真实返回值 `tableHeight/isReady/recalculateHeight`。
- `tableAreaRef` 支持原生 DOM 或 Vue 组件实例（如 `YCard`）。绑定 DOM 时使用表格的直接父容器；绑定 Card 时 Hook 会尝试获取 `.ant-card-body`。
- 稳定布局使用“外层可计算高度 + flex column，表格区 `flex: 1; min-height: 0; overflow: hidden`”。禁止用大常量高度替代 Hook。
- YTable 开启 `pageable` 时设置 `withPagination: true`；开启 `toolbarConfig.custom` 或工具栏插槽时设置 `withToolbar: true`；YEditTable 显示 `addable` 按钮时设置 `withAddButton: true`。
- 默认偏移常量分别是分页 48px、工具栏 48px、添加按钮 40px；只在实际样式不同时使用 `paginationHeight/toolbarHeight/addButtonHeight` 覆盖。
- 把结果绑定到 `YTable/YEditTable` 的 `:height="tableHeight"`，不只设置 `max-height`。
- 直属容器由表格内容撑开时，不要观察该容器形成“子元素改变父高度、父高度又改变子元素”循环；传入更外层稳定容器 `boundaryRef`，并用 `extraOffset` 扣除边界内其他区域。
- Hook 已用 `ResizeObserver` 监听容器尺寸。不强制为每个弹窗/抽屉写 watch；只在动画或隐藏初始化导致高度不准时，于可见后 `nextTick(recalculateHeight)`。

## 标准代码骨架

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { YTable, type YTableColumn } from '@yss-ui/components';
import { useTableHeight } from '@yss-ui/hooks';

const tableAreaRef = ref<HTMLDivElement>();
const dataList = ref<Array<{ id: string; name: string }>>([]);
const columns: YTableColumn[] = [
  { type: 'seq', title: '序号', width: 70 },
  { field: 'name', title: '名称', minWidth: 180 },
];
const { tableHeight, isReady, recalculateHeight } = useTableHeight(tableAreaRef, {
  withPagination: true,
  withToolbar: true,
});
</script>

<template>
  <div class="page">
    <div ref="tableAreaRef" class="table-area">
      <YTable
        v-if="isReady"
        :height="tableHeight"
        :data="dataList"
        :columns="columns"
        :toolbar-config="{ custom: true }"
        pageable
      />
    </div>
  </div>
</template>

<style scoped lang="less">
@import './style.less';
</style>
```

```less
/* style.less */
.page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.table-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
```

## shrink-wrap 容器

```typescript
const tableAreaRef = ref<HTMLDivElement>();
const boundaryRef = ref<HTMLDivElement>();

const { tableHeight } = useTableHeight(tableAreaRef, {
  boundaryRef,
});
```

`extraOffset` 必须来自可说明的实际布局占位；如果区域高度会变，优先改成稳定 flex 布局，不固定一个近似大数。

## 弹层可见后补算

```typescript
import { nextTick } from 'vue';

/** 弹层完全展开后重算表格高度。 */
const handleAfterOpenChange = async (open: boolean) => {
  if (!open) return;
  await nextTick();
  recalculateHeight();
};
```

## 交付检查清单

- [ ] 观察容器具有稳定高度，需要时已使用 `boundaryRef`。
- [ ] 分页、工具栏、添加按钮的偏移与实际开关一致，未重复扣减。
- [ ] 表格绑定 `height`，容器有 `min-height: 0`，无双滚动条和底部大空白。
- [ ] 只在实际出现隐藏态/动画时机问题时手动调用 `recalculateHeight()`。

## 失败兜底策略

- 高度持续闪烁时，检查被观察容器是否由表格内容撑开；是则使用稳定 `boundaryRef` 或改为 flex 布局。
- 底部空白或内容被遮挡时，逐项核对 `withPagination/withToolbar/withAddButton` 与实际开关，不反复调大 `extraOffset`。
- 弹层首次打开高度不准时，在可见或动画结束后 `nextTick(recalculateHeight)`；正常 ResizeObserver 已生效时不增加重复 watch。
