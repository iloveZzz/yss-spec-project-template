# 生命周期条件指引

仅在 [生命周期入口](../SKILL.md) 所列条件命中时读取对应节，不要求一次加载全文。以下命令在当前治理仓根执行；`.template-spec/` 等代码路径以仓根为准，文档链接以本文件为准。

以下涉及独立 Frontend Profile 的旧措辞仅作历史兼容说明；当前注册表、合同及 AR12c 退役边界优先，不据此新建、派发或恢复该整线，保留的前端技能和通用前端实现概念不在退役范围。

## 查询与证据复用

一般任务由 Agent 根据 `skills list --details` 的描述选择内置技能，再用 `skills resolve <id...> --json` 核验所选闭包；按 [来源与补装](matt-yss-adapter.md) 消费状态、补装并直接读取已核验入口。

按 `execution_efficiency` 复用入口、合并查询和未变资料，核验资产与门禁；见项目 `.template-spec/process/script-execution.md`。

当前任务只做一次 `yss capabilities --json` 能力发现。`result.readingViews.schemaVersion: 1` 且入口声明相应模式时，按对象使用 `yss lifecycle query --root <项目> --id <稳定 ID> --view agent --json`、`yss lifecycle status --root <项目> --checkpoint <引用> --view agent --json`，Context 用 `yss context query --root <项目> --term-refs <引用列表> --view agent --json` 或唯一 `--id`。Slice 用 `yss contract view --root <项目> --kind slice --file <合同> --view task --unit <唯一 ID> --json`；必须完整消费全局与未分类约束。先消费结论、全部阻断项、下一动作和证据引用，诊断时才读取相关正文。状态阅读仅报告登记事实；下游 Profile 核验、批准及执行仍用原入口。旧 CLI 保留上述脚本及原命令，不追加未知 `--view` 参数。

已读且未变化的任务资料不重复回传；来源变化、新影响、冲突、恢复或交接时刷新。复用验证证据必须同时满足资产与上游字节、工具及 Schema、命令参数、仓库根和相关环境未变化。新路径先补齐依赖映射，再定向验证；当前候选相同输入的同一验证命令只运行一次，首期不持久缓存验证结论。

## 正式资产与 Plan 入口

`governed` 正式资产使用 `.template-spec/process/structured-assets.md` 和 `.template-spec/process/contract-reading.md`；文档按 `document_writing` 调用 `i-have-adhd`。普通任务不因这两份协议生成正式资产。

Plan 入口读 `.template-spec/plan/README.md`、`.template-spec/process/plan-migration.md`，核验战略输入与退出条件。关键未决项阻断 Spec；其余记责任人、时点和接收方。仅认 Plan，不解析旧阶段或自动沿用历史批准。

审查按 `gate_consolidation`、`review_input.rereview`；Plan 执行 `planning.review_control`，周期由 checkpoint `plan_review_control` 持有；工具和派发、消费、恢复、入口校验见 `.template-spec/plan/entry-review.md`。

澄清目标、流程、责任、规则、范围和验收例子。业务总览引用权威资产，展示状态、未决项、责任人和下一步，不复制正文或新增门禁。

Plan → Spec 写入前按 `.template-spec/plan/entry-review.md` 持久化审阅包，执行 `node scripts/verify-plan-spec-entry <state.yaml>`；缺项、过期或无真实回复阻断，独立调研继续。

`checks.grill_exit=passed` 仅准备就绪；共同理解与当前 Plan 合并真实确认后，入口判定完整退出。

Plan/Spec/Design 追踪见 `.template-spec/process/stage-tracking.md`。

澄清读 [对账](plan-requirements.md)，外部输入读 [问卷](external-input-questionnaire.md)。

Spec 起草业务票，产品设计校准后完成业务 Ticket 正式化，再进入系统 / 数据架构与工程契约；无设计影响从 Spec 直接进入业务正式化。工程契约冻结和实现仓库准备闭合后，进入实现切片拆分与合同准入，研发细化 Slice 并由主控核验当前合同与就绪条件。按 `.template-spec/process/business-tickets.md` 检查覆盖和批准；业务票不授予实现资格。

## 推进目标与后端终点

Spec 是综合研发主控；Spec 文档批准只是一个里程碑。正式功能的本次终点由 `progression_target` 与独立意图文件选择，新政策默认业务验收；旧实例须显式同步支持该政策，不自动补写历史意图。改变终点保留实际 next、批准和冻结包字节。派发与生成前通过固定 CLI 核验当前目标，到达终点停止下游写入；缺能力或证据不可验证时停止受影响推进。见[推进到指定里程碑](progression-target.md)。Design、Backend、Frontend 按需协作，各自职责终点单独验核；汇总只消费显式同功能 checkpoint 和当前接收证据，不按 root 猜功能。

