# yss-ui Quick Recipes

## 使用说明

- 当任务是“新建页面”时，优先选用最接近的模板再改字段与交互。
- 当任务是“重构页面”时，按“列定义 -> 插槽 -> 请求 -> 分页 -> 路由”顺序迁移。
- 模板默认基于 Vue 3 + TypeScript + `@yss-ui/components`。
- 组件与 Demo 先对照 `../assets/reference-index.md` 和 `../assets/demos/*` 再编码。

---

## 组件样例速查（docs 对照）

- YTable：`../assets/demos/table/*`
- YEditTable：`../assets/demos/edit-table/*`
- YFormily：`../assets/demos/formily/*`
- YTree：`../assets/demos/tree/*`
- SplitPane：`../assets/demos/split-pane/*`
- YMonaco：`../assets/demos/monaco/*`
- YEcharts：`../assets/demos/echarts/*`
- YFileImport：`../assets/demos/file-import/*`
- YConditionBuilder：`../assets/demos/condition-builder/*`
- YCron：`../assets/demos/cron/*`
- YCard：`../assets/demos/card/*`
- YButton：`../assets/demos/button/*`

---

## 模板 1：列表管理页（带勾选、分页、状态、操作）

```ts
import { reactive, ref } from "vue";
import { YTable, type YTableColumn } from "@yss-ui/components";

const loading = ref(false);
const tableData = ref<any[]>([]);
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
});

const columns = reactive<YTableColumn[]>([
  { type: "checkbox", width: 50, align: "center" },
  { type: "seq", title: "序号", width: 60, align: "center" },
  { field: "name", title: "名称", minWidth: 180 },
  { field: "owner", title: "负责人", width: 120 },
  { field: "updatedAt", title: "更新时间", width: 180 },
  { field: "status", title: "状态", width: 110 },
  { field: "action", title: "操作", width: 180, fixed: "right" as const },
]);
```

```vue
<YTable
  :columns="columns"
  :row-config="{ keyField: 'id' }"
  :data="tableData"
  :loading="loading"
  :pagination="pagination"
  :checkbox-config="{ highlight: true }"
  @change="handlePageChange"
>
  <template #status="{ row }">
    <span :class="['status-dot', row.status === 'ENABLED' ? 'enabled' : 'disabled']"></span>
    {{ row.status === "ENABLED" ? "启用" : "停用" }}
  </template>
  <template #action="{ row }">
    <a @click="handleEdit(row)">编辑</a>
    <a @click="handleDetail(row)">详情</a>
    <a style="color: #ff4d4f" @click="handleDelete(row)">删除</a>
  </template>
</YTable>
```

---

## 模板 2：待办审批页（列表 + 详情抽屉）

```ts
import { ref, reactive } from "vue";
import { YTable, type YTableColumn } from "@yss-ui/components";

const detailVisible = ref(false);
const activeRecord = ref<any>(null);

const columns = reactive<YTableColumn[]>([
  { type: "checkbox", width: 50, align: "center" },
  { type: "seq", title: "序号", width: 60, align: "center" },
  { field: "approvalName", title: "审批名称", width: 220 },
  { field: "submitter", title: "提交人", width: 120 },
  { field: "submittedAt", title: "提交时间", width: 180 },
  { field: "status", title: "状态", width: 110 },
  { field: "action", title: "操作", width: 220, fixed: "right" as const },
]);
```

```vue
<YTable :columns="columns" :row-config="{ keyField: 'id' }" :data="tableData">
  <template #approvalName="{ row }">
    <a @click="openDetail(row)">{{ row.approvalName }}</a>
  </template>
  <template #action="{ row }">
    <a @click="handleApprove(row)">同意</a>
    <a style="color: #ff4d4f" @click="handleReject(row)">拒绝</a>
    <a @click="openDetail(row)">详情</a>
  </template>
</YTable>
```

---

## 模板 3：步骤创建页（步骤二节点表格）

