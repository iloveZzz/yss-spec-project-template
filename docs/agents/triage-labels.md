# Triage Labels

> 中文说明：本文定义 Agent 分诊时使用的标准五态标签。无论 skill 内部使用什么描述，落到 GitHub Issue 时都应映射为这里列出的标签。

The engineering skills use five canonical triage roles. This file maps those roles to the label strings used in this repo's issue tracker.

| Canonical role | Tracker label | Meaning |
|---|---|---|
| `needs-triage` | `needs-triage` | Maintainer needs to evaluate this issue |
| `needs-info` | `needs-info` | Waiting on reporter for more information |
| `ready-for-agent` | `ready-for-agent` | Fully specified and ready for an AFK agent |
| `ready-for-human` | `ready-for-human` | Requires human implementation, judgment, or privileged access |
| `wontfix` | `wontfix` | Will not be actioned |

When a skill mentions a role, use the corresponding tracker label from this table.
