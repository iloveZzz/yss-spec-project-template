# T01：Spec Profile 现状诊断

日期：2026-10-29。状态：静态诊断完成，待 T02 目标流程与职责设计。

需求依据：[最终决议与待办](spec-skill-optimization-notes.md)。本报告仅分析当前源码和文档，不修改运行政策，不验证远程服务，不宣称发布版本已经改造。

## 取证基线与限制

- 模板工作区 HEAD：`89b06397c89206ed0014fa995a6de0e14f1bc61e`。
- CLI 工作区 HEAD：`74ce95303bae26adbeebfc01498efaf481a5b060`。
- CLI `docs/source-lock.json` 的 Spec 来源为模板 `4efd67df00c9e415ab206970dfdd9c39c3ad6851`，v4.8.3；不同于当前模板 HEAD。修改模板工作区不会自动改变固定 CLI Bundle。
- 本报告的“冲突”指现行设计与最终决议不一致，不将其直接归类为既有版本功能缺陷。
- 未执行 CLI 初始化、补装、平台写入或产品流程；未跑测试。结论来自静态读取，未证明实际安装包、宿主发现或 GitHub/GitLab 凭据可用。

## 当前链路

```text
setup-yss-harness
  → CLI init / attach（默认 governed）
  → 模板 Profile、入口、技能及阶段资源
  → life 根据身份选择普通分支 / 治理分支
  → governed 查询阶段、门禁、工作单元与技能
  → Plan → Spec 综合及业务票 → 适用产品设计
  → 技术/API/工程准备 → 切片准入 → 实现 → 验收与发布复盘
```

另有显式外部消费者交接路线。当前不是所有 Spec 强制交接 Backend：政策默认 `continue-current-spec`，同时声明可路由的 Backend 目标与 plan-to-backend 执行范围。新目标要求同时收缩 Spec 内部实现职责和旧交接依赖。

## 已证实的问题

| ID | 优先级 | 证据与现状 | 与目标的差异 | 影响及处理方向 |
|---|---|---|---|---|
| D01 | P0 | harness-profile.yaml 的 purpose 包含实现合同和后端交付，allowed_stages 覆盖技术工程、切片实现及发布，execution.side 为 backend | Spec 应只负责非技术规格 | 根职责声明必须先改；仅改技能描述会被 Profile 政策覆盖 |
| D02 | P0 | life 的 standalone-routing.md 明确 installation=governed 进入治理分支；stage-gates.md 定义 Plan、Spec、实施准入、交付验收四门禁 | 默认 governed 仍须支持新的轻量 Spec 主线 | 区分安装方式和流程前提，重构 Spec 路由与审批；不能通过默认改 skills 冒充满足已确认方向 |
| D03 | P0 | to-spec 正式分支要求 Plan 准入、测试 seam、业务 Ticket 集及校验；Spec 模板包含 OpenAPI 端点和技术模型检查 | 非技术规格不应依赖技术准备或额外实现准入 | 保留业务规则与 AC 表达，重写规格输入、模板和发布出口；业务票是否仍有必要应在 T02 判断，不机械照搬实现 tickets |
| D04 | P0 | tracker 配置虽支持三种平台，正文要求完整功能包、parent-ticket、checkpoint、Slice 合同和阶段状态同步 | tracker 应承载规格并供下游引用，不强制整套实现资产 | 复用平台与路径配置思路，移除规格工作对实现状态及资产目录的强制依赖 |
| D05 | P1 | 原型工作单元固定低保真审查、档位构建、QA 顺序；原型技能不确定时默认 H2，Spec 模板对产品设计影响强制低保真、状态矩阵及 H1/H2 | AI 应按风险判断文字、流程或原型的必要深度 | 保留有实际原型时的真实验证，取消所有产品设计影响都走全套构建的默认要求 |
| D06 | P0 | spec-synthesis 原生主技能为 life，to-spec 为显式兼容入口；原型工作单元 primary_skill 为 yss-prototype-stage，但其 frontmatter 为 user-only | 自动衔接必须有一致的技能所有权与调用权限 | T02 明确入口和专项职责，T06 明确显式入口及模型可调用能力；当前证据只证明存在调用约束张力，未证明运行时绕过限制 |
| D07 | P0 | progression.yaml 含 Backend 目标、默认 continue-current-spec、plan-to-backend 范围；CLI profile_guidance.go 在 Spec 分支消费 checkpoint、基线或 Handoff | 下游不固定 Backend，不强制交接包或原阶段资格 | 同时梳理模板路由与 CLI 指导消费者；只删 Handoff 文档不足以移除旧依赖，不改造 Backend 实现行为 |
| D08 | P1 | bundle-profile.json 仍分发八阶段；skills 安装默认含 implement/code-review，governed 没有该八项白名单；CLI 固定模板来源不同于当前模板 | 目标是 governed 的非技术 Spec，而非调整 skills 安装列表 | 分开审查 governed 资产、独立 skills 集合、共享技能与固定 Bundle，避免错误删除下游共享能力或宣称未装配修改已生效 |
| D09 | P0 | 原生 yss tracker 只有 status/link/sync，tracker.go 明确只镜像已链接 GitHub Issue 的五态标签，不创建、关闭或评论；文档的完整远程工作依赖 gh/glab | 三平台规格发布需要完整可执行适配 | 明确复用 gh/glab/连接器还是补 CLI 能力；不能把现有标签镜像当成完整 tracker CRUD，也不能认定 GitLab 不受支持 |

