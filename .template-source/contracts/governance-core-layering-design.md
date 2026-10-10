---
design_id: governance-core-layering-design
version: 0.1.0
status: proposed
repository_mode: template-source
intensity: L2
owner: maintainer
updated_at: 2026-10-11
spec: harness-hardening-v1.md
work_package: WP-11
---

# 治理核心分层：设计

本文是 [模板加固规格](harness-hardening-v1.md) FR-014 与 AC-019 的设计交付，对应 [执行计划](harness-hardening-v1-plan.md) 的 WP-11。**只做设计**：不移动任何文件、不改注册表与 schema，实现另立合同（规格“非目标范围”）。FR-017 的维护连续性决策按计划记在计划第 6 节，本文第 9 节只给出引用。状态为 `proposed`，第 10 节的决策记录由维护者签署后才算 AC-019 完成。

## 1. 为什么分层

本仓有一批与技术栈无关的治理机制：条件触发的门禁、绑定摘要的批准、起草者与会签人分离、不可变的交接包。它们和 YSS 的 Java、Vue3 + AntDV 专项内容放在同一棵目录树里，部分文件两者混写。后果是：

- 想复用机制的团队只能整仓分叉，再手工剔除 YSS 内容。
- 机制与技术栈内容一起膨胀，常驻上下文难以按层裁剪。
- 技术栈细节渗入本应中立的 schema，之后换技术栈就要改合同。

## 2. 判定规则

对任一资产问三个问题，按顺序：

1. 它描述的是**如何治理**（谁能批准什么、证据绑定什么、状态如何流转、交接如何不可变），换一个技术栈仍然成立吗？是 → **治理核心层**。
2. 它描述的是**用什么技术、怎么做**（Java、Spring Boot、OpenAPI 3.1、DDD / 分层 MVC 脚手架、Vue3、Ant Design Vue、Maven、pnpm、YSS 组件）吗？是 → **YSS 技术栈 profile 层**。
3. 它只服务**本仓的维护**（维护强度、验证选择、CI、hook、度量），不随实例分发吗？是 → **模板源维护层**，不参与上面两层的划分。

同一文件兼具 1 与 2 时标为**混合**，写出拆分点，按主要内容定层。

## 3. 三层定义与命名约束

| 层 | 内容 | 随实例分发 |
|---|---|---|
| 治理核心层 | 条件门禁、摘要绑定批准、起草者与会签人分离、不可变交接包，以及支撑它们的稳定 ID、checkpoint、用户决定、上下文对账、工作包布局、技能路由与调用契约的**机制** | 是 |
| YSS 技术栈 profile 层 | 上述机制在 YSS 技术栈上的**具体内容**：技术栈相关的门禁与产物、架构 profile、脚手架、OpenAPI 规则、前后端专项技能 | 是 |
| 模板源维护层 | 维护强度、验证 profile、`ci-gate`、`agent-hook`、`harness-metrics`、发布门禁等 | 否 |

**命名约束，避免与现有词混用：**

- 技能注册表里每个技能有 `layer` 字段，取值 `core / specialist / compatibility / maintainer-only`。那是**技能的发现层级**，与本文的治理层正交。本文所说“核心层”一律指治理核心层。
- 现有的 Spec、Backend、Frontend、Design 四个 **Profile** 是按职责划分的实例类型。本文的“技术栈 profile”是另一个维度：每个职责 Profile 都由“治理核心 + YSS 技术栈内容”组成。
- 本文不引入新的流程术语，沿用 FR-014 的“核心层 / profile 层”。

## 4. 证据：技术栈关键词密度

下表对候选资产统计技术栈关键词（`Java|Spring|OpenAPI|Vue|antd|AntDV|Ant Design|Maven|mvnw|pnpm|DDD|domain-driven|layered-mvc|MyBatis|Formily|YSS|yss-`）。“每万字”是命中数除以字符数乘一万。经验阈值：≤ 3 视为技术栈无关，≥ 8 视为技术栈相关，介于其间看命中的词是什么（命中只是产品名 `YSS` 时不算耦合）。

