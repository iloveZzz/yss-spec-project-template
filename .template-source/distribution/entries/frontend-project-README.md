# __YSS_PROJECT_NAME__

Frontend 项目入口见 [AGENTS.md](AGENTS.md)。默认安装 12 项工程与协作技能；设计、原型复核、逻辑原型及业务词汇维护按需补装，可用库共 16 项。

- 技能：`.agents/skills/`；业务词汇：`CONTEXT.md`；方法参考：`.template-spec/`。
- 使用 `yss-frontend-application` 承接本次选定的规格、高保真原型与交互说明，优先复用既有工程和组件。
- 前端命令优先 `pnpm`，依赖、启动和构建命令以实际工程为准；此安装只提供技能与入口，不生成 Vue 应用。
- 支持 frontend 的 CLI 可用 `yss skills list --root .` 查询，`yss skills ensure yss-design-system --root .` 补装设计能力，`yss sync --root . --dry-run` 预览同步。

完整交付说明设计依据、实现范围、运行方式、工程与浏览器验证及真实接口状态。模拟运行明确待联调，未执行的检查不声称通过。无关文件与本地修改保留，提交、推送、部署和发布使用对应授权。
