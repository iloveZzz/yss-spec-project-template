# 项目实例分层接入采用 Git submodule 可行性研究

> 日期：2026-08-24
>
> 研究性质：只读事实研究与集成分析，不作架构决策，不修改 `docs/` 分发面、共享 skill 或登记模板，不宣布模板可发布。
>
> 仓库身份：`repository_mode: template-source`（`yss-project.yaml`）。
>
> 存放位置：模板源治理区 `.template-source/evidence/maintenance/`。按 ADR-0008，研究记录不进入 `docs/` 分发面。

## 研究问题

应用本模板时，若采用「分层接入」：

- 主项目是研发本体（由本模板创建的 `project-instance` / 研发管理仓库）；
- 前端项目和后端项目是独立 Git 仓库，作为子项目用 **Git submodule** 挂到主项目工作树；

该方案在 Git 机制上是否可行，以及与本模板当前跨仓库契约、Agent 实现协议是否兼容。

本题不是某个具体产品的 Discovery / Spec；`yss-product-lifecycle` 按模板维护路由，禁止生成产品 Spec、原型、OpenAPI 或垂直切片 Ticket。

## 来源范围

一手来源（2026-08-24 读取）：

| 来源 | 地址 / 对象 | 用途 |
|---|---|---|
| Git 子模块语义 | https://git-scm.com/docs/gitsubmodules | superproject / gitlink / 默认不递归 clone |
| Git submodule 命令 | https://git-scm.com/docs/git-submodule | init / update / 检出行为 |
| Pro Git 7.11 Submodules | https://git-scm.com/book/en/v2/Git-Tools-Submodules | detached HEAD、发布顺序、合并冲突 |
| GitLab CI 子模块 | https://docs.gitlab.com/ci/runners/git_submodules/ | `GIT_SUBMODULE_STRATEGY`、跨仓凭据 |
| GitHub Actions checkout | https://github.com/actions/checkout/blob/v4/README.md | `submodules` 默认 `false`、私有仓 PAT |
| 本仓库身份 | `yss-project.yaml`、`docs/adr/0002-yss-project-repository-mode.md` | `template-source` vs `project-instance` |
| 实现仓库契约 | `docs/process/implementation-repo-integration.md` | 默认独立实现仓、Harness 内 `apps/` |
| 登记模板 | `docs/templates/implementation-repo-registry-template.md` | `repository_scope` 仅两值 |
| 跨仓库切片模板 | `docs/templates/cross-repo-slice-template.md` | 分仓 MR / PR 与发布顺序 |
| Router 合同 | `.agents/skills/yss-router/references/slice-implementation-contract.md` | `implementation_path_policy` 仅两值 |
| Onboarding skill | `.agents/skills/implementation-repo-onboarding/SKILL.md` | 禁止把实现仓 clone 进 Harness |
| CLI 跨仓契约 | `.template-source/contracts/create-yss-spec-repository-mode-contract.md` | CLI 不接管运行时代码、不删 `.git` |
| 编排合同 | `.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml` | 路径策略、Git 授权、`route` 只读 |
| worktree skill | `.agents/skills/using-git-worktrees/SKILL.md` | 已把 submodule 当作 worktree 误判陷阱 |

未作为事实来源：第三方博客、经验帖、未标注版本的 CI 示例。GitHub Docs 上「Working with submodules」专题页本次检索未命中独立一等文档；clone 行为以 git-scm 与 `actions/checkout` README 为准。

## 本模板已经合法的两种拓扑

`CONTEXT.md` 把「研发管理仓库」和「实现仓库」分成两个概念。`docs/process/implementation-repo-integration.md` 与登记模板只承认两种 `repository_scope`：

| 拓扑 | `repository_scope` | 文件系统 | Git 身份 | 何时允许 |
|---|---|---|---|---|
| 默认分层：独立实现仓 | `external-repository` | 实现代码不在 Harness 树内；`local_worktree` 指向外部路径 | 每个实现仓各自 `.git`、各自 MR / PR | 默认。没有登记时不得用本仓库目录代替实现仓 |
| 用户显式选择的 Harness 内实现 | `harness-apps` | `apps/backend/<project>/`、`apps/frontend/<project>/` | **同一个** Git 仓库；一条仓库登记可列多个项目 | 仅当用户明确选择当前仓库承载运行时代码 |

