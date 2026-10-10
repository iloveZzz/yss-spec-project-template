# 本次推进目标与专职协作

Spec Profile 是综合研发主控，Spec 文档只是其中一个批准点。支持新政策的正式功能默认推进到 `business-accepted`；日常任务仍按普通任务交付政策执行。尚未支持该政策的旧实例保持原路线；只读默认评估不补写历史意图配置，也不扩大职责范围。

目标政策由主控合同的 `progression_target` 唯一定义。支持 `lifecycle-target-v1` 的 CLI 通过 `tracker.root` 下唯一 `map.md` 的 `checkpoint_ref` 定位功能包，在同目录保存 `progression-target.json`。它只保存目标、原始指令来源和显式消费者绑定，不保存阶段、门禁、批准、完成或下一工作单元。改变目标只更新这份意图文件，保留 checkpoint、原始批准与冻结交付包的字节。

实现工程与治理工程共用 Git 根时，目标续推仍保留原提交 tree 或 packed worktree stream 的身份和摘要。候选当前性只允许当前唯一功能的有效目标配置及其完整核验的原生目标事务材料有差异；这些材料属于意图元数据，不是批准证据。其余源码、父级构建配置、共享代码、文件库存和模式继续按原候选核验，构建仍绑定原已审查提交。工具不自动排除审查、checkpoint 或其他治理资产，也不改变项目的 Git 忽略规则。

CLI 输入草稿使用当前功能包已有且被项目忽略的 `tmp` 目录，保存计划使用仓外路径；输入仍须保留到应用结束以核验漂移。缺失目标配置不会豁免原候选中已跟踪配置文件的删除；继续时显式设置合法目标后重新核验，不能用任意事务归档绕过删除检查。

| 本次终点 | 达到依据 |
|---|---|
| `spec-approved`：Spec 批准 | 当前原始 Spec 基线批准有效，适用业务草案与 FR/AC 覆盖通过验证 |
| `product-design-completed`：产品设计完成 | 当前 Spec、命中的产品设计批准与正式业务 Ticket 通过验证；无 UI 设计影响时以当前影响依据显示设计不适用，不创建空原型 |
| `backend-deliverable`：后端可交付 | 当前工程与 Slice 批准、真实接口/实现/独立审查和构建部署证据通过验证；显式外部消费者或后端职责范围需要实际 Backend Delivery 包；不等于业务验收 |
| `frontend-accepted`：前端验收 | 当前 Slice 与交付验收批准、真实前端视觉/交互/构建和接收证据通过验证；无生产 UI 影响时显示不适用 |
| `business-accepted`：业务验收 | 主控当前 `gate.delivery-accepted`、业务场景及实际验证证据通过核验；当前批准范围中的后端、API 或数据影响还须有同功能本地后端交付或显式后端消费者的当前交付，适用前端验收及必要交接同时闭合 |

“已批准”“completed”、文件存在或上一会话的文字结论均不能建立上述完成。到达终点后停止派发下游写任务，仍保留真实 `next_work_unit`；用户明确扩大终点后，先复验当前来源、有效批准和职责，再继续尚未完成工作。只读状态和目标查询不创建资产或批准，也不授予实现权限。旧 CLI 缺能力或目标不可验证时停止受影响推进。

默认在一个 Spec 项目内由数字人分工完成设计、后端和前端。只有明确需要独立工作空间或交付责任时才接入专职 Profile：Design 完成业务设计和战略交接，Backend 完成后端交付，Frontend 完成前端验收。产品设计里程碑不等于 Design Profile 的整个战略交接终点；专职终点也不等于 Spec 主控的整个业务验收。

本地前端的设计与合同准备读取同功能当前批准输入，不创建外部 Receipt，也不等待尚未产生的后端交付。生产前端工作单元发包与正式还原验证重新读取完整 Slice：有后端、API 或数据依赖时，必须核验当前接口和本地后端交付，或显式 Backend 消费者的当前接收与交付，并对账 Spec、接口与版本；纯 UI 使用批准且当前的不适用依据。裁剪到单个前端工作单元不能删除整个切片的后端依赖。已有外部前端交付绑定继续使用 Receipt 校验，失效时不得回退到本地。正式前端计划和还原证据通过现有 `spec_ref`、`slice_contract_ref` 或明确 checkpoint 绑定当前功能，不按所在目录猜归属。

