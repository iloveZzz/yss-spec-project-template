# Spec 四阶段门禁

本规则只适用于 Harness Profile 与编排政策同时声明 `stage-gates-v1` 的 Spec 实例。Backend 本端和冻结历史来源继续使用其自己的政策。

| 阶段出口 | 完成条件 | 决定方式 |
|---|---|---|
| `gate.plan-approved` | 目标、范围、业务规则和 Plan 材料完整 | 真实用户决定或有效延续 |
| `gate.spec-baseline-approved` | Spec 与适用产品设计、业务验收基线完整 | 合并为一次基线决定 |
| `gate.implementation-admitted` | 当前 Slice、写范围、工程与适用 API 条件有效 | 在已授权基线范围内自动计算 |
| `gate.delivery-accepted` | 当前实现与约定验收实际通过 | 消费真实交付验收决定 |

技术设计、API、工程接入、切片合同、设计校验和专业检查归入所属阶段材料，不分别登记批准。默认同一 Agent 自检；明确用户要求或已知外部规则要求独立复核时，绑定真实独立来源。建议记待办，未解决的要求违反、缺失证据和重要风险阻断受影响工作。

内容准备先于阶段确认。领域策略与阶段包使用 v4：`draft / ready / stale / blocked`，不含内嵌 `approval`。两个内容验证器默认 `--mode content`；该模式不要求未来批准。消费阶段时使用 `--mode stage --checkpoint <引用>`，核验当前资产确实属于该阶段。只做 Spec 的任务在第二阶段完成后停止；没有 UI 影响时记录实际不适用依据，不补空原型。直接请求独立脚手架、日常任务和普通材料分析沿原入口执行。

阶段记录 `stage-result1` 保存当前成果字节、检查输入与实际执行证据、授权来源。内部检查只允许 `passed / failed / not-applicable`，不含 `approval_ref / role_id / approver / countersigner`。checkpoint2 的 `gates` 只保存 `{record_ref, record_digest}`；检查结果从记录投影，不复制一份可修改的批准状态。

```sh
yss lifecycle decision plan --root . --checkpoint .work/<feature>/checkpoint.json --input <stage-result.json> --out <new-plan.json> --json
yss lifecycle decision apply --root . --plan <new-plan.json> --json
yss contract verify --kind stage-result --root . --file <result.json> --gate gate.plan-approved --json
yss lifecycle verify --root . --profile spec --checkpoint .work/<feature>/checkpoint.json --json
```

`plan` 只生成可审阅计划。`apply` 复算当前输入后，通过同一事务引擎写入不可覆盖的阶段版本并更新 checkpoint 引用。记录放在功能目录的 `stages/<gate-id>/<revision>/result.json`。更改合同、授权范围、写路径或依赖会使旧绑定失效；只重验受影响检查及下游依赖。范围和验收没有实质变化时复用真实决定，技术细化不产生新的人工暂停。编译合同和准备空工程不授予业务实施资格；实施必须消费当前准入。

历史 checkpoint1、approval1/2/3、角色政策及原始用户回复保持原义。普通同步不转换产品状态。显式迁移使用：

```sh
yss lifecycle decision migrate-plan --root . --checkpoint <old-checkpoint> --input <mapping.json> --out <new-plan.json> --json
```

映射精确包含 `schema_version:1`、`target_checkpoint_ref`、`source_policy_ref`、`source_policy_digest`、`stage_sources`；每个阶段来源包含 `gate_id / asset_refs / decision_refs / evidence_refs`。新 checkpoint 使用另一条同功能路径，原件保留。只有可按原政策核验、覆盖当前成果的真实决定及实际检查才复用；不足项列入计划 `unresolved_gates`，保持未批准。旧角色政策缺完整原来源时明确拒绝迁移，不补造角色或批准。

显式 Handoff v5 复用来源 Plan / Spec 阶段记录；兼容运输字段 `record_ref` 可以指向阶段记录。交接描述中的 `handoff` 引用复用 Spec 记录，不增加第五次批准。接收端按冻结来源政策核验，Backend 本端门禁不随来源改变；没有真实收据不能声明已经导入。

阶段通过及交付验收不自动授权提交、合并、发布或部署。实际 return-rate-engine 实例须在其自己的来源、资产与原始用户决定上复验，合成测试不能作为该实例的解除证据。

正式脚手架准备复用已有阶段授权或已核验的技术细化延续，不读取未来实施准入。架构选择的 `user_confirmation` 在新模式提供 `stage_record_ref` 与 `checkpoint_ref`，或 `continuation_ref`；`decision_subject_ref` 绑定去除 `user_confirmation/status/decision_inputs_digest` 并加入实际 `platform_selection` 的选择快照。生成另以 `generation_inputs_ref` 绑定具体生成输入：完整合同去除 `approval/lifecycle_approval_ref/status`；架构决定摘要按去除所有决定 `user_confirmation` 的记录规范化；`design_prerequisites.technical_design` 展开为去除自身 `digest` 的实际技术文档，将架构及相同决定输入的摘要替换为上述规范摘要；移除旧 `engineering_contract_approval_ref`。`lifecycle_approval_ref` 引用覆盖此快照的既有阶段或有效延续。原生消费者精确比较项目、平台、模块、路径及依据；当前原始字节和平台资格仍单独校验。快照不含指向自身授权的摘要，避免登记循环。

适用 UI 的 Spec 阶段以 `kind: prototype-verification-inputs` 成员提供 `case_ids` 和 `preview`（既有 H1/H2 预览配置），原生复用离线树、资源、实际浏览回执及用例覆盖校验；两项原型检查必须绑定此成员。无 UI 时绑定真实影响评估并填写不适用原因。一致性检查必须绑定当前 Spec 和唯一业务票集合，并消费业务票 draft 内容校验。