`implementation_path_policy` 对应只有 `harness-apps-multi-project` 与 `external-repository-native`（`yss-router` Slice Implementation Contract）。没有第三值。

CLI 契约写明：`create-yss-spec` 只管理研发管理资产，不接管前后端运行时代码、业务目录、用户文件或 `.git`。空目录初始化得到的 `project-instance` 默认 **没有** 前端 / 后端工程目录。

## Git submodule 的机制事实

官方 `gitsubmodules` 把 submodule 定义为「一个仓库嵌在另一个仓库里」。被嵌入方有自己的历史；嵌入方叫 superproject。superproject 用 **gitlink**（树对象 mode `160000`）记录子仓库的 **某个 commit 对象名**，再用 `.gitmodules` 记录 path 与 url。

与本题直接相关的机制：

1. **默认 clone 不检出子模块。** `gitsubmodules` Implementation details：clone 或 pull 含 submodule 的仓库时，子模块默认不会被 checkout；需要 `git clone --recurse-submodules`，或事后 `git submodule update --init`。Pro Git 实测形态：子目录存在但是空的。
2. **superproject 钉的是 SHA，不是浮动分支。** gitlink 存的是期望工作树所在的 commit。即使 `.gitmodules` 写了 `branch`，`git submodule update --remote` 仍会把工作树迁到该分支当前 tip，然后 **父仓还要再 commit 一次 gitlink** 才锁定。
3. **协同开发默认 detached HEAD。** Pro Git「Working on a Submodule」：`git submodule update` 会把子仓留在 detached HEAD。没有跟踪分支时，下一次 update 可能丢掉未推送的本地提交。要改子仓代码，必须先在子仓 `git checkout <branch>`。
4. **发布必须先子后父。** Pro Git「Publishing Submodule Changes」：只推 superproject、不推子仓新 commit 时，他人无法取出 gitlink 指向的对象。`git push --recurse-submodules=check|on-demand` 就是为这个失败模式准备的。
5. **合并冲突是 SHA 对 SHA，不是目录合并。** 双方同时改 gitlink 且历史分叉时，Git 报 `CONFLICT (submodule)`，不会自动做内容合并。
6. **官方给出的两类用例。** `gitsubmodules`：
   - 消费第三方项目并保持独立历史，只在需要时钉新版本；
   - 把逻辑上单一的项目拆成多仓再绑回 superproject，用于体积、传输或部分访问控制。
7. **CI 默认同样不递归。** GitHub `actions/checkout@v4` 的 `submodules` 默认 `false`。GitLab 必须显式设 `GIT_SUBMODULE_STRATEGY: normal|recursive`。私有子模块：GitHub 默认 `GITHUB_TOKEN` 只覆盖当前仓，需 PAT / SSH；GitLab 要求对子模块仓具备 Reporter 及以上，且配置 job token 访问。跨实例还要额外 token。

这些机制证明：**Git 可以把前端 / 后端仓挂到 `project-instance` 工作树里**。可行性不等于本模板已支持。

## 用户提案与现有拓扑的对照

用户想要的「分层接入」在文件系统上像 Harness 内实现：

```text
<project-instance>/                 # superproject = 研发管理仓库
├── docs/ Spec OpenAPI Ticket ...
├── .gitmodules
├── apps/backend/<backend-project>/ # gitlink → 后端仓某个 SHA
└── apps/frontend/<frontend-project>/ # gitlink → 前端仓某个 SHA
```

在 Git 身份上它又像默认的独立实现仓：三个仓库、三套历史、三套 CI、三次 MR / PR（子仓代码 + 父仓 gitlink 更新）。

因此它是 **第三种拓扑**，不能无记录地套用现有两个 `repository_scope`：

| 若误登记为 | Agent 会假设 | 实际会发生 |
|---|---|---|
| `harness-apps` | 同一 Git 仓、一次 commit / 一个 MR | 父仓只能提交 gitlink；代码变更在子仓；一次 `git add apps/backend/foo` **不会** 纳入子仓源文件 |
| `external-repository` | 实现代码不在本树；clone 到临时目录 | 代码看起来在 `apps/` 下；Router 的 `allowed_write_paths` 与 Git checkpoint 会对「当前仓库」语义打架 |

## 与本模板契约的冲突点

以下条目均已有权威出处，不是风格偏好。

### 1. Onboarding 明确禁止把实现仓 clone 进 Harness

