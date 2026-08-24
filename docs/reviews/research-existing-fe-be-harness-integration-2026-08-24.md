# YSS Harness / 研发管理仓库与既有前后端 Git 仓库关系事实研究

> 日期：2026-08-24
>
> 研究性质：只读事实研究，不作架构决策，不批准仓库布局、不宣布 attach、onboarding、跨仓库切片或发布。
>
> 来源范围：本仓库权威身份 / 流程 / 技能 / 契约文件，以及 `create-yss-spec` 第一方 GitHub 源、Git 官方 submodule 文档、GitHub / GitLab 官方文档、Cursor `environment.json` schema。不把第二手解读、论坛帖或本研究的推断当作已确认事实。

## 已确认事实

### 1. 当前工作区身份：本仓库是 `template-source`

- 根清单当前为 `schema_version: 1`、`repository_mode: template-source`（`yss-project.yaml:1-2`）。
- ADR-0002 规定：根目录 `yss-project.yaml` 是 CLI 与 Agent 共享的稳定身份契约，只声明 `schema_version` 和 `repository_mode`；模板源仓库使用 `template-source`，`create-yss-spec` 生成的仓库使用 `project-instance`。项目名称、团队规模和 Tracker 等易变信息不放入该清单。身份不得靠目录、Git 远程或占位符推断（`docs/adr/0002-yss-project-repository-mode.md` 全文）。
- `AGENTS.md` §1：每个任务先读 `yss-project.yaml`；`template-source` 走模板维护流程，不默认生成具体产品的 Spec、原型、OpenAPI 或垂直切片 Ticket；`project-instance` 才按产品研发生命周期分诊（`AGENTS.md:5-13`）。
- `AGENTS.md` 的 Cursor Cloud 说明再次写明：本仓库是 `template-source` Harness / 研发管理仓库，没有前端 / 后端运行时应用（`AGENTS.md:112-114`）。
- `CONTEXT.md` 把上述身份写成流程术语：
  - 研发管理仓库：承载 Spec、OpenAPI、架构、Ticket、验证、发布和复盘；**不等同于前端 / 后端代码 monorepo**（`CONTEXT.md:69`）。
  - 实现仓库：承载前端、后端或其他运行时代码及其 Git、CI、MR / PR、测试命令和发布流水线；**不要把实现仓库的源码所有权混入研发管理仓库**（`CONTEXT.md:70`）。
  - 跨仓库契约变更：需要两个或多个独立仓库协同实现、验证和按顺序发布；任一参与仓库未完成契约对齐和集成验证时，不得单独声称整体可发布（`CONTEXT.md:71`）。
  - 模板源仓库（`template-source`）：承载 `yss-spec-project-template` 权威模板资产；**只管理可复用模板，不承载某个具体产品的研发生命周期资产**（`CONTEXT.md:72`）。
  - 模板实例仓库（`project-instance`）：由模板初始化后生成、承载某个具体产品研发生命周期资产；**不作为通用流程模板的权威来源**（`CONTEXT.md:73`）。

### 2. `template-source` vs `project-instance`：本模板已写明的关系

- 两种身份共享大部分目录和流程资产，因此必须用 `yss-project.yaml` 显式声明，否则 Agent 会选错流程（`docs/adr/0002-yss-project-repository-mode.md`）。
- `template-source` 维护路由：按“影响面 → 单一事实来源 → 投影 / 派生资产 → 分级证据”维护；`scripts/verify-template` 是模板发布阻断门禁；**模板与外部 `create-yss-spec` 的跨仓库契约未完成集成验证时，不得声称可发布**（`AGENTS.md:36-42`）。
- `harness-process-tailoring.md`：先读 `yss-project.yaml`；非法、缺失或不支持的身份直接进入迁移检查。模板源维护的可记录为 `not-applicable` 的项包括产品 Spec、产品设计、OpenAPI、运行时代码。对跨仓库变更，Harness 记录必须绑定实现仓库、分支、CI、验证命令、发布顺序和回滚点；没有前端、后端或 OpenAPI 影响时显式记录 `not-applicable`（`docs/process/harness-process-tailoring.md:6-25`）。
- 跨仓库 CLI 契约的目标句：模板源仓库**保留** `repository_mode: template-source`；CLI 创建或接管的产品仓库写入 `repository_mode: project-instance`（`.template-source/contracts/create-yss-spec-repository-mode-contract.md:6-8`）。

**合法 `template-source` 在 `attach` 时可以转换为 `project-instance`，而本仓库当前就是 `template-source`：**

