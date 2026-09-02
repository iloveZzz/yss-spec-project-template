---
trigger: always_on
---

# YSS AI Skills Entry

本项目使用 YSS UI 业务页面开发规范。处理 Vue3 业务页面、CRUD、列表、表单、抽屉、YTable、YEditTable、YFormily、YTree、API 对接任务时，必须先读取匹配的 SKILL.md，再写计划或代码。

## Available Skills

- yss-ui-business-page-generation: .agents/skills/yss-ui-business-page-generation/SKILL.md
- yss-page-module-development: .agents/skills/yss-page-module-development/SKILL.md
- theme-token-usage: .agents/skills/theme-token-usage/SKILL.md
- component-selection-imports: .agents/skills/component-selection-imports/SKILL.md
- page-skeleton: .agents/skills/page-skeleton/SKILL.md
- page-list-module: .agents/skills/page-list-module/SKILL.md
- page-form-module: .agents/skills/page-form-module/SKILL.md
- ytable-usage: .agents/skills/ytable-usage/SKILL.md
- yedit-table-usage: .agents/skills/yedit-table-usage/SKILL.md
- ytree-usage: .agents/skills/ytree-usage/SKILL.md
- prototype-page-acceptance: .agents/skills/prototype-page-acceptance/SKILL.md
- yss-api-integration: .agents/skills/yss-api-integration/SKILL.md
- file-export-download: .agents/skills/file-export-download/SKILL.md
- vue3-best-practices: .agents/skills/vue3-best-practices/SKILL.md
- frontend-commit: .agents/skills/frontend-commit/SKILL.md
- java-backend-commit: .agents/skills/java-backend-commit/SKILL.md
- yss-use-table-height: .agents/skills/yss-use-table-height/SKILL.md
- yss-use-tree-height: .agents/skills/yss-use-tree-height/SKILL.md
- yss-formily: .agents/skills/yss-formily/SKILL.md
- formily-foundation: .agents/skills/formily-foundation/SKILL.md
- formily-linkage-effects: .agents/skills/formily-linkage-effects/SKILL.md
- formily-mode-slot-detail: .agents/skills/formily-mode-slot-detail/SKILL.md
- formily-step-flow: .agents/skills/formily-step-flow/SKILL.md

## Mandatory Workflow

1. 业务页面/CRUD/列表/表单/树表生成主入口：先读 `.agents/skills/yss-ui-business-page-generation/SKILL.md`（旧触发词读 `.agents/skills/yss-page-module-development/SKILL.md`）。
2. 新增或修改页面、组件、Less、内联样式、TS 渲染配置、SVG 色值：必须读 `.agents/skills/theme-token-usage/SKILL.md`。
3. 导出、报表、模板、附件、Excel、CSV、PDF、ZIP、Blob 下载任务：必须读 `.agents/skills/file-export-download/SKILL.md`。
4. 列表或表格任务：同时读 `.agents/skills/page-list-module/SKILL.md`、`.agents/skills/ytable-usage/SKILL.md`、`.agents/skills/yss-use-table-height/SKILL.md`。
5. 新增/编辑/查看/抽屉表单：同时读 `.agents/skills/yss-formily/SKILL.md`、`.agents/skills/page-form-module/SKILL.md`。
6. 可编辑表格、扩展属性、添加行/删除行：必须读 `.agents/skills/yedit-table-usage/SKILL.md`。
7. 用户给原型截图或旧项目路径：必须读 `.agents/skills/prototype-page-acceptance/SKILL.md`，先生成验收清单，再实现。

## Hard Stops

- 模板已预置 yss-ui 项目级 MCP 配置；当前会话可用时，生成业务代码前必须先调用一次 `get_codegen_rules`。不确定导出时用 `list_components`，配置组件/Hook/Utils 前用 `get_component_docs`，复杂场景用 `get_demo`，不确定归属时用 `search_docs`。需要全局配置的客户端按 `docs/user-guide/yss-ui-mcp.md` 人工安装，不自动修改用户主目录。
- 禁止使用 YTable 不存在的 `request`、`search-params` Props 和 `actionConfig.actions`；实例 `refresh()` 只刷新当前表格数据，不得当作远程重新查询。
- 标准列表必须使用 `:data`、`:columns`、`:loading`、`pageable`、`v-model:pagination`、`@page-change`。
- 表格主操作必须放入 `#toolbar-right`；只有确实需要列设置时才使用 `:toolbar-config="{ custom: true }"`。
- 业务列表查询区默认将查询/重置按钮放在 YFormily 外部独占一行并右对齐；`AutoButtonGroup + Submit + Reset` 仅用于纯 Formily 提交表单。
- 所有 YFormily 横向业务表单必须使用 `FormLayout(labelWidth, labelAlign: 'right') -> FormGrid -> 字段`，不得省略固定 label 宽度和右对齐。
- FormGrid 必须保持响应式：默认 `minColumns: 1`，通过 `maxColumns`、`minWidth` 控制宽屏列数；禁止 `minColumns` 等于 `maxColumns` 固定列数，除非用户明确要求不响应式。
- 抽屉/弹窗编辑表单默认 `labelWidth: 140`、`FormGrid { maxColumns: 2, minColumns: 1, minWidth: 320~360 }`；备注/长文本字段必须用 `gridSpan` 占满整行。
- 可编辑表格必须优先使用 `YEditTable`，禁止用 `a-table` 手搓。
- 抽屉表单必须有响应式宽度，查看态不显示保存按钮。
- 页面和组件禁止硬编码品牌色及 hover/active/selected/focus 色阶；主色透明态必须从真实动态 Token 派生，不得依赖未同步变量的固定色 fallback。
- 导出下载必须优先调用 `handleBlobResponse(res.data, res.headers)`；生成方法缺少 Blob 配置时，第二参数必须传 `{ responseType: 'blob' }`，禁止手改 Orval 生成文件。
- Orval 请求失败由 `mutator.ts` 统一提示并 reject；业务 Hook 禁止 `if (res?.success)` 冗余判断，也禁止在 `else`/`catch` 重复 `message.error`，除非请求显式跳过了全局处理。
- 调用 Orval API 前必须检查当前生成文件；存在具名导出时直接导入，只有工厂导出时在模块顶层创建一次实例，禁止猜测 `getApi()` 名称。
- 有截图/旧项目参考时，交付前必须逐项对照查询区、表格工具栏、分页高度、抽屉、label、字段控件类型。
