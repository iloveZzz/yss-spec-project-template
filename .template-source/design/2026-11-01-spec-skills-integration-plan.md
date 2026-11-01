# Spec 技能整合与完整预装实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 整合 Spec 研究、业务分析、澄清、设计、原型和复核能力，两种安装范围默认预装同一组 16 个入口，交付完整规格、原型设计及说明后再由研发承担技术设计与实现。

**Architecture:** 研究归 `yss-research`，业务分析归 `yss-stage-decision`，产品设计与 UI 原型归 `yss-design-system`；逻辑原型和复核保持独立。直接删除 `competitive-intelligence`、`yss-prototype-stage` 两个被合并入口；维护当前分发清单、宿主副本和 CLI 内嵌 Bundle，不新增安装框架。

**Tech Stack:** Markdown、现有 JSON/YAML 元数据和 Go Bundle 生产器；CLI 当前 `go.mod` 要求 Go `1.27.1`。原型保留现有 Vue/shadcn-vue 与原生 HTML 方法，本次不升级前端依赖或上游组件版本。

**Spec:** [已确认设计](2026-11-01-spec-skills-integration-design.md)，用户于 2026-11-01 确认，并随后明确不考虑旧版兼容和迁移；本计划已按该决定修订。

## Global Constraints

- Spec 完整产品交付必须包含完整规格、原型设计、原型及交互说明；三类内容可以共享文件，不强制三个文件或额外交接包。
- 有操作和状态变化的核心场景可操作；纯展示允许静态设计；无 UI 使用业务逻辑或状态原型。普通查询、局部修订和模板维护不自动触发完整产品交付。
- `project` 与 `skills` 默认集合相同：16 个功能入口。`implement`、`code-review` 不再是 Spec 默认；不制定或验证已有受管实例的升级、迁移及技能保留策略。
- Backend 默认保持 `setup-yss-harness`、`implement`、`code-review`、`handoff`；共享修改尊重 Backend 专有覆盖层，不将 Spec 集合或 UI 资产引入 Backend。
- 两个被合并入口直接删除，不保留别名、wrapper、旧资源转向或 CLI fallback；Spec 的 `yss-stage-decision` 开放业务分析任务的自动选择，Backend 对应政策不变。
- 不新增持久脚本、测试套件、CI、阶段门禁或批准包。验证使用临时材料与实际工具，不照搬通用计划模板中的强制 TDD、逐任务提交和评审门禁。
- 未获对应授权不提交、推送、发行、发布公开技能、替换用户工具或同步真实用户项目。默认完成源修改、开发构建和临时项目验证。
- 不修改现有未跟踪的 2026-10-31 两份设计/计划，也不覆盖 CLI 仓库已有的 `docs/plans/`。
- 每批修改同步其实际影响的元数据、副本及引用；不能用安装文件存在代替宿主已加载，不能用结构检查代替真实 Agent 行为。

## Review Focus

| 容易遗漏的条件 | 预期行为 | 所属验证 |
|---|---|---|
| 首次接入普通目录时已有用户文件 | 无关文件保留，同路径冲突不覆盖 | 任务 7 新安装/接入场景 |
| 删除入口但仍有注册或调用 | 新库无两个旧入口，当前引用直接到负责人 | 任务 2、4 删除；任务 6、7 名单与闭包检查 |
| 无 UI、静态设计、普通查询 | 无 UI 仍交付逻辑原型；静态稿不冒充交互；查询不触发完整设计 | 任务 3、5 文本核对；任务 8 行为场景 |
| Backend 共享正文覆盖专有版本 | 原型及阶段决定的 Backend 语义保留，不携带 UI 能力 | 任务 6 有效内容比对；任务 7 Backend 安装 |
| 内容归并后旧路径、旧脚本仍被引用 | 当前入口和条件参考全部可达，不再调用退役流程 | 任务 4 归并；任务 6、7 资源闭包 |

---

## 工作目录与文件责任

以下 `TPL/` 指 `/Users/zhudaoming/.codex/worktrees/spec-skills-integration/yss-spec-project-template/`，`CLI/` 指 `/Users/zhudaoming/.codex/worktrees/spec-skills-cli/yss-cli/`。这些是本次实际实施工作树；记录两个源仓的 HEAD 和实际工作树状态，不改用尚未包含本次实现的主工作树，不修改用户主工作树的无关内容。

