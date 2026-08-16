---
name: api-integration
description: Guide AI to correctly use Orval-generated API clients in Vue 3 micro-applications. This skill must be used whenever the user needs backend API integration, including list queries, CRUD actions, detail loading, submit flows, or API refactoring. It covers type-safe API imports, request/response mapping, and especially standardized useRequest integration patterns (manual/run/runAsync, pagination parameters, unified error handling, loading state, and success callbacks).
---

# API 集成 Skill

## 📋 目标

帮助 AI 正确使用基于 **Orval** 生成的 API 客户端：

- ✅ 正确导入 API 函数
- ✅ 统一错误处理
- ✅ Loading 状态管理
- ✅ TypeScript 类型安全

## 🔍 前置条件

1. **契约状态已明确**：
   - 已有生成客户端：可以直接集成。
   - 新增或变更 API：必须先在 `docs/.scratch/<feature>/api/<feature>.yaml` 形成 OpenAPI Draft，经工程基线 / 架构 / Spec Delta 设计和设计审查后 Freeze。冻结的 OpenAPI YAML 是唯一权威，JSON 仅为它的受控派生物。
   - 如果接口尚未冻结、JSON 派生记录缺失或生成函数不存在，先回到 `yss-product-lifecycle` / `yss-openapi-governance`，不要手写临时路径、DTO 或响应结构。
2. **API 已生成**：在目标前端实现仓库中，按其既有的手动代码生成命令（例如 `pnpm generate:api`）刷新 API；本 Harness 不配置、不执行该命令，也不把它加入 CI。
3. **了解 OpenAPI**：查看 Freeze 记录、JSON 派生记录和 `openapi/openapi.json` 了解接口定义；不得把 JSON 或生成 TypeScript 当成可手改的源文件。

## 契约输入与生成链

客户端重新生成只能走下列受控链路：

```text
冻结的 OpenAPI YAML
  → 锁定的 redocly bundle 生成 openapi.json
  → 原样物化到目标前端
  → 既有前端代码生成流程（由目标项目手动执行）
  → 类型检查与调用方验证
```

1. 读取 `yss-openapi-governance` 产出的 OpenAPI Freeze 记录和 `docs/.scratch/<feature>/api/<feature>-json-export.md`；确认 YAML SHA-256、JSON SHA-256、Redocly CLI 版本、lockfile 引用和 JSON 校验均通过。治理 JSON 的唯一产物路径是 `docs/.scratch/<feature>/api/<feature>.json`。
2. JSON 导出由 `yss-openapi-governance` 负责。`api-integration` 只接受该 skill 留下的派生记录；记录中的锁定 `redocly bundle` 命令是治理导出证据，不是前端集成任意重跑的入口。
3. **受控交接**：若前端实现仓库需要本地输入，批准的 Cross-repo 子合同或项目脚本只能将上述治理 JSON 原样物化为 `<frontend>/openapi/openapi.json`；物化后的 SHA-256 必须与派生记录一致。禁止从 URL、Draft YAML、后端运行时或任意本地文件临时替换输入。
4. `api-integration` 只核对 JSON 派生记录、交接路径和 SHA-256，并把原始 JSON 交给既有前端代码生成流程；本 Harness 不读取或修改目标前端的生成器配置，不在此仓库执行生成，也不建立生成 CI 门禁。若 JSON SHA 与派生记录不一致，停止交接并回到治理流程。
5. 目标前端项目在需要时手动运行其既有生成命令、类型检查和受影响组件 / API 测试；将实际命令、结果、生成输入 SHA 和偏离写入 `YSS Skill Execution Result`。

## 📁 API 文件结构

```
packages/src/api/
├── generated/              # Orval 自动生成（不要手动修改）
│   ├── api.ts              # API 函数定义
│   └── model.ts            # 类型定义
├── mutator.ts              # 自定义 Axios 实例
└── index.ts                # API 导出入口
```

## 🚀 使用步骤

### 1. 查看可用 API

打开 `packages/src/api/generated/api.ts` 查看所有可用的 API 函数。

**示例**：

```typescript
// 自动生成的 API 函数
export const getQualityIssueList = (params: GetQualityIssueListParams) => {
  return axios.get<QualityIssueListResponse>("/api/xxx/issues", { params });
};
```

### 2. 导入 API（推荐方式）

**方式 1：从生成的 API 直接导入（推荐）**

```typescript
import { getQualityIssueList, createQualityIssue } from "@/api/generated/api";

// 使用
const fetchData = async () => {
  const res = await getQualityIssueList({ page: 1, pageSize: 20 });
  return res.data;
};
```

