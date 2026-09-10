---
name: yss-technical-design
description: 在 YSS 技术分析中统一承接需求与战略输入，按已确认的 DDD 或传统 MVC 架构组织设计合同。
---

# YSS 技术设计

由 `yss-product-lifecycle` 调度，负责 `work-unit.technical-analysis` 的技术设计，不另起生命周期、不生成生产代码。生命周期维护批准和状态；`yss-implementation-contract-compiler` 消费批准且当前的设计，起草实现合同。

文档输出时按 `lifecycle-document-output` 条件调用 `i-have-adhd`，读取 `docs/process/document-writing.md`；作用域仅限当前产物，派发时传递条件及引用。

## 文档写作

起草或修订技术设计解释正文前，读取 `docs/process/document-writing.md` 的共用写法及工程契约指引，并在分支派发中传递该引用；结构化合同保持原 schema 和验证要求。

## 输入与架构选择

先读根 `CONTEXT.md`、已批准且当前的 Spec、业务规则、关键场景、适用的 API 契约、ADR 和工程约束。没有 API 或其他专项影响时记录有依据的不适用，不生成占位设计。

按项目绑定架构选择的来源及摘要。新工程复用 `scaffold-architecture-decisions.yaml` 的用户确认决定，先确认再进入分支，后续脚手架消费同一决定；既有工程沿用已登记架构，架构转换另行立项。只有 `domain-driven` 和 `layered-mvc` 两种架构族，不能从目录推断或默认 DDD。具体 Profile 及模块边界消费技能注册表与 `docs/agents/backend-architecture-profiles.md`。

- `domain-driven`：调用 `yss-tactical-design`，补齐适用的战略领域输入。
- `layered-mvc`：调用 `yss-mvc-design`，不要求战略 DDD、聚合、值对象、Domain Event 或 DDD Gateway。

已有 Strategic Design Handoff 时，两种分支都必须先完成导入和目标词汇对账，再逐条承接规则与关键场景。没有战略交接包的项目直接消费批准需求，不能为 MVC 补造战略 DDD。

## 合同与验证

新产物使用 schema v2 Technical Design Contract：共同头记录架构来源、输入版本与摘要、规则/场景承接、评审证据和状态，`design` 保存架构专属内容。合同格式与兼容规则见 `references/technical-design-contract.md`，Schema 见 `references/technical-design.schema.json`。

运行 `node .agents/skills/yss-technical-design/scripts/validate-technical-design.mjs <合同> --root <项目根>`。整体存在延期或冲突即阻断整体；相关切片可带 `--slice <切片ID>` 按依赖核验，仍须合同已批准。校验成功只返回审查输入，不批准、不设置 `ready-for-agent`。

schema v1 战术合同只按 DDD 显式兼容读取；使用 `--legacy-ddd`，不能解释为 MVC。迁移不自动批准，输入或架构变化必须重新校验并按现有门禁审查。新合同使用 `artifact.technical-design` / `evidence.technical-design-review`；旧 DDD 稳定 ID 保留原含义。

## 交接

按现有架构审查门禁进行独立评审。批准且版本当前后交回生命周期，再交编译器；DDD 实现使用 `yss-domain`，MVC 实现按已登记 Profile 的能力与 Recipe 路由。发现 `stale`、`drift`、`new_impacts` 或路径越界时回交重路由。需要图示时按用户或合同要求调用 `archify`，图只作派生证据。
