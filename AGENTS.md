# AGENTS.md — AI 开发入口规则

> 本文件只保存 Agent 必须首先遵守的仓库身份路由、硬门禁和禁止事项。完整生命周期、流程裁剪和 YSS 实现细则以下文引用的权威资产为准。

## 1. 首先识别仓库身份

每个任务开始时先读取根目录 `yss-project.yaml`：

- `repository_mode: template-source`：使用“模板维护流程”，不默认生成具体产品的 Spec、原型、OpenAPI 或垂直切片 Ticket。
- `repository_mode: project-instance`：按产品研发生命周期分诊任务。
- 文件缺失、schema 版本不支持或模式值非法时，停止路由并执行迁移检查；不根据目录、Git 远程或占位符猜测身份。

仓库身份契约见 `docs/adr/0002-yss-project-repository-mode.md`。

## 2. 单一事实来源

| 事实类型 | 权威资产 |
|---|---|
| 领域与流程词汇 | `CONTEXT.md` |
| Agent 入口、硬门禁、禁止事项 | `AGENTS.md` |
| 主阶段、门禁、产物和退出标准 | `docs/process/lifecycle-artifact-map.md` |
| 影响面触发与 `not-applicable` | `docs/process/harness-process-tailoring.md` |
| 技能清单、来源、版本、哈希和投影目标 | `skills-lock.json` |

README、用户指南和其他说明文档只引用或解释上述事实，不重复定义同一规则。

## 3. 标准文档语言与规范语汇

- 所有面向业务、产品、架构、实施、审查、发布和复盘的落地文档，正文统一使用简体中文。
- 英文专有名词、代码标识、API 路径、schema、类名、方法名、枚举值、错误码、命令、文件名和协议 metadata 保持原样。
- 新流程统一使用 Spec、Ticket、`to-spec`、`to-tickets`。过时术语和技能名只能出现在迁移指南或明确标注的旧项目上下文。
- 实施前读取 `CONTEXT.md`；与词汇或 ADR 冲突时立即指出并先解决冲突。

## 4. `template-source` 模板维护流程

```text
影响面分析
→ 修改对应单一事实来源
→ 同步技能投影和派生文档
→ 执行压力场景与 scripts/verify-template
→ 独立审查和 Git checkpoint
```

硬门禁：

- 修改 skill、`AGENTS.md`、流程规则或模板时，必须使用 `writing-skills` 的 RED / GREEN / REFACTOR 思路，保留基线失败、压力场景和修订后验证证据。
- `.agents/skills` 是跨 Agent 共享技能的权威内容；`.claude/skills`、`.codex/skills`、`.hermes/skills`、`.pi/skills`、`.trae/skills` 中的共享技能是生成投影，禁止分别手工修改。
- `scripts/verify-template` 是模板发布阻断门禁。模板与外部 `create-yss-spec` 的跨仓库契约未完成集成验证时，不得声称可发布。

## 5. `project-instance` 产品研发路由

任务开始时先根据 `docs/process/harness-process-tailoring.md` 判断小改动、中等变更或新模块 / 高风险变更，定位最近可信阶段。日常骨架为：

```text
入口分诊
→ 机会与 Discovery
→ 业务 / Spec / 功能架构
→ 产品设计与需求冻结
→ 系统 / 数据架构与工程契约设计审查
→ 契约冻结与 Ticket 正式化
→ 垂直切片与 TDD 实现
→ 验证发布与复盘
```

执行原则：

- 21 个门禁全部是条件强制门禁。命中触发条件时必须完成；未命中时只记录 `not-applicable` 及原因，不生成空文档。
- 新功能或较大变更先用 `grill-with-docs` 澄清，再用 `to-spec` 形成 Spec。
- 只要进入 Spec 基线，必须产出产品总体设计或功能架构；只有存在 UI 影响时，才强制低保真页面草图、状态矩阵、Ant Design v6 高保真 HTML 原型和用户确认。
- API 契约变更先形成 OpenAPI 3.1 Draft，经必要的工程基线、系统 / 数据架构和设计审查后 Freeze，再进入实现。
- Spec Delta 只记录相对既有冻结 Spec 基线的高风险行为差异；全新产品、全新模块和低风险调整不生成 Spec Delta。
- OpenAPI Freeze 或无 API 影响记录完成后，使用 `to-tickets` 拆成可独立验证的窄垂直切片，禁止只按 Adapter / Application / Domain / Infrastructure 横向拆分。

## 6. Ticket 与状态

- 每个功能先建立功能父 Ticket，用于汇总 Spec、设计、审查、OpenAPI Freeze、阻塞项和阶段证据。
- Spec 初稿、产品设计、原型、OpenAPI Draft 和待冻结资产使用 `ready-for-human`。
- 只有通过必要门禁、阻塞边已清除并具备直接实现条件的垂直切片 Ticket，才能使用 `ready-for-agent`。
- Ticket、Spec 和阶段证据必须按用户选择或当前主远程路由到 GitHub / GitLab；平台不可用时生成本地待发布草案，不自动改投其他平台。

平台规则和五态标签见 `docs/agents/issue-tracker.md` 与 `docs/agents/triage-labels.md`。

