# 已有前后端仓库与 Harness / 研发管理仓库关系：事实研究

> 日期：2026-08-24
>
> 研究性质：只读事实研究，不作架构批准、不宣布可发布、不修改技能或实现契约。本文区分可核对事实与尚未确认项。
>
> 来源范围：本仓库权威资产、`create-yss-spec` 仓库一手 README / package.json / 实现记录、Git 官方 submodule 文档、GitLab 官方 CI / 分组文档、Cursor 官方 Cloud Agent 环境文档。

## 已确认事实

### 1. 当前仓库身份不是产品实例

- 根目录 `yss-project.yaml` 声明 `schema_version: 1`、`repository_mode: template-source`（`yss-project.yaml:1-2`）。
- ADR-0002 规定：模板源使用 `template-source`，`create-yss-spec` 生成的仓库使用 `project-instance`；身份不靠目录、Git 远程或占位符猜测（`docs/adr/0002-yss-project-repository-mode.md`）。
- `CONTEXT.md` 把四类仓库分开定义：
  - **模板源仓库**：只管理可复用模板，不承载某个具体产品的研发生命周期资产。
  - **模板实例仓库**：由模板初始化后生成，承载某个具体产品研发生命周期资产。
  - **研发管理仓库**：承载 Spec、OpenAPI、架构、Ticket、验证、发布和复盘；不等同于前端 / 后端代码 monorepo。
  - **实现仓库**：承载前端、后端或其他运行时代码及其 Git、CI、MR / PR、测试命令和发布流水线；不要把实现仓库的源码所有权混入研发管理仓库。
  （`CONTEXT.md` 流程术语表对应行）
- `AGENTS.md` 对 `template-source` 的硬门禁是走模板维护流程，不默认生成具体产品的 Spec、原型、OpenAPI 或垂直切片 Ticket（`AGENTS.md` 第 1、4 节）。

结论边界：把本仓库直接当作某个产品的「研发本体」与当前身份契约冲突。这是事实冲突，不是推荐本身。

### 2. CLI `attach` 与「接入已有前后端」不是同一操作

`create-yss-spec` 一手 README（<https://github.com/iloveZzz/create-yss-spec/blob/main/README.md>）与本仓库契约一致：

- CLI 用途是初始化、接管已有项目并持续同步 **研发管理资产**；当前发布版本 `2.1.15`（`create-yss-spec/package.json` 的 `"version": "2.1.15"`）。
- `attach` **只处理 manifest 声明的研发管理资产**，不扫描或覆盖前后端运行时代码、业务目录、用户文件和 `.git`（CLI README「接管已有项目」；本仓库 `.template-source/contracts/create-yss-spec-repository-mode-contract.md` 契约目标第 3 条；`docs/user-guide/外部命令行工具实践指南.md`「接管已有项目」）。
- `attach` 必须显式 `--dry-run` 或 `--apply`；已有 `.yss-template.json` 时拒绝并提示 `sync`。
- 身份规则（CLI 实现记录 <https://github.com/iloveZzz/create-yss-spec/blob/main/docs/implementation/yss-project-repository-mode-contract.md>）：
  - 缺失身份文件时创建合法 `project-instance`；
  - **合法 `template-source` 在显式 attach 中转换为 `project-instance`**；
  - 合法 `project-instance` 保留并校验；
  - schema / 字段 / mode 非法时写入前阻断。
- 空目录 `init` 同样把模板身份改写为 `project-instance`（CLI README「当前支持」；本仓库用户指南「空目录初始化」）。
- 生命周期工作单元 `work-unit.attach-sync-integration` 的 `scope` 是 `template-source`，输入是目标仓库与 dry-run 计划，输出是受管资产和 metadata（`docs/process/lifecycle-registry.yaml` 该工作单元）。

因此：

| 操作 | 作用对象 | 对前后端源码 |
|---|---|---|
| `create-yss-spec init` | 空目录 → 新产品 `project-instance` | 不生成运行时工程 |
| `create-yss-spec attach` | 已有目录 → 补齐 Harness 资产并确保 `project-instance` | 不接管、不移动、不删除运行时代码 |
| `implementation-repo-onboarding` | 已有前端 / 后端 Git 仓库 | **只读扫描 + 登记**；禁止把源码复制进 Harness；clone 只能到临时目录（`.agents/skills/implementation-repo-onboarding/SKILL.md` Boundaries） |

对本 `template-source` 仓库执行 `attach --apply` 会按契约把它改成 `project-instance`，从而失去模板源身份。契约允许这种转换，是为了「把一份模板工作树变成产品实例」，不是为了把权威模板源仓库改成某个产品仓。

### 3. 模板已经规定的默认拓扑：Harness 与实现仓库分离

权威接入事实源 `docs/process/implementation-repo-integration.md`：

