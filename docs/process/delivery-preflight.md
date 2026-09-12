# 只读交付预检

`scripts/preflight-delivery --input <输入清单> --stage prepare|build|export|accept --json` 在任何初始化、构建或写入接收状态之前读取当前原始资产。它不初始化项目、不运行清单中的命令、不启动服务、不发 HTTP、不解压 ZIP、不生成批准或收据。结构化结果证明本次读取到的前提；执行边界仍须重新验证。

输入采用 [delivery-preflight-input.schema.json](schemas/delivery-preflight-input.schema.json)，输出采用 [delivery-preflight-result.schema.json](schemas/delivery-preflight-result.schema.json)。`schema_version` 均为 1。退出码：当前阶段就绪为 `0`，存在阻断为 `1`，协议、参数或输入语法无效为 `2`。CLI 总是输出 JSON；`--json` 是显式调用标志。库入口为 `await preflightDelivery(input, {stage, root})`，与 CLI 使用同一结果结构。

## 输入与事实来源

- `governance_root` 相对调用工作目录解析；也可显式给绝对治理根。省略时使用库的 `root` 或 CLI 当前工作目录。产品资产只能来自明确的 `project-instance`。`planned_initialization: true` 表示拟初始化目标：列出缺项和正常恢复入口，不猜测身份，也不生成文件。
- `delivery_kind` 可选 `complete`（默认全链诊断）、`strategic-handoff` 或 `backend-delivery`。按事实所有者分流，避免源包的导出反过来依赖消费它的下游合同与交付。两个导出 CLI 会核对并固定自己的类型、治理根和被导出的源文件，不能用另一来源的预检结果放行。
- `scope` 必须给出 `repository_id`、`project_id`、`slice_id` 与非空 `operation_ids`。空清单不能取得就绪结果。`ui_mode` 默认为 `existing-baseline`；显式可选 `prototype` 或带 `ui_not_applicable_reason` 的 `not-applicable`。战略包若实际含 UI 基线，不接受“不适用”覆盖它。
- `architecture_identity` 消费现有身份协议。`architecture_bindings` 使用 `repository_registration`、`engineering_baseline`、`manifest` 三个 `{ref,digest}` 原始引用。先逐份核验身份、来源类型和基本事实，再调用 `verifyArchitectureEvidence` 核对三方及实际 Git/Maven 工程；不存在的生成来源不能伪填。
- `assets` 中各引用采用 `{ref,digest,id?,version?,approval_ref?}`。摘要是当前文件字节的 `sha256:`。需要批准的 API、技术设计、Slice 和 UI 基线须提供资产 ID、版本及原始批准引用，并核验真实决定和当前字节覆盖。
- 所有 `ref` 相对治理根解析，拒绝路径越界、symlink 和远程地址。UI 证据包内部引用相对其 manifest 所在目录；包内批准可通过战略来源完整复验。

## 阶段与诊断

| 最早阻断阶段 | 当前阶段必须具备的前提 |
|---|---|
| `prepare` | 明确治理身份与根词汇、非空目标范围、受支持架构身份、三份原始来源和实际工程核验 |
| `build` | 上述前提、冻结 OpenAPI、已批准技术设计、已批准且事实源新鲜的 Slice Contract |
| `export` | 上述前提、适用 UI 基线、实际构建制品、部署验证、批准的战略交接来源 |
| `accept` | 上述前提、完整后端交付语义；仅当交付 v2 目标绑定协议启用时要求本地授权 |

后续阶段缺项照样列出，但不阻断当前较早阶段。所有可独立读取的前提都会检查，失败不会遮蔽其他资产问题。依赖缺失使用 `pending`（尚不可判定），不会伪装为成功或衍生大量“错误内容”。缺少部署所绑定的交付依据时，部署的交叉核验为 `pending`；导出前需准备相应交付记录。

上表是 `complete` 的全链诊断。实际导出按以下所有权收敛：

