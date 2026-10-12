## 专业审查与恢复

按本 profile 的角色事实表编译正式 v1 `review_context` / `review_skills`，仅 Reviewer / Verifier 可加载补充能力；核心、禁止技能和端范围保持不变。能力覆盖完整的独立实例可组合检查并逐项留结论，缺能力再增加专家。`scripts/prepare-review-package` 仅起草 pending 记录；消费当前批准用 `scripts/verify-approval-record --checkpoint <当前检查点> --require-approved <批准文件>`，v2 正式任务绑定可独立核验。历史阅读不授予执行资格，Slice 批准始终回主控。

首轮覆盖所有适用项，修复后按差异、受影响结论、行为和依赖定向复审，再绑定当前候选；未受影响项凭可读依据复用。摘要、UI、`new_impacts` 不触发全轴默认或兜底，未知先调查并阻断依赖。专业等待自主派发并继续独立工作，验证失败先修复；只在缺少真实决定、必要外部输入或动作授权时展示具体资产后询问，问题数按缺失信息确定。mandatory、外部强制审批、Fresh Verification 和历史协议显式 needs-human 不裁剪。