本地前端完成消费已登记的 `artifact.frontend-implementation-plan` 与 `artifact.frontend-implementation-verification`，继续使用现有 schema v2 的原始 pnpm、交互、console、图片及适用视觉还原证据。职责完成还须当前独立审查和 `check.frontend-implementation-verified`；输入资格不授予完成或执行。整体业务验收仍须当前 `gate.delivery-accepted`，不生成本地 Receipt。

原生 Backend Profile 的正式交付终点直接绑定自己的明确 checkpoint 与唯一登记 map，在功能目录保存 `backend-delivery.json`。它消费真实正式包、独立审查与当前提交，不需要 Spec 推进意图或 `plan-to-backend` 范围；本地 `local-evidence` 终点仍只用于 Spec 功能目标。

外部消费者逐项声明 `{profile, root, checkpoint_ref}`，每种 Profile 最多一项；根必须是显式绝对路径，checkpoint 必须属于同一功能。主控汇总时读取指定 checkpoint 与当前接收 Receipt，核对战略、接口、交付和实现版本，不按邻居目录、全局根或状态标签猜功能。Design 接收冻结 Spec 基线；Backend/Frontend 的实现交接消费批准的 Handoff v5 完整 delivery wrapper。新增 Backend Delivery 的 `strategic_bundle_ref` 必须指向完整不可变交付目录，裸 package 只用于历史兼容读取。

Spec 只有在显式外部实现专职消费者需要时，才派发 `work-unit.strategic-design-handoff`、登记交接资产和门禁。产品经理起草，需求经理独立审查，源角色政策声明 `business-ticket-approval-v1`；所有来源批准当前，finalize 成包且整包实际验证通过后才算源交接完成。接收回执可异步，但在本次目标要求联合交付时必须核验本功能的当前接收证据。默认本地综合流程直接消费资产，不能自导自入。

执行范围是硬上限：例如 `plan-to-backend` 可以选择 Spec、产品设计或后端终点，不能以目标配置扩大到前端或业务验收。完整 Spec 选择一次后端终点不会永久改成后端职责范围；本地核验既有后端实现与验证，不因目标自行导出战略包或自导自入。显式外部后端消费者需要的包记录定位到本功能 map 目录，实际交付仍限制在已批准后端写路径，并保留命中的产品 UI 设计门禁。业务验收与实际 merge/release 分开授权。

本地后端证据在当前验证单元登记，适用于后端目标、前端目标的适用后端依赖，以及业务验收的后端范围。当前 Slice 批准、后端实现、独立审查、契约测试与构建部署记录齐备后，按 [Backend Delivery schema](schemas/backend-delivery.schema.json) 准备 `delivery_mode: local-evidence` 的本地交付证据；不填战略包字段。完整 Spec 的这些工程目标允许同一批准切片包含前端范围，该记录只证明后端职责完成，不能代替前端验收；`plan-to-backend` 和专职 Backend 的职责上限不扩大。终点输入包含 `delivery_mode`、当前 `checkpoint_ref`、`delivery` 和 `review_state` 的 `{ref, digest}` 原字节绑定，以及 `downstream` 的 `owner`、`ticket_ref`、`verification_plan`、`target_version`。运行：

```bash
scripts/complete-backend-delivery complete --root <当前根> --checkpoint <当前checkpoint> --input <终点输入.json>
yss lifecycle target --root <当前根> --checkpoint <当前checkpoint> --json
```

工具复验当前 Slice/Spec、独立审查和已提交构建候选，只写本功能目录的 `backend-delivery.json`，保留真实 next/status 和原批准；它不导出战略或后端交付包。目标核验依然 pending 时在当前后端验证边界补证据，不能因全流程的后续 route 存在就跳过所选后端终点。专职 Backend、外部包和历史后端职责范围继续消费完整正式包，不能把本地证据作为对外交付。
