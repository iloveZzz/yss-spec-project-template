---
name: "yss-ui"
description: Use when implementing or reviewing YSS Vue pages that combine YSS wrappers with Ant Design Vue, including component selection, version compatibility, layout, Formily, tables, trees, hooks, overlays, themes, accessibility, API integration, and delivery verification.
---

# YSS UI 统一路由与交付门禁

本技能是 YSS Vue 生产页面的统一入口。它负责组件路由、版本预检、跨组件约束和交付证据；具体组件、请求、表单和高度实现交给最小专项 skill，避免重复维护 API 细节。

## 1. 权威事实顺序

发生冲突时按以下顺序决策：

1. 冻结的项目工程基线和批准的 Slice Implementation Contract。
2. lockfile 中实际安装版本与 TypeScript 类型。
3. 当前项目已通过测试的既有用法。
4. 与安装版本匹配的 YSS UI 文档和本地快照。
5. 与安装版本匹配的 Ant Design Vue 官方文档。
6. 最新官网只用于发现信息，不直接作为生产 API 依据。

内部文档入口见 `references/frontend-docs.md`。Ant Design Vue 组件概览是底层补充资料，不得越过 YSS 组件映射和项目基线。

## 2. 执行前版本预检

进入实现前从前端工程根目录执行：

```bash
pnpm why vue @yss-ui/components @yss-ui/hooks ant-design-vue vxe-table
```

记录实际版本、lockfile、验证命令和环境阻塞。完整策略见 `references/antdv-compatibility.md`。

产品设计使用的 Ant Design v6 视觉/token 语义，不等于 Vue 生产实现 API。生产代码必须使用项目安装的 Ant Design Vue 4.x API，禁止复制 React hook、props 或组件写法。`yss-antd-design` 与 `@ant-design/cli` 只用于原型设计构建，进入本技能后不得再调用。

## 3. 组件选型门禁

决策顺序：

1. 查询 `references/component-routing.md`。
2. YSS 标记为 `required` 的封装必须使用 `@yss-ui/components`。
3. YSS 未封装时才允许直接使用 `ant-design-vue`。
4. YSS 封装缺少必要能力时，可以受控回退，但必须记录能力缺口、依赖版本和验证证据。
5. 禁止引入其他重型表格、树或表单方案绕过 YSS。

典型强制路由：

- `YTable` 替代 AntDV `Table`，列使用 `field/type` 和字段同名插槽。
- `YTree` 替代 AntDV `Tree`。
- `YssFormily` 是新代码 canonical name；`YFormily` 仅作为已确认导出的 deprecated alias。
- `YSplitPane`、`YButton`、`YCard` 等已有封装优先使用 YSS。

## 4. 最小专项 skill 路由

| 任务 | 必须路由 |
|---|---|
| 完整页面模块 | `yss-page-module-development` |
| 页面布局、组件和交互 | `yss-components` |
| 请求、分页、参数、树数据映射 | `yss-hook` |
| Formily schema、联动、校验、详情态 | `yss-formily` |
| 表格高度 | `yss-use-table-height` |
| 树高度 | `yss-use-tree-height` |
| Orval、API、useRequest 接入 | `yss-api-integration` |
| 视觉、token、响应式体验 | `yss-design-system` |

不得引用不存在的复数 Hook skill 名称。

## 5. 页面职责边界

```text
views/PageName/
  components/
  hooks/
  schemas/
  index.vue
  style.less
```

- `index.vue` 只做页面编排和事件转发。
- `components/` 承载区块展示和局部交互。
- `hooks/` 承载请求、分页、参数单一来源、映射和错误兜底。
- `schemas/` 承载 `YssFormily` schema。
- 页面内禁止复制请求流程、分页状态和复杂字段转换。

## 6. 跨组件强制约束

### 数据与状态

