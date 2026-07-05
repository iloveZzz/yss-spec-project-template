# 产品研发全生命周期最佳实践

本文面向产品、架构、研发、测试、实施和 AI Agent 协作者，说明如何把一个产品想法从机会探索推进到发布、实施和复盘。示例使用“数据中台数据建模”场景，重点展示每个阶段应该沉淀什么资产、如何判断能否进入下一阶段、以及应该调用哪些项目技能。

如果只做小文案、局部样式、明确 bug 修复或已有功能的小需求迭代，不需要套完整流程。先判断现有资产可信到哪一阶段，再从最早受影响的阶段延伸；只有涉及新模块、API、跨端协作、DDD 分层、发布实施或长期可维护性，才按本文跑最小必要生命周期。

## 1. 一张图看完整链路

> 本文后续“阶段 0 / 阶段 1 ...”用于讲解细化门禁 / 职责点，不等同于 `docs/process/lifecycle-artifact-map.md` 中的 8 个主阶段。执行、审查和追踪仍以 8 个主阶段为准。

```text
机会探索
-> Discovery / 竞品分析
-> 业务架构
-> grill-with-docs 需求澄清
-> PRD 初稿 / 需求基线
-> 产品总体设计 / 功能架构设计
-> 页面 / 原型 / 交互设计
-> Prototype Review
-> PRD 校准 / 需求冻结
-> API 影响分析 / 契约草案
-> OpenAPI Draft Review（如生成 YAML Draft）
-> 工程基线 / YSS DDD Review
-> 系统概要设计 / 数据架构
-> 设计审查
-> OpenAPI Freeze
-> 垂直切片 Issue
-> 垂直切片
-> TDD 实现
-> 独立审查 / fresh verification
-> 发布 / 实施
-> 复盘沉淀
```

核心原则：

- 用 `yss-product-lifecycle` 判断当前阶段、缺失资产和下一步。
- 用 `grill-with-docs` 把模糊需求追问清楚，不让 AI 替人类猜业务规则。
- 把 AI 当作可审查的协作者，而不是一次性生成器；每轮都要说清目标、输入资产、边界、输出格式和验证方式。
- PRD 初稿后先产出产品总体设计 / 功能架构设计，让团队评审用户主流程、业务对象、模块边界、页面/API/数据影响和开放问题，再进入页面 / 原型 / 交互设计。
- 有用户界面的产品，PRD 和页面 / 原型 / 交互设计要迭代校准；不要在交互未评审前冻结 PRD 或直接生成 OpenAPI 契约。
- API 影响分析 / 契约草案后、实现前，需要系统概要设计 / 数据架构承接工程基线、服务边界、状态流、NFR、发布回滚和安全红线。
- 涉及 API 时先形成影响记录和契约草案；必要时生成 review-only OpenAPI Draft，设计审查通过后 Freeze，再开发或生成客户端。
- 涉及前后端或多层实现时先让 `yss-router` 选择最小技能集。
- 业务行为默认 TDD；不能 TDD 的文档、配置或生成类任务要写清验证方式。
- 完成、可合并、可发布必须有 fresh verification 证据。

## 1.5 AI-Human Harness 协作层

生命周期流程能不能跑好，关键不只是“让 AI 做事”，而是让人、Codex、skills、agents 和项目 harness 形成闭环。

```text
人类决定目标、优先级、业务取舍和安全红线
-> Codex / Hermes 等平台读取仓库、执行任务、更新资产
-> skills 提供阶段化工作方法和 YSS 专项规范
-> agents 承担分工明确的角色：Discovery / PRD / API / Architecture / Code / Review / Verify
-> harness 把聊天结论固化为 docs、OpenAPI、Issue、测试和验证记录
```

这里的 harness 不是单个工具，而是本项目提供的一组可追溯能力：

| Harness 能力 | 位置 | 用法 |
|---|---|---|
| Agent 入口规则 | `AGENTS.md` | 约束安全红线、阶段门禁和默认协作流程 |
| 领域记忆 | `CONTEXT.md` | 保存稳定业务术语，避免每轮重新解释 |
| 需求和规格资产 | `docs/discovery/`、`docs/requirements/`、`docs/api/specs/` | 把聊天结论变成可审查文件 |
| 产品设计资产 | `docs/design/` 或 Figma / 原型工具链接 | 保存页面清单、用户流、原型、交互说明和状态矩阵 |
| 架构和决策资产 | `docs/architecture/`、`docs/adr/` | 保存模块边界、状态流和难回滚取舍 |
| 变更编排 | `docs/requirements/issues/`、Issue | 追踪切片目标、设计约束、行为差异、任务、验证和收口状态 |
| Agent 交接 | `docs/templates/agent-brief-template.md`、GitLab / GitHub Issues | 把任务交给 Agent 前写清目标、非目标、验收和验证 |
| Fresh verification | 测试命令、`scripts/verify-template`、CI | 用最新证据支撑“完成”结论 |

### 1.5.1 与 AI 交互的基本协议

好的 prompt 不只是“帮我做 X”，而是给 AI 一个可执行合同。

推荐结构：

```text
背景：<业务背景、已有材料路径、当前阶段>
目标：<这轮只要完成什么>
输入资产：<CONTEXT / discovery / PRD / design / OpenAPI / architecture / issue>
边界：<不做什么、不得触碰什么、安全红线>
工作方式：<先检查资产 / 先追问 / 先设计 / 先测试 / 不要直接写代码>
输出：<文件路径、表格、清单、prompt、验证记录>
验证：<需要运行或建议运行的命令>
```

数据建模示例：

```text
使用 yss-product-lifecycle 处理“数据中台数据建模 MVP”。
背景：目前只有初始想法，目标用户是假设的建模人员、管理员、实施顾问和下游开发者。
目标：本轮只判断生命周期阶段，并给出下一步产物，不写业务代码。
输入资产：请先读取 AGENTS.md、CONTEXT.md、docs/discovery/、docs/requirements/、docs/design/、docs/api/specs/ 和 docs/requirements/issues/。
边界：不要生成 Java / Vue 实现；不要替我确认审批、权限和数据库迁移规则。
输出：当前阶段、已有资产、缺失资产、是否阻塞、下一步、推荐技能和可直接使用的下一轮 prompt。
验证：说明本轮是否只是文档分诊；如修改文档，运行 git diff --check 和 scripts/verify-template。
```

不推荐：

```text
帮我做一个数据建模平台。
```

### 1.5.2 苏格拉底式提问法

人和 AI 协作时，不要一开始追求完整答案。先让 AI 用苏格拉底式问题把假设暴露出来。

| 提问方向 | 目的 | 数据建模示例 |
|---|---|---|
| 谁在使用 | 防止用户泛化 | 主要用户是建模人员、实施顾问还是平台管理员？谁拥有发布权？ |
| 为什么现在做 | 判断机会是否真实 | 现在的线下建模痛点是效率、质量、协作还是审计？ |
| 什么算成功 | 把愿望变成验收 | 30 分钟完成模型发布是否是可接受目标？谁验收？ |
| 第一版不做什么 | 控制范围 | 审批流、血缘、指标管理和数据库迁移是否都排除在 MVP 外？ |
| 如果失败会怎样 | 找异常路径 | 发布校验失败时，用户需要字段级错误还是整体错误？ |
| 反例是什么 | 检查边界 | 已发布版本是否绝对不可变？如果客户要求紧急修字段怎么办？ |
| 证据在哪里 | 区分事实和猜测 | 这个痛点来自客户访谈、实施经验、竞品观察还是团队假设？ |
| 如何验证 | 防止不可测需求 | 哪个测试或人工流程能证明下游不能引用草稿版本？ |
| 用户如何操作 | 避免从 PRD 直接跳 API | 用户从列表进入字段编辑、校验、发布和版本查看的路径是什么？ |

