# 独立 Design 承接已批准 Spec

`profile_guidance` 只提供下游 Profile 建议。Spec 默认可以继续当前完整生命周期；用户明确选择独立 Design 后，准备独立目录并初始化 Design，源工程保持原职责。

使用支持 `spec-baseline-v1` 的原生 `yss handoff export/import/verify --kind spec-baseline`。持久导入必须先保存 native Go plan，再按该 plan 经事务 apply；目标变化先重新计划。模板 `scripts/spec-baseline verify --root <Design> --checkpoint <目标引用>` 或 `--bundle <包目录>` 仅作只读核验，合成 fixture 的构造函数不能接入真实业务工程。导出只接受原生 Spec project-instance、当前源 Plan/Spec 批准和原始字节。目录包冻结源 checkpoint、源角色政策、审批闭包、Spec、适用战略/方案输入、业务票草案及词汇快照；不从未来阶段补造资产。

导入只接受原生 Design project-instance，保存不可变 `docs/spec-baselines/<baseline_id>/<version>/package` 与 `receipt.json`，同身份版本不同摘要拒绝覆盖。Receipt 保持 `imported-pending-context-reconciliation` 和 `ready_for_agent=false`，不承诺目标已批准。`working-set.json` 映射源引用到包内快照或可编辑业务集合/票；业务票稳定 ID、FR/AC、依赖和版本保留，重绑引用后重算原始字节摘要。

主控用自己的目标 checkpoint 绑定 `upstream_spec_baseline: {receipt_ref, receipt_digest}`，登记包内 Spec 和工作集，先完成目标 `entry-triage` 的 Context 对账。对账证据必须包含 Receipt 与包内 `source-context.snapshot.md`；目标根 `CONTEXT.md` 仍是目标词汇权威。源 checkpoint 仅在包内证明审批，不复制源 gates、用户回复或阶段完成状态为目标批准，不新增人类门禁。

共享 reader 在入口、恢复、流转、业务票正式化与最终交接重验同一 Receipt/包/源批准/目标对账。产品设计影响命中时接入目标注册的 prototype 单元；无设计影响时接入业务票正式化。Plan/Spec 前置由导入证明满足，仍须完成目标适用产品设计与业务/战略交接批准。最终 Handoff v5 的 `ui_baseline_kind: not-applicable` 仅在已批准方案的 UI 与 Frontend 影响均为 false、前端消费者路线不适用时成立，此分支不生成原型、视觉基线或产品设计批准。源 Spec 或审批证据变化需要新版本导入，不能改冻结包。

继承批准时，对账须覆盖源 checkpoint、Plan/Spec、战略/方案及业务票引用的术语，并核对源、目标词汇的实际含义；已登记为 reconciled 不能豁免含义冲突。目标形成新的本地 Plan/Spec 批准后，前置消费当前本地批准、资产字节与目标 Context，旧 Receipt 继续保留来源，不强制继承旧批准。最终交接只有仍继承的资产使用 `source_baseline`；新本地资产继续使用本地批准合同。

最终 Handoff 的继承 Plan/Spec/战略引用保留原资产字节和原批准上下文，并在 `approval_context.source_baseline` 绑定 `receipt_ref`、`receipt_digest`、`source_ref`（源 original_ref）和 `context_reconciliation_ref`。交接审批的 `record_ref` 指向包内对应源批准记录；接收者按源政策验证。原型、可编辑业务票集合及终态交接继续使用目标本地批准。下游 Profile 建议不使 Design 进入后端、前端实现或发布。
