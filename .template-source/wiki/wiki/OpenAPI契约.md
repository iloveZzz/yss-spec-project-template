# OpenAPI契约

API 变化先形成 OpenAPI 3.1 Draft，完成适用审查并 Freeze 后进入实现。Draft 用于评审，Freeze 是前后端实现和契约测试可消费的稳定输入。

## Draft 与 Freeze

OpenAPI Draft 是 review-only 草案，Freeze 前不得作为前后端稳定实现契约。Draft 和其他待冻结资产使用 `ready-for-human`。OpenAPI Freeze 已通过评审；Freeze 后的变更必须回到 API 影响分析和设计审查。

API Contract Decision 以原始字节摘要绑定影响结论。有 API 影响时，绑定 Draft、Validation、独立 Review 与 Freeze；无 API 影响时，绑定评估、原因和证据。不能用空 OpenAPI 或字符串自证替代该决定。

## 工程契约中的批准

`work-unit.technical-analysis` 消费已正式化业务 Ticket 集、Spec、适用原型以及 API、数据、工程影响面，形成 OpenAPI、数据架构、按确认架构组织的技术设计、工程基线、架构审查和 Slice 合同草案。命中契约需要冻结；无 API 影响也必须有可读记录。

当前 API 检查是 `check.openapi-draft-reviewed`、`check.design-reviewed` 与 `check.openapi-frozen` 等适用内部检查。冻结准备核验待冻结版本、Draft 审查和契约绑定；`gate.engineering-contract-approved` 汇总适用专业审查、批准工程契约，并在有 API 影响时原子冻结同一 OpenAPI 版本。

API Contract Decision、Technical Design 与 Data Architecture Decision 由 `gate.engineering-contract-approved` 原子批准；检查结果是聚合门禁的输入，不能单独冒充整体批准。

## 切片与变更

OpenAPI Freeze 或无 API 影响记录完成后拆窄 [[垂直切片Ticket]]。正式实现仍需已批准、持久化且当前的 [[切片实现合同]]；实现合同编译器只起草合同，不能批准、设置 `ready-for-agent` 或宣布完成。

遇到证据缺失、未执行验证、路径越界、`drift`、`violation` 或 `new_impacts`，停止实现并重新路由。需求与页面行为的前置校准见 [[Spec基线]]、[[产品设计影响与原型]]；契约批准位置见 [[产品研发生命周期]]。

## 来源

- `AGENTS.md`：第 47、56、48、64、67 行。

- `CONTEXT.md`：第 53–54、54、55、112–114 行。

- `.template-spec/process/lifecycle-registry.yaml`：第 444–449、549–566、190–204 行。
