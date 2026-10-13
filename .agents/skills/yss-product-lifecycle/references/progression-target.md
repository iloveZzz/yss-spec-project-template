# 推进到指定里程碑

读取当前合同 `progression_target` 与项目推进目标协议 `.template-spec/process/lifecycle-progression.md`。该能力只约束正式功能本次行动，不改变生命周期状态、职责范围或批准权。

1. 从 `tracker.root` 内唯一 `map.md.checkpoint_ref` 绑定同一功能。新建正式 Spec 功能默认 `business-accepted`；缺此政策的旧实例保持原路线，显式同步新政策后可只读评估默认终点，均不补写历史意图配置。
2. 指令明确终点后由支持 `lifecycle-target-v1` 的固定 CLI 生成可审阅计划并事务应用意图配置。目标变更保持真实 next 和批准/冻结包字节。
3. 派发、生成、恢复前运行只读 `yss lifecycle target --root <当前根> --checkpoint <明确checkpoint> --json`。核验固定二进制、实际退出 0、原始输入摘要与同 root/feature/checkpoint/target 绑定。到达目标停止后续写入；缺能力、范围越界或证据失效停止受影响动作。仍须全部既有准入、独立审查和真实授权。
4. 产品设计无影响时报告不适用及当前证据；专职 Profile 终点单独报告。只有显式同功能 checkpoint 与当前 Receipt 才参与主控汇总。
5. 外部 Backend/Frontend 消费者才触发条件战略交接；本地直接消费现有资产。不得把配置加入批准主体、交付证据或冻结包闭包。

业务验收按当前批准的影响评估核验实现证据。存在后端、API 或数据影响时，必须核验同功能的本地后端交付证据，或显式后端消费者的当前接收及交付；战略包验证不能代替适用的实现、独立审查和构建部署验证。影响范围不明确时继续核验，不能报整体完成。

本地工程目标（`backend-deliverable` 或 `business-accepted`）的批准范围需要后端交付时，后端实现、独立审查和真实构建部署证据通过后，在当前验证单元准备带 `delivery_mode: local-evidence` 的终点输入并运行 `scripts/complete-backend-delivery complete --root <当前根> --checkpoint <当前checkpoint> --input <终点输入.json>`，随后复跑只读目标核验。输入协议见推进目标协议 `.template-spec/process/lifecycle-progression.md`；工具只在本功能 map 目录登记后端证据，不改 next/status、不导包。业务验收可消费同一前后端切片的后端证据，仍须单独闭合适用的前端验收；完整 Spec 的短目标保留同一混合切片的原批准；`plan-to-backend` 与后端专职路线仍保持后端职责上限。缺证据时在当前验证边界补齐。

自然语言示例：“先推进到 Spec 批准，保留后续路线”；“继续同一功能到产品设计完成，复用仍当前的 Spec 批准”；“设计已完成，推进到后端可交付”；“绑定这些专职项目的同功能 checkpoint 与接收回执，继续到业务验收”。
