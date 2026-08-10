# Spec 基线

Spec 是记录用户问题、解决方案、用户故事、关键决策、验收标准和测试 seam 的产品研发规格，是进入实现前的核心契约资产。新资产统一使用 Spec 称谓，过时术语（如旧的需求规格）只在迁移指南或明确标注的旧项目上下文中保留。

新功能或较大变更先用 `grill-with-docs` 澄清需求，再用 `to-spec` 形成 Spec。只要进入 Spec 基线，必须产出产品总体设计或功能架构。Spec 初稿属于待冻结资产，使用 `ready-for-human` 状态，等待人工审查与校准（见 [[Ticket与流程状态]]）。

Spec 校准遵循流程：需求澄清 → 产品设计影响评估（见 [[产品设计影响与原型]]）→ Spec 校准与需求冻结 → 若涉及 UI 则评审低保真草图与状态矩阵 → 需要时进行高保真 HTML 原型确认 → 进入 OpenAPI Draft（见 [[OpenAPI契约]]）。

Spec 变更管理：相对既有冻结 Spec 基线的高风险行为差异通过 Spec Delta 记录（见 [[SpecDelta]]）；全新产品、全新模块和低风险调整不生成 Spec Delta。Spec 模板的权威格式见 raw 源 `spec-template.md`。冻结后的 Spec 是 [[垂直切片Ticket]] 拆分与 [[切片实现合同]] 编译的事实基础。