本地 `backend-deliverable` 不派发对外交付包单元。当前验证单元完成后端实现、独立审查及真实构建部署验证后，按推进目标协议调用 `scripts/complete-backend-delivery complete` 登记同功能 `local-evidence` 终点，再复算目标；不改变 next/status、不导出战略或后端包。缺少该记录时继续补当前目标所需证据，不能越过后端终点直接推进业务验收。

## 编排派发与验收

1. 从真实资产重建状态，查询 mode、stage、work-unit 及必要合同子树。
2. 核验影响面、上游新鲜度、门禁和阻塞，选择首个未阻塞单元；`not-applicable` 不作豁免。
3. 主控持有原生正式资产；专项按结构化任务包派发，只调用合同允许的 model-invoked skill。
4. 兼容入口 `to-spec`、`to-tickets`、`implement` 仅由用户显式调用。主控预检输入、路径、门禁；入口按 `matt_invocation_boundary` 写产物并回交验收，不批准或改变 Ticket 就绪状态。原生资产归主控。
5. 先逐项验收用户目标、遗漏、错误假设和未决问题，再验收 `Workflow Execution Result`：工作单元、合同、允许写路径、`context_reconciliation`、证据、实际验证、延期 seam、漂移和下一路由必须可核验。实现派发额外绑定当前 Slice Implementation Contract v3；其他阶段不得伪造该合同。
6. 按 `blocking_disposition` 自主处理阻塞；缺真实决定或新授权才展示资产后询问。独立工作继续，完成结论不新增暂停。

## 结果记录与下游交接

`governed` 按 `workflow_execution_result` 与 `state-model.md` 记录状态、证据新鲜度、阻塞、动作、路由、Ticket / Git checkpoint。`daily` 在原任务记录补齐实际测试和独立审查，由 `verify-daily` 核验当前边界；通过只表示本普通任务证据闭合，不表示正式批准、合并或发布。

当前 Profile 职责完成、状态查询或恢复时，消费唯一政策 `profile_guidance`，用 `yss lifecycle status --root <当前工程> --checkpoint <当前 checkpoint>` 核验明确登记的下游 Profile 与当前批准输入。Spec 默认继续当前职责；没有当前战略交接时，可由用户选择独立 Design。Spec 或 Design 已形成经核验的当前战略交接后，按其消费者路由建议 Backend、Frontend 或同时准备；设计完成声明不能替代交接及来源批准，显式交接失效时先解除阻断。目标 Design 使用 SpecBaseline Receipt，目标 Backend / Frontend 使用战略接收记录及各自消费合同。未登记状态写待核验，不按邻近目录猜初始化。明确选择后才准备或导入；建议不改变当前工作单元、不扩展当前职责、不授予批准或执行。

独立 Design 承接现有批准 Spec 时，按 `.template-spec/process/spec-baseline.md` 导出、导入和核验冻结包，以新 Receipt 绑定目标 checkpoint，经目标 Context 对账后从产品设计继续；源 checkpoint 只作包内证明，不复制为目标 Plan/Spec 批准，也不重走 Plan。

## 资产整理与工程接入

资产整理及旧票迁移按 `.template-spec/process/feature-assets.md` 和显式计划保留状态、批准依据、原文，不推进阶段；被引用草稿按正式资产保留。

YSS CLI 安装与升级、治理工程新建与接管、实例模板同步、旧身份迁移、资源补装及事务恢复回退用 `setup-yss-harness`，遵循 `.template-spec/process/harness-upgrade.md`；默认查询 GitHub 最新正式 Release 后固定来源，不推进产品阶段或重写历史批准。

专职 Backend/Frontend 同样可从原始需求完成本地业务分析与本端交付。按唯一 `request_triage.delivery_path` 选择日常/正式路径；本地 Plan/Spec 复用现有门禁，上游输入复用批准且当前的来源，规则冲突回交权威方。角色分析权限不扩大另一端实现范围，本端完成不等于跨端业务验收。独立机械脚手架按 [直接生成说明](../../yss-ddd-scaffold-generator/references/standalone-generation.md) 直接生成，不生成批准或业务资格。

### 直接生成脚手架

仅请求生成 MVC/DDD 开发脚手架时，按 [直接生成说明](../../yss-ddd-scaffold-generator/references/standalone-generation.md) 直接调用对应生成技能，无需先创建治理实例、需求合同、原型或设计审批。未传合同参数时默认直接生成，`--standalone` 可省略；已有正式任务保留原路径。业务与治理任务仍按生命周期入口分流。
