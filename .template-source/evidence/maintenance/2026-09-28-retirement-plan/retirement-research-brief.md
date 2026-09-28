# 模板文档、流程、门禁、CLI 与技能退役计划

日期：2026-09-28。状态：**供维护者选择范围的计划草案；未执行退役**。

建议先减少重复规则、过时入口和无治理消费者的整包分发，再考虑跨技能和 CLI 内部实现合并。当前没有足够证据支持删除任何现行 CLI 产品家族，也不建议为减少数量继续删除现行门禁。

## Research Scope

本次使用 `yss-research / technical-evidence / evidence-audited`，读者为模板维护者。分析对象是当前工作树的主模板、四个 CLI、三个 Agent 源子项目及其分发连接；结论用于后续维护范围决定，不是产品 Plan、批准记录或发布结论。

- 纳入：权威注册表、入口文档、候选文档和技能正文、实际调用者、角色配置、profile 同步、迁移与分发实现。
- 排除：用户全局安装的技能和插件、无关产品仓库、直接修改已生成项目、改写历史批准、提交、推送、发布。
- 方法：先用已有 CodeGraph 定位，再用当前源码及定向检索复核；两项只读分诊分别检查技能和 CLI，主控核对关键来源。不刷新图索引。
- 基线：根 HEAD 为 `24e225b6786724372ff14503fcbedcbd3302a4ef`；本次结论同时消费当前未提交内容，不把 HEAD 当成全部证据来源。各仓 HEAD、初始状态、关键文件摘要见 [inventory.json](inventory.json)。
- 工作区已有 `llm-wiki`、多个 Agent/CLI 子项目及其他维护研究改动。本次只新增本目录，不把它们纳入清理。
- `context_reconciliation: not-applicable`：本次是模板源退役分析，消费根 CONTEXT.md，不生成产品术语、产品资产或阶段流转。

## Executive Read

**首批推荐：修正文档漂移，移出一个平台技能包，退役一个纯表达入口，清理三个旧 Recipe 的正向介绍，并在满足既有前置后停止旧初始化行为。** 后续合并必须先把原职责交给明确的保留入口。

| 维度 | 当前盘点 | 对计划的含义 |
|---|---|---|
| 生命周期 | 8 个主阶段、7 个聚合门禁、14 个内部检查、29 类产物、24 个工作单元、23 类证据 | 门禁已收敛；不要把内部检查重新算成独立人工批准 |
| canonical 技能 | 80 个：core 23、specialist 41、compatibility 7、maintainer-only 9 | 分层已经存在；不能把 80 个都当默认必读 |
| 初始安装 | `yss-product-lifecycle`、`yss-research`、`i-have-adhd` | 已采用按需安装；本轮收益主要在维护与分发面 |
| 平台技能包 | Data Analytics 18 个 nested SKILL；Product Design 11 个 | 与 80 个 canonical 技能分开统计，不能把投影重复计数 |
| CLI / Agent 源仓 | 4 个现行 CLI、3 个专职 Agent 源仓 | 三个专职 CLI 已共享核心；保留职责边界 |
| 文档与证据 | `.template-spec` 147 个跟踪普通文件，约 0.94 MiB；维护证据 6,424 个文件，约 202.37 MiB | 大体积主要来自历史证据；删除规则文档不是主要磁盘收益，归档另行处理 |

以上为本轮静态快照，非长期使用率统计。数量与来源见 `claim-001`、`claim-002`、`claim-007`、`claim-011` 和 inventory。

## Findings

### 一、文档内容：先退役错误或重复的规则表述

