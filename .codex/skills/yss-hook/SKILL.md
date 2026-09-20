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

下面示例仅说明**已批准**的 `useRequest` 具有 `manual`、`run`、`onSuccess`、`onError` 时的组织方式；`vue-hooks-plus` 的专属契约见第 3 节，其他请求库以实际 API 为准。

```ts
export function useReportTable() {
  const tableData = ref<any[]>([]);
  const currentParams = ref({ pageIndex: 1, pageSize: 20 });
  const pagination = reactive({
    current: 1, pageSize: 20, total: 0,
    showSizeChanger: true, showQuickJumper: true,
  });

  const { loading, run: fetchList } = useRequest(apiFn, {
    manual: true,
    onSuccess: (res) => {
      tableData.value = res?.data || [];
      pagination.total = res?.totalCount || 0;
    },
    onError: () => {
      tableData.value = [];
      pagination.total = 0;
    },
  });
  const query = (params: Record<string, any>) => {
    currentParams.value = { ...currentParams.value, ...params };
    return fetchList(currentParams.value);
  };
  // YTable emits one object; adapt it at this boundary.
  const handlePageChange = ({ current, pageSize }: { current: number; pageSize: number }) => {
    pagination.current = current;
    pagination.pageSize = pageSize;
    return query({ pageIndex: current, pageSize });
  };
  return { loading, tableData, currentParams, pagination, query, handlePageChange };
}
```

- 仅当项目已批准的请求库支持时使用 `useRequest`；通常使用 `manual: true`，除非需求明确要求挂载即请求。
- `currentParams` 是唯一参数源。筛选变化重置 `pageIndex: 1`；翻页只改 `pageIndex/pageSize`；刷新、导出和编辑后重载复用它。
- 在 Hook 内处理成功、失败、空数据和响应映射；旧列表会误导时才在失败时清空。
- 树数据同样由 Hook 暴露 `treeData`、`treeLoading`、`selectedKey`、`handleSelect`，并在其中处理会触发加载的选中副作用。

## 3. `vue-hooks-plus/useRequest`（项目已批准时）

仅项目已批准且当前任务使用该库时，读取 [useRequest 实现细则](references/use-request.md)，覆盖返回值、错误处理、取消、缓存、刷新、重试和轮询。不得因技能示例引入未批准依赖；调用 `runAsync` 必须捕获拒绝，业务失败提示遵循 mutator 的唯一所有权。

## 4. 单一异步动作：`useLoading`

`useLoading(initialValue?)` 返回 `loading`、`setLoading`、`toggleLoading` 与 `withLoading`。用 `withLoading` 包装提交、删除、导出等动作，并把刷新或状态修正写在回调中。

```ts
const { loading: removeLoading, withLoading } = useLoading();

async function remove(id: string) {
  // `withLoading` 不等同于去重锁；快速重复点击须显式短路。
  if (removeLoading.value) return;
  await withLoading(() => deleteReport(id), {
    onSuccess: async () => { await query(currentParams.value); },
    onError: (error) => { actionError.value = error; },
  });
}
```

- 确认弹窗属于页面 / 组件交互层；Hook 接收“已确认”的业务意图并负责执行、loading、结果更新和最小动作面。
- `withLoading` 默认捕获异常并返回 `undefined`；调用方确实需要捕获时才设置 `rethrowError: true`。可用 `onSuccess`、`onError`、`onFinally` 或 `keepLoadingOnError` 定义行为。
- 不要让一个全局 `loading` 掩盖多个互不相关动作；为删除、保存、导出等分别暴露必要状态。

## 5. 搜索竞态、取消与并行详情

`@yss-ui/hooks` 没有通用防抖、取消、缓存或重试 Hook。项目已批准 Vue Hooks Plus 时，优先遵循第 3 节；否则先确认项目请求库是否已提供这些能力，再在业务 Hook 中以最小实现处理：

- 搜索建议：维护 timer、递增请求序号和（仅当客户端支持时）`AbortController`；新输入先清除旧 timer、递增序号并取消旧请求；响应写入前比较序号；在 `onScopeDispose` 清理 timer 并中止请求。不要把这些逻辑放在页面组件。
- 并行详情：每个独立区域返回自己的 `{ data, loading, error, refresh }`，`refreshAll` 可以用 `Promise.allSettled` 聚合；某一区域失败不得清空或阻塞其他区域，也必须可单独刷新。
- 提交类动作应回滚局部乐观状态；查询类动作只在旧数据会误导时清空。

```ts
function createDetailPanel<T>(load: () => Promise<T>) {
  const data = ref<T>();
  const error = ref<unknown>();
  const { loading, withLoading } = useLoading();
  const refresh = () => withLoading(load, {
    onSuccess: (result) => { data.value = result; error.value = undefined; },
    onError: (cause) => { error.value = cause; },
  });
  return { data, error, loading, refresh };
}

const refreshAll = () => Promise.allSettled([
  profile.refresh(), permissions.refresh(), audit.refresh(),
]);
```

## 6. 轮询：`usePollingTask`

`usePollingTask` 是通用调度器，不管理业务数据、loading 或错误状态，也不能替代请求 Hook。它在本轮任务结束后用 `setTimeout` 安排下一轮，避免 `setInterval` 造成重叠堆积。若同一数据源已采用第 3.2 节的 `useRequest` 请求轮询，不得再使用本 Hook。

```ts
const polling = usePollingTask(async ({ isCurrent, signal }) => {
  const result = await fetchStatus({ signal }); // 仅在客户端支持 signal 时传入
  if (!isCurrent()) return;
  status.value = result;
}, { interval: 5_000, autoStart: true, pauseWhenHidden: true });
```

- `start`、`stop`、`restart` 会推进 generation；异步结果写入前必须调用 `isCurrent()`。`signal` 只有请求库真正支持时才能中止网络请求。
- `stop()` 停止但保留 interval；`setInterval(0)` 停止并把当前 interval 置零。`runNow()` 可立即执行，`restart({ immediate: false })` 可避免手动刷新后紧接着重复请求。
- 手动搜索 / 刷新时：先 `stop()`，走带 loading 的手动请求，再按需要 `restart()`；不可让轮询与手动请求同时竞争同一状态。
- 默认页面隐藏时暂停后续调度；正在执行的任务不会自动取消。`continueOnError`、`resumeMode` 和 `concurrent` 必须按接口语义显式选择。

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
