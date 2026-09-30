# 列表与分页 Hook

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。示例代码属于目标工程，模块相对导入按所示文件位置解析。

## 2. 列表 / 分页 Hook

下面示例仅说明**已批准**的 `useRequest` 具有 `manual`、`run`、`onSuccess`、`onError` 时的组织方式；`vue-hooks-plus` 的专属契约见[useRequest 实现细则](use-request.md)，其他请求库以实际 API 为准。

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