| ID / 优先级 | 对象与事实 | 建议动作、替代位置 | 风险与完成条件 |
|---|---|---|---|
| D01 / P0 | 根 README 第 19–34 行仍把流程、模板、Agent 治理放在 `docs/`；工程说明也保留旧分发描述；CONTEXT.md 第 65 行仍引用已 deprecated 的 `gate.release-ready`。`claim-003` | 退役这些现行说明中的旧表述；区分 `.template-spec` 可复用治理与 `docs` 产品资产。当前交付验收引用 `gate.delivery-accepted`，外部发布授权单独表述，不能简单同义替换 | 同步引用方和派生入口；目录、稳定 ID 与 Registry 一致。保留历史记录中的旧 ID |
| D02 / P1 | [架构 README](../../../../.template-spec/architecture/README.md) 第 31–57、84–90 行另写固定 3 方案、评分、架构师签字的 AI-Human Loop。`claim-004` | 删除这套可被误读为强制流程的说明；保留架构产物、模板导航与可选方法，门禁只引用 Registry / tailoring | 不能顺手删除架构审查清单、ADR 取舍或高风险审查；确认不再由说明文档额外建立批准步骤 |
| D03 / P1 | [next-major-template-governance.md](../../../roadmap/next-major-template-governance.md) 仍标“下一主版本草案”，并把独立审查作为默认发布阻塞；当前维护政策已改变。`claim-005` | 逐项对账，将已被当前合同覆盖的计划退出现行导航；只在剩余项闭合并取得归档依据后移入历史，不重新宣布旧计划已发布 | `.template-source/README.md` 要求路线全部 closed 且有证据才可移除；不能因看起来旧就删除 |
| D04 / P2 | [domain.md](../../../../.template-spec/agents/domain.md) 重述 CONTEXT 的读取和词汇合同；setup 技能第 76、104 行仍消费它。`claim-006` | 将独有的消费者说明收敛到 CONTEXT / 现有阅读入口；迁移 setup 消费者后，退役独立正文或保留短链接 | 不复制第二套词汇规则；不在消费者未迁移时删除文件 |
| D05 / P2 | [tech-design-template.md](../../../../.template-spec/architecture/templates/tech-design-template.md) 第 3 行已声明只作阅读模板，后端权威是结构化 Technical Design；仍有验证脚本消费。`claim-006` | 评估改成结构化合同的阅读视图 / 注释参考；去掉要求人工重复填写的同义字段 | 跨技术栈的方案说明可能仍有价值；先确认阅读场景覆盖，再移除旧模板及针对它的检查 |
| D06 / P1 | 三个 deprecated Recipe 仍在编译器 [boundaries.md](../../../../.agents/skills/yss-implementation-contract-compiler/references/boundaries.md) 第 68–70 行与现行方案并列。`claim-009` | 正向表只展示 DDD / MVC 精确 Recipe；旧名移到迁移说明，保留明确拒绝码 | Registry 的 deprecated 条目及历史读取不能一起删；旧请求仍应给确定的迁移诊断 |

D01 同时包含导航修正：`.template-spec/agents/README.md` 把已经迁出的 `skills-maintenance.md` 当作同目录文档；工程说明中的产品线手册链接需校正。README、工程说明和用户手册可保留不同读者用途，只消除规则的重复定义，不强求合成一本长文档。

### 二、流程与门禁：保留现行裁决，退出现行路径中的旧协议

| 对象 | 本次判断 | 后续动作 |
|---|---|---|
| 7 个聚合门禁、14 个内部检查 | **保留**。当前已区分裁决和机器 / 专业检查，失败仍阻断。`claim-001` | 让说明文档只显示适用检查和所需决定；不得把所有门禁解释为每次都要用户重新回复 |
| 同版本、同范围的批准延续 | **保留并贯彻**，当前 tailoring 已明确；不是本次新增机制 | 核对 Skill / profile 是否仍要求重复批准；命中实质变化才重新决定 |
| 旧三轴维护候选协议 | **不再作为默认路径；暂不硬删工具**。当前仅显式独立审查和历史兼容使用。`claim-010` | 如后续决定彻底停用，先停止新建旧任务包，再保留历史候选、摘要和 review record 的读取校验；另起 L3 维护范围 |
| `check.design-reviewed` 与 `check.architecture-reviewed` | **本轮不合并**。两者证据类型相近，但触发范围不同 | 可以一次审查逐项留结论；只有证明风险覆盖完全等价后才考虑 ID 迁移 |
| stage tracking 与 `wayfinder` | **待试点，暂保留**。前者记录工作与验收，后者维护决策 frontier | 先证明同一未决问题能完整映射并恢复，不能以“都是计划”认定重复 |
| Fresh Verification、合同批准、用户决定、历史摘要基线 | **保留** | 以减少重复输入、派生视图和命中式验证降低成本，不删除放行依据 |

