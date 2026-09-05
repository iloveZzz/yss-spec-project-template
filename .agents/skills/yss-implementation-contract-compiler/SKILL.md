---
name: yss-implementation-contract-compiler
description: Use when a YSS vertical slice is entering implementation, spans multiple frontend/backend/API areas, needs implementation readiness checked, or requires a minimal YSS skill set, Slice Implementation Contract, TDD mode, evidence plan, or reroute decision.
---

# YSS Implementation Contract Compiler

阶段 7 的实现合同编译器。它把已批准的生命周期资产、垂直切片、capability 和窄 Recipe 编译为 `Slice Implementation Contract` v2 草案；不批准合同、不写业务代码、不设置 `ready-for-agent`。

## 输入

先读取 Spec、切片 Ticket、需求冻结、适用的原型确认、OpenAPI Freeze/no-impact、系统/数据架构、Design Review、Build Architecture Checklist、实现仓库和验证命令。输入缺失、未批准或 `stale` 时输出 `blocked`，交回 `yss-product-lifecycle`。

## 编译循环

1. 判断 frontend/backend/API/data/domain/cross-repo 影响，并按 [compiler-contract.yaml](references/compiler-contract.yaml) 把 impact 映射为入口 capability；逐项填写 backend `component_impacts`。
2. 检查工程存在性和核心/长尾 skill 可用性。
3. 从 `docs/agents/yss-skill-registry.yaml` 选择一个或多个窄 Recipe，合并 `required_capabilities`；Recipe 不得直接引用 skill。
4. 由 capability 解析入口 skill，只递归 `context-required`；`context-conditional` 仅在显式 condition 命中时加载，其他依赖类型只进入原因链，不扩张执行上下文。
5. 按“Recipe 声明顺序 → 依赖拓扑 → skill ID”确定性排序，去重 skill 并保留全部原因；冻结 Registry 与编译器合同 SHA-256。
6. 为切片生成基线合同；为当前行为生成工作单元增量路由。
7. 选择 `behavior-tdd` 或 `controlled-generation`。
8. 输出 `draft`、`blocked` 或 `ready-for-lifecycle-review`，交生命周期编排器核验和持久化。

合同结构见 [slice-implementation-contract.md](references/slice-implementation-contract.md)，专项返回协议见 [yss-skill-execution-result.md](references/yss-skill-execution-result.md)。前端、后端和测试子任务必须由生命周期主控从批准的 Slice Contract 编译任务包；任务包 schema 为 `docs/process/schemas/subagent-task-package.schema.json`，技能列表必须来自 `taskPackageDefaults`，不能由编译器或执行 Agent 另行手写。

## 硬规则

