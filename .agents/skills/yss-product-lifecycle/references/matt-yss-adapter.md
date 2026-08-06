# Matt / YSS 工作流适配

Matt skills 决定如何工作；YSS 生命周期决定是否允许推进；YSS 专项 skills 决定如何符合工程规范。

| 情形 | Matt flow | 生命周期验收 |
|---|---|---|
| 首次启用或配置缺失 | `setup-matt-pocock-skills` | 幂等核对 tracker、真实标签和领域布局；冲突时迁移而非覆盖 |
| 通用入口 | `ask-matt` | 检测到 YSS 后由本编排器最终裁决 |
| 需求澄清 | `grill-with-docs`、`domain-modeling` | 按退出判定检查未决项和回流 |
| 信息在其他人手中 | `to-questionnaire` | 使用 `external-input-required` 暂停；答案回流后记录 response、重新分类影响面，再进入 `grill-with-docs` 或 `to-spec` |
| 大型模糊工作 | `wayfinder` | map 真正完成后 `handoff → to-spec` |
| 技术事实 | `research` | 一手资料回填 Spec/OpenAPI/架构/ADR |
| runnable 问题 | `prototype` | 生成单文件可分享 HTML，保留 `prototype/<name>` 分支作为主来源；必须 source/return handoff 和结论回填，不得替代阶段 4 的低保真评审、Ant Design v6 高保真 HTML、AntD CLI 证据和用户确认 |
| Spec 综合 | `to-spec` | 初稿进入 `ready-for-human`，不得直接实现 |
| 切片 | `to-tickets` | 仅在冻结/无影响记录后拆垂直切片 |
| 实现 | `implement`、`tdd` | `yss-router` 编译 Slice Implementation Contract 草案；本编排器核验并持久化后才执行，专项 Execution Result 返回后再次核验 |
| Bug | `diagnosing-bugs`、`tdd` | 先建立红色反馈；高风险影响升级上游门禁 |
| 审查 | `code-review` | 审查者独立，结合 Spec 和 YSS 标准 |
| 跨上下文 | `handoff` | 保存来源、阶段、未决项、命令和下一责任人 |
| 阶段边界 | `PHASE-BOUNDARIES.md` | 按 `Continue → /clear → /handoff → subagent → /compact` 选择上下文动作；只记录证据，不扩展生命周期状态 |
| 解释未落地 | `wait-what` | 只重新解释当前结论，不改变阶段、门禁、Ticket 或 `ready-for-agent` |
| 人工步骤 | `wizard` | 只处理 Agent 无法替代的点击、审批、凭据和迁移步骤；默认临时使用，秘密值必须隐藏并脱敏 |
| 编写 Agent 文档 | `writing-for-agents`、`writing-skills` | 共享 skill 只改 `.agents/skills`；流程文档保持简体中文 |

尽量不修改 Matt skill 以复制 YSS 规则。只有它违反模板硬门禁时才做最小兼容修改。

Router 只能返回 `draft`、`blocked` 或 `ready-for-lifecycle-review`，不得自行批准合同、设置 `ready-for-agent` 或宣布完成。`new_impacts`、`drift`、`violation`、越界路径或缺失实际验证会暂停当前工作单元，并由本编排器决定增量重路由、完整重路由或回到更早生命周期阶段。