### 三、技能退役与合并清单

| ID / 优先级 | 技能或包 | 推荐处置 | 替代与必须承接的行为 |
|---|---|---|---|
| S01 / P1 | `.codex/skills/data-analytics` | **移出模板内置分发和 frontend profile，改为按需外部能力** | 当前 178 文件、4,069,135 字节、18 个 nested SKILL；定向扫描只见注册/同步关系，未见 YSS 工作单元调用。用户显式使用可能仍存在，不能宣称无人使用。不要卸载用户全局插件或删除实例自行安装内容。`claim-002` |
| S02 / P1 | `wait-what` | **退役独立入口** | 只有重新解释当前结论的表达要求；由普通对话及 document-writing 承接。删除 adapter、user_invoked、profile 中的正向路由，旧名留 tombstone。`claim-008` |
| S03 / P2 | `grill-with-docs` | **合并入原生澄清工作单元** | 不只是别名：必须承接 grilling、domain-modeling、词汇对账、正式资产归属与返回生命周期；同步需求经理的 role defaults。`claim-008` |
| S04 / P2 | `to-questionnaire` | **降为外部输入问卷模板 / 参考文档** | 保留 recipient、requested_outputs、response_ref、resume_route 及 `external-input-required`，答案回流后重新分类；不能把等待外部信息当作澄清完成。`claim-008` |
| S05 / P2 | `improve-codebase-architecture` | **合入 codebase-design 的显式审计模式后退役入口** | 承接热点取证、候选比较、ADR 冲突与报告，不把审计请求变成自动重构。`claim-008` |
| S06 / P2 | `frontend-commit` / `java-backend-commit` | **先共用提交核心和资产，暂保留两种发现入口** | 保留前端 monorepo / pnpm 和后端 wrapper、DB migration、模块 scope 差异；显式提交授权、暂存保护与 hooks 不变。不要为了减一个名字让两端都加载全量规范。`claim-008` |
| S07 / P2 | `prototype` 的 UI 分支 | **收窄职责，暂不退役整项** | 正式产品原型由 yss-prototype-stage 持有；保留一次性逻辑 / 状态机实验。普通试验不应被强制升级为完整产品设计。`claim-008` |
| S08 / P3 | `setup-matt-pocock-skills` | **暂保留；完整迁移配置恢复职责后再考虑更名/合并** | 当前仍是 setup readiness 缺失的指定恢复入口，to-spec、to-tickets 等依赖它；“名字旧”不足以支持删除 |
| S09 / P3 | `wayfinder` | **暂保留，可做状态统一试点** | 保留 decision frontier、claimed/resolved 与正式 Ticket 五态之间的转换，避免未决项遗失 |

技能事实与反证集中在 `claim-008`。首批 canonical 数量只计划从 **80 到 79**；Data Analytics 属于另一个平台包统计口径。P2 若 S03–S05 全部完成，可再减少 3 个 canonical 入口至 76；这只是条件目标，不是删除配额。S06 默认不减少入口，S07 默认只改职责。

明确保留：