**方式 2：通过语义化 API 对象**

如果项目配置了语义化导出（如 `qualityApi`），可以使用：

```typescript
import { qualityApi } from "@/api";

// 使用
const fetchData = async () => {
  const res = await qualityApi.getIssueList({ page: 1, pageSize: 20 });
  return res.data;
};
```

### 3. 错误处理

**统一错误处理模式**：

```typescript
import { message } from "ant-design-vue";
import { getQualityIssueList } from "@/api/generated/api";

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getQualityIssueList({ page: 1 });
    dataList.value = res.data.list;
    total.value = res.data.total;
  } catch (error) {
    console.error("加载质检问题列表失败:", error);
  } finally {
    loading.value = false;
  }
};
```

### 4. TypeScript 类型

**使用生成的类型**：

```typescript
import type {
  QualityIssueListItem,
  CreateQualityIssueRequest,
} from "@/api/generated/model";

// 在组件中使用
const dataList = ref<QualityIssueListItem[]>([]);

const formData = reactive<CreateQualityIssueRequest>({
  title: "",
  description: "",
});
```

### 5. 完整示例

```typescript
import { ref, reactive } from "vue";
import { message } from "ant-design-vue";
import {
  getQualityIssueList,
  createQualityIssue,
  updateQualityIssue,
  deleteQualityIssue,
} from "@/api/generated/api";
import type {
  QualityIssueListItem,
  CreateQualityIssueRequest,
  GetQualityIssueListParams,
} from "@/api/generated/model";

export function useQualityIssueApi() {
  const dataList = ref<QualityIssueListItem[]>([]);
  const loading = ref(false);
  const total = ref(0);

  const query = reactive<GetQualityIssueListParams>({
    page: 1,
    pageSize: 20,
  });

  /**
   * 加载列表
   */
  const fetchList = async () => {
    loading.value = true;
    try {
      const res = await getQualityIssueList(query);
      dataList.value = res.data.list;
      total.value = res.data.total;
    } catch (error) {
      message.error("加载失败");
    } finally {
      loading.value = false;
    }
  };

  /**
   * 创建
   */
  const create = async (data: CreateQualityIssueRequest) => {
    try {
      await createQualityIssue(data);
      message.success("创建成功");
      return true;
    } catch (error) {
      message.error("创建失败");
      return false;
    }
  };

  /**
   * 更新
   */
  const update = async (id: number, data: CreateQualityIssueRequest) => {
    try {
      await updateQualityIssue(id, data);
      message.success("更新成功");
      return true;
    } catch (error) {
      message.error("更新失败");
      return false;
    }
  };

  /**
   * 删除
   */
  const remove = async (id: number) => {
    try {
      await deleteQualityIssue(id);
      message.success("删除成功");
      return true;
    } catch (error) {
      message.error("删除失败");
      return false;
    }
  };

  return {
    dataList,
    loading,
    total,
    query,
    fetchList,
    create,
    update,
    remove,
  };
}
```

## 🧩 useRequest 标准对接能力范围

当任务涉及 API 对接时，本技能默认要求按 `useRequest` 标准组织逻辑。能力范围如下：

- 列表查询：`manual + run`，支持分页、筛选、排序参数治理
- 详情查询：`runAsync` 或 `run`，支持详情打开时懒加载
- 提交流程：`runAsync`，支持新增、编辑、删除、发布、撤销、审批动作
- 并发请求：`runAsync + Promise.all`，支持总览卡片与多源聚合
- 请求生命周期：统一 `loading`、成功提示、失败兜底、回调刷新
- 响应映射：把后端 DTO 转换为页面字段，组件层只消费最终结构

## 🎯 useRequest 适用场景

以下场景应强制使用 `useRequest` 对接 API，而不是在组件中直接 `await`：

- 查询页：表格分页查询、搜索条件变更后重置页码
- 主从页：点击列表行后加载详情
- 弹窗页：提交后关闭弹窗并刷新列表
- 审批流：同意、拒绝、转交、加签、退回、撤销、删除等动作
- 统计页：并发获取趋势、排行、汇总指标

## 🧪 useRequest 标准模板

### 模板 1：分页列表查询

```typescript
const currentParams = ref({
  pageIndex: 1,
  pageSize: 10,
});

const { loading, run: runPage } = useRequest(pageApi, {
  manual: true,
  onSuccess: (res) => {
    tableData.value = res?.data || [];
    pagination.total = res?.totalCount || 0;
  },
  onError: () => {
    tableData.value = [];
    pagination.total = 0;
    message.error("查询失败");
  },
});

const queryList = (extra: Record<string, any> = {}) => {
  currentParams.value = { ...currentParams.value, ...extra };
  runPage(currentParams.value);
};
```

