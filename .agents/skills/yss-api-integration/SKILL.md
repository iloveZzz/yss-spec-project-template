---
name: yss-api-integration
description: 指导在 Vue3 业务列表、表单、详情和操作 Hook 中集成 Orval API，覆盖真实生成产物选择、mutator 响应契约、错误提示、加载状态、请求选项和长整型精度；当页面对接查询、新增、编辑、删除、详情或文件流接口时使用。
---

# API 集成 Skill

本目录是 API 集成的 canonical 技能；历史名称 `api-integration` 仅通过注册表和 实现合同编译器 alias 解析，不再维护第二份内容。

目录、frontmatter、注册表 ID 和 实现合同编译器 canonical 闭包键均为 `yss-api-integration`；历史名称 `api-integration` 只在注册表和 实现合同编译器 alias 表中解析为本技能。

## 📋 目标

帮助 AI 正确使用基于 **Orval** 生成的 API 客户端：

- ✅ 正确导入 API 函数
- ✅ 统一错误处理与 Toast 门禁
- ✅ Loading 状态管理
- ✅ 长整型 ID 精度保持
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

## 真实 mutator 响应契约

当前微应用模板的 `mutator.ts` 行为是：

- 普通 JSON 响应直接返回 `response.data`。
- 当 JSON 对象显式包含 `success === false` 时，拦截器调用全局业务错误提示并 `Promise.reject(error)`。
- HTTP 4xx/5xx 和网络错误由全局 `handleErrorResponse` 提示后继续 reject。
- Blob 成功响应返回 `{ data, headers }`；HTTP 错误中的 Blob JSON 由全局错误处理器解析。
- 当前 mutator **不会**检测 HTTP 200 Blob 内包装的 `success === false` JSON；这种契约必须先改为合理的 HTTP 错误状态，或在 mutator 中统一补齐，不得让每个业务 Hook 各自解析。

## 硬约束（禁止/必须）

- 禁止对普通 Orval 请求结果使用 `if (res?.success)` 或 `if/else` 判断业务成功；`success === false` 已被 reject，`await` 继续执行即为成功。
- 禁止在 `else` 或 `catch` 中重复调用 `message.error`、`notification.error` 或项目的错误 Toast。
- Hook 可在 `catch` 中清理局部数据、记录错误状态或阻止继续执行，但不重复展示错误。
- 只有显式传入 `skipBusinessError: true` 或 `skipErrorHandler: true` 时，业务代码才能在 `catch` 中实现自定义错误交互。
- 成功 Toast 必须放在 `await` 之后，不得放在 `finally` 或无条件分支中。
- loading 必须在 `finally` 中恢复；需要阻止未处理 reject 时，在 Hook 内捕获并仅维护状态。

## Orval 生成与导入

生成链路通常为：

```bash
pnpm generate:api
# orval → schema cleanup → 可选的导出扁平化 → prettier
```

必须先打开生成文件确认导出：

- 已存在模块级具名 API 函数时，优先具名导入。
- 如果当前产物只导出 `getXxxApi()` 工厂，在**模块顶层**创建一次实例；禁止每次 Hook 初始化或每次请求都重新调用工厂。
- 不得根据文档示例假定工厂一定名为 `getApi()`；Orval `title` 配置会影响真实名称。
- 请求/响应 DTO 必须从当前生成的 `schemas` 导入，禁止重复声明。

## 标准代码骨架

以微应用的真实 `getApiApi()` 产物为例：

```typescript
import { reactive, ref } from 'vue';
import { getApiApi } from '@/api/generated/quality';
import type { QualityBusinessRuleVO, QualityRulePage } from '@/api/generated/quality/schemas';

const { pageQualityRule } = getApiApi();

/** 管理质量规则列表请求和分页状态。 */
export const useQualityRuleList = () => {
  const loading = ref(false);
  const dataList = ref<QualityBusinessRuleVO[]>([]);
  const query = reactive<QualityRulePage>({ pageIndex: 1, pageSize: 20, ruleName: '' });
  const total = ref(0);

  /** 加载规则列表。 */
  const fetchData = async (): Promise<void> => {
    loading.value = true;
    try {
      const res = await pageQualityRule(query);
      dataList.value = res.data ?? [];
      total.value = res.totalCount ?? 0;
    } catch {
      dataList.value = [];
      total.value = 0;
    } finally {
      loading.value = false;
    }
  };

  return { loading, dataList, query, total, fetchData };
};
```

