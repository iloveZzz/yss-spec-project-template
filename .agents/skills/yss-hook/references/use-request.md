# 已批准的 useRequest 实现细则

仅项目已批准 `vue-hooks-plus/useRequest` 且当前任务使用它时读取。版本事实以项目锁定依赖为准。

`useRequest` 接收返回 `Promise<TData>` 的 service，并以插件组合管理 `loading`、`data`、`error`、`params`。自动模式默认在组件初始化时执行；`manual: true` 时用 `run` 或 `runAsync` 发起请求。

```ts
import { useRequest } from 'vue-hooks-plus';

const { data, error, loading, params, run, runAsync, refresh, mutate, cancel } = useRequest(
  searchReports,
  {
    manual: true,
    debounceWait: 300,
    onSuccess: (result, requestParams) => {
      tableData.value = result.list;
      pagination.total = result.total;
    },
    onError: (cause) => { requestError.value = cause; },
  },
);
```

- `run` 会捕获异常并交给 `onError`；`runAsync` 返回 `Promise`，调用处必须自行 `catch`。`refresh` / `refreshAsync` 使用上一次 `params` 重发请求；不要在页面重拼参数。
- `mutate(nextData | updater)` 用于乐观更新；启用 `rollbackOnError` 时，远端失败会恢复更新前数据。先保存局部错误 / 刷新策略，不能只依赖乐观 UI。
- `cancel()` 会忽略当前 Promise 的结果和错误，并会取消仍在等待执行的防抖调用；它**不会**终止底层 Promise。若 transport 支持真正中止，service 才能额外使用其已验证的 `AbortSignal` 支持。
- 搜索场景优先 `debounceWait`（毫秒），并按需要配置 `debounceLeading`、`debounceTrailing`、`debounceMaxWait`。组件卸载与后一次请求的竞态响应会被库忽略；需要提前停止时调用 `cancel()`。不要再叠加自定义 timer / 序号，除非已验证当前版本或 transport 存在库无法覆盖的缺口。
- `useRequest` 的并发语义在文档版本间出现差异：页面说明从 v2.4.0 起手动调用可独立执行，而 Options 表仍列出 `concurrent`（默认 `false`）控制新旧请求关系。启用并发前，必须以项目锁定版本的类型、测试与行为为准；搜索和同一资源写入默认采用单一最新请求策略。

### 3.1 缓存、刷新与重试

- `cacheKey` 成功后会全局共享 data 和 params：同 key 的并发实例共用 Promise、数据同步。因此 key 必须包含稳定的业务身份与影响结果的参数；不同租户、用户、筛选条件或权限视图不能共用 key。副作用、实时性强或权限敏感结果默认不启用共享缓存。
- `staleTime` 内数据视为新鲜，不重新请求；`cacheTime` 到期清除缓存。没有 `staleTime` 时，重新挂载会先展示缓存、再后台请求（SWR）。编辑 / 提交成功后的显式 `refresh` 优先于等待 SWR。
- `refreshOnWindowFocus: true` 在 `visibilitychange` / `focus` 后刷新，使用 `focusTimespan`（默认 5000ms）限频。只给允许后台重取的读模型开启；编辑中的表单、一次性动作和高成本查询默认关闭。
- `retryCount` 控制失败后的重试次数，`-1` 为无限重试；未设 `retryInterval` 时按 2s、4s…且最高 30s 的指数退避。仅对暂时性网络 / 可恢复服务错误设置有限重试；认证授权、参数校验、业务拒绝、显式取消和非幂等写操作禁止自动重试。`cancel()` 可停止正在等待的重试。
- `loadingDelay` 可延迟 loading 变为 `true`，避免短请求闪烁；它不延迟请求，也不能作为防抖替代。

### 3.2 请求轮询与依赖刷新

- `pollingInterval > 0` 启用请求轮询；每次请求完成后等待间隔再发下一次。`manual: true` 时，先 `run/runAsync` 才启动。`pollingWhenHidden` 默认 `true`；仅在业务允许后台继续请求时保留，需暂停则显式设为 `false`。`pollingErrorRetryCount` 默认 `-1`，必须为生产读模型配置有限值或明确停止条件。
- 同一数据源只能选择 `useRequest` 轮询或 YSS `usePollingTask` 之一，禁止嵌套或同时运行。手动刷新前 `cancel()` 当前请求 / 轮询，执行带 loading 的 `refresh`，再依据明确业务规则恢复轮询。
- `refreshDeps` 仅在非 manual 自动模式生效；传入 `WatchSource[]` 精确声明依赖，或在理解捕获范围后用 `true` 自动收集。筛选列表通常使用显式 `query` 并在筛选变化时重置页码，不以 `refreshDeps` 隐式驱动复杂参数。
