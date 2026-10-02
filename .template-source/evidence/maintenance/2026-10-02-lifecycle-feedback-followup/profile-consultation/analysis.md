# 专职 Profile 友好提示的只读语义分析

任务执行态：Explorer；未编辑任何仓库文件、同步、构建或改变生命周期状态。主仓咨询 candidate 为 `0af1552c48b9a40a62a6583adc49dbbe1b3e58fe77372b3f0df2696d75c75cf1`；本报告的子 Profile 输入是从 live 复制的独立文件摘要快照，不属于该主仓捕获流。`snapshot.json` 记录 1246 个文件项，`snapshot-verification.json` 已复核 live 输入无漂移。

## 已确认缺陷：普通状态查询把战略 Profile 的下游兼容路由描述为本地主控恢复动作

来源：design `scripts/lib/lifecycle-status.mjs:40-42,84-86,184-189`；`scripts/lib/governance-io.mjs:29-39` 仅借 Profile 选择 owner contract；design `.template-spec/process/harness-profile.yaml:33-50` 明确 `work-unit.technical-analysis` 不在本地允许链且列为 forbidden；design owner contract `references/orchestration-contract.yaml:481-486` 保留此 route 但明示 `downstream:true`。

最小只读输入为合法的身份/版本、当前 `stage.plan`、登记的 `next_work_unit=work-unit.technical-analysis`，无已登记阻塞。普通查询输出退出码 0、`blockers=[]`，中文输出：

- 下一项工作：技术分析与契约冻结。
- 预期产出：OpenAPI、数据架构、Tactical DDD Check、工程基线、架构审查和 Slice 合同草案。
- 下一动作：先核验当前输入及适用门禁，再由主控恢复 技术分析与契约冻结。

同一输入调用既有 `assertStrategicCheckpointScope` 明确拒绝：`strategic-profile-work-unit: work-unit.technical-analysis`。正式验证边界仍在，当前问题是只读提示错误推荐本地恢复、与真实 Profile 约束不一致，不是已经获得执行授权。

改进：在产生 next_action、expected_output、next_step 前读取当前 Profile 的 allowed/forbidden/terminal 及 route 的 downstream 标记。越界保持原始 checkpoint，不改状态，报告本地不可恢复及所需下游接收方；可指向现有 Profile scope 验证，不能把未评估映射当新批准。将 Profile 原始字节绑定到 source_digests，避免提示依据缺失。

证据：`design-forbidden-local-route.stdout.txt`、`design-forbidden-local-route.json`、`fixture-results.json`、`run-fixtures.mjs`。

## 已确认缺陷：Profile 读取/路由错误的中文来源指向 checkpoint

frontend 临时输入中，真正的问题文件是 `.template-spec/process/harness-profile.yaml`，其中 `profile_id: harness.unrecognized`；普通中文查询退出码 1，正确阻断，但错误条目的“来源”显示 `docs/.scratch/case/checkpoint.json`，处理要求用户核对“已标明的状态来源”。因此用户会被引向错误文件。

来源：三份 `scripts/lib/governance-io.mjs:29-39` 在读取/选择 Profile owner 时抛错没有附 `lifecycle_input_ref`；`scripts/lifecycle-status:27-38` 的错误呈现使用 `error.lifecycle_input_ref ?? parsedValues.checkpoint`。需在 Profile 读取和 ID 识别分支绑定 profileRef，使用真实责任来源说明迁移/修复动作；旧 JSON failure shape 可保持兼容。

证据：`frontend-profile-error.stdout.txt`、`frontend-profile-error-result.json`、`run-profile-errors.mjs`；脚本退出码 0、实际查询退出码 1，finally 已恢复临时 Profile 文件。

## 可选优化：缺追踪时，权威工作单元仍缺少显式阶段关联

backend 的 entry → technical-design、frontend 的 entry → frontend-engineering-design、design 的 entry → plan-opportunity 三个输入，普通查询均退出 0，正确识别中文工作单元，但 `next_stage=null` 并提示阶段归属待核验。

来源：三份 `scripts/lib/lifecycle-status.mjs:69-81` 只读取 `workUnit.stage` 或相同 work-unit 的 stage_tracking.item.stage；三份 registry.work_units 均未登记 stage。当前“待核验”是安全且符合现有设计的降级，不属于错误猜阶段。

改进：在生命周期注册表 / 受控 Profile patch 中增加工作单元到阶段的显式关联并验证属于当前 Profile 允许链，逐项校验后让状态工具消费。不可按 stage 数组顺序、名字相似或 allowed_stages/allowed_work_units 列表位置推断；尤其 frontend registry 的 frontend-engineering-design 附在数组末尾，顺序并非真实入口链。旧实例继续保持当前安全降级。

证据：`*-missing-tracking.stdout.txt`、`*-missing-tracking.json`；fixture-results 对三个场景保留 argv、实际退出码及 next_step。

## 可选优化：本地终点与产品完成/下游接收的提示应具体化

三 Profile 的登记终点输入均显示“记录为已完成，仍需核验”，未把它宣称为产品完成；这一边界正确。但没有读到 Profile 的 `terminal_work_unit` / `terminal_stage` / execution.terminal_conclusion，因此统一输出“未登记下一工作单元”和“复核当前阶段验收与下一动作”，未说明战略止于交接、后端只表示后端可交接、前端只表示前端已验收及统一管理方仍需整体业务验收。

来源：status `nextStageReason` 的无 next_work_unit 分支和 `next_action` 通用分支；backend harness-profile:33-34,73-74；frontend harness-profile:31-32,68-69；design harness-profile:42-43 和 AGENTS.md 的终点边界。

改进：只读识别“已登记本地终点（证据仍待正式核验）”，明确本地交付范围和接收方。显示终点不能替代 endpoint owner 的 fresh verification、真实批准或 receiver receipt，也不能由 null 路由自动生成完成结论。

证据：`*-terminal-register.stdout.txt`、`*-terminal-register.json`。这些是 status 展示用最小输入，未声称通过完整 checkpoint Schema/批准/交付验收，不能作为交付完成证据。

## 可选优化：专职恢复提示应给出关键验证器的可执行入口

frontend profile:72-84 要求启动、恢复、编译、实现与验证时执行 `scripts/verify-frontend-delivery`；普通 status 只提供通用 `scripts/verify-lifecycle-checkpoint` 推荐，未展示联合输入复验入口或当前输入是否已绑定。backend/战略终点同样未显示专职交付验收命令。

当前通用提示明确只读且未核验执行授权，不是授权漏洞。可把专职检查作为 `not-checked` 的适用检查项和可复制 argv，绑定真实 checkpoint / delivery ref，再由现有 validator 核验；缺引用显示需登记，不拼造命令、不静默替代现有检查。不要把普通状态查询变成长耗时交付验证。

## 已核实无需重复改动

三专职 owner 的 `user_progress_report.owner` / `reference` / `writing_reference` 适配正确；引用均落在各自当前 `.template-spec/process/document-writing.md#4-进度与会签提示`，未要求不存在的根 yss-product-lifecycle 引用。三主控 Skill 的生成提示段已包含完整用户进度要求，专业职责和本地终点也已有文字约束。问题集中在 status 对这些语义事实的消费，而非字节同步。

## 实际运行

`node /tmp/yss-lifecycle-followup-profile-audit/run-fixtures.mjs` 退出码 0。脚本运行 7 个 normal JSON + text 状态 fixture，另外直接调用战略 scope checker 做反证；每个子命令退出码见 fixture-results。全部在临时目录运行，无源仓写入。未运行同步、pnpm pretest/prepack、fast 或正式代码审查。
