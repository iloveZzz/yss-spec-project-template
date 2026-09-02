# YSS UI 前端 Skills 集成合同

本模板以 `iloveZzz/yss-ui` 的 `packages/skills` 为上游来源，以 `.agents/skills/.yss-skills-manifest.json` 冻结来源 revision、包版本、目录映射和上游树哈希。`.agents/skills` 仍是模板内跨 Agent 共享内容的唯一权威目录；其他 Agent root 只接收生成投影。

## 范围

- 只集成 yss-ui `skills.config.json` 中 `categories.app` 的业务项目 skills，并排除后端 `java-backend-commit`，当前共 22 个。
- `categories.library` 的 10 个组件库内部维护 skills 全部不进入模板；该分组同时位于上游 `excludeFromDefaultSync`。
- `api-integration`、`page-module-development`、`use-table-height`、`use-tree-height` 在模板中分别映射为 `yss-api-integration`、`yss-page-module-development`、`yss-use-table-height`、`yss-use-tree-height`，旧名称只作为 registry alias。
- `java-backend-commit` 明确不属于本合同；其内容、路由与锁定信息不随本前端同步更新。
- 允许模板基于生命周期、组件路由和证据门禁做受控适配；适配后的 `effectiveHash` 与上游 `upstreamHash` 同时进入 `skills-lock.json`。

## 更新步骤

1. 在临时 checkout 中确认 `iloveZzz/yss-ui` 的目标 revision，并更新 `.agents/skills/.yss-skills-manifest.json`。
2. 将新增或替换内容只写入 `.agents/skills/<canonical-name>`，不得直接编辑平台投影。
3. 新增 skill 使用 `scripts/update-skill-lock --add=<canonical-name>` 显式登记。
4. 运行 `scripts/sync-skills` 与 `scripts/update-skill-lock`。
5. 使用 `scripts/verify-upstream-skill-source --source=iloveZzz/yss-ui --source-root=<checkout>` 验证 revision、清单和树哈希。
6. 执行 `scripts/verify-template-fast`；首次冻结或正式发布前执行 `scripts/verify-template`。

## MCP

项目级 MCP 配置路径和容器字段同样由 manifest 固定，配置内容必须使用 `npx -y @yss-ui/mcp`。需要全局配置的运行时只提供人工安装说明，模板不得自动修改用户主目录。