- `strategic-handoff` 核验自身治理根、词汇、源资产批准、handoff 范围和 UI 基线。后端三方身份、技术设计、Slice、构建、部署及后端交付属于下游待履行项，诊断的 `blocking_stages` 为空，不阻断战略导出。仅当清单明确给出冻结 API 资产时额外核验 API；不要求全部战略交接先 Freeze API。
- `backend-delivery` 在 `export` 阶段要求后端交付**源记录**，以它核验部署依据和已经先导出的战略包。源记录不是尚未生成的后端包。UI 与战略来源由绑定的战略包只读验证，不要求后端治理根复制源资产；清单可额外提供，但给出的冲突仍须修正。
- 输入不要求已导出的后端包、当前 `accepted` 记录或尚未生成的接收收据。`accept` 的落地应从包和目标仓原始授权读取候选事实，先完成只读校验，成功后才写新状态；当前两个导入 CLI 保持原协议，不能为复用本清单而强制先存在接收成功记录。

每项诊断包含稳定 `code`、`status`、责任方 `owner`、事实来源 `source`、原始引用 `evidence`、`blocking_stages`、正常恢复路径 `recovery` 和说明 `message`。状态为 `ready`、`missing`、`conflict`、`stale`、`unsupported`、`pending` 或有原因的 `not-applicable`。单项 `ready` 只表示该项，不能替代整体结果。

## 构建、交接与兼容边界

`assets.build` 指向与后端交付协议一致的独立构建记录 `{source_commit,artifact_digest}`；`assets.build_artifact` 绑定实际制品文件，预检读取其字节并与构建摘要核对。这样保持原交付 build 格式，同时验证真实制品。`assets.deployment` 复用 `backend-delivery-verification` 的 `backend-deployment` 记录；逐项核验成功执行时间和原始日志，并与后端交付依据摘要比较，绝不执行记录中的 `command`。

战略来源通过 `inspectSource` 复验。技术设计消费与后端交付复验使用严格 `readOnly: true`；可完整只读验证的目录包正常承接。必须解包或缺少可直接读取的来源布局时，明确返回未就绪及恢复信息；不得悄悄写临时目录或将 ZIP 的摘要相同当作内容验证通过。旧生成式身份和原型仍按原有规则读取，未知版本明确拒绝。预检不把 `verified` profile 自动升级为 `supported`。

`assets.local_authorization` 只随经真实 S3a 验证后启用的目标绑定协议 v2 生效；在协议尚未提供可复用只读验证入口时，预检明确拒绝该未知能力。旧 v1 交付不额外要求尚未启用的本地授权。

## 批准后的实现增量

`export` / `accept` 从 `assets.slice_contract` 的当前持久化字节与本地批准生成进程内受信上下文，再共同传给架构、技术设计和编译新鲜度检查。输入清单不能提交 `execution` JSON；`status: approved`、`approved: true` 或扩大后的路径数组都不能建立权限。上下文在每个消费边界重新读取原始文件，不缓存批准成功结果。

主模板当前将 `gate.slice-contract-approved` 配置为生命周期主控，`approval_ref` 指向现有生命周期 checkpoint：对应 gate 为 `approved`，`subject_ref` 指向本次 Slice；`human_review.implementation` 与 `human_review.user_decisions` 通过已有 `assertImplementationDecision` 核验原始回复、当前合同字节、Ticket、实现仓库、允许写范围和工程基线。不得为该主控 gate 伪造 `approval-record`。来源明确将此 gate 配置为会签时，遵守来源会签协议；当前专用后端同时列入主控及双数字人会签，显式会签规则优先，需要绑定当前合同身份、版本、摘要的批准记录，不能复用主模板 checkpoint。这里复用来源现有批准规则，不另建并行门禁。

既有工程身份 v2 的原始 Slice 必须使用对象形式的 `lifecycle_refs` 和 `readiness`，其中 `ticket`、`engineering_baseline` 为非空引用，`blockers`、`stale_inputs`、`not_applicable` 为数组。数组附加属性在 JSON 序列化后会丢失，因此在批准及预检边界先拒绝该结构；这里不要求运行中生命周期状态的就绪布尔字段，也不改变旧交付最小合同的批准语义。

