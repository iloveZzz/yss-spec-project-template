# Matt Pocock Engineering Skills 集成

Matt 提供澄清、实现、TDD、诊断和审查方法；实际执行规则由本地 canonical 技能拥有。本文只保存导航与采用来源，不另建生命周期协议。

## 按当前任务进入

| 当前任务 | 入口与边界 |
|---|---|
| 普通需求、规格、研究或审查 | 由 [life 普通路由](../../.agents/skills/yss-product-lifecycle/references/standalone-routing.md) 选择实际入口；无需初始化 Tracker、checkpoint 或正式任务 |
| 显式 to-spec / to-tickets / implement | 保留 user-invoked 限制，用户明确调用后读取该入口；调用权限与实现、提交、发布授权分别核验 |
| 已有 daily / standard | 消费同一任务、现行政策与有效决定；`tdd` 使用已经确定的测试边界，不重新计算资格 |
| 已有正式任务 | 按当前根入口和任务合同加载适用参考；普通技能与文件就绪不授予正式资格 |
| template-source 维护 | 维护事实源、消费者和分发，不创建产品阶段资产；按实际影响验证 |

执行某技能或解释其约束前读取当前实际入口；推荐表不能代替规则。仅列出候选入口时不必加载全部技能。

[code-review](../../.agents/skills/code-review/SKILL.md) 是通用审查入口：使用真实项目标准与已有验收，独立 Spec 文件可选；没有依据的轴明确不可评价。默认诚实自检，真实用户或外部要求需要时才独立复核。实施者在绿色测试下完成范围内必要重构；冻结审查者保持只读。

[研究入口](../../.agents/skills/yss-research/SKILL.md) 为 canonical yss-research，research 是兼容别名。普通研究默认聊天或用户要求的一份报告；显式审计研究或已有正式流程才消费其 governed 参考。研究深度由证据和限制决定，不由文件数量决定。

Backend 的 to-spec 保留本 Profile 的实际入口；普通 Spec 起草复用 Spec 的共享方法。已启用的治理、非法身份和已有正式任务不能通过普通稿绕过。

## 上游采用记录

本轮审阅正式版 v1.3.1（24fe0ef7737efae15c87225755e9f6f5965e4888）与 main（59db609eb1e18aaf59b63284d0e52255aff0c63c），访问日期 2026-10-29。main 不是新正式版。锁中的原 sourceRevision/upstreamHash 继续表示实际引入来源；下表是选择性适配，不能称为整体同步。

| 主题 | 本地决定与消费者 | 验证边界 |
|---|---|---|
| 测试能发现的错误与盲区 | 适配到 TDD 的当前任务说明 | 工程断言和真实 Agent 轨迹分别核验，未执行不报通过 |
| 人为 mutation 生效 | 适配到 diagnosing-bugs 的调查参考 | 先确认字节变化与目标红灯；真实已有失败无需另造变异 |
| 路由读取实际入口 | 适配到 life 普通路由 | 保留显式调用限制，不因读取就自动调用 |
| 每次 seam 人工确认、固定多人形式 | 不采纳为通用要求 | 复用有效验收与授权；独立复核仅依真实要求 |
| 上游 setup、Context 命名、自动提交或 reset | 不采纳 | governed 默认、CONTEXT.md、现有安装迁移和用户文件保护不变 |

来源：[上游 TDD](https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/tdd/SKILL.md)、[诊断](https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/diagnosing-bugs/SKILL.md)、[路由](https://github.com/mattpocock/skills/blob/59db609eb1e18aaf59b63284d0e52255aff0c63c/skills/engineering/ask-matt/SKILL.md)。具体执行结果留在本次维护记录；结构正确不代表宿主已发现、调用或行为通过。

## 本轮资源与兼容边界

资源继续使用既有静态声明。退役 reader、生成器及其 registry/tombstone 依赖补入实际消费者的资源组；既有正式条件参考、传递导入和来源适配说明保留。没有证据支持的删除不实施，本轮不宣称资源数量或 Token 降低。

完整公开包，以及 tdd、diagnosing-bugs、implement、code-review、yss-research 的单技能导出，在基线和候选均通过。yss-product-lifecycle 单技能导出在两侧均因兄弟技能引用而拒绝，完整包可用；本轮没有扩大单技能导出承诺。

退役 ID 改由 registry 的 retirement_contract v2 数据提供，兼容 JS 块由生成器维护。新消费者先解析有效直接别名，再判断目标是否退役；research 可以指向 yss-research，旧 research 物理技能仍禁止。跨仓前端引用继续表示外部依赖，不成为本地可安装技能。旧 JS reader 的字面量兼容不代表旧二进制能够接管新来源实例。

## 本地实施验证记录（2026-10-29）

本轮严格退役 reader、别名命名空间、历史来源兼容、生成保护和静态资源闭包已通过针对性回归。最终 fast 执行 57 项逻辑检查、22 项语法检查及 2 项其他任务；7 项慢检查明确延后。CLI 的全量 Go 测试、vet、构建和原固定 v4.8.3 Bundle 黑盒冒烟通过，这些结果不能代替新来源的安装验收。

实际 Agent 观察将普通工程与原生校验的合成治理输入分开，并保留旧夹具失败、原始轨迹与单独语义判读。已观察的基线原本能够复用有效决定；本轮不宣称统计性行为、Token 或耗时改善。测试批准只用于隔离场景，不授予产品执行资格。完整验收矩阵及预算账本属于本次本地维护证据，固定来源装配和其他宿主运行资格分别记录。
