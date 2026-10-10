# Fresh验证与独立审查

Fresh Verification 是当前范围的真实验证证据，包括测试命令、契约核验、关键路径检查和审查结论。「完成、可合并、可发布」须依据当前验证，历史结果或实施者自述不能放行本轮任务。

日常任务及正式产品切片的独立审查由 Reviewer 执行，实施者不能自审，Reviewer 不写实现。适用 mandatory 检查不得豁免；`violation` 修复后按影响复审。正式切片出现 `drift` 或 `new_impacts` 时使受影响合同 stale 并回编译器重新路由；日常任务发现政策排除风险时保留修改与证据并恢复正式治理。

合格 `daily` 使用同一任务的当前差异、实际测试、独立审查与适用 API 证据，由 `verify-daily` 核验；无需正式阶段或 Slice 审查包。正式切片按当前合同、工程基线和已采纳 CI 条件验证；同边界且资产 / 上游字节、校验器 / schema、参数及仓库根均未变时可复用，变化只使受影响依赖失效，当前性不明则重跑适用检查。

首轮审查覆盖全部适用检查。修复后比较候选差异，识别受影响结论、行为及依赖，定向复审并重新绑定当前候选。未受影响结论只有在可读取依据证明条件与依赖未变时才能复用；摘要变化、UI 影响或 `new_impacts` 不自动要求全部审查轴重跑，未知影响先调查。

模板维护按 `.template-source/process/maintenance-intensity.yaml` 分级；未提供触发项时默认 L2。L1 是纯文字、链接或确定性投影；L2 保留 9 类具体影响：局部规则、模板结构、非核心校验器、生命周期门禁、权限边界、生成语义、发布语义、跨仓合同与核心校验器。工单准入与流转归生命周期门禁，普通工单规则归局部规则；历史漏检保留原缺陷回归，聚合修改选择全部实际影响，候选验证按目标状态与 profile 合同执行，详见 [[模板维护流程]] 的退役标签映射。新增影响须更新分级及证据，不能把共同改变行为的修改拆成多个低等级规避 L2。

L1 至少执行相关检查；L2 提供维护者自检与本轮 Fresh Verification；普通 L2 不强制通用反例包，发布前执行完整 `scripts/verify-template`。命中权限边界、生命周期门禁或发布语义时，还需相应实际拒绝反例，运行材料写到 `maintenance:research/<本轮>/counterexamples` 并绑定日志和输入摘要。L1/L2 不自动要求独立审查或候选冻结，产品切片的门禁仍按其合同执行。

模板维护默认出口为 `implementation-ready`。自检路径的 `release-ready` 需要 release profile 及恰好一条 `scripts/verify-template` 的 final-release-verification；它只表示维护验证就绪，实际发布和外部固定版本集成仍有各自边界。显式独立审查路径须消费同一当前候选并闭合结论，审查请求不能替代通过结论。

项目测试质量基线以当前 `engineering-baseline` 的 `baseline_id / baseline_version` 定义一次，合同、执行结果、审查和发布复用同一标准；项目明确采纳才形成 CI 门禁，未定义关键流程时不能声称 E2E 全覆盖。

## Status

Outdated：旧阅读页曾引用 Domain / Application `>= 90%`、API `>= 80%`、前端组件 `>= 75%`、关键流程 `100% E2E` 的模板建议。当前主仓入口与本页已读取的现行质量合同未保存前三项统一数值，不能把旧 raw 或旧页描述当当前全局门禁。历史原文保留在本轮候选与事务恢复材料；该来源缺口关闭前，本页不推进编译证明。

发布与事实回流见 [[复盘与权威资产修订]]，状态同步见 [[Ticket与流程状态]]。

## 来源

- `AGENTS.md`：5–7、11–19、34–38 行。
- `.template-spec/process/harness-process-tailoring.md`：15–27、50–52、54–71、81–89、111–145 行。
- `.template-source/process/maintenance-intensity.yaml`：1–23 行。
- `CONTEXT.md`：67–73 行。
- `.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml`：205–226、1404–1409 行。
