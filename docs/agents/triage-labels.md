# Triage 标签

本文定义 Agent 分诊时使用的五种标准角色，以及它们在当前 Ticket tracker 中对应的标签。

| 标准角色 | Tracker 标签 | 含义 |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | 等待维护者评估 Ticket |
| `needs-info` | `needs-info` | 等待报告者补充信息 |
| `ready-for-agent` | `ready-for-agent` | 必要门禁已通过、阻塞边已清除，可由 Agent 直接实现的垂直切片 Ticket |
| `ready-for-human` | `ready-for-human` | Spec、设计、契约草案或其他资产需要人工审查、判断或特权访问 |
| `wontfix` | `wontfix` | 不会处理 |

当 skill 提及某个标准角色时，使用表中对应的 Tracker 标签。
