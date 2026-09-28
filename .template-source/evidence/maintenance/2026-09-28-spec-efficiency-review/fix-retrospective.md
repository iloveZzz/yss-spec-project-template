# SPEC-1 修复与复盘

第一轮发现默认 Slice review 在丢弃已知容器 scope/common 后，只保留了写边界和 forbidden_patterns，使合法 raw v2/v3 的人工审查点、重路由触发条件及嵌套未知约束不可见。现有通用 Markdown 材料测试未覆盖专用 Slice 视图，因此原完整门禁通过仍未发现该缺口。

修复在默认 review 中直接保留已有归一化结果的完整全局约束，复用同一读取阶段。没有增加审批状态或修改合同权威字节；execution_allowed=false、approval_validity=not-checked 继续有效。两个行为回归分别读取合法 v2/v3 合同，检查人工审阅点、重路由条件、doubt_driven_review 与 context_plan 内的未知约束在 JSON 内容和 Markdown 中都可见。修复前两个新增测试失败，修复后全部七项材料测试通过，六文件针对性回归共 29 项通过。

共享工具由 scripts/sync-strategic-handoff-tools 同步三个专职 Profile，并从已提交的根与 Agent 来源重建四个 CLI 快照。后续审查继续覆盖新候选的全部轴，不能沿用第一轮结论或只验证新增两项测试。

事实源补强落在 tests/contract-review-preparation.test.mjs。既有 contract-reading.md 的约束保留要求无需重复改写。完整门禁证据见 full-verification-r2/report.json，第二轮独立结论见 reviewer-round2/review.md。真实项目效率、Token 成本及并发测试隔离没有因此获得新结论。

完整回归进一步发现旧 fixture 将整个 review 限制为原完整视图的 30%。补齐必需全局约束后该断言失败，不能通过删减约束维持历史压缩数字。修正为：完整约束须与原视图一致，摘要部分继续满足原 30% 字节预算，整体仍小于完整视图。该 fixture 不再声称含全部约束的 review 总量减少 70%，并保留失败完整日志供第二轮独立审查。联合视图与材料回归通过，日志见 review-view-budget.txt。

首次修复后的完整验证期间新增了本复盘与验证元数据，导致输入摘要漂移，失败证据保存在 r2-evidence-drift-attempt。后续最终验证冻结所有仓库输入，报告在仓库外生成；只消费无漂移的通过结果。
