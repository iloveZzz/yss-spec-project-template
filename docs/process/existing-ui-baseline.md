# 既有 UI 的受控交接

适用于已有 Vue/前端工程的用户界面、导航、交互、状态与权限体验均无改动的交接。`existing-ui-baseline` 是对实际源码和执行结果的观测包；批准和截图不能将它转换为原型。实际 UI 或后端引起的 UI 体验变化必须回到产品设计与原型流程。

## 事实与原始文件

`existing-ui-baseline.schema.json` 定义 v1 外层合同。独立 `existing-ui-baseline.json` 与所有证据文件放在同一目录；引用均相对此目录，禁止绝对路径、越界和符号链接。未知类型与版本拒绝。

- `source` 绑定登记的 repository/project ID、固定 Git commit、源码快照树摘要、锁文件和独立源码观测 manifest。观测 manifest 为 `schema_version: 1`、`kind: existing-ui-source-observation`，包含相同身份、`source_digest` 和精确 `files: [{path,digest}]`。源码文件集必须与实际快照一致；不得把不属于固定提交的源码标记为该提交。
- `build` 指向原始构建记录：`schema_version: 1`、`source_commit`、`source_digest`、`lock_digest`、实际 `command/executed_at/exit_code`、`evidence: [{ref,digest}]` 及构建输出树 `output: {ref,digest}`。前端优先 `pnpm`；执行记录不能由后续验证器补造。
- `capture` 指向原始浏览器捕获记录：相同源码和执行字段、`build_digest`、`openapi_digest`、`ui_change: none`、原始日志及 `cases`。每个 case 的 route、state、viewport、source_refs、actions、image、api 必须与基线逐项相同。
- 每个 case 将精确源码文件、动作说明、PNG 截图、视口与 API 记录绑定到唯一 `case_id`。API 记录包含 `schema_version: 1`、`case_id`、源码/构建/OpenAPI 摘要以及 `exchanges`；每次交换记录实际 operation ID、method、URL、status、executed_at 及原始 request/response 文件摘要。操作必须存在于冻结 OpenAPI 且 method/path 一致。
- `replay` 是可离线阅读的重放说明，不宣称离线运行真实服务。文件内不得保存访问令牌或个人业务数据；试验用合成数据。

所有文件摘要使用 `sha256:` 加十六进制 SHA-256。源码与构建树使用共享 `treeDigest` 的规范文件清单算法。源码变更、日志替换、锁文件变化、动作/截图/API 不一致均使验证失败。验证只说明输入文件间的绑定和完整性；必须另有实际采集、可审阅原始执行与真实批准，不能凭自洽 JSON 宣称真实运行。

## 当前批准与交接版本

Handoff v5 必须声明 `ui_baseline_kind`。原型分支继续保留 prototype、visual baseline 与离线原型要求；既有 UI 分支只使用 `source.existing_ui_baseline_ref`，不允许混入或伪填原型字段。`package_export` v2 显式绑定相同类型。

既有 UI 引用的 digest 是 `existing-ui-baseline.json` **原字节摘要**。`package_export.approvals.existing_ui_baseline_ref` 沿用源 profile 已有的产品确认门禁（主模板为 `gate.product-design-approved`，战略专职 profile 为 `gate.user-confirmation`）与 `digest_kind: sha256-bytes`；该门禁必须存在于源 `user_decision_policy.gates`。批准主体必须是同一 manifest，使用现有真实用户决定校验。人工确认需在最终可审阅字节准备完成后获得；不得复用旧原型批准、仅改 status 或自签批准。该门禁的原始回复随交接闭包携带。

既有 manifest 的 `status` 表达准备状态，展示后保持其原字节不变。`ready-for-human` 清单可在当前批准记录验证通过后交接；有效批准由现有批准记录及真实用户决定持有，不要求确认后把清单改为 `approved`。结构验证不授予批准，导出、包验证和接收均须核验完整批准链。确认后任何字节改写（包括只改 status）仍使原决定失效。旧原型分支仍要求原型自身为 `approved`，不转换历史批准。

Frontend Strategic Preflight v2 使用 `ui_baseline_kind/ui_baseline_ref`；Frontend Delivery Acceptance v3 使用 `ui_baseline_kind` 与每用例 `baseline_case_ids`。协议必须对应 Handoff v5，禁止降级到 v1 预检或 v1/v2 接收。旧 Handoff v3/v4 及其原型验证不变。

## 运行时入口

- `validateExistingUiBaseline(data,{bundleRoot})` 返回 `{errors}`，校验观测原始文件，不生成或授予批准。
- `ui-baseline.mjs` 导出 `uiBaselineKind`、`uiBaselineRef`、`uiBaselineCaseIds`、`uiBaselineSourceKeys`、`hasConsumerRoutes` 和 `validateHandoffUiBaseline(root,handoff)`。消费者应通过这些入口分派，不散落版本或字段假设。
- `inspectSource` 负责完整交接、门禁和真实决定；export/verify/import 与前端接收复用该验证。
- `openBundle(input,action,{readOnly:true})` 只验已展开的受支持源布局，不写临时文件。ZIP 报 `readonly-extraction-required`，旧布局无法映射时报 `readonly-source-layout-required`，两者都不是已通过。默认模式保留旧包验包兼容性。

机制验证运行 `scripts/verify-existing-ui-baseline-scenarios`，其中数据和决定均明确标记为 synthetic fixture，不能进入真实试验批准链。真实 Java/Vue 闭环、S0–S6 与 O1 由维护主控独立记账。

### 固定 Vite 代理前缀

真实浏览器 URL 可包含冻结 API 路径之外的代理前缀。可选 `api_route_mapping` 仅支持 `kind=vite-env-prefix-rewrite`：同时绑定固定源码中的 Vite 配置和所用模式环境文件，声明 `prefix` 与空 `replacement`。首版识别 `apiBase = env.VITE_API_BASE_URL || '/api'` 及 `proxy[apiBase]` 中 `path.replace(new RegExp(`^${apiBase}`), '')` 的既有约定；环境文件必须唯一声明相同 `VITE_API_BASE_URL`。其他表达式明确拒绝，不能执行包内 JavaScript 或随意删 URL 前缀。

请求保留实际观测 URL。验证仅在完整路径段匹配已绑定前缀后比较冻结路径；未声明映射时沿用完整路径精确匹配。配置、环境、模式和实际启动记录属于基线审阅范围；静态绑定不声称验证任意 JavaScript 的运行语义。历史采集缺少构建输出摘要时保留缺口，不能用后补摘要替代同时期运行证据。
