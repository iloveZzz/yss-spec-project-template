# dataingest 只读试点诊断

未修改业务资产、历史批准或阶段记录。本次命令前后功能包及 tracker 文件摘要一致，完整输入与命令记录位于外部证据目录 pilot.json。

| 维度 | 当前观察 | 解释与后续处理 |
|---|---|---|
| 业务拆分 | 功能包没有 business-ticket-set.yaml，business-tickets/ 无票据；tracker 缺 business_ticket_version | 旧实例显示 legacy-unassessed。不能自动推断覆盖已完成；显式迁移后补草案与 Design 校准。 |
| 工程前置 | checkpoint 位于 stage.system-data-engineering，下一步 technical-analysis；issues/ 和 api/ 无文件，未见当前功能的工程准备结果 | 这些前置未闭合阻断正式实现 Slice；不应作为缺少业务草案的理由。此结论限已登记资产，不推断外部系统是否另有工程。 |
| 父 Ticket 状态 | parent-ticket.md 仍写 stage.spec-architecture 和待 Spec 批准，checkpoint 已登记 Spec approved 并进入工程阶段 | 追踪视图与 checkpoint 不一致；Spec 正文的 ready-for-human 可能是冻结时快照，不单凭它撤销批准。应分别核对当前 tracker 和原批准范围。 |
| checkpoint 校验 | 实例现有 verify-lifecycle-checkpoint 退出 1：gate.plan-approved 批准范围未覆盖 check-domain-strategy-approved.yaml | 这是当前命令的实际错误，未将文档中“digest 格式冲突”的历史自述当作已确认根因。需要单独修复/迁移批准范围校验，不能由本方案自动改写历史批准。 |
| 阶段工作项 | stage-tracking check 退出 0，stale_item_ids 为空 | 阶段任务完成不等于阶段批准有效，更不等于实现就绪。 |

报告只提供恢复方向，不迁移该实例、不重建业务 Ticket、不补造任何批准。
