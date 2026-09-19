# YSS UI 前端 Skills 集成合同

本模板以 `iloveZzz/yss-ui` 的 `packages/skills` 为上游来源，以 `.agents/skills/.yss-skills-manifest.json` 冻结来源 revision、包版本、目录映射和上游树哈希。`.agents/skills` 仍是模板内跨 Agent 共享内容的唯一权威目录；其他 Agent root 只接收生成投影。

## 范围

- 从 yss-ui `skills.config.json` 的 `categories.app` 中按 YSS capability 白名单集成业务项目 skills；当前共 13 个。除后端 `java-backend-commit`、`page-module-development` 和 `prototype-page-acceptance` 外，已由统一入口或组件专项承接的 `component-selection-imports`、`page-form-module`、`page-list-module`、`page-skeleton`、`use-table-height`、`use-tree-height`、`vue3-best-practices` 也明确排除，避免上游同步重新引入。
- `categories.library` 的 10 个组件库内部维护 skills 全部不进入模板；该分组同时位于上游 `excludeFromDefaultSync`。
- `api-integration` 在模板中映射为 `yss-api-integration`。高度规则不再拥有独立 Skill：YTable/YEditTable/YTree 分别由 `ytable-usage`、`yedit-table-usage`、`ytree-usage` 持有；旧高度名称不再作为运行时 alias。
- 上游 `yss-formily` 在模板内有意适配为薄场景路由器；API、schema、联动、详情和分步规则由 `formily-*` 专项持有，差异通过 lock 的 `upstreamHash`、`effectiveHash` 与 `adaptationRef` 审计。
- 旧的本地聚合入口 `yss-components` 已退役；组件事实从 `yss-ui` 路由到具体专项或 `references/specialized-components.md`，不再恢复第二套组件规范。
- `java-backend-commit`、`page-module-development`、`prototype-page-acceptance` 明确不属于本合同；其内容、路由与锁定信息不随本前端同步更新。
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
