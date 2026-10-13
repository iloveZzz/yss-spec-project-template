# OpenAPI 治理步骤

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。仓库脚本与 pnpm 命令从当前登记的项目根目录执行。

## 普通任务 API

仅已由 Spec `request_triage.delivery_path` 及支持的 `yss lifecycle route` 判定合格的普通任务使用本段；缺政策或能力的 Profile / 旧 CLI 明确不支持，正式绑定不能降级。

1. 读取普通 Ticket 的目标、验收及工程基线，核对工具绑定的完整 baseline SHA、基线/当前同一 OAS 3.1 YAML 和实际新增 operation。兼容检查必须真实解析旧 operation、可达 `$ref`、路径继承和全局契约，规范化后完全相同；只添加独立 operation。breaking、crossrepo、外部引用或无法证明的解析结果停止受影响实施并升级。
2. 用 lockfile 固定的 Redocly 执行真实 `pnpm exec redocly lint` 和引用解析，完成适用 DTO wire、响应/错误/requiredness 与契约 seam 检查。普通 Ticket API 段保存工具/版本/lock 摘要、实际 argv、exit_code、可读日志及工具返回的独立 `api_digest`；不另建 `<feature>-validation.yaml`，也不调用正式 validation-record verifier 来豁免字段。
3. 独立 `yss-openapi-draft-review` 审查同一 API 候选及需求验收。保留兼容报告、结构与语义结论、审查者身份、`api_digest` 和未关闭项，可直接记录在本 Ticket API 审查段；审查者不得是实现者，lint/兼容失败、阻断项或过期证据不能记 `passed`。
4. 审查通过后在本 Ticket evidence 的 `api.freeze.digest` 锁定 CLI 返回的 `api_digest`（OAS、可达引用、适用 API rules 与工具锁）；不要求另建 Freeze 文件、`ref` 或 `candidate_digest`。Freeze 是字节锁定，不写 `approved` / `ready-for-agent`，不创建 API Contract Decision 或 engineering approval。YAML/引用/工具锁/规则变化使受影响校验、审查和 Freeze 失效；不得只重填摘要沿用旧结论。
5. 实现消费同一 Freeze 摘要，执行当前契约测试和独立代码审查，由 `yss lifecycle verify-daily` 核验。需要 JSON 时才从冻结 YAML 可复现 bundle，并记录 JSON 摘要及解析/lint结果；不手改 JSON 或让它反向成为权威。日志和 review 可引用治理项目中本 Ticket 的唯一正文段，不强制新增各类资产文件；章节摘要规则消费生命周期 [普通任务交付](../../yss-product-lifecycle/references/daily-delivery.md)。

机器字段直接消费当前 CLI 的普通 Ticket evidence 格式：`api.mode`、`baseline`、`candidate`、`new_operations`、`rules`、`tools`、`lint`、`compatibility`、`review`、`freeze` 和 `contract_tests`。非空 `api.rules: [{ref,digest}]` 绑定适用 API 规则，与普通代码 inputs 分开。OAS 文件引用属于实现仓；规则、日志、锁、审查引用按工具要求属于治理项目，Freeze 摘要直接保存在同一 evidence 段。原始文件/段落摘要、`APIContractDigest` 及 `candidate_digest` 各有对象，不相互冒充；未知能力明确不支持，不手写第二套 schema。

API lint/compatibility/review/Freeze 绑定独立 `api_digest`，实现测试/代码 review/contract_tests 绑定整体 `candidate_digest`。仅代码变化不使未变 API 证据失效；重新验证受影响实现即可，不默认重做完整 API 审查或手动重绑定。API/引用/工具锁/适用规则变化使 API 摘要变化，仍重新执行受影响校验、审查和 Freeze。

## governed 治理流程

以下正式资产链及批准协议原义不变，只用于 governed。

1. **建立或读取 YAML Draft**
   - 读取 Spec、产品设计 / 状态矩阵、架构约束和既有 Freeze 记录。
   - 在 `.work/<feature>/api/<feature>.yaml` 创建或更新单一 OAS 3.1 文档；生命周期状态写入相邻 Markdown 记录，不写入 YAML 前置元数据。
   - 所有操作使用稳定、可生成客户端的 `operationId`；页面动作可通过 `x-yss-action-key` 或同路径的追踪矩阵关联。

