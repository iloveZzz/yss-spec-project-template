---
name: yss-use-table-height
description: Guide AI to correctly use useTableHeight hook for dynamic table height calculation. Use this skill when working with YTable that needs responsive height, pagination, or toolbar. Covers correct destructuring, withPagination config, and flex layout requirements.
---

# useTableHeight 表格高度计算 Hook

## Authoritative Docs And Boundary

- YSS UI hooks documentation: `http://192.168.164.27:3200/hooks`
- Local reference index: `references/frontend-docs.md`

This skill only covers `useTableHeight` wiring. Use `yss-components` for table layout/rendering rules and `yss-hook` for request/pagination state.

中文说明：这里只处理表格高度计算，不处理表格列渲染、接口请求或分页数据逻辑。

## 💡 何时使用

当页面中使用 `YTable` 组件且需要以下功能时，**必须**使用此 Hook：

- ✅ 表格需要自适应容器高度
- ✅ 表格启用了分页 (`pageable`)
- ✅ 表格启用了工具栏 (`toolbar-config`)
- ✅ 表格在弹窗 (Modal) 或抽屉 (Drawer) 中

---

## ⚠️ Critical Rules（必读）

### 规则 1：必须使用解构语法

```typescript
// ❌ 错误：直接赋值（这是最常见的错误！）
const tableHeight = useTableHeight(tableAreaRef);

// ✅ 正确：必须解构返回值
const { tableHeight } = useTableHeight(tableAreaRef);
```

> **为什么**：`useTableHeight` 返回的是对象 `{ tableHeight, isReady, recalculateHeight }`，不是数字。

---

### 规则 2：启用分页必须传 `withPagination: true`

```typescript
// ❌ 错误：YTable 启用了 pageable 但没有告知 Hook（分页会被遮挡！）
const { tableHeight } = useTableHeight(tableAreaRef);

// ✅ 正确：必须同步配置
const { tableHeight } = useTableHeight(tableAreaRef, {
  withPagination: true,  // 会自动减去 48px 分页高度
});
```

> **为什么**：不传此配置，Hook 不会预留分页区域空间，导致分页被挤出可视区域。

---

### 规则 3：启用工具栏必须传 `withToolbar: true`

```typescript
// ❌ 错误：有工具栏但没配置
const { tableHeight } = useTableHeight(tableAreaRef);

// ✅ 正确：
const { tableHeight } = useTableHeight(tableAreaRef, {
  withPagination: true,
  withToolbar: true,  // 会自动减去 48px 工具栏高度
});
```

---

### 规则 4：容器必须设置 Flex 布局

```vue
<template>
  <!-- ❌ 错误：容器没有 flex 布局 -->
  <div ref="tableAreaRef">
    <YTable :max-height="tableHeight" />
  </div>

  <!-- ✅ 正确：容器设置 flex: 1 + overflow: hidden -->
  <div ref="tableAreaRef" class="table-container">
    <YTable :max-height="tableHeight" />
  </div>
</template>

<style scoped lang="less">
.table-container {
  flex: 1;           // ← 必须：占据剩余空间
  overflow: hidden;  // ← 必须：防止内容溢出
}
</style>
```

---

### 规则 5：ref 绑定到容器而非 YTable

```vue
<!-- ❌ 错误：ref 绑定到 YTable 组件 -->
<YTable ref="tableAreaRef" :max-height="tableHeight" />

<!-- ✅ 正确：ref 绑定到包裹 YTable 的容器 div -->
<div ref="tableAreaRef" class="table-container">
  <YTable :max-height="tableHeight" />
</div>
```

---

## 📖 API 速查

### 导入

```typescript
import { useTableHeight } from '@yss-ui/hooks';
```

### 基本用法

```typescript
const { tableHeight, isReady, recalculateHeight } = useTableHeight(containerRef, options);
//       ↑ 绑定到 :max-height   ↑ 高度就绪标志     ↑ 手动重算（少用）
```

### 关键配置（必须掌握）

以下是 **最常出错** 的配置项，必须根据实际场景正确设置：

| 配置 | 何时必须设为 `true` | 不配置的后果 |
|------|---------------------|-------------|
| `withPagination` | YTable 启用 `pageable` 时 | **分页被遮挡** |
| `withToolbar` | 有工具栏 (`toolbar-config`) 时 | 工具栏被遮挡 |
| `withAddButton` | YEditTable 底部有添加按钮时 | 按钮被遮挡 |

