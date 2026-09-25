# 技能迁移说明

本文记录已退役技能入口的迁移路径。退役技能不保留物理目录、投影或 lock 条目；本文件是历史名称的唯一持久兼容说明。

## `grill-me` 入口退役（2026-09-24）

`grill-me` 仅转发到 `grilling`，现已硬退役。新请求直接使用 `grilling`；旧 ID 返回 `skill-retired`，不保留兼容目录、投影、Registry 或 lock 条目。历史候选与冻结证据只读保留。

## 后端组件源码索引双轨迁移（2026-09-19）

后端组件 Skill 的单一 `references/source-index.md` 已迁移为平台线选择页。生成证据分别保存在 `source-index.boot2-java8.md` 与 `source-index.boot3-java17.md`，来源根分别由 `YSS_SOURCE_ROOT_BOOT2_JAVA8` 与 `YSS_SOURCE_ROOT_BOOT3_JAVA17` 显式提供。

- 精确接入、代码生成和配置指导必须从批准的 `platform_configuration.component_platform_line` 选择索引，并以相同 `--platform-line` 和匹配源码根运行 freshness 检查。
- 平台线缺失、源码根错配、组件 tree 漂移或组件子树 dirty 均返回 `blocked`；禁止退回另一代索引，也不能用源码可编译替代构件兼容认证。
- 历史提交中的单轨索引只作只读证据；当前刷新不得覆盖另一平台线或把两个变量指向同一代源码。

## 前端 Skill 面二次收敛（2026-09-20）

以下入口已硬退役，不保留运行时 alias、物理目录、投影、Registry 条目或 lock 条目：

- `page-skeleton`：页面目录、职责拆分和组合流程由 `yss-ui-business-page-generation` 持有。
- `component-selection-imports`：组件路由、真实导出和受控 Ant Design Vue 回退由 `yss-ui` 及其 `references/component-routing.md` 持有。
- `page-list-module`：页面编排归 `yss-ui-business-page-generation`，请求参数与异步状态归 `yss-hook`，表格 API、分页、选择态和高度归 `ytable-usage`。
- `page-form-module`：页面容器生命周期归 `yss-ui-business-page-generation`，Schema、模式、联动和分步行为归 `yss-formily` 路由的专项 Skill。
- `yss-use-table-height`：YTable/YEditTable 高度分别归 `ytable-usage`、`yedit-table-usage`。
- `yss-use-tree-height`：YTree 高度归 `ytree-usage`。
- `vue3-best-practices`：请求竞态、单一参数源和组件状态规则归 `yss-hook`；长整型与普通 number 的类型边界以 `yss-api-integration` 为准。

上游名称 `use-table-height`、`use-tree-height` 不再作为 Registry alias，只在 `.yss-skills-manifest.json` 的排除清单和历史证据中出现。活跃合同必须直接使用替代入口；命中旧 ID 返回 `skill-retired`。

## 后端设计与脚手架入口硬退役（2026-09-20）

以下入口已完成硬退役，不保留 alias、物理目录、投影、Registry 条目或 lock 条目：

- `yss-mvc-design`：新工作使用 `yss-technical-design`。MVC schema、规则和 API impact 的 OpenAPI review 条件依赖由技术设计入口持有。
- `yss-mvc-data-analysis-project-initializer`：新工作使用 `yss-layered-mvc-scaffold-generator` 的 `mvc-data-analysis-v1` Profile，继续保留六模块、H2、CONTEXT handoff、skillUtils 和独立 Git 行为。
- `yss-backend-scaffold-parent`：新工作使用 `yss-ddd-scaffold-generator`；工程基线由生成器内部 `references/engineering-baseline.md` 和验证器持有。

硬退役统一规则：

- 旧 Slice、Technical Design 或 Scaffold Contract 因 Registry、Profile 或 generator 摘要变化变为 `stale`，必须重新编译和批准。
- 新请求命中旧 ID 返回 `skill-retired`，迁移路径只从本文件和永久 tombstone 查询。
- 历史冻结证据保持只读；活跃调用者必须直接使用替代入口，不得恢复兼容壳。

## DDD 分层包装与前端组件总入口收敛（2026-09-15）

以下入口已硬退役，不保留 alias、物理目录、投影或 lock 条目：

- DDD 嵌套包装：`yss-backend-scaffold-adapter`、`yss-application-layer-reference`、`yss-domain-layer-reference`、`yss-infrastructure-layer-reference`、`yss-web-layer-reference`。
- 旧数据分析初始化器：`yss-mvc-scaffold-generator`，新工作统一使用 `yss-layered-mvc-scaffold-generator`；数据分析工程选择 `mvc-data-analysis-v1` Profile。
- 前端组件总入口：`yss-components`。

