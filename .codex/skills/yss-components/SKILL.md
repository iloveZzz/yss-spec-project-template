---
name: "yss-components"
description: "YSS UI 组件开发规范与最佳实践。涉及页面布局、YTable、YssFormily、YTree、Header 区块、空态与弹窗等页面搭建场景时必须使用。"
---

# YSS 页面组件开发标准

本技能用于统一 `views/**` 页面层的组件设计方式，参考 `QualityReportData` 页面沉淀标准，目标是提升一致性、可维护性与可复用性。

## 0. 权威资料与边界

- YSS UI 组件文档：`http://192.168.164.27:3200/components`
- 本地引用索引：`references/frontend-docs.md`

本技能只负责页面组件、布局和交互呈现规范。请求、分页参数、接口映射交给 `yss-hook` 或 `api-integration`；完整页面生成流程交给 `yss-page-module-development`；表格/树高度细节交给 `yss-use-table-height` 或 `yss-use-tree-height`。

## 1. 触发场景

当需求涉及以下任一内容时，优先按本技能执行：

- 新建页面或重构页面结构
- 左树右表、左右分栏、主从布局
- YTable 列渲染、分页、空态
- YssFormily 查询区与 schema 配置
- 页面级弹窗、详情抽屉、Header 信息区

## 2. 页面目录规范

单页面推荐结构：

```text
views/PageName/
  components/
    XxxBlock/
      index.vue
      style.less
      type.ts
      hooks/
  hooks/
    usePageTable.ts
  schemas/
    searchSchema.ts
  index.vue
  style.less
```

约束要求：

- `index.vue` 仅编排页面，不承载复杂数据转换
- `components/` 放展示型或区块型组件
- `hooks/` 放页面业务逻辑 Hook
- `schemas/` 放 YssFormily 元数据定义

## 3. 页面骨架规范

页面容器使用 `YSplitPane`，并提供宽度边界与 `storage-key`。

```vue
<template>
  <div class="page-name">
    <YSplitPane
      :initial-width="280"
      :min-width="280"
      :max-width="480"
      collapsible
      storage-key="page-name-split"
    >
      <template #left>
        <div class="tree-panel"></div>
      </template>
      <template #right>
        <div class="content-panel"></div>
      </template>
    </YSplitPane>
  </div>
</template>
```

补充要求：

- 左侧区域承载目录、筛选树、统计导航
- 右侧区域按顺序组织 Header、查询区、数据区
- 右侧无选中对象时必须提供明确空态

## 4. 查询区规范（YssFormily）

查询表单必须采用 schema 驱动，页面中只负责绑定 `schema`、`scope`、初始值与插槽。

```vue
<YssFormily
  ref="formRef"
  :schema="searchSchema"
  :model-value="initialValues"
  :scope="scope"
>
  <template #searchVal>
    <a-input-group compact>
      <a-select v-model:value="searchField" :options="tableFields" />
      <a-input v-model:value="searchVal" />
    </a-input-group>
  </template>
</YssFormily>
```

schema 约束：

- 使用 `FormLayout + FormGrid + FormItem` 组织字段
- 按钮区使用 `AutoButtonGroup + Submit`
- 行为通过 `onSubmit: '{{ handleQuery }}'` 等 scope 方法绑定

## 5. 数据区规范（YTable）

表格统一使用 `YTable`，要求支持分页与插槽渲染。

```vue
<YTable
  :columns="columns"
  :data="tableData"
  :pageable="true"
  :pagination="pagination"
  :row-config="{ isCurrent: true, isHover: true, useKey: true }"
  @page-change="onPageChange"
  @size-change="onSizeChange"
>
  <template #quality_error_data="{ row }">
    <a-typography-text :content="row.quality_error_data" :ellipsis="true" copyable />
  </template>
</YTable>
```

列定义建议：

- 先固定序号列，再拼接动态列
- 列字段名与接口字段保持一致
- 长文本列优先 `showOverflow` 或省略显示

## 6. 交互状态规范

页面至少覆盖以下状态：

- `loading`：查询或刷新时显示 `a-spin`
- `empty`：无列或无数据时显示 `AEmpty`
- `selected`：依赖选中节点时，未选中显示引导空态
- `error`：请求失败提示 `message.error`

## 7. 组件编码规范

- 使用 `<script setup lang="ts">`
- 使用 `defineOptions({ name: 'PageOrComponentName' })`
- 优先使用 `@yss-ui/components` 与 `ant-design-vue`
- 样式默认 `style.less`，并在组件中显式引入
- 页面脚本内保留编排逻辑，重逻辑下沉至 hooks

## 8. 页面开发检查清单

交付前自检：

- 布局是否符合“左导航、右内容”分区
- 查询区是否 schema 化且可扩展
- 表格分页、空态、加载态是否完整
- 插槽列是否处理长文本与复制/详情能力
- 页面状态切换是否可回退且无脏数据残留

## 9. 标准执行流程

处理页面搭建需求时，按以下顺序执行：