- 每个受影响实现仓库必须登记：仓库地址、分支、代码所有者、CI 入口、测试 / 构建命令、允许写路径、回滚点和 MR / PR。没有登记时先 onboarding，不能用本仓库目录代替实现仓库。
- 当前模板源与 CLI 的接管 / 同步变更属于 Harness-only 加 release-only，**不创建前端、后端或运行时代码目录**。
- 外部实现仓库不要求采用 Harness 的 `apps/` 布局，但必须登记该仓库内的实际项目根；跨仓库切片不得用 Harness 占位路径冒充真实路径。
- 只有用户**明确选择**让 Harness 承载运行时代码时，才使用 `apps/backend/<project>/` 与 `apps/frontend/<project>/`；`apps/backend/`、`apps/frontend/` 只是容器；`app/backend/`、`app/frontend/` 一律禁止（同文件 §1.1；`AGENTS.md` 第 9 节；`docs/user-guide/产品生命周期工作流.md` §1、§3 Step 3）。

登记模板字段包括 `repository_scope: external-repository / harness-apps`、`layout_policy: harness-apps-multi-project / external-repository-native`、`scaffold_status: existing / required / initialized`（`docs/templates/implementation-repo-registry-template.md`）。已有前后端工程对应 `scaffold_status: existing`，不跑脚手架生成器。

跨仓库切片模板分别绑定 `backend_repo` / `frontend_repo`、分支、MR / PR、CI、验证命令、项目根和 `not-applicable`（`docs/templates/cross-repo-slice-template.md`）。路由 skill 要求：没有登记则阻断；不允许前后端 MR / PR 信息只停留在实现仓库，必须回写 Harness；API 变化但没有 Freeze 必须回到 Draft / Freeze（`.agents/skills/cross-repo-implementation-routing/SKILL.md`）。

前端验证优先 `pnpm`，后端优先项目根 `./mvnw`；既有仓库缺少时记受控例外，不编造命令（`docs/process/implementation-repo-integration.md` §1.2）。

### 4. Ticket tracker 与 Git 远程是两套事实

`docs/agents/issue-tracker.md`：

- 模板默认 `platform: local-markdown`，根为 `docs/.scratch`。
- **Git remote 是代码托管信息，不会自动覆盖显式 tracker 配置。**
- GitHub / GitLab 只有项目明确选择后才作为主 tracker。
- 选定远程平台但凭据不可用时，在 `docs/.scratch/<feature>/` 生成待发布草案，不得自动改投另一平台。

因此：前端在 GitLab、后端在 GitHub、Harness 在另一远程，并不自动决定 Ticket 写在哪。产品实例必须单独选定主 tracker。

### 5. Git submodule 的一手语义（不是本模板的推荐）

Git 官方：

- submodule 是把一个仓库嵌进另一个仓库，**各自保留独立历史**；superproject 用 gitlink 钉死子仓库的某个 commit（<https://git-scm.com/docs/gitsubmodules> DESCRIPTION）。
- 典型用途：第三方库、或把逻辑上单一的项目拆成多仓再捆回去（访问控制、体积、传输）（同页 “Submodules can be used for at least two different use cases”）。
- clone / pull **默认不检出 submodule**；需要 `git clone --recurse` 或 `git submodule init` + `update`（同页 Implementation details；Pro Git 7.11 <https://git-scm.com/book/en/v2/Git-Tools-Submodules>）。

GitHub 官方 Pages 文档额外约束：Pages 只能拉 **公开** submodule，且需 `https://` 只读 URL（<https://docs.github.com/en/pages/getting-started-with-github-pages/using-submodules-with-github-pages>）。这只说明托管侧限制，不构成「应该用 submodule 接管前后端」的证据。

本模板的 onboarding skill **明确禁止**把实现仓库源码复制进 Harness，clone 只能到临时目录。模板文档中没有把 submodule 登记为实现仓库的默认布局。

### 6. GitLab 多仓协作的一手能力

- GitLab **subgroups** 用于在父组下组织多个项目、隔离可见性与权限，嵌套最多 20 层、建议不超过 5 层（<https://docs.gitlab.com/user/group/subgroups/>）。这是组织多个独立 Git 项目的官方方式，不是把它们合成一个 Git 历史。
- GitLab CI **multi-project pipeline** 允许一个项目的 pipeline 触发另一项目的 downstream pipeline；触发者必须对下游项目有启动 pipeline 的权限（<https://docs.gitlab.com/ci/pipelines/downstream_pipelines/> “Multi-project pipelines”）。这是跨仓 CI 编排的官方机制，要求各仓仍是独立项目。

本模板的跨仓库切片记录的是 Harness 侧绑定（仓库 URL、分支、MR / PR、CI 链接、验证命令），并不实现 GitLab multi-project YAML。

### 7. Cursor Cloud 多仓环境的一手能力

