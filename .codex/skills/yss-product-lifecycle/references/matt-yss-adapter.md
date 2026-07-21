# Matt / YSS 工作流适配

Matt skills 决定如何工作；YSS 生命周期决定是否允许推进；YSS 专项 skills 决定如何符合工程规范。

| 情形 | Matt flow | 生命周期验收 |
|---|---|---|
| 首次启用或配置缺失 | `setup-matt-pocock-skills` | 幂等核对 tracker、真实标签和领域布局；冲突时迁移而非覆盖 |
| 通用入口 | `ask-matt` | 检测到 YSS 后由本编排器最终裁决 |
| 需求澄清 | `grill-with-docs`、`domain-modeling` | 按退出判定检查未决项和回流 |
| 大型模糊工作 | `wayfinder` | map 真正完成后 `handoff → to-spec` |
| 技术事实 | `research` | 一手资料回填 Spec/OpenAPI/架构/ADR |
| runnable 问题 | `prototype` | 只保留结论，不把 throwaway code 当生产资产，也不得替代阶段 4 的低保真评审、Ant Design v6 高保真 HTML、AntD CLI 证据和用户确认 |
| Spec 综合 | `to-spec` | 初稿进入 `ready-for-human`，不得直接实现 |
| 切片 | `to-tickets` | 仅在冻结/无影响记录后拆垂直切片 |
| 实现 | `implement`、`tdd` | `yss-router` 编译 Slice Implementation Contract 草案；本编排器核验并持久化后才执行，专项 Execution Result 返回后再次核验 |
| Bug | `diagnosing-bugs`、`tdd` | 先建立红色反馈；高风险影响升级上游门禁 |
| 审查 | `code-review` | 审查者独立，结合 Spec 和 YSS 标准 |
| 跨上下文 | `handoff` | 保存来源、阶段、未决项、命令和下一责任人 |

尽量不修改 Matt skill 以复制 YSS 规则。只有它违反模板硬门禁时才做最小兼容修改。

Router 只能返回 `draft`、`blocked` 或 `ready-for-lifecycle-review`，不得自行批准合同、设置 `ready-for-agent` 或宣布完成。`new_impacts`、`drift`、`violation`、越界路径或缺失实际验证会暂停当前工作单元，并由本编排器决定增量重路由、完整重路由或回到更早生命周期阶段。
