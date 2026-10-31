# __YSS_PROJECT_NAME__

本项目使用 YSS 需求与产品设计技能与参考资料。任务按当前需求直接开展，入口见 [AGENTS.md](AGENTS.md)。

- 技能：`.agents/skills/`；宿主副本按安装记录同步。
- 业务词汇：`CONTEXT.md`；相关资料：`.template-spec/`。
- 支持本版接口的 CLI 可用 `yss sync --root . --dry-run` 预览、`yss sync --root .` 更新，`yss doctor --root .` 查看本地差异。
- `yss skills list --root .` 列出技能，`yss skills ensure <技能> --root .` 补装；命令以当前 `yss help` 为准。

用户业务文件与本地修改保留；不要求阶段门禁、批准包或测试报告。提交、推送、部署与发布按用户授权执行。