推荐让 AI 这样问：

```text
使用苏格拉底式提问法，不要直接给方案。
请围绕用户、痛点、MVP、非目标、异常路径、成功标准、安全红线和可验证性，连续提出 10 个必须回答的问题。
每个问题后说明：为什么这个问题会影响 PRD、OpenAPI、架构或测试。
```

回答时可以明确区分：

```text
已确认：发布版本不可变。
待确认：是否允许管理员废弃发布版本。
非目标：第一版不做审批流和自动血缘分析。
不要猜：数据库迁移生成规则先标记 TODO-HUMAN-REVIEW。
```

### 1.5.3 如何使用 skills

skills 是让 AI 按规程工作的“操作手册”，不是关键词装饰。使用时要显式说明 skill、阶段和产物。

| 目标 | 推荐入口 | 注意事项 |
|---|---|---|
| 不知道当前该做什么 | `yss-product-lifecycle` | 先阶段判断和资产检查，不写业务代码 |
| 模糊需求追问 | `grill-with-docs` | 先问清，不让 AI 猜规则；稳定术语写 `CONTEXT.md` |
| 生成 PRD 初稿 / 需求基线 | `to-prd` 或 PRD 模板 | 只基于已确认事实，不把待确认项写成需求 |
| 产品总体设计 / 功能架构 | `docs/design/templates/product-overview-design-template.md` | PRD 初稿后的必要产物；必须包含低保真原型 / 页面草图；进入页面 / 原型 / 交互设计、PRD 校准或 OpenAPI Draft 前必须完成 |
| 页面和交互设计 | `product-design-prototype`、`wireframe-prototype`、`docs/design/` | 基于 PRD 初稿和产品总体设计细化页面流、状态和交互，再回填 PRD 并反推 API |
| 原型评审 | `prototype-review` | 未通过时回到产品设计；通过后进入高保真 HTML 原型，不直接进入 PRD 校准 / API 影响分析 / 契约草案 |
| 高保真 HTML 原型 | `high-fidelity-html-prototype` | 低保真评审通过后的强制产物；必须使用 Ant Design v6，并基于官方 `@ant-design/cli` / Ant Design For Agents 指引，输出 `docs/design/prototypes/<feature>/index.html` |
| API 契约 | API 影响分析 / 契约草案 / OpenAPI Freeze 流程 | Draft 可讨论，Freeze 才可开发 |
| 正式变更设计 | `to-issues` / Matt skills | 复用 PRD，聚焦技术方案、风险和测试 seam |
| 拆切片 | `to-issues` | 必须是端到端垂直切片 |
| 选择 YSS 实现规范 | `yss-router` | 不要一次加载所有 YSS skills |
| 业务开发 | `tdd` + YSS 专项 skills | 先失败测试，再实现 |
| Bug 修复 | `diagnosing-bugs` | 先复现和根因，再修 |
| 完成前验证 | fresh verification 记录 / 验证模板 | 必须记录命令、结果、失败项和未验证原因 |
| 审查 | `code-review` / Review Agent | 实现者不能审查自己 |

使用技能的好 prompt：

```text
使用 yss-router，基于 docs/requirements/issues/data-modeling-slice-04-validate-model.md、
冻结 OpenAPI docs/api/specs/data-modeling.yaml 和架构设计，
选择最小 YSS 技能集。
请说明为什么需要或不需要 yss-domain、yss-repository、yss-mybatis、yss-web-controller、yss-ui、api-integration。
不要实现代码，只输出技能路由、实现顺序和验证建议。
```

常见错误：

- 只说“用一下 skill”，但不说明输入资产和输出路径。
- 因为是 YSS 项目就一次性加载所有 YSS skills。
- 把 `需求澄清` 用来重复机会探索，而不是在正式变更中做技术方案。
- 有 UI 的功能从 PRD 初稿直接跳 OpenAPI，跳过页面、原型、状态矩阵和 `prototype-review`。
- 在 OpenAPI Freeze 前让 `yss-openapi` 生成生产客户端。

### 1.5.4 如何使用 agents

agents 是角色分工，不是越多越好。只有当任务边界清楚、上下文可交接、彼此不会改同一批文件时，才适合并行。

| Agent | 适合做什么 | 交付物 |
|---|---|---|
| Intake / Lifecycle Agent | 阶段判断、缺失资产、下一步路由 | 生命周期分诊结果 |
| Discovery / Ideation Agent | 用户事实、竞品输入、机会假设 | discovery、竞品矩阵、MVP 边界 |
| Grill / Product Agent | 苏格拉底式追问、范围收敛 | 已确认 / 待确认 / 非目标 |
| PRD / Issue Agent | PRD 和垂直切片 | PRD、Issue、Agent Brief |
| Product Design / UX Agent | 页面清单、用户流、原型和交互状态 | 页面地图、线框图、状态矩阵、原型链接 |
| API Contract Agent | API 影响分析 / 契约草案 / OpenAPI Freeze | API 影响记录、OpenAPI YAML、契约测试建议 |
| Architecture Agent | DDD 分层、状态流、ADR | 架构设计、ADR |
| Code Agent | TDD 实现 | 代码和测试 |
| Review Agent | 独立审查 | 阻断项、建议项、风险 |
| Verify / Release Agent | fresh verification、发布和实施材料 | 验证记录、release、implementation |
| Retro / Knowledge Agent | 复盘沉淀 | retro、CONTEXT / AGENTS / user guide 更新建议 |

Agent 交接必须写成自包含 brief，不能只丢一句“继续上面的”。推荐使用 `docs/templates/agent-brief-template.md`。

Agent brief 最少包含：

- 背景和相关资产路径。
- 目标和非目标。
- 必须遵守的 skills / AGENTS.md 规则。
- 验收标准。
- OpenAPI Draft / Freeze 状态。
- 安全红线和人工审查点。
- 验证命令。

适合并行：

- Discovery Agent 做竞品矩阵，Ideation Agent 基于同一主题做机会假设，最后由主 Agent 收敛。
- API Contract Agent 和 Architecture Agent 分别审查 Draft 与 DDD 边界，前提是校准后的 PRD、产品总体设计 / 功能架构已稳定；有 UI 时，页面 / 原型 / 交互设计也已评审，或已明确无 UI 影响。
- 多个独立垂直切片，且不会修改同一批文件。

不适合并行：

- 需求还没问清时让前端、后端同时实现。
- OpenAPI 未冻结时让多个 Code Agent 写接口和页面。
- 多个 Agent 同时改同一个 OpenAPI 文件、同一个聚合或同一个页面。
- 用实现 Agent 直接做自己的 Review。

主 Agent 的职责是整合，而不是把判断外包：

