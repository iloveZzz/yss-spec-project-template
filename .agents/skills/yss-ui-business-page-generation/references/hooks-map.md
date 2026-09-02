# YSS UI Hooks 速查

业务页面生成时优先从 `@yss-ui/hooks` 复用以下 hooks。

## useTableHeight

```ts
const tableAreaRef = ref<HTMLDivElement>();
const { tableHeight, isReady, recalculateHeight } = useTableHeight(tableAreaRef, {
  withPagination: true,
  withToolbar: true,
  withAddButton: false,
  extraOffset: 16,
});
```

- 必须传入表格父容器 `ref`。
- 返回值是 `recalculateHeight`，不要使用旧的错误返回名。
- 可选项：`boundaryRef`、`minHeight`、`defaultHeight`、`extraOffset`、`withPagination`、`withToolbar`、`withAddButton`、`paginationHeight`、`toolbarHeight`、`addButtonHeight`。

## useTreeHeight

```ts
const treeAreaRef = ref<HTMLDivElement>();
const { treeHeight, recalculateHeight } = useTreeHeight(treeAreaRef, {
  extraOffset: YTREE_SEARCH_HEIGHT + 16,
});
```

- 必须传入树区域父容器 `ref`。
- 搜索树可引入 `YTREE_SEARCH_HEIGHT`。

## useLoading

```ts
const { loading, withLoading, setLoading, toggleLoading } = useLoading();

await withLoading(fetchData);
```

- 默认捕获错误，避免未处理 Promise rejection。
- 需要外层捕获时设置 `rethrowError: true`。
- Orval API 的业务错误和 HTTP/网络错误已由 mutator 提示，禁止在 `onError` 重复 `message.error`。
- `onError` 只用于更新局部错误状态、上报或处理非 mutator 任务；如要自定义 API 错误交互，必须先显式传入 `skipBusinessError`/`skipErrorHandler`。

## usePollingTask

```ts
const { start, stop, restart, runNow, isActive, isRunning } = usePollingTask(
  async ({ signal, isCurrent }) => {
    const res = await fetch('/api/list', { signal });
    if (!isCurrent()) return;
    return res.json();
  },
  { interval: 3000, pauseWhenHidden: true }
);
```

- 只负责轮询调度，不接管业务 `loading/data/error`。
- 适合页面级静默刷新、任务状态轮询。

## useUrlState

- 用于把查询条件、分页、Tab 等状态同步到 URL。
- 适合列表页返回恢复、分享链接保留筛选条件。

## useFullscreen

- 用于容器全屏、图表全屏、编辑器全屏。
- 传入目标元素或目标 getter，按需配置退出提示。
