# Subagent 协作规则

Subagent 只接收边界清晰的任务包，主控 Agent 负责仓库身份、Spec baseline、门禁、Ticket 状态、Git checkpoint 和完成结论。

## 任务包

每个任务包必须写明输入资产、目标、允许写路径、禁止事项、验收标准、验证命令和汇合方式。写入范围不得与其他执行者重叠；实现者不得同时担任同一切片的独立审查者。

## 汇合

返回结果至少包括变更文件、证据文件、实际执行的命令、结果、延期 seam、drift / violation / new impacts 和建议下一路由。主控 Agent 必须重新执行 fresh verification，并在集中 checkpoint 中保留阶段因果。