- `yss-product-lifecycle`、实现合同编译器、研究、设计与工程权威 owner，以及 YSS 前后端专项技能。
- Formily 路由与基础 / 联动 / 模式 / 分步技能；其条件依赖有实际价值，不按文件小或名字相似合并。
- `mapstruct`、`lombok`、YSS 组件技能；能力闭包仍消费它们。
- `yss-security-algorithm` 的存量诊断和迁移能力；禁止新接入不等于旧系统无需处置。
- `i-have-adhd` 和 `writing-for-agents`：分别服务生命周期文档表达和 Agent 指令编写，首批不删；名称改动另论。
- `product-design` 平台包：yss-prototype-stage 第 24 行仍有条件还原调用，不能类比 Data Analytics 直接外置。
- `to-spec`、`to-tickets`、`implement`、`triage` 等剩余显式兼容入口：本轮没有证明其完整行为已由其他入口等价承接。
- 进行中的 `llm-wiki`：本轮工作区已有大量变更，不以当前短期引用数量评判它的去留。

完整 80 项按层级列于文末，机器清单见 inventory；“暂保留”并不等于已经逐项证明长期使用价值。

### 四、CLI 项目与分发

| ID / 优先级 | 对象 | 判断与执行前置 |
|---|---|---|
| C01 / P1 | `scripts/instantiate-harness` | **最明确的行为退役候选**。第 64 行生成旧 snake_case metadata，而 cli-core/identity.mjs 第 55–61 行拒绝该格式；共享同步脚本仍向 Agent 源仓复制它。须先固定可安装的新 backend/frontend CLI 版本并通过实际包 smoke，再改为非零退役提示、目标零写入。现有合同第 163–165 行已规定这个顺序。`claim-007` |
| C02 / P1 | dev 家族残余说明与补丁 | dev 已退出新项目选型，**不重复列为新增退役**。核对 `.gitmodules`、当前同步配置和校验消费者后，再清理现行 CI 文档里的私有子仓例外及孤立 dev patch。旧身份检测保留 |
| C03 / P2 | create-yss-spec 与 cli-core 的共同原语 | **先列行为差异，再研究共享实现**。Spec CLI 有 skills/assets 按需分发、Programmatic API 和后端插件 pack-cli 消费者；不能直接替换成专职 core。`claim-007` |
| C04 / 保留 | 4 个现行 CLI 产品入口 | **保留** create-yss-spec、create-yss-harness-design、create-yss-harness-backend、create-yss-harness-frontend。三个专职包已经是共享 core 的薄包，独立身份、模板和发布职责仍有效 |
| C05 / 保留 | 3 个 Agent 源仓 | **保留 profile 边界，共享内容继续生成同步**。设计负责战略交接，后端负责实现与后端交付，前端联合接收并验证 UI；物理合仓没有已证明的收益 |
| C06 / 低优先级 | create-yss-strategic-design 本地目录名、upgrade 别名、src/cli.js 兼容桥 | 不纳入首批；目录名不代表第五个产品，桥接别名的维护成本低，外部深路径消费者未知 |

CLI 整合前先对齐：metadata/schema、异族拒绝、ownership、force、plan/JSON 错误、事务恢复、阶段与 Skill 闭包、公开 API、插件打包嵌入。共享的是经过验证的等价原语，不能先决定删掉某个产品再补理由。

额外待核对：设计 profile 声明 handoff v5，后端接受 `[3,4,5]`，前端 profile 仍列 `[3,4]`/current 4。这里只确认声明存在差异，没有证明实际运行链拒绝 v5；应在整合前追踪真实消费者，不能当成已复现故障。

### 五、按依赖推进的实施计划

