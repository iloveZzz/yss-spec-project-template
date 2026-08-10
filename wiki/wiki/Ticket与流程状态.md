# Ticket 与流程状态

Ticket 是在追踪平台上承载功能生命周期或可实现工作单元的通用追踪对象；GitHub Issues / GitLab Issues 是具体平台对象名称，领域资产统一称为 Ticket。

每个功能先建立功能父 Ticket，用于汇总 Spec、设计、审查、OpenAPI Freeze、阻塞项和阶段证据（见 [[Spec基线]]、[[OpenAPI契约]]、[[条件强制门禁]]）。功能父 Ticket 不作为 Agent 直接实现的垂直切片；可独立验证的实现单元是垂直切片 Ticket（见 [[垂直切片Ticket]]）。

流程状态规则：Spec 初稿、产品设计、原型、OpenAPI Draft 和待冻结资产使用 `ready-for-human`；只有通过必要门禁、阻塞边已清除并具备直接实现条件的垂直切片 Ticket 才能使用 `ready-for-agent`。`ready-for-human` 不表示可以直接进入实现；`ready-for-agent` 不得用于 Spec 初稿、原型、OpenAPI Draft 或其他未冻结资产。

Ticket、Spec 和阶段证据必须按用户选择或当前主远程路由到 GitHub / GitLab；平台不可用时生成本地待发布草案，不自动改投其他平台（见 [[实现仓库与跨仓库契约]]）。平台规则与五态标签见 `docs/agents/issue-tracker.md` 与 `docs/agents/triage-labels.md`。连续自动推进期间累积的 Ticket 证据在人工暂停、handoff、进入实现、合并或发布边界集中同步范围、验证证据、风险、人工审查点和下一步。
