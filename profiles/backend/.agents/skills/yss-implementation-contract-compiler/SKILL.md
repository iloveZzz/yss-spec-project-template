---
name: yss-implementation-contract-compiler
description: "编译或重验 YSS Slice Implementation Contract、最小 Skill 集与证据计划；判定偏离及重新路由。"
---

# YSS Implementation Contract Compiler

当前任务先一次性读取 `yss capabilities --json`；仅当 `result.readingViews.schemaVersion: 1` 且对应入口和模式已声明时，Slice 优先用 `yss contract view --root <项目> --kind slice --file <合同>` 阅读，任务加 `--view task --unit <唯一 ID>`，明细加 `--view full`。JSON 只消费结构化 `content`、绑定及检查范围；v3 任务仅展开关联验收，诊断其他验收时按 `full_acceptance_ref` 定向读取。全局、专项和未分类约束必须完整消费。旧 CLI 或其他合同继续用 `scripts/contract view <资产> --kind <类型> [--profile task --unit <ID>|--profile full]`，不向旧 CLI 追加新参数。视图不授予执行权限；原始来源和批准门禁仍适用。类型、准备和迁移见 `.template-spec/process/contract-reading.md`。

同一任务已读且未变化的内容继续使用；来源变化、新影响、冲突、恢复或交接时刷新。证据先读结论与引用，需要诊断才定向读正文。验证复用须同时绑定资产与上游字节、工具及 Schema、参数、仓库根和相关环境；改变的输入只使受影响证据失效，不重复执行同输入命令，不建立跨会话校验缓存。

Slice v3 的当前执行结果须按 `references/yss-skill-execution-result.md` 绑定验收、验证项、合同原字节、实际证据和执行来源；`legacy-evidence-binding-missing` 表示历史可读但不能据此完成当前任务，不补造历史执行信息。

本技能是确定性的实现合同编译器，不是生命周期主控。它消费已批准且版本当前的输入，输出 draft、blocked 或 ready-for-lifecycle-review 的合同草案，由 `harness-orchestrator` 批准、持久化并设置 ready-for-agent。

撰写实现合同解释正文或切片交接说明时，按 `lifecycle-document-output` 条件调用 `i-have-adhd`，读取 `.template-spec/process/document-writing.md` 的共用写法及工程契约 / Ticket 指引。作用域仅限当前产物；派发时传递条件及引用，不改变结构化合同、批准状态或就绪条件。

## 输入

按 `.template-spec/process/frontend-backend-delivery.md` 区分来源：上游战略交接或显式 `frontend_delivery` 绑定须核验联合交付并冻结接收摘要；本地已批准资产须绑定当前功能 checkpoint 与 Spec，实际核验适用的设计和后端/API 依赖，不要求外部接收回执。纯 UI 无后端/API 影响时记录有理由的 not-applicable。无效的显式绑定不得回退本地路径；正式实现、生成和恢复仍须当前批准的 Slice Contract，接口或部署漂移使受影响证据失效。

必须读取 yss-project.yaml、CONTEXT.md、Spec / 战略设计、Technical Design Contract、API / 数据 / UI 影响、实现仓库登记、允许写路径和验证命令。输入缺失、未批准或过期时返回 blocked。

当 backend `scaffold_status=required` 时，还必须读取当前 `scaffold-architecture-decisions.yaml`。Harness Orchestrator 先基于领域复杂度给出 `domain-driven` / `layered-mvc` 推荐，并通过 `gate.backend-architecture-platform-approved` 取得用户对架构与精确 Spring Boot 版本的同一次逐项目确认；本体选择只作为子项目预填默认，编译器不得自行默认、提问或批准。确认 DDD 时绑定 `yss-ddd-scaffold-generator`，确认 MVC 时绑定 `yss-layered-mvc-scaffold-generator`，并把 decision ref / id / digest、精确平台配置、Profile、确定性模块闭包、批准且当前的 Technical Design、Data Architecture Decision v1、API Contract Decision（新建 v2；历史 v1 只读兼容，准备与迁移见 `.template-spec/process/contract-reading.md`） 及真实工程合同批准记录写入 scaffold contract schema v4。既有工程核验并复用当前登记架构及固定工程基线/POM 中的实际版本，不重新询问或生成。API `required` 时工程批准还必须直接绑定冻结 OpenAPI YAML；`not-applicable` 时必须绑定影响评估、原因和证据。历史 v3 只允许补齐技术/数据/API 对账后的 Manifest 恢复审计，不得新生成。


接入与导出先按 `.template-spec/process/delivery-preflight.md` 执行对应阶段只读预检；适用的既有后端工程身份按 `.template-spec/process/existing-backend-architecture.md` 只读消费原始证据，不补造生成器来源。无 UI 改动可承接当前确认的 `existing-ui-baseline`，新设计仍走原型；当前批准后仅允许登记与合同交集内的输出增量。

## 编译结果

来源摘要、闭包、阅读视图和校验直接复用本 Profile 已安装的 `slice-contract` / `contract` 入口；工具或参数缺失按 消费项目 `.template-spec/process/script-execution.md` 诊断，不用临时校验替代当前合同门禁。

新合同使用 Slice v3 唯一 YAML：basis、scope、resolution、acceptance、verification、work_units 与适用 extensions 单点保存；任务包由批准合同派生。v2 按原规则读取，修改时显式迁移新草案，不继承批准。

