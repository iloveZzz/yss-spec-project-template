# 模板治理流程质询记录

> 日期：2026-07-20
> 范围：`yss-spec-project-template` 模板源仓库
> 方法：`grill-with-docs` + `domain-modeling`

## 结论

1. 新流程的规范语言统一为 Spec、Ticket、`to-spec`、`to-tickets`；PRD、Issue、`to-prd`、`to-issues` 不再作为模板入口。
2. 仓库身份分为 `template-source` 和 `project-instance`，Agent 必须在分诊前识别身份。
3. 8 个主阶段是项目实例的生命周期骨架；21 个门禁采用条件强制，未触发时只记录 `not-applicable` 及原因。
4. `CONTEXT.md`、`AGENTS.md`、`lifecycle-artifact-map.md`、`harness-process-tailoring.md`、`skills-lock.json` 分别承担词汇、Agent 入口、生命周期映射、触发规则和技能清单的单一事实来源。README 和用户指南只导航与解释。
5. 过时技能 `to-prd` 和 `to-issues` 从模板源、锁文件、校验脚本和所有 Agent root 中直接删除，不保留转发别名。
6. `.agents/skills` 是跨 Agent 共享技能的权威内容；Claude、Codex、Hermes、Pi 和 Trae 的同名技能是生成投影。不再声明单数 `.agent/`。
7. 所有进入 Spec 基线的功能都需要产品总体设计或功能架构；只有存在 UI 影响时才触发低保真、状态矩阵、高保真 HTML 原型和用户确认。
8. Spec、设计和 OpenAPI Draft 使用 `ready-for-human`；只有通过必要门禁的垂直切片 Ticket 才能使用 `ready-for-agent`。
9. 每个功能先建立一个功能父 Ticket 汇总阶段证据；契约冻结后再生成垂直切片子 Ticket。
10. `AGENTS.md` 只保留全局路由、硬门禁和禁止事项；YSS 实现细则下沉到专项 skill、Implementation Contract 和 review checklist。
11. 根目录新增 `yss-project.yaml`，只声明 `schema_version` 和 `repository_mode`。该契约的取舍见 `docs/adr/0002-yss-project-repository-mode.md`。
12. `template-source` 使用模板维护流程，不默认生成产品 Spec、原型或 OpenAPI。
13. Spec Delta 只记录对既有冻结基线的行为差异，不用于全新产品或全新模块。
14. 模板内的测试覆盖率数字是推荐基线；项目实例明确采纳后才构成 CI 门禁。
15. `scripts/verify-template` 是模板发布阻断门禁，需覆盖身份清单、技能投影、旧入口清理、单一事实来源和压力场景。
16. 本次整改对模板源执行完整破坏性清理，并用迁移指南承接旧项目；不修改已生成的外部项目。
17. `AGENTS.md` 不再保存项目名称、业务领域和团队规模占位符。
18. `yss-project.yaml` 是模板与 `create-yss-spec` 的跨仓库契约；CLI 未完成 `project-instance` 改写和集成验证前，模板不得声称可发布。
19. 允许对上游 Matt skills 做 YSS 适配，但锁文件必须同时记录上游与有效内容哈希。
20. 模板发布、代码切片和高风险变更必须独立审查；低风险文档变更可使用人工 checkpoint。
21. 本次变更按破坏性主版本升级管理，模板与 CLI 协调发布。
22. ADR 统一使用 `docs/adr/0001-*.md` 顺序编号，通用 ADR 模板移入 `docs/templates/`。
23. 所有面向人的落地文档统一使用简体中文，必要的英文专有名词、代码标识和 metadata 保持原样。

## 实施边界

- 先整改当前模板源仓库并执行模板发布门禁。
- 为 `create-yss-spec` 生成跨仓库 handoff；未获得单独授权时不修改外部 CLI 仓库。
- 当前工作区中与本任务无关的 `.gitignore` 和 `.obsidian/workspace.json` 变更不纳入本轮整改。
- 执行期间外部新增且未登记到 `skills-lock.json` 的 `drawio` / `drawio-academic-skills` 目录不纳入本轮发布范围；同步与锁定脚本不会自动吸收未跟踪 skill。
