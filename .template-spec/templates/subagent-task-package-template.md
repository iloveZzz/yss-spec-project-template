---
status: template
owner: ai
---

# 当前工作任务事实：<task_id>


| 事实 | 填写要求 |
|---|---|
| task_id / work_unit_id / stage_id / profile | 实际任务、当前注册单元/阶段、Spec 或 Backend |
| policy | 当前编排 ref/version/digest，由原生查询取得 |
| execution_state / workflow_status | Explorer / Drafter / Worker / Reviewer / Verifier；派发为 not-started |
| objective / acceptance | 具体行为、验收与边界 |
| inputs / input_bindings | 实际可读来源及原始字节摘要 |
| baseline | 已登记真实 Git 根、完整基线 SHA、原生 task-baseline 摘要 |
| provenance | 实际 tool/task_ref/execution_ref；稳定 identity 可得则记录，不可得写 unavailable/reason |
| expected_outputs | Drafter/Explorer 用冻结的具体产出文件，描述放 objective/acceptance |
| expected_evidence_files / verification_commands | 必要真实验证计划，派发 verification_results 为空，不填写未来退出码 |
| review_context | 适用时绑定实际候选、basis、check_ids、policy、范围及真实 review；默认 self-check |

`generateTaskPackageDefaults(undefined, overrides, {root})` 从实际输入构造新草案并查询 Go 的检查/Skills 与基线；不创建执行事实。真正持久化/派发仍通过当前 writer guard 与原生 task 校验。准备期保持 draft，正式完成或实现须当前真实决定与完整合同。

独立性只按明确要求核验不同真实上下文和冻结只读结果；不填写角色、数字人团队、固定人数或 runtime 注册。Plan 适用检查复用同一周期，结果绑定原派发快照和实际完成任务；全部有据不适用时不制造空审查任务。失效、范围扩大、撤回或实际失败停止依赖动作并保留原证据。
