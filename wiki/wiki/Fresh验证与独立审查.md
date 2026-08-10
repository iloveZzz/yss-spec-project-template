# Fresh Verification 与独立审查

Fresh Verification 指完成前重新执行的验证证据，包括测试命令、契约校验、关键路径检查或人工审查结论，不等同于"之前跑过"或实现者自述。任何"完成 / 可合并 / 可发布"结论必须基于 fresh verification。

独立审查规则：实现者不能审查自己的代码。模板发布、代码切片和高风险变更必须由其他 Agent 或人工独立审查；低风险文档变更可使用显式人工 checkpoint。代码审查按双轴进行——标准符合性（是否遵循仓库文档化编码标准）与 Spec 符合性（是否匹配发起 issue / spec 的要求），由 `code-review` 技能执行（见 [[Matt技能体系]]）。

测试质量基线：模板推荐值 Domain / Application ≥ 90%、API ≥ 80%、前端组件 ≥ 75%、已明确的关键流程 100% E2E；这些只是推荐值，项目实例必须在测试策略中明确采纳或覆盖后才构成 CI 门禁（见 [[影响面分诊与流程裁剪]]）。实现证据链：核心 YSS skills 返回的 YSS Skill Execution Result 必须被 Router、生命周期编排器和独立 Reviewer 复核，实现者自报 `implemented` 不构成最终通过（见 [[切片实现合同]] 与 [[YSS路由与合同编译]]）。

Git checkpoint 与阶段边界对齐，列出本轮覆盖阶段、变更产物和 Ticket 同步状态，排除无关脏文件；只有用户已授权时才按明确范围提交或推送。
