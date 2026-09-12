# 三个子项目 CLI 统一升级

> 文档类型：L3 模板维护实现与验证记录。仓库身份：`template-source`。词汇合同：根 `CONTEXT.md`。本轮只维护模板、CLI、分发和验证资产，产品工作单元与 `context_reconciliation` 为 `not-applicable`，原因是没有实例产品需求或业务实现。

## 范围与结果

三个子项目使用共享内核 `0.2.0`，整体交付状态为 `implementation-ready`。候选来自 `working-tree`，不是固定提交的发布候选。

| CLI | 旧版本 | 本轮版本 | 模板 |
|---|---|---|---|
| create-yss-harness-design | 0.5.2 | 0.6.0 | yss-harness-design-agent |
| create-yss-harness-backend | 0.2.2 | 0.3.0 | yss-harness-backend-agent |
| create-yss-harness-frontend | 0.1.4 | 0.2.0 | yss-harness-frontend-agent |

三个包统一提供 `init`、`attach`、`sync`、`diff`、`doctor`、`recover`、`update` / `upgrade`。战略包迁为薄包，移除被替代的独立实现。家族配置、模板清单适配、参数与 JSON、文件计划、事务和恢复均经过共享实现。

`init` 拒绝非空目录；`attach`、`sync`、`recover` 默认预览；`diff` 始终只读。参数按命令校验，`--json` 不改变写入授权。README、Context 和战略 DESIGN 保留，`.gitignore` 只管理家族区块。普通同步保留退役文件，只有显式 `--prune --apply` 且旧所有权、字节和 mode 均可信时删除。force 无法放宽身份、用户资产或删除边界；战略受管冲突仍需人工解决。

技能锁在候选目录生成，按实际技能集合校验，未知技能不自动登记，已登记扩展及其投影保留。实例校验复用分发的 Context、profile 和技能工具，不调用整个模板维护测试。最终校验失败会恢复文件、技能锁和 metadata；独立 `recover` 只处理未完成事务，不提供成功事务的历史回退。

## Fresh Verification

普通测试消费现有快照，不重建模板。构建测试只在临时 Git 仓库验证固定提交和 WORKTREE 分发。三个包的 prepack 仅执行 `verify-bundle`。

| 验证 | 本轮证据 |
|---|---|
| 共享内核 | 47 项通过；包含三家族写入失败、校验失败、中断、备份损坏、并发修改，以及持久化屏障矩阵 |
| 本体相关兼容 | 43 项通过；入口、家族身份、合同、错误输出、apply 结果；本体 CLI 工作区保持干净 |
| 三个薄包 | 各自 `pnpm test`、`pnpm verify-bundle` 通过 |
| 三个真实安装包 | `npm pack` 后，干净目录执行 `npm install --offline --ignore-scripts`；各自安装后命令契约及实际 `.bin` 入口通过 |
| 额外三家族边界 | 实际安装包覆盖符号链接、硬链接、未检出的声明 gitlink、嵌套仓库、用户文档和决定证据、本地技能的显式登记与保留 |
| 战略旧实例 | 使用真实 0.5.2 CLI 生成 v1 实例，再用安装的 0.6.0 执行 diff、sync、doctor；保护文件哈希保持一致 |
| 战略迁移恢复 | 安装后契约注入 metadata 替换后的进程退出；recover 恢复原始 v1 字节，再成功迁移至 v2；预览不迁移 |
| 来源一致性 | 三个包的 core 和 template 分别执行 WORKTREE `--check`，共 6 项通过 |
| 模板影响面 | 本体与三个模板命中影响面的 `verify-template-fast` 通过；本体 tooling 64 项通过 |

详细命令、退出码、包 SHA-256、运行日志见同目录 `verification/`。`package-contract.mjs` 是三家族共用的实际入口契约；`.template-source/scripts/cli-boundaries.mjs` 补充安装包边界，统一入口是 `.template-source/scripts/verify-cli-upgrade.mjs`。入口可通过 `YSS_CLI_DESIGN_ROOT`、`YSS_CLI_BACKEND_ROOT`、`YSS_CLI_FRONTEND_ROOT` 指向源码包或解包安装目录。

## 本轮自检与修复复盘

真实模板验收暴露了两处兼容缺口，并在重新打包后复验：

1. 前后端模板 Context 缺少 schema v1 声明和业务词汇表表头，实例校验正确阻止提交并回滚。本轮补齐格式，保留已有词汇内容。
2. 真实战略 v1 metadata 还登记了已退出分发的 `scripts/instantiate-harness`。迁移现在保留原文件，将其移出持续管理并记录诊断警告；不会从旧记录授予 prune 权限，也不会再次分发旧创建脚本。
3. 交付前同步检查仍把战略薄包已删除的 `src/command-runner.mjs` 当作 legacy 目标。同步入口现只为仍使用旧 `src` 布局的 `create-yss-spec` 生成该副本；三个子项目 CLI 继续由各自 `sync-core` 和 core lock 管理。

v1 来源、家族、变量和历史内容哈希必须合法，缺少 mode 或所有权证据不授予 prune 权限；本地修改不提升为模板基线。批准状态和用户决定不随 metadata 迁移重写。本轮为维护者自检，没有宣称独立审查。

## 交付边界

保留工作区已有并行修改，未执行 Git 暂存、提交、推送或 npm 发布。开发快照明确记录 `working-tree`，包含快照准备时的模板工作区内容；不能将其解释为全部并行工作的发布批准。

本体 `create-yss-spec` 包未修改。旧 dev CLI 只保留身份拒绝覆盖，没有恢复子模块或分发。产品 Spec、Ticket、原型、OpenAPI 和业务代码均为本轮 `not-applicable`。

后续获授权的交付阶段仍需以固定提交重建、执行不可裁剪的完整发布验证，再分别处理 Git 交付与 npm 发布。本轮没有将快速验证等同于 `release-ready`。
