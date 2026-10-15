# 教程：Design

本页是[统一 CLI 操作说明](../unified-cli.md)的一部分。

## 教程：design

```text
Profile design
职责：产品与业务设计；技术设计由前后端工程路线承担。
日常政策启用：false

前置条件：独立新目录，或先 attach 接管已有工程；已有任务从最近可信接入点恢复。
输入材料：项目名称、当前职责对应的合同/交接材料。

  yss init --profile design --root ./demo-design --project-name 演示项目
  yss doctor --root ./demo-design --json
  yss context verify --root ./demo-design --json
  yss lifecycle query --root ./demo-design --id work-unit.entry-triage --json
  yss assets list --root ./demo-design --json
  yss skills list --root ./demo-design --json

预期结果：仅安装该 Profile 支持的资源，返回实际来源与输入状态。
下一步：按以下固定 Profile 顺序继续；交接核验见 yss handoff verify --help。
失败恢复：身份、依赖或交接材料不匹配时补当前输入；未支持能力明确返回 UNPORTED。

正式生命周期（design）
来源摘要：template=9c17657857002fb7fd9591151e1f1e6c2691b3fb；registry=78be460bcee78a5325f36c8f3c4b2c1454ab7821fea456eab4fefb0b73df3220；profile=581e38f7bc9c75f4ffc832ccbb7a8458d29060efb7bd0ea390514936847e1fe0；policy=尚未登记
前置条件：合法项目身份，从当前任务最近可信阶段继续；阶段触发与退出条件由该 Profile 固定模板及项目当前资产核验。
输入材料：当前 checkpoint、已确认战略/Spec/合同和相应证据。路径示例使用新项目 .work；旧项目按 tracker.root 替换。以下需要当前资产的命令在材料齐备后执行。

1. 入口分诊（stage.entry-triage）
目标：确认仓库身份、问题范围和影响面。
  yss stage query --root ./demo-design --id stage.entry-triage --json
  yss doctor --root ./demo-design --json
  yss context verify --root ./demo-design --json
  yss lifecycle query --root ./demo-design --id work-unit.entry-triage --json
预期结果：查询/核验当前输入与适用条件。
下一步条件：yss-project.yaml 合法，影响面和最近可信阶段可解释。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

2. Plan（战略规划）（stage.plan）
目标：确认目标、业务边界、关键规则、MVP / 非目标、优先级和交接责任，为 Spec 提供战略输入；按影响面探索并复用仍有效的结论。
  yss stage query --root ./demo-design --id stage.plan --json
  yss stage register --root ./demo-design --checkpoint .work/feature/checkpoint.json --items docs/work-items.json > ./demo-design/docs/stage-plan.json
  yss stage apply --root ./demo-design --plan-file docs/stage-plan.json --json
  工作项 JSON 与 checkpoint 由当前任务准备；重定向保存原始计划，不加 --json envelope。Plan 撰写和批准由对应 Skill/负责人完成。
预期结果：查询/核验当前输入与适用条件。
下一步条件：命中的业务边界与阶段决策检查通过，用户统一批准当前 Plan；关键问题已解决，非关键项有责任人、解决时点和接收方；下游可进入 Spec，不代表可实现。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

3. Spec / 功能架构（stage.spec-architecture）
目标：固化解决方案和功能边界。
  yss stage query --root ./demo-design --id stage.spec-architecture --json
  yss stage update --root ./demo-design --checkpoint .work/feature/checkpoint.json --items docs/work-items.json > ./demo-design/docs/stage-plan-next.json
  yss lifecycle verify --root ./demo-design --checkpoint .work/feature/checkpoint.json --json --diagnostics
  更新计划经审阅后使用 stage apply；Spec 由批准的战略输入承接。
预期结果：查询/核验当前输入与适用条件。
下一步条件：Spec 基线和功能边界可审查。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

4. 产品设计（stage.product-design）
目标：在存在产品设计影响时校准页面流和状态。
  yss stage query --root ./demo-design --id stage.product-design --json
  yss assets list --root ./demo-design --json
  yss lifecycle status --root ./demo-design --checkpoint .work/feature/checkpoint.yaml --json
  仅命中产品设计影响时使用原型与设计技能；未命中项按权威条件说明适用性。
预期结果：查询/核验当前输入与适用条件。
下一步条件：命中的设计门禁通过；未命中项记录 not-applicable 及原因。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

5. Ticket 正式化（stage.ticket-formalization）
目标：在既有功能追踪入口下，将冻结范围正式化为垂直切片。
  yss stage query --root ./demo-design --id stage.ticket-formalization --json
  yss handoff verify --root ./demo-design --kind package --package docs/handoff --json --diagnostics
  Design 正式化业务级 Ticket 并交接批准且当前的业务方案；研发合同与实现由下游接收方完成。
预期结果：查询/核验当前输入与适用条件。
下一步条件：工作单元窄、依赖清晰、验收和测试 seam 可执行。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

其他登记阶段仅供跨 Profile 引用，本 Profile 不执行：
  系统 / 数据架构与工程契约（stage.system-data-engineering）
  垂直切片实现（stage.vertical-slice-implementation）
  验证 / 发布 / 复盘（stage.verification-release-retrospective）

```