| 资产 | 命中 | 每万字 | 主要命中 | 判断 |
|---|---|---|---|---|
| 批准上下文 schema | 0 | 0.0 | — | 核心 |
| 用户决定 schema | 0 | 0.0 | — | 核心 |
| Spec 基线包 schema | 0 | 0.0 | — | 核心 |
| Spec 基线导入回执 schema | 0 | 0.0 | — | 核心 |
| 战略设计交接 v5 schema | 1 | 0.2 | `YSS`（产品名） | 核心 |
| checkpoint schema | 1 | 0.5 | `YSS`（产品名） | 核心 |
| 数字人任务包 schema | 1 | 0.4 | `YSS`（产品名） | 核心 |
| 注册表 schema | 1 | 1.4 | `YSS`（产品名） | 核心 |
| 批准记录 schema | 1 | 2.7 | `YSS`（产品名） | 核心 |
| 上下文对账 schema | 1 | 4.0 | `YSS`（产品名） | 核心 |
| 用户决定协议 | 3 | 4.1 | Spring、Java、DDD 全在同一段：后端脚手架确认使用 `gate.backend-architecture-platform-approved` 的应用说明 | 核心为主，含一段 profile 应用说明 |
| 切片实现合同 v3 schema | 6 | 2.0 | `layered-mvc`、`domain-driven` | 混合：架构 profile 枚举 |
| 前端实现证据 schema | 4 | 6.6 | `pnpm` | profile |
| OpenAPI 草案校验记录 schema | 4 | 12.6 | `pnpm`、`OpenAPI` | profile |
| 后端架构身份 schema | 7 | 8.5 | `layered-mvc`、`domain-driven` | profile |
| 脚手架合同 schema | 18 | 11.3 | `yss-`、`layered-mvc` | profile |
| 生命周期注册表 | 36 | 14.8 | DDD 13、OpenAPI 7、Spring 4 | 混合：机制与栈内容同文件 |
| 数字人角色注册表 | 101 | 52.8 | `yss-` 76（27 个不同技能 id） | 混合：角色与会签是核心，技能包绑定是 profile |
| 技能路由注册表 | 205 | 57.3 | `yss-` 174、`layered-mvc` 21 | 混合：机制是核心，79 个技能条目是 profile |
| 编排合同 | 227 | 23.4 | `yss-` 191 | 混合：栈内容为主，含少量机制段 |

方法局限：关键词计数只说明耦合的有无与大致程度，不判断语义；“混合”资产的拆分点由实现合同逐项复核。

## 5. 归属表（AC-019）

AC-019 要求覆盖生命周期注册表、批准记录 schema、交接包、技能注册表与 YSS 专项技能，并逐项标明层。

