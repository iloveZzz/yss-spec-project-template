# 教程：Spec 主控

本页是[统一 CLI 操作说明](../unified-cli.md)的一部分。

## 教程：spec

```text
Profile spec
职责：综合研发主控；新正式功能默认完成业务验收，可调整里程碑后续推；日常任务按当前政策分流。
日常政策启用：true

前置条件：独立新目录，或先 attach 接管已有工程；已有任务从最近可信接入点恢复。
输入材料：项目名称、当前职责对应的合同/交接材料。

  yss init --profile spec --root ./demo-spec --project-name 演示项目
  yss doctor --root ./demo-spec --json
  yss context verify --root ./demo-spec --json
  yss lifecycle query --root ./demo-spec --id work-unit.entry-triage --json
  yss assets list --root ./demo-spec --json
  yss skills list --root ./demo-spec --json

预期结果：仅安装该 Profile 支持的资源，返回实际来源与输入状态。
下一步：按以下固定 Profile 顺序继续；交接核验见 yss handoff verify --help。
失败恢复：身份、依赖或交接材料不匹配时补当前输入；未支持能力明确返回 UNPORTED。

正式生命周期（spec）
来源摘要：template=d947b648aa5feac74bd17ddb407a666a28cf5dd2；registry=39a8e314412faa8e3ffe82d6f834dbe81d512105df9ae2c49f17b70f21fb892c；profile=尚未登记；policy=3617d6ba1b8236d56b0af517c9ed46fca437dabf6862d4124e18ac687c41b051
前置条件：合法项目身份，从当前任务最近可信阶段继续；阶段触发与退出条件由该 Profile 固定模板及项目当前资产核验。
输入材料：当前 checkpoint、已确认战略/Spec/合同和相应证据。路径示例使用新项目 .work；旧项目按 tracker.root 替换。以下需要当前资产的命令在材料齐备后执行。

本次目标、停止与续推（Spec 主控）
当前实例须启用 lifecycle-target-v1 政策；用 capabilities 查看 CLI 能力，并核验当前实例政策，不能仅凭版本号判断。旧原生实例缺能力时显式 sync --plan，审阅后 apply；不会静默补目标或改 checkpoint。此机制用于 governed，daily 仍走原分流政策。

三个完成结论分别核验：本次目标达到、Profile 职责完成、业务整体完成。新正式 Spec 功能默认 business-accepted；短目标达到不等于整体业务完成。已有 plan-to-backend 职责默认 backend-deliverable，仅允许前三目标，不能通过改目标扩大职责。
五个可写目标：
  spec-approved：当前 Spec 批准、业务 Ticket 草案和需求/验收覆盖已核验。
  product-design-completed：适用产品设计审查、验证、批准和业务 Ticket 正式化闭合；产品设计不适用须有当前依据，不生成空原型。
  backend-deliverable：当前批准合同、适用 API、后端实现、独立审查、构建及契约/部署验证闭合。
  business-accepted：Spec 主控完成同一业务范围的统一验收。验收完成不自动提交、合并或发布。
专职工程只读显示 profile-terminal，它是本端职责终点，不是可写目标。

示例：用户要求“先完成 Spec”。先按实际 Tracker/map 登记替换 feature_id、checkpoint_ref 和目录；不要按目录名猜功能身份。创建项目内 .work/feature/tmp/target-input.json，JSON 内容为：
{
  "schema_version": 1,
  "kind": "lifecycle-progression-target",
  "feature_id": "feature.example",
  "checkpoint_ref": ".work/feature/checkpoint.json",
  "target": "spec-approved",
  "intent_source": "用户要求先完成 Spec",
  "consumers": []
}
草稿路径须已被项目现有忽略规则覆盖，计划放工程外；保留草稿至 apply 完成。输入不能占用 progression-target.json，也不填写批准、完成状态或 ready-for-agent。

  yss lifecycle target --root ./demo-spec --checkpoint .work/feature/checkpoint.json --json
  yss lifecycle target --root ./demo-spec --checkpoint .work/feature/checkpoint.json --input .work/feature/tmp/target-input.json --plan --out /tmp/spec-target-plan.json --json
  yss lifecycle target --root ./demo-spec --apply --plan-file /tmp/spec-target-plan.json --json
  yss lifecycle status --root ./demo-spec --checkpoint .work/feature/checkpoint.json --json

plan 只保存计划；apply 重新核验当前输入并拒绝篡改或漂移，写入仅限目标配置和必要事务记录。查询 target/status 不写入、不启动实现或业务测试。真正推进由 yss-product-lifecycle 及相应负责人完成。
达到目标后停止本次下游写入，保留 checkpoint 的真实 next_work_unit；next_action.kind=target-reached 表示停点，不将 checkpoint 改成整业务已完成。

用户随后要求“继续完成设计”：修改同一草稿的 target 为 product-design-completed，并更新 intent_source，再保存新计划并应用：
  yss lifecycle target --root ./demo-spec --checkpoint .work/feature/checkpoint.json --input .work/feature/tmp/target-input.json --plan --out /tmp/design-target-plan.json --json
  yss lifecycle target --root ./demo-spec --apply --plan-file /tmp/design-target-plan.json --json
设计后要求完成前后端及业务验收：把 target 改为 business-accepted，更新 intent_source，再保存新计划并应用：
  yss lifecycle target --root ./demo-spec --checkpoint .work/feature/checkpoint.json --input .work/feature/tmp/target-input.json --plan --out /tmp/business-target-plan.json --json
  yss lifecycle target --root ./demo-spec --apply --plan-file /tmp/business-target-plan.json --json
每次改目标后重验已有证据，从首个合法未完成工作单元续推；有效批准和稳定业务 Ticket ID 可复用。真实资产或批准依据变化仍使受影响证据失效。

本地或独立专职：
  consumers=[]：同一 Spec 主线消费本地批准资产，在已登记实现仓写代码；无需另建三个治理工程或自导自入。
  外部专职：consumers 每项给 profile（design/backend）、绝对 root、同功能 checkpoint_ref，每种最多一个；不能指向主控自身。未来尚未创建的端只能登记意图，未核验当前接收前不会报完成。
  Spec→Design 使用当前 SpecBaseline、Receipt 和目标 Context 对账；Spec/Design→Backend 消费同一冻结战略基线。
  主控只汇总显式绑定的同功能交付；过期 Receipt、版本失配和 Context 冲突阻断受影响完成判定。Context 以既有词汇归一化合同核验。

读结果：progression 给目标、来源、reached 和完成依据；completion.milestone/profile/business 区分本次、本端与整体；coordination 给显式消费者状态；next_action 给承接者、工程、工作单元或等待原因。pending 等待证据，blocked 先处理诊断，not-applicable 须有已核验依据。next_action 不授予执行授权。
失败恢复：保留原输入和计划；漂移后重新 plan。查询 yss recover / rollback 默认只读，增加 --apply 执行既有保护性恢复/回退；后续修改冲突时停止覆盖。目标不进入批准或交接证据闭包。
详细输入和独立消费者示例见 docs/lifecycle-target.md。

1. 入口分诊（stage.entry-triage）
目标：确认仓库身份、问题范围和影响面。
  yss stage query --root ./demo-spec --id stage.entry-triage --json
  yss doctor --root ./demo-spec --json
  yss context verify --root ./demo-spec --json
  yss lifecycle query --root ./demo-spec --id work-unit.entry-triage --json
预期结果：查询/核验当前输入与适用条件。
下一步条件：yss-project.yaml 合法，影响面和最近可信阶段可解释。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

2. Plan（战略规划）（stage.plan）
目标：确认目标、业务边界、关键规则、MVP / 非目标、优先级和交接责任，为 Spec 提供战略输入；按影响面探索并复用仍有效的结论。
  yss stage query --root ./demo-spec --id stage.plan --json
  yss stage register --root ./demo-spec --checkpoint .work/feature/checkpoint.json --items docs/work-items.json > ./demo-spec/docs/stage-plan.json
  yss stage apply --root ./demo-spec --plan-file docs/stage-plan.json --json
  工作项 JSON 与 checkpoint 由当前任务准备；重定向保存原始计划，不加 --json envelope。Plan 撰写和批准由对应 Skill/负责人完成。
预期结果：查询/核验当前输入与适用条件。
下一步条件：命中的战略与阶段决策检查通过，用户统一批准当前 Plan；影响业务边界、关键规则或 MVP 的问题已解决，其他未决项有责任人和解决时点；下游可进入 Spec，不代表可实现。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

3. Spec / 功能架构（stage.spec-architecture）
目标：固化解决方案和功能边界，同时按用户行为与验收结果起草业务 Ticket。
  yss stage query --root ./demo-spec --id stage.spec-architecture --json
  yss stage update --root ./demo-spec --checkpoint .work/feature/checkpoint.json --items docs/work-items.json > ./demo-spec/docs/stage-plan-next.json
  yss lifecycle verify --root ./demo-spec --checkpoint .work/feature/checkpoint.json --json --diagnostics
  更新计划经审阅后使用 stage apply；Spec 由批准的战略输入承接。
  同时起草业务 Ticket 草案及 FR/AC 覆盖；业务票不授予实现资格。
预期结果：查询/核验当前输入与适用条件。
下一步条件：Spec 基线和功能边界可审查；适用业务 Ticket 草案及 FR/AC 覆盖可读取。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

4. 产品设计与业务 Ticket 正式化（stage.product-design）
目标：按产品设计影响校准页面流、状态和业务 Ticket；在技术分析前完成适用业务 Ticket 正式化。
  yss stage query --root ./demo-spec --id stage.product-design --json
  yss assets list --root ./demo-spec --json
  yss lifecycle status --root ./demo-spec --checkpoint .work/feature/checkpoint.yaml --json
  仅命中产品设计影响时使用原型与设计技能；未命中项按权威条件说明适用性。
  产品设计校准后完成 work-unit.business-ticket-formalization，再进入技术分析；无产品设计影响时从 Spec 直接进入业务正式化，不生成空原型。
预期结果：查询/核验当前输入与适用条件。
下一步条件：命中的设计门禁通过，适用业务 Ticket 正式化及当前审查闭合；无产品设计影响时记录依据，从 Spec 进入业务正式化，不生成空原型。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

5. 系统 / 数据架构与工程契约（stage.system-data-engineering）
目标：消费已正式化业务 Ticket 和当前批准的 Spec / 设计，围绕当前交付范围固化系统、数据、工程基线及 API 契约。
  yss stage query --root ./demo-spec --id stage.system-data-engineering --json
  消费已正式化业务 Ticket 和当前批准的 Spec / 设计；工程契约围绕当前已确认交付范围形成。
  yss contract verify --root ./demo-spec --kind scaffold --file docs/scaffold.json --json --diagnostics
  yss handoff verify --root ./demo-spec --kind package --package docs/handoff --json
  API：OAS 3.1 YAML Draft → 锁定工具校验 → 独立 Review → Freeze → 实现与契约测试；由 OpenAPI 技能及负责人完成。
预期结果：查询/核验当前输入与适用条件。
下一步条件：新建后端已由用户确认 DDD / MVC 与精确 Spring Boot 版本，既有工程已核验并复用登记值；受影响工程契约冻结或记录无 API 影响；required 脚手架证据齐全。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

6. 实现切片拆分与合同准入（stage.ticket-formalization）
目标：消费冻结工程契约和当前实现仓库准备，将业务 Ticket 细化为可独立验证的实现切片，并批准当前 Slice Implementation Contract。
  yss stage query --root ./demo-spec --id stage.ticket-formalization --json
  yss contract verify --root ./demo-spec --kind slice --file docs/contract.json --checkpoint .work/feature/checkpoint.yaml --json --diagnostics
  输入为批准且当前的 Slice 合同及其消费证据；校验器不创建批准或设置 ready-for-agent。
  本阶段承接实现切片拆分与合同准入，工程契约和实现仓库准备须先闭合；业务 Ticket 正式化已在技术分析前完成。
预期结果：查询/核验当前输入与适用条件。
下一步条件：切片范围窄、依赖清晰、验收与测试 seam 可执行；工程前置闭合、合同批准且当前，生命周期复算后才能 ready-for-agent。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

7. 垂直切片实现（stage.vertical-slice-implementation）
目标：以批准合同驱动 TDD 实现和跨仓库协作。
  yss stage query --root ./demo-spec --id stage.vertical-slice-implementation --json
  yss skills list --root ./demo-spec --json
  yss lifecycle status --root ./demo-spec --checkpoint .work/feature/checkpoint.yaml --json
  仅按批准合同的写范围实现；需要的 Skill 闭包来自当前合同。前端在实际实现仓 pnpm，后端优先根 ./mvnw；记录真实测试并由独立审查者审查。
预期结果：查询/核验当前输入与适用条件。
下一步条件：允许写路径、禁止模式、证据和验证命令全部满足。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。

8. 验证 / 发布 / 复盘（stage.verification-release-retrospective）
目标：完成 fresh verification、发布和回顾。
  yss stage query --root ./demo-spec --id stage.verification-release-retrospective --json
  yss evidence verify --root ./demo-spec --kind verification --file docs/verification.json --json --diagnostics
  yss project-ci verify --root ./demo-spec --base "<已确认40位SHA>" --runtime-store off --json
  yss lifecycle verify --root ./demo-spec --checkpoint .work/feature/checkpoint.yaml --json
  核验消费已有证据；真实发布、推送与外部动作消费相应授权，复盘保留实际结论。
预期结果：查询/核验当前输入与适用条件。
下一步条件：所有命中门禁通过，人工审查点已完成，checkpoint 可追溯。
失败恢复：查看当前报告的逐项诊断，从最近可信阶段补齐受影响材料；yss help errors。


```
