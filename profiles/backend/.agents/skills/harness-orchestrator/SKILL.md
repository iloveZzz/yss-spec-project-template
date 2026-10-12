---
name: harness-orchestrator
description: 编排后端专职 Harness 的输入接收、合同、任务派发与验证；当需要后端流程路由或恢复时使用。
---

已显式托管的首批阅读包：权威源编辑结束后运行 `scripts/contract render --checkpoint <ref>`；审阅准备或交接前运行 `check-views`。阅读生成失败只恢复派生页，不重做成功源事务。详见 `.template-spec/process/contract-reading.md`。


# Harness Orchestrator

本入口是后端专职协作方。本端职责终点由当前后端交付合同与实际 Backend Delivery 包验证决定；不写 Spec 主控的推进意图配置，不保存第二套整体进度。主控只汇总显式同功能 checkpoint 与当前 Receipt。后端可交付不等于完整业务验收；新增 v5 交付的 `strategic_bundle_ref` 必须指向完整不可变 delivery wrapper，裸 package 仅保留历史兼容读取。

正式包终点按本端明确 checkpoint 与唯一登记 map 写入功能目录的 `backend-delivery.json`，无需 Spec 目标配置或后端专用执行范围。它必须核验当前 Slice、独立审查和当前构建提交；本地批准业务输入可显式使用 `local-evidence`，核验同一功能的当前 Slice、真实构建、契约/部署与独立 Fresh Verification；不伪造战略或后端交付包。有上游交接或对外接收要求时保留原正式包。

后端新骨架必须消费注册表 architecture_profiles，并在工程基线、登记、Manifest、Slice/work unit 和结果中保持相同 architecture_identity。DDD/MVC 都固定本地/测试 H2，生产数据库 not-bound；不得添加默认外部驱动或数据源。配套技能按 `.template-spec/agents/backend-architecture-profiles.md` 分流，MVC 不加载 yss-domain。Profile 仍为 draft 时不得 ready-for-agent，也不得把结构测试当作真实首切片兼容证明。

这是本专职 Harness 的唯一编排入口。它负责读取 `yss-project.yaml` 与 `CONTEXT.md`、判断影响面、选择下一个未阻塞工作单元、编译任务包、维护合同版本、汇合执行结果和触发重路由。

文档输出时按 `lifecycle-document-output` 条件调用 `i-have-adhd`，读取 `.template-spec/process/document-writing.md`；作用域仅限当前产物，派发时传递条件及引用。

## 边界

- 不起草领域行为、前端页面、后端业务代码或测试代码。
- 不替专业 Agent 修改技术决策；遇到领域、交互、实现或可验证性冲突时先调查实际影响并派发适用专家，阻断依赖动作；缺少真实决定或必要输入时才询问。
- 不批准自己生成的专业资产，不把 实现合同编译器 草案当成 approved，也不以聊天消息代替证据。
- Strategic Handoff v5 导入成功只表示输入可消费，固定进入 `work-unit.technical-design` 并保持 `ready_for_agent:false`；只有仓库准备完成且当前 `Slice Implementation Contract` 满足就绪公式时，才能设置 `ready-for-agent`。

## 前端联合接收

upstream 模式或显式 `frontend_delivery` 输入，按 `.template-spec/process/frontend-backend-delivery.md` 执行战略预检，再起草前端工程设计与实现计划。最终接收按实际后端依赖核验后端交付或有依据的 `backend-not-applicable`；合同批准且当前并满足就绪检查后才派发 Worker。接收、恢复与验收按规定边界重验，缺口回交权威方。通用研发 profile 未选择该路线时维持原行为。

## 按影响面选择工作

先按根 `AGENTS.md` 和 `.template-spec/process/harness-process-tailoring.md` 区分只读咨询、模板维护和产品行动。只读查询不创建 Ticket、checkpoint 或审查任务；模板日常维护由 `maintaining-skills` 自检，仅明确选择独立审查时路由 `work-unit.intensity-aware-review`。注册表有 `public_*` 时优先消费当前展示说明，旧字段保留兼容语义。下列产品流程用于选择当前缺失的工作，已有当前批准资产、登记、父票及 Slice 合同先核验复用，不重走全部阶段或要求未来产物。Fresh Verification 只覆盖当前工作及直接 / 传递依赖；证据复用和边界重验按裁剪合同执行。

## 主流程