1. 先建立目录骨架（`components/hooks/schemas/index.vue/style.less`）
2. 再完成布局分区（左树右表或主从分区）
3. 再接入查询区（schema + scope + 插槽）
4. 最后接入数据区（YTable + 分页 + 空态 + 详情弹窗）

## 10. 输出内容模板

完成任务后，输出建议包含以下四段：

```markdown
### 组件结构

- 新增/调整了哪些页面区块

### 数据交互

- 查询、分页、空态如何衔接

### 关键规范

- 本次遵循了哪些 yss-components 规则

### 文件清单

- file path 1
- file path 2
```

## 11. 禁止项

- 不在 `index.vue` 写大段数据转换与请求编排
- 不绕过 YSS 组件直接引入其他重型 UI 表格方案
- 不把查询字段硬编码在模板中而跳过 schema
- 不省略空态、加载态与错误提示

## 12. 需求到实现示例

示例需求：

```text
基于 QualityReportData 新建一个质量明细页面，要求左侧树筛选、右侧查询+表格+详情弹窗。
```

推荐实现要点：

- 页面骨架复用 `YSplitPane`
- 左侧封装独立树组件并通过事件回传选中节点
- 查询条件全部放到 `schemas/searchSchema.ts`
- 表格使用 `YTable`，详情使用插槽 + 弹窗

## 13. 触发判定速查

满足任一条件即可触发本技能：

- 用户提到“页面搭建、页面重构、页面区块拆分”
- 用户提到“YTable、YssFormily、YTree、YSplitPane”
- 用户提到“左树右表、查询区、表格区、空态、详情弹窗”
- 用户要求“参考 QualityReportData 做一个新页面”

优先级建议：

- 页面结构与组件编排问题，优先 `yss-components`
- 请求与参数治理问题，优先 `yss-hooks`

## 14. 典型请求示例

应触发示例：

- “帮我按 QualityReportData 的结构搭一个新页面，左侧树右侧表格。”
- “把这个页面查询区改成 YssFormily schema 驱动。”
- “YTable 需要加分页和空态，顺便补一个详情弹窗。”

不应优先触发示例：

- “这个接口请求参数怎么合并分页参数？”（更适合 `yss-hooks`）
- “useRequest 的 onSuccess 怎么做数据兜底？”（更适合 `yss-hooks`）

## 15. useRequest 与组件层协作边界

本章节用于避免页面组件与 Hook 职责交叉。页面层允许使用 `useRequest`，但仅限轻量、一次性动作。

### 15.1 页面层允许使用 useRequest 的场景

- 导出下载、调试、校验、单次预览等动作型请求
- 与当前页面强绑定、复用价值低、参数简单的请求
- 不会引入分页治理和复杂数据映射的请求

推荐写法：

```typescript
const { run: runExport, loading: exportLoading } = useRequest(exportApi, {
  manual: true,
  onSuccess: (res) => {
    // 处理下载或成功提示
  },
  onError: () => {
    message.error("导出失败");
  },
});
```

### 15.2 页面层不应承载 useRequest 的场景

- 列表查询、分页查询、搜索联动请求
- 需要 `currentParams` 统一治理的请求
- 包含复杂数据转换、字段映射、树结构组装的请求

这类逻辑必须下沉到 `hooks/useXxx.ts`，由 `yss-hooks` 规范约束。

### 15.3 组件与 Hook 的调用关系

- 组件层负责收集参数、触发动作、渲染状态
- Hook 层负责请求、数据转换、参数治理、异常兜底
- 组件层通过 `scope`、事件回调、方法调用接入 Hook，不复制 Hook 内逻辑

### 15.4 协作判定快表

- 若请求影响表格分页状态：放 Hook
- 若请求结果需要多处复用：放 Hook
- 若请求仅服务当前按钮动作：可留组件层
- 若请求需要导出复用筛选参数：放 Hook 并接入 `currentParams`

## 16. 冲突决策三步法（组件 or Hook）

当页面编排和请求逻辑同时出现时，按以下三步快速判定归属：

1. **先看是否影响分页或筛选参数状态**
   - 会影响 `page/pageSize/currentParams`：归 `yss-hooks`
   - 不影响：进入第 2 步
2. **再看是否需要复用**
   - 多页面/多区块复用：归 `yss-hooks`
   - 仅当前页面单点动作：进入第 3 步
3. **最后看是否为一次性动作请求**
   - 导出、调试、校验、单次预览：可留在 `yss-components`
   - 列表查询、联动筛选、结构转换：归 `yss-hooks`

## 17. 二选一决策表

- **场景：左树右表页面搭建** → 使用 `yss-components`
- **场景：查询区改造为 schema 驱动** → 使用 `yss-components`
- **场景：分页参数与筛选参数统一治理** → 使用 `yss-hooks`
- **场景：onSuccess/onError 数据兜底与映射** → 使用 `yss-hooks`
- **场景：导出按钮单次请求且不参与分页状态** → 可在 `yss-components` 就地处理
- **场景：导出要复用 currentParams 并与列表一致** → 使用 `yss-hooks`