### 模板 2：提交动作请求

```typescript
const { loading: submitLoading, runAsync: runSubmit } = useRequest(submitApi, {
  manual: true,
});

const handleSubmit = async (payload: SubmitCmd) => {
  try {
    const res = await runSubmit(payload);
    if (res?.success) {
      message.success("操作成功");
      queryList();
      return true;
    }
    message.error(res?.message || "操作失败");
    return false;
  } catch {
    message.error("操作失败");
    return false;
  }
};
```


## ✅ 验证清单

- [ ] **导入正确**
  - [ ] 从 `@/api/generated/api` 导入 API 函数
  - [ ] 从 `@/api/generated/model` 导入类型定义

- [ ] **类型安全**
  - [ ] 使用 TypeScript 类型定义
  - [ ] 函数参数类型正确
  - [ ] 返回值类型正确

- [ ] **错误处理**
  - [ ] 使用 try-catch 捕获错误
  - [ ] 使用 message 提示用户
  - [ ] 记录错误日志（console.error）

- [ ] **Loading 状态**
  - [ ] 请求前设置 loading = true
  - [ ] finally 中重置 loading = false

## 🚨 常见错误

### ❌ 错误 1：直接修改生成的文件

```typescript
// ❌ 不要修改 api/generated/ 下的文件
// 下次运行 pnpm generate:api 会被覆盖
```

✅ **正确做法**：在 `api/` 目录外的地方使用生成的 API

### ❌ 错误 2：手写不存在的 API 契约

```typescript
// ❌ 不要为了赶页面进度临时拼路径和 any 类型
request.post("/api/v1/todo/guess", payload as any);
```

✅ **正确做法**：确认 OpenAPI Draft/Freeze 状态；Freeze 后先由 `yss-openapi-governance` 从 YAML 生成并记录 JSON，再运行 `pnpm generate:api`，最后从 `@/api/generated/api` 和 `@/api/generated/model` 导入。

### ❌ 错误 3：缺少错误处理

```typescript
// ❌ 不推荐：没有 try-catch
const fetchData = async () => {
  const res = await getQualityIssueList({ page: 1 });
  dataList.value = res.data;
};
```

✅ **正确做法**：

```typescript
const fetchData = async () => {
  try {
    const res = await getQualityIssueList({ page: 1 });
    dataList.value = res.data;
  } catch (error) {
    message.error("加载失败");
  }
};
```

### ❌ 错误 4：忘记 Loading 状态

```typescript
// ❌ 不推荐：用户不知道正在加载
const fetchData = async () => {
  const res = await getQualityIssueList({ page: 1 });
  dataList.value = res.data;
};
```

✅ **正确做法**：

```typescript
const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getQualityIssueList({ page: 1 });
    dataList.value = res.data;
  } finally {
    loading.value = false;
  }
};
```

## 💡 最佳实践

1. **API 变更先冻结再生成**：

   ```bash
   pnpm generate:api
   ```

   生成前应确认 `docs/.scratch/<feature>/api/<feature>.yaml` 中的 OpenAPI Draft 已完成设计审查并 Freeze，且 `yss-openapi-governance` 已用锁定的 `redocly bundle` 留下对应 JSON 派生记录；随后才运行 `pnpm generate:api`。

2. **封装业务逻辑到 Hook**：
   - 将 API 调用封装在 `hooks/use{Name}Api.ts`
   - 返回状态和方法，便于复用

3. **统一错误提示**：
   - 使用 `message.error()` 而非 `alert()`
   - 错误信息要简洁明了

4. **类型优先**：
   - 充分利用生成的 TypeScript 类型
   - 避免使用 `any`

**最后更新**: 2026-01-28

## 阶段 7 合同

- 只消费冻结的 OpenAPI YAML 派生出的 JSON、生成客户端和批准后的 `Slice Implementation Contract`；实现中的半成品 backend 不得作为稳定 source of truth。
- 客户端重新生成属于 `controlled-generation`；页面请求状态、错误处理、权限和用户交互属于 `behavior-tdd`。
- 必须按统一 `YSS Skill Execution Result` 返回生成客户端引用、调用文件、组件/API 测试、实际 pnpm 验证结果、偏离和 `new_impacts`；发现缺失路径或 schema 变化时暂停并回生命周期。