- 契约原文：`合法 template-source 可转换为 project-instance，合法 project-instance 保留并校验，非法身份在写入前阻断`（`.template-source/contracts/create-yss-spec-repository-mode-contract.md:40`）。
- 本仓库用户指南同一规则：`合法 template-source 会转换为 project-instance`（`docs/user-guide/外部命令行工具实践指南.md:59`）。
- `create-yss-spec` README 同一规则：`合法 template-source 身份会转换为 project-instance`（https://github.com/iloveZzz/create-yss-spec/blob/main/README.md ，“接管已有项目”节）。
- CLI 实现：`buildAttachDesiredOperations()` 在目标已有合法 `yss-project.yaml` 且 `repository_mode === "project-instance"` 时保留原文；否则把 `repository_mode: template-source` 替换为 `repository_mode: project-instance`，并标记 `identityConversion: true`（https://github.com/iloveZzz/create-yss-spec/blob/main/src/cli.js `buildAttachDesiredOperations`）。`init` 渲染模板文件时同样要求模板身份必须是 `template-source`，再改写为 `project-instance`（同文件 `renderTemplateFile`）。
- 因此：对**某个已有产品目录**执行 `attach`，把合法 `template-source` 清单改成 `project-instance`，是 CLI / 契约已写明的接管行为。对**本工作区**执行同一操作，会把当前 `yss-project.yaml` 的 `template-source` 改成 `project-instance`，从而消灭本仓库作为模板源的身份；这与 ADR-0002、`yss-project.yaml` 现状以及契约“模板源仓库保留 `template-source`”的目标句同时成立，不是互相否定。

### 3. `create-yss-spec` 的 `init` / `attach` / `sync`