| 任务 | 主要写入范围 | 输出给后续任务 |
|---|---|---|
| 1 | 仅仓外临时目录 | 源仓状态、Backend 范围基线和新安装工作目录 |
| 2 | 研究、业务分析、澄清和词汇技能 | 一套事实调查和业务分析方法，删除重复竞品入口 |
| 3 | `prototype`、`prototype-review` | 逻辑试验方法与共同复核方法 |
| 4 | `yss-design-system`、`yss-prototype-stage` 及资产 | 产品设计唯一负责人和完整资源，删除重复阶段入口 |
| 5 | Spec 路由/综合/拆票及相关支持技能、模板和入口说明 | 三类交付物的统一约定与轻量支持能力 |
| 6 | 注册表、分发、锁、公开清单、宿主副本及适用 Backend 配置 | 可构建的 16 项安装集合和有效依赖 |
| 7 | CLI 内嵌 Bundle、必要 CLI 文档、仓外开发二进制/项目 | 全新安装、首次接入和 Backend 结果 |
| 8 | 仓外代表性场景；仅回修本次发现的问题 | 实际行为与未验证范围的交付说明 |

任务顺序为 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8。前几项共享注册表和投影，建议在本会话顺序执行；如用户选择子代理，每个执行者独占其内容目录，共享清单由一个执行者整合，告知所有执行者不得回退他人改动。

## Task 1：确认源范围并准备新安装工作目录

**Files:** 不写源代码；新建归本次任务所有的 `/private/tmp/yss-spec-integration.XXXXXX/`，供后续保存开发程序、新安装实例及实际结果。使用 `mktemp -d /private/tmp/yss-spec-integration.XXXXXX`，避免 macOS `/tmp` 链接被 CLI 路径保护拒绝。

**Interfaces:** 消费当前两个仓库的源内容，产出实际版本/来源、受保护改动清单、Backend 范围基线和任务临时目录供任务 7 使用。

- [x] 读取两个仓库的 `git status --short`、HEAD、当前 `yss version/help` 及 init/attach/skills 帮助。记录既有改动，不清理、不提交。
- [x] 创建任务临时目录，确认其中没有用户内容；不下载或复制旧程序，不生成旧安装收据或旧版本项目。
- [x] 记录 Backend `prototype`、`yss-stage-decision`、`triage`、`to-spec` 的专有正文、元数据和两个默认集合，供后续比较；不要求根与 Backend 的所有目录一致。

**完成依据：** 源修改边界和临时目录明确，Backend 对照来自实际内容；准备工作不涉及用户项目或旧安装迁移。

## Task 2：统一研究并补齐业务分析

**Files:** 修改 `TPL/.agents/skills/yss-research/SKILL.md`、`references/competitive-analysis.md`、`agents/openai.yaml`；新增其 `references/fact-finding.md`、`references/user-research.md`。归并后删除 `competitive-intelligence/` 目录及其宿主入口、清单条目。修改 `yss-stage-decision/SKILL.md`、`agents/openai.yaml`，新增 `references/business-analysis.md`；按实际冲突修改 `grilling/SKILL.md`、`domain-modeling/SKILL.md`。

**Interfaces:** 研究产出带来源与限制的事实；业务分析产出场景、规则、选项和验收缺口；澄清取得真实业务决定；词汇能力维护概念一致性。上述资料由任务 5 综合，不产生第二份规格。

- [x] 在研究入口按决定选择事实调查、竞品比较、规则来源、用户资料和实际原型观察；把通用取证/反证/时效方法放入 `fact-finding.md`，竞品方法只保留在现有 `competitive-analysis.md`。
- [x] 将 `yss-prototype-stage/references/usability-research.md` 中研究设计、样本、观察与解释的方法归入 `user-research.md`；删除强制 `design-qa.md` 等固定产物前置，保留真实参与者、来源和未执行结果的区分。
- [x] 将当前 `competitive-intelligence` 消费者直接改为 `yss-research` 及其竞品方法，删除旧目录和对应宿主副本、链接、注册及分发条目，不留下别名或转向入口。
- [x] 用设计第 5.2 节的 8 个分析维度补强 `yss-stage-decision`；入口标题为“业务分析与方案判断”。Spec 版本允许自动选择，移除其 `disable-model-invocation: true` 并设置 `policy.allow_implicit_invocation: true`；Backend 专有版本不改。
- [x] 澄清与词汇入口明确事实自行调查、真实业务取舍才询问、复用既有确认；不自动创建 Context/ADR 或要求工程身份。词汇稳定性、用户文件保护继续保留。
- [x] 对研究负责人检查“调研竞品”和“分析现有流程”的处理：前者使用条件竞品方法，后者不能仅给功能矩阵；不存在虚构采访、数字排名或自动对外发送。同步这些文件的相关副本和元数据。