- 审阅每个 Agent 的输出。
- 检查是否冲突。
- 将结论写回项目资产。
- 运行 fresh verification。
- 对安全红线保持 fail-closed。

## 2. 示例背景：数据中台数据建模

假设我们要做“数据中台数据建模 MVP”。它不是完整的数据治理平台，第一版只解决建模人员从线下表格维护模型到在线协作、校验、发布的闭环。

### 2.1 目标用户

| 用户 | 诉求 | 典型任务 |
|---|---|---|
| 数据建模人员 | 快速定义业务模型、字段、关系和版本 | 创建模型、维护字段、校验并发布 |
| 数据平台管理员 | 保证模型命名、发布状态和引用规则可控 | 配置规范、查看发布结果、处理异常 |
| 实施顾问 | 在客户现场快速初始化模型并排查问题 | 导入模型、核对字段、输出实施记录 |
| 下游开发者 | 使用稳定模型定义对接数据服务 | 查询发布版本、查看字段和版本变化 |

### 2.2 MVP 边界

第一版做：

- 模型列表、查询和详情。
- 模型草稿创建。
- 字段维护和基础字段约束。
- 发布前校验，返回字段级错误。
- 发布版本冻结和版本查询。
- 基础审计信息和发布记录。

第一版不做：

- 复杂审批流。
- 自动血缘分析。
- 数据同步任务编排。
- 指标口径管理。
- 跨租户模型市场。
- 数据库迁移自动生成。

成功标准：

- 建模人员可以在 30 分钟内完成一个业务对象模型从创建到发布。
- 发布失败时能定位到具体字段和原因。
- 下游只能引用发布版本，不能引用草稿版本。
- 每个发布版本可以追溯创建人、发布时间和字段快照。

## 3. 阶段 0：入口分诊

先不要急着写 PRD 或代码。用 `yss-product-lifecycle` 判断当前处于哪个阶段。

推荐提示词：

```text
使用 yss-product-lifecycle，基于“数据中台数据建模 MVP”判断当前生命周期阶段。
请列出已有资产、缺失资产、是否阻塞、下一步动作、推荐技能和可直接使用的提示词。
```

分诊结论示例：

| 项 | 结论 |
|---|---|
| 当前阶段 | opportunity exploration |
| 阶段依据 | 只有产品想法，缺少 Discovery、PRD 初稿、产品总体设计 / 功能架构、页面 / 原型 / 交互设计、PRD 校准和 OpenAPI |
| 已有资产 | 初始想法、目标用户假设 |
| 缺失资产 | 竞品矩阵、Discovery、PRD 初稿 / 需求基线、产品总体设计 / 功能架构、页面 / 原型 / 交互设计、PRD 校准 / 需求冻结、OpenAPI Draft、工程基线、架构设计、设计审查、垂直切片 |
| 是否阻塞 | 阻塞实现，不阻塞产品探索 |
| 下一步 | 先形成机会探索和 Discovery 输入 |
| 推荐技能 | `yss-product-lifecycle`，必要时接 `grill-with-docs` |

完成定义：

- [ ] 已确认这是新模块、较大变更、bug、tweak 还是探索任务。
- [ ] 如果是已有功能迭代，已确认最近可信阶段和最早受影响资产。
- [ ] 已列出当前已有资产和缺失资产。
- [ ] 已明确下一步只推进一个阶段，不跨阶段直接实现。

## 4. 阶段 1：机会探索与竞品输入

机会探索回答“为什么值得做、第一版做什么、不做什么”。如果没有行业材料，先从竞品或内部系统调研开始；如果已有客户材料，先整理用户事实。

建议资产：

```text
docs/discovery/reports/data-modeling-competitive-matrix.md
docs/discovery/data-modeling-opportunity.md
```

数据建模场景可以观察：

- 元数据管理产品如何组织模型、字段、关系和版本。
- 数据治理产品如何处理发布、血缘和权限。
- 低代码建模平台如何降低实施复杂度。
- 内部旧系统有哪些高频抱怨和迁移成本。

推荐提示词：

```text
使用 yss-product-lifecycle，围绕“数据中台数据建模 MVP”做机会探索。
请输出目标用户、痛点、为什么现在做、竞品/内部系统观察点、MVP 边界、非目标范围和成功标准。
保存为 docs/discovery/data-modeling-opportunity.md。
```

阶段门禁：

- [ ] 目标用户不是泛泛的“平台用户”，而是具体角色。
- [ ] 痛点来自用户、实施或竞品事实，不只是功能愿望。
- [ ] MVP 边界能砍掉至少一批诱人但暂不做的能力。
- [ ] 成功标准可观察、可验收。

## 5. 阶段 2：需求澄清

用 `grill-with-docs` 追问业务规则。这个阶段不要让 AI 直接补全未确认规则。

数据建模必须问清的问题：

| 维度 | 追问 |
|---|---|
| 角色边界 | 建模人员能否直接发布，还是需要管理员确认？ |
| 对象状态 | 模型是否分草稿、已发布、已废弃？发布后能否回滚？ |
| 字段规则 | 字段编码、类型、长度、必填、默认值和枚举如何校验？ |
| 版本策略 | 发布是冻结字段快照，还是覆盖当前模型？ |
| 引用规则 | 下游引用模型草稿时应该禁止、警告还是允许？ |
| 失败路径 | 发布失败要展示整体错误还是字段级错误？ |
| 安全红线 | 是否涉及权限、数据库迁移、原生 SQL 或公共基础 API？ |

推荐提示词：

```text
使用 grill-with-docs，基于 docs/discovery/data-modeling-opportunity.md，
围绕“数据中台数据建模 MVP”连续追问需求边界。
请只列出已确认、待确认、非目标、OpenAPI 影响初判和需要人工审查的问题，不要直接生成 PRD。
```

阶段门禁：

- [ ] 草稿、发布、废弃等状态含义明确。
- [ ] 字段级校验和错误展示规则明确。
- [ ] API 影响已初判。
- [ ] 安全红线已检查；触碰项标记 `TODO-HUMAN-REVIEW`。
- [ ] 稳定术语已准备写入 `CONTEXT.md`。

## 6. 阶段 3：PRD 初稿 / 需求基线

PRD 把追问结论变成可交付需求，不写实现代码。这里的 PRD 先形成“需求基线”，不等于最终冻结版本；进入 PRD 初稿 / 需求基线流程后，必须先形成产品总体设计 / 功能架构，再按是否有 UI 决定是否进入页面 / 原型 / 交互设计，最后回填 PRD 并进入 API 影响分析 / 契约草案。

建议资产：

```text
docs/requirements/data-modeling-prd.md
```

PRD 最少包含：

- 问题陈述。
- 用户故事。
- 功能需求和非功能需求。
- 非目标范围。
- Gherkin 验收标准。
- OpenAPI 影响。
- 测试决策。
- AI / 人工审查点。

PRD 片段示例：

```gherkin
假如 建模人员已创建一个包含字段的模型草稿
当 建模人员发起发布
那么 系统先执行字段编码、类型、必填和重复字段校验
并且 校验通过后生成不可变的发布版本
并且 下游查询只能获取发布版本
```

推荐提示词：