CLI 源码、测试和发布由独立仓库 [iloveZzz/create-yss-spec](https://github.com/iloveZzz/create-yss-spec) 维护；本模板仓库只记录使用方法和跨仓库契约（`docs/user-guide/外部命令行工具实践指南.md:1-6`）。

**定位边界（本模板用户指南与 CLI README 一致）：**

- CLI 用于生成或补齐包含 Spec、架构、OpenAPI、Ticket 和 Agent 协作基线的**模板实例仓库**。它不负责生成前后端运行时工程，也不会代替创建远程 Git 仓库、CI 或 Ticket Board（`docs/user-guide/外部命令行工具实践指南.md:6-7`；https://github.com/iloveZzz/create-yss-spec/blob/main/README.md 开篇）。
- CLI 只管理 manifest 声明的研发管理资产，不接管前后端运行时代码、业务目录、用户文件或 `.git`（`.template-source/contracts/create-yss-spec-repository-mode-contract.md:8`；`docs/process/implementation-repo-integration.md:48-49`）。
- CLI 运行时不直接拉取模板仓库；“最新模板”指 `npx create-yss-spec@latest` 所携带的已发布快照；实例 metadata 记录 40 位 `templateCommit`（`docs/user-guide/外部命令行工具实践指南.md:9`；契约 `:10-11`；CLI README “当前支持”）。

**`init`（空目录初始化）：**

- 推荐 `npm create yss-spec@latest` 或 `npx create-yss-spec@latest`（用户指南 `:13-27`；CLI README）。
- 初始化必须把模板身份转换为 `schema_version: 1`、`repository_mode: project-instance`，并执行目标仓库的 `scripts/sync-skills --check`、`scripts/update-skill-lock --check`、`scripts/verify-template`（契约 `:15-23`）。
- 用户指南补充：初始化会写入 metadata schema v2；`--dry-run` 只预览，不创建目录、不删除文件（用户指南 `:29`）。
- CLI `--git-init` 只在初始化完成后对目标目录执行 `git init`；help 文本写明该选项属于初始化完成后行为（`src/cli.js` `printHelp`、`runInit`）。

**`attach`（向已有项目目录叠加 Harness 资产）：**

- 在已有项目根目录执行；只补齐 manifest 声明的研发管理资产（根规则文档、`docs/`、skills、投影、校验脚本和 metadata）。前后端运行时代码、业务目录、用户文件和 `.git` 原样保留（用户指南 `:31-33`；CLI README “接管已有项目”；契约 `:8,25-40`）。
- 必须显式选择 `--dry-run` 或 `--apply`，二者互斥（用户指南 `:57`；契约 `:40`；`src/cli.js` `runAttach`）。
- 已有 `.yss-template.json` 时拒绝重复接管，提示使用 `sync`（用户指南 `:58`；`src/cli.js` `runAttach`）。
- 计划分类为 `missing`、`matched`、`conflict`、`unsafe`。`--force` 只允许覆盖 conflict，不能绕过 unsafe、迁移冲突或无法归属的扁平 Ticket（用户指南 `:60`；契约 `:40`）。
- 覆盖前在目标目录外创建临时备份；验证失败自动回滚，metadata 不更新（用户指南 `:61`；契约 `:66`）。
- Git worktree 有脏改动时允许继续，但强提醒；CLI 不自动 stash 或提交（用户指南 `:62`；`src/cli.js` `gitDirtyWarning`）。
- 契约验收表要求：任意已有项目 attach dry-run **不写文件、不删除 `.git`**，运行时代码和无关文件不变（契约 `:77`）。
- CLI `inspectExistingTargetDir()` 要求目标已是存在的项目目录，且目标不得位于 CLI 包内 `template/` 快照根之下；该检查针对 bundled snapshot 路径，不是“禁止对任意 Git 远程为模板源的工作树执行 attach”（`src/cli.js` `inspectExistingTargetDir`、`isInsideTemplateRoot`、`BUNDLED_TEMPLATE_ROOT`）。

**`sync`：**

- 只支持已有 `.yss-template.json` 的模板实例；使用 CLI 包内置快照，不在运行时拉取模板仓库（用户指南 `:64-81`；契约 `:42-44`）。
- 普通同步新增缺失文件、更新 baseline 未被本地修改的文件、报告冲突；`sync --force` 先备份再覆盖受管冲突；模板删除默认只报告不删除；模板无关文件始终不覆盖（用户指南 `:81`；契约 `:44`）。
- 同步结束必须重新跑三个模板门禁；任一门禁失败回滚文件变更并保持旧 metadata 版本（用户指南 `:83-91`；契约 `:46`）。

**版本号在不同权威面上不一致（只记录，不裁定哪个“当前正确”）：**

- 本仓库跨仓库契约示例 metadata 写 `cliVersion: "2.1.4"`，发布顺序写发布 CLI `2.1.4`（`.template-source/contracts/create-yss-spec-repository-mode-contract.md:58,93`）。
- 本仓库用户指南发布顺序写发布 CLI `2.1.6`（`docs/user-guide/外部命令行工具实践指南.md:117`）。
- 2026-08-24 读取的 `create-yss-spec` `package.json` 为 `"version": "2.1.15"`；README 写“本次模板适配按 `2.1.15` 发布”（https://raw.githubusercontent.com/iloveZzz/create-yss-spec/main/package.json ；https://github.com/iloveZzz/create-yss-spec/blob/main/README.md ）。

### 4. 必须区分：CLI `attach` ≠ `implementation-repo-onboarding`

| 动作 | 作用对象 | 是否复制 / 写入实现源码 | 是否改变仓库身份 |
|---|---|---|---|
| `create-yss-spec attach` | 某个已存在的目标目录 | 否：只叠加 manifest 受管研发管理资产，不扫描或覆盖前后端运行时代码、业务目录、用户文件和 `.git` | 合法 `template-source` 转为 `project-instance`；合法 `project-instance` 保留 |
| `implementation-repo-onboarding` | 已有前端 / 后端 / fullstack / other **实现 Git 仓库** | 否：默认只读扫描和文档记录；**不把实现仓库源码复制进 Harness 仓库**；需要 clone 时只能 clone 到临时目录，不能 clone 到 Harness 仓库内 | 不改 `yss-project.yaml`；输出实现仓库登记草案 |

来源：CLI README / 用户指南 / 契约（上节）；`.agents/skills/implementation-repo-onboarding/SKILL.md:1-8,17-42,44-50`。

`attach` 把 Harness 资产铺进一个目录，使该目录成为（或保持为）`project-instance`。`implementation-repo-onboarding` 把**外部** FE/BE 仓库登记到当前 Harness，不把对方源码搬进来。二者不是同一条命令的别名。

### 5. 实现仓库接入与跨仓库切片：本模板已写明的关系

**接入事实源**是 `docs/process/implementation-repo-integration.md`。该文件开篇写明：当前 `yss-spec-project-template` 与 `create-yss-spec` 的模板接管 / 同步变更属于 Harness-only 加 release-only 影响，**不创建前端、后端或运行时代码目录**（`:1-3`）。

**默认关系：Harness 是研发管理仓库，运行时代码优先在独立实现仓库。**

- `AGENTS.md` §9：当前仓库默认是研发管理仓库，运行时代码优先位于已登记的独立实现仓库。只有用户明确选择当前仓库承载实现代码时，才使用唯一的 `apps/backend/<project>/` 或 `apps/frontend/<project>/` 项目根。`apps/backend/` 和 `apps/frontend/` 只是项目容器；`app/backend/`、`app/frontend/` 及其子路径禁止作为工程输出（`AGENTS.md:90-94`）。
- 产品生命周期用户指南同一默认：推荐把真实工程代码放在独立实现仓库；本仓库默认作为 Harness / 研发管理仓库。如果用户明确选择把代码放入本仓库，才按需新增 `apps/backend/<project>/`、`apps/frontend/<project>/` 等目录。不得由 Agent 自行新建任意顶层业务代码目录（`docs/user-guide/产品生命周期工作流.md:12-37,92-96`）。
- 进入实现时先读接入文档，登记实现仓库、项目根、分支、CI、验证命令和回滚点；再使用 `yss-router`。无可复用工程时，先确认**外部目标仓库或输出目录**，再使用脚手架；**当前仓库缺少 frontend / backend 目录不改变此路由**（`AGENTS.md:63-67`）。
- 没有登记记录时，先完成 onboarding，**不能用本仓库目录代替实现仓库**（`docs/process/implementation-repo-integration.md:6-7`）。

**Harness 内若承载运行时代码，布局被写死为多项目容器，而不是把外部仓嵌进来：**

```text
apps/
├── backend/<backend-project>/
└── frontend/<frontend-project>/
```

- `apps/backend/`、`apps/frontend/` 是项目容器，不是可生成的工程项目根；多个项目按 `<project>` 目录并列（接入文档 `:9-21`）。
- **外部实现仓库不要求采用 Harness 的 `apps/` 布局**，但仍必须登记该仓库内的实际项目根路径；跨仓库切片的写路径不得用本 Harness 的占位路径冒充真实路径（接入文档 `:22`）。
- 同一 Git monorepo 下的多个项目可以共用一条仓库登记，但必须逐项目列出根路径和独立验证命令；**不同 Git 仓库必须分别登记**（接入文档 `:24`）。
- 登记模板字段包括 `repository_scope: external-repository / harness-apps`、`layout_policy: harness-apps-multi-project / external-repository-native`、`git_url`、`local_worktree`、`project_root`、`ci_system`、`issue_tracker`，以及“同一 monorepo 可登记多个项目”的项目清单（`docs/templates/implementation-repo-registry-template.md:12-51`）。
- Slice Implementation Contract 的 Common 子合同同样只有两种路径策略：`harness-apps-multi-project` 或 `external-repository-native`；并单独有 `cross_repo.repositories` / `delivery_order` / `integration_verification` / `rollback_order`（`.agents/skills/yss-router/references/slice-implementation-contract.md:40,84-88`；`docs/templates/implementation-routing-template.md:87`）。

**Onboarding 技能边界：**

- 输入是外部仓库 URL 或本地路径，以及 `repo_role: backend / frontend / fullstack / other`（`.agents/skills/implementation-repo-onboarding/SKILL.md:10-15`）。
- 不直接提交、推送、创建 MR / PR 或修改实现仓库；不把实现仓库源码复制进 Harness；找不到命令时标记 `unknown` 或 `需人工确认`，不得编造（同文件 `:36-42`）。

**跨仓库切片路由：**

- 没有登记时先 onboarding；缺失登记则阻断（`.agents/skills/cross-repo-implementation-routing/SKILL.md:15,21`）。
- 影响面包括 Harness-only、backend-only、frontend-only、backend+frontend、contract-only、release-only；backend+frontend 必需 OpenAPI Freeze、generated client、后端验证、前端验证、端到端验收（同文件 `:27-36`）。
- 不允许前后端 MR / PR 信息只停留在实现仓库；必须回写 Harness 记录。不直接修改实现仓库代码；不创建或推送分支，除非用户在执行任务中明确授权（同文件 `:38-43`）。
- 切片模板分别为 Backend / Frontend 记录 `*_repo`、`*_branch`、`*_mr_pr`、`*_ci`、`*_verification`、`*_project_root`（Harness 内为 `apps/.../<project>/` 或外部真实路径）和 `*_status: pending / ready / blocked / not-applicable`。没有影响的实现仓库必须标记 `not-applicable`，不能留空（`docs/templates/cross-repo-slice-template.md:8-53`）。
- 对跨仓库变更，裁剪规则要求 Harness 记录绑定实现仓库、分支、CI、验证命令、发布顺序和回滚点（`docs/process/harness-process-tailoring.md:25`）。

**本模板源当前这次 Harness↔CLI 变更的跨仓库合同（不是产品 FE/BE 合同）：**

- 模板仓库负责 `yss-project.yaml`、流程事实源、迁移指南、技能投影、模板校验脚本和快照可发布状态；CLI 仓库负责 `attach`、`sync`、受管 manifest、快照 commit、metadata、迁移计划、备份 / 回滚、端到端测试和用户说明（接入文档 `:45-50`）。
- 影响面表把 backend-only / frontend-only / contract-only 记为 `not-applicable`：无后端运行时代码、无前端运行时代码、无 OpenAPI 变化（接入文档 `:35-43`）。

### 6. Git submodule / monorepo / multi-repo：本模板写了什么、没写什么

**本模板权威流程文档没有把 Git submodule 规定为 Harness 接入既有 FE/BE 仓库的机制。**

- `docs/` 下对 `submodule` / `.gitmodules` / `git submodule` 的检索无命中。
- 本工作区无 `.gitmodules` 文件。
- 已写明的布局选项只有：
  1. 默认：Harness / 研发管理仓库 + **已登记的独立实现仓库**（多 Git 仓库，分别登记）；
  2. 用户明确选择时：Harness 内 `apps/backend/<project>/` 与 `apps/frontend/<project>/`（同一 Git 树中的多项目容器）；
  3. 同一实现 Git monorepo 可一条登记、多项目根；不同 Git 仓库必须分别登记。
- `layout_policy` 枚举只有 `harness-apps-multi-project` 与 `external-repository-native`，没有 `git-submodule` 或等价值（登记模板 `:24`；路由模板 `:87`；Slice Implementation Contract `:40`）。
- Onboarding 明确禁止把实现源码复制进 Harness，需要 clone 时只能到临时目录（onboarding 技能 `:38-39,21-22`）。这与“把 FE/BE 嵌成 Harness 的 submodule 工作树”不是同一操作。

本模板把“研发管理仓库”与“前端 / 后端代码 monorepo”区分为不同术语，并写明前者不等同于后者（`CONTEXT.md:69`）。它没有在权威文件中命令“必须拆成多仓”或“必须合成一个 monorepo”；它规定的是登记、路径策略和禁止用 Harness 占位路径冒充外部真实路径。

### 7. Git / GitHub / GitLab 官方文档中的 submodule 与多项目布局（第一方事实）

这些是工具平台能力，不是本模板的选用结论。

**Git 官方 submodule：**

- 定义：submodule 是嵌在另一个仓库里的仓库；被嵌入的一方称 superproject。文件系统上通常有 `$GIT_DIR/modules/` 下的 Git 目录、superproject 工作区内的工作目录，以及指向前者的 `.git` 文件（https://git-scm.com/docs/gitsubmodules “DESCRIPTION”）。
- Superproject 通过树中的 `gitlink`（记录期望的 submodule commit）和 `.gitmodules` 中的 `submodule.<name>.path` / `url` 来跟踪 submodule（同页）。
- 官方给出至少两种用例：(1) 在保持独立历史的前提下使用另一项目；(2) 把逻辑上单一的项目人工拆成多个仓库再绑回 superproject，以应对仓库体积、传输大小或访问控制限制（同页 “DESCRIPTION” 用例 1–2；“Workflow for a third party library” / “Workflow for an artificially split repo”）。
- 添加命令为 `git submodule add <URL> <path>`；更新需在 submodule 内 checkout 新版本后再于 superproject `git add <path>` 并 commit（同页 workflow）。
- 克隆含 submodule 的仓库时，**默认不会 checkout submodule 内容**；可用 `git submodule init` + `update`，或 `git clone --recurse-submodules`（https://git-scm.com/book/en/v2/Git-Tools-Submodules “Cloning a Project with Submodules”；https://git-scm.com/docs/gitsubmodules “Implementation details”）。
- Pro Git：submodule 让一个 Git 仓库作为另一个仓库的子目录，克隆另一仓库进项目并保持提交分离；`.gitmodules` 本身被版本控制，其他人靠它知道从哪里取 submodule（https://git-scm.com/book/en/v2/Git-Tools-Submodules “Starting with Submodules”）。`gitlink` 的特殊 mode 为 `160000`，表示记录的是某个 commit 作为目录项，而不是跟踪该子目录内文件（同章）。

**GitHub 官方文档（未找到题为 “Working with submodules” 的 get-started 专页；下列为本次检索到的第一方页）：**

- GitHub Pages：若站点仓库含 submodule，构建时会自动拉取其内容；只能使用指向**公开**仓库的 submodule，因为 Pages 服务器不能访问私有仓库；`.gitmodules` 应使用 `https://` 只读 URL，包括嵌套 submodule（https://docs.github.com/en/pages/getting-started-with-github-pages/using-submodules-with-github-pages ）。
- GitHub Actions 从 Travis 迁移指南：可用 `actions/checkout` 的 `submodules` 输入控制是否检出 submodule（https://docs.github.com/en/actions/tutorials/migrate-to-github-actions/manual-migrations/migrate-from-travis-ci “Checking out submodules”）。
- `actions/checkout` README（GitHub 第一方 action 源）：`submodules` 默认为 `false`；`true` 检出 submodule，`recursive` 递归检出。另有 “Checkout multiple repos (side by side)” / “(nested)” / “(private)” 场景：用多次 `actions/checkout` 把不同仓库放到不同 `path`，而不是 submodule。默认 `GITHUB_TOKEN` 只作用于当前仓库，检出其他私有仓需要单独 PAT（https://github.com/actions/checkout/blob/main/README.md ）。
- GitHub 关于 subtree merge：若需要在**单个仓库内管理多个项目**，可以使用 subtree merge；典型做法是把另一仓库放在主仓库的一个文件夹里，且加入后**不会自动与上游保持同步**，需 `git pull -s subtree`（https://docs.github.com/en/get-started/using-git/about-git-subtree-merges ）。
- GitHub REST Contents API：若内容是 submodule，响应 `type` 为 `submodule`，`submodule_git_url` 标识 submodule 仓库位置，`sha` 标识该仓库中的特定 commit（https://docs.github.com/en/rest/repos/contents ）。

**GitLab 官方文档：**

- Groups：用 group 同时管理一个或多个相关 **projects**（GitLab 的 project 即独立 Git 仓库）。有权访问 group 即有权访问该 group 下所有 projects。更大组织可建 subgroups（https://docs.gitlab.com/user/group/ ）。
- 常见结构模型包括：Simple（一个 group 容纳全部 projects）、Team（按团队分子 group）、Client、Functionality（https://docs.gitlab.com/user/group/ “Group structure”）。
- Subgroups：可嵌套最多 20 层，为避免性能问题建议最多 5 层；每个 subgroup 可有自己的可见性；父 group 成员权限继承到 subgroup（https://docs.gitlab.com/user/group/subgroups/ ）。
- 推荐上限：每个父 group 下 child groups 少于 100；层级深度 5 层或更少（最大 20）；超出推荐值仍被支持但可能变慢（https://docs.gitlab.com/user/group/ “Recommended limits for group structure”）。
- GitLab 对 monorepo 的定义：一个包含 sub-projects 的仓库；举例为同一应用含 backend、web frontend、iOS、Android。文档讨论的是性能风险与优化，不是“必须使用 monorepo”或“必须拆仓”（https://docs.gitlab.com/user/project/repository/monorepos/ ）。
- GitLab CI submodule：用 submodule 把一个 Git 仓库作为另一仓库的子目录，提交保持分离；项目应有 `.gitmodules`。可用 `GIT_SUBMODULE_STRATEGY: normal | recursive` 让 runner 在 job 前获取 submodule（https://docs.gitlab.com/ci/runners/git_submodules/ ）。相对 URL 在 fork 工作流中可能解析错误；若预期有 fork，应使用绝对 URL（同页）。
- GitLab CI downstream pipeline：一个 pipeline 可触发另一 pipeline。**multi-project pipeline** 是在**不同 project** 中触发的 downstream；触发者必须有权限启动下游项目的 pipeline。上游对下游控制有限，可选择下游 ref 并传递 CI/CD 变量；默认不把下游状态并入上游 ref，除非使用 `trigger:strategy`（https://docs.gitlab.com/ci/pipelines/downstream_pipelines/ “Multi-project pipelines”）。这是 GitLab 侧跨独立 Git 项目编排 CI 的官方机制，不是本模板 `cross-repo-slice` 的实现。

### 8. Cursor `environment.json` 是否支持多仓库

- 本仓库文件存在于 `/workspace/.cursor/environment.json`。当前内容只有 `name`、`install`、`start` 三个键；**没有** `repos`、`repositoryDependencies` 或其他多仓库列表。
- Cursor 官方 schema（https://www.cursor.com/schemas/environment.schema.json ，由 https://cursor.com/docs/cloud-agent/setup “Configuration in code with environment.json” 引用）在 `common.repositoryDependencies` 中定义：类型为 string 数组，描述为“环境工作所需、且需要被纳入为该环境生成的 GitHub access token 的仓库”，元素示例为 `github.com/org/repo`。schema **没有**名为 `repos` 的字段。
- Cursor Cloud Agent setup 文档：当 agent 需要跨多个仓库工作时，使用 multi-repo environment；**创建环境时选择多个仓库**；Cursor 把每个被选仓库 clone 到 agent 机器，并对使用同一 repo group 的后续 run 复用该环境。文档举例 frontend、backend、infrastructure 或 shared libraries 分仓（https://cursor.com/docs/cloud-agent/setup “Multi-repo environments”）。Agent-driven setup 会要求连接 GitHub / GitLab / Azure DevOps / Bitbucket 并选择 one or more repositories（同页 “Agent-driven setup”）。
- 因此：本工作区已提交的 `environment.json` **本身未声明多仓库**。官方 schema 有 `repositoryDependencies`（描述为 token 范围，不是 clone-sibling 字段）。官方 setup 文档把“clone 多个仓库”绑定到 **dashboard 创建环境时选择多个仓库**，而不是本文件当前三个字段。

### 9. Ticket tracker vs Git remote

- Ticket tracker 的单一事实来源是 `docs/agents/issue-tracker.md`。当前模板默认 `platform: local-markdown`，`root: docs/.scratch`，`remote_mirror: false`。GitHub / GitLab 只有在项目明确选择时才作为主 tracker（该文件 front matter 与 `:11-13,17-24`）。
- 选择优先级：已写入本文件的配置优先 → 初始化或迁移时用户明确选择 GitHub / GitLab 并更新本文件 → **Git remote 只用于代码托管、分支、PR / MR 和 CI，不能单独把 Ticket tracker 改成远程平台**（`:29-34`）。
- `AGENTS.md` §6 同一规则：Ticket、Spec 和阶段证据按 `docs/agents/issue-tracker.md` 选定的主 tracker 持久化；**Git remote 不代表 tracker 选择**；平台不可用时按该文档生成待发布草案（`AGENTS.md:61`）。
- ADR-0002：Tracker 等易变信息不放入 `yss-project.yaml`（`docs/adr/0002-yss-project-repository-mode.md`）。
- 多个持久化配置声明不同平台时返回 `conflict`，暂停并要求迁移，不覆盖任何配置（`docs/agents/issue-tracker.md:34`）。选定 GitHub / GitLab 但凭据或平台暂不可用时，在 `docs/.scratch/<feature>/` 生成待发布草案，保留目标平台，不得自动改投另一远程平台（`:35`）。
- CLI `--issue-tracker github|gitlab` 默认值为 `github`（`create-yss-spec` `src/cli.js` `printHelp` 与 `attachVariables`）。这是 CLI 初始化 / 接管时的偏好参数，写入生成仓库的 README 等渲染结果；它不是本模板 `issue-tracker.md` 的默认 `local-markdown` 配置，也不能单凭目标仓库的 Git remote 覆盖 tracker。

实现仓库登记模板另有字段 `issue_tracker: GitLab / GitHub / other`，记录的是**该实现仓库**侧的 tracker，不是 Harness 主 tracker 的自动来源（`docs/templates/implementation-repo-registry-template.md:31`）。

## 尚未确认项

- 本模板是否将在未来把 Git submodule、subtree 或 Cursor multi-repo environment 选为推荐接入方式：**权威文件当前未规定；本研究不补架构建议。**
- `create-yss-spec` 已发布 npm 包 `2.1.15` 是否已绑定本仓库当前 commit 的模板快照、跨仓库集成验证是否已完成：**需对照 CLI 包内 `template.snapshot.json` 的 `templateCommit` 与本仓库 commit，以及契约要求的共同验证证据。** 本仓库契约仍写 CLI `2.1.4`，用户指南写 `2.1.6`。
- `attach` 应用到**本** `template-source` 工作树时，除改写 `yss-project.yaml` 外，manifest 还将覆盖哪些受管路径、哪些会落入 `conflict` / `unsafe`：**需对该目录实际跑 `attach --dry-run`。** 本研究未执行该命令。
- 某个具体产品的既有 GitLab/GitHub FE/BE 仓库地址、是否已有登记记录、`repository_scope` 应填 `external-repository` 还是 `harness-apps`：**当前工作区是模板源，没有产品实现仓库登记。**
- Cursor `repositoryDependencies` 在本产品线上是否会 clone 为 sibling 工作树，或仅扩展 token scope：**官方 schema 文本只写 token 范围；dashboard 多仓选择才会 clone。** 本研究未创建 Cursor 环境做运行时验证。
- GitHub 是否另有未索引到的 “Working with submodules” 专页：**本次对 `docs.github.com` 的检索未找到该标题的 get-started 专页。**
- GitLab group / subgroup 布局与本模板 `external-repository` 登记如何一一对应：**GitLab 文档描述的是托管侧 group 树；本模板登记的是 `git_url` + `project_root`，没有 group 路径字段。**

## 结论边界

- 本研究只陈述已引用出处中的句子与字段，不把“应该用多仓 / 应该用 monorepo / 应该用 submodule”写成事实。
- 本工作区当前身份是 `template-source`（`yss-project.yaml` + ADR-0002）。CLI / 跨仓库契约允许对合法 `template-source` 做 `attach` 并转换为 `project-instance`；把该操作施加于**本**仓库会消灭模板源身份，并与契约“模板源仓库保留 `template-source`”的目标冲突。这是身份后果，不是已批准的维护动作。
- CLI `attach` 是把 Harness 研发管理资产叠加到一个目录；`implementation-repo-onboarding` 是把外部 FE/BE Git 仓库登记到 Harness 且不复制源码。二者不可互换。
- 本模板对既有独立前后端仓库已经写明的关系是：**默认保持为已登记的独立实现仓库**；跨仓切片用登记记录 + `cross-repo-slice` 绑定 repo / branch / MR / CI / 验证 / 发布顺序；Harness 内仅在用户明确选择时使用 `apps/<backend|frontend>/<project>/`。未规定 submodule。
- Ticket 主 tracker 由 `docs/agents/issue-tracker.md` 显式配置，默认 `local-markdown`；Git remote（无论 GitHub 还是 GitLab）不决定 tracker。
- 任何“完成 / 可合并 / 可发布 / 已选定集成架构”的结论都不在本研究范围内。

## 来源路径

### 本仓库

- `yss-project.yaml:1-2`
- `CONTEXT.md:69-73`
- `AGENTS.md:5-13,36-42,61,63-67,90-94,112-114`
- `docs/adr/0002-yss-project-repository-mode.md`
- `docs/process/implementation-repo-integration.md`
- `docs/process/harness-process-tailoring.md:6-25`
- `docs/templates/implementation-repo-registry-template.md`
- `docs/templates/cross-repo-slice-template.md`
- `docs/templates/implementation-routing-template.md:87`
- `.agents/skills/implementation-repo-onboarding/SKILL.md`
- `.agents/skills/cross-repo-implementation-routing/SKILL.md`
- `.agents/skills/yss-router/references/slice-implementation-contract.md:40,84-88`
- `docs/user-guide/外部命令行工具实践指南.md`
- `docs/user-guide/产品生命周期工作流.md:12-37,92-96`
- `docs/agents/issue-tracker.md`
- `.template-source/contracts/create-yss-spec-repository-mode-contract.md`
- `/workspace/.cursor/environment.json`

### 外部第一方

- https://github.com/iloveZzz/create-yss-spec/blob/main/README.md
- https://raw.githubusercontent.com/iloveZzz/create-yss-spec/main/package.json
- https://github.com/iloveZzz/create-yss-spec/blob/main/src/cli.js
- https://git-scm.com/book/en/v2/Git-Tools-Submodules
- https://git-scm.com/docs/gitsubmodules
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-submodules-with-github-pages
- https://docs.github.com/en/actions/tutorials/migrate-to-github-actions/manual-migrations/migrate-from-travis-ci
- https://github.com/actions/checkout/blob/main/README.md
- https://docs.github.com/en/get-started/using-git/about-git-subtree-merges
- https://docs.github.com/en/rest/repos/contents
- https://docs.gitlab.com/user/group/
- https://docs.gitlab.com/user/group/subgroups/
- https://docs.gitlab.com/user/project/repository/monorepos/
- https://docs.gitlab.com/ci/runners/git_submodules/
- https://docs.gitlab.com/ci/pipelines/downstream_pipelines/
- https://cursor.com/docs/cloud-agent/setup
- https://www.cursor.com/schemas/environment.schema.json
