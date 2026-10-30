# 本次推进目标与专职协作

当前 Spec 四阶段协议见 [Spec 四阶段门禁](stage-gates.md)。启用 `stage-gates-v1` 时，阶段记录替代独立子批准；本页保留的旧批准格式只按其原政策读取。


Spec Profile 是综合研发主控，Spec 文档只是其中一个批准点。支持新政策的正式功能默认推进到 `business-accepted`；日常任务仍按普通任务交付政策执行。尚未支持该政策的旧实例保持原路线；只读默认评估不补写历史意图配置，也不扩大职责范围。

目标政策由主控合同的 `progression_target` 唯一定义。支持 `lifecycle-target-v1` 的 CLI 通过 `tracker.root` 下唯一 `map.md` 的 `checkpoint_ref` 定位功能包，在同目录保存 `progression-target.json`。它只保存目标、原始指令来源和显式消费者绑定，不保存阶段、门禁、批准、完成或下一工作单元。改变目标只更新这份意图文件，保留 checkpoint、原始批准与冻结交付包的字节。

实现工程与治理工程共用 Git 根时，目标续推仍保留原提交 tree 或 packed worktree stream 的身份和摘要。候选当前性只允许当前唯一功能的有效目标配置及其完整核验的原生目标事务材料有差异；这些材料属于意图元数据，不是批准证据。其余源码、父级构建配置、共享代码、文件库存和模式继续按原候选核验，构建仍绑定原已审查提交。工具不自动排除审查、checkpoint 或其他治理资产，也不改变项目的 Git 忽略规则。

CLI 输入草稿使用当前功能包已有且被项目忽略的 `tmp` 目录，保存计划使用仓外路径；输入仍须保留到应用结束以核验漂移。缺失目标配置不会豁免原候选中已跟踪配置文件的删除；继续时显式设置合法目标后重新核验，不能用任意事务归档绕过删除检查。

| 本次终点 | 达到依据 |
|---|---|
| `spec-approved`：Spec 批准 | 当前原始 Spec 基线批准有效，适用业务草案与 FR/AC 覆盖通过验证 |
| `product-design-completed`：产品设计完成 | 当前 Spec、命中的产品设计批准与正式业务 Ticket 通过验证；无 UI 设计影响时以当前影响依据显示设计不适用，不创建空原型 |
| `backend-deliverable`：后端可交付 | 当前工程与 Slice 批准、真实接口/实现、适用审查和构建部署证据通过本地验证；不等于业务验收 |
| `business-accepted`：业务验收 | 主控当前 `gate.delivery-accepted`、业务场景及实际验证证据通过核验；当前批准范围中的后端、API 或数据影响还须有同功能本地后端交付或显式后端消费者的当前交付，必要交接同时闭合 |

“已批准”“completed”、文件存在或上一会话的文字结论均不能建立上述完成。到达终点后停止派发下游写任务，仍保留真实 `next_work_unit`；用户明确扩大终点后，先复验当前来源、有效批准和职责，再继续尚未完成工作。只读状态和目标查询不创建资产或批准，也不授予实现权限。旧 CLI 缺能力或目标不可验证时停止受影响推进。

默认在同一 Spec 项目内完成需求、必要产品设计和适用后端工作。产品设计完成依据本 Spec 的当前资产、检查和批准判定。只有明确需要独立工作空间或交付责任时才接入 Backend；其交付终点不等于主控的业务验收。

原生 Backend Profile 的本地交付终点绑定自己的明确 checkpoint 与唯一登记 map，核验当前 Slice、构建部署与适用复核。旧外部后端机器验收不再支持。

历史外部消费者和 Receipt 保留原始记录；旧战略包及依赖它的外部机器验收不再支持，不能用历史状态代替当前验证。

用户明确调用 `handoff` 时，以 PR/MR 文件变更提供选定材料并在正文说明；Issue 中的 Spec 仍是权威。旧战略工作单元、离线打包和自动 finalize 已退役。普通材料读取不登记正式接收或扩大批准。

执行范围是硬上限：例如 `plan-to-backend` 可以选择 Spec、产品设计或后端终点，不能以目标配置扩大到业务验收。本地验证既有后端实现，不导出战略包；业务验收与实际 merge/release 分开授权。

本地后端证据在当前验证单元登记，适用于后端目标及业务验收的后端范围。当前 Slice 批准、后端实现、独立审查、契约测试与构建部署记录齐备后，按 [Backend Delivery schema](schemas/backend-delivery.schema.json) 准备 `delivery_mode: local-evidence` 的本地交付证据；不填战略包字段。`plan-to-backend` 和专职 Backend 的职责上限不扩大。终点输入包含 `delivery_mode`、当前 `checkpoint_ref`、`delivery` 和 `review_state` 的 `{ref, digest}` 原字节绑定，以及 `downstream` 的 `owner`、`ticket_ref`、`verification_plan`、`target_version`。运行：

```bash
scripts/complete-backend-delivery complete --root <当前根> --checkpoint <当前checkpoint> --input <终点输入.json>
yss lifecycle target --root <当前根> --checkpoint <当前checkpoint> --json
```

工具复验当前 Slice/Spec、适用复核和已提交构建候选，只写本功能目录的 `backend-delivery.json`，保留真实 next/status 和原批准；它不导出战略或后端交付包。目标核验 pending 时补齐本地证据，历史外部包不能代替当前验证。
