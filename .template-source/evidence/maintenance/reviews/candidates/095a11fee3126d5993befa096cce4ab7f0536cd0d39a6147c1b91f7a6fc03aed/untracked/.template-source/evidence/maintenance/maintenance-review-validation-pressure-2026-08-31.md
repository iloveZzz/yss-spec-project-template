# 维护独立审查校验压力场景

- 日期：2026-08-31
- 命令：`scripts/verify-maintenance-intensity-scenarios`
- 退出码：`0`

以下反例均被拒绝：审查请求、Reviewer 与实施者相同、记录 digest 与 manifest 不一致、digest 与冻结候选字节不一致、明确“未通过/blocked/未闭合”的报告、无效 Reviewer 任务包、approved 记录携带未关闭 `violation` finding、证据路径经中间 symlink 越过仓库根。L2 聚焦审查与显式标记的历史 L3 结论保留受控兼容。
