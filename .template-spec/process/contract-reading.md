# 合同阅读、准备与显式迁移

本文件描述工具入口；阶段、批准和执行门禁仍由 `.template-spec/process/lifecycle-registry.yaml` 及资产所有者定义。显式引用的源资产是权威文件，视图不能编辑、批准合同或授予执行权限。五类生命周期资产的新建 JSON 与旧 YAML 兼容规则见 [结构化资产](structured-assets.md)；Slice 等本轮未迁移合同继续使用原格式。

```sh
scripts/contract view <资产> --kind <类型> [--profile review|task|full] [--unit <ID>] [--json]
scripts/contract diff <旧资产> <新资产> --kind <类型> [--json]
```

默认 `review` 展示目标、非目标、验收、取舍、风险及未决事项，隐藏机器摘要明细，不附带折叠完整 JSON。`task` 保留适用工作单元、执行目录、写边界、Skill、验证、证据和未分类约束；Slice 必须明确 `--unit`。`full` 读取完整权威内容与绑定。三种视图均显示权威身份、版本、完整 SHA-256 和检查范围。批准有效性未核验；执行仍使用原预检和派发入口。来源未提供风险或取舍时明确标记缺口，不推断为无风险。

| 类型 | 资产组 | 阅读后的权威处理入口 |
|---|---|---|
| `plan`、`spec` | Plan、Spec 范围、用户决定 | 生命周期和用户决定校验 |
| `product-design`、`prototype-confirmation`、`visual-baseline` | 产品设计、确认、视觉基线 | 产品设计所有者校验 |
| `technical-design` | 技术设计 | 技术设计校验与生命周期批准 |
| `api-decision`、`data-decision` | API / 数据决定 | 对应决定校验、工程契约批准 |
| `scaffold`、`scaffold-decision` | 脚手架合同、架构选择 | 脚手架所有者及原始用户决定 |
| `slice` | Slice 与工作单元 | `scripts/slice-contract inspect`、原批准与派发 |
| `handoff`、`backend-delivery` | 战略交接、后端交付 | 对应包 / 交付验证器 |
| `approval`、`user-decision`、`context-reconciliation` | 批准记录、原始回复、Context 对账 | 原批准 / 用户决定 / Context 校验 |

通用适配器保留未知字段，只做可读取、适用 schema 和可识别来源绑定核对；不支持结构核验的类型会明确标记。专用资产所有者的业务校验并未被通用视图替代。Markdown 正文完整保留。API v2 审查结果从绑定的实际记录展示。摘要字段变化、数组顺序和纯字节变化均在 diff 中保留，不据此自动认定批准可沿用。

## 准备机器字段

Slice 继续使用 `scripts/slice-contract prepare`。来源的原始字节摘要、版本、别名、Skill 闭包和验证映射由现有准备器生成。共用的 `scripts/lib/contract-source.mjs` 只读取明确选择的来源；冲突报告保留 supplied / observed 和恢复动作，不根据目录猜测授权。其他资产继续使用各自的生成器，不新增项目人员要维护的表单。

API 决定的新结构使用独立 v2 schema，v1 schema 和读取兼容保留：

```sh
scripts/api-contract-decision prepare <来源选择.yaml> --output <新草案.yaml>
scripts/api-contract-decision migrate <已批准v1.yaml> --version v2 --output <新候选.yaml>
```

准备输入包括决定 ID / 版本、影响、评估引用、证据和业务原因；有 API 影响时再给 `openapi.id/ref/version`、`validation_record.ref`、`draft_review.ref` 和 `freeze.version/frozen_at`。摘要自动生成；来源明确但缺失时报告缺口。准备器不能产生批准状态。新路径以排他方式写入；已存在路径不能覆盖。

v2 的 `openapi` 是唯一 Draft 绑定，`draft_review` 只存 `ref/digest`，Freeze 只保存版本和时间；实际结果、阻断项与 Draft 来源从真实审查记录读取。v1/v2 在消费时归一，外部永远绑定原文件 SHA-256。迁移先验证完整 v1，旧审查额外证据合并到顶层，旧文件与旧批准保持原字节。新候选按既有差异及授权延续协议处理，不继承批准。

## 验证阶段与回退

Slice v3 的任务聚焦布局可显式试用 `scripts/contract view <资产> --kind slice --profile task --unit <ID> --task-layout focused`。默认仍为 `legacy`，推广取决于受控对照结果。聚焦布局展示当前工作单元及其验证项关联的验收（包括 `required_for_all`），保留全局、专项和未知约束，并给出完整验收原文件引用。v2 保留原布局，不根据缺失引用裁剪。

恢复入口 `scripts/lifecycle-status --checkpoint <ref> --task <task-package-ref>` 增量返回只读 `recovery`：任务引用、合同 task 视图命令、实际结果引用及恢复顺序。引用由调用方显式选择，不扫描目录猜任务；运行中、未知或版本不符不能重复派发。`not-checked` 和 `execution_authorization: not-evaluated` 保持原义。

