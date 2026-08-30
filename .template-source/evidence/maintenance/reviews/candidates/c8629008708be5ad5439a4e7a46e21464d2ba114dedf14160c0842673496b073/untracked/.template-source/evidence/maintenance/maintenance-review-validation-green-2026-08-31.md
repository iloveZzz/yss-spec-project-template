# 维护独立审查校验 GREEN

- 日期：2026-08-31
- 命令：`scripts/verify-maintenance-intensity-scenarios`
- 退出码：`0`

校验器现会解引用审查证据。L3 新结论必须使用结构化记录并绑定非实施者 Reviewer、冻结候选字节及 SHA-256、Reviewer 任务包、审查报告和已关闭 findings；最终 checkpoint 缺少正式结论时继续失败。