| 批次 | 范围与顺序 | 维护强度 / 执行责任 | 退出条件 |
|---|---|---|---|
| W0：对账基线 | 固定本轮候选、记录已知消费者与工作区状态；D01、D03、D06 和 C02 的文档对账；历史路线未闭合先降为历史说明 | 等义文案 L1；改变规则 L2/L3。由主模板维护者推进 | 每项能说明现行事实源、替代关系和剩余事项；不改历史批准；无新的错误推荐 |
| W1：明确退役 | S01、S02；D02；C01 在固定版本安装/smoke 通过后进入。同一候选内同步必要 profile / projections / locks / snapshots | 入口路由、生成或跨仓语义按 L3；单纯派生文字 L1。主模板维护者协调受影响 CLI/Agent | 新入口/分发行为实测；旧创建目标零写入；旧名明确诊断；用户文件保护验证通过 |
| W2：职责合并 | 分别完成 S03–S07 的“旧行为 → 新 owner → 输入/输出 → 验证”承接表，再逐项实施；D04、D05 与所属消费者一起迁移 | 默认 L2；角色、状态、合同/生成语义命中时 L3。每个合并项单独收口 | 新路由通过正例、相邻不触发例、授权/状态反例；旧入口消费者全部迁移后才移除 |
| W3：可选架构收敛 | C03 的共享原语试点；S08/S09；是否停止新建旧维护候选协议 | L3；由维护者选择范围，不与 W1 捆绑 | 对外行为等价、历史可读、回滚可恢复；收益不足则保留原结构 |
| W4：独立证据归档 | 仅在需要减小源仓工作树时启动；先制定 maintenance 证据索引与恢复合同 | 历史兼容与证据规则变化按 L3；归档 checkpoint 需要后续 Git 授权 | 原始 bytes、SHA、commit 与恢复演练齐全；不得套用只针对 reviews/13 文件的现有规则批量删 maintenance |

不承诺缺乏依据的精确天数。W0 可先完成；W1 的技能退役与 C01 的安装前置互不阻塞。一次只收口一个合并候选，避免同时改主控、门禁、CLI 身份和技能体系后失去问题定位能力。

### 六、实施验收与回滚合同

以下是**未来实施的验收要求**，不是本次已经通过的结果。

1. **来源与调用闭包**：canonical / 平台源 → Registry 与 capability/recipe → role defaults / typed dependencies → profile exact/adapted/reference_roots → 各 runtime projection → lock/upstream manifest → CLI bundle。不得只删一个目录或手改快照。
2. **技能行为**：退役 ID 不再作为新工作入口；resolver 给稳定拒绝/替代提示。澄清、问卷、架构审计和 commit 合并分别验证原行为、邻近不触发场景及授权反例。
3. **初始化 seam**：旧创建命令非零、显示固定可用版本、目标零写入；四个现行家族按各自支持的 init/attach 能力验收；异族、多 metadata、损坏 metadata 和 force 绕过均写前拒绝。
4. **存量保护 seam**：普通 sync 保留退出分发文件；显式 prune 仅清理内容、类型、mode 与可信基线一致的受管路径；用户改动、CONTEXT、批准记录、项目文档和自行安装插件保留。保留 `retiredFiles`、`transitionBaselines` 和 layout/旧身份拒绝逻辑。`claim-012`
5. **故障 seam**：应用失败、中断恢复、恢复前二次修改、链接/路径越界；均保存可恢复材料，不能把恢复不完整报成成功。
6. **验证范围**：日常按影响运行 `scripts/verify-template-fast`，适用的 `sync-profile-skills --check --profile all`、`sync-skills --check`、`update-skill-lock --check`、Registry/退役 ID 校验及相关场景；PR 用 candidate。不因做计划而运行全量发布门禁。
7. **交付边界**：实施授权与 Git / npm 授权分开。后续提交来源后才从最终 40 位 SHA 构建 CLI；完整发布验证、真实 tgz 安装、实例初始化/同步与插件消费者通过后才能讨论可发布。WORKTREE 证据只说明开发状态。

回滚以每批自己的源文件、profile 和固定 CLI 版本为单位。已迁移实例通过原事务日志恢复，不使用全仓 reset、清理未跟踪文件或强制覆写用户文件。源码删除保留 tombstone 与迁移记录；已冻结资产、原始回复和历史证据保持原字节。

### 七、收益目标