预检、准备、派发各自建立私有验证阶段。阶段绑定根目录、用途、切片、工作单元、只读状态；只在本次操作内共享输入和纯校验结果。原始输入不可变，返回给调用者的是独立副本。相同 schema、输入和格式选项复用；外部 `$ref` 未追踪的校验不享受结果复用。Python 引擎、同步 API 和技术设计 Node 边界保留。

成功返回前复核所有登记原字节、目录枚举及不存在项。技术设计子进程自行验证批准，再返回依赖清单；父进程合并读取集合，读取矛盾、遗漏报告或异常均阻断。此清单不是批准上下文。品牌上下文不能序列化、跨仓或从只读升级；在阶段中生成的上下文结束后失效。调用者可传入 `AbortSignal`，已收到的撤回事件须中止当前操作；下一次边界始终重新读取当前批准和回复。未接入读取追踪的消费者保留原检查，不共享结果。

P1 可回用原 `slice-contract` 阅读入口；P2 可回退阶段调用与本次改动的读取适配，恢复完整重复检查；P3 可停止创建 v2，但已生成 v2 的读取能力必须保留。回退后重新验证当前来源和批准，不恢复历史通过状态。

## 默认派发与审阅材料

提供该查询入口的聚合与战略模板中，派发首先用 `scripts/query-lifecycle-context` 一次组合 mode、stage、work-unit 与必要合同子树（`--mode`、`--stage`、`--work-unit`、`--include`）。结果 `sources.lifecycle_registry.sha256` 绑定原始注册表字节，`context_sha256` 绑定规范化查询、实际返回内容及来源；旧 `semantic_sha256` 只绑定稳定 ID 语义。旧结果缺少新增绑定时重新查询，不视作可复用。身份、执行范围和查询来源在同一 `validation-phase` 内读取，返回前变化则失败。

专职交付 Profile 的阶段与 mode 继续由其现有 harness-profile 和主控入口解析，不假定未分发的查询命令存在。实现者默认读取指定 `--unit` 的 `task` 视图，审阅者默认读取 `review`；不要先整读 YAML 再重复生成相同视图。身份、版本、写边界、验收、停止条件、风险与未知约束均须保留，需要追溯时展开 `full`。一次执行边界内可复用未变来源；恢复、交接、实现、合并及发布重新核验。Context Plan 的原始 v2 字段为 `common.context_plan`，原始 v3 为 `scope.context_plan`；`common.context_plan` 在 v3 运行时只是归一化别名，不是修改原 YAML 的位置。

```sh
scripts/contract prepare-review <前资产> <后资产> --kind <类型> [--unit <ID>] [--decision <原决定.yaml>] --json
```

输出来源字节绑定、差异、完整约束、原决定与缺口及恢复动作。`approval_reusable: false`、`execution_allowed: false` 固定不授予批准或执行权；语义等价、风险接受、原回复真实性和批准延续由原审查及决定验证器处理。缺少原决定标记未提供，不能据此沿用批准。

模板正式研究的路由、实际验证及收尾见 [研究收尾协议](research-completion.md)。

## 首批中文阅读页与显式托管

`domain-strategy`、`stage-decision-package`、`checkpoint`、`tracking-migration` 提供专用中文 Markdown。业务原文、稳定 ID、枚举、失败条件、零值、未知字段均保留；旧类型继续使用原有兼容布局。`--json` 保留原接口字段，首批四类可用 `--model --json` 显式获取 `reading_model`；默认不附逐字段索引以减少 Agent 读取成本；`source_pointer` 只用于可直接对应原字段的条目，其他条目使用 `content_pointer`，不冒充原文位置。

源文件是唯一可编辑事实。阅读页是来源快照，不证明当前批准或执行权；`blockers: []` 只表示未登记阻塞。检查点阶段和工作项进度分别展示。原始 Markdown 文档仍由作者维护，JSON/YAML 的机器绑定不因阅读层改写。

```sh
# 只读预览；只读检查不创建文件
scripts/contract view <原资产> --kind domain-strategy
scripts/contract view <历史迁移plan.json> --kind tracking-migration
scripts/contract check-views --checkpoint .work/<feature>/checkpoint.yaml

# 先审阅启用计划，再显式应用；不覆盖已有计划
scripts/contract plan-enable --checkpoint .work/<feature>/checkpoint.yaml --output reading-enable.json
scripts/contract apply-enable reading-enable.json

# 手动重建，或完成直接源编辑后调用
scripts/contract render --checkpoint .work/<feature>/checkpoint.yaml

# 正式差异记录可明确保存；相同内容幂等，历史报告不追随源覆盖
scripts/contract prepare-review <旧资产> <新资产> --kind domain-strategy --checkpoint .work/<feature>/checkpoint.yaml --json
```

