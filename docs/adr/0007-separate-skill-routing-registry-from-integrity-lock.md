# ADR-0007: 分离技能路由注册表与完整性锁

> 状态：proposed。`docs/agents/yss-skill-registry.yaml`、schema、Router 消费与校验尚未实现；当前 Router 仍以 `router-contract.yaml` 和 `skills-lock.json` 的既有职责边界运行，不得把本 ADR 作为已生效的运行时入口规则。

`skills-lock.json` 负责技能来源、hash 和投影完整性，而生命周期阶段、影响面、Core/Specialist 分层、成熟度、新鲜度和 Router 默认可用性属于产品路由语义。提案是在后续 Phase 于 `docs/agents/yss-skill-registry.yaml` 中维护后者，并让每个 Agent 运行时只发现一个平台投影根；canonical `.agents/skills` 继续作为内容权威，但不与平台投影同时形成同权运行时入口。该分离增加了一份受 schema 校验的注册资产，却避免完整性锁不断吸收路由策略，也减少同名双入口和“能够安装即等于受支持”的歧义；在注册资产和 Router 消费尚未交付时，不能把该分离视为既有事实。