```text
基于 docs/discovery/data-modeling-opportunity.md 和 grill-with-docs 的已确认结论，
使用 docs/templates/prd-template.md 生成“数据中台数据建模 MVP”PRD。
请重点补充 Gherkin 验收标准、OpenAPI 影响、测试决策、安全红线和非目标范围。
保存为 docs/requirements/data-modeling-prd.md。
```

阶段门禁：

- [ ] 每个 P0 需求都有验收标准。
- [ ] OpenAPI 影响不是“待定”。
- [ ] 非目标范围清晰。
- [ ] 测试 seam 已明确。
- [ ] 待人工确认问题没有伪装成已确认需求。
- [ ] 产品总体设计 / 功能架构已作为 PRD 初稿后的必要产物进入下一阶段；不进入 PRD 生命周期的小文案、低风险 Bug 或局部配置变更已记录不适用原因。

## 7. 阶段 4：产品总体设计 / 功能架构

产品总体设计 / 功能架构是 PRD 初稿到页面 / 原型 / 交互设计之间的过渡层。它回答“产品由哪些功能域和业务对象支撑”“MVP 做什么和不做什么”“哪些页面、状态、权限、API、数据会被影响”，并用低保真原型 / 页面草图先验证页面结构、关键操作和主流程。它不是详细交互说明，也不替代后续交互设计，而是页面 / 原型 / 交互设计的上游输入。

正确关系是先结构化、再原型化：

```text
PRD 初稿定义目标、范围、用户故事和验收
-> 产品总体设计 / 功能架构明确功能域、模块边界、低保真原型、页面/API/数据影响和 PRD 回填项
-> 页面 / 原型 / 交互设计验证用户如何完成任务
-> 交互发现遗漏后回填 PRD
-> PRD、产品总体设计和交互设计一起作为 API 影响分析 / 契约草案输入
```

建议资产：

```text
docs/design/data-modeling-product-overview-design.md
```

推荐使用模板：

```text
docs/design/templates/product-overview-design-template.md
```

阶段门禁：

- [ ] 用户主流程、异常路径、业务对象和状态已足以支撑原型设计。
- [ ] 功能域、模块边界、优先级、依赖和非目标范围清楚。
- [ ] 低保真原型 / 页面草图已覆盖 P0 页面、主流程、关键操作和关键异常路径。
- [ ] 页面、API、数据、权限、审计影响已显式标注。
- [ ] PRD 回填项、开放问题和阻断项已记录。
- [ ] 可进入页面 / 原型 / 交互设计，或明确阻断原因。

## 8. 阶段 5：页面 / 原型 / 交互设计

PRD 说明“要解决什么”，页面和原型说明“用户怎么完成”。二者不是简单的父子包含关系：小功能可以把页面草图和交互说明直接写在 PRD 中；中大型功能建议把 PRD 和 `docs/design/` 拆成两个可互相引用的资产。

正确关系是双向校准：

```text
PRD 初稿定义目标、范围、用户故事和验收
-> 产品总体设计 / 功能架构给出页面和交互的结构化输入
-> 页面 / 原型 / 交互设计验证用户如何完成任务
-> 交互发现遗漏后回填 PRD
-> PRD、产品总体设计和交互设计一起作为 API 影响分析 / 契约草案输入
```

有前端体验的产品不能从 PRD 初稿直接跳 OpenAPI，否则接口字段、错误结构、权限状态和前端验收标准都会缺少真实交互依据。

建议资产：

```text
docs/design/data-modeling-interaction-spec.md
docs/design/data-modeling-state-matrix.md
docs/design/data-modeling-prototype-review.md
```

推荐使用 `product-design-prototype` 作为入口，并按需要追加专项 skill：

| 目标 | 推荐技能 / 工具 | 说明 |
|---|---|---|
| 页面清单、用户流、状态矩阵、PRD 回填项、OpenAPI 反推 | `product-design-prototype` | 基于 PRD 初稿和产品总体设计后的原型入口 |
| 低保真线框、流程草图 | `wireframe-prototype`；Excalidraw / Markdown wireframe | 适合快速讨论，不绑定工程依赖 |
| 高保真或设计系统协作 | Figma / Penpot，必要时使用 `figma` / `figma-use` | 适合设计团队和组件规范沉淀 |
| 高保真可交互 HTML 原型 | `high-fidelity-html-prototype`；Ant Design v6 | 低保真原型评审通过后的必需产物，用于 PRD 校准和 API 反推前的体验确认 |
| 图谱、血缘、流程编排画布 | tldraw / xyflow | 适合数据血缘、任务流、关系图等画布型体验 |
| 进入高保真前门禁 | `prototype-review` | 未通过则回到原型阶段 |

如果团队使用 Figma、即时设计、Axure 或其它原型工具，可以在 `docs/design/data-modeling-interaction-spec.md` 中保存链接、版本、评审记录和关键截图说明。第一版不强制引入 Excalidraw、Figma、Penpot、tldraw 或 xyflow 作为项目依赖。

数据建模 MVP 的页面清单示例：

| 页面 / 区域 | 核心任务 | 关键控件 |
|---|---|---|
| 模型列表 | 查询、筛选、进入详情、创建草稿 | YssFormily 查询区、YTable、创建按钮、状态标签 |
| 模型详情 | 查看基本信息、字段列表、版本状态 | 基本信息区、字段表格、操作栏 |
| 字段编辑抽屉 | 新增 / 编辑字段 | 字段编码、名称、类型、长度、必填、默认值、枚举 |
| 发布前校验面板 | 查看校验结果并定位字段错误 | 校验按钮、错误列表、字段级锚点 |
| 发布确认弹窗 | 确认发布版本和影响 | 版本说明、确认按钮、风险提示 |
| 版本历史 | 查看发布快照 | 版本列表、字段快照、发布人、发布时间 |

用户流示例：

```text
模型列表
-> 创建模型草稿
-> 进入模型详情
-> 新增 / 编辑字段
-> 执行发布前校验
-> 修复字段级错误
-> 发布确认
-> 查看发布版本
```

交互状态矩阵示例：

| 场景 | 页面状态 | API / 数据要求 | 验收点 |
|---|---|---|---|
| 首次进入列表 | loading -> empty / data | 分页查询、筛选默认值 | loading 不遮挡操作，空态可创建 |
| 查询失败 | error | 错误码、错误文案 | 可重试，不丢失查询条件 |
| 字段校验失败 | field-error | 字段级错误列表 | 能定位到具体字段 |
| 无发布权限 | no-permission / disabled | 权限标识或操作禁用原因 | 发布按钮不可用且原因明确 |
| 草稿已发布 | readonly | 状态、发布版本号 | 字段不可编辑，下游只能看发布版本 |
| 并发编辑冲突 | conflict | 版本号或更新时间 | 提示刷新或重新提交 |

这个阶段要反推 OpenAPI：

- 列表页决定分页、筛选、排序和状态字段。
- 字段编辑决定请求 schema、字段类型枚举和表单校验。
- 校验面板决定字段级错误结构。
- 发布确认决定状态前置条件、幂等策略和冲突错误。
- 权限 / 只读 / 禁用状态决定权限响应和前端状态判断字段。
- 用户流决定哪些接口必须支持连续操作，哪些可以延后。

推荐提示词：

