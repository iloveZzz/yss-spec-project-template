# Subagent 协作规则

Subagent 和其它运行时实例只接收边界清晰的任务包。主控数字人负责仓库身份、门禁计算、Ticket 状态、Git checkpoint 和完成结论。数字人角色、`runtime_id` 与 Explorer / Drafter / Worker / Reviewer / Verifier 执行态正交，任务包必须同时写明。

写入范围不得与其他执行者重叠；实现者不得同时担任同一切片的独立审查者，也不得会签自己起草的资产。写隔离以任务包为准。某运行时若共享磁盘或会话，不得把不同实例当成安全边界。

## 任务包

每个任务包必须写明数字人角色 ID、`runtime_id`、执行态、从 `docs/agents/digital-human-roles.yaml` 复制的 `core_skills` / `forbidden_skills`（可用 `taskPackageDefaults`）、输入资产、目标、允许写路径、禁止事项、验收标准、验证命令和汇合方式。禁止手写第二套技能包。

## 汇合

返回结果至少包括变更文件、证据文件、实际执行的命令、结果、延期 seam、drift / violation / new impacts 和建议下一路由。主控必须重新执行 fresh verification，并在集中 checkpoint 中保留阶段因果。会签写入 `docs/.scratch/<feature>/gates/<gate-id>-approval.yaml`（形状见 `docs/templates/approval-record-template.yaml`），不能用聊天表情代替。恢复前校验 `scripts/verify-approval-record`。