### 完整 API 参考

> 💡 **完整参数和类型定义**请查阅：
> - 在线文档：`http://192.168.164.27:3200/hooks/use-table-height`
> - 源码类型：`packages/hooks/src/useTableHeight/types.ts`
> - LLM 索引：`http://192.168.164.27:3200/llms-full.txt`（搜索 "useTableHeight"）

---

## ✅ 完整正确示例

### 场景：搜索栏 + 表格 + 分页

```vue
<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { YCard, YTable } from '@yss-ui/components';
import { useTableHeight } from '@yss-ui/hooks';
import { Input } from 'ant-design-vue';
import { TABLE_COLUMNS } from './constant';
import type { UserItem, UserQuery } from './type';

defineOptions({ name: 'UserManagePage' });

// 1. 创建容器 ref
const tableAreaRef = ref<HTMLDivElement>();

// 2. 使用 Hook（必须解构 + 必须配置 withPagination）
const { tableHeight } = useTableHeight(tableAreaRef, {
  withPagination: true,  // ← YTable 启用了 pageable，必须开启
});

// 列表数据
const loading = ref(false);
const dataList = ref<UserItem[]>([]);
const totalCount = ref(0);
const query = reactive<UserQuery>({
  pageIndex: 1,
  pageSize: 20,
  keyword: '',
});

const fetchData = async () => {
  loading.value = true;
  // ... API 调用
  loading.value = false;
};

const handlePageChange = ({ current, pageSize }: { current: number; pageSize: number }) => {
  query.pageIndex = current;
  query.pageSize = pageSize;
  fetchData();
};

onMounted(() => fetchData());
</script>

<template>
  <div class="page-container">
    <YCard title="用户管理" class="content-card">
      <template #extra>
        <Input.Search
          v-model:value="query.keyword"
          placeholder="请输入关键词"
          style="width: 240px"
          @search="fetchData"
        />
      </template>

      <!-- 3. ref 绑定到容器 div，不是 YTable -->
      <div ref="tableAreaRef" class="table-container">
        <!-- 4. 使用 :max-height 绑定高度 -->
        <YTable
          :columns="TABLE_COLUMNS"
          :data="dataList"
          :loading="loading"
          :max-height="tableHeight"
          :pagination="{
            current: query.pageIndex,
            pageSize: query.pageSize,
            total: totalCount,
          }"
          pageable
          @page-change="handlePageChange"
        />
      </div>
    </YCard>
  </div>
</template>

<style scoped lang="less">
.page-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.content-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  :deep(.ant-card-body) {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
}

// 5. 容器必须设置 flex: 1 + overflow: hidden
.table-container {
  flex: 1;
  overflow: hidden;
}
</style>
```

---

## ❌ 常见错误汇总

### 错误 1：未解构返回值

```typescript
// ❌ 错误
const tableHeight = useTableHeight(tableAreaRef);
// tableHeight 是一个对象，不是数字！
```

**结果**：表格高度显示 `[object Object]` 或不生效

**修复**：
```typescript
const { tableHeight } = useTableHeight(tableAreaRef);
```

---

### 错误 2：启用分页但未配置 withPagination

```typescript
// ❌ 错误
const { tableHeight } = useTableHeight(tableAreaRef);
```

**结果**：分页区域被遮挡或挤出可视区域

**修复**：
```typescript
const { tableHeight } = useTableHeight(tableAreaRef, {
  withPagination: true,
});
```

---

### 错误 3：容器缺少 flex 样式

```less
// ❌ 错误：没有 flex 布局
.table-container {
  height: 100%;
}
```

**结果**：高度计算不准确，表格可能溢出

**修复**：
```less
.table-container {
  flex: 1;
  overflow: hidden;
}
```

---

### 错误 4：绑定到 height 而非 max-height

```vue
<!-- ❌ 错误：使用 :height -->
<YTable :height="tableHeight" />

<!-- ✅ 正确：使用 :max-height -->
<YTable :max-height="tableHeight" />
```

**说明**：`:max-height` 允许表格在数据少时自适应收缩，`:height` 会强制固定高度。

---

## 🔗 关联 Skills

- **page-module-development**：页面模块整体开发规范
- **ytable-usage**：YTable 组件使用规范
- **use-tree-height**：树组件高度计算（类似逻辑）

---

**最后更新**: 2026-02-04
