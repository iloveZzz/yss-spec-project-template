---
name: implement
description: 在用户要求后端开发、修复或按 Spec/Ticket 完成研发交付时使用；只读分析不自动转为实现。
---

Implement the user's goal in the authorized repository using the current request, spec or tickets. Read the relevant code, map the accepted behavior to concrete changes and finish the affected callers and configuration.

当用户给出 Spec、业务票或原型，或在工程中读到本次需求依据（如 spec.md）时，先读取 [规格接收与反馈](references/spec-feedback.md)，再确定实现与验证范围；发现来源变化或业务差异时也使用该方法。沿原规则说明结果和缺口，常规技术决定按授权继续。

When given a Ticket URL or number, resolve the actual tracker, repository/instance and issue type, then read the real title, body and relevant comments before implementation. Refer to it by title with its link. A bare number with multiple possible targets needs only a locating question; access failure is not proof of absence. Continue independent work supported by existing inputs without inventing ticket contents.

Keep the observable goal, actual repository and paths, interface dependencies, acceptance and applicable skills in the existing task. For YSS work, use yss-domain / yss-application for DDD behavior and orchestration, and the existing Service boundary for MVC; use yss-repository / yss-web-controller for persistence and HTTP boundaries. Do not create a parallel implementation contract.

For multiple repositories, submodules or an unclear project root, read [repository scope and protection](references/repository-scope.md). A read-only investigation does not authorize implementation writes; the current request determines which repositories and actions are allowed.

按当前任务选择方法：完整研发交付承接 Spec 的规则、验收与产品原型说明，覆盖必要的拆分、设计、脚手架、实现和测试；已有清晰的小任务直接完成受影响部分。业务决定缺失时定点澄清，不重做产品设计，不要求先创建票据。

- 确需拆分时使用 `to-tickets` 细化窄垂直 Slice，保留原验收和实现顺序；远程建票仍需要对应授权。
- 需要架构、方案或详细设计判断时使用 `yss-technical-design`；仅实际 DDD 设计使用 `yss-tactical-design`，MVC 沿用已有 Service 边界，不补 Domain/Gateway。
- 新建工程才按实际 DDD/MVC 选择对应脚手架，沿用项目 POM、平台和版本；安装了组件技能不等于需要给业务工程添加全部组件。
- 按验收和风险使用 `yss-backend-testing`，故障根因调查使用 `diagnosing-bugs`；只有明确要求测试优先时使用 `tdd`。没有执行的构建、测试、启动或部署不能写成成功。

完整研发交付或构建部署说明任务按需读取 [构建部署手册方法](references/build-deploy-guide.md)，优先更新已有 README/运维说明；局部修改只更新受影响部分。手册只描述有依据的步骤，不执行部署。

Select the engineering skills needed for the work. Do not require lifecycle routing, a formal contract, TDD, a test report or a review package to start or finish. Run tests or request a review when the user asks or the particular task needs it; report only observed results.

Preserve user changes and error handling. Reuse existing authorization for local work; commit, push, publish and deploy only within the authorization for those actions. On resumption, inspect existing changes and command results before continuing.

已授权研发采用策略 A：至少两个工作项可独立推进，依赖明确、路径与运行资源可隔离，主控能够集成，且宿主允许并有实际收益时，自行并行，不重复索取已有授权。判断或执行并行时读取 [并行研发与集成](references/parallel-development.md)；条件不满足则顺序完成。只读分析不因此转为开发，模板策略不覆盖宿主限制。