```text
使用 product-design-prototype。
基于 docs/requirements/data-modeling-prd.md 和 docs/design/data-modeling-product-overview-design.md，
为“数据中台数据建模 MVP”输出页面 / 原型 / 交互设计资产。
请生成页面清单、用户主路径、异常路径、低保真线框说明、交互状态矩阵、权限状态、空态/加载态/错误态，
并明确这些设计如何反推 OpenAPI 字段、错误结构、分页筛选和前端验收标准。
保存到 docs/design/data-modeling-interaction-spec.md。
如果发现 PRD 缺少页面状态、异常路径或验收标准，请列出需要回填到 PRD 的条目。
完成后请给出 prototype-review 的评审输入清单。
```

原型评审提示词：

```text
使用 prototype-review。
输入：docs/requirements/data-modeling-prd.md、docs/design/data-modeling-product-overview-design.md、docs/design/data-modeling-interaction-spec.md、docs/design/data-modeling-state-matrix.md。
请审查页面清单、用户流、异常路径、权限状态、状态矩阵、PRD 回填项和 OpenAPI 反推清单是否足以进入 PRD 校准 / 需求冻结。
输出：通过/阻断、阻断项、PRD 校准就绪度、Contract Draft / OpenAPI Draft 就绪度、前端原型就绪度和下一步。
```

阶段门禁：

- [ ] 页面清单覆盖 PRD 的 P0 用户故事。
- [ ] 用户主路径和异常路径都能走通。
- [ ] loading、empty、error、readonly、disabled、no-permission、conflict 状态已定义。
- [ ] 字段级错误、权限状态、分页筛选和发布确认已反推到 API 输入。
- [ ] 原型或线框图已经过 `prototype-review`，产品 / 设计 / 前端 / 后端无阻断项。
- [ ] 从交互设计发现的需求缺口已经回填 PRD，或明确标记为待确认。
- [ ] 没有把页面实现细节提前写成后端契约，但已经明确契约需要支撑的交互。

## 9. 阶段 6：PRD 校准 / 需求冻结

页面 / 原型 / 交互设计评审后，需要回到 PRD 做一次校准。这个阶段不是重写 PRD，而是把交互设计暴露出来的需求缺口、异常路径、验收标准和非目标范围补回需求资产。

校准内容：

- 页面清单是否覆盖 P0 用户故事。
- 用户流是否暴露了 PRD 未写的中间状态或异常路径。
- 权限、只读、禁用、并发冲突等状态是否进入验收标准。
- 原型中的字段、筛选、操作按钮是否都能追溯到需求。
- 被原型证明不进入 MVP 的能力是否写入非目标范围。
- OpenAPI 影响是否仍然准确。

阶段门禁：

- [ ] PRD 已吸收页面 / 原型 / 交互设计中的关键结论。
- [ ] PRD 与设计资产互相链接。
- [ ] 未确认交互问题没有进入冻结范围。
- [ ] 产品、设计、前端、后端对需求范围有共同理解。

## 10. 门禁 8：API 影响分析 / 契约草案（主阶段 5 内）

只要前后端接口会变化，就先写 API 影响记录和契约草案；必要时再生成 review-only OpenAPI Draft。Draft 是讨论稿，不是冻结实现，也不是生成客户端的稳定契约。

OpenAPI Draft 的输入不应只有 PRD，还必须结合产品总体设计、页面 / 原型 / 交互设计产物、状态矩阵和 `prototype-review` 结论。页面流和状态矩阵会决定请求字段、响应字段、错误结构、权限标识、分页筛选、只读/禁用策略和状态冲突处理。

建议资产：

```text
docs/api/specs/data-modeling.yaml
```

数据建模 MVP 端点示例：

```text
GET    /api/v1/data-models
POST   /api/v1/data-models
GET    /api/v1/data-models/{id}
PUT    /api/v1/data-models/{id}
POST   /api/v1/data-models/{id}/fields
PUT    /api/v1/data-models/{id}/fields/{fieldId}
POST   /api/v1/data-models/{id}/validate
POST   /api/v1/data-models/{id}/publish
GET    /api/v1/data-models/{id}/versions
```

Draft 必须覆盖：

- 统一响应包装：`SingleResult<T>`、`MultiResult<T>`、`PageResult<T>`。
- 分页、排序、筛选字段。
- 字段级校验错误结构。
- 权限不足、数据不存在、状态冲突等错误。
- 发布接口的状态前置条件。
- 契约测试思路。

推荐提示词：

```text
基于 docs/requirements/data-modeling-prd.md、docs/design/data-modeling-product-overview-design.md、
docs/design/data-modeling-interaction-spec.md、状态矩阵和 prototype-review 结论，
生成 OpenAPI 3.1 Draft 到 docs/api/specs/data-modeling.yaml。
要求逐项追踪页面动作、表单字段、筛选分页、权限状态、loading/empty/error/readonly/disabled/conflict 状态，
并包含统一响应包装、字段级校验错误、模型发布、版本查询和契约测试建议。
```

阶段门禁：

- [ ] Draft 的输入包含校准后的 PRD、产品总体设计、交互说明 / 原型、状态矩阵和 prototype-review 结论；无 UI 影响时已显式说明。
- [ ] Draft 能支撑前端页面和后端用例，不缺关键字段。
- [ ] 错误结构足以表达字段级校验失败。
- [ ] 权限、只读、禁用、并发冲突等交互状态有契约支撑。
- [ ] 路径使用 `/api/v1/`。
- [ ] Draft 还没有被当成冻结契约直接开发。

## 11. 门禁 9-12：工程基线、系统 / 数据架构与设计审查（主阶段 5 内）

这一阶段回答“这个需求如何落在 YSS DDD 和项目架构里”。

建议资产：

```text
docs/architecture/data-modeling-architecture.md
docs/adr/0001-data-model-versioning-strategy.md
```

数据建模的关键设计点：

| 主题 | 推荐设计关注 |
|---|---|
| 聚合边界 | `DataModel` 作为聚合根，字段作为聚合内实体或值对象 |
| 状态流 | 草稿 -> 已发布 -> 已废弃，发布后版本不可变 |
| 版本策略 | 发布生成 `ModelVersion` 快照，草稿可继续编辑 |
| Gateway | Domain 定义模型保存、版本查询、发布快照读取等能力 |
| Infrastructure | Repository / GatewayImpl 处理持久化和查询，不泄漏到 Domain |
| Web Adapter | Controller 只做协议适配、校验和统一响应包装 |
| 前端 | YTable 列表、YssFormily 查询、字段编辑弹窗或抽屉 |

技能路由建议：

- 跨前端、后端、API 或多层实现时，先用 `yss-router` 选择最小技能集。
- 从零创建后端服务时，通常路由到 `yss-ddd-scaffold-generator`。
- 现有服务功能设计时，通常路由到 `yss-backend-scaffold-parent`、`yss-domain`。
- 持久化设计时，通常路由到 `yss-repository`，需要 MyBatis 细节时补 `yss-mybatis`。
- Web 适配时，通常路由到 `yss-web-controller`、`yss-dto`。
- 前端页面时，通常路由到 `yss-ui`、`yss-page-module-development`。

推荐提示词：

