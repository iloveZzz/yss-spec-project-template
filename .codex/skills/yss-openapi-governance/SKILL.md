---
name: yss-openapi-governance
description: Use when creating, governing, linting, freezing, or exporting YSS OpenAPI 3.1 design-time contracts. The frozen YAML is the only authority; this skill produces the reviewed JSON derivative consumed by frontend client generation.
---

# YSS OpenAPI Governance

本 skill 负责 YSS OpenAPI 的 **YAML-first** 工作流：

```text
Spec / 设计输入 → OpenAPI YAML Draft → 审查与 Freeze → JSON 派生物 → 下游既有前端代码生成流程
```

`docs/.scratch/<feature>/api/<feature>.yaml` 是唯一权威的 OpenAPI 3.1 契约。JSON 只能由冻结后的 YAML 可复现地产生，用于前端代码生成或分发；不得手写、不得反向覆盖 YAML、不得把运行时代码当成设计契约来源。

YSS DTO 的可复用 HTTP/JSON 映射由 `.agents/skills/yss-dto/references/openapi-wire-profile.yaml` 单一维护。它描述公开 wire shape，不是 Java 字段或 getter 清单；本 skill 必须消费 profile，不能在治理文档、feature YAML 和 JSON 中各自发明 `SingleResult`、`PageResult` 或 `PageQuery` 字段表。

## 边界与职责

使用 `yss-openapi-governance`：

- 基于冻结前的 Spec、产品设计、架构约束创建或更新 `docs/.scratch/<feature>/api/<feature>.yaml`。
- 保证 YAML 是单一 YAML document、根节点为 `openapi: 3.1.0`，且不把 `pipeline`、`stage`、`status`、`owner` 等生命周期元数据写入 OpenAPI 根节点。
- 按 `yss-dto` wire profile 校验 `com.yss.cloud.dto.result` canonical 包、`YssResultMeta` 公共字段、具体 wrapper schema、请求 / 响应方向和分页负向字段。
- 运行受项目 lockfile 约束的 lint / bundle，检查 `$ref`、operationId、响应包装、错误、分页、幂等和契约测试 seam；只有 Spec 明确改变认证或授权行为时才检查对应契约。
- 在 OpenAPI Freeze 后，用锁定的 Redocly CLI 将 YAML bundle 为 JSON，并记录可重现证据。
- 维护治理记录、Freeze 记录和 JSON 派生记录。
- Spec Delta 影响存在时，在 `docs/.scratch/<feature>/spec-delta/` 记录与冻结 YAML 的关系；没有影响时明确记录 `not-applicable`。

不使用本 skill 来替代：

- `yss-openapi-draft-review`：独立、fail-closed 的语义评审与 P0 追踪。
- `yss-api-integration`：消费已派生的 JSON，并在目标前端实现仓库中接入既有客户端生成流程。
- `to-tickets`：在 Freeze 后正式化垂直切片。

## 受控工具链

在持有冻结 YAML 与派生记录的项目工作区中，将 `@redocly/cli` 固定在 `devDependencies` 并提交对应的 pnpm lockfile。使用项目脚本或下列等价命令；不得使用浮动 `npx --yes`、全局安装或未记录版本的转换器。

```bash
pnpm exec redocly lint docs/.scratch/<feature>/api/<feature>.yaml

pnpm exec redocly bundle \
  docs/.scratch/<feature>/api/<feature>.yaml \
  --output docs/.scratch/<feature>/api/<feature>.json \
  --ext json \
  --component-renaming-conflicts-severity=error \
  --metafile docs/.scratch/<feature>/api/<feature>.bundle-metafile.json
```

默认 bundle 保留内部 `$ref`，不要为图省事加入 `--dereferenced`；递归模型或循环引用需要保留其可表示的 `$ref` 结构。若项目将命令包装为 `pnpm openapi:bundle`，该脚本必须实际执行上述 `redocly bundle` 语义，并在记录中写明脚本和已锁定的包版本。

`$ref` 默认只允许引用本 feature API 目录内的相对文件；禁止远程 URL、绝对路径以及越出该目录的路径遍历。需要共享组件或例外时，先在治理 / 架构记录中列出允许位置、所有者与 Freeze 影响，再执行 bundle。

## 治理流程

1. **建立或读取 YAML Draft**
   - 读取 Spec、产品设计 / 状态矩阵、架构约束和既有 Freeze 记录。
   - 在 `docs/.scratch/<feature>/api/<feature>.yaml` 创建或更新单一 OAS 3.1 文档；生命周期状态写入相邻 Markdown 记录，不写入 YAML 前置元数据。
   - 所有操作使用稳定、可生成客户端的 `operationId`；页面动作可通过 `x-yss-action-key` 或同路径的追踪矩阵关联。

