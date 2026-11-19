---
name: implement
description: 在用户要求后端开发、修复或按 Spec/Ticket 完成研发交付时使用；只读分析不自动转为实现。
---

首次研发写入及委派写入前，按 [写入前核对](references/repository-scope.md#写入前核对) 核对本次采用的确认和目标 Git 信息。续办时如输入或目标改变，重新核对受影响部分。

Implement the user's goal in the authorized repository using the current request, spec or tickets. Read the relevant code, map the accepted behavior to concrete changes and finish the affected callers and configuration.

当用户给出 Spec、业务票或原型，或在工程中读到本次需求依据（如 spec.md）时，先读取 [规格接收与反馈](references/spec-feedback.md)，再确定实现与验证范围；发现来源变化或业务差异时也使用该方法。沿原规则说明结果和缺口，常规技术决定按授权继续。

接手或续办真实 Issue/Ticket、组织明确的复杂研发请求，或接续跨仓集成、环境交付与运行反馈时，按项目根读取 `.template-spec/agents/issue-tracker-operations.md`，使用其中的实例与项目定位、内容与讨论读取、依赖核对、已有工作检查和授权方法。以真实标题及链接指代工作项；assignee 不代表独占锁，先衔接已有工作树、分支或 PR/MR，不重复开发。只有裸编号无法唯一定位时才询问定位信息；访问失败不等于条目不存在，已有输入支持的独立工作继续。

Keep the observable goal, actual repository and paths, UI/API dependencies, FR/AC or existing acceptance references, source version, applicable skills and the requested completion endpoint in the existing task. For YSS work, use yss-domain / yss-application for DDD behavior and orchestration. Use yss-application's MVC guidance for use cases, transactions and idempotency at the existing Service boundary. Use yss-repository / yss-web-controller for persistence and HTTP boundaries. Do not create a parallel implementation contract.

接续已登记 Spec 的研发、日常终端任务、工作台作业及 PR/MR/CI 进展时，按项目根读取 `.template-spec/agents/workbench-progress.md`。沿用同一 dataDir、specId、实际 Spec 摘要及目标版本，关联真实参与工程、采用版本和原验收，报告实际阶段证据。按本次本地实现、合并或环境验证目标完成，关键需求、业务验收及最终交付沿用户实际确认接续。仅工作台同步能力缺失且写入条件已齐备时，继续原授权研发并在原任务注明工作台待同步。

涉及模型或分层时，按项目根读取 `.template-spec/agents/backend-architecture-profiles.md`，再结合工程已确认约定选择落点。按本次影响补齐专项方法：HTTP 绑定与输出使用 yss-web-controller / yss-dto，并联查 validation / exception 的实际接线；模型及转换使用 lombok / mapstruct；持久化使用 yss-repository / yss-mybatis；写入顺序使用 yss-application，DDD 规则使用 yss-domain。用户不必逐项点名技能，也不因技能存在而接入所有组件。已有实现先区分符合、确有缺口和未验证，避免重复整改。

结构重构先在当前任务中记下受影响的公开字段、缺失/null/空值、权限先后、错误标识、版本、锁、事务、幂等及副作用顺序，再沿真实入口检查迁移结果。只列本次涉及项，不新建合同或扩大业务范围。按工程现有检查入口验证这些约束，编译或格式通过不能替代行为证据。

For multiple repositories, submodules or an unclear project root, read [repository scope and protection](references/repository-scope.md). A read-only investigation does not authorize implementation writes; the current request determines which repositories and actions are allowed.

用户要求 PR/MR 修复、持续跟进或合并，或明确要求交付后继续跟进时，读取 [PR/MR 持续跟进](references/pr-mr-followup.md)，在当前会话内处理反馈、CI 与版本变化，直到指定结果或明确受阻。复用已有动作授权，按实际版本与平台结果判断完成；普通研发和只读审查不自动转为长期跟进。

按当前任务选择方法：完整研发交付承接 Spec 的规则、验收与产品原型说明，覆盖必要的拆分、设计、脚手架、实现和测试；已有清晰的小任务直接完成受影响部分。业务决定缺失时定点澄清，不重做产品设计，不要求先创建票据。

- 收到明确的复杂研发请求或确需拆分时，按项目根读取 `.agents/skills/to-tickets/references/engineering-tickets.md`，检查责任、依赖和接续需要，主动复用或组织必要工作；后端实现切片继续按 `to-tickets` 的专业方法细化，保存与远程操作沿对应授权。
- 需要架构、方案或详细设计判断时使用 `yss-technical-design`；仅实际 DDD 设计使用 `yss-tactical-design`，MVC 沿用已有 Service 边界，不补 Domain/Gateway。
- 新建工程才按实际 DDD/MVC 选择对应脚手架，沿用项目 POM、平台和版本；安装了组件技能不等于需要给业务工程添加全部组件。
- 分页、缓存等组件排障使用对应 `yss-mybatis`、`yss-cache` 等技能核实工程实际依赖、配置与源码版本；明确规则的 DDD/MVC 开发直接沿现有边界完成。
- 按验收和风险使用 `yss-backend-testing`，故障根因调查使用 `diagnosing-bugs`；只有明确要求测试优先时使用 `tdd`。没有执行的构建、测试、启动或部署不能写成成功。

完整研发交付或构建部署说明任务按需读取 [构建部署手册方法](references/build-deploy-guide.md)，优先更新已有 README/运维说明；局部修改只更新受影响部分。手册只描述有依据的步骤，不执行部署。

Select the engineering skills needed for the work. Do not require lifecycle routing, a formal contract, TDD, a test report or a review package to start or finish. Run tests or request a review when the user asks or the particular task needs it; report only observed results.

Preserve user changes and error handling. Reuse existing authorization for local work; commit, push, publish and deploy only within the authorization for those actions. On resumption, inspect existing changes and command results before continuing.

交付围绕用户要求的终点和原验收给出实际证据：模拟可用、代码完成、PR/MR 合并与业务验收分别说明。不得由某个状态推定其他状态；父 Issue 仅汇总真实子项结果与剩余缺口，不因子票关闭或 MR 合并自动关闭。

已授权研发采用策略 A：至少两个工作项可独立推进，依赖明确、路径与运行资源可隔离，主控能够集成，且宿主允许并有实际收益时，自行并行，不重复索取已有授权。判断或执行并行时读取 [并行研发与集成](references/parallel-development.md)；条件不满足则顺序完成。只读分析不因此转为开发，模板策略不覆盖宿主限制。
