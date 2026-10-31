# 流程术语

## 流程术语

模板源与生命周期协作概念放在本节。`英文标识` 填 `—`，不回溯补译。

| 术语 | 含义 | 英文标识 | 避免 / 备注 |
|---|---|---|---|
| 运行时绑定 | 把数字人角色落到某个 Agent 平台的适配声明，权威清单在数字人角色注册表的 `runtimes`。 | — | 不要为每个平台复制一套职称职责。 |
| 当前工作区入口 | 只消费当前仓库根的 `yss-project.yaml` 与 `AGENTS.md`。 | — | 不要把父目录、兄弟 submodule 或其他模板仓的入口文件当作本仓路由。 |
| Harness Orchestrator | 负责 Harness Agent 入口、影响面、合同、任务包、状态转移、证据汇合和重路由的系统编排组件。 | — | 不计入四类研发角色；不写业务代码，不替专业 Agent 做领域决策。不要称为「主控数字人」。 |
| Technical Design Contract | 按已确认架构承接批准需求、业务规则与关键场景的技术设计合同。 | — | 分支细节由专属设计负责，不能替代实现合同或批准。 |
| DDD Tactical Design Contract | 由 `role.architecture-agent` 将批准的上游 Spec / 战略设计细化出的聚合、行为、不变量、状态、一致性、Gateway、API 和数据边界合同。 | — | 不等同于实现代码或 OpenAPI Freeze；必须经测试 Agent 评审。 |
| 角色配置 | 某数字人角色的关注阶段、技能包、可起草产物和禁止事项。 | — | 不是独立编排器，也不含平台群聊人数。 |
| 需求经理 | `role.requirements-manager`：起草 Plan 与 Spec，提出 `CONTEXT.md` 术语。 | — | 不冻结原型、OpenAPI 或代码；不得会签自己起草的 Plan / Spec。 |
| 产品经理 | `role.product-manager`：Plan / Spec 的独立会签人，负责优先级、产品设计影响与商业约束。 | — | 会签不替代真实用户决定；不得独立批准对外商务合同。 |
| 商务（已退役） | 已退役旧职称。不构成当前研发角色。 | — | 禁止当作当前 `role.*` 或会签人。 |
| 主控数字人（已退役） | 已退役称呼。当前编排职责由 Harness Orchestrator 承担。 | — | 不要把 Harness Orchestrator 叫成主控数字人或第八个业务职称。 |
| Agent 入口规则 | Agent 启动任务时必须先遵守的全局路由、硬门禁和禁止事项。 | — | 不作为 YSS 后端、前端或其他专项编码规范的完整手册。 |
| 标准文档语言 | 面向业务、产品、架构、实施、审查、发布和复盘的持久化文档所使用的默认语言。 | — | 统一使用简体中文；英文专有名词、代码标识、API 路径、schema、文件名和协议 metadata 保持原样。 |
| Matt Engineering Skills | 来自 `mattpocock/skills` 的轻量工程流程技能集合。 | — | 用于澄清、Spec、Ticket、实现、TDD、诊断、审查和架构治理，不替代 YSS 专项规范。 |
| 上游技能基线 | 从外部技能源锁定的可追溯 revision 及其未经项目适配的原始内容。 | — | 不等同于项目当前实际生效的 skill；上游更新不得直接覆盖 YSS 适配。 |
| YSS skills | 本项目内置的 YSS 工程规范技能。 | — | 用于 DDD、UI、OpenAPI、Repository、Controller、DTO、组件和编码规范。 |
| 技能投影 | 从权威共享技能生成、供特定 Agent root 加载的同步副本。 | — | 投影不是独立维护的技能源，不应在各 Agent root 中分别修改。 |
| Spec | 记录用户问题、解决方案、用户故事、关键决策、验收标准和测试 seam 的产品研发规格。 | — | 新资产统一使用 Spec；旧规格称谓只在迁移记录中保留。 |
| Spec Delta | 记录相对于既有冻结 Spec 基线的 `ADDED / MODIFIED / REMOVED` 行为、验收场景和测试映射。 | — | 不用于全新产品或全新模块，也不替代完整 Spec、OpenAPI 或架构资产。 |
| Ticket | 在追踪平台上承载功能生命周期或可实现工作单元的通用追踪对象。 | — | GitHub Issues / GitLab Issues 是具体平台对象名称；领域资产统一称为 Ticket。 |
| 功能父 Ticket | 汇总一个功能从 Plan 或最近可信接入阶段到契约冻结的阶段状态、资产链接、审查结论和阻塞项的 Ticket。 | — | 不作为 Agent 直接实现的垂直切片。 |
| OpenAPI Draft | review-only 的 OpenAPI 3.1 契约草案。 | — | Freeze 前不得作为前后端稳定实现契约。 |
| OpenAPI Freeze | 已通过评审、可作为前后端实现和契约测试输入的 OpenAPI 3.1 契约。 | — | Freeze 后变更必须回到 API 影响分析和设计审查。 |
| YSS 响应包装 | 对外 API 使用 `Result` 基础字段及 `SingleResult`、`MultiResult`、`PageResult` 表达单对象、非分页列表和分页查询结果的统一返回结构。 | — | Java 泛型记法是语义简称；公开 schema 必须落成具体 endpoint wire shape。 |
| DTO wire shape | DTO 在 HTTP/JSON 边界实际暴露的字段、类型、可空性和方向性；与 Java 字段、getter 或内部协作字段区分。 | — | 以目标 mapper / contract evidence 为准，不从 getter、Lombok 或 `@JsonIgnore` 机械推断。 |
| UI 影响 | 会改变用户可见页面、导航、交互流程、状态呈现或权限体验的功能影响。 | — | 纯后端、API、批处理或数据变更不自动构成 UI 影响。 |
| 产品设计影响 | UI 变化触及主流程、导航、权限体验、异常 / 恢复状态、状态流转或 API 反推，需要页面流、状态矩阵和原型校准。 | — | 文案、token、颜色、间距和无行为变化的孤立视觉修复属于 UI 影响，但不自动构成产品设计影响。 |
| 高保真 HTML 原型 | 低保真原型评审通过后，用于在浏览器中审查真实视觉密度、交互状态和页面流的产品设计资产。 | — | 不等同于生产前端实现，也不替代 OpenAPI、Spec 校准或垂直切片。 |
| Visual Baseline Contract | 为生产前端还原冻结页面、视口、交互状态、参考图像和允许差异的可验收合同。 | — | 不是仅有一张原型截图或绝对像素匹配；每个基线必须可定位到同一视口和同一状态复验。 |
| 垂直切片（Vertical Slice） | 贯穿所有受影响层、可独立验证的窄功能路径。 | — | 优先使用垂直切片，避免只按层拆分的横向任务。 |
| ADR | 架构决策记录，用于沉淀难以回滚、非显而易见且存在真实取舍的技术决策。 | — | 常规实现选择不要写 ADR。 |
| 实现验证命令 | 前端测试 / 构建优先 `pnpm`，后端校验 / 测试 / 编译优先 `./mvnw`。 | — | 不要默认 `npm`、`yarn` 或裸 `mvn`；仓库确实缺少 pnpm 或 Maven Wrapper 时记受控例外。 |
| 生命周期产物 | 生命周期工作单元形成并持久化、可被审查和引用的业务或工程结果。 | — | 文件存在不代表产物已经批准或仍然新鲜。 |
| 单一事实来源（Single Source of Truth） | 对某一类流程事实拥有唯一定义权的权威资产。 | — | 其他资产只引用或解释，不重复定义同一规则。 |
| 流程模板资产 | 可被不同项目复用的文档模板、技能说明、校验脚本、流程规范和目录占位文件。 | — | 不包含某个具体产品的 Spec、设计、OpenAPI 或 Ticket。 |
| 模板维护流程 | 用于评估影响、修改权威资产、同步投影、执行压力验证并审查模板演进的工作流。 | — | 面向模板源仓库，不默认生成具体产品的 Spec、原型、OpenAPI 或垂直切片 Ticket。 |
| YSS 研发操作系统 | 由生命周期控制、通用工作流、YSS 专项技能、证据反馈和技能供应链共同构成的可版本化研发治理体系。 | — | 不等同于单个主控 skill、某个 Agent 客户端或运行时代码平台。 |
| 前端实现还原验证 | 证明生产前端相对冻结 Spec、交互说明、状态矩阵和高保真原型不存在未解释差异的独立验证。 | — | 不是绝对像素复刻、普通 type-check 或原型评审；UI 影响切片需覆盖关键视觉、状态、交互和工程证据。 |
| 生命周期稳定 ID | 以对象类型命名空间和英文标识唯一指向一个生命周期对象的兼容身份。 | — | 中文名称、展示顺序和数量可以变化；已发布 ID 不得复用来表达另一种语义。 |
| 派生产物 | 根据生命周期注册表确定性生成的结构表、数量、索引、依赖图或测试 fixture。 | — | 不承载需要人工解释的原理、取舍或实践建议，禁止脱离注册表分别维护。 |
| 核心技能（Core Skill） | 默认可发现、负责生命周期控制或通用研发入口的稳定技能。 | — | 不包含只在特定技术影响下才需要的专项实现规则。 |
| 专项技能（Specialist Skill） | 由 实现合同编译器 根据影响面和实现合同按需选择的前端、后端、OpenAPI 或组件技能。 | — | 不作为所有任务的平级默认入口。 |
| 试验技能 | 尚未达到项目默认支持成熟度的技能。 | — | 只在明确试验范围内使用，不进入 实现合同编译器 默认技能闭包。 |
| 技能成熟度 | 描述技能从 `draft`、`verified`、`supported` 到 `deprecated` 的治理状态。 | — | 不等同于文件存在、已被投影或能够安装。 |
| 技能注册表 | 记录技能身份、别名、分层、适用影响面、成熟度、默认可发现性和 Agent 运行时入口的机器可读路由资产。 | — | 不替代 `skills-lock.json` 的来源、hash 和投影完整性职责。当前 `.template-spec/agents/yss-skill-registry.yaml` 为 `active`，实现合同编译器 与生命周期必须消费通过本表校验的 canonical 技能。 |
| LLM Wiki | 由 `raw/`、`wiki/` 与 `.wiki-manifest.json` 组成的本地持久知识库。 | — | 不是 `yss-research` 一次性研究包，也不替代权威源。`ingest` 只把用户点名的外源或已落盘研究笔记编进 IR，不改 live 权威文件。 |
| 生态发布清单 | 关联模板 schema 与 commit、CLI 版本与快照、公开技能来源与导出 hash 的跨仓发布证据。 | — | 不要求尚未生成的仓库 commit 互相循环引用。 |
| 研发管理仓库 | 承载 Spec、OpenAPI、架构、Ticket、验证、发布和复盘等研发管理资产的仓库。 | — | 不等同于前端 / 后端代码 monorepo。 |
| 实现仓库 | 承载前端、后端或其他运行时代码及其 Git、CI、MR / PR、测试命令和发布流水线的仓库。 | — | 不要把实现仓库的源码所有权混入研发管理仓库。 |
| Git 子模块分层接入 | 将前端 / 后端实现仓以 Git submodule（gitlink，mode `160000`）挂到 `project-instance` 的 `apps/` 布局下，并登记 `repository_scope: git-submodule`。 | — | 不得与 `harness-apps` 同源 monorepo 或无 gitlink 的 `external-repository` 混用；禁止把实现源码复制进 Harness 冒充 submodule。 |
| 跨仓库契约变更 | 需要两个或多个独立仓库协同实现、验证和按顺序发布的共享契约变化。 | — | 任一参与仓库未完成契约对齐和集成验证时，不得单独声称整体可发布。 |
| 模板源仓库（`template-source`） | 承载可复用 Harness / 模板权威资产及其演进规则的仓库身份。本仓是后端专职交付六阶段模板源。 | — | 只管理可复用模板，不承载某个具体产品的研发生命周期资产。不要把仍使用旧八阶段入口的父目录或其他 submodule 当作本仓路由。 |
| 模板实例仓库（`project-instance`） | 由模板初始化后生成、承载某个具体产品研发生命周期资产的仓库身份。 | — | 不作为通用流程模板的权威来源。 |
| 模板实例分发面 | 模板源中应随 CLI 快照进入 `project-instance` 的共享生命周期、模板、用户指南和验证资产集合。 | — | 不包含模板源审查、研究、发布路线、源仓库专属 ADR 或源仓库 LLM Wiki 编译树。本仓权威清单为 `.template-source/distribution/template.manifest.json`。 |
| Harness Profile | 某个 Harness 模板源的受众、允许工作单元、禁止产物、上游输入和实例化 CLI 边界的机器可读配置。 | — | 不是角色表，也不替代生命周期注册表。本仓 `profile_id` 为 `harness.backend-delivery`。 |
| 开发落地 Harness CLI | 统一 `yss` 的 `backend` Profile 将本仓六阶段后端交付 Harness 固定 Bundle 生成 `project-instance`，入口为 `yss init --profile backend --root`。 | — | 原生元数据为 `.yss.json`；`create-yss-harness-backend` / `.yss-harness-backend.json` 及更早 `create-yss-harness-dev` 仅作历史来源识别，旧实例先显式迁移或用匹配固定执行器恢复。 |
| 模板源治理区 | 仅供 `template-source` 使用、保存审查证据、研究记录、跨仓契约、发布路线、源仓库治理决策和源仓库 LLM Wiki 编译树的归档区域。 | — | 不随 CLI 分发；不等于产品实例的研发管理资产。`wiki-root` 为 `.template-source/wiki`。 |
| 仓库身份清单 | 显式声明仓库身份和清单结构版本的机器可读资产。 | — | 不承载项目名称、团队规模、Tracker 或其他易变业务配置。 |