`implementation-repo-onboarding`：需要 clone 时只能 clone 到临时目录，**不能 clone 到 Harness 仓库内**；**不把实现仓库源码复制进 Harness 仓库**。`git submodule add` 的本质就是把另一个仓库 clone 进 superproject 工作树并写下 gitlink。当前 skill 会把该动作判为越界。

### 2. 登记模型没有 submodule 字段

登记模板只有 `external-repository / harness-apps`。缺少至少：

- 挂载路径是否为 gitlink；
- `.gitmodules` name / url / 可选 branch；
- 钉扎 SHA 与 `rollback_point` 的对应关系；
- 子仓 detached HEAD 时禁止直接 commit 的规则；
- 父仓 gitlink 更新是否构成独立交付步骤。

`cross_repo.delivery_order` 现以「后端仓 / 前端仓 / 契约」为主；submodule 方案必须再加「父仓更新 gitlink 并验证可递归检出」，否则他人 clone 得到空目录。

### 3. Git checkpoint 只覆盖当前仓库一次授权

`yss-product-lifecycle` Git 授权要求 `commit_authorized` / `push_authorized` 作用于当前仓库。submodule 协同切片最少三次 Git 操作：

1. 在后端子仓 checkout 分支、commit、push；
2. 在前端子仓同样操作；
3. 在 Harness 父仓更新两个 gitlink 并 push（且应 `--recurse-submodules=check`）。

现有协议没有嵌套 Git、没有「先子后父」强制顺序，也没有「禁止在 detached HEAD 提交」的硬门禁。`using-git-worktrees` 已经必须把 submodule 从 worktree 检测中排除，说明 Agent 工具链会把子仓误判成隔离工作区。

### 4. 脚手架与空目录失败模式

Router / 生命周期：当前仓库缺少 frontend / backend 目录 **不改变**「先确认外部目标仓库再脚手架」的路由。默认 clone 后 submodule 目录为空。Agent 可能把空目录读成 `scaffold_status=required`，在 gitlink 上跑 `yss-ddd-scaffold-generator --force`，破坏子仓或把骨架写进错误 Git 身份。

### 5. CLI 同步与 `.gitmodules`

CLI 不接管运行时代码、不删除 `.git`，因此 **不会自动创建或删除 submodule**。`.gitmodules` 与 `apps/` 下 gitlink 只要不进入 `managedFiles`，`sync` 通常会当作用户文件保留。风险在另一侧：模板未来若把 `apps/` 占位目录纳入受管文件，会与 gitlink 冲突。当前分发面 `.gitignore` 不含 `apps/` 或 `.gitmodules`。

### 6. Fresh verification 与 Cloud Agent 工作区

模板源 Cursor Cloud 说明只覆盖本 Harness 的 Node 工具链，没有「递归检出实现仓」步骤。`actions/checkout` 与 Git 默认都不递归。Cloud Agent / 本地 Agent 若只 clone 父仓，会在空的 `apps/` 上做 type-check / `./mvnw`，得到假失败或错误脚手架，而不是实现仓的真实证据。

## 对垂直切片的匹配度

YSS 垂直切片的设计目标是 **同一功能同时穿过前后端公开 seam**，每个切片都可能改三个仓库。这更接近 Pro Git 所说「同时改主项目和子模块」，而不是「偶尔升级第三方库」。

官方把 submodule 的轻松模型定义为：子项目主要被消费，偶尔钉新版本。前后端作为同一产品的共研实现仓，每个切片都要：

- 子仓离开 detached HEAD；
- 子仓出 MR / PR 与 CI；
- 父仓再出 MR / PR 更新 gitlink；
- clone / CI / Agent 全部递归且有跨仓凭据；
- 回滚时同时回滚三个 SHA。

钉扎 SHA 对 `rollback_point` 和 Slice Implementation Contract 的可复现性是真实优点。代价是每个切片的 Git 状态机、授权和 CI 凭据都比现有两种拓扑更重。`gitsubmodules` 的「拆仓以做访问控制」用例可以解释权限隔离需求，但不能消除共研切片的双重提交。

## 分析结论