Cursor 官方 Cloud Environment Setup（<https://cursor.com/docs/cloud-agent/setup>）：

- **Multi-repo environments**：创建环境时选择多个仓库；Cursor 把每个选中的仓库 clone 到 agent 机器，并复用于同一 repo group 的后续 run。文档示例包括 frontend、backend、infrastructure、shared libraries 分仓。
- Agent 可在这些仓中做协同修改、跨仓测试，并在改动过的仓库打开 PR。
- 引导式 setup 要求连接 GitHub、GitLab、Azure DevOps 或 Bitbucket，并选择一个或多个仓库。
- 本仓库当前 `.cursor/environment.json` 只有 `name` / `install` / `start`，**没有**声明第二、第三个仓库。官方把「选哪些仓」放在 dashboard 环境创建，而不是用 `environment.json` 的 repos 数组表达。

Cursor 社区帖对 `repositoryDependencies` 的澄清（非规范正文，仅作缺口）：该字段扩展 GitHub token 范围，**不自动 clone** 兄弟仓；「Cursor clones each selected repo」指 dashboard 多仓选择流程（<https://forum.cursor.com/t/repositorydependencies-in-cursor-environment-json-not-cloned-when-launching-from-the-repository-environment/164756>）。混合 GitHub + GitLab 是否能放进**同一个** Cloud 环境，官方 setup 页未给出肯定句；尚未确认。

### 8. 用户指南里的产品实例启动顺序（针对 `project-instance`，不是本 template-source）

`docs/user-guide/产品生命周期工作流.md` 在「新建工程的初始化流程」中要求：填写产品身份 → 建立 `CONTEXT.md` 业务术语 → **确认实现仓库和产物目录**。每个需求进入实现前必须记录后端 / 前端实现仓库、分支、MR / PR、CI、测试命令和验证证据。发布物落在实例仓的 `docs/releases/` 与 `docs/implementation/`。

这套顺序的执行仓库必须是 `project-instance`。在本 `template-source` 上直接跑产品 Discovery / Spec 违反 `AGENTS.md` 第 4 节。

## 尚未确认项

1. 用户要接管的具体前端 Git URL、后端 Git URL、默认分支、CI 系统、包管理器 / Maven Wrapper 是否存在。本工作区没有这些远程，无法 onboarding 扫描。
2. 产品研发管理仓库计划落在 GitHub 还是 GitLab，以及主 Ticket tracker 是 `local-markdown`、GitHub Issues 还是 GitLab Issues。
3. 用户是否明确选择把运行时代码迁入某个 `project-instance` 的 `apps/backend/<project>/`、`apps/frontend/<project>/`。没有该明示时，模板默认保持外部实现仓库。
4. Cursor Cloud 单个 environment 能否同时包含 GitHub 仓与 GitLab 仓。官方写明可分别连接这两种账号并「选择一个或多个仓库」，未写明跨提供商同环境。
5. 已有前后端是否已有 OpenAPI / Orval 生成客户端 / 设计 token；登记模板有这些字段，但无目标仓证据。
6. `create-yss-spec@2.1.15` 与本模板当前 commit 的 `templateCommit` 是否已完成跨仓集成验证。`AGENTS.md` 规定未完成时不得声称模板可发布；本研究不评估发布状态。

## 结论边界

可从权威源核对的方法已经存在，且互相不替代：

1. **不要把本 `template-source` 仓库当成产品 Harness。** 新产品用 `create-yss-spec` `init`（空目录）得到 `project-instance`。
2. **不要用 `attach` 去「合并」前后端。** `attach` 只往某个目录叠加研发管理资产；若目标已是前端或后端实现仓，结果是 Harness 文件与运行时代码同居，源码所有权仍在该 Git 历史里，另一端仍需 onboarding。
3. **已有前后端分仓时，模板默认路径是：新建或选定一个 `project-instance`，再对每个实现仓做 `implementation-repo-onboarding` 登记，切片用 `cross-repo-implementation-routing` 绑定。** 这保持三个（或更多）独立 Git 历史，用登记表 + 切片记录做整合，而不是 submodule 或复制源码。
4. **Git submodule 能嵌仓，但与本模板「不把实现源码复制进 Harness、clone 仅临时目录」的 onboarding 边界不一致**；官方 submodule 默认还不随 clone 检出。若选用 submodule，属于尚未做出的架构决策，本研究不批准。
5. **整合发生在产品实例仓的登记 / OpenAPI Freeze / 垂直切片 / checkpoint，而不是改模板源。** 跨仓发布仍要求任一参与仓库未对齐时不得声称整体可发布（`CONTEXT.md`「跨仓库契约变更」）。

本研究是证据，不是架构批准或发布声明。拓扑选择（独立三仓登记 / attach 进某一实现仓 / 迁入 `apps/` / submodule）需要 grilling 由用户确认后再写 ADR 或改模板。
