# CLAUDE.md

Agent 入口、硬门禁与禁止事项以仓库根 `AGENTS.md` 为准。每个任务先读 `yss-project.yaml` 识别仓库身份，再读 `CONTEXT.md`。本文件不另定义流程规则。

## 前端 / 后端验证命令

进入 frontend 或 backend 的实现、测试或编译时：

- 前端优先使用 `pnpm` 做依赖、测试、type-check 与构建；不要默认 `npm` / `yarn`。
- 后端优先使用项目根 `./mvnw` 做 `validate` / `test` / `package`；不要默认裸 `mvn`。
- 既有仓库确实没有 pnpm 或 Maven Wrapper 时，记录受控例外和实际命令。

登记字段与跨仓约束见 `docs/process/implementation-repo-integration.md`。
