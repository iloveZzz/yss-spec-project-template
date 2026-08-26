# Grok Bot Profile：<数字人角色>

> 从 `docs/agents/digital-human-roles.yaml` 复制 title / description / skill 列表。不要手写第二套职责。

## Profile

| 字段 | 内容 |
|---|---|
| 数字人角色 ID | role. |
| Grok title | YAML `grok_title` |
| Description | YAML `grok_description` 全文，加上本 `project-instance` 仓库路径 |
| 兼任 | 仅主控默认兼任 `role.project-manager` |

## Skills

- 启用：YAML `core_skills`
- 保持关闭：YAML `forbidden_skills`
- 不要因为账户里看得到就把专项 skill 全部打开

## 协同

- 人默认只跟主控说话；本 Bot 接受主控任务包后再动手。
- 阶段群成员以 YAML `stage_groups` 为准，每群 2–6 人。
- 会签按 YAML `gate_policy` 写 `docs/templates/approval-record-template.yaml`。
- 权威产物写 git。Memory 只记偏好。
