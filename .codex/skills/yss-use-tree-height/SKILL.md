---
name: yss-use-tree-height
description: Guide AI to correctly use useTreeHeight hook for dynamic tree height calculation. Use this skill when working with YTree that needs responsive height, virtual scrolling, or built-in search. Covers correct destructuring, extraOffset with YTREE_SEARCH_HEIGHT, and flex layout requirements.
---

# useTreeHeight 树组件高度计算 Hook

## Authoritative Docs And Boundary

- YSS UI hooks documentation: `http://192.168.164.27:3200/hooks`
- Local reference index: `references/frontend-docs.md`

This skill only covers `useTreeHeight` wiring. Use `yss-components` for tree layout/rendering rules and `yss-hook` for tree request/selection state.

中文说明：这里只处理树高度计算，不处理树数据请求、选中状态或业务联动。

## 💡 何时使用

当页面中使用 `YTree` 组件且需要以下功能时，**必须**使用此 Hook：

- ✅ 树需要自适应容器高度
- ✅ 树启用了虚拟滚动 (`virtual`)
- ✅ 树启用了内置搜索框 (`filterable`)
- ✅ 树在 YSplitPane 的左侧面板中

---

## ⚠️ Critical Rules（必读）

### 规则 1：必须使用解构语法

```typescript
// ❌ 错误：直接赋值
const treeHeight = useTreeHeight(treeAreaRef);

// ✅ 正确：必须解构返回值
const { treeHeight } = useTreeHeight(treeAreaRef);
```

> **为什么**：`useTreeHeight` 返回的是对象 `{ treeHeight, recalculateHeight }`，不是数字。

---

### 规则 2：启用 filterable 必须传 `extraOffset: YTREE_SEARCH_HEIGHT`

```typescript
import { useTreeHeight, YTREE_SEARCH_HEIGHT } from '@yss-ui/hooks';

// ❌ 错误：YTree 启用了 filterable 但没有设置 extraOffset（搜索框会被遮挡！）
const { treeHeight } = useTreeHeight(treeAreaRef);

// ✅ 正确：必须减去搜索框高度
const { treeHeight } = useTreeHeight(treeAreaRef, {
  extraOffset: YTREE_SEARCH_HEIGHT,  // 48px，YTree 内置搜索框高度
});
```

> **为什么**：YTree 的 `filterable` 会在树顶部渲染一个 48px 的搜索框，如果不减去这个高度，树底部内容会被裁剪。

---

### 规则 3：容器必须设置 Flex 布局

```vue
<template>
  <!-- ❌ 错误：容器没有 flex 布局 -->
  <div ref="treeAreaRef">
    <YTree :height="treeHeight" />
  </div>

  <!-- ✅ 正确：容器设置 flex: 1 + overflow: hidden -->
  <div ref="treeAreaRef" class="tree-container">
    <YTree :height="treeHeight" />
  </div>
</template>

<style scoped lang="less">
.tree-container {
  flex: 1;           // ← 必须：占据剩余空间
  overflow: hidden;  // ← 必须：防止内容溢出
}
</style>
```

---

### 规则 4：ref 绑定到容器而非 YTree

```vue
<!-- ❌ 错误：ref 绑定到 YTree 组件 -->
<YTree ref="treeAreaRef" :height="treeHeight" />

<!-- ✅ 正确：ref 绑定到包裹 YTree 的容器 div -->
<div ref="treeAreaRef" class="tree-container">
  <YTree :height="treeHeight" />
</div>
```

---

### 规则 5：使用 `:height` 而非 `:max-height`

```vue
<!-- ❌ 错误：YTree 使用 max-height（与 YTable 不同！） -->
<YTree :max-height="treeHeight" />

<!-- ✅ 正确：YTree 使用 height -->
<YTree :height="treeHeight" />
```

> **对比**：YTable 用 `:max-height`，YTree 用 `:height`。

---

## 📖 API 速查

### 导入

```typescript
import { useTreeHeight, YTREE_SEARCH_HEIGHT } from '@yss-ui/hooks';
```

### 基本用法

```typescript
const { treeHeight, recalculateHeight } = useTreeHeight(containerRef, options);
//       ↑ 绑定到 :height      ↑ 手动重算（少用）
```

### 关键配置（必须掌握）

| 配置 | 何时必须设置 | 不配置的后果 |
|------|-------------|-------------|
| `extraOffset: YTREE_SEARCH_HEIGHT` | YTree 启用 `filterable` 时 | **树底部内容被裁剪** |

### 导出常量

| 常量 | 值 | 说明 |
|------|------|------|
| `YTREE_SEARCH_HEIGHT` | `48` | YTree 内置搜索框高度 |

### 完整 API 参考

> 💡 **完整参数和类型定义**请查阅：
> - 在线文档：`http://192.168.164.27:3200/hooks/use-tree-height`
> - 源码类型：`packages/hooks/src/useTreeHeight/types.ts`
> - LLM 索引：`http://192.168.164.27:3200/llms-full.txt`（搜索 "useTreeHeight"）

---

## ✅ 完整正确示例

### 场景：左树右表布局（YSplitPane）

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { YSplitPane, YCard, YTree, YTable } from '@yss-ui/components';
import { useTreeHeight, useTableHeight, YTREE_SEARCH_HEIGHT } from '@yss-ui/hooks';

defineOptions({ name: 'TreeTablePage' });

// === 左侧树 ===
const treeAreaRef = ref<HTMLDivElement>();
const treeData = ref([
  { key: '1', title: '节点1', children: [{ key: '1-1', title: '子节点1-1' }] },
  { key: '2', title: '节点2' },
]);
const selectedKeys = ref<string[]>([]);