## 7. 实现与 YSS 路由硬门禁

进入实现前：

1. 确认受影响的 frontend / backend 工程是 `existing`、`required` 还是 `initialized`，并登记实现仓库、分支、CI、验证命令和回滚点。
2. 无可复用工程时，先确认外部目标仓库或输出目录，再分别使用 `yss-ddd-scaffold-generator` / `yss-frontend-scaffold-generator`；不因当前仓库缺少 frontend / backend 目录而绕过脚手架路由。
3. 使用 `yss-router` 选择最小 YSS skill 集合。后端领域、Application、Repository / Gateway、Web / DTO 分别路由到对应 YSS skill；涉及 POJO 样板或对象转换时必须加载 `lombok`、`mapstruct` 和 `alibaba-java-code-style`。
4. 所有正式垂直切片必须先由 `yss-router` 编译 Slice Implementation Contract 草案，再由生命周期编排器核验并持久化；合同至少包含 Common、Frontend、Backend、Contract、Cross-repo 子合同、工作单元、TDD 模式、允许写路径、禁止模式、证据和验证命令。Router 不得自行批准合同或设置 `ready-for-agent`。
5. 后端切片必须在统一合同中补齐 Backend Slice Implementation Contract，至少包含 `required_skills`、`allowed_write_paths`、`forbidden_patterns`、`expected_evidence_files`、`seam_deferred`、`verification_commands`。
6. 把系统 / 数据架构、ADR、工程基线、OpenAPI Freeze 和风险 / 回滚约束转译为 Build Architecture Checklist。
7. 核心 YSS skills 必须消费批准合同并返回 YSS Skill Execution Result；路径越界、证据缺失、未执行验证、`drift`、`violation` 或 `new_impacts` 阻断继续实现或触发重路由。

禁止绕过上述合同、检查清单或专项 skill，直接在 `AGENTS.md` 中自行发明细则。详细实现约束以 YSS skills、`docs/process/implementation-repo-integration.md` 和对应模板为准。

## 8. 专项任务的强制入口

| 触发情形 | 必须使用 |
|---|---|
| 技术事实、标准、第三方 API 或框架行为影响决策 | `research` 或等价的一手资料记录 |
| 竞品、市场或用户口碑事实 | `competitive-intelligence` |
| UI 设计、原型、组件或主题 | `yss-design-system` 后路由 `product-design:index`；产出前用 `antd` 查询 Ant Design v6 事实 |
| Bug、测试失败或性能回退 | `diagnosing-bugs` 建立可复现反馈，再用 `tdd` |
| merge / rebase 冲突 | `resolving-merge-conflicts` |
| 架构治理、难测模块或深模块设计 | `improve-codebase-architecture` / `codebase-design` |
| 跨线程、跨仓库、上下文过长或原型结论回流 | `handoff` 或等价交接记录 |

业务行为默认按 `tdd` 使用已确认的公开 seam 逐切片实现。一次性生成、纯配置或流程文档不适用代码 TDD 时，必须记录例外理由和可执行验证方式。

## 9. 工作区与实现仓库边界

当前仓库默认是研发管理仓库，前端、后端和其他运行时代码优先位于独立实现仓库。只有用户明确选择当前仓库承载实现代码时，才可按需创建：

```text
apps/backend/
apps/frontend/
```

不得自行新建其他顶层业务代码目录。

## 10. 独立审查、验证和追踪

- 实现者不能审查自己的代码。模板发布、代码切片和高风险变更必须由其他 Agent 或人工独立审查；低风险文档变更可使用显式人工 checkpoint。
- 任何“完成 / 可合并 / 可发布”结论必须基于 fresh verification，不接受“之前跑过”或实现者自述。
- 每个阶段或垂直切片结束时，同步对应 Ticket 的范围、验证证据、风险、人工审查点和下一步。
- 每个阶段结束时执行 Git checkpoint 判断：列出本阶段产物和 Ticket 同步状态，排除无关脏文件，只在用户已授权时按明确范围提交或推送。
- 发布后或阶段性完成后做复盘判断；出现架构返工、验证返工、IMPORTANT / CRITICAL review finding 或人工确认延期时，落简体中文复盘并修订权威资产。

## 11. Subagent 协同

使用 subagent 前必须定义任务包：输入资产、输出产物、可写范围、禁止事项、验收标准和汇合方式。写入范围不得重叠，实现者不得同时担任审查者。

subagent 可收集证据、产出草案、实现局部切片和执行独立审查 / 验证，但不得替代主控 Agent 作出仓库身份判定、Spec baseline、需求冻结、OpenAPI Freeze、架构放行、Ticket 最终状态、Git checkpoint 范围或“完成 / 可合并 / 可发布”结论。

详细规则见 `docs/process/subagent-collaboration.md`。

## 12. 测试质量基线

模板推荐值为 Domain / Application `>= 90%`、API `>= 80%`、前端组件 `>= 75%`、已明确的关键流程 `100% E2E`。这些数字只是模板推荐；项目实例必须在测试策略中明确采纳或覆盖后，才构成 CI 门禁。未定义关键流程清单时，不得声称其 E2E 覆盖率达到 100%。
