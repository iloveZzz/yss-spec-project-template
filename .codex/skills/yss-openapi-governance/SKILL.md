---
name: yss-openapi-governance
description: "维护、校验、冻结或导出 YSS OpenAPI 3.1 设计合同；以冻结 YAML 生成受审查的 JSON。"
---

功能包根只从 `.template-spec/agents/issue-tracker.md` 的 `tracker.root` 读取；本文 `.work/` 路径是新项目示例，已有项目沿用已配置的根。

# YSS OpenAPI Governance

先消费已判定的交付路径；本技能不自行授予 `daily`。只有当前 Profile 的 `request_triage.delivery_path` 已启用且固定 CLI 支持 `yss lifecycle route|verify-daily` 时可使用普通路径；缺政策或能力的 Profile / 旧 CLI 明确不支持。本任务的正式绑定保留 `governed`。正式资产按 `.template-spec/process/contract-reading.md` 阅读，普通任务直接消费其 API 段和权威 YAML。

本 skill 负责 YSS OpenAPI 的 **YAML-first** 工作流：

```text
Spec / 设计输入 → OpenAPI YAML Draft → 审查与 Freeze → JSON 派生物 → 下游既有前端代码生成流程
```

`governed` 的 `.work/<feature>/api/<feature>.yaml`，或普通任务绑定的既有项目 OAS YAML，是各自唯一权威的 OpenAPI 3.1 契约；普通小改不为了目录约定搬迁现有合同。JSON 只能由冻结后的 YAML 可复现地产生，用于前端代码生成或分发；不得手写、不得反向覆盖 YAML、不得把运行时代码当成设计契约来源。

YSS DTO 的可复用 HTTP/JSON 映射由 `.agents/skills/yss-dto/references/openapi-wire-profile.yaml` 单一维护。它描述公开 wire shape，不是 Java 字段或 getter 清单；本 skill 必须消费 profile，不能在治理文档、feature YAML 和 JSON 中各自发明 `SingleResult`、`PageResult` 或 `PageQuery` 字段表。

先识别当前批准协议：普通已采用 YSS wrapper 的 HTTP/JSON 接口按 wire profile 检查；下载、流式和第三方回调按批准契约检查媒体类型、状态、Header、错误及权限边界，不强套 wrapper。协议差异须有可读依据，不能以“特殊接口”为由豁免 Draft、审查、Freeze 或验证。

编写接口说明或契约评审交接正文时，按 `lifecycle-document-output` 条件调用 `i-have-adhd`，读取 `.template-spec/process/document-writing.md` 的共用写法及工程契约指引。作用域仅限当前产物；派发时传递条件及引用，协议标识、schema、冻结状态和验证记录按原合同保存。

## 边界与职责