编译器必须计算：

- 按 `compiler-contract.yaml` 将 impact 映射为入口 capability；Recipe 只能引用 capability。
- 合并多个窄 Recipe 后只计算一次闭包；只递归 `context-required`，显式 condition 命中时才加载 `context-conditional`，其他类型不扩张实现上下文。
- 按 Recipe 声明顺序、依赖拓扑和 skill ID 兜底确定性排序；去重 skill 并保留全部原因链。
- API Freeze 或无 API 影响记录。
- 数据架构或无数据影响记录。
- UI 交互、状态、原型输入，以及批准且 digest 当前的 Visual Baseline manifest 与当前切片 `case_id`；无 UI 影响时记录不适用。
- 实现仓库、分支、项目根、CI、验证命令、回滚点和允许写路径。
- `required_capabilities`、`required_skills`、Registry/Compiler digest、TDD 模式、预期证据和完整重路由触发器。

## 硬规则

- 编译器不得输出 approved、ready-for-agent 或 completed。
- Registry 使用其权威 schema v3，编译规则保持 schema v2；新 Slice 使用 v3，旧 Slice v2 按原规则读取和显式迁移。已停止支持的 schema 一律拒绝，不自动升级，不提供未登记的旧技能名兼容。
- 任一 Registry/Compiler digest 变化使合同 `stale`；重新编译后仍须由 `harness-orchestrator` 再批准。
- 后端技术设计影响必须绑定批准且当前的 `basis.technical_design`（v2 为 resolution.technical_design），核对版本、摘要、切片与架构；DDD 才消费战术字段并路由 Domain，MVC 消费用例、分层和事务设计。旧 v1 DDD 合同用 `legacy_ddd: true` 显式兼容，不自动迁移或批准。
- API、状态、Visual Baseline 版本或 digest、数据模型、写路径、测试 seam 或验证命令变化时，必须返回 new_impacts / drift 并完整重路由。
- UI 实现先按 `visual_baseline_case_ids` 读取 manifest、语义引用和对应 PNG，再以相同 case_id、视口、状态和数据 fixture 捕获实现图；禁止目录 glob 和图片独立猜义。
- 前端和后端任务必须使用同一合同版本；版本不一致立即 blocked。
- 业务行为使用 behavior-tdd；只有机械内容允许使用受控生成合同。
- 已存在或已初始化工程不得因架构选择而重新生成；DDD/MVC 互转必须完整重路由到独立迁移工作单元。
- 任务包写入范围、证据和命令必须能被独立验证，不能用自然语言说明替代结构化字段。

## 战略交接快照包

使用 `scripts/strategic-handoff export / verify / import`；源资产冻结、规则身份与批准绑定、目标术语对账和逐条承接合同以 `.template-spec/process/strategic-handoff-package.md` 为准。来自导入包时，战术合同绑定 `strategic_handoff`；批准/流转前执行 `scripts/verify-strategic-handoff-consumption --root <target> <tactical>`，切片消费追加 `--slice <slice-id>`。存在延期时仅允许无依赖且核验通过的切片继续；未知依赖扩大阻断。

## Slice v3 准备与批准

使用 `scripts/slice-contract prepare/view/diff/migrate`，字段与接口见 [Slice v3](references/slice-implementation-contract.md)。用户只确认目标、范围、验收和关键取舍，已有有效确认按原协议延续；独立专业审查核验工程约束，主控汇总批准。原因链、缺口、检查结果和任务进度留在派生报告或现有证据，不改写权威合同。不得从普通 Spec 确认推断实施授权。

## 后端脚手架平台承接

消费Harness Orchestrator已确认的架构与 `platform_configuration` v2；不得自行选择、批准或静默升级 Boot/Java。平台清单执行 `scripts/backend-platforms` 查询；只允许已验证 YSS 组合，新生成缺少配置或证据即阻断。决定、合同、Manifest 与下游架构身份须绑定同一平台及兼容摘要。详见 仓库共享合同 `.template-spec/engineering/backend-platforms.md`。

后端 Slice 解析出 `component_binding: required` 的 capability 或其主 Skill 时，必须在同一平台兼容条目中逐项解析 `component_capabilities`。编译结果保存 `component_bindings` 与 `component_bindings_digest`；未登记、未验证、架构证据缺失、构件坐标冲突或摘要漂移均阻断。旧合同含组件 Skill 但没有组件绑定时直接 `stale`，重新编译并交生命周期批准，禁止自动补字段后沿用原批准。


仅消费战略交接包时，按 [跨仓承接核验](references/strategic-handoff-routing.md) 追加当前摘要与逐规则承接检查；本 profile 的主控批准边界不变。

## 业务来源

按 `.template-spec/process/business-tickets.md` 执行 Spec 业务草案、Design 校准与业务正式化。业务票放在 `business-tickets/`，集合引用进入 Spec / map / checkpoint；业务票不授予实现资格。实现票仍在 `issues/`，受工程准备、当前 Slice 合同批准和完整就绪检查约束。 新规则项目必须验证 business_ticket_refs 与 acceptance_refs，使用现有 basis.business_ticket_set 绑定当前集合原字节；原始验收仍从 basis.spec 定位，不升级 Slice 主 schema。业务票及阶段工作项不能充当实现票。来源过期返回战略/技术分析，不由编译器重写批准。
