# 数字人运行时 Profile：<数字人角色>

> 从 `docs/agents/digital-human-roles.yaml` 复制 title / description / skill。不要手写第二套职责。先选 `runtime_id`，再按该运行时适配器落地。

## 绑定

| 字段 | 内容 |
|---|---|
| 数字人角色 ID | `role.` |
| 运行时 | `runtime.generic` / `runtime.skill-projection` / `runtime.grok` / 新增适配器 |
| title | YAML `title` |
| description | YAML `description` 全文，加上本 `project-instance` 仓库路径 |
| 兼任 | 仅主控默认兼任 `role.project-manager` |

## Skills

- 启用：YAML `core_skills`（投影根从 `.agents/skills` 加载同名 skill）
- 保持关闭：YAML `forbidden_skills`
- 账户或客户端能发现更多 skill，不等于该数字人可用

## 协同

- 人默认只跟主控说话。
- 逻辑协作组以 YAML `stage_groups` 为准。
- 当前运行时若声明了 `max_collaboration_group_size` 且 `overflow=one-to-one-handoff`，超员时改 1:1，不改逻辑组。
- 会签按 YAML `gate_policy` 写 `docs/templates/approval-record-template.yaml`，填 `runtime_id`。
- 权威产物写 git。
