# Matt Pocock Engineering Skills

Matt Engineering Skills 是来自 `mattpocock/skills` 的轻量工程流程技能集合，用于澄清、Spec、Ticket、实现、TDD、诊断、审查和架构治理，不替代 YSS 专项规范（见 [[YSS工程技能体系]]）。

主要技能与用途：`grill-with-docs`（需求澄清与决策沉淀）、`to-spec`（Spec 形成）、`to-tickets`（垂直切片拆分）、`tdd`（测试驱动实现）、`diagnosing-bugs`（Bug 与性能回退诊断）、`code-review`（双轴审查：标准符合性与 Spec 符合性）、`codebase-design` / `improve-codebase-architecture`（深模块设计与架构治理）、`resolving-merge-conflicts`、`maintaining-skills`（轻量技能维护）、`research`（一手事实研究）与 `handoff`（交接记录）。

专项任务强制入口（见 [[Agent入口规则]]）：技术事实影响决策用 `research`；竞品 / 市场 / 用户口碑事实用 `competitive-intelligence`；UI 设计用 `yss-design-system` 后路由 `product-design:index`；Bug、测试失败或性能回退用 `diagnosing-bugs` 建立可复现反馈，再用 `tdd`；架构治理与深模块设计用 `codebase-design`；跨线程、跨仓库、上下文过长或原型结论回流用 `handoff`。

业务行为默认按 `tdd` 使用已确认的公开 seam 逐切片实现。一次性生成、纯配置或流程文档不适用代码 TDD 时，必须记录例外理由和可执行验证方式。