策略由 `reading-policy.yaml` 持有；缺失或 `manual` 保留旧行为。实际人工阅读试验通过前，模板默认 `manual`。`apply-enable` 只将计划绑定的 checkpoint 登记为托管；其他功能不会被自动接管。

托管阅读的渲染、校验与启用由固定的 `yss reading render|check-views|plan-enable|apply-enable|affected` 完成，`scripts/contract` 和 `scripts/lib/reading-view-bundle.mjs` 只转发。当前 `yss` 缺少 `reading.views.v1`、`reading.render.v1`、`reading.enable.v1` 时，托管实例不可用并提示升级 `yss`，不会回退到 Node 实现。手动实例（策略缺失、`manual`，或 checkpoint 不在托管列表）在 Node 侧短路：不协商能力、不调用 `yss reading`，也不依赖新版 `yss`；显式的 `render`、`plan-enable`、`apply-enable` 与 `check-views --required` 属于主动使用托管能力，需要新版 `yss`。领域与阶段决策页消费 checkpoint.artifacts 中对应 `artifact.domain-strategy`、`artifact.stage-decision-package` 的明确 ref；不扫描目录推断资产。其他未来资产保留原入口。

输出放在功能目录 `reading/`：`status.review.md`、对应合同审阅页、`.manifest.json`；正式差异放在 `reading/changes/`。`map.md` 只维护 `YSS-READING:BEGIN/END` 标记范围，保留外部人工正文。manifest 只存依赖、代码与输出摘要和生成诊断，不保存可复用批准。

`check-views` 核对源字节、明确引用、术语、schema、渲染所读 Schema、输出和导航块；只读且不重建。`current` 表示呈现一致性，不代表业务门禁通过；`diagnostics` 中原资产的阻断仍由资产所有者处理。正式准备 API 对托管过期包返回缺口；CLI `prepare-review` 在准备前重建，实际流转代码再次只读检查。`lifecycle-status` 只报告阅读可用性。

`yss` 把输出、清单与 `map.md` 导航区放进同一个项目事务：提交后用新会话完整重新核验，不一致整体回滚；启用时阅读策略与全部阅读文件同样在一个事务里写入。人工改动、同名非托管文件、符号链接、坏 manifest 或导航块会保留并报冲突（`READING_OUTPUT_CONFLICT`、`READING_MANIFEST_INVALID`、`READING_NAVIGATION_CONFLICT`）。先保存人工改动，再恢复对应旧生成物及 manifest 后重建；不提供覆盖式 force。检测到历史输出已不再登记时要求人工确认处置（`READING_RETIRED_OUTPUT`），不静默删除。来源有阻断诊断时不写任何文件，而不是写出诊断视图。

清单有两代：`schema_version: 1` 的 `renderer` 登记 Node 工具闭包摘要，`schema_version: 2` 的 `renderer` 为 `{id: "yss-reading", rules_version}`，依赖只含项目文件与渲染所读 Schema，二者由 `reading-manifest.schema.json` 的 `oneOf` 接受。`yss` 在实例的清单 schema 接受 v2 时写 v2，否则写 v1；已有 v2 清单不会降级。旧 v1 清单在 Node 闭包文件已不存在时报 `reading-manifest-migration-required`：先运行 `yss reading render --all --dry-run` 确认只有清单变化，再运行 `yss reading render --all` 迁移。`rules_version` 高于当前 `yss` 时按能力不可用拒绝，低于当前时要求重新渲染。

Node 渲染器遗留的 `reading/.lock` 与 `reading/.transaction.json` 不再被恢复或覆盖：`yss reading render` 拒绝（`READING_LEGACY_JOURNAL`），`check-views` 视为更新未完成。需要先用原渲染器恢复或确认后手动清理。缺少 `feature_id` 的 legacy 布局 checkpoint 不能作为托管阅读：`yss` 以 `TRACKING_FEATURE` 拒绝，`check-views` 报过期；补写 `feature_id` 并在功能 `map.md` 登记，或把策略改回 `manual`。`plan-enable` 写出的计划是 `yss` 格式（`kind: reading-enable-plan`，带 `plan_digest`），旧 Node 计划需重新生成。

阶段追踪事务成功后调用共同 `finalizeReading`（托管实例转发 `yss reading render`；`yss stage apply` 自己提交后同样刷新托管阅读）；`source_operation: applied` 与 `reading_update.status: failed` 可以同时出现。此时源已应用，只修复阅读冲突并运行 render，不能为了补阅读页重做源事务。进程中断后由 `yss recover` 按项目事务恢复。

迁移预览核对计划、内嵌 after 和 Base64 备份摘要；缺少匹配备份时显示“无法比较旧内容”，不以当前文件替代。单文件解码预览上限 2 MiB，超出时返回诊断，不截断或执行内容。receipt 只说明原事务状态。差异按已有稳定 ID 对齐，数组重排独立显示；`binding-change` 和 `unclassified` 仍须审阅，不自动沿用批准。
