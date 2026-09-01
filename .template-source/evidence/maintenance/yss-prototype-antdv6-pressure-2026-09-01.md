# YSS 高保真原型契约压力场景

- 日期：2026-09-01
- 命令：`scripts/verify-yss-prototype-contract-scenarios`
- 结果：通过。
- 已覆盖反例：starter 缺少 antd、缺少 pnpm lockfile、目标与实际 antd 版本错配、包管理器漂移到 npm、原型路径越界、缺少 `visual_semantic_mapping`、复制 React-only API、缺少对比度证据、QA 路径错误、证据版本错配、存在未关闭 blockers。
- 结论：关键冲突与静默降级路径均 fail closed。