### 证据定位

- D01：[Profile 职责](../../.template-spec/process/harness-profile.yaml)。
- D02：[身份分支](../../.agents/skills/yss-product-lifecycle/references/standalone-routing.md)、[四阶段门禁](../../.template-spec/process/stage-gates.md)、[life 主入口](../../.agents/skills/yss-product-lifecycle/SKILL.md)。
- D03：[规格技能](../../.agents/skills/to-spec/SKILL.md)、[规格模板](../../.template-spec/templates/spec-template.md)、[需求澄清参考](../../.agents/skills/yss-product-lifecycle/references/plan-requirements.md)。
- D04/D09：[tracker 权威配置与平台说明](../../.template-spec/agents/issue-tracker.md)；CLI `internal/cli/tracker_commands.go`、`internal/tracker/tracker.go`、`internal/tracker/github.go`。
- D05：[原型工作单元](../../.template-spec/process/orchestration/workflow/work-units/work-unit.prototype-design-v2.yaml)、[原型技能](../../.agents/skills/yss-prototype-stage/SKILL.md)、[规格模板](../../.template-spec/templates/spec-template.md)。
- D06：[规格工作单元](../../.template-spec/process/orchestration/workflow/work-units/work-unit.spec-synthesis.yaml)、[原型技能](../../.agents/skills/yss-prototype-stage/SKILL.md)。
- D07：[推进与消费者政策](../../.template-spec/process/orchestration/domain/progression.yaml)；CLI `internal/governance/profile_guidance.go`、`internal/governance/handoff/spec_baseline.go`、`internal/project/profile_prepare.go`。
- D08：[模板分发](../distribution/bundle-profile.json)；CLI `docs/source-lock.json`、`internal/bundle/rules/spec.json`。

## 可复用能力

| 能力 | 已有依据 | 复用限制 |
|---|---|---|
| 初始化与接管 | setup-yss-harness 及 project-operations.md；CLI installation.go 的默认 governed、init/attach 计划与应用 | 不必新造初始化引擎；尚需设计任务触发、最小配置和必要决定 |
| 技能就绪 | 项目参考包含 list/resolve/ensure、当前会话读取 entryPath，以及文件/投影/宿主分层报告；CLI skills_query.go | 受管资源解析不等于通用宿主技能发现；不能把闭包核验当成全部普通技能的前提 |
| 需求事实与术语 | grilling、yss-research、domain-modeling | 只在真实缺口时使用，不重复已确认决定，不机械生成 ADR |
| 文档表达 | i-have-adhd 的技能内中文写作规范 | 配套能力，不持有业务批准或阶段状态 |
| 规格行为表达 | spec-template.md 的 FR/NFR/AC、成功/拒绝/边界/恢复场景 | 去除技术及流程前置后复用，不复制全部治理模板 |
| tracker 平台操作 | issue-tracker.md 的本地约定及 gh/glab 命令 | 文件结构须简化；认证、创建更新及失败恢复尚未实际验证 |
| 原型验证 | 现有状态矩阵、浏览器验证与设计规范 | 仅在 AI 判断确有需要、实际制作相应原型时采用 |

## 事实源与消费者地图

| 层 | 事实源或实现 | 主要消费者 | 后续改造约束 |
|---|---|---|---|
| 入口与初始化 | AGENTS、agent-entry-policy、setup-yss-harness、CLI project/installation | Agent、init/attach、项目恢复 | 新流程入口与安装方式必须一致 |
| 职责与流程 | harness-profile、lifecycle-registry、orchestration 分片、stage-gates | life、query/route、CLI governance | T02 先定职责，再清理依赖，不让旧内核重新要求实现资产 |
| 技能及参考 | canonical .agents/skills、技能注册表、skills-lock | Agent、resolve/ensure、投影及生成器 | 仅改 canonical，再生成必要派生；不直接手改 Backend 投影 |
| 规格与产品设计 | spec 模板、设计模板及专项技能 | Spec 起草、业务票检查、原型消费者 | 规格结构与可选设计深度共同调整 |
| tracker | issue-tracker.md、CLI tracker、gh/glab | 规格发布、状态读取、下游引用 | 标签镜像与规格发布职责分开 |
| 分发 | bundle-profile、Profile 生成器、CLI source-lock 与 Bundle 规则 | init、attach、sync、skills/assets ensure | 当前模板与固定发行源分别核验；本次不执行发行或升级 |

## 待 T02–T07 解决的设计问题

以下是实现选择，不重新开放已确认的需求：

1. Spec 业务完成与审批动作如何表达，哪些旧门禁和检查删除、合并或保留。
2. life、to-spec 及产品设计技能的主次关系，自动任务入口与 user-only 边界如何一致。
3. 最小 tracker 配置与规格结构，是否仍需 parent-ticket，以及保存草稿与发布的顺序。
4. 远程操作采用现有工具还是增加原生能力，认证缺口、部分失败和幂等更新如何处理。
5. 技术、Slice、Handoff 依赖从哪些 Spec 消费者移出，如何保持共享 Backend 资产不被误删。
6. 当前 governed 分发如何裁剪到新职责，以及 CLI 固定来源如何在后续装配阶段对齐。

## 建议后续顺序

先 T02 确定非技术职责、技能树和唯一主线，再 T03 审批与状态；随后完成 T04 产品设计裁剪、T05 tracker 适配和 T06 初始化设计，最后以 T07 清理清单覆盖事实源、CLI 消费及分发。只修改技能正文不足以完成此次改造。
