---
name: "yss-ui"
description: "YSS UI 页面开发组件技能。涉及 YTable、YTree、YssFormily、useTableHeight、useTreeHeight、页面布局、Hook 抽离、API/Mock 联调、路由菜单约定时必须使用。组件技能可以参考 yss-components 与 yss-hooks 技能规范。"
---

# YSS UI 页面与 Hook 一体化标准

本技能是 `yss-components` 与 `yss-hooks` 的统一执行入口。  
目标是把页面结构规范与业务 Hook 规范合并为一套可直接落地的方法，避免组件层与逻辑层职责混乱。

## 0. 权威资料与技能边界

- YSS UI 组件文档：`http://192.168.164.27:3200/components`
- YSS UI Hooks 文档：`http://192.168.164.27:3200/hooks`
- YSS UI Skills 文档：`http://192.168.164.27:3200/skills`
- 本地引用索引：`references/frontend-docs.md`

边界：

- 新建完整页面优先用 `yss-page-module-development`。
- 只处理组件布局、YTable、YTree、YssFormily、YSplitPane 细节时用 `yss-components`。
- 只处理请求、分页、参数、树选择、数据映射时用 `yss-hook`。
- 只处理高度计算时用 `yss-use-table-height` 或 `yss-use-tree-height`。
- 只处理 Orval/API/useRequest 接口接入时用 `api-integration`。

## 1. 触发场景

当需求出现以下任一特征时，可以启用本技能：

- 涉及 `YTable`、`YTree`、`YssFormily`、`YSplitPane`
- 涉及 `useRequest`、分页查询、参数治理、树数据加载
- 涉及 `useTableHeight`、`useTreeHeight` 高度自适应
- 要求“按 YSS 规范”“对齐组件库风格”“生产可交付”

## 2. 统一原则

- 页面编排遵循 `yss-components`
- 请求与状态治理遵循 `yss-hooks`
- 组件问题优先修组件层，逻辑问题优先下沉 Hook
- 同一页面内禁止出现重复请求流程与重复分页状态

## 3. 目录与职责标准

推荐目录：

```text
views/PageName/
  components/
    XxxBlock/
      index.vue
      style.less
      type.ts
  hooks/
    usePageTable.ts
    usePageTree.ts
  schemas/
    searchSchema.ts
  index.vue
  style.less
```

约束：

- `index.vue` 只负责页面编排与事件转发
- `hooks/useXxx.ts` 负责请求、参数、映射、兜底
- `schemas/*.ts` 负责 YssFormily schema
- 区块组件只承载展示与交互，不承载复杂数据转换

## 4. 组件使用优先级

1. 优先 `@yss-ui/components`
2. YSS 未封装时再使用 `ant-design-vue`

导入示例：

```ts
import {
  YTable,
  YTree,
  YssFormily,
  type YTableColumn,
} from "@yss-ui/components";
import { Input, Select, Modal, message } from "ant-design-vue";
```

禁止项：

- 禁止把 `YTable` 主体写成 `dataIndex/key + bodyCell`
- 禁止绕开 YSS 组件引入其他重型表格方案
- 禁止在 YSS 已封装场景优先使用 AntD 同类组件

## 5. 页面骨架标准

页面建议优先使用左导航右内容分区，支持 `YSplitPane` 或等价分区布局。

补充要求：

- 右侧内容顺序为 Header → 查询区 → 数据区
- 依赖上下文选中态时必须提供空态引导
- 页面容器需要可伸缩，避免固定高度导致滚动冲突

## 6. 查询区标准（YssFormily）

- 查询表单优先 schema 驱动
- 行为通过 `scope` 绑定，不在模板写复杂逻辑
- 按钮区统一 `AutoButtonGroup + Submit`

示例：

```vue
<YssFormily
  ref="formRef"
  :schema="searchSchema"
  :model-value="initialValues"
  :scope="scope"
/>
```

## 7. 数据区标准（YTable）

列定义必须使用 `field/type`：

```ts
const columns = reactive<YTableColumn[]>([
  { type: "seq", title: "序号", width: 60, align: "center" },
  { field: "name", title: "名称", minWidth: 180 },
  { field: "status", title: "状态", width: 120 },
  { field: "action", title: "操作", width: 180, fixed: "right" as const },
]);
```

绑定建议：

```vue
<YTable
  :columns="columns"
  :data="tableData"
  :loading="loading"
  :pagination="pagination"
  :row-config="{ keyField: 'id' }"
  @change="handlePageChange"
/>
```

插槽规则：

- 使用字段同名插槽：`#status`、`#action`
- 避免 `#bodyCell` 作为主渲染分支

## 8. 高度 Hook 标准（强约束）

### useTableHeight

- 必须解构：`const { tableHeight } = useTableHeight(tableAreaRef, options)`
- 有分页必须加 `withPagination: true`
- 有工具栏必须加 `withToolbar: true`
- `ref` 绑定在表格容器，不绑定 `YTable` 本身
- 容器样式必须 `flex: 1; overflow: hidden`

