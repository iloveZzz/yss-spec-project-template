# ADR-0007: 生命周期使用原生工作单元并保留 Matt 兼容入口

## 状态

已接受

`yss-product-lifecycle` 作为 YSS 研发生命周期的唯一默认入口，持有阶段、产物状态、门禁和正式资产所有权。Spec 综合、Ticket 正式化和切片实现使用生命周期注册表中的原生工作单元；`to-spec`、`to-tickets`、`implement` 保留为用户显式调用的兼容输入，结果必须回交生命周期验收，生命周期不得自动调用这些 user-invoked skills。

该选择避免用户手动记忆阶段切换，也避免 Matt 默认的 `ready-for-agent`、commit 等行为越过 YSS 门禁和授权。代价是生命周期需要维护原生工作单元路由和兼容适配，但两者在 `work_unit_routes` 中共享一个稳定工作单元身份、使用互斥的 `native` / `compatibility` 路由，不再形成两套执行定义。
