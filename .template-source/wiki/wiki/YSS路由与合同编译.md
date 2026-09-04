# YSS路由与合同编译

`yss-implementation-contract-compiler` 是阶段 7 的实现合同编译器：它把已批准的生命周期资产和 [[垂直切片Ticket]] 编译为 Slice Implementation Contract 草案，不批准合同、不写业务代码、不设置 `ready-for-agent`。

进入实现时先读 `docs/process/implementation-repo-integration.md`，完成 [[实现仓库与跨仓库契约]] 登记，再编译最小 skill 集合与当前实现合同。输入包括 Spec、切片 Ticket、需求冻结、适用的原型确认、OpenAPI Freeze / no-impact、系统 / 数据架构、Design Review、Build Architecture Checklist、实现仓库和验证命令；输入缺失、未批准或 `stale` 时输出 `blocked`，交回 `yss-product-lifecycle`（见 [[产品研发生命周期]]）。

编译循环判断 frontend / backend / API / data / cross-repo 影响并填写 backend `component_impacts`，检查工程和长尾 skill 可用性，再从 active 注册表选择一个或多个窄 Recipe。Recipe 只引用 capability；capability 解析为入口 skill 后，只递归 `context-required`，`context-conditional` 只在显式 condition 命中时加载，`coordination-only` / `review-only` / `component-dependency` 只记入原因链而不扩张上下文。同一切片的多 Recipe 只计算一次闭包，按 Recipe 声明、依赖拓扑、skill ID 确定性排序，并选择 `behavior-tdd` 或 `controlled-generation`。输出只能是 `draft`、`blocked` 或 `ready-for-lifecycle-review`。

实现合同编译器不得输出 `approved`、`ready-for-agent` 或 `completed`。正式垂直切片必须消费已批准、已持久化且版本当前的 [[切片实现合同]] v2。合同同时冻结 `required_capabilities`、`required_skills`、全部原因链、Registry digest 和 Compiler digest；任一 digest 改变都使合同 `stale`，重新编译后仍须由生命周期重新批准。schema v1 直接拒绝，不自动升级。

脚手架只在 `scaffold_status=required` 且受控生成合同已持久化、获得生命周期批准后运行；它只产生机械骨架，业务行为回到实现合同编译器并使用 `behavior-tdd`。Harness 内实现路径必须落在 `apps/backend/<project>/` 或 `apps/frontend/<project>/`；`apps/backend/`、`apps/frontend/` 只能作为容器，`app/backend/`、`app/frontend/` 及其子路径一律阻断。专项技能来自 [[YSS工程技能体系]]，由实现合同编译器从 active 注册表按 capability 选择（见 [[技能投影与锁定]]）。

路径越界、证据缺失、未执行验证、`drift`、`violation` 或 `new_impacts` 时停止实现并重新路由。专项 skill 必须消费批准合同并返回 YSS Skill Execution Result；实现者自报不构成最终通过，须由 实现合同编译器、生命周期编排器和独立 Reviewer 复核（见 [[Fresh验证与独立审查]]）。

## 来源

- `AGENTS.md`
- `CONTEXT.md`
- `.agents/skills/yss-implementation-contract-compiler/SKILL.md`
- `docs/process/implementation-repo-integration.md`