- 编译器不得输出 `approved`、`ready-for-agent` 或 `completed`。
- Registry、Slice Contract 或编译器合同 schema v1 一律拒绝并给出迁移到 v2 的提示；不自动升级，不提供旧技能名兼容。
- `required_capabilities` 与 `required_skills` 必须同时冻结；Registry 或编译器摘要变化后合同立即 `stale`，重新编译后仍须交生命周期重新批准。
- UI 影响缺少正式原型确认、批准且 digest 当前的 Visual Baseline manifest 或当前切片 `case_id` 时，不得路由页面实现。模型必须先读 manifest 与语义引用，再查看对应 PNG；禁止目录 glob 和图片独立猜义。
- Repository/数据模型影响缺少数据架构时，不得路由持久化实现。
- 领域影响缺少批准且版本当前的 tactical-design contract 时，不得路由 Domain 实现；无领域影响必须记录 `not-applicable`。
- API 变化必须回到生命周期 Draft/Review/Freeze；半成品 backend 不得冒充稳定 source of truth。
- 后端端到端切片必须包含 Application；对象/POJO 影响按契约自动补 `mapstruct`、`lombok`、`alibaba-java-code-style`。
- Harness 内实现路径必须落在 `apps/backend/<project>/` 或 `apps/frontend/<project>/` 的具体项目目录；`apps/backend/`、`apps/frontend/` 只能作为容器，`app/backend/`、`app/frontend/` 及其子路径一律阻断。外部实现仓库使用其登记的真实项目根路径。`git-submodule` 使用 `implementation_path_policy: git-submodule-harness-apps`，空 gitlink、detached HEAD 或 `--force` 覆盖挂载点不得脚手架；`inspectWorkingTreeScope.writable` 必须为显式布尔值。
- 当前用户、缓存、审计、Excel、分布式 ID、请求校验、错误映射、加解密或网关韧性命中时，必须按 `compiler-contract.yaml` 的 `impact_to_capabilities` 补齐入口 capability；不能只在 `boundaries.md` 中提及。仅复用已经验证的平台认证 / 授权能力不算 component impact，不自动增加权限专项 skill。
- 业务行为使用 `behavior-tdd`；只有机械脚手架/生成物可用 `controlled-generation`，并记录例外和验证。
- 原型确认后若 backend `scaffold_status=required`，必须先读取工程基线中的 `scaffold-architecture-decisions.yaml`。编译器按已达到 `lifecycle-approved` 且 digest 当前的选择，把 `domain-driven` 解析为 `backend.ddd-scaffold` / `yss-ddd-scaffold-generator`，把 `layered-mvc` 解析为 `backend.mvc-scaffold` / `yss-layered-mvc-scaffold-generator`；处于 `undecided`、`recommended`、`awaiting-user-decision` 或 `stale` 时返回 `blocked`，不得默认 DDD。随后按 `scaffold_contract_schema` v3 编译 `controlled-generation` 工作单元合同 draft；合同必须带选择引用与 digest、`generator_skill`、Profile、能力模块闭包、批准/持久化引用、允许写路径、预期证据和验证命令。经生命周期批准并持久化后才能运行对应生成器，再由受控工作单元实际执行固定的 `./mvnw validate`、`./mvnw test`、`./mvnw package` 并记录逐条结果，随后重新编译业务合同；脚手架不承载业务行为。
- 脚手架合同在编译阶段只能是 `draft` / `ready-for-lifecycle-review` / `blocked`；只有生命周期编排器可以把已持久化脚手架合同标记为 `approved`。脚手架合同只覆盖业务代码前的工程骨架工作单元；生成、基线校验和合同重编译完成后，它不能替代脚手架后的 Slice Implementation Contract。
- 脚手架输出消费批准的脚手架合同；脚手架后的所有生成后端代码都必须绑定当前批准且版本当前的 Slice Implementation Contract、主 YSS skill、依赖闭包、允许写路径、预期证据和 YSS Skill Execution Result。打印命令、`./mvnw validate` 单项通过或脚手架成功不能替代合同批准；生成范围从机械内容变成业务行为时触发完整重路由。
- 专项结果中的越界路径、缺失证据、`drift`、`violation` 或 `new_impacts` 必须阻断或重路由。
- 前后端子任务必须使用同一 `contract_id/contract_version`，并在任务包中记录 `role_id`、`runtime_id`、`execution_state`、`allowed_write_paths`、`downstream_consumers` 和 `convergence_ref`；版本不一致或汇合引用缺失时输出 `blocked`。
- 长尾 skill 不可用时显式 `blocked`，不得用通用知识假装已应用 YSS 规范。

## 三级编译模式

- 切片基线编译：生成完整合同和技能闭包。
- 工作单元增量编译：绑定一个行为、主/辅 skills、TDD 模式、路径和证据。
- 完整重编译：API/schema、状态机、数据模型、仓库、写路径、skill、测试 seam 或架构约束发生实质变化时触发。实现中出现未冻结的新行为（包括明确的权限业务行为）统一写入 `new_impacts`，由生命周期按普通影响面重新分诊。

## 输出

输出合同草案、capability/Recipe 解析记录、技能依赖闭包、不适用理由、阻塞项、TDD 模式、工作单元、预期证据、验证命令、人工审查点、完整重路由触发器，以及建议的 `suggested_owner_role_id`（UI 影响 → `role.frontend-engineer`，后端影响 → `role.backend-engineer`，测试/审查 → `role.test-engineer`）。自然语言说明不能替代结构化合同字段。编译器不得自行批准合同、设置 `ready-for-agent` 或关闭会签门禁；owner 建议只供主控派活。

## 战略交接快照包

跨仓交接使用 `scripts/strategic-handoff export / verify / import`。正式导出前补齐源战略的稳定规则 ID、关键场景和当前批准绑定；源资产原字节冻结、包内路径通过清单解析。目标导入只产生快照和对账/承接草案，正式 reconciliation 通过后才能进入战术设计。流程与字段见 `docs/process/strategic-handoff-package.md`。

战术合同必须绑定 `strategic_handoff` 导入收据、包摘要、正式目标对账及逐条承接 rows。来自导入包时禁止仅填 `upstream_current: true`。批准前执行 `scripts/verify-strategic-handoff-consumption --root <target> <tactical>`；存在受控延期时按切片执行 `--slice <slice-id>`，实际核验通过且合同批准后才可继续相关切片。最新源规则、关键场景或资产变化使依赖项 stale；未知依赖扩大阻断，业务冲突回交战略方。结果绑定当前包与战术摘要，不能复用旧输出宣布 ready-for-agent。
