# Subagent 协作规则

Subagent 和其它运行时实例只接收边界清晰的任务包。主控数字人负责仓库身份、门禁计算、Ticket 状态、Git checkpoint 和完成结论。数字人角色、`runtime_id` 与 Explorer / Drafter / Worker / Reviewer / Verifier 执行态正交，任务包必须同时写明。

写入范围不得与其他执行者重叠；实现者不得同时担任同一切片的独立审查者，也不得会签自己起草的资产。写隔离以任务包为准。某运行时若共享磁盘或会话，不得把不同实例当成安全边界。

## 任务包

凡主控向数字人角色或独立运行时正式派发生命周期工作单元，都必须使用 `docs/process/schemas/digital-human-task-package.schema.json` 定义的任务包，并写明 `task_id`、`work_unit_id`、`actor_id`、数字人角色 ID、`runtime_id`、执行态、工作流状态、从 `docs/agents/digital-human-roles.yaml` 复制的 `core_skills` / `forbidden_skills`（可用 `taskPackageDefaults`）、合同类型和版本、输入资产、目标、允许写路径、禁止事项、验收标准、验证命令及其实际退出码 / 执行时间 / 证据引用、下游消费者和汇合方式。`slice-implementation` 才额外绑定 Slice Implementation Contract；禁止手写第二套技能包；任务包由 `scripts/verify-digital-human-task-package` 校验，`scripts/verify-subagent-task-package` 仅为兼容入口。

## 汇合

返回结果必须符合 `workflow-execution-result-v1`，至少包括 `work_unit`、`workflow_reference`、`result`、`skill`、`changed_files` / `changed_artifacts`、`evidence_refs`、实际验证结果、`deferred_seams`、`drift`、`violation`、`new_impacts`、`stale_candidates`、`blocking_signals` 和 `next_route`。主控必须重新执行 fresh verification，并在集中 checkpoint 中保留阶段因果。会签写入 `docs/.scratch/<feature>/gates/<gate-id>-approval.yaml`（形状见 `docs/templates/approval-record-template.yaml`），不能用聊天表情代替。恢复前校验 `scripts/verify-approval-record`。
