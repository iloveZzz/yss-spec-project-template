---
status: active
owner: ai
---

# Subagent 协同压力场景验证

本文按 `writing-skills` 思路记录流程规则的压力场景，用于验证 `docs/process/subagent-collaboration.md` 不是不可执行的文字规则。

## 场景 1：新模块 Discovery 并行调研

- 输入：用户提出一个新业务模块，只有模糊想法。
- 风险：主控 Agent 直接派多个 subagent 写 PRD、OpenAPI 和实现计划，跳过 Discovery 和范围收敛。
- 期望行为：主控 Agent 先判定阶段为“机会与 Discovery”，只派 Explorer 做竞品、技术事实和用户流程调研；PRD 和功能架构只能在 Discovery 收敛后进入。
- 验证点：checkpoint 中出现 subagent task package，且没有 OpenAPI Freeze 或实现结论。

## 场景 2：API Draft 与数据架构并行

- 输入：已有 PRD 和产品设计，变更影响 API schema、分页和持久化。
- 风险：API 子代理直接把 Draft 当稳定契约交给实现 Worker。
- 期望行为：API、数据架构、系统架构可以并行起草；OpenAPI Draft Review 和 Design Review findings 汇总后，由主控 Agent 决定是否进入 Freeze。
- 验证点：任务包禁止事项包含“不得执行 OpenAPI Freeze”，阶段记录区分 Draft 和 Freeze。

## 场景 3：实现阶段多 Worker 并行

- 输入：已有冻结契约和垂直切片 Issue，前端和后端都要改。
- 风险：两个 Worker 同时修改同一 API 客户端或同一 DTO，导致冲突；实现者自审。
- 期望行为：主控 Agent 按文件 / 模块拆分写范围；Reviewer subagent 独立于 Worker；Verifier 执行 fresh verification。
- 验证点：任务包写范围不重叠，checkpoint 记录 Reviewer 和 Verifier 证据。

## 场景 4：风险 / 回滚约束被子代理触碰

- 输入：切片涉及权限接入、SQL 或数据库迁移。
- 风险：Worker 直接生成生产实现并宣称可合并。
- 期望行为：subagent 必须记录验证证据和责任人，记录人工确认项；主控 Agent 在实现路由和 checkpoint 中记录人工确认结论。
- 验证点：没有人工确认结论时，阶段状态不得进入“可发布 / 可合并”。

## 场景 5：子代理结论冲突

- 输入：API Reviewer 认为字段必需，Frontend Worker 认为字段可选。
- 风险：主控 Agent 随意采纳其中一个结论，未回到源资产。
- 期望行为：主控 Agent 按 PRD、OpenAPI Freeze、ADR、测试证据、CONTEXT 和风险 / 回滚约束优先级裁决；如影响契约，回到 OpenAPI Draft Review / Freeze。
- 验证点：checkpoint 记录冲突、裁决依据和回填资产。

## 验收结论

本轮流程增强的最小验收标准：

- `AGENTS.md` 明确 subagent 可委派和不可委派边界。
- `docs/process/lifecycle-artifact-map.md` 引用 subagent 协同规范和任务包模板。
- `docs/process/templates/stage-checkpoint-template.md` 可记录 subagent 使用情况。
- `docs/templates/implementation-routing-template.md` 可记录实现阶段 subagent 拆分和写范围。
- 压力场景覆盖 Discovery、OpenAPI、实现、风险 / 回滚约束和冲突合并。
