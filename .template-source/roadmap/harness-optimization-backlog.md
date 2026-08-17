# Harness 优化积压

本文件只记录可验证的 Harness 改进方向，不替代生命周期事实源或 Ticket。
状态取值为 `planned`、`in-progress`、`verified`、`closed` 或 `blocked`。
只有所有项目均为 `closed` 且具备证据时，才可以从工作树移除；Git 历史继续作为归档来源。

| 项目 | 状态 | 触发信号 | 验收证据 |
|---|---|---|---|
| 跨仓库快照一致性 | in-progress | 模板与 CLI manifest 漂移 | 固定 commit 联调、tree hash、解包测试；待本轮新快照验证 |
| 迁移回滚演练 | in-progress | 旧路径存在目标冲突 | dry-run 计划、外部备份、失败回滚记录；待新快照下复核 |
| 门禁可观测性 | in-progress | 验证失败原因难以定位 | 命令输出包含阶段、路径、恢复动作；待索引化门禁完成后复核 |