普通 API 小改执行 [普通 API 交付步骤](references/governance-workflow.md#普通任务-api)。只允许 CLI 能证明旧 operation 及其可达引用、路径继承和全局契约规范化完全相同的新增独立 operation；unknown、breaking 或跨仓停止受影响实施并进入 `governed`。普通 Ticket 的 API 段保留 YAML Draft、锁定 lint / refs / YSS wire、兼容检查、独立语义审查、当前摘要 Freeze 和契约测试；不强制另建 validation YAML、API Contract Decision、工程批准包或 Slice，不写 `approved` / `ready-for-agent`。以下独立正式资产及阶段要求用于 `governed`，技术校验仍按实际 API 影响适用。

使用 `yss-openapi-governance`：

- 基于冻结前的 Spec、产品设计、架构约束创建或更新 `.work/<feature>/api/<feature>.yaml`。
- 保证 YAML 是单一 YAML document、根节点为 `openapi: 3.1.0`，且不把 `pipeline`、`stage`、`status`、`owner` 等生命周期元数据写入 OpenAPI 根节点。
- 采用 YSS wrapper / 分页协议时，按 `yss-dto` wire profile 校验 `com.yss.cloud.dto.result` canonical 包、`YssResultMeta` 公共字段、具体 wrapper schema、请求 / 响应方向和分页负向字段；其他批准协议记录适用性及实际契约检查。
- 运行受项目 lockfile 约束的 lint / bundle，检查 `$ref`、operationId、响应包装、错误、分页、幂等和契约测试 seam；只有 Spec 明确改变认证或授权行为时才检查对应契约。
- 在 `.work/<feature>/api/<feature>-validation.yaml` 持久化结构校验记录，并用 `scripts/verify-openapi-draft-validation-record` 复核当前 YAML SHA-256、锁定的 Redocly 版本、实际命令、退出码、执行时间和证据引用。
- 在 OpenAPI Freeze 后，用锁定的 Redocly CLI 将 YAML bundle 为 JSON，并记录可重现证据。
- 维护治理记录、Freeze 记录和 JSON 派生记录。
- 在技术分析中生成 API Contract Decision（版本与历史兼容见下文第 3 步）：有 API 影响时以原始字节摘要闭包绑定权威 YAML、Validation、独立 Draft Review 和 Freeze；无 API 影响时绑定影响评估、明确原因和至少一项可读证据，且不得生成空占位资产。
- Spec Delta 影响存在时，在 `.work/<feature>/spec-delta/` 记录与冻结 YAML 的关系；没有影响时明确记录 `not-applicable`。

不使用本 skill 来替代：

- `yss-openapi-draft-review`：独立、fail-closed 的语义评审与 P0 追踪。
- `yss-api-integration`：消费已派生的 JSON，并在目标前端实现仓库中接入既有客户端生成流程。
- `to-tickets`：在 Freeze 后正式化垂直切片。

## 受控工具链

执行 lint / bundle 前读取 [锁定工具链](references/locked-toolchain.md)。只用项目 pnpm lockfile 固定的 Redocly；默认 `$ref` 限本 feature API 目录，例外先登记。

## 治理流程

当前任务涉及 Draft、结构校验、Review / Freeze 或派生交接时，读取 [治理分阶段步骤](references/governance-workflow.md) 中当前路径的步骤。两条路径均保持 Draft → 校验 → 独立 Review / Freeze → 必要 JSON → 实现/测试，任何前置证据缺失不得越过。前端 profile 仅消费后端权威，不能执行后端批准或自行启用普通路径。

## 阻断规则

以下通用技术条件阻断两条路径的 Freeze / JSON 导出；其中独立 validation YAML / verifier 只适用于 `governed`，普通任务对应核验同一 Ticket API 段的当前 lint、引用、wire、兼容、独立审查及摘要证据。若：

- YAML 不是单一 OAS 3.1 document，或其根节点混入生命周期元数据。
- YAML / `$ref` / lint 不通过，operationId 不稳定或不唯一，或路径参数、schema、examples 无法解析。
- `<feature>-validation.yaml` 缺失、verifier 失败、记录的 YAML SHA-256 与当前字节不一致，或 Redocly 未由 pnpm lockfile 锁定。
- P0 操作缺请求、响应、错误、并发 / 幂等规则或可验证 seam；Spec 明确的认证或授权行为没有契约表示。
- P0 写模型、配置模型或关键交互读模型没有追到 property path、嵌套形状、requiredness、约束、来源和 test seam；跨操作复用 schema 却没有证明省略与必填语义一致。
- `$ref` 超出允许范围，或转换器版本、lockfile、命令、输入 YAML 无法识别。
- `scripts/verify-yss-dto-openapi-profile` 失败、profile 版本未记录，或采用 YSS wrapper 的 Draft 响应未按 profile 建模 `x-yss-response-wrapper`、`YssResultMeta` / `allOf` 和具体 `data` schema。
- 新的 YSS wrapper 契约引入 `com.yss.cloud.dto.response`、把 Java 泛型文字当成 OAS schema、把全局 `code` 放宽为任意 object，或采用 YSS 分页协议的接口把 `offset` / `needTotalCount` / `tempTotalCount` 作为客户端字段。
- `totalPages`、任何 computed getter 或 Lombok / `@JsonIgnore` 推导字段没有目标 mapper identity、代表性序列化 fixture 和 contract-test / 等价 HTTP 证据。
- Freeze 记录、YAML SHA-256、JSON SHA-256、JSON 解析 / lint 证据缺失。
- JSON 被手工编辑，或生成结果试图反向成为 YAML 的权威来源。

## 输出契约

执行治理或导出时，按 [输出契约](references/governance-output.md) 记录 YAML 权威、当前校验证据、JSON 派生与交接。不能只给自然语言完成声明；未冻结时不生成可供实现消费的 JSON。

`governed` API Contract Decision 可用 `scripts/api-contract-decision prepare` 自动生成来源摘要；v1 显式迁移用 `migrate --version <新版本> --output <新路径>`。候选保持 draft，审查、Freeze 绑定和工程契约批准仍由现有生命周期核验；普通 API 小改不为了这些字段生成正式工程资产。