1. **Git 层可行。** 把 `project-instance` 当 superproject、把前端 / 后端仓当 submodule 挂到 `apps/frontend/<project>/` 与 `apps/backend/<project>/`，符合 Git 对 submodule 的定义，也能保持三仓独立历史。
2. **本模板当前不支持该拓扑。** 权威资产只定义 `external-repository` 与 `harness-apps`。没有登记字段、路径策略、Git 授权、脚手架守卫或 CI 递归约定。按现有规则执行会误路由。
3. **与现行硬规则直接冲突。** 最大阻断是 onboarding「不得 clone 进 Harness」和「不同 Git 仓库必须分别登记，但不能把外部仓假装成 Harness 内同源目录」。在未改这些规则前，实例仓库自行 `git submodule add` 属于未登记的第三拓扑，生命周期应视为 `blocked` / `new_impacts`，而不是已批准接入。
4. **对 YSS 默认工作方式匹配度低。** 垂直切片高频共研前后端，是 submodule 成本最高的用法（detached HEAD、先子后父 push、gitlink 合并冲突、CI / Agent 递归检出与私有仓凭据）。
5. **分层接入的目标已经有一等方案。** 「主仓管研发资产、前后端是子项目」对应默认的 `external-repository`：分别登记、分别 MR / PR、Harness 绑定 `cross-repo-slice`。若目标是「一个工作树里看见三份代码」，一等方案是用户显式选择 `harness-apps` 真 monorepo，而不是 gitlink。

## 推荐

**不把 Git submodule 作为本模板 `project-instance` 的默认或未登记分层接入方式。**

按目标选择已支持拓扑：

| 目标 | 应采用 | 不要采用 |
|---|---|---|
| 研发管理与运行时所有权分离（模板默认） | 三个独立 Git 仓；`repository_scope: external-repository`；Harness 只登记 url / 分支 / 验证命令 / MR | 把实现仓 submodule 进 Harness |
| 单工作树、单 PR、Agent 少踩 Git 坑 | 用户显式批准后把代码放进 `apps/backend/<project>/`、`apps/frontend/<project>/`，`repository_scope: harness-apps` | 看起来像 monorepo、提交时却只动 gitlink |
| 需要独立历史 **并且** 父仓钉死实现 SHA | 现有契约下：Harness checkpoint / 切片记录写明实现仓 commit；或将来单独立项做第三 `repository_scope` | 无登记地使用 submodule 冒充上述任一种 |

若仍要坚持 submodule，这是模板维护 **L3**（`maintenance-intensity.yaml` 的 `cross-repo-contract` + `generation-semantics` + 可能的 `permission-boundary`），不是实例仓库可以私下启用的布局。最低必须改：

- `docs/process/implementation-repo-integration.md` 与登记模板新增例如 `repository_scope: git-submodule`；
- onboarding 把「clone 进 Harness」从一律禁止改为「仅 gitlink 挂载点、禁止普通目录 copy」；
- Router `implementation_path_policy` 增加第三值；
- 生命周期 Git 授权改为嵌套 commit / 先子后父 push / 禁止 detached HEAD 提交；
- 脚手架在空 gitlink 目录上默认阻断；
- CLI 明确 `.gitmodules` 与 gitlink 为非受管用户资产；
- Cloud / CI 默认 `clone --recurse-submodules` 与跨仓凭据合同；
- `cross_repo.delivery_order` 强制包含父仓 gitlink 更新，且 `git push --recurse-submodules=check`。

在上述契约落地前，**实例仓库使用 submodule 管理前后端不可作为本模板支持的接入方式**。

## 尚未确认项

- Cursor Cloud / 本环境的 git clone 是否带 `--recurse-submodules`（本模板源仓库本身无 submodule，无法在本仓实测）。
- `create-yss-spec` 当前 `managedFiles` 清单是否已包含任何 `apps/` 占位文件（契约写明不接管运行时代码，但未在本笔记中打开 CLI 包核对最新 snapshot）。
- Git 2.52+ 对 `submodule.recurse` 影响的命令全集（以 `git-config` 为准，本笔记未逐条展开）。
- 企业内 GitLab / GitHub 对 job token 访问子模块的默认组织策略（随实例而变）。

## 结论（一句话）

Git submodule **能**把前端 / 后端仓嵌进由本模板创建的研发本体，但 **不是** 本模板已定义的分层接入；当前合法分层是「独立实现仓登记」或「用户显式批准的 `apps/` monorepo」。在共研垂直切片场景下，submodule 的 Git 与 Agent 成本高于收益，默认不应采用。