1. 校验仓库身份和业务输入模式：standalone 从原始需求完成本端 Plan/Spec 的分析、独立审查与批准；upstream 核验当前上游批准输入，冲突回交权威方。随后按实际影响核验实现仓与当前合同版本。
2. 在设计前完成 `gate.backend-architecture-platform-approved`：既有工程核验并沿用当前登记架构与固定工程基线/POM 中的实际 Spring Boot 版本，将该门禁记录为 `not-applicable`，不重复询问；新工程基于批准需求和工程约束推荐 `domain-driven` 或 `layered-mvc`，运行 `scripts/backend-platforms`，把架构、Boot 精确补丁、Java 和 YSS 父 POM/BOM 在同一次用户决定中展示；独立子项目可继承或覆盖，逐项目确认（可一次确认明确列出的多个项目），持久化 `scaffold-architecture-decisions.yaml`。不得从目录或默认值推断。
3. 调度 `architecture-agent` 使用 `yss-technical-design`，按确认架构分别调用 DDD 或 MVC 专家，形成并审查批准且当前的 Technical Design；数据与 API 均按影响强制，API 命中时完成 OpenAPI 3.1 Draft、锁定 Redocly Validation、独立 Review 和 Freeze，不命中时形成可核验的 API Contract Decision `not-applicable`；随后由同一个 `gate.engineering-contract-approved` 原子批准技术、数据与 API 设计。
4. 进入 `work-unit.implementation-repository-preparation`。新工程编译并批准 schema v4 scaffold contract，生成器在任何写入前核验技术/数据设计与批准记录，只生成机械骨架；既有工程完成 onboarding。聚合并校验 Preparation Result v2。
5. 仓库准备完成后，汇总四角色分区并生成一个版本化 Slice Implementation Contract。
6. 先调度 `test-agent` 建立测试 seam，再调度后端 Worker。
7. 收集每个任务包的 `workflow-execution-result-v1`，完成当前范围的 Fresh Verification；输入或边界变化时重跑受影响检查。
8. 由独立 `test-agent` 返回验证结论；没有阻塞信号时才关闭后端任务，整体切片由统一管理方验收。

## 必须阻断的信号

`blocked`、`stale`、`drift`、`violation`、`new_impacts`、合同版本不一致、写路径越界、验证未执行或证据不可读。

## 便携交接工具

批准交接后由 `scripts/strategic-handoff export --source-root <source> --handoff <ref> --output <new-directory> --zip` 冻结原始资产；规则身份、批准绑定、包内索引和完整快照差异以 `.template-spec/process/strategic-handoff-package.md` 为准。接收方先 `verify` 再 `import`，目标根术语对账和 `verify-strategic-handoff-consumption` 通过后进入战术设计/相关切片；工具不能代替生命周期批准。

## 后端专职 profile

先消费 `.template-spec/process/harness-profile.yaml` 的职责与输入条件，再依 `.template-spec/process/frontend-backend-delivery.md` 接力。不得派发另一端实现任务；跨端输入评审必须只读。终点只关闭本端验证，整体业务验收由登记的统一管理方汇总。

新 DDD/MVC 脚手架合同必须绑定 `platform_configuration` v2。仅清单中真实验证过的 YSS 组合可生成；缺兼容组件或证据时阻断，不替代为官方组件。已有当前批准展示摘要后复用；依赖配方变化重编合同，单纯补充同配置证据只重验。同一 Maven Reactor 平台一致，候选维护产物不可进入业务切片。详见 `.template-spec/engineering/backend-platforms.md`。

## 阶段工作追踪

首次进入允许的 Plan / Spec / Design 或恢复时，读取 `.template-spec/process/stage-tracking.md`，核验 tracker 启用版本与持久 checkpoint。写阶段资产前登记当前工作项；小工作内联，跨负责人 / 独立验收 / 阻塞 / 延期时拆至 work-items。旧项目只读 check 后形成可审阅 plan，显式 apply 才启用；不补造历史完成或批准。完成时逐条关联验收证据，阶段退出回写；结果携带 checkpoint_ref。追踪不得扩大本 profile 的允许阶段，Design 不创建工程父票或实现切片。

原生需求澄清消费 [Context 对账](references/plan-requirements.md)；外部输入缺口消费 [问卷与恢复合同](references/external-input-questionnaire.md)。仅在本 profile 已授权的阶段范围内使用，不扩展默认阶段。

## 业务 Ticket 来源

按 `.template-spec/process/business-tickets.md` 执行 Spec 业务草案、Design 校准与业务正式化。业务票放在 `business-tickets/`，集合引用进入 Spec / map / checkpoint；业务票不授予实现资格。实现票仍在 `issues/`，受工程准备、当前 Slice 合同批准和完整就绪检查约束。 接收新能力交接时核验业务集合、规则/场景映射与原始验收；依赖未知时保守阻断范围，不无依据缩小影响。不把战略交接 approved 等同工程可实现。

