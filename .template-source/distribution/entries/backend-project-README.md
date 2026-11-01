# __YSS_PROJECT_NAME__

Backend 的 project / skills 两种安装均默认预装 41 项研发技能，可用库共 53 项；实际集合以当前 CLI 的 Bundle 为准。任务按当前需求直接开展，入口见 [AGENTS.md](AGENTS.md)。

- 技能：`.agents/skills/`；宿主副本按安装记录同步。
- 业务词汇：`CONTEXT.md`；相关资料：`.template-spec/`。
- 支持本版接口的 CLI 可用 `yss sync --root . --dry-run` 预览、`yss sync --root .` 更新，`yss doctor --root .` 查看本地差异。
- `yss skills list --root .` 列出技能，`yss skills ensure <技能> --root .` 补装；命令以当前 `yss help` 为准。

承接上游 Spec 的规则、验收与原型说明，按需完成任务拆分、架构/技术/详细设计、脚手架、开发和测试。完整交付更新构建部署手册（优先已有 README/运维文档，结构见 `.template-spec/templates/build-deploy-guide-template.md`）；部署仅为说明，不执行部署或建设 CI/CD/云资源。局部修改只处理受影响部分，MVC 不添加 DDD 层，TDD 仅在明确要求时采用。

用户业务文件与本地修改保留；不要求阶段门禁、批准包或测试报告。提交、推送、部署与发布按用户授权执行。
