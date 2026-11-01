---
name: implement
description: 在用户要求后端开发、修复或按 Spec/Ticket 完成研发交付时使用；只读分析不自动转为实现。
---

Implement the user's goal in the authorized repository using the current request, spec or tickets. Read the relevant code, map the accepted behavior to concrete changes and finish the affected callers and configuration.

When given a Ticket URL or number, resolve the actual tracker, repository/instance and issue type, then read the real title, body and relevant comments before implementation. Refer to it by title with its link. A bare number with multiple possible targets needs only a locating question; access failure is not proof of absence. Continue independent work supported by existing inputs without inventing ticket contents.

Keep the observable goal, actual repository and paths, interface dependencies, acceptance and applicable skills in the existing task. For YSS work, use yss-domain / yss-application for DDD behavior and orchestration, and the existing Service boundary for MVC; use yss-repository / yss-web-controller for persistence and HTTP boundaries. Do not create a parallel implementation contract.

For multiple repositories, submodules or an unclear project root, read [repository scope and protection](references/repository-scope.md). A read-only investigation does not authorize implementation writes; the current request determines which repositories and actions are allowed.

按当前任务选择方法：完整研发交付承接 Spec 的规则、验收与产品原型说明，覆盖必要的拆分、设计、脚手架、实现和测试；已有清晰的小任务直接完成受影响部分。业务决定缺失时定点澄清，不重做产品设计，不要求先创建票据。

- 确需拆分时使用 `to-tickets` 细化窄垂直 Slice，保留原验收和实现顺序；远程建票仍需要对应授权。
- 需要架构、方案或详细设计判断时使用 `yss-technical-design`；仅实际 DDD 设计使用 `yss-tactical-design`，MVC 沿用已有 Service 边界，不补 Domain/Gateway。
- 新建工程才按实际 DDD/MVC 选择对应脚手架，沿用项目 POM、平台和版本；安装了组件技能不等于需要给业务工程添加全部组件。
- 按验收和风险使用 `yss-backend-testing`，故障根因调查使用 `diagnosing-bugs`；只有明确要求测试优先时使用 `tdd`。没有执行的构建、测试、启动或部署不能写成成功。

Select the engineering skills needed for the work. Do not require lifecycle routing, a formal contract, TDD, a test report or a review package to start or finish. Run tests or request a review when the user asks or the particular task needs it; report only observed results.

Preserve user changes and error handling. Reuse existing authorization for local work; commit, push, publish and deploy only within the authorization for those actions. On resumption, inspect existing changes and command results before continuing.

Delegation is optional, only when authorized, useful and supported by the host. Give each independent task a fresh context with its goal, acceptance, permissions, owned paths, source/version pointers and expected output; with Codex's supported API use `fork_turns: "none"`. Confirm pointers are readable, otherwise supply the minimum relevant source text or work sequentially. A writing worker must know others share the codebase, must not revert their changes, and must respect path ownership; appoint one integrator for shared indexes. Do not copy the whole conversation as a substitute for the brief, or invent cross-host parameters, branches or automatic commits.
