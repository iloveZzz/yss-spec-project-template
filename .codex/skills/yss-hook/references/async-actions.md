# 异步动作与竞态

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。示例代码属于目标工程，模块相对导入按所示文件位置解析。

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

`@yss-ui/hooks` 没有通用防抖、取消、缓存或重试 Hook。项目已批准 Vue Hooks Plus 时，优先遵循[useRequest 实现细则](use-request.md)；否则先确认项目请求库是否已提供这些能力，再在业务 Hook 中以最小实现处理：

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
