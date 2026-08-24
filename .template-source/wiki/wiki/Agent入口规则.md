# Agent入口规则

`AGENTS.md` 只保存 Agent 必须首先遵守的仓库身份路由、硬门禁和禁止事项。每个任务开始时先读根目录 `yss-project.yaml`：`template-source` 走模板维护，`project-instance` 按产品研发生命周期分诊；文件缺失或模式非法时停止路由并做迁移检查，不根据目录、Git 远程或占位符猜测身份。细则见 [[仓库身份与路由]]。

单一事实来源不得在说明文档里重复定义：领域与流程词汇以 `CONTEXT.md` 为准；Agent 入口以 `AGENTS.md` 为准；主阶段、门禁、产物、工作单元、证据和稳定 ID 以 `docs/process/lifecycle-registry.yaml` 为准（`docs/process/lifecycle-artifact-map.md` 只是派生阅读视图）；影响面触发与 `not-applicable` 以 `docs/process/harness-process-tailoring.md` 为准（见 [[影响面分诊与流程裁剪]]）；技能清单、来源、版本、哈希和投影目标以 `skills-lock.json` 为准。`docs/agents/yss-skill-registry.yaml` 当前 `status: shadow`，不作为 Router / 生命周期运行时入口。

落地文档正文统一使用简体中文；英文专有名词、路径、schema、命令与协议 metadata 保持原样。业务术语必须已有 PascalCase `英文标识`；代码类型 / 字段与契约 property 使用该词干按 `CONTEXT.md` 文首规则变形；改中文术语或英文标识都先回写 `CONTEXT.md`。新流程统一使用 Spec、Ticket、`to-spec`、`to-tickets`。功能父 Ticket 汇总阶段证据；Spec 初稿、产品设计、原型、OpenAPI Draft 和待冻结资产使用 `ready-for-human`；只有通过必要门禁、阻塞边已清除并具备直接实现条件的垂直切片 Ticket 才能使用 `ready-for-agent`（见 [[Ticket与流程状态]]）。

进入实现前先读 `docs/process/implementation-repo-integration.md` 并登记实现仓库，再由 `yss-router` 编译最小 skill 集合与当前实现合同（见 [[YSS路由与合同编译]]）。当前仓库默认是研发管理仓库，运行时代码优先在独立实现仓库；只有用户明确选择时才用 `apps/backend/<project>/` 或 `apps/frontend/<project>/`。`app/backend/`、`app/frontend/` 禁止作为工程输出（见 [[实现仓库与跨仓库契约]]）。前端测试、type-check 与构建优先 `pnpm`；后端校验、测试与编译优先项目根 `./mvnw`；不要默认 `npm` / `yarn` 或裸 `mvn`。根目录 `CLAUDE.md` 只引用 `AGENTS.md`，不是第二套入口规则。

专项任务必须走指定入口：技术事实、标准、第三方 API 或框架行为影响决策时用 `research` 或等价一手资料记录；竞品与市场口碑用 `competitive-intelligence`；UI 设计、原型、组件或主题先 `yss-design-system` 再 `yss-prototype-stage`；Bug 先 `diagnosing-bugs` 再 `tdd`；冲突用 `resolving-merge-conflicts`；架构治理用 `improve-codebase-architecture` / `codebase-design`；跨线程、跨仓库或上下文过长用 `handoff`。本地知识库 init / refresh / rebuild，或要把研究结果落成持久 wiki，必须使用 `llm-wiki`（落成持久 wiki 用 `ingest`；已映射 live 源变了用 `refresh`；见 [[LLM Wiki]]）。`template-source` 的 wiki-root 为 `.template-source/wiki`；`project-instance` 不附带源仓库编译树，需要时在仓库根 `wiki/` 执行 `init`。一次性一手资料笔记走 `research`，持久 wiki 走 `llm-wiki` 的 `ingest`，不把 ingest 理解成替代权威源。

实现者不能承担命中的独立审查；任何「完成 / 可合并 / 可发布」结论必须基于 fresh verification，不接受「之前跑过」或实现者自述（见 [[Fresh验证与独立审查]]）。业务行为默认按 `tdd` 使用已确认的公开 seam 逐切片实现；YSS 专项规范见 [[YSS工程技能体系]]，通用工程流程见 [[Matt技能体系]]。

## 来源

- `AGENTS.md`
- `CONTEXT.md`
- `yss-project.yaml`
- `docs/adr/0002-yss-project-repository-mode.md`
- `README.md`
