# SpecDelta

Spec Delta 记录相对既有冻结 Spec 基线的 `ADDED / MODIFIED / REMOVED` 高风险行为差异，以及对应验收场景和测试映射。它保留变化的边界，完整规格、OpenAPI 与架构资产仍分别承担各自职责。

## 适用范围

`artifact.spec-delta` 属于 `stage.spec-architecture`，触发条件是已有冻结 Spec 的高风险行为变化。全新产品或全新模块不使用 Spec Delta；未命中的条件记录带原因的 `not-applicable`，不生成空文档。

差异必须能够回指原冻结基线，区分新增、修改和移除的行为，并绑定受影响验收场景及测试映射。基线正文见 [[Spec基线]]；Delta 只承接行为变化，不单独成为实现授权。

## 按影响重新路由

安全或权限变化写入普通 Spec、契约、架构、验收和测试 seam，并按实际影响触发门禁。API 变化先形成 OpenAPI 3.1 Draft，审查后 Freeze，再实现；Freeze 后的变化重新进入 API 影响分析和设计审查，见 [[OpenAPI契约]]。

UI 变化是否构成产品设计影响，取决于是否触及主流程、导航、权限体验、异常或恢复、状态流转、API 反推；文案、token、颜色、间距和无行为变化的孤立视觉修复不自动触发完整产品设计流程，见 [[产品设计影响与原型]]。

## 下游约束

OpenAPI Freeze 或无 API 影响记录后，才能把冻结范围拆成窄而可验证的 [[垂直切片Ticket]]。Spec、设计和待冻结资产使用 `ready-for-human`；只有适用门禁通过、阻塞清除且可直接实现的切片才使用 `ready-for-agent`。

实现仍须消费已批准、已持久化且当前的 [[切片实现合同]]。`seam-deferred` 必须登记风险、责任人、后续 Ticket、验证计划和目标版本或发布日期；完成结论以本轮 [[Fresh验证与独立审查]] 为依据。

## 来源

- `CONTEXT.md`：第 45、54、58–59 行。

- `AGENTS.md`：第 46、47、48、55–56、64、49、84 行。

- `.template-spec/process/lifecycle-registry.yaml`：第 314–317 行。