<!-- HARNESS_UPGRADE_ROUTE -->
YSS CLI 安装与升级、治理工程新建与接管、实例模板同步、旧身份迁移、资源补装及事务恢复回退使用 `setup-yss-harness`，遵循 `.template-spec/process/harness-upgrade.md`；指定工程的 setup 在有效授权内执行到验收，默认查询 GitHub 最新正式 Release 后固定来源，不推进阶段或改写历史批准。

<!-- SKILL_PREFLIGHT_ROUTE -->
专项技能调用前，运行 `scripts/query-lifecycle-context --work-unit <当前工作单元> --check-skills`；多运行时指定 `--agent-runtime`，条件用 `--when`。按合同 `skill_preflight` 处理缺失、漂移与冲突，在既有授权内核对补装计划、应用后重验。预检不授予执行或批准。Matt 上游为 https://github.com/mattpocock/skills，生效版本以根 `skills-lock.json` 为准。


一般任务先用固定 CLI 的 `skills list --details` 按描述选择内置技能，再执行 `skills resolve <id...> --agent-runtime codex --json`。消费整体 `result.status`：`ready` 直接读取闭包的绝对 `entryPath` 并记录 `contentDigest`；`missing` 仅在已有授权覆盖且无冲突时 ensure plan/apply 后重验；`blocked` 停止受影响调用。条件用逗号分隔的 `--when`；调用模式及边界见 [资源补装](../setup-yss-harness/references/project-operations.md)，旧 CLI 沿用工作单元预检。

<!-- USER_PROGRESS_REPORT -->
每轮返回或暂停按合同 `user_progress_report` 给出中文状态：当前阶段与本轮结果、下一阶段/单元与进入条件、问题/阻塞、已登记责任方、解除动作及复验、主控下一动作与用户待决定项。未知写“待核验”，负责人缺失写“未登记”；目标不代表批准，已授权工作继续执行。发送前核对证据、状态及结构化结果一致；写法见 `.template-spec/process/document-writing.md`。

专业审查按能力和独立实例执行，正式 v1 补充只读技能、当前批准、专业等待与定向复审见 [专业审查与恢复](references/professional-review.md)。

<!-- PROFILE_GUIDANCE -->
当前职责完成、状态查询或恢复时，消费合同 `profile_guidance` 与 `yss lifecycle status --root <当前工程> --checkpoint <当前checkpoint>` 给出下游 Profile 建议；不按邻近目录猜初始化状态。Spec 默认继续当前职责；没有当前战略交接时，可经用户明确选择交给独立 Design。Spec 或 Design 已形成经核验的当前战略交接后，按消费者路由建议 Backend、Frontend 或同时准备，两者仍在独立目录执行；设计完成声明不能替代交接及来源批准，显式交接失效时先解除阻断。目标 Design 接入已批准 Spec 走 `spec-baseline` 冻结包与 Receipt、目标 Context 对账后从设计继续，不重走 Plan，不复制源 checkpoint 批准到目标；目标 Backend / Frontend 使用战略接收记录及各自消费合同。建议不改变当前工作单元、不授予批准或执行，下游推荐不扩展本 Profile 的实现写范围。

当前 Slice v3 在 `stage.slice-contract` 先执行 `check.design-reviewed`，独立架构或测试审查者加载本端工程审查能力，绑定当前持久化编译合同的 ID、版本和原字节摘要。`gate.slice-contract-approved` 依赖这项审查；旧 Technical Design/Frontend Engineering 批准不能充当 Slice 审查，起草者不得自审。历史 v2 只按既有历史读取政策处理，不因此取得新的实施或交付资格。

## 本地业务分析与本端交付

原始需求可在本项目完成目标与验收、Plan、业务边界和规则、Spec，再进入本端设计、实现、测试与独立审查；无需先创建独立 Spec/Design 工程。已有上游批准输入时复用当前来源，冲突回交权威方确认，禁止静默改写。小任务按主控合同 `request_triage.delivery_path` 与 `yss lifecycle route` 选择 daily；高风险或已正式绑定任务保留 governed。分析角色不授予另一端代码写入；本端交付完成不等于跨端业务验收。纯 UI 记录后端不适用的原因和当前依据；真实 API、数据与跨仓依赖必须对齐。独立脚手架只生成机械结构，不授予业务实施。