2. **运行结构与治理校验**
   - 先执行项目 lockfile 锁定版本的 `pnpm exec redocly lint`；CI 可以包装调用，但 validation record 必须记录这条实际命令与退出码。
   - 检查 YAML 可解析、`$ref` 可解析、路径参数完整、operationId 唯一、examples 合法、schema 命名稳定。
   - 从 `.template-spec/api/templates/openapi-draft-validation-record-template.yaml` 创建 `<feature>-validation.yaml`，记录 YAML SHA-256 与 lint 工具链；运行 `scripts/verify-openapi-draft-validation-record --root <project-root> <record>`。自定义解析脚本可以补充诊断，但不能代替锁定的 Redocly lint evidence。
   - 先运行 `scripts/verify-yss-dto-openapi-profile`，并记录 profile 版本；检查 `/api/v1/` 版本策略（或记录例外）。普通采用 YSS wrapper 的接口检查 `x-yss-response-wrapper`、`YssResultMeta` + `allOf` 具体 schema；下载、流式和第三方回调检查其批准媒体类型、状态、Header 和错误边界。按实际协议检查分页、幂等 / 乐观锁和契约测试 seam，不强套 wrapper 或豁免证据。
   - 每个响应按实际协议落成具体 endpoint schema。采用 YSS wrapper 时，`SingleResult` 的 `data` 是具体对象或显式 nullable schema，`MultiResult` / `PageResult` 的 `data` 是数组；Java 的 `SingleResult<T>` / `PageResult<T>` 只能作为语义说明，不能直接写成 OAS type 或 `$ref`。
   - 采用 YSS wrapper 时，`code` 按 profile 只允许 `string | integer | null`，`dataType` 为 `string | null`；采用 YSS 分页协议时，`offset`、`needTotalCount`、`tempTotalCount` 不得进入客户端分页输入。`totalPages` 等计算字段只有目标 HTTP mapper / fixture 证明后才能进入契约。Spec 明确改变认证或授权行为时，把对应 `401` / `403`、资源过滤和错误语义作为普通 API 行为检查。

3. **独立 Draft Review 与 Freeze**
   - 将通过 verifier 且 SHA-256 与当前 YAML 一致的 validation record 交给 `yss-openapi-draft-review`。缺锁定 lint 时可以先做语义预审，但独立 Review 总结果必须为 `Blocked`；不能用“Freeze 前补 lint”支持 `Approved`。
   - YAML、validation record 或 lint ruleset 变化后，旧结构证据与旧 Review 立即失效，必须重新校验和审查。阻断项未关闭前，YAML 仍是 review-only Draft，不得生成生产客户端。
   - Freeze 记录必须引用 YAML 路径、Git ref（如适用）和 YAML SHA-256。冻结后 API 行为变更必须先回到 YAML Draft 与审查。
   - 将同一 YAML 的版本与摘要、validation record、独立 Review 和 Freeze 写入 API Contract Decision（新建 v2；历史 v1 只读兼容，准备与迁移见 `.template-spec/process/contract-reading.md`）。`gate.engineering-contract-approved` 一次批准同时绑定 Technical Design、Data Architecture Decision、API Contract Decision；API `required` 时还必须直接绑定冻结 YAML。不得另造字符串 URI 或仅凭 `status: approved` 关闭门禁。

4. **从冻结 YAML 派生 JSON**
   - 使用 [锁定工具链](locked-toolchain.md) 中的 `redocly bundle` 命令生成 `.work/<feature>/api/<feature>.json`，JSON 不纳入人工编辑面。
   - 对输出 JSON 重新执行解析 / lint（按项目工具链），确认 bundle 未产生组件重名冲突或无法解析的引用。
   - 写入 `.work/<feature>/api/<feature>-json-export.md`，可从 `.template-spec/api/templates/openapi-json-export-record-template.md` 创建。
   - 记录 YAML SHA-256、JSON SHA-256、OAS 版本、Redocly CLI 版本与 lockfile 引用、完整命令、metafile、`$ref` 例外以及结果。

5. **交给下游前端**
   - 仅当 Freeze、JSON 派生记录和 JSON 校验均通过时，才把派生 JSON 交给 `yss-api-integration` 与目标前端实现仓库。
   - JSON 的治理产物位于配置的功能包根（示例 `.work/<feature>/api/<feature>.json`）。跨仓库时只能由批准的 Cross-repo 子合同或项目脚本将同一字节内容物化为 `<frontend>/openapi/openapi.json`，并记录两端相同的 SHA-256 与交接路径。
   - 本模板不读取、修改或验证目标前端项目的客户端生成配置，不执行客户端生成，也不把生成动作加入 CI；目标前端项目在需要时手动运行其既有代码生成命令。
   - 接口调整回写 YAML，而不是编辑 JSON 或生成的 TypeScript。