// 使用 Hook（必须解构 + 启用 filterable 时必须配置 extraOffset）
const { treeHeight } = useTreeHeight(treeAreaRef, {
  extraOffset: YTREE_SEARCH_HEIGHT,  // ← YTree 启用了 filterable，必须开启
});

// === 右侧表格 ===
const tableAreaRef = ref<HTMLDivElement>();
const tableData = ref([]);
const loading = ref(false);

const { tableHeight } = useTableHeight(tableAreaRef, {
  withPagination: true,
});

const handleTreeSelect = (keys: string[]) => {
  selectedKeys.value = keys;
  // 根据选中节点加载表格数据
};
</script>

<template>
  <div class="page-container">
    <YSplitPane :initial-width="280" :min-width="200" :max-width="400" collapsible>
      <!-- 左侧：树 -->
      <template #left>
        <div class="left-panel">
          <YCard title="分类" class="tree-card">
            <!-- ref 绑定到容器 div -->
            <div ref="treeAreaRef" class="tree-container">
              <YTree
                v-model:selected-keys="selectedKeys"
                :tree-data="treeData"
                :height="treeHeight"
                filterable
                virtual
                @select="handleTreeSelect"
              />
            </div>
          </YCard>
        </div>
      </template>

      <!-- 右侧：表格 -->
      <template #right>
        <div class="right-panel">
          <YCard title="数据列表" class="table-card">
            <div ref="tableAreaRef" class="table-container">
              <YTable
                :data="tableData"
                :loading="loading"
                :max-height="tableHeight"
                pageable
              />
            </div>
          </YCard>
        </div>
      </template>
    </YSplitPane>
  </div>
</template>

<style scoped lang="less">
.page-container {
  height: 100%;
}

.left-panel,
.right-panel {
  height: 100%;
}

.tree-card,
.table-card {
  height: 100%;
  display: flex;
  flex-direction: column;

  :deep(.ant-card-body) {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
}

// 关键：容器必须设置 flex: 1 + overflow: hidden
.tree-container,
.table-container {
  flex: 1;
  overflow: hidden;
}
</style>
```

---

### 场景：自定义搜索框（#search 插槽）

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { YTree } from '@yss-ui/components';
import { useTreeHeight, YTREE_SEARCH_HEIGHT } from '@yss-ui/hooks';
import { Input } from 'ant-design-vue';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons-vue';

const treeAreaRef = ref<HTMLDivElement>();
const searchValue = ref('');
const treeData = ref([]);

// 即使使用自定义搜索框，仍需配置 extraOffset
const { treeHeight } = useTreeHeight(treeAreaRef, {
  extraOffset: YTREE_SEARCH_HEIGHT,
});

const handleRefresh = () => {
  // 刷新树数据
};

const handleAdd = () => {
  // 新增节点
};
</script>

<template>
  <div ref="treeAreaRef" class="tree-container">
    <YTree
      v-model:search-value="searchValue"
      :tree-data="treeData"
      :height="treeHeight"
      filterable
      virtual
    >
      <!-- 自定义搜索区插槽 -->
      <template #search>
        <div class="tree-toolbar">
          <Input
            v-model:value="searchValue"
            placeholder="搜索"
            allow-clear
            class="search-input"
          />
          <div class="toolbar-actions">
            <ReloadOutlined class="action-icon" @click="handleRefresh" />
            <PlusOutlined class="action-icon" @click="handleAdd" />
          </div>
        </div>
      </template>
    </YTree>
  </div>
</template>

<style scoped lang="less">
.tree-container {
  flex: 1;
  overflow: hidden;
}

.tree-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;

  .search-input {
    flex: 1;
  }

  .action-icon {
    cursor: pointer;
    color: #666;
    &:hover {
      color: #1890ff;
    }
  }
}
</style>
```

---

## ❌ 常见错误汇总

### 错误 1：未解构返回值

```typescript
// ❌ 错误
const treeHeight = useTreeHeight(treeAreaRef);
```

**结果**：树高度显示 `[object Object]` 或不生效

**修复**：
```typescript
const { treeHeight } = useTreeHeight(treeAreaRef);
```

---

### 错误 2：启用 filterable 但未配置 extraOffset

```typescript
// ❌ 错误
const { treeHeight } = useTreeHeight(treeAreaRef);
```

**结果**：树底部内容被裁剪，或搜索框与树内容重叠

**修复**：
```typescript
import { useTreeHeight, YTREE_SEARCH_HEIGHT } from '@yss-ui/hooks';

const { treeHeight } = useTreeHeight(treeAreaRef, {
  extraOffset: YTREE_SEARCH_HEIGHT,
});
```

---

### 错误 3：使用 :max-height 而非 :height

```vue
<!-- ❌ 错误：YTree 不应使用 max-height -->
<YTree :max-height="treeHeight" />
```

**修复**：
```vue
<YTree :height="treeHeight" />
```

---

### 错误 4：容器缺少 flex 样式

```less
// ❌ 错误
.tree-container {
  height: 100%;
}
```

**修复**：
```less
.tree-container {
  flex: 1;
  overflow: hidden;
}
```

---

## 🔗 关联 Skills

- **page-module-development**：页面模块整体开发规范
- **ytree-usage**：YTree 组件使用规范
- **use-table-height**：表格高度计算（类似逻辑，但 YTable 用 `:max-height`）

---

**最后更新**: 2026-02-04
