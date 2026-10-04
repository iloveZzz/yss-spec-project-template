# OpenAPI 治理步骤

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。仓库脚本与 pnpm 命令从当前登记的项目根目录执行。

## 治理流程

1. **建立或读取 YAML Draft**
   - 读取 Spec、产品设计 / 状态矩阵、架构约束和既有 Freeze 记录。
   - 在 `docs/.scratch/<feature>/api/<feature>.yaml` 创建或更新单一 OAS 3.1 文档；生命周期状态写入相邻 Markdown 记录，不写入 YAML 前置元数据。
   - 所有操作使用稳定、可生成客户端的 `operationId`；页面动作可通过 `x-yss-action-key` 或同路径的追踪矩阵关联。

2. **运行结构与治理校验**
   - 先执行项目 lockfile 锁定版本的 `pnpm exec redocly lint`；CI 可以包装调用，但 validation record 必须记录这条实际命令与退出码。
   - 检查 YAML 可解析、`$ref` 可解析、路径参数完整、operationId 唯一、examples 合法、schema 命名稳定。
   - 从 `.template-spec/api/templates/openapi-draft-validation-record-template.yaml` 创建 `<feature>-validation.yaml`，记录 YAML SHA-256 与 lint 工具链；运行 `scripts/verify-openapi-draft-validation-record --root <project-root> <record>`。自定义解析脚本可以补充诊断，但不能代替锁定的 Redocly lint evidence。
   - 对每个 P0 写模型、配置模型及影响关键交互的读模型建立字段级追踪：`Spec/交互来源 → operationId → request/response schema → property path → 类型与嵌套形状 → create/update requiredness → nullable/default/enum/format → error/test seam`。数组元素使用 `items[].property` 一类稳定 property path。
   - create/update 或其他不同生命周期操作复用同一写 schema 时，逐操作证明 requiredness 与省略语义一致；若不一致，拆分 schema 或明确条件契约。凭据类字段还要说明创建、更新、掩码回显、省略保留与显式清空语义，不能仅凭字段名统一设为必填。
   - 先运行 `scripts/verify-yss-dto-openapi-profile`，并记录 profile 版本；检查 `/api/v1/` 版本策略（或记录例外）。普通采用 YSS wrapper 的接口检查 `x-yss-response-wrapper`、`YssResultMeta` + `allOf` 具体 schema；下载、流式和第三方回调检查其批准媒体类型、状态、Header 和错误边界。按实际协议检查分页、幂等 / 乐观锁和契约测试 seam，不强套 wrapper 或豁免证据。
   - 每个响应按实际协议落成具体 endpoint schema。采用 YSS wrapper 时，`SingleResult` 的 `data` 是具体对象或显式 nullable schema，`MultiResult` / `PageResult` 的 `data` 是数组；Java 的 `SingleResult<T>` / `PageResult<T>` 只能作为语义说明，不能直接写成 OAS type 或 `$ref`。
   - 采用 YSS wrapper 时，`code` 按 profile 只允许 `string | integer | null`，`dataType` 为 `string | null`；采用 YSS 分页协议时，`offset`、`needTotalCount`、`tempTotalCount` 不得进入客户端分页输入。`totalPages` 等计算字段只有目标 HTTP mapper / fixture 证明后才能进入契约。Spec 明确改变认证或授权行为时，把对应 `401` / `403`、资源过滤和错误语义作为普通 API 行为检查。

3. **独立 Draft Review 与 Freeze**
   - 将通过 verifier 且 SHA-256 与当前 YAML 一致的 validation record 交给 `yss-openapi-draft-review`。缺锁定 lint 时可以先做语义预审，但独立 Review 总结果必须为 `Blocked`；不能用“Freeze 前补 lint”支持 `Approved`。
   - YAML、validation record 或 lint ruleset 变化后，旧结构证据与旧 Review 立即失效，必须重新校验和审查。阻断项未关闭前，YAML 仍是 review-only Draft，不得生成生产客户端。
   - Freeze 记录必须引用 YAML 路径、Git ref（如适用）和 YAML SHA-256。冻结后 API 行为变更必须先回到 YAML Draft 与审查。
   - 将同一 YAML 的版本与摘要、validation record、独立 Review 和 Freeze 写入 API Contract Decision（新建 v2；历史 v1 只读兼容，准备与迁移见 `.template-spec/process/contract-reading.md`）。`gate.engineering-contract-approved` 一次批准同时绑定 Technical Design、Data Architecture Decision、API Contract Decision；API `required` 时还必须直接绑定冻结 YAML。不得另造字符串 URI 或仅凭 `status: approved` 关闭门禁。

4. **从冻结 YAML 派生 JSON**
   - 使用 [锁定工具链](locked-toolchain.md) 中的 `redocly bundle` 命令生成 `docs/.scratch/<feature>/api/<feature>.json`，JSON 不纳入人工编辑面。
   - 对输出 JSON 重新执行解析 / lint（按项目工具链），确认 bundle 未产生组件重名冲突或无法解析的引用。
   - 写入 `docs/.scratch/<feature>/api/<feature>-json-export.md`，可从 `.template-spec/api/templates/openapi-json-export-record-template.md` 创建。
   - 记录 YAML SHA-256、JSON SHA-256、OAS 版本、Redocly CLI 版本与 lockfile 引用、完整命令、metafile、`$ref` 例外以及结果。

5. **交给下游前端**
   - 仅当 Freeze、JSON 派生记录和 JSON 校验均通过时，才把派生 JSON 交给 `yss-api-integration` 与目标前端实现仓库。
   - JSON 的治理产物固定为 `docs/.scratch/<feature>/api/<feature>.json`。跨仓库时只能由批准的 Cross-repo 子合同或项目脚本将同一字节内容物化为 `<frontend>/openapi/openapi.json`，并记录两端相同的 SHA-256 与交接路径。
   - 本模板不读取、修改或验证目标前端项目的客户端生成配置，不执行客户端生成，也不把生成动作加入 CI；目标前端项目在需要时手动运行其既有代码生成命令。
   - 接口调整回写 YAML，而不是编辑 JSON 或生成的 TypeScript。