### useTreeHeight

- 必须解构：`const { treeHeight } = useTreeHeight(treeAreaRef, options)`
- 启用树搜索时加 `extraOffset: YTREE_SEARCH_HEIGHT`
- 树容器必须 `flex: 1; overflow: hidden`

## 9. 请求与 Hook 标准（强约束）

请求统一用 `vue-hooks-plus` 的 `useRequest`：

```ts
const { loading, run: runPage } = useRequest(pageApi, {
  manual: true,
  onSuccess: (res) => {
    tableData.value = res?.data || [];
    pagination.total = res?.totalCount || 0;
  },
  onError: () => {
    tableData.value = [];
    pagination.total = 0;
    message.error("查询失败");
  },
});
```

要求：

- `manual: true`
- 成功和失败都必须兜底
- 页面层不复制 Hook 中请求回调
- 列表查询与分页治理必须放 `hooks/useXxx.ts`

## 10. 参数治理标准

统一维护 `currentParams` 作为参数单一来源：

- 新查询重置到第 1 页
- 翻页仅更新 `page/pageSize`，保留筛选项
- 导出、刷新等动作复用 `currentParams`

## 11. API 与 Mock 联调标准

API 层：

- 接口写在 `packages/src/api/*`
- 复用 `mutator.ts`
- 避免重复拼接 `/api`

Mock 层：

- 路由放 `packages/mock/api.ts`
- 支持筛选和分页切片
- 返回结构统一：`{ code, message, data: { list, total, page, pageSize } }`

## 12. 路由菜单标准

- 菜单标题放 `meta.title`
- 非主菜单详情页使用 `MENU_TYPE.INNER_MENU`

示例：

```ts
meta: {
  title: '新建审批流程',
  keepAlive: false,
  menuType: MENU_TYPE.INNER_MENU,
}
```

## 13. 状态与交付体验标准

页面至少覆盖以下状态：

- `loading`
- `empty`
- `error`
- `selected`（依赖上下文选中时）

交互统一：

- 状态类字段使用状态点 + 文案
- 工具栏采用左筛选右操作
- 危险操作使用红色动作样式

## 14. 执行流程

按以下顺序执行：

1. 搭目录骨架（components/hooks/schemas/index/style）
2. 做布局分区（左树右表或主从结构）
3. 接查询区（YssFormily schema + scope）
4. 接数据区（YTable + 插槽 + 分页）
5. 下沉逻辑（useRequest + currentParams）
6. 加高度自适应（useTableHeight/useTreeHeight）
7. 联调 API/Mock 与路由菜单

## 15. 冲突决策三步法

当“页面编排”和“请求治理”同时出现时：

1. 看是否影响分页与参数治理
   - 是：归 `yss-hooks`
2. 看是否需要复用
   - 是：归 `yss-hooks`
3. 看是否为一次性动作请求
   - 是：可留组件层；否则归 `yss-hooks`

## 16. 组件与 Hook 边界快表

- 页面布局、区块拆分、弹窗编排 → `yss-components`
- 查询 schema、插槽交互编排 → `yss-components`
- 列表查询、分页联动、参数复用 → `yss-hooks`
- 树节点结构转换与刷新策略 → `yss-hooks`
- 单按钮一次性导出请求 → 可组件层处理
- 导出需复用筛选参数 → `yss-hooks`

## 17. 输出模板

完成任务后输出建议：

```markdown
### 组件结构

- 新增或调整的页面区块

### Hook 逻辑

- 请求、分页、参数治理的实现方式

### 关键规范

- 本次遵循的 yss-components / yss-hooks 规则

### 校验结果

- 格式化、诊断、lint/type-check 结果

### 文件清单

- file path 1
- file path 2
```

## 18. 禁止项

- 不在 `index.vue` 写大段请求编排和数据映射
- 不在模板层做复杂字段转换
- 不省略错误分支、空态和加载态
- 不在多个位置维护重复分页参数
- 不忽略高度容器 `flex + overflow` 约束

## 19. 参考索引

优先读取：

- `references/quick-recipes.md`
- `references/checklist.md`
- `assets/reference-index.md`
- `assets/scenario-index.md`
- `assets/keyword-index.md`
- `assets/docs/components/*.md`
- `assets/docs/hooks/*.md`
- `assets/demos/*`

## 20. 最小验收清单

- [ ] 页面结构与组件选型符合 YSS 规范
- [ ] YTable 已使用 `field/type` 与字段插槽
- [ ] useRequest 已下沉 Hook 且包含成功失败兜底
- [ ] `currentParams + pagination` 治理闭环
- [ ] useTableHeight/useTreeHeight 使用正确并绑定容器 ref
- [ ] API/Mock/路由菜单约定正确
- [ ] 无新增诊断错误