**完成依据：** 研究与竞品没有双份方法；业务分析覆盖设计要求；来源、决定与建议能区分。映射 AC-05、AC-06。

## Task 3：分开逻辑试验与共同复核

**Files:** 修改 `TPL/.agents/skills/prototype/SKILL.md`、`LOGIC.md`、适用元数据；修改 `prototype-review/SKILL.md`、`references/component-qa.md`、适用元数据；新增 `prototype-review/references/review-method.md`。

**Interfaces:** `prototype` 接收限定业务问题、代表输入和判定标准，输出可操作状态模型及真实观察。`review-method.md` 是任务 4 的共同复核来源，覆盖适用产品 UI 和逻辑原型，不依赖已删除入口。

- [x] 保留逻辑原型的单文件、内存状态、业务语言、场景和重置方法；取消实验模块可直接进入生产、强制捕获分支等旧承诺。生产复用留给研发重新设计与验证。
- [x] 将规则/验收一致性、状态异常、信息理解、适用视觉与可访问性复核集中到 `review-method.md`；入口根据实际产物读取，不要求每次执行全部检查。
- [x] 精简 `component-qa.md` 为条件组件方法，保留焦点、键盘、草稿保留和权限等有效要求；去掉固定六轴归档、全浏览器矩阵、统一独立评审与人工视觉批准前置。
- [x] 对照“只验证撤回再提交”“审阅静态稿”“未运行的交互原型”检查结果边界：分别是逻辑观察、静态发现、明确未验证，不冒充生产正确性或独立批准。同步对应副本。

**完成依据：** 设计制作与复核可以共享一套方法；Backend `prototype` 专有行为没有变化。映射 AC-08、AC-10、AC-13。

## Task 4：归并产品设计和原型资产

**Files:** 修改 `TPL/.agents/skills/yss-design-system/SKILL.md`、`references/spec-design.md`、`references/design-review.md`、`references/shadcn-vue-prototype.md`、`agents/openai.yaml`；新增 `references/product-prototype.md`。将 `yss-prototype-stage/references/` 的有效制作方法及 `assets/` 归入设计技能，随后删除整个旧技能目录及其宿主入口和清单条目。

**Interfaces:** 设计负责人消费任务 2 的规则和任务 3 的复核方法，输出 UI 原型及说明；所有当前调用方直接引用设计负责人，不再经过原型阶段入口。

- [x] 读取资产消费者与包内路径后，将 `assets/vue-business-patterns/`、`comparison/`、`native-workbench/`、`shadcn-vue-authoring/`、`low-fidelity-exercise/`、`offline-html/`、`prototype-theme.css`、`scenario-runtime.js` 归入设计技能相应位置。保留设计技能已有 `assets/prototype/`，发生同名差异时逐文件判断，不整目录覆盖。
- [x] 保留现有组件固定来源、锁文件和许可证，更新使用位置；新项目仍沿现行 Vue 原型方法，归并的作者侧资源按已有内容适用使用，不把旧 `prepare-flow`、`seal-project` 等不存在命令恢复成默认步骤。
- [x] 将表达深度、流程/状态、内容、场景模拟和原型说明归入 `product-prototype.md`，入口在需要时引用。明确完整 Spec 必须有原型，按风险选择形式和精度；视觉与技术栈选择不等于生产技术选型。
- [x] 将设计自检指向 `.agents/skills/prototype-review/references/review-method.md`；把设计参考中重复的复核正文改为准确引用，制作方仍负责操作验证和修正。
- [x] 逐项处理旧 `prototype-profile-routing.md`、`product-design-adapter.md`、`prototype-verification.md`、`shadcn-vue-integration.md`、`resource-lifecycle.md` 及其消费者：有效方法归入新负责人，当前引用直接改到新位置，旧位置不留导航。删除失效档位、证据和审批要求，保留有效经验。
- [x] 删除 `yss-prototype-stage` 及其宿主副本、链接、注册和分发条目；确认当前源内容没有对旧技能的可执行依赖，资产只保留一份。
- [x] 在归并后的目录检查相对引用、组件清单所指文件和许可证；对实际改变的运行入口使用最小临时原型检查资源加载，并实际运行现行 Vue 方法组装的审批入口：核对场景选择、动作、失败重试、重置、未知场景与缺少合同的错误提示；不为内容整理重写所有 Vue 组件。

