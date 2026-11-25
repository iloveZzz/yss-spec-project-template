# __YSS_PROJECT_NAME__

Backend 的 `project` 与 `skills` 两种安装均默认预装 44 项研发与协作技能，可用库共 57 项。实际集合以当前 CLI 的 Bundle 为准。任务按当前需求直接开展，入口见 [AGENTS.md](AGENTS.md)。

全团队工作方式见[用户手册](.template-spec/user-guide/用户手册.md)，团队讲义、演示和练习见[培训材料](.template-spec/user-guide/培训材料.md)，后端日常路径见[后端手册](.template-spec/user-guide/后端子项目用户手册.md)。

完整案例见[客户跟进项目 Demo](.template-spec/user-guide/客户跟进项目全生命周期Demo.md)，沿同一项目学习技能协作、研发、问题修复与测试环境交付。

- 技能：`.agents/skills/`；宿主副本按安装记录同步。数据库设计、元信息说明书和 DDL 使用默认技能 `database-analysis-docs`。
- PR/MR 正文草稿使用默认技能 `pr`，通过 PR/MR 交付选定材料使用 `yss-deliver-pr-mr`。用户明确要求复盘 Agent 会话时可补装 `retro`。
- 业务词汇：`CONTEXT.md`；相关资料：`.template-spec/`。
- 支持本版接口的 CLI 可用 `yss sync --root . --dry-run` 预览、`yss sync --root .` 更新，`yss doctor --root .` 查看本地差异。
- `yss skills list --root .` 列出技能，`yss skills ensure <技能> --root .` 补装；命令以当前 `yss help` 为准。

承接上游 Spec 的规则、验收与原型说明，按需完成任务拆分、架构/技术/详细设计、脚手架、开发和测试。完整交付更新构建部署手册（优先已有 README/运维文档，结构见 `.template-spec/templates/build-deploy-guide-template.md`）；部署仅为说明，不执行部署或建设 CI/CD/云资源。局部修改只处理受影响部分，MVC 不添加 DDD 层，TDD 仅在明确要求时采用。

用户业务文件与本地修改保留；不要求阶段门禁、批准包或测试报告。提交、推送、部署与发布按用户授权执行。

已授权研发满足任务可拆、依赖明确、路径及运行资源可隔离且宿主允许时，由 implement 自行并行并负责集成验证；条件不满足则顺序完成。具体方法见 `.agents/skills/implement/SKILL.md`。
