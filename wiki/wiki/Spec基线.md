# Spec基线

Spec 是记录用户问题、解决方案、用户故事、关键决策、验收标准和测试 seam 的产品研发规格。新资产统一使用 Spec；过时称谓只出现在迁移指南或明确标注的旧项目上下文。它是 [[产品研发生命周期]] 进入实现前的核心需求资产，不是可以直接编码的 Ticket。

新功能或较大变更先进入 `yss-product-lifecycle` 的原生 Discovery / 需求分析工作单元；`grill-with-docs` 与 `to-spec` 只是用户显式兼容入口。Spec 基线与产品设计影响的完整判定以生命周期注册表和 [[影响面分诊与流程裁剪]] 为准，不以兼容入口替代原生工作单元。`work-unit.spec-synthesis` 的输入是已确认的 Discovery 记录和测试 seam，产出 Spec、产品总体设计和功能架构；内容完整后进入 `ready-for-human`，下游推进仍需 `gate.spec-baseline-approved`。

模板 `docs/templates/spec-template.md` 的 frontmatter 含 `pipeline`、`stage`、`status`、`owner`；`status` 默认 `ready-for-human`，`stage` 默认 `open`，`owner` 默认 `ai`。正文先挂功能父 Ticket，再写问题陈述、解决方案、用户故事、功能需求、非功能需求、验收标准（gherkin）、产品总体设计 / 功能架构、OpenAPI 影响、DDD 影响判断、测试决策、AI / 人工审查点、非目标范围和风险。Local 路径约定为 `docs/.scratch/<feature>/spec.md`，父 Ticket 为 `docs/.scratch/<feature>/parent-ticket.md`。

验收标准写可观察结果，不写实现步骤。测试决策要标明主要测试 seam、代码库中的相似测试，以及单元 / 领域行为、API / 契约、前端组件、E2E 关键路径是否必需。DDD 影响判断只做轻量检查：统一语言变化回写 `CONTEXT.md`；限界上下文变化在产品总体设计中补 Strategic DDD Check；聚合、不变量或状态机变化在系统概要设计 / 数据架构中补 Tactical DDD Check。未触发时不另开流程阶段。

存在 UI 影响时，Spec 才强制低保真页面草图、状态矩阵、高保真 HTML 原型和用户确认；否则记录 `not-applicable` 及原因。UI 影响不等于 [[产品设计影响与原型]]：只有主流程、导航、权限体验、异常 / 恢复、状态流转或 API 反推才构成产品设计影响。OpenAPI 影响在 Spec 中先勾选「无 / 需要 API 影响分析 / 需要 review-only OpenAPI Draft」，Draft 路径为 `docs/.scratch/<feature>/api/<feature>.yaml`；Draft 在 Freeze 前只供评审，见 [[OpenAPI契约]]。

Spec 初稿、产品设计和待冻结资产使用 `ready-for-human`，见 [[Ticket与流程状态]]。相对既有冻结基线的高风险行为差异才写 [[SpecDelta]]；全新产品、全新模块和低风险调整不生成 Delta。冻结后的 Spec 是 [[垂直切片Ticket]] 拆分与 [[切片实现合同]] 编译的输入，也受 [[条件强制门禁]] 约束：命中才裁决，未命中只记 `not-applicable`。入口边界见 [[Agent入口规则]]。

## 来源

- `CONTEXT.md`
- `AGENTS.md`
- `docs/templates/spec-template.md`
- `docs/process/lifecycle-registry.yaml`
- `docs/agents/issue-tracker.md`
- `docs/agents/triage-labels.md`
