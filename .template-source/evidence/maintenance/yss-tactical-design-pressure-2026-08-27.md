# `yss-tactical-design` L3 压力场景证据

已覆盖以下阻断路径：

- 战略概念直接作为 Aggregate；
- 数据库表替代聚合边界；
- OpenAPI 暴露内部聚合；
- 状态或不变量未与行为绑定；
- 一致性策略缺失；
- 上游版本过期但仍保持可审查状态；
- Gateway 错误放在 Infrastructure；
- 复杂度升级但缺少独立文档引用；
- 技能与 `yss-domain` 实现职责重叠。

执行命令：

```text
node .agents/skills/yss-tactical-design/tests/run-scenarios.mjs
```

结果：所有压力场景通过。
