# Fresh验证与独立审查

Fresh Verification 指完成前重新执行的验证证据，包括测试命令、契约校验、关键路径检查或人工审查结论。任何「完成 / 可合并 / 可发布」结论必须基于本轮 fresh verification，不接受「之前跑过」或实现者自述。注册表已废弃 `work-unit.fresh-verification` 与 `work-unit.independent-review`；当前对应证据是 `evidence.fresh-verification`。

实现者不能承担命中的独立审查。模板维护按 L1 / L2 / L3 分别使用 `self-check` / 人工 checkpoint、`focused-independent`、`formal-independent`（见 [[模板维护流程]] 与 [[影响面分诊与流程裁剪]]）。强度由 `docs/process/maintenance-intensity.yaml` 计算，未给出 trigger 时使用该策略的 `default_level`（当前为 L2）。L1 至少一项与变更直接相关的实际检查；L2 需要修改前可失败的最小反例以及本轮 fresh verification；L3 需要完整 RED、GREEN、REFACTOR、压力场景与本轮 fresh verification。模板发布、代码切片和高风险变更仍必须由其他 Agent 或人工独立审查。

`project-instance` 的独立代码审查工作单元是 `work-unit.code-review`：输入不可变候选快照、Spec、Ticket、合同和执行结果；输出 Standards、Spec、UI fidelity 三轴 Review 与 fresh verification；findings 已处理后须重新捕获候选并全量复审。旧文「代码审查双轴」已过期，不得再按标准符合性 / Spec 符合性两轴描述（见 [[Matt技能体系]]）。UI 影响切片的前端实现还原验证由独立 Reviewer 通过 UI fidelity 轴（见 [[产品设计影响与原型]]）。

测试质量基线是模板推荐值：Domain / Application `>= 90%`、API `>= 80%`、前端组件 `>= 75%`、已明确的关键流程 `100% E2E`。只有项目实例在测试策略中明确采纳或覆盖后才构成 CI 门禁；未定义关键流程清单时，不得声称其 E2E 覆盖率达到 100%。YSS Skill Execution Result 必须由 Router、生命周期编排器和独立 Reviewer 复核，实现者自报 `implemented` 不构成最终通过（见 [[切片实现合同]] 与 [[YSS路由与合同编译]]）。

`gate.release-ready` 位于 `stage.verification-release-retrospective`，触发于合并、发布或阶段完成，证据为 `evidence.fresh-verification` 与 `evidence.checkpoint-and-rollback`（见 [[条件强制门禁]]）。Git checkpoint 只包含本轮明确范围，须列出验证命令、Ticket 状态和下一步；获得用户授权后才提交或推送（见 [[Ticket与流程状态]]）。

## 来源

- `AGENTS.md`
- `CONTEXT.md`
- `docs/process/harness-process-tailoring.md`
- `docs/process/maintenance-intensity.yaml`
- `docs/process/lifecycle-registry.yaml`