合法输出增量只在 Slice 批准范围与工程登记允许范围的交集内放行；固定输入身份、登记引用、基线、构建映射或技术设计被替换仍会失效。`evaluateContractFreshness` / `validateExecutionResult` 的当前上下文使用 `approved_slice: {ref,digest,id?,version?,approval_ref}`；验证器自行重读和核验，不接受任意调用方执行许可。

技术设计子进程仅传递原始 `--approved-slice`、`--approved-slice-digest`、`--approved-slice-approval` 绑定，在子进程内重新验证；三项须同时提供。单独传 `--execution '{"approved":true}'` 会被参数解析拒绝。后端交付源码中的 Slice 批准复验也消费相同 helper；可移植导出时，须在正常 `supporting_files` 中包含 checkpoint 引用的实施范围清单、原始决定和相关来源，不能只打包一个批准状态。

工程接入技能在既有 Java/Maven 跨仓接入前运行 `prepare`，补证后重跑。两个导出 CLI 已在外层、任何导出写入之前复验 `export`。v5 的既有 UI 战略导出与包含既有架构身份 v2 的后端导出必须提供 `--preflight-input`；旧路径可选，原批准规则仍独立有效。以下命令中的清单必须绑定对应源文件及其当前摘要：

```sh
scripts/strategic-handoff export --source-root /governance/source --handoff docs/handoff.yaml --output /delivery/strategy-v1 --preflight-input /inputs/strategic-preflight.json
scripts/backend-delivery export --source-root /governance/backend --delivery docs/backend-delivery.yaml --output /delivery/backend-v1 --preflight-input /inputs/backend-preflight.json
```

战略清单设 `delivery_kind: strategic-handoff`，包含 `assets.strategic_handoff` 和 `assets.ui_baseline`；后端清单设 `delivery_kind: backend-delivery`，包含工程、合同、构建、部署和 `assets.backend_delivery` 原始绑定。缺清单时错误给出恢复文档；预检失败保留全部结构化诊断，不创建输出目录。

编译和接收外层可复用此库；不要从本库内部调用的纯验证函数无条件递归调用完整预检。当前纯验证入口包括架构证据、技术设计、战略来源及后端交付检查。

预检使用当前工具安装根的 `harness-profile.yaml` 判定技术验证能力，调用清单的 `governance_root` 不能改变职责。主模板及 `harness.backend-delivery` 验证原始后端技术设计、Slice 与批准后的实现增量；战略及前端 profile 接收已导出的受控包。向后两类 profile 显式传入原始 `technical_design` 或 `slice_contract` 会得到 `PREFLIGHT_TECHNICAL_DESIGN_UNSUPPORTED` / `PREFLIGHT_SLICE_CONTRACT_UNSUPPORTED`，诊断包含源引用、责任人和转交后端的恢复入口，不尝试加载未安装的创作技能。已声明后端能力但分发文件缺失同样阻断，不能被视为验收成功。

`verify-delivery-preflight-scenarios` 在所有 profile 执行共有 CLI、只读、阶段和战略 v5 场景。两类真实 Git 原始工程的 synthetic 机制测试及批准增量测试只在主模板和后端 profile 执行；其他 profile 输出带职责原因的 `not-applicable` 并实测显式技术资产的 unsupported 诊断。此分流不豁免主模板或后端的正例，也不等同于真实产品 S0–S6/O1 验收。

既有 UI 原始基线可保留 `ready-for-human` 字节，由外部产品批准绑定这些当前字节；预检仍必须验证该批准。不能要求先把原始资产改为 `approved` 再沿用旧摘要确认，以免制造批准后的内容漂移。

JSON Schema 批处理按序列化后的 UTF-8 字节长度传输输入，验证器只读取该长度；完整 JSON 到达后不再等待 stdin EOF。截断或非法输入帧返回明确协议错误；同步校验默认 30 秒超时，返回 `JSON_SCHEMA_TIMEOUT`，超时不能记为验证通过。此内部传输保持原 schema 验证语义，不写临时资产或接收状态。共有回归使用真实 Python 验证器和保持写端开启的测试桥，覆盖 Unicode、大输入/错误输出、非法 schema、截断帧与超时。
