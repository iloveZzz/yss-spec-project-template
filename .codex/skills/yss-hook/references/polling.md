# 轮询调度

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。示例代码属于目标工程，模块相对导入按所示文件位置解析。

## 6. 轮询：`usePollingTask`

`usePollingTask` 是通用调度器，不管理业务数据、loading 或错误状态，也不能替代请求 Hook。它在本轮任务结束后用 `setTimeout` 安排下一轮，避免 `setInterval` 造成重叠堆积。若同一数据源已采用[useRequest 实现细则](use-request.md) 的请求轮询，不得再使用本 Hook。

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