> 如果所在项目已生成 `pageQualityRule` 具名导出，直接导入该函数，删除上面的工厂实例行。

## 长整型与数值类型

`JSONbig({ storeAsString: true })` 会把超出 JavaScript 安全整数范围的整数保留为字符串；**不会把所有普通 number 都转成字符串**。分页页码、状态值、普通小数和安全范围整数仍可按真实类型计算。

硬约束：

- ID、雪花 ID、长整型业务键一旦运行时为字符串，必须原样透传和比较，禁止 `Number()`、`parseInt()`、一元 `+` 或位运算转回 number。
- 优先修正 OpenAPI，将可能超过 `Number.MAX_SAFE_INTEGER` 的 ID 声明为 `string`；不得以 `as unknown as number` 长期掩盖错误契约。
- 普通数值计算按生成类型执行；金额或高精度计算使用 `decimal.js`/`big.js` 并以字符串入参。

```typescript
// ❌ 长整型 ID 会丢失精度
await detailQualityRule(Number(row.id));

// ✅ 保持 ID 的字符串契约
await detailQualityRule(row.id);

// ✅ 页码等普通数值仍使用 number
query.pageIndex = pagination.current;
```

## 自定义请求选项

Orval 配置 `options: true` 后，生成方法的最后一个可选参数会透传给 `customInstance`。必须先检查当前生成函数签名。

- `skipBusinessError?: boolean`：仅跳过 `success === false` 的全局业务提示，请求仍 reject。
- `skipErrorHandler?: boolean`：跳过业务错误与 HTTP/网络错误的全局提示，请求仍 reject。
- Axios 原生选项：`responseType`、`headers`、`timeout`、`signal`、`onUploadProgress`、`onDownloadProgress` 等均在该参数顶层传入。

```typescript
try {
  await addQualityRule(values, { skipBusinessError: true });
} catch (error) {
  // 只有显式跳过全局业务提示时，才在此实现自定义错误交互。
  showCustomError(error);
}

const controller = new AbortController();
await pageQualityRule(query, { signal: controller.signal, timeout: 120000 });
```

## 交付检查清单

- [ ] 已检查 Orval 配置、生成文件和 mutator 真实实现。
- [ ] 使用生成 DTO，未手写重复接口类型。
- [ ] 优先使用真实具名导出；只有工厂时仅在模块顶层创建一次。
- [ ] 没有 `if (res?.success)` 冗余分支，没有在 `else/catch` 重复错误 Toast。
- [ ] 成功后逻辑仅在 `await` 成功后执行，loading 在 `finally` 恢复。
- [ ] 长整型 ID 保持字符串，普通 number 没有被错误当成字符串。
- [ ] 特殊错误交互已显式传入 skip 选项，未默认关闭全局处理。
- [ ] 文件流已按 `file-export-download` 核对 Blob、响应头和错误链路。

## 失败兜底策略

- 生成导出与 skill 示例不同时，以生成文件为准并更新生成脚本，禁止绕过类型检查猜名调用。
- 接口字段不稳定时，在 Hook API 边界做最小映射，不把兼容逻辑散落到模板。
- HTTP 200 Blob 业务错误时，先修复后端状态码或 mutator 统一解析，禁止在业务 Hook 重复实现。

## 阶段 7 合同

- 只消费冻结的 OpenAPI YAML 派生出的 JSON、生成客户端和批准后的 `Slice Implementation Contract`；实现中的半成品 backend 不得作为稳定 source of truth。
- 客户端重新生成属于 `controlled-generation`；页面请求状态、错误处理、权限和用户交互属于 `behavior-tdd`。
- 必须按统一 `YSS Skill Execution Result` 返回生成客户端引用、调用文件、组件/API 测试、实际 pnpm 验证结果、偏离和 `new_impacts`；发现缺失路径或 schema 变化时暂停并回生命周期。
