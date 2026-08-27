# `yss-tactical-design` L3 RED 证据

本轮最小失败反例验证战术设计合同会阻断缺失不变量、API 泄漏内部聚合、上游过期、战略概念直接充当 Aggregate 和缺失一致性策略。

```text
node .agents/skills/yss-tactical-design/tests/run-scenarios.mjs
```

由于本次执行从实现开始，无法补造实现前的时间点证据；本文件记录可重放的最小反例集合，当前同一组反例在实现后按预期失败并被场景运行器捕获，退出码为 0。正式 L3 checkpoint 仍需独立审查者确认基线证据是否足够。
