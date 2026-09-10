# Matt Pocock Engineering Skills 集成

Matt Pocock Engineering Skills 提供轻量的澄清、实现、TDD、诊断和审查方法；YSS 生命周期、仓库身份、产品设计、OpenAPI 和跨仓库契约仍由本模板的权威资产裁决。

## 进入与退出

- `triage` 是显式 Issue / PR 兼容入口；普通请求由 `yss-product-lifecycle` 的 `request_triage` 合同处理。其 YSS 适配只回交取证、简报和状态建议；简报不替代批准的切片合同，状态调整由生命周期核验。详细规则见 [请求分诊协议](../../.agents/skills/yss-product-lifecycle/references/request-triage.md)。
- Matt user-invoked 的 `grill-with-docs`、`to-spec`、`to-tickets` 和 `implement` 必须由用户显式启动，任何 skill 不得自动调用它们；YSS 生命周期只准备、校验和验收其结果。所有 Matt model-invoked skill 仍须遵守 `AGENTS.md` 的阶段、门禁和证据要求，并只能在生命周期允许的工作单元中调用。
- `code-review` 保持唯一默认审查入口。YSS 适配把 Slice `required_skills`、`alibaba-java-code-style` 与命中的 `yss-ui` / `yss-domain` 等专项 skill 编译为 Standards 检查输入，并要求实现仓已有的 `pnpm` / `./mvnw` 机器检查；禁止再增加第二个通用审查 skill 或专用审查 Cloud 环境来代替这条接线。审查 finding 按编排合同分流：实现者修复后全轴复审，或合同 `stale` 后回 实现合同编译器；审查者不得写实现。
- `template-source` 只执行模板维护流程，不生成具体产品 Spec、原型、OpenAPI 或垂直切片 Ticket。
- Matt 的 `research` 已适配为 canonical `yss-research`，旧名只作为 deprecated alias。YSS 版本提供 `technical-evidence` / `strategy-evidence` profile、`quick` / `evidence-audited` 模式、证据合同和确定性校验，同时保留上游 revision 与原始 hash 以便追溯。
- Agent 完成工作单元后返回可核验的 evidence refs、变更资产、验证命令、残余风险和下一路由。
