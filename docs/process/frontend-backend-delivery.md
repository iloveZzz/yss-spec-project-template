# 前后端交付与联合接收

本合同适用于 `profile_id: harness.frontend-delivery`、profile 中 `frontend_delivery.required: true` 或显式绑定 `frontend_delivery` 的工作。它补充既有切片就绪和前端还原验证条件，不另起生命周期或批准入口。旧通用研发 profile 未选择该路线时维持原行为。

## 职责与先后关系

战略方维护业务规则、Spec、页面流程和视觉基线；后端维护 API 及后端交付；前端维护工程设计、页面和验收证据；统一管理方维护基线引用、跨仓切片与业务验收汇总。

前端消费需求可在上游设计时提前反馈。前端项目在战略和后端交付尚未齐备时，只能验包、诊断和回交缺口。两类输入通过接收核验后，可以准备前端工程设计、实现计划和 Slice Contract；合同获准前不得写代码。

## 后端导出与前端导入

后端每个交付包绑定一个窄业务切片。交付描述采用 `schemas/backend-delivery.schema.json`，包含战略包路径与摘要、切片规则/场景、OpenAPI operationId、冻结接口和后端 Slice Contract 的批准绑定、构建与部署身份、测试数据准备说明及验证证据。

接口和 Slice Contract 的 `digest` 均为原文件字节 SHA-256，分别由既有 `gate.openapi-frozen` 和 `gate.slice-contract-approved` 的批准记录绑定。同包携带源角色政策及所需用户决定/批准证据；接收端按源政策验证，不能只填 `status: approved`。

验证记录采用 `schemas/backend-delivery-verification.schema.json`，`subject_digest` 使用 `backendDeliveryBasis()`。实际命令、执行时间、零退出码与日志摘要必须齐备；契约验证逐条覆盖交付接口及场景的成功/失败结果。`supporting_files` 显式列出批准或用户决定的其余本地依赖；导出时通过临时源视图验证闭包，漏文件会失败。

```bash
scripts/backend-delivery export --source-root <backend> --delivery <relative-delivery.json> --output <new-directory> --zip
scripts/backend-delivery verify --bundle <directory-or-zip>
scripts/backend-delivery import --bundle <directory-or-zip> --target-root <frontend>
```

后端交付保存于 `docs/backend-deliveries/<delivery-id>/<version>/`。战略快照自动通过既有工具导入 `docs/handoffs/`；两种包各自原子落盘、重复导入幂等，同身份版本不同内容拒绝。后端接收失败后已成功导入的战略快照可以保留并在重试时复用，不自动放行工作。

目录和 ZIP 使用同一逻辑包摘要。只携带不可变文件与包内路径映射，不要求源仓或兄弟仓存在，不执行来源代码，不打包运行时凭据；目标根 `CONTEXT.md` 仍由目标维护者对账。

## 接收与启动

导入只产生 `frontend-acceptance-draft.json`，不会批准资产。接收方完成正式词汇对账并按 `schemas/frontend-delivery-acceptance.schema.json` 准备接收记录：

- `backend_delivery` 绑定后端导入收据和包摘要。
- `strategic_handoff` 绑定战略导入收据、包摘要、正式 `context_reconciliation_ref` 和全部源规则/关键场景的承接 rows。
- `frontend_cases` 绑定业务规则/场景、成功或失败结果、已交付接口、Visual Baseline `case_id` 和可读取的用例说明。
- 已规划的承接使用 `mapped`，表示已映射用例，不声称代码已实现。当前交付范围必须 mapped 到当前切片；其他范围的 pending、conflict、deferred 或 not-applicable 沿用战略逐条承接的理由、证据和依赖阻断规则。

完成接收核对后记录 `status: accepted` 并执行：

```bash
scripts/verify-frontend-delivery --root <frontend> --slice <slice-id> <relative-acceptance.json>
```

工具重新验两类包及批准、当前目标词汇、已知战略变更、最新已导入后端版本、场景映射和真实服务。成功仅返回 `inputs-verified`、`ready_for_agent: false`，供准备前端实现资产使用；`accepted` 字段本身不能证明就绪。

编译输入传入 `slice_id`、`frontend_delivery.acceptance_ref`；编译结果冻结 `frontend_delivery.digest`（接收文件字节摘要）。正式 Slice Contract 保存为 `frontend.delivery`，也可消费 `resolution.frontend_delivery`。两个位置同时出现时须相同。实施、派发和恢复从已持久化合同读取这组绑定，再实际运行校验器；旧成功输出不作为新的放行证据。

前端计划和正式验证证据绑定 `slice_id` 与 `frontend_delivery`；验证阶段另绑定 `slice_contract_ref`。Task Package 的实现任务从 `contract.slice_contract_ref` 读取绑定，准备任务使用 `slice_id` 与 `frontend_delivery`。模板维护或只读接收诊断不冒充产品实现任务。

## 真实服务检查

环境提供一个可只读探测的 JSON 版本响应，`revision_path` 和 JSON Pointer 由交付描述登记，不假定业务服务已有固定端点。响应须匹配 `deployment_id`、`source_commit`、`openapi_digest`、`artifact_digest` 和 `test_data_digest`；最后一项绑定已准备的数据说明/数据集版本。不能提供这些可核验身份时先补部署证据与探测能力。

探测使用 GET、同 origin、不跟随重定向和有界超时。受保护探测通过 `authorization_env` 指定当前执行环境提供 Authorization 值的变量名；包和输出不携带其值。

版本响应通过只证明当前服务身份可达，业务接口正确性仍依赖同基线的后端契约测试及后续真实联调。离线验包不能证明服务当前可用，也不能证明未同步源仓没有新变化。

## 变更与完成

战略变化使用现有规则/场景及设计基线的依赖失效规则。最新已导入的同身份后端交付使旧接收记录失效。不同切片采用不同后端交付身份，避免不相关切片互相阻塞。依赖未知时扩大阻断；缺口回交资产维护方，业务规则冲突回战略方。

后端可交接、前端可验收和业务切片完成分开记录。最终业务验收绑定同一战略、API、后端部署和前端版本，复用既有视觉、交互、权限/失败场景、端到端和 Fresh Verification 条件；验包不替代其中任何一项。

## 维护与验证

共享实现由当前主模板维护，通过 `scripts/sync-strategic-handoff-tools` 分发；canonical Skill 变更后生成运行时投影与 lock。新/旧模板的实例初始化与 sync 不静默转换 profile。场景入口为 `scripts/verify-frontend-delivery-scenarios`，通过临时实例和明确标注的合成测试服务验证行为，不作为具体产品的交付证据。

前端 `frontend_cases` 的 `evidence_ref` 必须同时绑定 `evidence_digest`（原始文件字节 SHA-256）。用例内容变化后须更新接收记录并重编译依赖合同。

OpenAPI Freeze 的来源门禁兼容综合模板 `gate.openapi-frozen` 与研发模板 `gate.openapi-freeze-confirmed`；仍严格校验来源角色策略及批准字节绑定，不允许其他门禁代替。每个交付范围至少包含一个带成功/失败验证的战略场景。

生命周期中的稳定入口为 `gate.frontend-delivery-inputs-verified`，定义见各自 `lifecycle-registry.yaml`；角色表将它登记为 evidence_only，实际核验仍由脚本执行，不增设人工批准，也不替代 Slice Contract 的批准门禁。
