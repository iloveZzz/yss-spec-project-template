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

每个 Harness 内项目至少登记 `project_type`、`project_name`、`project_root` 和 `repository_scope`。`repository_scope` 只允许 `external-repository`、`harness-apps` 或 `git-submodule`。同一 Git monorepo 下的多个项目可以共用一条仓库登记，但必须逐项目列出根路径和独立验证命令；不同 Git 仓库必须分别登记，`git-submodule` 的每个子仓各一条。

## 1.2 前端 / 后端验证命令

登记和执行测试、编译时按工程类型选择命令，不要把模板源的 Node 工具链命令套到产品运行时工程。

- **frontend**：依赖安装、测试、type-check 与构建优先使用 `pnpm`（例如 `pnpm test`、`pnpm type-check`、`pnpm build`）。不要默认 `npm` 或 `yarn`。
- **backend**：校验、测试与编译优先使用项目根 `./mvnw`（例如 `./mvnw validate`、`./mvnw test`、`./mvnw package`）。不要默认裸 `mvn`。
- Ticket、Slice Implementation Contract、CI 和 Review 证据必须写下实际执行的上述命令。既有仓库缺少 `pnpm` 或 Maven Wrapper 时，先记录受控例外、替代命令和责任人，再执行。
- 本模板源仓库没有产品 frontend / backend 运行时；模板源维护侧的 Node 校验命令和环境约束只记录在 `.template-source/` 治理区及 CI 配置中，不属于项目实例实现命令。

## 1.4 独立审查运行时

`work-unit.code-review` 仍使用唯一 skill `code-review`，不新增第二套审查环境或审查 skill。独立 Reviewer 必须与实现者不同 `actor_id`，并在**能执行已登记验证命令**的运行时中工作：

- 前端：已登记项目根的 `pnpm` 测试 / type-check / lint（若存在）。
- 后端：已登记项目根的 `./mvnw` 校验 / 测试；若工程已配置 Checkstyle、P3C 或 Spotless，审查时实际执行。
- `git-submodule` 必须递归检出；空 gitlink 不得当作「没有工程」。
- 模板源 `.cursor/environment.json` 只安装模板校验依赖（`jsonschema`、模板 `pnpm`），**不是**实现仓审查运行时。`project-instance` 与实现仓库的 Cloud / CI 环境自行包含 JDK、Maven Wrapper 和 `pnpm`。
- 审查任务包只写证据路径；专项 skill 只读，不得写实现。

## 1.3 `repository_scope: git-submodule`

当用户明确选择分层接入、且前端 / 后端保持独立 Git 历史、同时挂到 `project-instance` 工作树时，使用 Git submodule，而不是把实现源码复制进 Harness，也不是把 gitlink 登记成 `harness-apps`。

```text
<project-instance>/                      # superproject = 研发管理仓库
├── .gitmodules
├── apps/backend/<backend-project>/     # gitlink mode 160000
└── apps/frontend/<frontend-project>/   # gitlink mode 160000
```

强制规则：

- `layout_policy` / `implementation_path_policy` 必须是 `git-submodule-harness-apps`。挂载路径仍须是具体的 `apps/backend/<project>/` 或 `apps/frontend/<project>/`；容器根和 `app/` 单数路径一律阻断。
- 三个 `repository_scope` 必须在登记字段、Git 身份和写路径上可区分：`git-submodule` 强制 `git_url`、`gitmodules_name`、`gitlink_path`（等于 `project_root`）、`git_entry_mode: 160000`、`superproject_git_url`、`checkout_state`，并分别登记默认分支、CI、验证命令、回滚点（子仓 SHA + 父仓 gitlink SHA）；`harness-apps` 与 `external-repository` 禁止填写这些 gitlink 身份字段（可填 `不适用`）。缺 `git_entry_mode` 不得默认为普通目录。
- 子仓 `git_url` 必须与 `superproject_git_url` 不同。登记后必须用工作树对照（`git ls-files --stage`、`.gitmodules`、`inspectWorkingTreeScope`）：声明 `harness-apps` 但路径是 gitlink，或声明 `git-submodule` 但工作树只是普通目录 / 复制源码，均视为误路由并阻断。
- 只允许 `git submodule add` / `git submodule update --init` 形成 gitlink；禁止把实现仓库源码 copy、subtree 或普通 clone 进 Harness 后冒充 submodule。
- clone / CI / Cloud Agent 必须递归检出：`git clone --recurse-submodules`，或事后 `git submodule update --init`。GitHub Actions 须显式 `submodules: true|recursive` 且私有子仓另给 PAT / SSH；GitLab 须设 `GIT_SUBMODULE_STRATEGY` 并配置 job token 访问。默认不递归时目录为空，不得当作「工程不存在」去脚手架。
- 空 gitlink、未初始化、detached HEAD 或 `--force` 覆盖挂载点一律不得当成普通目录：`scaffold_status=required` 阻断，脚手架生成器即使收到 `--force` 也不得覆盖 gitlink，且不得进入「请显式传入 `--force`」普通目录覆盖 / rename 路径；禁止在 detached HEAD 上 commit，也不得把 `--output-dir` 指向 detached HEAD 子仓后 mkdir、staging 或生成工程。先在子仓检出跟踪分支，再写代码。写入前必须读取 `inspectWorkingTreeScope` 的对象结果：只有 `.writable === true` 才可写。已登记为 `git-submodule` 的空 gitlink / uninitialized / detached HEAD 必须 `.writable === false`，即使工作树探测失败也不得把返回值当成可写。
- Git 授权按仓分别计算，顺序强制为 **先子仓 commit/push，再父仓更新 gitlink**。父仓 push 使用 `git push --recurse-submodules=check`。跨仓库切片的 `delivery_order` 必须包含 `superproject-gitlink-update`。
- `.gitmodules`、gitlink 和子仓工作树不是 `create-yss-spec` 受管资产；CLI `sync` 不得创建、覆盖或删除它们。

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
- CLI 只写研发管理资产；不得创建或覆盖前后端运行时代码，不删除目标 `.git`，也不创建、覆盖或删除 `.gitmodules` 与 gitlink。
- 模板 commit 必须是 40 位不可变提交；开发测试可通过 `YSS_SPEC_TEMPLATE_REF` 覆盖，正式发布不得跟随浮动 `main`。

## 4. Fresh verification 与 checkpoint

模板仓库至少执行：

```bash
scripts/sync-skills --check
scripts/update-skill-lock --check
scripts/verify-template
```

CLI 仓库至少执行固定 commit 的 `YSS_SPEC_TEMPLATE_REF=<pinned-commit> npm test`、`npm pack --dry-run`，并在解包后的 CLI 上验证 init、attach、sync、迁移冲突和回滚。共同发布前记录两个仓库的 commit、模板快照 hash、测试结果、独立审查结论和 rollback 路径。