DDD 脚手架的 Parent 工程约束由 `yss-ddd-scaffold-generator/references/engineering-baseline.md` 内部持有。生成后的 Application、Domain、Infrastructure、Web 和 Adapter 实现从 `yss-ddd-scaffold-generator/references/layer-skill-routing.md` 路由到顶层权威 Skill，不再把普通参考目录暴露为可发现 Skill。

前端页面统一从 `yss-ui` 路由：完整页面使用 `yss-ui-business-page-generation`，组件选型与导入使用 `yss-ui/references/component-routing.md`，表格、树、Formily 和 Hook 使用各自专项 Skill；组件高度由对应表格或树专项持有。没有独立 Skill 的复杂组件契约集中在 `yss-ui/references/specialized-components.md`。`yss-formily` 保留为薄路由器，不再复制表单代码骨架和专项规则。

旧 ID 只允许存在于本迁移记录、retired/obsolete 清单、负向测试和不可变历史证据中。

## 技能面收敛与前端入口合并（2026-09-05）

以下 Skill 已一次性硬退役，不保留 alias、兼容目录、投影或 lock 条目：

- 通用路由与维护工具：`ask-matt`、`dispatching-parallel-agents`、`loop-me`、`migrate-to-shoehorn`、`scaffold-exercises`、`setup-pre-commit`、`setup-ts-deep-modules`、`teach`、`writing-beats`、`writing-fragments`、`writing-shape`。
- 前端重复或失效入口：`prototype-page-acceptance`、`yss-page-module-development`（及旧名 `page-module-development`）、`yss-microapp-commit`（及旧名 `microapp-commit`）。

新工作迁移到：

- 通用生命周期路由直接使用 `yss-product-lifecycle`；并行执行遵循 `.template-spec/process/subagent-collaboration.md` 和运行时原生协调能力。
- 前端业务页面统一使用 `yss-ui` + `yss-ui-business-page-generation`，按影响面加载组件、Formily、表格、树、API、主题和高度专项 Skill。
- 原型还原使用批准且摘要当前的 Visual Baseline、`frontend_implementation_plan` 与 `frontend_implementation_verification`；只做 type-check 不构成还原通过。
- 前端与微应用提交统一使用 `frontend-commit`，scope 以仓库真实规则和业务模块为准，不再按目录机械映射。
- 已退役的个人工作流、教学、练习、写作实验和 Shoehorn 专项迁移能力不再随 YSS 模板分发；需要时由使用者在目标仓库单独安装。

历史冻结证据和候选快照继续只读保留。活跃 Registry、Recipe、任务包、模板、脚本和文档不得再把这些 ID 作为正向输入。

## 实现合同与源码索引技能硬替换（2026-09-04）

`yss-router` 已由 `yss-implementation-contract-compiler` 硬替换；`yss-source-index` 已由 `yss-skill-source-index-refresh` 硬替换。两个旧 ID 不保留 alias、兼容目录、投影或 lock 条目，也不能作为 Recipe、合同、模板或脚本的正向输入。

同步升级内容：

- 技能注册表和调用者使用新 canonical ID；Registry、编译器合同、Slice Implementation Contract 与 YSS Skill Execution Result 使用 schema v2。
- Recipe 只引用 dotted capability；类型化依赖只由 `.template-spec/agents/yss-skill-registry.yaml` 持有。
- 旧 schema v1 输入明确拒绝并返回迁移提示，不自动升级。
- 历史冻结证据和不可变候选快照不改写。旧 ID 仅可继续出现在本迁移记录、`OBSOLETE` 阻断集合及负向测试中。

## high-fidelity-html-prototype

`high-fidelity-html-prototype` 已退役，不再作为 实现合同编译器 alias、默认发现入口或独立物理技能存在。

新工作迁移到：

- 阶段合同：`yss-prototype-stage`
- 原型档位与主入口：`yss-prototype-stage` 的 H1/H2 路由
- Codex 产品设计能力：按档位条件使用 `product-design:index`
- 当前 H1/H2：根 `DESIGN.md` 驱动的离线 HTML/CSS/JS；旧 Provider 路线见下方退役记录
- 真实组件核验：不属于原型档位；进入已批准切片后由 `yss-ui` 基于目标 lockfile 执行，并写入前端实现验证
- 独立低保真评审：`prototype-review`

已关闭的 Prototype Evidence schema v1/v2/v3、旧 artifact ID、AntD CLI、浏览器验证和确认记录只读保留。在途 UI 工作迁移到 Prototype Evidence schema v4、Visual Baseline schema v1 与 `artifact.prototype-deliverable` 后再关闭门禁；无 UI 影响不创建空包。不得创建同名兼容目录或删除历史证据。
