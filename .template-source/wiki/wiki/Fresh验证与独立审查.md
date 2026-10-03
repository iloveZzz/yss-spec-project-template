# Fresh验证与独立审查

Fresh Verification 是完成前实际重新执行的验证证据，包括测试命令、契约核验、关键路径检查和审查结论。「完成、可合并、可发布」须依据当前验证，历史结果或实施者自述不能放行本轮任务。

产品切片的独立审查由 Reviewer 执行，实施者不能自审，Reviewer 不写实现。适用 mandatory 检查不得豁免；`violation` 修复后重审，`drift` 或 `new_impacts` 先使合同 stale 并回编译器重新路由。

首轮审查覆盖全部适用检查。修复后比较候选差异，识别受影响结论、行为及依赖，定向复审并重新绑定当前候选。未受影响结论只有在可读取依据证明条件与依赖未变时才能复用；摘要变化、UI 影响或 `new_impacts` 不自动要求全部审查轴重跑，未知影响先调查。

模板维护按 `.template-source/process/maintenance-intensity.yaml` 分级；未提供触发项时默认 L2。L1 是纯文字、链接或确定性投影；L2 是局部规则、模板结构或非核心校验器；L3 包括生命周期门禁、Ticket 状态、权限边界、生成 / 发布语义、跨仓合同与核心校验器等影响。新增影响须更新分级及证据，不能把共同改变行为的修改拆成多个低等级规避 L3。

L1 至少执行相关检查；L2 留下修改前可失败的最小反例、维护者自检与本轮 Fresh Verification；L3 日常默认自检与本轮 Fresh Verification，发布前执行完整 `scripts/verify-template`。命中权限边界、生命周期门禁或发布语义时，还需相应实际拒绝反例，运行材料写到 `maintenance:research/<本轮>/counterexamples` 并绑定日志和输入摘要。L1/L2/L3 不自动要求独立审查或候选冻结，产品切片的门禁仍按其合同执行。

模板维护默认出口为 `implementation-ready`。自检路径的 `release-ready` 需要 release profile 及恰好一条 `scripts/verify-template` 的 final-release-verification；它只表示维护验证就绪，实际发布和外部固定版本集成仍有各自边界。显式独立审查路径须消费同一当前候选并闭合结论，审查请求不能替代通过结论。

测试质量推荐值是 Domain / Application `>= 90%`、API `>= 80%`、前端组件 `>= 75%` 与已明确关键流程的 `100% E2E`。项目实例明确采纳后才形成 CI 门禁；未定义关键流程时不声称 E2E 全覆盖。发布与事实回流见 [[复盘与权威资产修订]]，状态同步见 [[Ticket与流程状态]]。

## 来源

- `CONTEXT.md:67-73`。
- `AGENTS.md:81-89`、`AGENTS.md:96-98`。
- `.template-spec/process/harness-process-tailoring.md:15-21`、`:44-61`、`:71-102`、`:112-116`。
- `.template-source/process/maintenance-intensity.yaml:1-29`。