- 列表查询统一维护 `currentParams`；新查询回到第一页，翻页保留筛选条件。
- 页面至少处理 `loading`、`empty`、`error`、`disabled/no-access` 和依赖上下文的 `selected` 状态。
- 成功和失败均需反馈与数据兜底。
- OpenAPI 未冻结时不得把生成客户端当作稳定契约。

### 主题、locale 与浮层

- 主题、暗色和紧凑模式通过项目 `ConfigProvider`、YSS theme 或语义 token 实现。
- 禁止页面级硬编码主题色、任意 z-index 或自行反转暗色。
- locale、时区、日期库和金额/日期格式化由项目统一配置。
- Modal、Drawer、Dropdown、Tooltip、Select 等遵循项目 popup container、Teleport 和微应用根节点策略。

详细规则见 `references/theme-locale-overlay.md`。

### 可访问性与性能

- 图标按钮提供可访问名称，状态不得只依赖颜色。
- Modal/Drawer 处理焦点进入、捕获和关闭后的恢复。
- Table/Tree 大数据量使用项目已验证的虚拟化能力。
- 远程搜索节流或防抖，复杂组件按需加载。
- 窄屏明确布局降级、横向滚动和操作收敛策略。

详见 `references/accessibility.md`。

## 7. AntDV 受控回退记录

直接使用 AntDV 时，实施记录至少包含：

```yaml
component: Select
yss_wrapper: none
fallback_reason: YSS 当前无独立 Select 封装
antdv_version: 4.x.x
theme_locale_overlay_checked: true
verification: pnpm type-check
```

`message`、`notification`、Modal 等服务式 API 仍需确认是否通过项目 `App` / `ConfigProvider` 获取上下文。

## 8. 实施顺序

1. 读取批准合同、项目版本和组件映射。
2. 选择最小专项 skills。
3. 搭页面目录和布局。
4. 接 `YssFormily`、`YTable`、`YTree` 等 YSS 主体组件。
5. 下沉请求、分页和映射到 `yss-hook`。
6. 接高度、主题、locale、浮层和无障碍约束。
7. 联调冻结 API、Mock、路由和权限。
8. 按 `references/verification.md` 完成分层验证。

## 9. 最小验收

- [ ] 已记录 Vue、YSS UI、AntDV、VXE 实际版本。
- [ ] 组件选型符合 `component-routing.md`，回退有证据。
- [ ] 新代码使用 `YssFormily` 和真实存在的 `yss-hook`。
- [ ] YTable/YTree/Formily/高度 Hook 遵循专项 skill。
- [ ] 主题、locale、浮层容器和微应用隔离已检查。
- [ ] loading/empty/error/no-access/selected 状态按影响面覆盖。
- [ ] 键盘、焦点、标签和颜色对比度已检查。
- [ ] 已执行 lint、type-check、组件测试及必要的 E2E/视觉回归。
- [ ] 未执行项记录 `not-applicable` 或环境阻塞原因。
- [ ] 返回 YSS Skill Execution Result 所需 changed/evidence/verification 信息。

## 10. 按需读取

- 组件路由：`references/component-routing.md`
- 版本兼容：`references/antdv-compatibility.md`
- 主题/locale/浮层：`references/theme-locale-overlay.md`
- 可访问性与性能：`references/accessibility.md`
- 验证：`references/verification.md`
- AntDV 迁移与 Demo 审计：`references/migration-antdv-to-yss.md`
- 快速范例：`references/quick-recipes.md`
- 交付清单：`references/checklist.md`
- 本地文档与 Demo 索引：`assets/reference-index.md`、`assets/scenario-index.md`、`assets/keyword-index.md`

## 11. 禁止项

- 禁止根据 AntDV 最新官网直接覆盖项目已安装版本事实。
- 禁止在已有 YSS required wrapper 时直接使用底层同类组件。
- 禁止把 React Ant Design v6 API 写入 Vue 生产代码。
- 禁止引用不存在的 skill、未验证 Demo 或未冻结 API 契约。
- 禁止省略错误、权限、空态、焦点和验证证据。
