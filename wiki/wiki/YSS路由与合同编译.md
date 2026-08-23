# YSS路由与合同编译

`yss-router` 是阶段 7 的实现合同编译器：它把已批准的生命周期资产和 [[垂直切片Ticket]] 编译为 Slice Implementation Contract 草案，不批准合同、不写业务代码、不设置 `ready-for-agent`。

进入实现时先读 `docs/process/implementation-repo-integration.md`，完成 [[实现仓库与跨仓库契约]] 登记，再编译最小 skill 集合与当前实现合同。输入包括 Spec、切片 Ticket、需求冻结、适用的原型确认、OpenAPI Freeze / no-impact、系统 / 数据架构、Design Review、Build Architecture Checklist、实现仓库和验证命令；输入缺失、未批准或 `stale` 时输出 `blocked`，交回 `yss-product-lifecycle`（见 [[产品研发生命周期]]）。

编译循环判断 frontend / backend / API / data / cross-repo 影响并填写 backend `component_impacts`，检查工程存在性与核心 / 长尾 skill 可用性，按 `router-contract.yaml` 计算强制依赖闭包，为切片生成基线合同、为当前行为生成工作单元增量路由，并选择 `behavior-tdd` 或 `controlled-generation`。业务行为使用 `behavior-tdd`；只有机械脚手架 / 生成物可用 `controlled-generation`，并记录例外和验证。输出只能是 `draft`、`blocked` 或 `ready-for-lifecycle-review`，交生命周期编排器核验和持久化。

Router 不得输出 `approved`、`ready-for-agent` 或 `completed`。正式垂直切片必须消费已批准、已持久化且版本当前的 [[切片实现合同]]；Router 只生成草案。合同 schema、Backend 子合同和证据字段以 `yss-router` references 为准。只有通过必要门禁、阻塞边已清除并具备直接实现条件的垂直切片 Ticket，才能使用 `ready-for-agent`（见 [[Ticket与流程状态]]）。

脚手架只在 `scaffold_status=required` 且受控生成合同已持久化、获得生命周期批准后运行；它只产生机械骨架，业务行为回到 Router 并使用 `behavior-tdd`。Harness 内实现路径必须落在 `apps/backend/<project>/` 或 `apps/frontend/<project>/`；`apps/backend/`、`apps/frontend/` 只能作为容器，`app/backend/`、`app/frontend/` 及其子路径一律阻断。专项技能来自 [[YSS工程技能体系]]，由 Router 按影响面选择，而不是按 shadow 注册表裁剪发现面（见 [[技能投影与锁定]]）。

路径越界、证据缺失、未执行验证、`drift`、`violation` 或 `new_impacts` 时停止实现并重新路由。专项 skill 必须消费批准合同并返回 YSS Skill Execution Result；实现者自报不构成最终通过，须由 Router、生命周期编排器和独立 Reviewer 复核（见 [[Fresh验证与独立审查]]）。

## 来源

- `AGENTS.md`
- `CONTEXT.md`
- `.agents/skills/yss-router/SKILL.md`
- `docs/process/implementation-repo-integration.md`