**完成依据：** 产品设计资源有一个维护位置，旧技能已删除且当前引用无断链，静态/交互承诺准确。映射 AC-04、AC-07、AC-13。

## Task 5：落实完整 Spec 交付和支持能力

**Files:** 修改 `TPL/.agents/skills/yss-product-lifecycle/SKILL.md` 及 `references/spec-workflow.md`、`daily-delivery.md`、按需涉及的 `spec-tracker.md`、`user-decisions.md`；修改 `to-spec/SKILL.md`、`to-tickets/SKILL.md`；按当前冲突修改 `wayfinder/SKILL.md` 及 `references/*.md`、`triage/SKILL.md`、`i-have-adhd/SKILL.md`、`llm-wiki/references/*.md`。修改 `.template-spec/templates/spec-template.md`、`.template-spec/process/harness-profile.yaml`、`.template-source/distribution/entries/spec-skills-AGENTS.md`、`spec-project-README.md`、当前 Spec 使用指南。

**Interfaces:** 消费任务 2–4 的方法和产物，形成设计第 7 节的三类交付内容；`to-tickets` 只输出业务 Ticket，研发实现另行承接。

- [x] 路由根据事实、业务决定、词义、业务分析、UI 和状态试验选择唯一负责人；按设计第 4 节保持显式入口的调用边界，不建立固定必经技能流水线。
- [x] 规格方法和模板明确“完整规格＋原型设计＋说明”；写清规则/验收对应、查看方式、模拟范围、实际验证与未覆盖项。普通查询和局部修订仍按当前目标，不为它们强制补全产品成果。
- [x] Profile 元数据与文字表达保持相容：保留 `product_design: risk-based` 的既有取值，将 purpose 和解释明确为“必需产品设计，深度按风险选择”；不凭本任务新增不受支持的枚举或 schema。
- [x] `to-spec` 复用既有决定综合，不重做访谈。`to-tickets` 复用现有业务票模板，删除强制每票文件/集合 YAML/主控批准要求；只在已存在集合时维护它，保留规则和 AC 来源、业务前后依赖。
- [x] 清理支持技能与本设计冲突的必需 tracker setup、旧工具名、强制复现/治理身份等前置；保留事实核验、真实授权和失败说明。`handoff` 的 PR/MR 专门职责与显式政策不变，wiki 不因查询初始化。
- [x] 同步当前入口说明与用户指南中的交付边界。历史合同仅在仍被现役引用时调整导航，不改写旧批准事实，不批量重写全部历史文档。
- [x] 检查“无 UI 完整需求”“只有截图却宣称交互通过”“没有 tracker 的草稿”“按 Spec 拆业务票”四种输入的文字规则；分别要求逻辑原型、诚实未验证、继续授权草稿、业务结果拆分。同步实际受影响副本。

**完成依据：** 研发交付边界一致，支持能力预装不会变成新的门禁或外部动作授权。映射 AC-06、AC-07、AC-09、AC-11、AC-12。

## Task 6：统一 16 项分发、资源依赖和平台副本

**Files:** 修改 `TPL/.template-source/distribution/bundle-profile.json`、`.template-spec/agents/yss-skill-registry.yaml`、根 `skills-lock.json`、`yss-public-skills.json` 及必要导出说明；同步 `.claude/skills/` 链接和 `.workbuddy/skills/` 实际受影响副本。按共享影响更新 `profiles/backend/.template-spec/agents/yss-skill-registry.yaml`、`skills-lock.json`、分发配置及 WorkBuddy 副本，保留其覆盖源。

**Interfaces:** 两个 `installations.*.skills` 精确使用设计第 8.1 节的 16 项集合；研究调用直接指向 `yss-research`，产品设计直接指向 `yss-design-system`，后者读取 `prototype-review` 的共同方法。不新增依赖引擎。

