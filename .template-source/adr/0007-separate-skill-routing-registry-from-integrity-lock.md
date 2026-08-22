# ADR-0007: 分离技能路由注册表与完整性锁

> 状态：部分实施（shadow）。`docs/agents/yss-skill-registry.yaml` 与校验器已存在；Router 仍以 `router-contract.yaml` 和 `skills-lock.json` 的既有职责边界运行，不得把本 ADR 作为已生效的运行时裁剪规则。

`skills-lock.json` 负责技能来源、hash 和投影完整性，而生命周期阶段、影响面、Core/Specialist 分层、成熟度、新鲜度和 Router 默认可用性属于产品路由语义。提案是在 `docs/agents/yss-skill-registry.yaml` 中维护后者，并让每个 Agent 运行时只发现一个平台投影根；canonical `.agents/skills` 继续作为内容权威，但不与平台投影同时形成同权运行时入口。Cursor 的契约投影根是 `.cursor/skills`。该分离增加了一份受校验的注册资产，却避免完整性锁不断吸收路由策略，也减少同名双入口和“能够安装即等于受支持”的歧义。当前注册表为 shadow：校验锁文件覆盖、别名和运行时根，但 Router 闭包与 Agent 发现列表仍按既有行为工作。
