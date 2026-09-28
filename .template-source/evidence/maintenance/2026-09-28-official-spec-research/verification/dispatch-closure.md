# 研究调度收尾边界

三个子 Agent 已交回研究资产，研究包各自结构校验通过。这里记录机器任务包的收尾限制，不代表研究内容未交付，也不是待用户批准事项。

本次使用 template-maintenance / work-unit.entry-triage 派发研究；初始 active 包均通过。将完成结果与 next_route:null 合入 resolved 包后，validateNextRoute 返回 illegal-next-route。当前表只把 entry-triage 接到产品 Plan；null 和模板 ssot-update 均拒绝。该结论只适用于本次所选工作单元和返回合同，不推断所有模板维护均不能结束。

原提交包与失败结果保留。主控规范化了 verification_results 字段（Google observed_at/log_ref、OpenAI evidence_refs 转换成任务包已有字段），未改变实际命令、退出码或时间。规范化后的 dispatch 留在 paused / blocked，blocking_signals=research-only-terminal-route-unsupported；这仅表示正式任务收尾未建模。不填虚假 Plan 路由、不修改流程源码。

建议下游先明确研究-only 的注册工作单元/终止语义，再按 repository_mode 校验入口路由；已批准产品路径继续失败关闭。验收应覆盖模板研究结束、模板维护继续、产品Plan路线、身份非法和历史任务包读取。研究/实施状态与发布状态仍分离。
