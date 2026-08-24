# Matt技能体系

Matt Engineering Skills 是来自 `mattpocock/skills` 的轻量工程流程技能集合，用于澄清、Spec、Ticket、实现、TDD、诊断、审查和架构治理，不替代 [[YSS工程技能体系]]。

当前锁定 revision 以 `skills-lock.json` 的 `sources` 为准：`mattpocock/skills` 的 `revision` 为 `0ab1b63a410a03d3627979a109c8695de27af954`。不要抄 README 里可能过期的 hash。上游技能基线不等于项目当前生效内容；YSS 适配必须同时保留上游内容哈希、有效内容哈希和适配依据（见 [[技能投影与锁定]]）。

`grill-with-docs` 与 `to-spec` 只是用户显式兼容入口；新功能或较大变更的默认路径是 `yss-product-lifecycle` 的原生 Discovery / 需求分析工作单元，[[Spec基线]] 与产品设计影响的完整判定以生命周期注册表和裁剪规则为准（见 [[产品研发生命周期]]）。用户显式 `to-tickets` 同样只是兼容入口；正式化由生命周期原生 Ticket 工作单元完成，禁止只按 Adapter / Application / Domain / Infrastructure 横向拆分（见 [[垂直切片Ticket]]）。

[[Agent入口规则]] 规定的强制入口包括：技术事实、标准、第三方 API 或框架行为走 `research`；竞品、市场或用户口碑走 `competitive-intelligence`；Bug、测试失败或性能回退先用 `diagnosing-bugs` 再建 `tdd`；merge / rebase 冲突走 `resolving-merge-conflicts`；架构治理、难测模块或深模块设计走 `improve-codebase-architecture` / `codebase-design`；跨线程、跨仓库、上下文过长或原型结论回流走 `handoff`。

业务行为默认按 `tdd` 使用已确认的公开 seam 逐切片实现。一次性生成、纯配置或流程文档不适用代码 TDD 时，必须记录例外理由和可执行验证方式。一次性一手资料走 `research`；要把研究结果落成持久 wiki 则走 [[LLM Wiki]]。`ask-matt` 的关联入口包括 `to-questionnaire`、`wait-what`、`writing-for-agents` 和 `PHASE-BOUNDARIES.md`，这些支持文件随共享 skill 目录一起计算 `effectiveHash`，不得单独投影或维护。

过时技能不会保留兼容别名。已退休、personal 或由 YSS 有意排除的条目不再进入 `.agents/skills`、共享投影根或 `skills-lock.json`；其中 `wizard` 是最新上游仍存在但 YSS 当前有意排除的人工步骤技能，不应描述为上游已退休。

## 来源

- `CONTEXT.md`
- `AGENTS.md`
- `skills-lock.json`
- `docs/agents/skills-maintenance.md`
- `wiki/raw/skills-lock-names.md`
