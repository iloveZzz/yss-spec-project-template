# 维护独立审查校验 RED

- 日期：2026-08-31
- 实施者：`worker.create-yss-harness.2026-08-28`
- 公开 seam：`scripts/verify-maintenance-checkpoint <file>`
- 命令：`scripts/verify-maintenance-intensity-scenarios`
- 初始退出码：`1`

最小反例把仅含“正式独立审查请求”、且正文明确声明“不是审查结论”的 Markdown 登记为 `formal-independent-review: pass`。旧校验器没有读取审查证据，因此该 checkpoint 被错误接受；新增 RED 断言以 `错误 checkpoint 未被拒绝` 失败，稳定复现 B-02。