- [x] 把两份默认数组设为设计确定的 16 项；同步注册表初始名单及每项适用的 discoverability/调用元数据。Spec 不预装 `implement`、`code-review`，但保留其可用内容。两个被合并入口从源库、可用库、锁、注册表和相关 Profile 分发配置中完整删除，不只是从默认数组移除。
- [x] 根据实际正文和条件参考补齐两种安装的 `skillReferences`；规范技能路径由当前生产器收集，不能指望仅提及名称或相对 Markdown 链接形成依赖。删除已取消的必需模板引用，保留仍有真实消费者的资源。
- [x] 更新资产归并涉及的 manifest renderPaths、允许/排除路径及必要资源引用，避免仅源目录正确、Bundle 仍漏文件。有效技能引用的负责人不能因 Profile 排除而消失。
- [x] 对共享技能逐文件同步根 WorkBuddy，核对 Claude 链接；Backend 按“共享源＋专有覆盖”组合，保留任务 1 记录的专有语义和默认 4 项。共享改动不强制让 Backend 拥有 UI 技能。
- [x] 根来源锁仍不新增 `effectiveHash`；保留真实 `sourceRevision`、`upstreamHash`。Backend 仅对已含 `effectiveHash` 且本次内容变化的条目重算有效技能树：沿既有 `treeHash` 口径，按 Node `localeCompare` 排序相对文件名，对名称、NUL、正文、NUL 逐项 SHA-256；文本 CRLF 规范为 LF，二进制字节保留，忽略既有系统缓存项。该口径可从删除脚本前提交 `7f3cd7490d6f9655902d1af7c02cd97109769da8^` 的 `scripts/lib/skill-supply-chain.mjs` 只读确认，不恢复脚本。
- [x] 不新建无消费者的技能目录清单文件；维护实际存在的锁/注册表/公开清单。源锁中的适配引用若本次要改变，指向可分发的真实说明，不伪造上游升级，也不擅自执行另一份 10 月 31 日计划。
- [x] 公开清单移除被删除入口，补上必要公开负责人及其依赖，调整相应分组。仅在仓外暂存选定技能和必要资料，按原导出约定改为包内可达引用；不复制项目业务文件、不推送公开仓库。
- [x] 用一次性断言检查：两个默认集合完全相等、数量 16 且无重复；候选技能文件存在；已删除名称没有现役注册、调用或投影残留；投影与有效源一致；受影响引用可达；公开暂存包没有模板私有路径、用户路径或缺失依赖。

**完成依据：** 源与分发一致，16 个功能入口资源齐备，没有旧名转向，Backend 不被全量 Spec 污染。映射 AC-01、AC-04、AC-13、AC-14。

## Task 7：构建新 CLI 并验证真实安装

**Files:** 生成 `CLI/internal/bundle/assets/bundles.json.gz`；按必要范围修改 `CLI/docs/skills-discovery.md`、`docs/build-install.md`，不改版本、发行记录或默认工具入口。只有证实当前生产器无法表达设计时，才针对 `internal/bundle/producer.go`、`bundle.go` 或 `internal/project/project.go` 提出最小修正，先记录复现，不预设重构。

**Interfaces:** 消费任务 6 的模板工作树和任务 1 的临时目录；产出仓外开发程序 `new-yss`、全新安装项目及真实 CLI 结果，不准备旧版本实例。

- [x] 从 `CLI/` 执行现行构建命令，输出置于任务临时目录；分别读取生成器报告、程序版本和帮助。构建命令如下，其中 `TASK_TMP` 为任务 1 的真实目录：

```sh
TPL=/Users/zhudaoming/.codex/worktrees/spec-skills-integration/yss-spec-project-template
CLI=/Users/zhudaoming/.codex/worktrees/spec-skills-cli/yss-cli
cd "$CLI"
go run -tags yss_nobundle ./tools/bundle --source-root "$TPL" --out internal/bundle/assets
CGO_ENABLED=0 go build -trimpath -o "$TASK_TMP/new-yss" ./cmd/yss
"$TASK_TMP/new-yss" version
"$TASK_TMP/new-yss" help
```

- [x] 检查 Bundle 来源为实际 HEAD 和工作树状态；有本次改动时为 `working-tree`。不把沿用版本字符串的开发构建标为新正式发行，不提交被忽略的 Bundle 归档。
- [x] 对两个不存在的目标分别执行新程序 `init --profile spec --installation project|skills --dry-run --json`，断言两个目标仍不存在，预览中的 `.agents/skills/*/SKILL.md` 名称集合恰为 16 项。
- [x] 在另两个空目标实际 init，执行 `skills list --json`，断言 `result.installed` 中为 true 的集合恰为 16 项；实际读取必要参考、资产、入口和元数据，不能只数顶层文件。
- [x] 在含用户哨兵文件的普通目录首次执行 `attach`，确认安装集合正确且哨兵字节不变；另用普通目录预置与目标不同的 `.agents/skills/yss-research/SKILL.md`，要求同路径冲突保持原内容且不部分写入。这两种样本均不含旧 YSS 收据。
- [x] 检查新 Bundle 和 `skills list` 的可用名单均不含两个已删除名称，实际文件与宿主副本没有旧入口；当前引用直接到负责人，研究、设计与复核的必要资源均可读。
- [x] 实际创建 Backend `skills` 临时项目并读取 Bundle 有效内容，默认仍为 4 项，专有逻辑原型和阶段决定语义保持；没有被依赖路径连带装入产品 UI 能力。

