# __YSS_PROJECT_NAME__

本项目使用 YSS 需求与产品设计技能与参考资料。任务按当前需求直接开展，入口见 [AGENTS.md](AGENTS.md)。

- 技能：`.agents/skills/`；宿主副本按安装记录同步。
- 业务词汇：`CONTEXT.md`；相关资料：`.template-spec/`。
- 支持本版接口的 CLI 可用 `yss sync --root . --dry-run` 预览、`yss sync --root .` 更新，`yss doctor --root .` 查看本地差异。
- `yss skills list --root .` 列出技能，`yss skills ensure <技能> --root .` 补装；命令以当前 `yss help` 为准。

用户业务文件与本地修改保留；不要求阶段门禁、批准包或测试报告。提交、推送、部署与发布按用户授权执行。

Spec 完整交付只包含业务规格、高保真交互原型及交互说明；核心操作可操作、纯展示可用高保真静态稿、无 UI 用业务逻辑或状态原型，覆盖范围按风险选择。低保真草稿不单独算完整交付。普通查询和局部修订只完成当前范围。

业务票仅按明确拆票请求组织，不是额外必交付物；确认规格或准备交研发不会自动生成票据、DDL/索引、生产 API 契约或实现切片。明确技术设计或开发请求作为研发任务按授权承接，原型模拟不构成生产承诺；具体职责见 AGENTS.md。

`project` 与 `skills` 默认安装同一组 16 个 Spec 能力入口。预装不改变显式调用政策或外部动作授权；`implement`、`code-review` 可按需补装，不属于 Spec 默认集合。
