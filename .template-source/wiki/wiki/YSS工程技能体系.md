# YSS工程技能体系

YSS skills 是本项目内置的工程规范技能，用于 DDD、UI、OpenAPI、Repository、Controller、DTO、组件和编码规范；它们不替代 [[Matt技能体系]] 的通用流程入口。

技能清单、来源、版本、哈希和投影目标以 `skills-lock.json` 为准；README 与用户指南只解释。锁文件 `version` 为 `3`，`canonicalRoot` 为 `.agents/skills`。共享技能名的派生摘录见 `wiki/raw/skills-lock-names.md`。公开发布清单 `yss-public-skills.json` 只冻结 `yss-*` 工程技能；`llm-wiki` 不在该清单中，公开仓库 `iloveZzz/yss-spec-dev-skills` 只是单向发布投影，不是新的权威来源。

词汇上的分层是：核心技能默认可发现，负责生命周期控制或通用研发入口；专项技能由 Router 按影响面和实现合同按需选择；试验技能只在明确试验范围内使用，不进入 Router 默认技能闭包。`docs/agents/yss-skill-registry.yaml` 记录分层、别名、默认可发现性和运行时入口，live `status: active`；`AGENTS.md` / `CONTEXT.md` 仍写 `shadow`。锁文件共享技能名已纳入页面模块与 Formily 专项（见 `wiki/raw/skills-lock-names.md`），`high-fidelity-html-prototype` 已从共享清单退役。

进入实现后，后端领域、Application、Repository / Gateway、Web / DTO 由 [[YSS路由与合同编译]] 分别路由到对应 YSS skill；涉及 POJO 样板或对象转换时必须加载 `lombok`、`mapstruct` 和 `alibaba-java-code-style`。核心 YSS skills 必须消费已批准的 [[切片实现合同]] 并返回 YSS Skill Execution Result；路径越界、证据缺失、未执行验证、`drift`、`violation` 或 `new_impacts` 阻断继续实现或触发重路由。

脚手架生成器 `yss-ddd-scaffold-generator` / `yss-frontend-scaffold-generator` 只在 `scaffold_status=required` 且受控生成合同已批准并持久化后运行，只产生机械骨架。UI 设计与原型走 `yss-design-system` 后 `yss-prototype-stage`（见 [[产品设计影响与原型]]）。OpenAPI 治理与 Draft 审查走 `yss-openapi-governance` / `yss-openapi-draft-review`（见 [[OpenAPI契约]]）。

创建、修改或退役 skill 时使用 `maintaining-skills`，并按 [[模板维护流程]] 判定 L1 / L2 / L3。权威内容与投影见 [[技能投影与锁定]]。本地持久知识库走 [[LLM Wiki]]，不得把该技能误写成公开工程技能。

## Status

Disputed：`AGENTS.md` / `CONTEXT.md` 写注册表为 `shadow`；`yss-skill-registry.yaml` 与 `skills-maintenance.md` 写 `active`。

## 来源

- `AGENTS.md`
- `CONTEXT.md`
- `skills-lock.json`
- `wiki/raw/skills-lock-names.md`
- `docs/agents/yss-skill-registry.yaml`
- `docs/agents/skills-maintenance.md`
- `yss-public-skills.json`
