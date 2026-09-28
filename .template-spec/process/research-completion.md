# 模板维护研究收尾

本协议由主模板生命周期持有；专职接收 profile 缺少本工作单元时，将研究包回交主模板收尾，不在接收 profile 另建阶段或宣布维护批准。

正式落盘的模板研究使用注册工作单元 `work-unit.maintenance-research`，权威路由见生命周期注册表与主控合同。它不新增阶段或批准门禁。只返回来源与结论的咨询沿用 read-only-intake v2；产品实例研究仍由原生命周期工作单元消费。

## 当前验证与完成

```sh
node scripts/verify-maintenance-research <slug>-research-brief.md <slug>-evidence.yaml --output <不存在的验证目录>
```

命令实际调用研究包校验器，保留 stdout/stderr、退出码、起止时间及简报、台账、校验器、日志的 SHA-256；返回 `binding: {ref, digest}`。不会覆盖旧目录。失败记录保留，不能用于完成。

Workflow Execution Result 在原字段之外携带 `research_verification: {ref, digest}`。`evidence_refs` 包含验证记录、简报、台账和 Context 不适用说明。`context_reconciliation.status` 为 `not-applicable` 且必须给出原因；执行阻断、drift、violation、new_impacts 和 stale_candidates 必须为空。

接收端重读绑定字节，并实际重跑当前研究校验器。通过后可以 `next_route: null` 独立结束。结构校验不证明来源中的事实，也不代替主控对重要结论的来源审计；研究报告保留反证、来源缺口和结论边界。

## 继续维护与历史记录

继续 `work-unit.ssot-update` 时，`maintenance_authorization: {ref, digest}` 指向既有用户决定协议的 requirement：`boundary: template-maintenance-scope`、明确的 `subject_ref`、包含 `work-unit.ssot-update` 的 `scope`，以及 `user_decision_ref` 或 `continuation_ref`。验证复用现有 `assertUserDecisionRequirement`，核对原始回复、展示资产与范围；这是对已有授权的绑定，不要求用户重复确认。没有维护授权仍可合法结束研究。

身份从接收仓库根清单读取，结果中的 `repository_mode` 不能改变路由。旧 `entry-triage` 研究任务和阻断记录保持原字节；重新核验后另存研究收尾任务包，并通过 `inputs` 引用旧包。新记录说明复核对象及历史范围，不冒充原 Agent 在本轮重新研究。
