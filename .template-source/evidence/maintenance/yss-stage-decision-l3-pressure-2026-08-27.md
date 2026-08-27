# yss-stage-decision L3 压力场景证据

日期：2026-08-27

`node .agents/skills/yss-stage-decision/tests/run-scenarios.mjs` 覆盖并通过：

1. 语义方向缺少 `direction_explanation` 时阻断；
2. `Shared Kernel` 缺少批准引用时阻断；
3. Context Map 引用未知上下文时阻断；
4. 阶段决策包含 `blocker` 未决项却声明 `approved` 时阻断；
5. DDD / 阶段包的数组元素不是字符串时阻断；
6. 阶段包引用的领域战略路径、ID、版本、状态或 digest 不一致时阻断；
7. DDD 战略设计的 contexts、subdomains 或 scenarios 为空时阻断；
8. 合法 DDD 战略设计与合法阶段决策包均可通过。