| 资产 | 位置 | 层 | 依据 | 拆分点 / 备注 |
|---|---|---|---|---|
| 生命周期注册表（结构与关系） | `.template-spec/process/lifecycle-registry.yaml` | **混合 → 核心为主** | 8 个阶段、8 个门禁、31 个产物、26 个工作单元、24 类证据、14 项检查（2026-10-11 快照）的结构与稳定 ID 规则与技术栈无关；但其中 `gate.backend-architecture-platform-approved`、`gate.engineering-contract-approved`、`artifact.openapi-*`、`artifact.engineering-baseline`、`artifact.project-scaffold-contract`、`artifact.tactical-design`、`evidence.antd-cli-validation`、`work-unit.service-project-initialization` 等是 YSS 栈内容 | 稳定 ID 不改名。拆成“核心注册表 + YSS 增量注册表”，加载后合并，由同一个 schema 校验 |
| 注册表 schema、checkpoint schema 与模板 | `.template-spec/process/schemas/lifecycle-registry.schema.json`、`lifecycle-checkpoint.schema.json` | **核心** | 命中仅产品名 | 无需拆分 |
| 批准记录 schema 与消费脚本 | `schemas/approval-record.schema.json`、`approval-context.schema.json`，`scripts/lib/approval-*.mjs`，`scripts/verify-approval-record` | **核心** | 字段是 `gate_id`、`subject_digest`、`drafter_principal_ref`、`countersigner_role_ids`、`basis`、`biological_veto`，命中仅产品名 | 无需拆分；这是摘要绑定批准与起草者会签人分离的载体 |
| 用户决定协议 | `schemas/user-decision.schema.json`、`.agents/skills/yss-product-lifecycle/references/user-decisions.md` | **核心**（文本含一段 profile 应用） | schema 0 命中；协议文本 3 处命中集中在一段后端脚手架确认的应用说明 | 把该段移到 profile 增量，协议正文与 schema 留核心 |
| 上下文对账与 CONTEXT 合同 | `schemas/context-reconciliation.schema.json`、`scripts/lib/context-contract.mjs` | **核心** | 业务词汇治理与技术栈无关 | 无需拆分 |
| 数字人角色注册表 | `.template-spec/agents/digital-human-roles.yaml` 及脚本 | **混合 → 核心为主** | 角色、协作组、`gate_policy` 会签规则、运行时绑定是核心；各角色的技能包引用了 27 个不同的 `yss-*` 技能 id（共 76 处命中） | 技能包绑定移到 profile 增量，角色与会签留核心 |
| 不可变交接包（Spec 基线） | `schemas/spec-baseline-package.schema.json`、`spec-baseline-import-receipt.schema.json`，`scripts/lib/spec-baseline.mjs`，`.template-spec/process/spec-baseline.md` | **核心** | 0 命中；不可变包与回执只关心身份、版本、摘要 | 无需拆分 |
| 不可变交接包（战略设计交接） | `schemas/strategic-design-handoff-v5.schema.json`、`strategic-handoff-export-v2.schema.json`、导入回执 schema，`scripts/lib/strategic-handoff*.mjs` | **核心** | 命中仅产品名 | 无需拆分 |
| 切片实现合同 | `schemas/slice-implementation-contract-v3.schema.json`、`yss-implementation-contract-compiler` | **混合 → 核心为主** | 合同结构（范围、验收、证据、写范围）是核心；`layered-mvc`、`domain-driven` 的枚举是 YSS 架构 profile | 把架构 profile 枚举改为引用 profile 增量登记的值 |
| 后端、前端交付面 schema | `schemas/backend-delivery*.schema.json`、`frontend-delivery-acceptance*.schema.json`、`frontend-implementation-evidence.schema.json`、`openapi-draft-validation-record.schema.json`、`project-scaffold-contract.schema.json`、`backend-architecture-identity.schema.json` | **profile** | 命中密度 6.6–12.6；包含 `pnpm`、`OpenAPI`、`layered-mvc`、`yss-` | 随 YSS 栈整体移动 |
| 技能路由注册表（机制） | `yss-skill-registry.yaml` 的 `skill_dependencies`、`invocation_contract`、`runtime_policy`、分层与成熟度规则；`scripts/lib/skill-registry.mjs`、`skill-supply-chain.mjs` | **核心** | 技能依赖类型、调用契约、投影与锁的规则不依赖具体技能 | 机制与条目分文件 |
| 技能注册表（条目） | 同文件的 `skills` 列表、`backend_skill_domains`、`backend_source_index_contract` | **profile** | 205 处命中，79 个条目大多是 `yss-*` 与栈相关技能 | 条目归属见下三行 |
| 通用工作流技能（22 个） | `i-have-adhd`、`code-review`、`codebase-design`、`competitive-intelligence`、`diagnosing-bugs`、`domain-modeling`、`grilling`、`handoff`、`implement`、`llm-wiki`、`prototype`、`yss-research`、`resolving-merge-conflicts`、`setup-matt-pocock-skills`、`tdd`、`to-spec`、`to-tickets`、`triage`、`using-git-worktrees`、`wayfinder`、`writing-for-agents`、`git-commit-core` | **核心** | 技术栈无关的工作方法；多数来自 `mattpocock/skills` | 无需拆分 |
| 治理编排技能（7 个） | `yss-product-lifecycle`、`yss-stage-decision`、`setup-yss-harness`、`maintaining-skills`、`publish-skills-sh`、`implementation-repo-onboarding`、`cross-repo-implementation-routing` | **混合 → 核心为主** | 编排与交接流程是核心；它们读取的编排合同与引用里嵌了 YSS 栈的工作单元与技能清单 | 技能正文留核心，`orchestration-contract.yaml` 的栈工作单元段移到 profile |
| 编排合同 | `.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml` | **混合 → profile 为主** | 227 处命中；`request_triage`、`checkpoint_policy`、`matt_invocation_boundary` 等机制段是核心 | 机制段留核心，工作单元路由与生成器路由移到 profile |
| YSS 专项技能（50 个） | 注册表 `specialist` 层的 40 个（后端组件与规范、前端 Formily / YTable / YTree 等、脚手架生成器、`alibaba-java-code-style`、`lombok`、`mapstruct` 等），加上 `yss-technical-design`、`yss-implementation-contract-compiler`、`yss-openapi-draft-review`、`yss-openapi-governance`、`yss-prototype-stage`、`yss-design-system`、`prototype-review`、`yss-skill-source-index-refresh`、`frontend-commit`、`java-backend-commit` | **profile** | 绑定 Java、Spring Boot、OpenAPI 3.1、DDD / 分层 MVC、Vue3、Ant Design Vue 与 YSS 组件 | 随 YSS 栈整体移动 |
| 平台技能 `product-design` | `.codex/skills/product-design`（Codex 独有） | **profile** | 属 Design 职责 Profile 的产品设计插件 | 随 Design 职责 Profile 的栈内容 |
| 工程基线与后端平台 | `.template-spec/engineering/`、`backend-platforms.*` | **profile** | Java、Maven、Spring Boot 平台线 | 随 YSS 栈整体移动 |
| 原型与设计系统资产 | `.template-spec/design/`、`yss-prototype-stage` 资产 | **profile** | Vue3 + AntDV、shadcn-vue 作者工具链 | 随 YSS 栈整体移动 |
| 维护强度与验证 | `.template-source/process/maintenance-intensity*.yaml`、`template-verification-profiles.yaml`、`scripts/verify-template*` | **模板源维护层** | 只服务本仓维护，已排除出实例分发 | 不参与分层 |
| `ci-gate`、`ci-setup`、`agent-hook`、`harness-metrics` | `scripts/` 与 `scripts/lib/` | **模板源维护层** | 同上，`bundle-profile.json` 已排除 | 不参与分层 |