**完成依据：** 记录命令退出码、真实集合、关键文件与用户字节保护结果；不以构建成功代替安装验证。对应 AC-01、AC-02、AC-03、AC-04、AC-14。

## Task 8：观察代表性行为并交付

**Files:** 不新增永久评测套件；场景材料置于任务临时目录。发现缺陷仅修正本次所属文件，同步相关副本并重跑受影响检查，不无理由重复全部验证。

**Interfaces:** 消费实际安装目录及设计 AC-05 至 AC-13，产出可区分“文本核对、实际行为、未验证”的交付说明。

- [x] 用已安装内容观察“调查同类产品与现有流程”和“分析规则不清的需求”：事实有来源，未决业务决定进入澄清，业务分析不退化为竞品矩阵；必要外部来源不可用则记录限制，不模拟搜索成功。
- [x] 在临时产品样本中请求完成审批需求供研发使用，要求规格、原型及说明齐备，代表权限/拒绝/恢复路径实际操作；使用用户已给规则或明确标注的测试输入，不将样本规则写入真实项目。 Vue 默认路径另用实际审批样本完成场景选择、正常处理、失败重试、重置和错误入口操作，结果见 [审查修复计划](2026-11-01-spec-skills-review-fixes-plan.md)，原生 HTML 检查不能代替此项。
- [x] 观察“仅撤回再提交逻辑”“无 UI 完整业务需求”“审阅静态图/未运行原型”：分别正确选择逻辑试验、逻辑原型交付和未验证说明，不把静态或代码阅读说成交互通过。
- [x] 观察“按 Spec 拆业务票”和“无 tracker 的普通查询”：前者不细化技术层，后者不初始化 wiki、设置 tracker、强制原型或向外发送内容。
- [x] 在实际可用宿主查看技能发现和隐式/显式调用行为；当前会话未重新加载、宿主不支持控制字段或缺独立上下文工具时，明确标为未验证，不能只根据 YAML 推断执行效果。
- [x] 对照设计 AC-01 至 AC-14 汇总已覆盖项、结果和实际缺口；检查最终 diff 中没有无关文件、固定版本漂移、脚本/测试套件、用户实例修改或未经授权的外部动作。
- [x] 交付源文件修改范围、开发程序位置、真实 Bundle 来源与安装结果、宿主/行为限制以及尚未发行和同步的范围。保留必要可复核产物；清理只限本次拥有且不再需要的临时材料，不删除失败现场或用户文件。

## 计划自检与执行选择

设计第 4–6 节由任务 2–4 落实，第 7 节由任务 5 落实，第 8–9 节由任务 6–7 落实，第 10 节的全部 AC 由任务 7–8 及前置内容核对覆盖。五类 Review Focus 已分配具体场景；计划没有引入新技能 ID、固定审批系统或独立长期验证工程。

本计划建议本会话顺序执行：技能正文、资产归并和分发关系紧密，共享注册表由一个执行者维护更容易保持一致。用户也可选择按任务分配独立子代理，但不能让多个执行者同时重写锁、公开清单或 Bundle。

设计已确认并按取消旧版兼容和迁移的决定完成本次实施与临时验证。前次安装、冲突保护和代表原型行为已实际执行；本次审查补修已修正注册表残留和 Vue 场景入口，真实 Vue 审批样本的场景、重试、重置及错误操作已通过。本次重建的 Bundle 已包含修复，两种 Spec 全新安装均为 16 项，Backend 为 4 项且有效 Bundle 内容未变，记录见 [审查修复计划](2026-11-01-spec-skills-review-fixes-plan.md)；宿主重新加载/自动调用与完整 Vue 组件矩阵未验证，不能据此宣称全部通过。提交、工具替换和发布仍各按有效授权处理；旧受管项目升级不属于本计划。
