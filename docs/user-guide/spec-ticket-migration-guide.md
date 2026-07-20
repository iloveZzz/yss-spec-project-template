# Spec / Ticket 迁移指南

本文面向从旧版模板升级的仓库。新模板采用一次性破坏性迁移，不保留旧 skill 的转发别名；迁移完成后应运行 `scripts/verify-template`。

## 名称映射

| 旧入口或路径 | 新入口或路径 |
|---|---|
| `to-prd` | `to-spec` |
| `to-issues` | `to-tickets` |
| `docs/templates/prd-template.md` | `docs/templates/spec-template.md` |
| `docs/templates/vertical-slice-issue-template.md` | `docs/templates/vertical-slice-ticket-template.md` |
| `docs/requirements/issues/` | `docs/requirements/tickets/` |
| `docs/requirements/<feature>-prd.md` | `docs/requirements/<feature>-spec.md` |

旧文档中的 PRD 可继续作为历史事实保留，但新建和继续维护的规格资产应迁移为 Spec。GitHub Issues 与 GitLab Issues 仍是平台产品名称；领域工作单元统一称为 Ticket。

## 状态迁移

- Spec 初稿、产品设计、原型和 OpenAPI Draft 使用 `ready-for-human`。
- 需求与契约冻结后，先创建功能父 Ticket，再创建垂直切片子 Ticket。
- 只有必要门禁已通过、依赖已解除且可直接实现的垂直切片 Ticket 使用 `ready-for-agent`。

## 升级步骤

1. 在根目录添加 `yss-project.yaml`，明确 `repository_mode`。
2. 重命名旧规格、模板和本地任务目录，并修正 Markdown 链接。
3. 删除所有 Agent root 中的旧 skill 目录，不创建兼容别名。
4. 只在 `.agents/skills` 修改共享技能，运行 `scripts/sync-skills` 生成投影。
5. 运行 `scripts/update-skill-lock` 更新完整树哈希。
6. 运行 `scripts/verify-template`；修复全部结构、语义、压力场景和链接错误后再进入发布审查。

## 外部初始化 CLI

`create-yss-spec` 必须在初始化和升级时写入正确的 `repository_mode`，并执行等价的路径迁移与集成测试。模板仓库与 CLI 仓库未共同通过集成验证前，不得单独声明新版模板可发布。