分区完整性：79 个注册技能 = 通用工作流 22 + 治理编排 7 + YSS 专项 50，互不重叠。

## 6. 落地方式（不在本轮实现）

1. **合并加载。** 核心注册表持有机制与通用条目，YSS profile 以增量文件追加条目，加载器按稳定 ID 命名空间合并，核心 schema 校验合并后的结果。稳定 ID 一律不改名，已有批准与交接引用不受影响。
2. **核心 schema 不枚举技术栈取值。** 例如切片实现合同的架构 profile 取值改为引用 profile 增量里登记的集合。
3. **分发边界显式化。** 分发配置按“核心文件清单 + 技术栈 profile 文件清单”表达，实例初始化时核心总是包含，技术栈 profile 按所选职责 Profile 带入。
4. **验证。** 用一个空技术栈 profile 实例化核心：所有核心校验通过，核心文件里没有 `yss-` 技能 id，关键词密度不高于第 4 节的“核心”阈值。该用例就是实现合同的主要验收。

## 7. 成本与风险

| 风险 | 说明 | 应对 |
|---|---|---|
| 只有一个技术栈 | 目前没有第二个技术栈或外部采用者，拆分的收益是预期，不是已发生 | 见第 8 节建议：先立边界规则，物理拆分后置 |
| 稳定 ID 与已有批准 | 拆文件若改了 ID，所有历史批准与交接引用失效 | 设计要求 ID 不改名；拆分只改文件归属 |
| 与 CLI 发布耦合 | 分发清单、Bundle 渲染在 yss-cli 里有硬编码，WP-05、WP-08 已显示模板与 CLI 的发布错位成本 | 物理拆分与 yss-cli 的改动合并为一次跨仓改动 |
| 过度抽象 | 为未来技术栈预留过多扩展点 | 只抽象第 5 节已出现的混合文件，不新增扩展机制 |

## 8. 建议

**边界先行，拆分后置。** 现在就采用两条低成本规则：

1. 新增或修改资产时，按第 2 节的判定规则归层，核心层资产不得出现技术栈专有词（产品名 `YSS` 与举例除外）；
2. 对核心层资产，可用第 4 节的关键词密度做回归检查。

物理拆分（合并加载、核心包与技术栈包分发）等出现第二个技术栈、外部采用者，或 yss-cli 与 Profile 的跨仓改动已经排期时再做，与它们合并为一次改动。

## 9. 维护连续性（FR-017 / AC-022）

仓库归属、第二维护者、`CODEOWNERS` 范围与 CLI 平台矩阵的决策记录在计划第 6 节“WP-11 维护连续性决策”各行，未决项均带时点。本文不重复。

## 10. 决策记录（待维护者签署）

| 编号 | 决策点 | 建议 | 决定 | 签署人 | 日期 |
|---|---|---|---|---|---|
| L-1 | 采用三层划分与第 2 节判定规则 | 采用 |  |  |  |
| L-2 | 第 5 节的归属结果（含 7 个治理编排技能按“混合 → 核心为主”） | 采用，混合项在实现合同里逐项复核 |  |  |  |
| L-3 | 命名：沿用“核心层 / profile 层”，不引入新术语，并注明与技能 `layer` 字段、职责 Profile 正交（第 3 节） | 采用 |  |  |  |
| L-4 | 物理拆分时点 | 边界先行，物理拆分在出现第二个技术栈、外部采用者或跨仓改动排期时再做（第 8 节） |  |  |  |
| L-5 | 稳定 ID 在拆分中不改名 | 采用 |  |  |  |

## 11. 验收对照（AC-019）

| AC-019 要求 | 本文位置 |
|---|---|
| 归属表覆盖生命周期注册表 | 第 5 节第 1 行 |
| 覆盖批准记录 schema | 第 5 节第 3 行 |
| 覆盖交接包 | 第 5 节“不可变交接包”两行与切片实现合同行 |
| 覆盖技能注册表 | 第 5 节“技能路由注册表”两行 |
| 覆盖 YSS 专项技能 | 第 5 节“YSS 专项技能（50 个）”行 |
| 每项标明核心层或 profile 层 | 第 5 节“层”列 |
| 维护者审阅并签署 | 第 10 节，**待签署** |

## 12. 下一份实现合同应包含

- 核心注册表与 YSS 增量注册表的拆分、加载与校验；
- 核心 schema 中技术栈取值改为引用 profile 的改造清单；
- 分发配置按两类文件清单表达的变更，以及 yss-cli 的对应改动；
- 空技术栈 profile 实例化的验收用例与关键词密度回归检查；
- 对第 5 节“混合”项的逐项复核记录。
