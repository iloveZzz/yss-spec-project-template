# Spec Delta

Spec Delta 记录相对既有冻结 Spec 基线的 `ADDED / MODIFIED / REMOVED` 行为、验收场景和测试映射，用于表达冻结后的变更影响。

触发条件：只对既有冻结 Spec 基线的高风险行为差异生成 Spec Delta。全新产品、全新模块和低风险调整不生成 Spec Delta，也不替代完整 Spec、OpenAPI 或架构资产。当变更需要重新校准产品设计、契约或测试映射时，Spec Delta 作为变更载体进入评审流程（见 [[Spec基线]]）。

Spec Delta 与 [[OpenAPI契约]] 的变更管理呼应：OpenAPI Freeze 后的契约变更必须回到 API 影响分析和设计审查。Spec Delta 中的测试映射与验收场景直接支撑 [[垂直切片Ticket]] 的拆分与验证。

生成与维护 Spec Delta 是条件强制门禁的一部分：命中冻结基线变更触发条件时必须完成，未命中时记录 `not-applicable` 及原因（见 [[条件强制门禁]] 与 [[影响面分诊与流程裁剪]]）。
