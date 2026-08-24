# YSS UI Hooks 速查

业务页面生成时优先从 `@yss-ui/hooks` 复用 hooks。

## 高度与异步

- `useTableHeight` 和 `useTreeHeight` 必须绑定真实容器 `ref`，并按页面的分页、工具栏、搜索区选择扣除项。
- `useLoading` 负责异步 loading 和错误边界；Orval mutator 已提示的错误不得在 `onError` 重复提示。
- `usePollingTask` 只负责轮询调度，不接管页面的 `loading/data/error`。
- `useUrlState` 用于把查询条件、分页和 Tab 状态同步到 URL。
- `useFullscreen` 用于容器、图表或编辑器全屏。