- 默认文档只保留一处规则定义；目录、门禁与 Recipe 的过时推荐清零。
- 首批减少 1 个 canonical Skill 和 1 个平台包的内置维护面；Data Analytics 主模板部分为约 3.88 MiB，未重复计算 frontend 副本及 CLI blob，也不把它当作 npm 包压缩体积降幅。
- 旧初始化路径不再产生新 CLI 拒绝接管的旧格式项目。
- 现行 CLI 家族仍为 4 个，Agent 源 profile 仍为 3 个；不以删仓数量作为成功指标。
- 第二批以重复规则减少、恢复/批准行为完整、用户请求正确路由为验收；不预设必须减少到某个技能总数。

## Counter-Signals

低引用不证明无用户；用户可以显式调用兼容技能。短入口也可能持有资产归属、恢复或授权边界，尤其是 setup、grill-with-docs、问卷和审计。

三套专职 CLI 已共享引擎；Spec CLI 有独有分发和公开 API。多仓结构、runtime 投影、历史 schema 和 retired baseline 的重复外观具有职责或兼容用途。旧维护协议仍允许显式选择，不应仅因已非默认就硬删。

已做过的退役（如旧 dev 新建选型、旧原型路径和旧技能 ID）只核对残余消费者；不重新计算为本计划收益。历史证据和未提交研究不能按“过时文件”处理。

## Source Map

关键事实对应的 claim 与一手来源如下；[retirement-evidence.yaml](retirement-evidence.yaml) 保存逐项支持、反证和限制。

| Claim | 支持的事实与定位 |
|---|---|
| claim-001 | 生命周期 Registry 的 stages/gates/checks/artifacts/work_units/evidence；技能 Registry 第 9–15 行与 skills 分层 |
| claim-002 | 技能 Registry 第 790–800 行；profile-skill-sync.json 第 624–627 行；Data Analytics 跟踪文件统计和定向消费者检索 |
| claim-003 | README 第 19–34 行；工程说明第 37、56 行；CONTEXT 第 65 行；当前 Registry 的 deprecated_ids 与 gate.delivery-accepted |
| claim-004 | architecture/README.md 第 31–57、84–90 行；tailoring 的条件门禁与审查规则 |
| claim-005 | next-major-template-governance.md 第 3、27–33 行；当前 tailoring 第 67–98 行；源治理区 README 第 13–16 行 |
| claim-006 | domain.md 与 setup 技能第 76、104 行；tech-design-template.md 第 3 行；verify-lifecycle-operator-scenarios 第 115 行、verify-governance-release 第 12 行 |
| claim-007 | instantiate-harness 第 16–28、64 行；cli-core/identity 第 55–61 行；dedicated-harness-cli-design 第 163–165 行；Spec router/API 与后端插件 pack-cli |
| claim-008 | 候选技能 SKILL.md、matt-yss-adapter.md、orchestration-contract.yaml 第 300、996–1008、1030–1043 行，角色与 profile 同步配置 |
| claim-009 | 技能 Registry 第 178–180 行；编译器 boundaries 第 68–70 行；implementation-contract-compiler.mjs 第 122–127 行 |
| claim-010 | harness-process-tailoring.md 第 67–110 行；旧协议仅显式调用及历史兼容 |
| claim-011 | git ls-files 与普通文件 bytes 统计；源治理区 README 的归档约束 |
| claim-012 | cli-core/build.mjs 第 223–251 行、engine.mjs 第 67、82–94 行、legacy.mjs 第 3–18 行；旧基线仍参与安全同步 |

主要依据是当前本地源码，不是历史结论。记忆仅用于定位已有退役与迁移边界；关键判断已在本轮源文件复核。CodeGraph 输出只作导航，没有当作最终新鲜度证据。

## Decision Handoff

推荐后续范围为 **W0 + W1**；C01 必须先闭合固定版本可安装与 smoke 前置。W2 按单项承接方案逐项选择；W3/W4 暂不作为首批必要工作。

