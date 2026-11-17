# YSS 全生命周期研发与衔接管理：深度调研与规划建议

研究日期：2026-11-17（Asia/Shanghai）

适用对象：同时兼容多人研发团队与多 Agent 协作；围绕 Spec、Backend、Frontend 三类 Profile。

文档性质：事实研究、对比分析与方案建议；不是已批准的实施规格，不宣称平台接入、发行、部署或业务验收已经完成。

## 1. 研究结论与需要支持的决定

**建议保留现有三个 Profile，以同一业务目标贯通规则、工程工作项、接口契约、代码变化、验证、发布和运行反馈。Issues 适合承载持续协作记录，但不是完整生命周期本身。**

本次研究修正了前两轮方案的基线：当前工作树已经加入共享 Issue 操作方法、三 Profile 接入、项目初始化以及分发声明。后续重点应是验证这些候选改动在实际安装和真实项目中是否一致生效，并把分散的发布与反馈方法接到同一责任链。不能继续把“Backend/Frontend 没有 tracker”当作当前事实。

建议采用以下方向：

1. **Profile 按能力划分，责任按工作项分配。** Spec、Backend、Frontend 可以并行协作；一个人或 Agent 可承担多个角色。交接执行者不应造成业务决定、接口或集成责任无人承接。
2. **按信息职责分别确定唯一来源。** Spec 维护业务意图；工程契约维护生产接口；Issue 维护本次执行范围与进展；PR/MR 维护实际变更；部署记录维护目标环境事实。用引用串联，不在每处复制整套正文。
3. **按实际依赖调度工作。** 父子关系表示范围归属，阻塞关系表示真实前提，接口消费关系表示版本依赖；三者不能互相替代。
4. **按请求终点报告完成。** 本地实现、合并、部署、业务验收、上线效果分别记录。任务只要求本地修复时，不把部署变成额外完成门槛；任务承诺业务可用时，也不能用 PR 合并代替整体结果。
5. **从现有方法中形成可执行的协作约定。** 不先新增中央状态服务、通用自动调度器或第四个 Profile，也不把所有任务强制转成多级票据。
6. **优先做真实贯通观察。** 源码存在、Bundle 分发、目标工程安装、宿主实际调用、业务运行结果是不同证据，不能互相替代。

这些结论是针对 YSS 当前约束的适配建议。公开框架的技能规定和产品文档能说明机制，不能证明在本团队中的效率或质量收益。

## 2. 调研范围、基线与证据限制

### 2.1 本次调查了什么

围绕同一组任务比较：从业务问题形成规格；将规格细化为可执行工作；协调前后端接口；并行实现；应对需求变化；验证与交付；发布和恢复；从运行反馈进入下一轮工作。

采用的材料包括当前 YSS 工作树、Matt skills 与 pstack 的固定版本源码、Spec Kit 与 OpenSpec 的官方资料，以及 GitHub/GitLab、OpenAPI、Pact、DORA 的官方文档。没有依赖二手教程中的功能概括，也没有用星标数、技能数或文档数量给框架评分。

| 对象 | 本次核对基线 | 可以据此说明什么 |
|---|---|---|
| YSS 模板 | 当前工作树；HEAD 为 e60d603ed017a5bc36cc9b8fa7ee750ac93b20dc，提交标题为准备 Template 5.9.0；存在大量既有未提交/未跟踪改动 | 当前文件和分发声明；不能据此证明发行或安装状态 |
| Matt skills | 1.3.2；5863806dd4e15c63174bee4e7515a4256792ecfa | 当前稳定插件列出的技能及其规定 |
| pstack | 0.15.43；目录提交 2f87c854fe3e2fcda44ca86b46ede35aad3c46b7 | playbook、watch-pr 程序和单独配置的自动化边界 |
| Spec Kit | main 固定提交 e210504aa09c9273a38bba665b12b8088468c96f；pyproject 标记 1.4.2.dev0 | 当前开发主线；不称为已经发行的稳定 1.4.2 |
| OpenSpec | 2.1.0；f085c850f9440f497ccc76ecbc2859c09e0e0ac7 | 当前源码；Stores/Worksets 仍明确为 beta |
| GitHub/GitLab | 2026-11-17 可读的官方在线文档 | 平台公开能力及条件；不代表用户实际实例已具备 |
| OpenAPI/Pact/DORA | 本文引用页面及指定版本 | 接口描述、契约验证和交付度量的适用边界 |