```text
使用 yss-product-lifecycle，基于校准后的 PRD、产品总体设计 / 功能架构、页面 / 原型 / 交互设计和 OpenAPI Draft 检查“数据中台数据建模 MVP”的工程基线。
请先判断是否需要通过 yss-router 选择最小技能集，再输出 YSS DDD 分层、聚合边界、状态流、Gateway 边界、前端页面边界和需要 ADR 的决策。
```

阶段门禁：

- [ ] Domain 不依赖 Infrastructure、Mapper、Controller 或 Web DTO。
- [ ] Gateway 接口在 Domain，GatewayImpl / Repository 在 Infrastructure。
- [ ] Controller 不穿透 Repository。
- [ ] 版本策略和状态流清楚；难回滚决策已写 ADR。
- [ ] 设计已经反向校验 OpenAPI Draft。

## 12. 主阶段 5/6 交接：系统 / 数据架构设计 准备与设计审查

正式进入变更交付时，使用垂直切片 Issue 承载目标、设计约束、行为差异、任务和验证方式。这里关注技术方案、风险、测试 seam 和契约影响，不重复机会探索。

推荐提示词：

```text
使用 to-issues 为“数据中台数据建模 MVP”创建垂直切片 Issue。
请复用校准后的 PRD、产品总体设计 / 功能架构、页面 / 原型 / 交互设计、OpenAPI Draft 和工程基线，重点完成行为规格、状态流、风险、测试 seam 和设计审查清单。
```

设计审查至少覆盖：

| 审查点 | 检查内容 |
|---|---|
| PRD Review | 用户、痛点、非目标、验收标准、交互回填和安全红线 |
| Product Design Review | 页面流、原型、交互状态、权限状态、异常路径和前端验收 |
| API Review | 路径、schema、错误结构、分页、权限和契约测试 |
| Architecture Review | DDD 分层、模块依赖、Gateway、状态流、ADR 和回滚 |
| Plan Review | 是否垂直切片，是否有测试命令和验证方式 |

阶段门禁：

- [ ] 阻断项已回到对应阶段修正。
- [ ] 产品总体设计 / 功能架构、页面 / 原型 / 交互设计已通过评审，并已反推 OpenAPI Draft。
- [ ] 契约草案 / OpenAPI Draft 已通过设计审查，可以进入 Freeze。
- [ ] 垂直切片 Issue 目标单一，不混入指标管理、血缘分析等额外目标。

## 13. 主阶段 6：OpenAPI Freeze

Freeze 表示前端、后端、测试和实施都以这份契约为准。Freeze 之后不能边写代码边偷偷改契约。

Freeze 记录可以写在关联设计 / 审查文档中；如果确实写入 OpenAPI YAML 文件，只能使用 YAML 注释，避免破坏 OpenAPI 结构：

```yaml
# 状态：Freeze
# 冻结日期：YYYY-MM-DD
# 冻结依据：PRD Review、API Review、Architecture Review 无阻断项
# 适用范围：数据建模 MVP 垂直切片 1-5，基于已评审交互设计
# 变更规则：任何路径、schema、错误结构变化必须回到 API Review
```

阶段门禁：

- [ ] Draft 中的路径、schema、错误和权限已通过审查。
- [ ] 页面 / 原型 / 交互状态中的关键场景都有契约支撑。
- [ ] 前端确认可消费。
- [ ] 后端确认可实现。
- [ ] 契约测试可以落地。

## 14. 阶段 11：垂直切片

不要按 Adapter、Application、Domain、Infrastructure、Frontend 横向拆任务。每个切片都要能独立演示和验证。

建议资产：

```text
docs/requirements/issues/data-modeling-slice-01-list-and-query.md
docs/requirements/issues/data-modeling-slice-02-create-draft.md
docs/requirements/issues/data-modeling-slice-03-edit-fields.md
docs/requirements/issues/data-modeling-slice-04-validate-model.md
docs/requirements/issues/data-modeling-slice-05-publish-version.md
```

切片示例：

| 切片 | 端到端行为 | 必含测试 |
|---|---|---|
| 1. 模型列表与查询 | 用户按名称、状态、创建人查询模型并分页查看 | API 契约、前端空态/加载态、分页参数 |
| 2. 创建模型草稿 | 用户创建模型草稿，系统校验编码唯一性和必填项 | Domain 行为、API 错误、表单校验 |
| 3. 编辑字段 | 用户维护字段编码、类型、长度、必填和默认值 | 字段规则单测、组件交互测试 |
| 4. 发布前校验 | 用户触发校验，系统返回字段级错误 | Domain 校验、API 字段错误结构、UI 错误定位 |
| 5. 发布版本 | 校验通过后生成不可变发布版本，下游只能查询发布版本 | 状态流测试、契约测试、E2E 关键路径 |

推荐提示词：

```text
基于 PRD、产品总体设计 / 功能架构、已评审交互设计、冻结 OpenAPI 和架构设计，
使用 docs/templates/vertical-slice-issue-template.md
把“数据中台数据建模 MVP”拆成 5 个垂直切片。
每个切片都必须包含页面/交互、API、后端、前端、测试 seam、验收标准和回滚点。
```

阶段门禁：

- [ ] 每个切片都贯穿页面/交互、API、后端、前端和测试。
- [ ] 每个切片都能独立验收。
- [ ] 每个切片都有明确验证命令或人工验收步骤。

## 15. 阶段 12：实现与 TDD

进入实现前先使用 `yss-router` 选择最小技能集。

推荐提示词：

```text
使用 yss-router，基于“数据建模 Slice 4：发布前校验”的 PRD、产品总体设计 / 功能架构、交互设计、冻结 OpenAPI 和架构设计，
选择最小 YSS 技能集，并输出前端、后端、Repository/MyBatis、Controller、API client 的实现顺序。
```

TDD 顺序示例：

```text
1. 写发布前校验的 Domain 行为测试，并确认失败。
2. 写 API 契约测试，确认字段级错误结构。
3. 实现 Domain 校验规则和 Application 用例。
4. 实现 GatewayImpl / Repository 查询必要数据。
5. 实现 Controller 和 Web DTO / VO 转换。
6. 实现前端校验按钮、错误展示和 loading / error / empty 状态。
7. 跑单元、契约、组件或 E2E 验证。
```

实现阶段技能路由示例：

| 场景 | 技能 |
|---|---|
| 后端领域行为 | `yss-domain`、`yss-backend-scaffold-domain` |
| 持久化 | `yss-repository`、需要分页/批量/数据源时加 `yss-mybatis` |
| Web 接口 | `yss-web-controller`、`yss-dto` |
| 前端页面 | `yss-ui`、`yss-page-module-development`、`api-integration` |
| OpenAPI client 刷新 | `yss-openapi`，只在 Freeze 后或按实现契约刷新时使用 |

阶段门禁：

- [ ] 先有失败测试或明确验证方式。
- [ ] 实现没有绕过冻结 OpenAPI。
- [ ] 前端实现符合已评审页面流和交互状态矩阵。
- [ ] 前端请求、分页和参数治理下沉到 Hook。
- [ ] 后端分层没有穿透。
- [ ] 安全红线未被 AI 直接实现；需要时已标记人工审查。

## 16. 阶段 13：独立审查与 fresh verification

