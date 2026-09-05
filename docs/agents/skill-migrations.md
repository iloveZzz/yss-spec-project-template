# 技能迁移说明

本文记录已退役技能入口的迁移路径。退役技能不保留物理目录、投影或 lock 条目；本文件是历史名称的唯一持久兼容说明。

## 技能面收敛与前端入口合并（2026-09-05）

以下 Skill 已一次性硬退役，不保留 alias、兼容目录、投影或 lock 条目：

- 通用路由与维护工具：`ask-matt`、`dispatching-parallel-agents`、`loop-me`、`migrate-to-shoehorn`、`scaffold-exercises`、`setup-pre-commit`、`setup-ts-deep-modules`、`teach`、`writing-beats`、`writing-fragments`、`writing-shape`。
- 前端重复或失效入口：`prototype-page-acceptance`、`yss-page-module-development`（及旧名 `page-module-development`）、`yss-microapp-commit`（及旧名 `microapp-commit`）。

新工作迁移到：

- 通用生命周期路由直接使用 `yss-product-lifecycle`；并行执行遵循 `docs/process/subagent-collaboration.md` 和运行时原生协调能力。
- 前端业务页面统一使用 `yss-ui` + `yss-ui-business-page-generation`，按影响面加载组件、Formily、表格、树、API、主题和高度专项 Skill。
- 原型还原使用批准且摘要当前的 Visual Baseline、`frontend_implementation_plan` 与 `frontend_implementation_verification`；只做 type-check 不构成还原通过。
- 前端与微应用提交统一使用 `frontend-commit`，scope 以仓库真实规则和业务模块为准，不再按目录机械映射。
- 已退役的个人工作流、教学、练习、写作实验和 Shoehorn 专项迁移能力不再随 YSS 模板分发；需要时由使用者在目标仓库单独安装。

历史冻结证据和候选快照继续只读保留。活跃 Registry、Recipe、任务包、模板、脚本和文档不得再把这些 ID 作为正向输入。

## 实现合同与源码索引技能硬替换（2026-09-04）

`yss-router` 已由 `yss-implementation-contract-compiler` 硬替换；`yss-source-index` 已由 `yss-skill-source-index-refresh` 硬替换。两个旧 ID 不保留 alias、兼容目录、投影或 lock 条目，也不能作为 Recipe、合同、模板或脚本的正向输入。

同步升级内容：

- 技能注册表和调用者使用新 canonical ID；Registry、编译器合同、Slice Implementation Contract 与 YSS Skill Execution Result 使用 schema v2。
- Recipe 只引用 dotted capability；类型化依赖只由 `docs/agents/yss-skill-registry.yaml` 持有。
- 旧 schema v1 输入明确拒绝并返回迁移提示，不自动升级。
- 历史冻结证据和不可变候选快照不改写。旧 ID 仅可继续出现在本迁移记录、`OBSOLETE` 阻断集合及负向测试中。

## high-fidelity-html-prototype

`high-fidelity-html-prototype` 已退役，不再作为 实现合同编译器 alias、默认发现入口或独立物理技能存在。

新工作迁移到：

- 阶段合同：`yss-prototype-stage`
- 原型档位与主入口：`yss-prototype-stage` 的 H1/H2 路由
- Codex 产品设计能力：按档位条件使用 `product-design:index`
- Antdv Next 精确版本事实：默认 H2 使用 `yss-antdv-next-design`
- Ant Design v6 事实与 CLI：仅显式 React 兼容 H2 使用 `yss-antd-design`
- 真实组件核验：不属于原型档位；进入已批准切片后由 `yss-ui` 基于目标 lockfile 执行，并写入前端实现验证
- 独立低保真评审：`prototype-review`

已关闭的 Prototype Evidence schema v1/v2/v3、旧 artifact ID、AntD CLI、浏览器验证和确认记录只读保留。在途 UI 工作迁移到 Prototype Evidence schema v4、Visual Baseline schema v1 与 `artifact.prototype-deliverable` 后再关闭门禁；无 UI 影响不创建空包。不得创建同名兼容目录或删除历史证据。
