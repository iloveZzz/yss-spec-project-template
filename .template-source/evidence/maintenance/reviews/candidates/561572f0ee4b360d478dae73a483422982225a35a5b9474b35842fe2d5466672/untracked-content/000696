# Grok Bot Profile：<数字人角色>

> 这是 `runtime.grok` 适配模板。角色职责仍以 `docs/agents/digital-human-roles.yaml` 为准。通用流程见 `docs/templates/digital-human-runtime-profile-template.md`。

## Profile

| 字段 | 内容 |
|---|---|
| 数字人角色 ID | `role.` |
| runtime_id | `runtime.grok` |
| Grok title | YAML `title` |
| Description | YAML `description` 全文，加上本 `project-instance` 仓库路径 |
| 兼任 | 本分支主控不默认兼任业务角色；下游完整研发模板的兼任规则不在本 profile 生效 |

## Skills

- 在 Grok **Settings → Plugins → Yours** 仅为该 Bot 启用 `core_skills`
- `forbidden_skills` 保持关闭

## Grok 约束

- 群聊 2–6 人。逻辑协作组更大时用 1:1 异步交接，不要改 YAML `stage_groups`。
- 全部 Bot 共享云计算机。写范围只写在任务包里。
- 发邮件、改生产等走 Grok Allow；不等于生命周期门禁已过。会签写 git 记录并跑 `scripts/verify-approval-record`。