实现者不能审查自己。审查要优先看风险，而不是只总结做了什么。

审查重点：

- OpenAPI 与实现是否一致。
- YSS DDD 分层是否被破坏。
- Domain 是否泄漏持久化或 Web 细节。
- Controller 是否穿透 Repository。
- 页面实现是否符合已评审原型、用户流和状态矩阵。
- 前端是否符合 YTable、YssFormily、Hook、状态治理规范。
- 字段级错误、状态冲突和权限不足是否覆盖。
- 测试是否覆盖关键业务 seam。
- 是否触碰数据库迁移、权限、原生 SQL、加密或公共 API。

fresh verification 记录示例：

```text
验证日期：YYYY-MM-DD
验证人：<name or agent>
验证命令：
- backend: mvn test -pl data-modeling-service
- frontend: pnpm test data-modeling
- contract: pnpm openapi:lint docs/api/specs/data-modeling.yaml
- e2e: pnpm e2e data-model-publish.spec.ts
结果：通过 / 失败
失败处理：<如失败，回到哪个切片或阶段>
```

阶段门禁：

- [ ] 独立 review 无阻断项。
- [ ] fresh verification 是本轮最新结果，不复用旧输出。
- [ ] 失败项已回到实现或设计阶段处理。

## 17. 阶段 14：发布、实施与用户指南

发布不是“代码合并了”就结束。数据建模这类平台能力通常需要实施材料。

建议资产：

```text
docs/releases/v0.1.0-data-modeling.md
docs/implementation/customer-a-data-modeling-rollout.md
docs/user-guide/data-modeling.md
```

发布说明至少包含：

- 用户可见变化。
- 新增配置项。
- OpenAPI 变化。
- 已知限制。
- 升级步骤。
- 回滚方案。
- 验收清单。

实施记录至少包含：

- 初始化模型范围。
- 客户或环境差异。
- 数据导入方式。
- 验收人员和验收结果。
- 回滚步骤。
- 现场问题和后续任务。

用户指南至少覆盖：

- 如何创建模型草稿。
- 如何维护字段。
- 如何执行发布前校验。
- 如何处理字段级错误。
- 如何发布版本。
- 如何查看发布历史。

阶段门禁：

- [ ] 发布说明和实施步骤已写。
- [ ] 回滚方案可执行。
- [ ] 用户能按指南完成核心流程。
- [ ] 人工审查项已经确认或明确延后。

## 18. 阶段 15：复盘沉淀

复盘要把项目经验回流到可复用资产，而不是只写一句“下次注意”。

建议资产：

```text
docs/process/sprint-retros/data-modeling-v0.1.0-retro.md
CONTEXT.md
AGENTS.md
docs/adr/
docs/user-guide/
```

复盘问题：

- 哪些术语在 PRD、API、代码和实施中不一致？
- 哪些需求反复变化，是否应该提前 grill？
- 哪些 OpenAPI 字段在 Freeze 后仍被修改，原因是什么？
- 哪些测试 seam 缺失导致回归风险？
- 哪些实施问题应该写入用户指南？
- 哪些规则应该上升到 `CONTEXT.md`、ADR 或 `AGENTS.md`？

阶段门禁：

- [ ] 复盘结论不是空泛总结，而是落到文档、规则或 backlog。
- [ ] 垂直切片 Issue 已完成验证并收口。
- [ ] 下一轮同类需求可以复用本次资产。

## 18. 人类参考用总清单

开始前：

- [ ] 使用 `yss-product-lifecycle` 判断阶段。
- [ ] 明确这是完整功能、bug、tweak 还是探索。
- [ ] 明确本轮只推进一个阶段。
- [ ] Prompt 已写清背景、目标、输入资产、边界、输出和验证方式。
- [ ] 如果需求不清，先要求 AI 用苏格拉底式问题追问，不直接生成 PRD 或代码。
- [ ] 已明确本轮由哪个 Agent 角色负责，是否需要人工决策。

进入开发前：

- [ ] Opportunity / Discovery 已沉淀，或明确跳过原因。
- [ ] `grill-with-docs` 已澄清核心业务规则。
- [ ] PRD 有验收标准和 OpenAPI 影响。
- [ ] 产品总体设计 / 功能架构、页面 / 原型 / 交互设计已评审，并能覆盖 P0 用户故事、状态和异常路径。
- [ ] 交互设计发现的需求缺口已回填 PRD，PRD 和设计资产已互相链接。
- [ ] API 影响记录和契约草案 / OpenAPI Draft 已完成；涉及 API 时已通过设计审查并 Freeze。
- [ ] 工程基线和 YSS DDD 分层已确认。
- [ ] 垂直切片 Issue 目标单一。
- [ ] 垂直切片可独立验收。
- [ ] `yss-router` 已选择最小技能集。
- [ ] Agent Brief 已包含目标、非目标、验收标准、OpenAPI 状态、安全红线和验证命令。
- [ ] 不存在多个 Agent 同时修改同一契约、同一聚合或同一页面的冲突。

完成前：

- [ ] 业务行为有测试或明确验证方式。
- [ ] 独立审查无阻断项。
- [ ] fresh verification 已记录。
- [ ] 发布说明、实施步骤、回滚方案和用户指南齐备。
- [ ] 复盘结论已回流到项目资产。
- [ ] 主 Agent 已检查所有子 Agent 输出，而不是直接相信总结。
- [ ] 触碰安全红线的内容已人工确认或标记 `TODO-HUMAN-REVIEW`。

## 19. 常见错误

| 错误 | 后果 | 修正 |
|---|---|---|
| 想法一出来就写代码 | 业务边界反复变，返工多 | 先用 `yss-product-lifecycle` 分诊 |
| Prompt 只写“帮我做” | AI 猜上下文、猜边界、猜输出 | 写清背景、目标、输入资产、边界、输出和验证 |
| 一开始就让 AI 给答案 | 关键假设被隐藏 | 先用苏格拉底式提问暴露用户、痛点、反例和验收 |
| 让 AI 代替人类做业务取舍 | 需求看似完整但没有责任人 | 已确认、待确认、非目标和人工审查分开记录 |
| Discovery 只写背景 | 无法支撑 PRD | 写清用户、痛点、MVP、非目标和成功标准 |
| 把 PRD 当成一次性冻结文档 | 原型发现的问题无法回流，需求和体验分裂 | PRD 初稿先建立基线，交互评审后再校准冻结 |
| PRD 里 OpenAPI 影响写“待定” | 前后端无法并行 | 先补 Draft 或明确无 API 影响 |
| PRD 后直接写 OpenAPI | 页面流、状态和异常交互缺失，接口返工 | 先补页面清单、原型和交互状态矩阵 |
| Draft 后直接开发 | 契约在实现中漂移 | 先工程基线、设计审查，再 Freeze |
| 按技术层拆任务 | 很久无法演示价值 | 按垂直切片拆 |
| Skill 名称当装饰 | AI 没有按规程执行 | 明确 skill、阶段、输入资产、输出路径和停止点 |
| 实现时跳过 `yss-router` | 技能漏用或规范冲突 | 先选最小技能集 |
| 因为是 YSS 项目加载全部 skills | 上下文膨胀且约束互相干扰 | 先选主技能，按需要补副技能 |
| Agent Brief 不完整 | 子 Agent 反复问背景或自行猜测 | 用 brief 写清目标、非目标、验收、验证和安全红线 |
| 多个 Agent 并行改同一文件 | 冲突、重复实现、结论不一致 | 只并行独立任务，主 Agent 负责整合 |
| AI 自己审查自己 | 同类错误容易漏 | 安排独立 review |
| 主 Agent 不复核子 Agent 输出 | 子 Agent 错误被带入主线 | 主 Agent 检查 diff、测试、冲突和资产落点 |
| 验证只说“应该没问题” | 不能发布 | 记录 fresh verification 命令和结果 |
| 发布后不写实施反馈 | 同类现场问题重复出现 | 回流到实施记录、用户指南和复盘 |

