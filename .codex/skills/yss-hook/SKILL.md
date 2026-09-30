---
name: "yss-hook"
description: Use when YSS Vue 页面涉及 vue-hooks-plus/useRequest、分页、请求缓存、轮询、URL query、异步 loading、数据转换或树数据加载。
---

# YSS Hook 开发标准

本技能用于将 `views/**` 的请求、状态与数据映射收敛到 `hooks/useXxx.ts`。页面组件只保留布局、事件绑定和渲染。

## 0. 权威资料与边界

- YSS UI Hooks documentation: `http://192.168.164.27:3200/hooks`
- Vue Hooks Plus `useRequest`: `https://inhiblabcore.github.io/vue-hooks-plus/zh/hooks/useRequest/quick-start`
- Local reference index: `references/frontend-docs.md`

本技能负责请求执行、分页/筛选参数、选择状态、响应映射、异步竞态和页面级调度。接口导入与 Orval mutator 使用 `yss-api-integration`；页面布局和组件选型从 `yss-ui` 路由到 `yss-ui-business-page-generation` 及具体组件 Skill；表格和树高度分别服从 `ytable-usage`、`yedit-table-usage`、`ytree-usage`。

官方 `@yss-ui/hooks` 当前公开 `useFullscreen`、`useTreeHeight`、`useTableHeight`、`useLoading`、`usePollingTask` 与 `useUrlState`。`useRequest`、防抖、缓存或重试不属于这套公开 YSS Hooks 契约。仅当项目已批准 `vue-hooks-plus` 及其具体版本时，才可使用第 3 节的 `useRequest`；不得把它命名或包装成 YSS 官方 API。

## 0.1 Hook 选型速查

| 场景 | 首选 Hook / 模式 | 关键边界 |
| --- | --- | --- |
| 单次列表、详情、导出、提交请求 | 当前项目已批准的请求库；若为 Vue Hooks Plus，使用 `useRequest` | 业务 Hook 维护 loading、参数、映射和异常；不要以 `usePollingTask` 代替请求状态管理。 |
| 搜索防抖、缓存/SWR、失败重试或请求轮询 | 已批准的 `vue-hooks-plus/useRequest` | 仅用已锁定版本的 API；同一数据源只能有一个轮询调度器。 |
| 单个异步动作的 loading / 回调 | `useLoading` | 使用 `withLoading()` 包装动作；默认捕获错误并返回 `undefined`，需要上抛才设 `rethrowError: true`。 |
| 后台静默刷新、多接口轮询 | `usePollingTask` | 调度和页面 loading 解耦；在写入结果前检查 `isCurrent()`，请求库支持时传入 `signal`。 |
| 地址栏筛选、分页或详情定位 | `useUrlState` | query 是扁平字符串视图；默认 `history + replace` 不触发路由重建，依赖路由守卫时显式用 `strategy: 'router'`。 |
| 全屏预览、编辑器、图表 | `useFullscreen` | 真实全屏必须由用户手势触发；页面全屏仅是 CSS 覆盖层，不调用浏览器 Fullscreen API。 |
| 树或表格自适应高度 | `useTreeHeight` / `useTableHeight` | 按各自专项技能实现；高度 Hook 不负责请求或业务状态。 |

## 1. 基本分层

- 将请求执行、参数合并、响应映射与数据竞争处理放在 `hooks/useXxx.ts`；页面只保留布局、事件绑定和渲染。
- 以业务域划分 Hook，而不是为每个微小工具函数各建一个 Hook。
- 每个对外动作都必须有明确的 loading、成功、失败和数据陈旧策略；不要把这些分支留给模板或页面组件。
- 组件内不直接修改 `props`；双向绑定使用 `emit('update:xxx')`。模板不承载复杂业务表达式，优先下沉 `computed` 或业务 Hook；避免无边界的深层 `watch`，只观察明确依赖源。

## 2. 列表 / 分页 Hook

实现列表、筛选、树数据或分页时，读取 [列表与分页模式](references/list-pagination.md)。`currentParams` 保持唯一参数源；筛选回到第一页，刷新、导出和重载复用它。

## 3. `vue-hooks-plus/useRequest`（项目已批准时）

仅项目已批准且当前任务使用该库时，读取 [useRequest 实现细则](references/use-request.md)，覆盖返回值、错误处理、取消、缓存、刷新、重试和轮询。不得因技能示例引入未批准依赖；调用 `runAsync` 必须捕获拒绝，业务失败提示遵循 mutator 的唯一所有权。

## 4. 异步动作与竞态

实现提交/删除/导出、搜索竞态或并行详情时，读取 [异步动作与竞态](references/async-actions.md)。确认属于交互层；Hook 只执行已确认意图，各独立区域保留自己的状态。

## 6. 轮询

实现后台刷新或多接口轮询时，读取 [轮询调度](references/polling.md)。同一数据源只有一个调度器；写入前检查 `isCurrent()`，并协调手动请求。

## 7. URL、全屏与高度类 Hooks

- `useUrlState()`：返回扁平字符串 `state`、`setState`、`clearKeys`、`clearState`。`setState` 合并状态，`undefined`、`null`、空字符串删除键。默认 `mode: 'replace'`、`strategy: 'history'`；需要路由守卫或导航语义时用 `strategy: 'router'`。
- `useFullscreen(target, options?)`：返回 `isFullscreen`、`enterFullscreen`、`exitFullscreen`、`toggleFullscreen`、`isEnabled`。浏览器真全屏需要用户手势；`pageFullscreen` 是 CSS 模拟全屏，可配置 `className`、`zIndex`，并可用 `escTip` 控制提示。
- `useTreeHeight` 与 `useTableHeight` 通过 `ResizeObserver` 计算可用高度。树的 `extraOffset` 仅用于 YTree 内置 `filterable` 搜索区；表格可配置 `boundaryRef` 避免尺寸反馈循环，并可扣除分页、工具栏或新增按钮高度。具体布局约束交由 `ytree-usage` / `ytable-usage` / `yedit-table-usage`。

## 8. 返回契约与自检

对页面只暴露必要的 loading、数据、错误、当前参数、分页 / 选择状态和动作方法。实现前依次定义状态域、单一参数源、请求入口、响应映射和页面动作面。

- 页面没有重复请求、响应映射或防抖竞态逻辑。
- 参数没有双数据源；筛选、分页、刷新和导出遵循同一份参数。
- 成功、失败、空数据、陈旧响应和重复点击均有行为定义。
- 并行区域可独立展示失败和刷新；轮询不会覆盖更新后的手动结果。
- 使用 Vue Hooks Plus 时，已确认包版本；缓存 key 已隔离身份和筛选；重试、焦点刷新和隐藏页轮询均有明确的开启理由。
- 不将 YSS `usePollingTask` 与 `useRequest` 轮询叠加，也不将 `cancel()` 误认为能终止底层网络请求。
- 不复制同一请求到多个页面，不在页面和 Hook 同时维护分页，也不把无关业务域揉进一个 Hook。
