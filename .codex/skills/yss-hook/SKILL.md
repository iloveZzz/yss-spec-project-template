---
name: "yss-hook"
description: "YSS 业务逻辑 Hook 开发规范与最佳实践。涉及 useRequest、分页查询、参数管理、数据转换、树数据加载等逻辑抽象时必须使用。"
---

# YSS Hook 开发标准

Use this skill when you need to extract page logic into `views/**/hooks/useXxx.ts` or when a page has repeated request, pagination, tree loading, or parameter handling.

## Authoritative Docs And Boundary

- YSS UI Hooks documentation: `http://192.168.164.27:3200/hooks`
- Local reference index: `references/frontend-docs.md`

This skill owns page business logic hooks: request execution, pagination, parameter merging, selection state, and response mapping. Use `api-integration` when the task needs Orval API import/mutator details. Use `yss-components` for layout and component rendering. Use `yss-use-table-height` or `yss-use-tree-height` for height calculations.

中文说明：这个技能只管页面业务逻辑 Hook。组件怎么摆交给 `yss-components`，接口怎么导入和调用交给 `api-integration`，高度计算交给高度专项技能。

## Core rule

- Keep data fetching, parameter merging, and result mapping inside hooks.
- Keep page components focused on layout, event wiring, and rendering.
- Use one hook per business domain, not one hook per tiny helper.

## Recommended hook shape

```ts
export function useReportTable() {
  const loading = ref(false);
  const tableData = ref<any[]>([]);
  const currentParams = ref({
    page: 1,
    pageSize: 20,
  });

  const pagination = reactive({
    current: 1,
    pageSize: 20,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
  });

  const { run: fetchList } = useRequest(apiFn, {
    manual: true,
    onSuccess: (res) => {
      tableData.value = res?.data?.list || [];
      pagination.total = res?.data?.total || 0;
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

  const handlePageChange = (current: number, pageSize: number) => {
    pagination.current = current;
    pagination.pageSize = pageSize;
    return query({ page: current, pageSize });
  };

  return {
    loading,
    tableData,
    currentParams,
    pagination,
    query,
    handlePageChange,
  };
}
```

## Request rules

- Prefer `useRequest` for all page requests.
- Use `manual: true` unless the request must fire on mount.
- Handle success and failure in the hook, not in the page component.
- Reset list state on failure when stale data would be misleading.

## Parameter rules

- Keep `currentParams` as the single source of truth.
- Reset `page` to `1` when filters change.
- Update only `page/pageSize` on pagination actions.
- Reuse `currentParams` for refresh, export, and submit after edit.

## Tree data rules

Use the same pattern for tree data:

- keep the request and tree mapping in the hook
- expose `treeData`, `treeLoading`, `selectedKey`, and `handleSelect`
- keep selection side effects in the hook when they affect data loading

## Return contract

Expose only what the page needs:

- loading flags
- list or tree data
- current params
- pagination or selection state
- request and action methods

## Implementation order

1. Define the state domains: list, pagination, filters, tree, detail.
2. Write the request entry with `useRequest`.
3. Normalize parameters with one merged params object.
4. Map API responses into page-ready state.
5. Expose a minimal action surface to the page.

## Checklist

- no duplicated request flow in the page component
- no split source of truth for params
- success, failure, and empty-data cases are handled
- data mapping happens in the hook, not the template
- pagination and tree loading are decoupled when they represent different domains

## Do not

- do not copy the same request logic into multiple pages
- do not keep pagination state in both the hook and the component
- do not let the page component perform nontrivial response mapping
- do not mix unrelated domains into one hook unless they are inseparable