## 20. 可直接复用的 AI 交互模板

### 20.1 生命周期分诊

```text
使用 yss-product-lifecycle。
背景：<一句话说明产品/模块/变更>。
输入资产：请先检查 AGENTS.md、CONTEXT.md、docs/discovery/、docs/requirements/、docs/design/、docs/api/specs/、docs/architecture/、docs/adr/、docs/requirements/issues/。
目标：判断当前生命周期阶段和缺失资产。
边界：不要写业务代码，不要替我确认未决业务规则。
输出：当前阶段、阶段依据、已有资产、缺失资产、是否阻塞、下一步、推荐技能、下一轮可直接使用的 prompt。
```

### 20.2 苏格拉底式需求追问

```text
使用 grill-with-docs 和苏格拉底式提问法。
主题：<功能名>。
请不要生成 PRD 或方案，先连续提出 10 个必须回答的问题。
问题必须覆盖用户、痛点、MVP、非目标、页面流、异常路径、成功标准、OpenAPI 影响、测试 seam 和安全红线。
每个问题后说明它会影响哪个产物：CONTEXT、PRD、Design、OpenAPI、Architecture、Issue 或 Test。
最后输出：已确认、待确认、非目标、建议写入 CONTEXT 的术语、需要 ADR 的取舍。
```

### 20.3 产品总体设计 / 功能架构

```text
基于 <PRD 路径>，为 <功能名> 生成产品总体设计 / 功能架构。
请使用 docs/design/templates/product-overview-design-template.md。
重点输出：设计目标、用户主流程、业务对象与状态、功能域与模块边界、Strategic DDD Check、低保真原型 / 页面草图、页面/API/数据/权限/审计影响、PRD 回填项、开放问题和评审结论。
边界：不要写交互细节、不要生成 OpenAPI Draft、不要实现代码；只判断是否足以进入页面 / 原型 / 交互设计。
保存到 docs/design/<feature>-product-overview-design.md。
结论必须明确：Approved 可进入页面 / 原型 / 交互设计或 PRD 校准；Blocked 需先补齐产品边界、业务对象、模块边界、低保真原型、页面/API/数据/权限影响或 PRD 回填项。
```

### 20.4 页面 / 原型 / 交互设计

```text
使用 product-design-prototype。
基于 <PRD 路径> 和 docs/design/<feature>-product-overview-design.md，为 <功能名> 输出页面 / 原型 / 交互设计资产。
如果缺少产品总体设计 / 功能架构，先阻断并要求补齐；不要直接继续生成交互设计。
请生成页面清单、用户主路径、异常路径、低保真线框说明、交互状态矩阵、权限状态、空态/加载态/错误态。
请明确这些设计如何反推 OpenAPI 字段、错误结构、分页筛选、权限和前端验收标准。
请同时列出需要回填 PRD 的需求缺口、验收标准或非目标范围。
保存到 docs/design/<feature>-interaction-spec.md。
完成后输出 prototype-review 评审输入清单。
```

### 20.5 原型评审

```text
使用 prototype-review。
输入资产：<PRD 路径>、docs/design/<feature>-product-overview-design.md、docs/design/<feature>-interaction-spec.md、docs/design/<feature>-state-matrix.md、<原型链接或线框说明>。
请审查页面覆盖、主路径、异常路径、loading/empty/error/no-permission/readonly/conflict/dirty-form 状态、权限行为、字段级错误、PRD 回填项和 OpenAPI 反推清单。
输出：通过/阻断、阻断项、非阻断建议、高保真 HTML 原型输入就绪度、Contract Draft / OpenAPI Draft 输入风险和下一步。
```

### 20.6 高保真 HTML 原型

```text
使用 high-fidelity-html-prototype。
基于 <PRD 路径>、docs/design/<feature>-product-overview-design.md、docs/design/<feature>-interaction-spec.md、docs/design/<feature>-state-matrix.md 和 docs/design/<feature>-prototype-review.md，
为 <功能名> 生成 Ant Design v6 高保真可交互 HTML 原型。
输出路径必须是 docs/design/prototypes/<feature>/index.html。
请覆盖主流程、关键异常、loading/empty/error/no-permission/readonly/disabled/conflict/success 状态、表单校验、弹窗/抽屉、响应式断点。
完成后给出 Ant Design v6 版本依据、`@ant-design/cli` 查询过的组件 / token / demo 和本地浏览器验证证据。
```

### 20.7 PRD 校准 / 需求冻结

```text
基于 <PRD 路径>、<产品总体设计路径>、<交互设计路径> 和 <高保真 HTML 原型路径>，执行 PRD 校准。
请检查页面流、状态矩阵、异常路径、权限状态和验收标准是否已经回填 PRD。
输出：需要更新的 PRD 条目、仍待确认的问题、可以冻结的范围、不能进入 API 影响分析 / 契约草案的风险。
```

### 20.8 技能路由

```text
使用 yss-router。
输入资产：<PRD 路径>、<交互设计路径>、<OpenAPI Freeze 路径或无 API 影响记录>、<架构设计路径>、<垂直切片路径>。
目标：选择最小 YSS 技能集。
请说明每个候选技能需要或不需要的理由，尤其是 yss-domain、yss-repository、yss-mybatis、yss-web-controller、yss-ui、api-integration、yss-openapi。
边界：不要实现代码，只输出技能路由、实施顺序、测试 seam 和验证建议。
```

### 20.7 Agent Brief

```text
请基于 docs/templates/agent-brief-template.md 为 <垂直切片标题> 生成 Agent Brief。
必须包含：
- 背景和相关资产路径
- 目标和非目标
- 页面 / 原型 / 交互设计状态
- OpenAPI Draft / Freeze 状态
- 推荐 skills
- 验收标准
- 实现提示
- 验证命令
- 安全红线和人工审查点
要求：内容自包含，使 Code Agent 无需读取聊天历史即可开始。
```

### 20.8 子 Agent 分派

```text
请判断以下任务是否适合并行 Agent：
<任务列表>
请按“可并行 / 不可并行 / 需要先串行澄清”分类。
对每个可并行任务输出独立 Agent brief，包含目标、输入资产、不得修改的范围、预期输出和验证方式。
如果任务会修改同一文件、同一 OpenAPI、同一聚合或同一页面，请标记为不可并行。
```

### 20.9 完成前验证

```text
请基于本次 diff 和任务目标，生成 fresh verification 记录。
列出必须运行的验证命令并执行。
输出命令、结果、失败项、未验证项和原因。
不要只说“看起来可以”。
```