2. **运行结构与治理校验**
   - 先执行项目锁定的 `pnpm exec redocly lint` 或等价 CI 脚本。
   - 检查 YAML 可解析、`$ref` 可解析、路径参数完整、operationId 唯一、examples 合法、schema 命名稳定。
   - 先运行 `scripts/verify-yss-dto-openapi-profile`，并记录 profile 版本；检查 `/api/v1/` 版本策略（或记录例外）、`x-yss-response-wrapper`、`YssResultMeta` + `allOf` 具体 schema、统一错误结构、分页、幂等 / 乐观锁和契约测试 seam。
   - 每个响应都必须落成具体 endpoint schema：`SingleResult` 的 `data` 是具体对象或显式 nullable schema，`MultiResult` / `PageResult` 的 `data` 是数组；Java 的 `SingleResult<T>` / `PageResult<T>` 只能作为语义说明，不能直接写成 OAS type 或 `$ref`。
   - `code` 按 profile 只允许 `string | integer | null`，`dataType` 按 profile 为 `string | null`；`offset`、`needTotalCount`、`tempTotalCount` 不得进入客户端分页输入；`totalPages` 只有目标 HTTP mapper / fixture 证明后才能进入契约。Spec 明确改变认证或授权行为时，把对应 `401` / `403`、资源过滤和错误语义作为普通 API 行为检查。

3. **独立 Draft Review 与 Freeze**
   - 将 fresh lint 证据交给 `yss-openapi-draft-review`；阻断项未关闭前，YAML 仍是 review-only Draft，不得生成生产客户端。
   - Freeze 记录必须引用 YAML 路径、Git ref（如适用）和 YAML SHA-256。冻结后 API 行为变更必须先回到 YAML Draft 与审查。

4. **从冻结 YAML 派生 JSON**
   - 使用上面的锁定 `redocly bundle` 命令生成 `docs/.scratch/<feature>/api/<feature>.json`，JSON 不纳入人工编辑面。
   - 对输出 JSON 重新执行解析 / lint（按项目工具链），确认 bundle 未产生组件重名冲突或无法解析的引用。
   - 写入 `docs/.scratch/<feature>/api/<feature>-json-export.md`，可从 `docs/api/templates/openapi-json-export-record-template.md` 创建。
   - 记录 YAML SHA-256、JSON SHA-256、OAS 版本、Redocly CLI 版本与 lockfile 引用、完整命令、metafile、`$ref` 例外以及结果。

5. **交给下游前端**
   - 仅当 Freeze、JSON 派生记录和 JSON 校验均通过时，才把派生 JSON 交给 `yss-api-integration` 与目标前端实现仓库。
   - JSON 的治理产物固定为 `docs/.scratch/<feature>/api/<feature>.json`。跨仓库时只能由批准的 Cross-repo 子合同或项目脚本将同一字节内容物化为 `<frontend>/openapi/openapi.json`，并记录两端相同的 SHA-256 与交接路径。
   - 本模板不读取、修改或验证目标前端项目的客户端生成配置，不执行客户端生成，也不把生成动作加入 CI；目标前端项目在需要时手动运行其既有代码生成命令。
   - 接口调整回写 YAML，而不是编辑 JSON 或生成的 TypeScript。

## 阻断规则

阻断 OpenAPI Freeze 或 JSON 导出，若：

- YAML 不是单一 OAS 3.1 document，或其根节点混入生命周期元数据。
- YAML / `$ref` / lint 不通过，operationId 不稳定或不唯一，或路径参数、schema、examples 无法解析。
- P0 操作缺请求、响应、错误、并发 / 幂等规则或可验证 seam；Spec 明确的认证或授权行为没有契约表示。
- `$ref` 超出允许范围，或转换器版本、lockfile、命令、输入 YAML 无法识别。
- `scripts/verify-yss-dto-openapi-profile` 失败、profile 版本未记录，或 Draft 未按 profile 建模 `x-yss-response-wrapper`、`YssResultMeta` / `allOf` 和具体 `data` schema。
- 新契约引入 `com.yss.cloud.dto.response`、把 Java 泛型文字当成 OAS schema、把全局 `code` 放宽为任意 object，或把 `offset` / `needTotalCount` / `tempTotalCount` 作为客户端字段。
- `totalPages`、任何 computed getter 或 Lombok / `@JsonIgnore` 推导字段没有目标 mapper identity、代表性序列化 fixture 和 contract-test / 等价 HTTP 证据。
- Freeze 记录、YAML SHA-256、JSON SHA-256、JSON 解析 / lint 证据缺失。
- JSON 被手工编辑，或生成结果试图反向成为 YAML 的权威来源。

## 输出契约

```markdown
### Governance Result
<Draft / Approved for Freeze / Blocked / JSON Exported>

### YAML Authority
- YAML: <docs/.scratch/<feature>/api/<feature>.yaml>
- OAS: 3.1.0
- YAML SHA-256: <sha256>
- Freeze record: <path / ref>

### Validation
- Lint command and result: <locked pnpm command / result>
- YSS DTO wire profile: <`.agents/skills/yss-dto/references/openapi-wire-profile.yaml`, schema_version, verifier result>
- Wrapper conformance: <`x-yss-response-wrapper`, `YssResultMeta`, `allOf`, concrete data schema, direction and forbidden-field result>
- `$ref` policy / approved exceptions: <details>
- Blocking findings: <file:line grounded finding>

### JSON Derivative
- JSON: <docs/.scratch/<feature>/api/<feature>.json>
- JSON SHA-256: <sha256>
- Redocly CLI / lockfile: <version and lock reference>
- Bundle command and metafile: <command / path>
- JSON validation result: <pass / blocked>

### Downstream Handoff
- Canonical JSON / frontend materialization SHA-256: <same sha / blocked>
- Frontend materialization path: <frontend/openapi/openapi.json / blocked>
- Existing frontend code generation: <manual command in target repository / blocked reason>
- Template boundary: <no frontend configuration, code-generation execution, or CI change>
```