```ts
import { reactive, ref } from "vue";
import { YTable, type YTableColumn } from "@yss-ui/components";

const nodeList = ref<any[]>([]);

const nodeColumns = reactive<YTableColumn[]>([
  { type: "seq", title: "序号", width: 70, align: "center" },
  { field: "nodeName", title: "节点名称", minWidth: 160 },
  { field: "taskType", title: "任务策略类型", width: 140 },
  { field: "approverType", title: "审批人类型", width: 140 },
  { field: "approvers", title: "审批人", minWidth: 220 },
  { field: "action", title: "操作", width: 130, fixed: "right" as const },
]);
```

```vue
<YTable
  :columns="nodeColumns"
  :row-config="{ keyField: 'id' }"
  :data="nodeList"
  :border="true"
>
  <template #taskType="{ row }">
    {{ row.taskType === "AUTO" ? "自动通过审批" : "人工审批" }}
  </template>
  <template #approvers="{ row }">
    {{ row.approvers.join("、") || "-" }}
  </template>
  <template #action="{ row }">
    <a @click="openEditDrawer(row)">编辑</a>
    <a style="color: #ff4d4f" @click="removeNode(row.id)">删除</a>
  </template>
</YTable>
```

---

## 模板 4：列表请求 + Mock 联调

```ts
const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getListApi({
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: query.keyword || undefined,
      status: query.status || undefined,
    });
    tableData.value = res?.data?.list || [];
    pagination.total = res?.data?.total || 0;
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.current = 1;
  fetchData();
};

const handlePageChange = (page: number, size: number) => {
  pagination.current = page;
  pagination.pageSize = size;
  fetchData();
};
```

Mock 返回建议结构：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [],
    "total": 0,
    "page": 1,
    "pageSize": 10
  }
}
```

---

## 模板 5：树表页面（YTree + useTreeHeight + SplitPane）

```ts
import { ref } from "vue";
import { useTreeHeight, YTREE_SEARCH_HEIGHT } from "@yss-ui/hooks";

const treeWrapRef = ref<HTMLDivElement>();
const selectedKeys = ref<(string | number)[]>([]);
const searchValue = ref("");
const { treeHeight } = useTreeHeight(treeWrapRef, {
  extraOffset: YTREE_SEARCH_HEIGHT,
});
```

```vue
<div class="layout">
  <YSplitPane :initial-width="300" :min-width="240" :max-width="480">
    <template #left>
      <div ref="treeWrapRef" class="tree-wrap">
        <YTree
          v-model:searchValue="searchValue"
          v-model:selectedKeys="selectedKeys"
          :height="treeHeight"
          :tree-data="treeData"
          filterable
          @select="handleTreeSelect"
        />
      </div>
    </template>
    <template #right>
      <YTable :columns="columns" :data="tableData" :row-config="{ keyField: 'id' }" />
    </template>
  </YSplitPane>
</div>
```

---

## 模板 6：YFormily 模式切换（新增/编辑/查看）

```ts
const mode = ref<0 | 1 | 2>(0);
const formData = ref<Record<string, any>>({});
```

```vue
<YFormily v-model="formData" :schema="schema" :mode="mode">
  <template #detail-owner="{ value }">
    <a-tag color="blue">{{ value || "-" }}</a-tag>
  </template>
</YFormily>
```

规则要点：

- 查看态插槽固定命名：`detail-<字段路径>`，路径中的 `.` 改为 `-`
- 输入类事件优先 `onUpdate:value`，跨字段逻辑优先 `x-reactions/effects`

---

## 模板 7：文件导入两步流（YFileImport）

```vue
<YFileImport
  v-model="visible"
  :file-type-list="['xls', 'xlsx', 'csv']"
  :import-result="importResult"
  @nextStep="handleNextStep"
  @finalImport="handleFinalImport"
  @exportErrorData="handleExportErrorData"
/>
```

要点：

- 走“选择文件 -> 结果确认”两步交互
- 失败数据通过 `exportErrorData` 下载回溯
- 与表单联动时可复用 `formily.vue` 示例模式
