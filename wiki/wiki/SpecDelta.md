# SpecDelta

Spec Delta 只记录相对既有冻结 [[Spec基线]] 的 `ADDED / MODIFIED / REMOVED` 高风险行为差异，以及对应的验收场景和测试映射。它不是第二份完整 Spec，也不替代 OpenAPI 或架构资产。

触发面很窄。全新产品、全新模块和低风险调整不生成 Spec Delta。生命周期产物 `artifact.spec-delta` 的触发条件是「已有冻结 Spec 的高风险行为变化」，归属 `stage.spec-architecture`。未命中时按 [[条件强制门禁]] 与 [[影响面分诊与流程裁剪]] 记录 `not-applicable` 及原因，不写空 Delta。明确改变认证或授权行为时，把差异当作普通行为写入本 Delta，不另开专项 Delta。

模板 `docs/templates/spec-delta-template.md` 用三列差异表达行为，不引入 OpenSpec CLI 或额外状态机。`ADDED` 是新增用户可见行为、API 行为、状态、权限或数据约束；`MODIFIED` 是已有行为的输入、输出、状态流、权限、错误结构、兼容性或验收标准变化；`REMOVED` 是删除或废弃已有行为、字段、入口、权限、状态或兼容路径。变更摘要还要挂相关 OpenAPI Draft / Freeze、架构 / 设计审查和 Ticket / 切片。

受影响范围按维度勾选：UI / 页面 / 交互状态，API / OpenAPI schema / 错误结构，权限 / 认证 / 授权，状态机 / 业务流程，数据模型 / Repository / 查询索引，外部系统 / 跨端协作，发布 / 回滚 / 运维，风险 / 人审点。UI 勾选不等于自动构成 [[产品设计影响与原型]]；只有主流程、导航、权限体验、异常 / 恢复、状态流转或 API 反推才需要页面流和原型校准。API 勾选后必须走 [[OpenAPI契约]] 的 Draft → 审查 → Freeze，Freeze 后变更仍要回到 API 影响分析和设计审查。

验收场景（`SD-001` 起）映射到测试与 fresh verification：单元 / 契约 / E2E / 手工验证，并记录命令、证据路径和 `planned / passed / blocked`。这直接支撑后续 [[垂直切片Ticket]] 的验收与测试 seam，也进入 [[Fresh验证与独立审查]]。结论栏只回答是否允许进入 OpenAPI Freeze / no API impact、是否允许进入 `to-tickets`、必须带入垂直切片的约束，以及 Git checkpoint 状态；`to-tickets` 仍只是兼容入口。

## 来源

- `CONTEXT.md`
- `AGENTS.md`
- `docs/templates/spec-delta-template.md`
- `docs/process/lifecycle-registry.yaml`
- `docs/templates/spec-template.md`
