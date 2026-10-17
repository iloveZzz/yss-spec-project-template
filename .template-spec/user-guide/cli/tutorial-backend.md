# 教程：Backend

本页是[统一 CLI 操作说明](../unified-cli.md)的一部分。

## 教程：backend

```text
Profile backend
职责：消费战略交接及批准工程合同，完成后端专职交付。
日常政策启用：false

前置条件：独立新目录，或先 attach 接管已有工程；已有任务从最近可信接入点恢复。
输入材料：项目名称、当前职责对应的合同/交接材料。

  yss init --profile backend --root ./demo-backend --project-name 演示项目
  yss doctor --root ./demo-backend --json
  yss context verify --root ./demo-backend --json
  yss lifecycle query --root ./demo-backend --id work-unit.harness-entry --json
  yss assets list --root ./demo-backend --json
  yss skills list --root ./demo-backend --json

预期结果：仅安装该 Profile 支持的资源，返回实际来源与输入状态。
下一步：按以下固定 Profile 顺序继续；交接核验见 yss handoff verify --help。
失败恢复：身份、依赖或交接材料不匹配时补当前输入；未支持能力明确返回 UNPORTED。

正式生命周期（backend）
来源摘要：template=c229b7194a74b6559486c9cd642295e840767d91；registry=6fa2b28b4838182e46f5f5b0b4222382153dbe89e5ede7245e23bef5dbd54a85；profile=daf3ad0ce3ca83ee539ea10913fe2f1bf39767e17eae3b463095abb6f942b59c；policy=尚未登记
前置条件：合法项目身份，从当前任务最近可信阶段继续；阶段触发与退出条件由该 Profile 固定模板及项目当前资产核验。
输入材料：当前 checkpoint、已确认战略/Spec/合同和相应证据。路径示例使用新项目 .work；旧项目按 tracker.root 替换。以下需要当前资产的命令在材料齐备后执行。

1. Plan（战略规划）（stage.plan）
目标：确认目标、业务边界、关键规则、MVP / 非目标、优先级和交接责任，为 Spec 提供战略输入；按影响面探索并复用仍有效的结论。
  yss stage query --root ./demo-backend --id stage.plan --json
  yss stage register --root ./demo-backend --checkpoint .work/feature/checkpoint.json --items docs/work-items.json > ./demo-backend/docs/stage-plan.json
  yss stage apply --root ./demo-backend --plan-file docs/stage-plan.json --json
  工作项 JSON 与 checkpoint 由当前任务准备；重定向保存原始计划，不加 --json envelope。Plan 撰写和批准由对应 Skill/负责人完成。
预期结果：查询/核验当前输入与适用条件。
下一步条件：命中的战略与阶段决策检查通过，用户统一批准当前 Plan；影响业务边界、关键规则或 MVP 的问题已解决，其他未决项有责任人和解决时点；下游可进入 Spec，不代表可实现。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

2. Spec / 功能架构（stage.spec-architecture）
目标：固化解决方案和功能边界。
  yss stage query --root ./demo-backend --id stage.spec-architecture --json
  yss stage update --root ./demo-backend --checkpoint .work/feature/checkpoint.json --items docs/work-items.json > ./demo-backend/docs/stage-plan-next.json
  yss lifecycle verify --root ./demo-backend --checkpoint .work/feature/checkpoint.json --json --diagnostics
  更新计划经审阅后使用 stage apply；Spec 由批准的战略输入承接。
预期结果：查询/核验当前输入与适用条件。
下一步条件：Spec 基线和功能边界可审查。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

3. Harness 入口（stage.harness-entry）
目标：校验仓库身份、上游输入、影响面和实现仓库上下文。
  yss stage query --root ./demo-backend --id stage.harness-entry --json
  yss doctor --root ./demo-backend --json
  yss context verify --root ./demo-backend --json
  yss lifecycle query --root ./demo-backend --id work-unit.harness-entry --json
预期结果：查询/核验当前输入与适用条件。
下一步条件：上游输入版本当前，影响面、项目根、分支、写入范围和验证命令可解释。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

4. 技术设计（stage.technical-design）
目标：按已确认的 DDD 或 MVC 架构把批准需求细化为可实现、可验证的设计。
  yss stage query --root ./demo-backend --id stage.technical-design --json
  yss handoff verify --root ./demo-backend --kind package --package docs/handoff --json --diagnostics
  yss lifecycle status --root ./demo-backend --checkpoint .work/feature/checkpoint.yaml --json
  消费当前上游接收与工程约束；适用的技术设计 Skill 及负责人完成设计、独立审查和批准。输入通过不授予实现资格。
预期结果：查询/核验当前输入与适用条件。
下一步条件：新建后端的架构与精确 Spring Boot 版本已由用户确认，既有工程已核验并复用登记架构与实际版本；后端 Technical Design Contract 已批准且当前；数据影响为真时数据架构已批准，否则有可核验的不适用记录；gate.engineering-contract-approved 已通过。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

5. 实现仓库准备（stage.implementation-repository-preparation）
目标：在已批准的技术/数据设计之后接入既有仓库或生成纯机械后端骨架。
  yss stage query --root ./demo-backend --id stage.implementation-repository-preparation --json
  yss contract verify --root ./demo-backend --kind scaffold --file docs/scaffold.json --json --diagnostics
  由工程接入或脚手架 Skill 在批准且当前的工程合同下接入真实实现仓；先核对 Scaffold/Preparation 证据。
预期结果：查询/核验当前输入与适用条件。
下一步条件：Implementation Repository Preparation Result v2 当前且通过；新生成仅使用 Scaffold Contract/Manifest v4，历史 v3 已完成恢复对账。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

6. Slice Contract（stage.slice-contract）
目标：将战术设计和冻结契约编译为一个跨前后端测试的实现合同。
  yss stage query --root ./demo-backend --id stage.slice-contract --json
  yss contract verify --root ./demo-backend --kind slice --file docs/contract.json --checkpoint .work/feature/checkpoint.yaml --json --diagnostics
  消费批准且当前的 Slice 合同、条件化交接与工程输入；编译器不创建批准。
预期结果：查询/核验当前输入与适用条件。
下一步条件：合同版本当前、四个角色分区完整、写路径和验证命令明确，且就绪公式满足。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

7. 垂直切片实现（stage.slice-implementation）
目标：由前端、后端和测试 Agent 按同一合同并行实现和验证。
  yss stage query --root ./demo-backend --id stage.slice-implementation --json
  yss skills list --root ./demo-backend --json
  yss lifecycle status --root ./demo-backend --checkpoint .work/feature/checkpoint.yaml --json
  仅按批准合同的写范围实现；需要的 Skill 闭包来自当前合同。后端优先根 ./mvnw（前端实现由独立前端规格与 CLI 维护）；记录真实测试并由独立审查者审查。
预期结果：查询/核验当前输入与适用条件。
下一步条件：行为实现、测试证据、契约一致性和写入边界均满足合同。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

8. 独立验证（stage.verification）
目标：由测试 Agent 以独立执行态完成 Fresh Verification 和合并前复核。
  yss stage query --root ./demo-backend --id stage.verification --json
  yss evidence verify --root ./demo-backend --kind verification --file docs/verification.json --json --diagnostics
  yss project-ci verify --root ./demo-backend --base "<已确认40位SHA>" --runtime-store off --json
  yss lifecycle verify --root ./demo-backend --checkpoint .work/feature/checkpoint.yaml --json
  核验消费已有证据；真实发布、推送与外部动作消费相应授权，复盘保留实际结论。
预期结果：查询/核验当前输入与适用条件。
下一步条件：所有命中门禁通过，阻塞信号清空，证据可读且 checkpoint 可追溯。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。


```
