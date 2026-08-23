# 实现仓库接入与跨仓库切片绑定

本文件是 Harness 仓库连接外部实现仓库的事实源。当前 `yss-spec-project-template` 与 `create-yss-spec` 的模板接管 / 同步变更属于 Harness-only 加 release-only 影响，不创建前端、后端或运行时代码目录。

## 1. 接入清单

每个受影响实现仓库必须登记：仓库地址、分支、代码所有者、CI 入口、测试 / 构建命令、允许写路径、回滚点和 MR / PR。没有登记记录时，先完成 onboarding，不能用本仓库目录代替实现仓库。

## 1.1 Harness 内实现项目路径策略

当前 Harness 明确承载运行时代码时，统一使用以下多项目布局：

```text
apps/
├── backend/<backend-project>/
└── frontend/<frontend-project>/
```

- `apps/backend/` 和 `apps/frontend/` 是项目容器，不是可生成的工程项目根；后端、前端项目必须分别位于 `apps/backend/<project>/`、`apps/frontend/<project>/`，多个项目按 `<project>` 目录并列。
- `app/backend/`、`app/frontend/` 及其所有子路径均禁止作为工程生成目标；单复数差异不能被视为等价路径。
- `allowed_write_paths`、`expected_evidence_files` 和生成器输出位置必须能回指具体项目目录；直接放开 `apps/backend/` 或 `apps/frontend/` 属于路径策略违规。
- 外部实现仓库不要求采用 Harness 的 `apps/` 布局，但仍必须登记该仓库内的实际项目根路径；跨仓库切片的写路径不得用本 Harness 的占位路径冒充真实路径。

每个 Harness 内项目至少登记 `project_type`、`project_name`、`project_root` 和 `repository_scope`。同一 Git monorepo 下的多个项目可以共用一条仓库登记，但必须逐项目列出根路径和独立验证命令；不同 Git 仓库必须分别登记。

## 1.2 前端 / 后端验证命令

登记和执行测试、编译时按工程类型选择命令，不要把模板源的 Node 工具链命令套到产品运行时工程。

- **frontend**：依赖安装、测试、type-check 与构建优先使用 `pnpm`（例如 `pnpm test`、`pnpm type-check`、`pnpm build`）。不要默认 `npm` 或 `yarn`。
- **backend**：校验、测试与编译优先使用项目根 `./mvnw`（例如 `./mvnw validate`、`./mvnw test`、`./mvnw package`）。不要默认裸 `mvn`。
- Ticket、Slice Implementation Contract、CI 和 Review 证据必须写下实际执行的上述命令。既有仓库缺少 `pnpm` 或 Maven Wrapper 时，先记录受控例外、替代命令和责任人，再执行。
- 本模板源仓库没有产品 frontend / backend 运行时；其 Node 校验仍按 `AGENTS.md` 的 Cursor Cloud 说明使用 `pnpm --dir .template-source/tooling/node`。

## 2. 影响面路由

| 影响面 | 必须绑定的记录 | 本变更结论 |
|---|---|---|
| Harness-only | change、文档路径、压力场景、fresh verification、checkpoint | required：模板仓库、CLI 仓库 |
| release-only | release note、发布顺序、观察信号、rollback | required：模板 commit → CLI 包 |
| backend-only | backend repo、分支、MR / PR、CI、API 影响 | `not-applicable`：无后端运行时代码 |
| frontend-only | frontend repo、分支、lint / type-check / build | `not-applicable`：无前端运行时代码 |
| contract-only | OpenAPI Draft / Freeze、消费者确认 | `not-applicable`：无 OpenAPI 变化 |

## 3. 本变更的跨仓库合同

- 模板仓库负责 `yss-project.yaml`、流程事实源、迁移指南、技能投影、模板校验脚本和快照可发布状态。
- CLI 仓库负责 `attach`、`sync`、受管 manifest、快照 commit、metadata、迁移计划、备份 / 回滚、端到端测试和用户说明。
- CLI 只写研发管理资产；不得创建或覆盖前后端运行时代码，不删除目标 `.git`。
- 模板 commit 必须是 40 位不可变提交；开发测试可通过 `YSS_SPEC_TEMPLATE_REF` 覆盖，正式发布不得跟随浮动 `main`。

## 4. Fresh verification 与 checkpoint

模板仓库至少执行：

```bash
scripts/sync-skills --check
scripts/update-skill-lock --check
scripts/verify-template
```

CLI 仓库至少执行固定 commit 的 `YSS_SPEC_TEMPLATE_REF=<pinned-commit> npm test`、`npm pack --dry-run`，并在解包后的 CLI 上验证 init、attach、sync、迁移冲突和回滚。共同发布前记录两个仓库的 commit、模板快照 hash、测试结果、独立审查结论和 rollback 路径。