由主模板维护者接收本计划，经后续用户选择范围后进入权威资产维护。该计划不修改 Registry、角色、Skill、CLI 源码、项目实例、Ticket 或批准状态；不授予 Git 提交、推送或 npm 发布权限。

## Evidence Limitations

- 已盘点全部 Registry 条目和分发关系，对候选进行定向正文与消费者审计；没有逐行审查所有文件，也没有实际用户调用遥测。
- 当前工作树包含其他任务改动，后续实施前需重检来源摘要；本报告不是固定提交的发布证据。
- 未检查 npm 当前可安装版本、全量真实实例或插件安装状态；不能认定旧初始化入口的退役前置已经满足。
- 没有运行四套 CLI 安装/初始化/迁移回归、Agent 行为评测或全量 verify-template；没有证明 handoff 版本声明差异导致实际运行失败。
- 本轮已执行 `node scripts/verify-lifecycle-registry` 和 `node scripts/verify-retired-skill-ids`，均退出 0；它们仅证明当前对应结构/退役扫描检查通过。
- 计划与来源台账已通过 `verify-maintenance-research` 的结构、引用 ID 与证据绑定检查；已重新读取保存文件，核对相对链接、45 项来源摘要及完整 80 项技能清单。最终记录见 [verification-final/verification.json](verification-final/verification.json)。这些检查不等于建议已获批准或实施通过。

## 附录：80 个 canonical 技能的当前分层

这是完整注册清单；退役 / 合并候选以 S02–S09 为准，其他条目本轮暂保留。平台包另列，不将运行时投影计作新技能。

**core（23）**

`i-have-adhd`、`code-review`、`codebase-design`、`competitive-intelligence`、`diagnosing-bugs`、`domain-modeling`、`grilling`、`handoff`、`implementation-repo-onboarding`、`llm-wiki`、`maintaining-skills`、`prototype-review`、`yss-research`、`resolving-merge-conflicts`、`tdd`、`yss-design-system`、`yss-technical-design`、`yss-openapi-draft-review`、`yss-openapi-governance`、`yss-product-lifecycle`、`yss-prototype-stage`、`yss-implementation-contract-compiler`、`yss-stage-decision`。

**specialist（41）**

`alibaba-java-code-style`、`archify`、`cross-repo-implementation-routing`、`lombok`、`mapstruct`、`yss-api-integration`、`yss-audit-log`、`yss-application`、`yss-cache`、`yss-ddd-scaffold-generator`、`yss-layered-mvc-scaffold-generator`、`yss-distributed-id`、`yss-domain`、`yss-tactical-design`、`yss-dto`、`yss-excel-mvc`、`yss-exception`、`yss-formily`、`yss-formily-schema-generator`、`yss-frontend-scaffold-generator`、`yss-hook`、`yss-mybatis`、`yss-repository`、`yss-resilience4j`、`yss-security-algorithm`、`yss-ui`、`yss-ui-business-page-generation`、`yss-up-springboot3`、`yss-backend-spec-review`、`yss-userinfo`、`yss-validation`、`yss-web-controller`、`file-export-download`、`formily-foundation`、`formily-linkage-effects`、`formily-mode-slot-detail`、`formily-step-flow`、`theme-token-usage`、`yedit-table-usage`、`ytable-usage`、`ytree-usage`。

**compatibility（7）**

`grill-with-docs`、`implement`、`improve-codebase-architecture`、`setup-matt-pocock-skills`、`to-spec`、`to-tickets`、`triage`。

**maintainer-only（9）**

`prototype`、`to-questionnaire`、`using-git-worktrees`、`wait-what`、`wayfinder`、`writing-for-agents`、`yss-skill-source-index-refresh`、`frontend-commit`、`java-backend-commit`。

**平台包**：`data-analytics` 建议移出内置分发；`product-design` 保留条件调用。