版本依据：[Matt 插件清单](https://github.com/mattpocock/skills/blob/5863806dd4e15c63174bee4e7515a4256792ecfa/.claude-plugin/plugin.json)、[pstack 清单](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/plugin.json)、[Spec Kit 版本声明](https://github.com/github/spec-kit/blob/e210504aa09c9273a38bba665b12b8088468c96f/pyproject.toml)、[OpenSpec 版本声明](https://github.com/Fission-AI/OpenSpec/blob/f085c850f9440f497ccc76ecbc2859c09e0e0ac7/package.json)。

### 2.2 证据如何解读

- **事实**：本次实际读取的源码、配置或官方文档明确表达的内容。
- **推断**：根据这些内容推导的衔接风险、适配程度和维护代价。
- **建议**：本报告提出的 YSS 组织方式，不冒充用户已批准的决定。
- **未知**：用户平台版本/套餐、权限、实际安装来源、真实工程运行和团队收益等尚未验证内容。

本轮未安装上游框架，未执行其脚本，未创建远程 Issue，未运行真实业务构建、联调或发布。CodeGraph 对本工作树返回未索引，本地虽有目录，本轮没有重新建立索引；文档调查采用直接读取。Spec Kit 的 GitHub API 查询曾受限，固定提交通过 git ls-remote 取得，源码通过固定提交 URL 读取。

## 3. 当前 YSS 已经覆盖了哪些环节

以下“已有”指方法或配置存在，不代表用户业务项目已执行成功。

| 环节 | 当前职责与材料关联 | 事实与证据 |
|---|---|---|
| 研究与规格 | 从目标、事实和业务决定形成规则、原型与交互说明；研发承接技术设计 | [生命周期入口](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/.agents/skills/yss-product-lifecycle/SKILL.md:8)已明确职责；业务票不是额外必交付物 |
| 需求变化 | 保留原规则/验收关联，确认绑定实际范围与版本，只重做受影响内容 | [共享规格方法](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/.agents/skills/yss-product-lifecycle/references/spec-workflow.md:87)及[规格增量模板](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/.template-spec/templates/spec-delta-template.md:17)已有增量方法 |
| Issue 承接 | 区分规则源、执行记录与 PR/MR；处理真实目标、依赖、并发与恢复 | [共享 Issue 操作](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/.template-spec/agents/issue-tracker-operations.md:7)是当前未跟踪候选，不能称为已发布能力 |
| 后端工程 | 根据真实工程设计与拆分，沿业务行为贯通适用技术层 | [Backend implement](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/profiles/backend/.agents/skills/implement/SKILL.md:8)及[研发拆票](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/profiles/backend/.agents/skills/to-tickets/SKILL.md:8)已有基础，Issue 接续正在工作树增强 |
| 前端工程 | 设计还原、真实数据边界、接口消费、必要任务拆分及验证 | [Frontend 应用入口](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/.agents/skills/yss-frontend-application/SKILL.md:43)已接入共享 Issue 方法，不需要默认安装 Backend 拆票入口 |
| 接口协作 | 后端或契约仓维护生产 API；Home 引用；前端消费有来源的契约并生成客户端 | [跨仓契约归属](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/.agents/skills/implement/references/repository-scope.md:43)、[OpenAPI 治理](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/.agents/skills/yss-openapi-governance/SKILL.md:8)及[前端接口接入](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/.agents/skills/yss-frontend-application/references/openapi.md:7)已有方法 |
| 并行与集成 | 指定各仓责任、共享接口和生成物整合者；子任务自报完成仍须集成 | [跨仓分工](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/.agents/skills/implement/references/repository-scope.md:43)及[切片依赖](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/profiles/backend/.agents/skills/to-tickets/SKILL.md:20)已有保护 |
| 验证 | 后端验证行为、事务与副作用；前端区分工程、视觉与交互证据；模拟不代替真实联调 | [后端测试](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/profiles/backend/.agents/skills/yss-backend-testing/SKILL.md:8)及[前端验证](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/.agents/skills/yss-frontend-application/references/verification.md:7)已有专门方法 |
| PR/MR | 核对实际 head、检查对象、讨论版本与合并结果；处理变化及中断 | [PR/MR 持续跟进](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/.agents/skills/implement/references/pr-mr-followup.md:19)已有，Frontend 单独分发其参考文件 |
| 发布与恢复 | 包含兼容窗口、生产者/消费者顺序、应用回退和数据恢复区别 | [后端构建部署方法](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/profiles/backend/.agents/skills/implement/references/build-deploy-guide.md:11)已有；不是从零缺失 |
| 场景串联 | 新 Demo 已描述固定制品组合、部分发布失败、测试环境 AC 和续办 | [生命周期 Demo](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/.template-spec/user-guide/客户跟进项目全生命周期Demo.md:696)是未跟踪教学候选；[Demo 范围声明](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/.template-spec/user-guide/客户跟进项目全生命周期Demo.md:11)明确没有真实部署/验收证据 |
| 反馈 | 研发发现回到原 FR/AC，业务新取舍定点处理，已有研究/分诊/复盘能力 | [规格反馈](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/profiles/backend/.agents/skills/implement/references/spec-feedback.md:9)已有；生产运行效果如何触发下一轮决定仍需在通用主链明确 |

当前分发配置已经为三个 Profile 的 project/skills 模式声明共享 tracker 资源。默认入口仍保持差异：Spec 包含业务拆票和通用 implement，Backend 包含研发拆票和后端 implement，Frontend 由应用技能承担实现与必要拆分。没有理由仅为名称对称增加一整套入口。[Spec 分发](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/.template-source/distribution/bundle-profile.json:370)、[Backend 分发](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/profiles/backend/.template-source/distribution/bundle-profile.json:313)、[Frontend 分发](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/profiles/frontend/.template-source/distribution/bundle-profile.json:342)。

**相对前两轮，调查重点应从“设计一个不存在的 tracker 层”转为“确认候选接入能否实际使用，并统一团队对来源、责任和完成的理解”。** 新 Demo 已有发布恢复内容，也不应重复提出“新增一套发布技能”作为默认答案。

## 4. 四类外部方法的深度比较

### 4.1 它们解决的主要问题不同

| 比较维度 | Matt skills | pstack | Spec Kit 当前主线 | OpenSpec 2.1 |
|---|---|---|---|---|
| 主要组织方式 | 可组合技能、Spec、票据依赖图 | 负责人、playbook、PR 与运行证据 | 规格、技术计划、任务及收敛检查 | 行为规格、变更增量和归档回流 |
| 业务与技术边界 | 同一 Spec 可含 schema/API/模块决定 | 架构和执行计划面向工程 | specify 表达意图，plan 承担技术方案 | spec 描述行为，design 描述实现方案 |
| 工作项载体 | tracker Issue 或本地票据文件 | 计划、PR、执行记录；另有窄范围 Issue 自动化 | 主要为任务文件，外部集成可扩展 | 变更目录内的 tasks 与规格增量 |
| 普通实现是否都先拆票 | 单 implement 可直接接 Spec；整体 implement-spec 要关联票 | 简单改动可跳过多阶段计划 | SDD 路径有 plan/tasks；缺陷有独立扩展入口 | propose/apply 路径有产物依赖，可裁剪与修改 |
| 并行重点 | 依赖前沿、独立 worktree、集成分支 | 可隔离工作、单 PR owner、共享写入协调 | 任务依赖、用户故事与并行标记 | 多个变更及共享规划材料；非生产调度器 |
| 变更与恢复重点 | 来源指针、决策地图、任务图 | 暂停、恢复、PR 当前事实重建 | 修改意图、分析一致性、补齐遗漏任务 | delta spec 回写到主规格，变更可随时修订 |
| 多仓能力证据 | 读取/分工协议可借鉴，核心集成分支示例偏单仓 | 多 PR/stack 运行深入，多仓业务模型需适配 | 有扩展机制，本轮未验证完整三仓调度 | 新 Stores 明确服务跨仓规划，但处于 beta |
| 交付终点 | 集成分支或可审 PR 等技能约定终点 | merge-ready、merged 等 playbook 各有边界 | converge 评估实现与意图，不等于部署 | archive 同步文档，不等于环境已上线 |
| YSS 适合吸收 | 稳定工作项、真实依赖、按行为拆分 | 责任延续、版本化证据、运行恢复 | 意图与实现分开，发现缺口不反改规则 | 行为增量、共享规划入口、避免全量重写 |
| YSS 不宜直接迁入 | 业务 Spec 中的生产技术设计、默认提交/TDD | 特定 playbook 的固定审查规模、脚本与宿主假设 | 固定文件流水线、通用 checklist 门槛 | 新 CLI/状态根/目录体系的整体替换 |

矩阵描述已读的默认路径和方法，不表示整个项目只有这些能力。框架可扩展，不等于扩展已经安装或经过验证。具体依据与反向证据如下。

### 4.2 Matt：最适合借鉴票据依赖，不能照搬业务 Spec 边界

当前 to-spec 已采用已有讨论的综合方式，而非重复开展完整访谈；但其模板允许 implementation/testing decisions，包含模块、schema 和 API。对 YSS，综合与稳定来源值得保留，生产技术部分应进入研发设计，不能因为模板叫 Spec 就归业务侧。[to-spec](https://github.com/mattpocock/skills/blob/5863806dd4e15c63174bee4e7515a4256792ecfa/skills/engineering/to-spec/SKILL.md#L7-L65)

to-tickets 以可展示行为组织切片，保留 blockers，并为宽重构提供 expand–contract 例外。单独 implement 接受 Spec 或 tickets；只有 implement-spec 假定关联票据，并按依赖前沿安排 worktree 和集成分支。因此，“采用 Matt”不推出“每个小任务必须先建票”。[to-tickets](https://github.com/mattpocock/skills/blob/5863806dd4e15c63174bee4e7515a4256792ecfa/skills/engineering/to-tickets/SKILL.md#L25-L67)、[implement-spec](https://github.com/mattpocock/skills/blob/5863806dd4e15c63174bee4e7515a4256792ecfa/skills/engineering/implement-spec/SKILL.md#L11-L42)

需要裁剪的默认行为包括提交、测试方法和上游审批提示。另有一个静态组合风险：implement 先 review 后 commit，而 code-review 指定的 base...HEAD diff 没有明确覆盖未提交修改；实际组合使用时可能漏掉当前工作树。此处是源码推断，未运行复现，不据此评价整个框架质量。[implement](https://github.com/mattpocock/skills/blob/5863806dd4e15c63174bee4e7515a4256792ecfa/skills/engineering/implement/SKILL.md#L7-L17)、[code-review](https://github.com/mattpocock/skills/blob/5863806dd4e15c63174bee4e7515a4256792ecfa/skills/engineering/code-review/SKILL.md#L17-L23)

其 software-factory 位于 in-progress，明确为 beta 且排除于稳定插件，不能用于宣称 1.3.2 已交付完整自治研发系统。[实验能力边界](https://github.com/mattpocock/skills/blob/5863806dd4e15c63174bee4e7515a4256792ecfa/skills/in-progress/README.md#L1-L17)

### 4.3 pstack：最适合借鉴持续负责与验证，不能把 watcher 当完整治理

Feature playbook 重视依赖、共享写入和负责人；Swarm 进一步强调独立任务与版本绑定。它的价值在于让委派后的工作仍有集成人，并把验证绑定到真实改动，而非仅接收子代理的“完成”结论。[Feature](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/poteto-mode/playbooks/feature.md#L3-L19)、[Swarm](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/swarm/SKILL.md#L20-L37)

常规 Feature 路径还要求频繁提交，并在末尾进入 Opening a PR，后者默认创建 ready PR。这些默认动作需要按 YSS 的真实授权适配，不能因为调用技能就一并继承。[Feature 默认动作](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/poteto-mode/playbooks/feature.md#L12-L17)、[Opening a PR](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/poteto-mode/playbooks/opening-a-pr.md#L5-L9)

不同 playbook 的终点不同：Opening a PR 不自动启动 babysit；babysit 的 drive 模式推进到可合并，check 和 threads-only 分别限于状态检查和审查线程，均不因此取得合并授权。Shipping 及获得相应授权的 Autopilot-full 承担合并闭环。watch-pr 确实有 TypeScript 实现，但读取状态并分类不等于验证全部业务行为或取得合并授权。[Babysit](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/poteto-mode/playbooks/babysit.md#L5-L10)、[Shipping](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/poteto-mode/playbooks/shipping.md#L3-L10)、[Autopilot-full](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/poteto-mode/playbooks/autopilot-full.md#L7-L19)、[watch-pr 判定](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/poteto-mode/scripts/watch-pr/policy.ts#L160-L216)

不能把 pstack 简化成“没有 Issue 能力”：它有默认休眠、单独配置的 Benny 自动化，面向特定报障分诊和有界修复，修复端只生成 draft PR，不合并或部署。这不构成完整的产品需求、跨仓工程票与业务验收体系。[Benny](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/automations/benny/README.md#L3-L23)、[修复边界](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/automations/benny/skills/reproduce-and-fix-issues/SKILL.md#L284-L299)

也不应笼统称其所有工作都强制 TDD 或重门禁：当前 TDD 有明确按需分支，worker 禁止加入任务之外的额外 gate；较复杂计划才有更重要求。YSS 应采纳适用的方法，不复制固定规模或自行授予提交、发布权限。[TDD](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/tdd/SKILL.md#L3-L26)、[worker](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/poteto-mode/worker.md#L4-L7)、[多阶段计划](https://github.com/cursor/plugins/blob/2f87c854fe3e2fcda44ca86b46ede35aad3c46b7/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md)

### 4.4 Spec Kit：意图、方案、任务分离，收敛不应反向篡改需求

当前主线已经提供 SDD、缺陷修复、想法评估等独立入口，不能沿用“所有工作都从一套 SDD 步骤开始”的旧印象。SDD 路径仍明确区分 specify、plan、tasks、implement、converge；较完整路径包含额外检查。[当前 README](https://github.com/github/spec-kit/blob/e210504aa09c9273a38bba665b12b8088468c96f/README.md)、[官方 quickstart](https://github.github.com/spec-kit/quickstart.html)

最值得借鉴的是变更分类与 converge 的边界：实现是调查证据，不自动替代需求；converge 检查缺口，并只向任务追加剩余工作，不修改 Spec 来迁就代码。YSS 可在现有 review、反馈与父 AC 汇总中采用这条原则，不必安装新的收敛系统。[变更方法](https://github.com/github/spec-kit/blob/e210504aa09c9273a38bba665b12b8088468c96f/docs/how-to/evolving-specs.md)、[converge](https://github.com/github/spec-kit/blob/e210504aa09c9273a38bba665b12b8088468c96f/templates/commands/converge.md#L60-L100)

不宜照搬的是默认 SDD 文件与检查依赖，以及 checklist 未完成时暂停询问的机制。另需准确描述测试：tasks 明确只在请求或规格需要时生成测试任务；implement 对已有测试任务采用先测顺序。不能概括为一律要求全量 TDD。[tasks](https://github.com/github/spec-kit/blob/e210504aa09c9273a38bba665b12b8088468c96f/templates/commands/tasks.md#L145-L147)、[implement](https://github.com/github/spec-kit/blob/e210504aa09c9273a38bba665b12b8088468c96f/templates/commands/implement.md#L56-L87)

### 4.5 OpenSpec：增量与共享规划更贴近长期维护，归档仍不是上线事实

OpenSpec 区分稳定行为规格与当前变更。增量表达新增、修改和移除的规则，archive 将变化归并回主规格。其文档强调可以修订已有产物，而非把阶段锁死。这适合借鉴为 YSS 现有 spec-delta 的维护方法。[概念](https://github.com/Fission-AI/OpenSpec/blob/f085c850f9440f497ccc76ecbc2859c09e0e0ac7/docs/overview.md)、[工作方式](https://github.com/Fission-AI/OpenSpec/blob/f085c850f9440f497ccc76ecbc2859c09e0e0ac7/docs/workflows.md)

源码进一步将 WHAT 与 HOW 分开，要求任务包含可核验结果；规格、设计、任务由 schema 表达依赖。YSS 可以吸收行为边界与增量关联，不需要为此替换当前仓库结构和 CLI。[默认 schema](https://github.com/Fission-AI/OpenSpec/blob/f085c850f9440f497ccc76ecbc2859c09e0e0ac7/schemas/spec-driven/schema.yaml)

本次新核实到 2.1 的 Stores beta：规划可放在独立仓库，供多个代码仓和人员/Agent 共享；它有明确的目标选择优先级，不能简单说 OpenSpec 只支持单仓。但这是 beta，注册/目录/API 仍可能变化，也不提供跨仓原子发布保证。[Stores 官方说明](https://openspec.dev/docs/stores)、[固定版本 CLI 文档](https://github.com/Fission-AI/OpenSpec/blob/f085c850f9440f497ccc76ecbc2859c09e0e0ac7/docs/cli.md#L269-L435)

需要保留一个重要区别：文档归档与运行环境事实独立。主规格更新可以表示最新约定行为，某生产环境仍可能运行旧版本。YSS 应引用发布和部署版本说明实际可用范围，不能让“归档完成”隐含“所有用户已获得新行为”。

## 5. GitHub/GitLab 能承载什么，不能替团队决定什么

以下为公开能力比较。实际自建 GitLab 的版本、套餐、项目配置及权限尚未核实，不能直接套用在线文档中的所有新功能。

| 协作需要 | GitHub 当前文档 | GitLab 当前文档 | YSS 适配建议 |
|---|---|---|---|
| 跨仓业务范围 | 可用跨仓 sub-issues | Free 可用跨项目 relates-to；Epic 需 Premium/Ultimate，层级模型与 GitHub 不同 | 业务父票可选；原生层级不可用时用真实链接，不强制购买 Epic |
| 阻塞依赖 | Issue dependencies 已覆盖 Free 等套餐 | blocks/is blocked by 需 Premium/Ultimate | 无原生能力时表达方向、原因和解除条件；链接不冒充执行锁 |
| 跨仓看板 | Projects 可聚合 Issue/PR；默认自动化可将关闭或合并映射成 Done | group board、标签列和原生 Status 的能力/套餐不同 | 先解释状态语义，不照搬同名列 |
| 自动关闭 | 默认分支上的合并和关联可关闭 Issue | 默认分支合并或直接 push 也可能触发 closing pattern | 只对完成条件确为该次合并的工作项使用自动关闭 |
| 合并验证 | merge queue 测试目标分支和排队组合，需相应配置/套餐 | 普通 MR pipeline 测 source；merged results/merge train 为更高套餐 | 明确实际测试 SHA/组合；单仓绿色不推出跨仓集成通过 |
| 部署与发行 | Deployment/Status 与 Release 是不同对象 | 环境部署历史、Release evidence 有各自条件 | 分别保存制品版本、部署环境与真实验收；Release 不是部署成功 |

关系与状态依据：[GitHub sub-issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues)、[GitHub dependencies](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-issue-dependencies)、[GitLab linked issues](https://docs.gitlab.com/user/project/issues/related_issues/)、[GitLab Epic](https://docs.gitlab.com/user/group/epics/)、[GitHub Projects 自动化](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-built-in-automations)、[GitLab Status](https://docs.gitlab.com/user/work_items/status/)。

合并与部署依据：[GitHub Issue/PR 关联](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue)、[GitLab 自动关闭](https://docs.gitlab.com/user/project/issues/managing_issues/#closing-issues-automatically)、[GitHub merge queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)、[GitLab MR pipeline](https://docs.gitlab.com/ci/pipelines/merge_request_pipelines/)、[GitLab merged results](https://docs.gitlab.com/ci/pipelines/merged_results_pipelines/)、[GitLab deployments](https://docs.gitlab.com/ci/environments/deployments/)、[GitHub releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)。

### 5.1 三个不能由平台状态直接推出的结论

**子票关闭不推出父业务完成。** 一张工程票可能只承诺一个接口或页面。即使所有子票关闭，整体权限、异常恢复和真实联调仍可能缺证据。应按父项承诺的结果汇总，而非仅计算关闭数量。

**触发下游成功不推出多仓发布成功。** GitLab multi-project pipeline 默认独立运行；trigger job 成功可以仅表示创建了下游，状态传播需要相应配置。它不提供跨仓原子发布或统一回滚。[Downstream pipelines](https://docs.gitlab.com/ci/pipelines/downstream_pipelines/#multi-project-pipelines)

**看板 Done 不推出生产可用。** 自动化可能按合并或关闭更新看板，具体含义由项目配置决定。GitLab 原生 Status（18.4 GA，Premium/Ultimate）的 Done/Canceled 分类会关闭工作项，普通标签本身不改变开闭；因此不能不加区分地把“实现完成”映射为业务项的 Done。跨端事项应保留“已实现、已合并、已部署到哪个环境、已验证哪些行为”这些事实，界面是否显示成独立字段由现有平台承载能力决定。[GitLab Status categories](https://docs.gitlab.com/user/work_items/status/#status-categories)

部署与证据留存同样存在具体条件。GitHub 环境及其保护能力需按仓库可见性与套餐核对；GitLab Release evidence 页面总栏不能代替子能力条件，其采集子节将 Self-Managed/Dedicated 标为 Premium/Ultimate，收录 report artifacts 为 Ultimate。对未知自建实例，不能承诺自动保存全部发布与测试证据。[GitHub Environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)、[GitLab Release evidence](https://docs.gitlab.com/user/project/releases/release_evidence/#collect-release-evidence)、[Report artifacts](https://docs.gitlab.com/user/project/releases/release_evidence/#include-report-artifacts-as-release-evidence)

### 5.2 自动化应从可靠读写开始

| 风险 | 已核实的限制 | 应采用的处理 |
|---|---|---|
| 不完整读取 | REST/GraphQL 列表存在分页；无权访问不代表条目不存在 | 读取结论所需的全部页与状态，失败标为未知 |
| 并发修改正文 | Issue 更新没有通用的预期版本比较保证；不能把 ETag 缓存语义直接套到写入 | 写前重读，保留人工内容，只改负责部分，写后核对；仍说明竞争窗口 |
| 创建超时 | Create Issue 没有已文档化的通用客户端幂等键 | 用稳定标识查询结果，未知时不盲目重发；先查后建也不是 exactly-once |
| 认领冲突 | assignee 是归属字段，不是分布式锁 | 明确当前负责人及已有工作；发现并行执行先协调，不因超时自动抢占 |
| 合并版本漂移 | 两平台 merge API 可核对预期 head SHA | 在相应授权内绑定实际 SHA；此保证不扩展为 Issue 或部署事务 |
| Webhook 丢失/重复 | GitHub 失败事件不自动重投；GitLab 可重复投递 | 后续若做自动化，需要去重、补投和读平台状态对账，不能仅依赖消息顺序 |

依据：[GitHub 条件请求](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api#use-conditional-requests)、[GitHub Issue update](https://docs.github.com/en/rest/issues/issues#update-an-issue)、[GitLab Issue API](https://docs.gitlab.com/api/issues/)、[GitHub merge API](https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request)、[GitLab merge API](https://docs.gitlab.com/api/merge_requests/#merge-a-merge-request)、[GitHub webhook 失败](https://docs.github.com/en/webhooks/using-webhooks/handling-failed-webhook-deliveries)、[GitLab webhook](https://docs.gitlab.com/user/project/integrations/webhooks/#delivery-headers)。

首期建议复用连接器及已有 CLI，由 Agent 完成有范围的操作；尚无证据说明需要自建一个事件系统。自动化是后续可选择的投入，不能用来掩盖尚未明确的责任和完成含义。

## 6. 建议的全生命周期模型

本节是规划建议。既有能力优先复用，不要求每项任务经过全部环节或生成全部文档。

### 6.1 全链覆盖，按任务选择入口

~~~mermaid
flowchart LR
    U["需求、反馈、故障"] --> R["事实研究与范围决定"]
    R --> S["Spec、原型、交互说明"]
    S --> T["按需组织工作项"]
    T --> D["研发设计与接口协作"]
    D --> B["Backend 实现"]
    D --> F["Frontend 实现"]
    B --> I["集成与适用验证"]
    F --> I
    I --> C["PR/MR 与实际变更"]
    C --> E["按目标发布与部署"]
    E --> A["环境验收与运行观察"]
    A --> U
    D -->|"规则取舍"| S
    I -->|"行为差异"| S
    U -->|"明确的小修复"| B
    U -->|"明确的小修复"| F
~~~

图中箭头表示材料与责任的接续，不表示新增审批或一律串行。代码审查和验证可在实现中持续发生；部署仅在当前任务包含该目标时推进。

| 工作类型 | 建议入口与最小范围 | 不应自动追加 |
|---|---|---|
| 完整新功能 | 研究/业务选择 → Spec与设计 → 必要工程任务 → 实现与约定交付 | 固定数量票据、所有 Profile 都参与 |
| 既有功能变更 | 定位原规则和受影响范围 → 记录增量 → 修改相关工程及验证 | 重写整份 Spec、重做未受影响原型 |
| 明确缺陷 | 复现与定位 → 修复 → 验证原故障；改变业务意图才回到 Spec | 新建 Epic、完整产品调研 |
| 技术重构 | 保留行为边界 → 研发设计/必要切片 → 兼容性验证 | 把内部模块设计回填成业务规则 |
| 纯视觉修订 | 采用选定设计 → 前端局部实现 → 同条件对比 | 后端任务、无关逻辑测试 |
| 线上事故 | 定位影响、按授权恢复 → 验证环境事实 → 后续修复与复盘 | 为等待完整规格而延误已授权的恢复 |

### 6.2 责任与执行者分开，但不增加组织层级

| 责任 | 必须解释的结果 | 可如何承担 |
|---|---|---|
| 业务决定责任 | 目标、范围、权限、规则取舍及验收含义 | 产品/业务责任人；Agent 可研究、整理，不能伪造人的决定 |
| 规格与设计维护责任 | 规则、原型和交互说明一致，变更能定位到同一来源 | Spec 工作负责人，可委派制作和核对 |
| 工程契约责任 | 生产接口、错误、兼容性及消费版本明确 | 后端或实际契约仓负责人，与前端共同校准使用场景 |
| 仓内实现责任 | 该仓范围、实现和验证结果准确 | 后端/前端工程负责人及执行 Agent |
| 跨仓集成责任 | 使用哪些版本组合，哪些依赖已满足，哪些整体 AC 尚缺 | 每个跨仓工作项明确一位集成人，不要求长期新增岗位 |
| 发布与运行责任 | 制品部署到哪里，如何观察结果，部分失败由谁处理 | 现有发布/运维责任人，简单团队可与工程负责人同一人 |

“由 Agent 执行”不自动改变组织中的责任归属。多人场景需要可见的交接对象；多 Agent 场景还需要明确写入路径、输入版本、共享资源和结果格式。两者可以使用同一套简短工作项说明，无需各建一份管理文档。

### 6.3 用信息职责组织材料，避免双份权威

| 信息 | 建议保留位置 | 下游如何引用 |
|---|---|---|
| 业务目标、规则、AC、未决选择 | 原 Spec 或本来承担需求来源的 Issue | 原编号、章节及可获得的版本；无编号不强制补造 |
| 选定界面、状态、交互、模拟边界 | 原型与交互说明 | 页面/场景入口及版本 |
| 生产 API 和兼容性决定 | 后端或契约仓现有材料 | 契约版本/提交；前端快照标来源，不另成权威 |
| 当前任务范围、负责人、依赖、进展 | 一个选定 Issue，或明确选择的本地工作项 | 稳定 URL/路径；不双向镜像两份执行状态 |
| 代码变化与检查 | PR/MR、提交及实际运行记录 | 实际 head、pipeline/job及检查对象 |
| 制品与环境事实 | 已有 Release/部署系统/运维记录 | 制品摘要、环境、配置/迁移版本与部署结果 |
| 业务效果和新反馈 | 原业务工作项、既有反馈入口或研究材料 | 实际时间窗、观察对象、证据及下一项决定 |

**最新业务约定与生产当前行为需要同时可见。** 可以在同一份业务材料中引用目标变更和当前发布版本，不要求复制两个全量 Spec。某条规则已被确认，也不证明所有环境已经实现；运行偏差也不能自行覆盖已确认规则。

### 6.4 工作项关系要表达真实含义

- **来源关系**：这张工程票依据哪条规则或哪个原型状态。
- **范围归属**：这个子工作项为哪个业务结果贡献部分交付。
- **阻塞关系**：没有哪个事实、产物或决定就不能继续某部分工作。
- **契约消费关系**：前端或其他服务消费哪个实际接口版本。
- **实现关系**：哪个 PR/MR/提交实现了本项范围。
- **验证和发布关系**：哪次验证、哪个部署组合证明哪部分结果。

这是逻辑关系的区分，不是要求建设图数据库或新 schema。平台有原生关系就使用；没有时用清楚的链接和说明。一个依赖可以只阻塞真实接口联调，而不阻塞前端布局或独立后端行为开发。

## 7. Spec、Backend、Frontend 的关键交接

### 7.1 Spec → 研发

接收方应能找到：本次目标、范围和非目标；规则/权限/状态；适用验收；选定原型和交互；模拟边界；未决项及其影响；可读取的来源版本。

研发补充的是实际工程边界、技术决定、接口、数据持久化、迁移和验证方式。收到 Spec 不要求先有业务父票；收到原型也不等于确认了生产 DTO 或数据库模型。上述规则已存在，规划重点是让真实项目使用同一入口并记录实际结果。[当前规格交接](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/.agents/skills/yss-product-lifecycle/references/spec-workflow.md:77)、[当前后端接收](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/profiles/backend/.agents/skills/implement/references/spec-feedback.md:3)。

### 7.2 Backend ↔ Frontend

建议围绕同一用户行为明确必要的请求/响应、鉴权与数据范围、校验、错误语义、分页、状态变化、幂等/重试以及兼容性；只讨论本次涉及的方面。接口由研发决定，业务取舍回到业务来源。

已有规格和设计支持的布局、状态及明确模拟范围可独立推进；真实接口接入依赖足以消费的契约，联调依赖实际服务。后端实现可同步推进。接口发生实质变化时，明确受影响消费者和版本，重新验证相关调用，而非宣称“早已冻结”或要求所有工作重来。

OpenAPI 是 HTTP 接口描述标准。静态描述、客户端生成、服务端符合描述、消费者按预期调用、真实业务流程成功，是不同证据。Pact 官方资料也区分 schema 描述与实际交互契约验证，并说明契约测试不替代提供方业务逻辑测试。因此可以按风险使用现有接口/契约检查，不在本报告中指定全项目安装 Pact 或 Broker。[OpenAPI 3.1.1 定义](https://spec.openapis.org/oas/v3.1.1.html#what-is-the-openapi-specification)、[Pact 的边界](https://docs.pact.io/)、[Pact FAQ](https://docs.pact.io/faq)。

### 7.3 实现 → 集成与验收

每条关键 AC 应能关联到适用实现及证据，结果可表达为已验证、失败、未验证或等待决定；不强制一条 AC 对应一张票或一个自动测试。整合者核实接口、权限、异常恢复及真实环境组合，保留每个独立部分已有的有效结果。

对有设计还原目标的前端，继续使用现有工程检查、同条件视觉比较与关键交互验证。对后端，继续按行为和风险选择真实数据库/事务/权限/外部副作用的验证。两边“各自通过”不自动证明同一用户流程贯通。

父业务项若承诺整体可用，完成应基于其业务结果，而非所有子票关闭；若某工作项只承诺技术调查或局部交付，则按其自身范围结束，不扩大承诺。

### 7.4 合并 → 发布 → 运行反馈

发布范围内记录实际组合：业务/接口依据、各仓源码与制品版本、必要配置和数据库迁移、目标环境。可以放在已有发布记录中，不强制新增批准包。

发布次序依据兼容性决定。部分成功时分别保留各仓事实；应用回退不自动恢复已变更的数据，数据恢复也可能涉及期间新写入。无依据时不能宣称可一键回退。现有后端方法与 Demo 已覆盖这些注意点，需在真实项目验证并让前端交付能够找到同一组依据。[构建部署方法](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/profiles/backend/.agents/skills/implement/references/build-deploy-guide.md:11)、[发布组合示例](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/.template-spec/user-guide/客户跟进项目全生命周期Demo.md:696)。

生产后的观察还需明确：由谁观察什么、采用什么时间窗、异常去哪里。目标未实现、产品假设不成立、实现缺陷、接口兼容问题和运行故障应进入不同处理入口；不一律变成新功能，也不把“没有投诉”当作达到业务目标。

## 8. 需求变更、并发与中断如何处理

### 8.1 变更按影响处理

| 发现 | 应更新或核对的内容 | 不需要连带重做 |
|---|---|---|
| 文字修订，规则含义不变 | 受影响说明与链接 | 无关实现和有效验证 |
| 内部技术选择变化，业务结果不变 | 工程设计、任务和相关检查 | 业务重新审批或产品重设计 |
| 角色/权限/状态/结果改变 | 原业务规则、AC、原型及相关工程任务 | 未受影响的业务范围 |
| 接口兼容性变化 | 提供方、消费者、生成物与版本组合 | 无调用关系的仓库 |
| 实现偏离既定规则 | 修复实现，或将真实取舍交给业务责任人 | 不把代码事实自动写成新规则 |
| 线上发现故障 | 恢复验证、缺陷及部署记录；必要时追溯原规则 | 不先强制重建整套规格 |

以上延续现有增量方法，并吸收 Spec Kit 的“实现不替代意图”和 OpenSpec 的增量回流思路。已批准的变化仍须真实进入原材料；只在评论里讨论过不等于下游已消费新规则。

### 8.2 多人和多 Agent 使用同一套交接信息

一次必要交接至少应让接收者知道目标、作用仓库/路径、采用输入、当前完成事实、正在运行或结果未知的动作、剩余依赖和下一步。信息可放在现有任务记录，不要求固定 checkpoint 文件。

并行以路径、接口和运行资源都可隔离为条件；worktree 不能隔离端口、测试数据库和外部服务。共享接口、根锁文件、生成输出由一人整合。不能把两个 Agent 的独立上下文当作独立事实来源，更不能把彼此重复的“通过”声明当作多份运行证据。

恢复时读取当前平台、工作树及运行现场，再判断历史结果是否仍适用。未知写入先核实，不能机械重放。Agent 或聊天结束不代表远程 CI/部署停止；恢复记录也不能承诺后台会继续运行。已有 YSS [续办与多仓方法](/Users/zhudaoming/.codex/worktrees/8879/yss-spec-project-template/.agents/skills/implement/references/pr-mr-followup.md:72)可直接作为基础。

## 9. 一个代表场景如何贯通

以下为说明方案的假设场景，不是本轮已执行的产品工作：**批量转移联系人，允许部分成功，并显示失败原因。**

| 环节 | 本次应形成的具体结果 |
|---|---|
| Spec | 明确谁可转移、哪些对象可操作、部分成功如何反馈、失败对象如何恢复；原型展示对应交互 |
| 工作组织 | 需要跨仓聚合时建立业务事项；工程工作项引用同一规则，不强制每条规则一票 |
| 研发契约 | 明确实际请求、逐项结果与错误语义、重试/幂等及权限；这些属于研发设计 |
| 前后端实施 | 后端处理真实行为与权限；前端实现选择、提交、结果展示和失败恢复；各自可独立工作的部分并行 |
| 集成 | 在同一前后端版本组合验证成功、拒绝、部分失败和重复操作等适用场景 |
| 合并 | 各仓记录真实 PR/MR 和检查结果；一个合并不关闭整体业务承诺 |
| 发布 | 指定目标环境和制品组合，按实际兼容关系决定次序 |
| 验收与反馈 | 对目标环境确认业务行为；上线后观察失败原因是否能帮助用户恢复，问题回到缺陷或业务改进入口 |

同一个场景可以暴露真正的协作缺口：前端模拟成功不证明权限落实，后端接口通过不证明用户能恢复失败项，发布成功不证明业务体验达到目标。这里只说明应该观察什么，不预先填写成功率或收益。

## 10. 可选方案、取舍与推荐

| 方案 | 适合条件 | 优势 | 代价与局限 |
|---|---|---|---|
| 主要依靠聊天与 PR | 单人、单仓、短任务，上下文稳定 | 启动成本低 | 跨会话责任、依赖和验收容易散失 |
| 以 Home 和原生 Issue 贯通现有 YSS | 多仓、多人或多 Agent，需要持续交接 | 保留现有职责和工具；可从简单任务逐步采用 | 需要一致使用来源/完成约定，平台本身不会替团队保证 |
| 整体迁入外部 SDD 框架 | 团队愿意接受其 CLI、目录、产物和流程习惯 | 获得一套相对完整的方法与工具 | 与现有 YSS 入口、角色边界及维护源重叠；迁移成本尚未测量 |
| 自建调度与状态平台 | 已有稳定流程，规模和重复劳动足以支撑投入 | 可强化编排与可观测性 | 需处理权限、幂等、并发、失败恢复、平台版本及运营维护 |

**推荐第二种作为当前主路线。** 对话与 PR 路径仍保留给小任务；从外部框架选择具体方法；只有试点证据显示稳定重复劳动或可靠性问题无法由现有工具解决时，再评估自动化平台。

这是基于当前 YSS 已有大量能力、用户要求兼容两种协作方式以及现有维护约束的建议，没有成本测算或收益实测支撑精确 ROI 排名。

## 11. 实施路线应按新基线调整

上一轮“先新增共享 tracker 方法”的部分已经出现在当前工作树中。下一轮实施不应再从头创建，应先核对并收敛现有候选。

| 顺序 | 应完成的工作 | 可观察的结束条件 |
|---|---|---|
| 1. 收敛现有候选 | 检查共享方法、三个入口、onboarding、分发与副本的一致性；保留无关改动 | 当前各消费者引用同一套有效方法，职责无冲突；既有功能没有被重复建设 |
| 2. 补齐总方案的接续说明 | 在已有团队说明和能力地图中解释责任、来源、接口协作、完成事实及运行反馈 | 同一场景下不同 Profile 给出一致的范围和下一责任人；不新增固定门禁 |
| 3. 验证安装与旧项目采用 | 先准备包含本轮候选的临时 CLI/Bundle，再在可控目录检查三 Profile × 两模式；验证定制 tracker、旧版本和未受管同名文件 | 实际被测来源包含候选；资源真实可读，配置保留，安装选择符合声明 |
| 4. 真实跨仓试点 | 选已有需求与真实平台，沿 Spec→工程→集成→约定发布终点执行 | 一个工作项能追溯规则、实现、版本组合、验证和剩余事项；只报告实际到达的终点 |
| 5. 按需要发布与推广 | 正式打包与发行已验证候选，更新发行说明，逐项目采用；动作按实际授权 | 正式资产与已验证候选对应；发行、安装来源和目标工程使用结果分别可核实 |
| 6. 观察后决定自动化 | 记录等待、重复维护、恢复失败等实际问题 | 能指出值得自动化的稳定操作及失败模式，而非先建设抽象平台 |

实施责任建议分成共享方法整合、Spec 接入、Backend 接入、Frontend 接入、分发整合和真实试点整合。前四类在边界清楚后可并行；公共清单、来源记录和共享资源由一个整合者维护。这些是工作责任，不要求固定人数或新组织岗位。

当前 CLI/Bundle 的实际采用版本仍需在实施时核对；本报告不提供未经当时帮助确认的命令，也不把模板更新视为已安装工具自动获得新功能。

## 12. 如何检验路线是否真正改善协作

先选代表性任务观察，不建立永久测试套件或例行审批清单。建议至少覆盖：

| 场景 | 需要观察的行为 |
|---|---|
| 小修复直接实现 | 不被迫补建完整 Spec、父票和子票 |
| 三仓业务功能 | 规则保持同源，工程票落入约定承载项目并关联正确实现仓，集成人能解释整体未完成范围 |
| 单独打开前端仓续办 | 能找到原型、真实契约、已有实现及下一步，不依赖原聊天全文 |
| 实施中规则或 API 变化 | 只处理受影响部分，旧验证按适用范围保留 |
| 并发更新或创建超时 | 不覆盖他人正文，不盲目重复创建，未知状态有明确下一动作 |
| 一个仓合并、另一个仓未联调 | 不提前报告业务完成，也不释放未满足的真实依赖 |
| 部分部署失败 | 每仓状态真实可见，兼容与恢复动作有实际依据 |
| 上线后反馈 | 能区分缺陷、业务变更和运行故障，并回到合适入口 |
| 旧项目配置升级 | 保留原平台/实例/目标与定制内容，不因新默认值改投平台 |

观察记录应区分文本核对、模拟演练、宿主实际调用和真实项目结果。没有真实平台或部署权限时，报告具体受限部分，而非将其用本地模拟结果填平。

可以在既有工作记录中观察：跨上下文恢复时缺失的信息、因来源不清造成的返工、依赖等待、重复状态维护、被提前标记完成又重开的情况。首轮先记录基线，不设置无依据的改善比例，也不以 Issue 数、提交数或 Agent 数衡量产出。

有稳定生产部署数据后，可按应用/服务观察 DORA 当前五项指标：变更交付时间、部署频率、失败部署恢复时间、变更失败率、部署返工率。它们用于改进交付，不宜给不同上下文的个人或 Agent 排名；业务任务成功率等产品指标仍需单独定义。[DORA 官方指标及使用限制](https://dora.dev/guides/dora-metrics/)。

## 13. 尚未解决的问题与下一项决定

| 未知或待决定事项 | 当前状态 | 会影响什么 |
|---|---|---|
| 试点使用的真实需求与目标仓库 | 尚未选定；可优先选择已有 Spec 且涉及前后端的需求 | 实际试点范围与完成终点 |
| 自建 GitLab 或 GitHub 的实例能力 | 未访问实际实例；版本、套餐、权限未知 | 层级、阻塞、看板、合并检查与部署记录的具体映射 |
| 当前项目安装了哪个 Bundle/技能来源 | 本轮没有安装核验 | 工作树候选是否真正到达执行环境 |
| 团队现有人员责任分配 | 已确认兼容多人和多 Agent，具体责任人尚未指定 | 业务取舍、契约、集成、发布与反馈由谁持续负责 |
| 生产观察指标与时间窗 | 需要结合真实业务目标决定 | 怎样判断功能可用之后是否产生预期效果 |
| 自动化投入的必要性 | 尚无试点数据 | 是否需要 webhook、定时对账或任务调度，而非仅补方法 |

**下一项可执行决定是：以当前候选为基础，选择一条真实跨仓需求，明确责任和交付终点，验证共享方法能否贯通。** 平台能力核查、安装资源核验和已有材料一致性可以先行调查；涉及新的业务取舍、项目选择和发布动作时，再沿真实范围处理。

本报告仅新增研究总结。未修改既有技能、CLI、分发配置或产品成果，未创建远程工作项，未提交、推送、发行或部署。报告中的图示与场景属于分析表达，不是运行验证证据。
