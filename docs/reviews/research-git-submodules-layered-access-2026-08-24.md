# Git submodule 能否实现 YSS 分仓接入的事实研究

> 日期：2026-08-24
>
> 研究性质：只读事实研究，不作架构决策；不批准 Git submodule 接入、不修改 ADR / `CONTEXT.md` / skill，不生成产品 Spec、原型、OpenAPI 或 Ticket，不宣布可发布。
>
> 问题口径：权威术语中没有“分层接入”。本文按 `CONTEXT.md` 已冻结的“分仓接入 / 一体仓”讨论：能否用 Git submodule 把 Harness、前端实现仓库、后端实现仓库组成一次可检出的工作树，同时保留独立 Git 历史、独立 MR / PR 和独立 CI。
>
> 与已有研究的关系：`docs/reviews/research-existing-fe-be-harness-integration-2026-08-24.md` §6–§8 已确认 submodule、GitHub / GitLab checkout 与 Cursor multi-repo 的基础定义以及“模板当时没有规定 submodule”。本文不重复全文，只补充：直接可行性、commit 锁定与 branch 的区别、在 submodule 内开发并回写 superproject 的双仓工作流、四种机制的逐项对照，以及当前 ADR-0008 / 接入事实源和 `create-yss-spec` 当前源码状态。

## 已确认事实

### 1. 直接答案：Git 机制上能形成组合工作树，但语义是“superproject 锁定子仓 commit”

- **能形成一次递归检出后的组合工作树。** Git 把 submodule 定义为嵌入另一个仓库的仓库；外层仓库叫 superproject。submodule 保持自己的历史，其工作目录位于 superproject 工作目录内。superproject 用树中的 `gitlink` 记录期望的 submodule commit，并用 `.gitmodules` 的 `path` / `url` 告诉 Git 在哪里放置和获取该仓库。把前端、后端分别作为两个 submodule 时，递归 clone 后可得到“Harness superproject + 两个内嵌实现仓库工作树”。来源：[Git `gitsubmodules`，DESCRIPTION](https://git-scm.com/docs/gitsubmodules#_description)、[Git `gitmodules`，DESCRIPTION](https://git-scm.com/docs/gitmodules#_description)。
- **三个 Git 历史仍然独立。** Git 官方列出的第一种用例正是“在自己的工作树内包含另一项目的工作树，同时保持双方历史独立”；另一种官方用例是把逻辑上单一的项目人为拆成多个仓库，再通过 superproject 绑回一起。后一种用例用于仓库体积、传输大小或细粒度访问控制。来源：[Git `gitsubmodules`，DESCRIPTION 的两个 use cases](https://git-scm.com/docs/gitsubmodules#_description)。
- **独立历史意味着前端、后端仍可在各自托管仓库提交、推送、跑 CI 和开各自 MR / PR；submodule 不把它们合并成同一 Git 历史。** 但 Git 本身只定义仓库、commit 和 push，不定义 GitHub / GitLab 的 MR / PR 审批流程；“独立 MR / PR”是各子仓继续作为独立托管仓库所保留的平台能力，不是 superproject 自动创建或联动 MR / PR 的功能。独立历史来源同上；Git 对 submodule 与 superproject 分别推送的流程见 [Pro Git，Publishing Submodule Changes](https://git-scm.com/book/en/v2/Git-Tools-Submodules#_publishing_submodule_changes)。
- **绑定单位是 commit，不是浮动 branch。** `gitlink` 保存 superproject 期望的 submodule commit object name；普通 `git submodule update` 默认检出 superproject 已记录的 commit。`.gitmodules` 可配置 `submodule.<name>.branch`，但它只指定 `git submodule update --remote` 查找更新时使用的远端 branch；`--remote` 只是改变“目标 SHA 从哪里算出”，并不把 superproject 树中的 gitlink 变成 branch 指针。来源：[Git `gitsubmodules`，DESCRIPTION](https://git-scm.com/docs/gitsubmodules#_description)、[Git `git-submodule`，`update` / `--remote`](https://git-scm.com/docs/git-submodule#Documentation/git-submodule.txt-update-N--no-fetch--remote-f--force--checkout--rebase--merge--reference--dissociate--recursive--depthltdepthgt--recommend-shallow--no-recommend-shallow--jobsltngt--single-branch--no-single-branch--ltpathgt82308203)、[Git `gitmodules`，`submodule.<name>.branch`](https://git-scm.com/docs/gitmodules#Documentation/gitmodules.txt-submoduleltnamegtbranch)。

因此，submodule 提供的是一个可版本化的**仓库组合快照**：某个 Harness commit 对应前端 commit X 和后端 commit Y。它不提供“前端 / 后端 main 一有新 commit，旧 Harness commit 自动看见”的浮动聚合。

### 2. 默认 clone 不会带出前后端内容；递归 clone 才会

- 含 submodule 的仓库被普通 `git clone` 后，submodule 默认不 checkout；Pro Git 示例中 submodule 目录存在但为空，需要 `git submodule init` 后再 `git submodule update`，或直接执行 `git submodule update --init --recursive`。来源：[Pro Git，Cloning a Project with Submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules#_cloning_submodules)。
- `git clone --recurse-submodules <superproject-url>` 会在 clone superproject 后初始化并更新 submodule，包括嵌套 submodule。Git 的“artificially split repo”官方工作流也明确写明：即使设置了 `submodule.recurse=true`，`clone` 仍需要自己的 recurse flag。来源：[Pro Git，同节](https://git-scm.com/book/en/v2/Git-Tools-Submodules#_cloning_submodules)、[Git `gitsubmodules`，Workflow for an artificially split repo / Implementation details](https://git-scm.com/docs/gitsubmodules#_workflow_for_an_artificially_split_repo)。
- `git submodule update` 的职责是让已登记 submodule 匹配 superproject 的期望状态：缺失时 clone、缺 commit 时 fetch、再更新工作树。默认 `checkout` procedure 会把记录的 commit 检出到 detached `HEAD`。来源：[Git `git-submodule`，`update`](https://git-scm.com/docs/git-submodule#Documentation/git-submodule.txt-update-N--no-fetch--remote-f--force--checkout--rebase--merge--reference--dissociate--recursive--depthltdepthgt--recommend-shallow--no-recommend-shallow--jobsltngt--single-branch--no-single-branch--ltpathgt82308203)。

### 3. 在 submodule 目录改前后端代码，需要“子仓提交 + superproject gitlink 提交”两个层次

Git 官方资料给出的工作流可分成以下事实步骤：

1. `git submodule update` 默认把 submodule 放在 detached `HEAD`。要在其中持续开发，先进入 submodule 并 checkout 本地工作 branch；否则即使在 detached `HEAD` 上 commit，后续 update 也可能让该 commit 难以继续追踪。来源：[Pro Git，Working on a Submodule](https://git-scm.com/book/en/v2/Git-Tools-Submodules#_working_on_a_submodule)、[Git `git-submodule`，`update` 的 `checkout`](https://git-scm.com/docs/git-submodule#Documentation/git-submodule.txt-checkout)。
2. 在 submodule 内按普通独立仓库方式改代码、commit，并把该 commit 推到 submodule 自己的 remote；对应 MR / PR 也属于该子仓。Pro Git 明确说明：若只提交并推送主项目、却没有先发布 submodule commit，其他人将无法取得 superproject 所依赖的子仓变更。来源：[Pro Git，Publishing Submodule Changes](https://git-scm.com/book/en/v2/Git-Tools-Submodules#_publishing_submodule_changes)。
3. 在 superproject 中把 submodule 路径 `git add` 并 commit，才会把 gitlink 从旧子仓 SHA 更新到新 SHA。Git 官方“第三方库”工作流原文步骤为：在 submodule checkout 新版本，然后在 superproject 执行 `git add <path>`、`git commit -m "update submodule to new version"`。来源：[Git `gitsubmodules`，Workflow for a third party library](https://git-scm.com/docs/gitsubmodules#_workflow_for_a_third_party_library)。
4. 所以，前端或后端仓出现新 commit 后，**旧 superproject commit 不会自动“看见”它**。要让新的组合快照可被其他人复现，superproject 必须另有一个更新 gitlink 的 commit；是否为该 commit 再开 Harness PR，属于托管流程配置，不是 Git 自动完成的步骤。
5. `git push --recurse-submodules=check` 可在 superproject push 前检查它引用的 submodule commit 是否已发布到某个 remote；`on-demand` 可先尝试推 submodule，再推 superproject。它们处理发布顺序，不替代子仓 review / CI，也不把两个 commit 合为一个原子 commit。来源：[Pro Git，Publishing Submodule Changes](https://git-scm.com/book/en/v2/Git-Tools-Submodules#_publishing_submodule_changes)。

### 4. GitHub 第一方能力：submodule checkout 与多仓并列 checkout 是两种机制

- `actions/checkout` 的 `submodules` 输入默认是 `false`；`true` checkout 直接 submodule，`recursive` 递归 checkout。因此，superproject CI 只写默认 checkout 时会漏掉 submodule 工作树。来源：[GitHub `actions/checkout` README，Usage / `submodules`](https://github.com/actions/checkout/blob/main/README.md#usage)。
- 同一 README 另列“Checkout multiple repos (side by side)”：对主仓和工具仓分别执行一次 `actions/checkout`，给不同 `path`。这会在 `$GITHUB_WORKSPACE` 中产生并列的独立 checkout；它没有 `.gitmodules`、gitlink 或“superproject 必须提交子仓 SHA”的语义。README 也另列 nested checkout，但那仍是第二次 action checkout，不会因此成为 Git submodule。来源：[GitHub `actions/checkout` README，Checkout multiple repos (side by side) / (nested)](https://github.com/actions/checkout/blob/main/README.md#checkout-multiple-repos-side-by-side)。
- `${{ github.token }}` 只作用于当前仓库；checkout 另一个 private / internal repository 时，README 要求提供能访问该仓的 PAT，并建议最小权限。来源：[GitHub `actions/checkout` README，Checkout multiple repos (private)](https://github.com/actions/checkout/blob/main/README.md#checkout-multiple-repos-private)。
- GitHub Pages 是一个特例：站点 build 会自动拉 submodule，但只允许指向 public repository，因为 Pages server 无法访问 private repository；`.gitmodules` 应使用 `https://` read-only URL，包括嵌套 submodule。来源：[GitHub Docs，Using submodules with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-submodules-with-github-pages)。
- GitHub REST Contents API 把 submodule 返回为 `type: submodule`；`submodule_git_url` 指向子仓，`sha` 指向该子仓的特定 commit。该 API 行为再次确认 GitHub 看到的是 URL + 固定 SHA，而不是一个普通目录副本。来源：[GitHub REST Docs，Get repository content / submodule](https://docs.github.com/en/rest/repos/contents#get-repository-content)。

### 5. GitLab 第一方能力：CI 必须显式取 submodule，URL 与 token 受托管拓扑影响

- GitLab 把 submodule 描述为“把一个 Git 仓库作为另一个仓库的子目录，并保持 commits 分离”，并要求项目有 `.gitmodules`。来源：[GitLab Docs，Using Git submodules with GitLab CI/CD](https://docs.gitlab.com/ci/runners/git_submodules/)。
- Runner 只有设置 `GIT_SUBMODULE_STRATEGY: normal` 或 `recursive` 才会在 job 前获取 submodule；`normal` 初始化顶层 submodule，`recursive` 初始化嵌套 submodule。来源：[GitLab Docs，Use Git submodules in CI/CD jobs / Check out nested submodules](https://docs.gitlab.com/ci/runners/git_submodules/#use-git-submodules-in-cicd-jobs)。
- 使用 `CI_JOB_TOKEN` 拉 submodule 时，触发 job 的用户必须对 submodule repository 至少具有 Reporter、Developer、Maintainer 或 Owner 角色，且上游 submodule project 必须正确配置 job token access。跨 GitLab instance 时，当前 instance 的 `CI_JOB_TOKEN` 不能认证外部 instance，需要在外部 instance 创建 token；文档列出 PAT、Deploy token、Project access token，并在示例中要求 `read_repository` scope。来源：[GitLab Docs，同页 Prerequisites / Use submodules from another GitLab instance](https://docs.gitlab.com/ci/runners/git_submodules/#use-submodules-from-another-gitlab-instance)。
- 相对 URL 在 fork workflow 中可能解析错误；预计有 fork 时 GitLab 要求使用 absolute URL。只有 submodule 与主项目在同一 GitLab server 时才可使用相对 URL；不在同一 server 时必须使用 full URL。来源：[GitLab Docs，Using relative URLs](https://docs.gitlab.com/ci/runners/git_submodules/#using-relative-urls)。

### 6. Cursor Cloud multi-repo 是 repo group 的并列独立 clone，不是 nested submodule

- Cursor setup 文档要求在创建环境时选择多个仓库；Cursor 会把每个选中的 repository clone 到 agent machine，并为使用同一 repo group 的后续 run / automation 复用该环境。文档明确把 frontend、backend、infrastructure、shared libraries 分仓列为用途，并说明 Agent 可跨仓测试、协调修改、在被修改的 repos 中开 pull requests。来源：[Cursor Cloud Agent Setup，Multi-repo environments](https://cursor.com/docs/cloud-agent/setup#multi-repo-environments)。
- 这里的“并列”是**仓库关系语义**：每个 selected repo 都是 repo group 的独立 clone，没有任何页面步骤要求其中一个仓库提交 `.gitmodules` 或 gitlink，也没有“更新另一个仓库 SHA 后再提交 superproject”的语义。Cursor 页面没有公开承诺具体目录名或绝对路径层级，因此“它们在磁盘上一定是某种固定 sibling 路径”不是已确认合同；已确认的是多个独立仓库被 clone 到同一 agent machine，而不是作为某一 selected repo 的 Git submodule。
- `environment.schema.json` 的 `repositoryDependencies` 描述只说：这些仓库是环境运行所需，并需要被纳入为该环境生成的 GitHub access token；元素是 dependent repository URL。schema 没说该字段会 clone 仓库，也没有声明 submodule path / gitlink。来源：[Cursor `environment.schema.json`，`repositoryDependencies`](https://www.cursor.com/schemas/environment.schema.json)。
- 因而，**dashboard 多选仓库负责 clone 多仓；`repositoryDependencies` 负责 schema 文本所写的 token 范围。** 不能仅凭 `repositoryDependencies` 推导“会 clone 成 sibling”，也不能把 dashboard repo group 称为 submodule nested 工作树。
- 本工作区 `.cursor/environment.json` 只有 `name`、`install`、`start`，没有 `repositoryDependencies`（`.cursor/environment.json:1-5`）。当前仓库是否在 dashboard 层关联了其他 selected repos，不由这个文件证明。

### 7. 当前 YSS 权威文件已经定义的拓扑，不等于 submodule 机制

- `CONTEXT.md` 的“研发管理仓库”承载 Spec、OpenAPI、架构、Ticket、验证、发布和复盘；“实现仓库”承载运行时代码及其 Git、CI、MR / PR、测试命令和发布流水线。默认“分仓接入”要求研发管理仓库与前端、后端实现仓库各有独立 Git 历史，靠实现仓库登记和跨仓库切片绑定；“一体仓”才是同一 Git 仓库同时承载研发管理资产和运行时代码（`CONTEXT.md:69-73`）。
- ADR-0008 已决定：默认分仓接入；产品实例与前端、后端仓分开，靠登记和跨仓库切片绑定；分仓 Agent 工作区使用 Cursor Cloud 多仓环境，一体仓使用单仓环境（`docs/adr/0008-split-repo-and-monorepo-harness-topology.md:1-3`）。
- 接入事实源 §1.0 把默认分仓写为：空目录初始化 `project-instance`，再分别 onboarding 前端、后端；两者都是 `repository_scope: external-repository`、`layout_policy: external-repository-native`，填写真实 `project_root`。§1.1 又要求不同 Git 仓库分别登记（`docs/process/implementation-repo-integration.md:5-17,19-35`）。
- 登记表记录 `git_url`、`local_worktree`、`topology`、`repository_scope`、`project_root`、`layout_policy`、CI 和 MR / PR 等事实；`layout_policy` 只有 `harness-apps-multi-project` 与 `external-repository-native`（`docs/templates/implementation-repo-registry-template.md:8-45`）。Slice Implementation Contract 同样只有这两个 path policy，但另有 `cross_repo.repositories`、`delivery_order`、`integration_verification`、`rollback_order`（`.agents/skills/yss-router/references/slice-implementation-contract.md:38-52,84-88`）。
- 跨仓库切片分别记录 `backend_repo / branch / mr_pr / ci / verification / project_root` 和对应 frontend 字段，不要求 superproject gitlink SHA（`docs/templates/cross-repo-slice-template.md:8-54`）。
- 当前工作区从根目录递归查找 `.gitmodules` 为 0 个结果；权威登记 / 路由枚举也没有 `git-submodule`。这说明**当前 checkout 没有实际 submodule，当前模板合同也没有 submodule 专用 layout policy**；它不证明 Git 机制不能实现组合工作树。

### 8. submodule 与 onboarding 的“不把源码复制进 Harness”不是同一操作

两边原文描述的动作不同：

- Git submodule：submodule 工作目录位于 superproject 工作目录内部，superproject 以 gitlink + `.gitmodules` 跟踪它；`git submodule add <URL> <path>` 把该仓库加入 superproject 下一次要提交的 changeset。来源：[Git `gitsubmodules`，DESCRIPTION](https://git-scm.com/docs/gitsubmodules#_description)、[Git `git-submodule`，`add`](https://git-scm.com/docs/git-submodule#Documentation/git-submodule.txt-add-b--branchltbranchgt-f--force--nameltnamegt--referenceltrepositorygt--depthltdepthgt--ltrepositorygtltpathgt)。
- YSS onboarding：远端 URL 的分仓接入优先做只读 Git 查询；需要 clone 时“只能 clone 到临时目录，不能 clone 到 Harness 仓库内”；边界又明确“不把实现仓库源码复制进 Harness 仓库；分仓 onboarding 的 clone 只进临时目录”（`.agents/skills/implementation-repo-onboarding/SKILL.md:18-29,40-45`）。

所以，二者不是同一操作：

- onboarding 当前动作是**发现并登记外部仓事实**，临时 clone 只服务只读扫描，最终写路径指向登记的外部真实 `project_root`；
- submodule 是**改变 superproject Git 树结构**，在 Harness 工作树内保留长期 nested checkout，并要求 superproject 提交 `.gitmodules` 和 gitlink。

submodule 不是用 `cp` 把源码历史“复制归 Harness 所有”；子仓历史仍独立。但它确实把子仓工作目录 materialize 到 Harness 工作树内部，并给 Harness 增加 gitlink 所有权。这与 onboarding 原文禁止 clone 进 Harness 的操作边界不同。

### 9. `create-yss-spec` 当前源码没有显式创建或识别 `.gitmodules`

核对对象为 2026-08-24 读取的 `main` tree commit `8216b5c7c0d4f712828b7122b8718e9239059f1c`：

- GitHub tree API 返回的完整、`truncated: false` 文件树没有 `.gitmodules`；`src/` 只有 `cli.js` 与 `template-hash.js`。来源：[GitHub tree API，commit `8216b5c7...`](https://api.github.com/repos/iloveZzz/create-yss-spec/git/trees/8216b5c7c0d4f712828b7122b8718e9239059f1c?recursive=1)。
- README 的“当前支持”、`init`、`attach`、`sync` 没有 submodule 功能；README 明确 `attach` 只处理 manifest 声明的研发管理资产，不扫描或覆盖运行时代码、用户文件和 `.git`。来源：[create-yss-spec README，当前支持 / 接管已有项目](https://github.com/iloveZzz/create-yss-spec/blob/8216b5c7c0d4f712828b7122b8718e9239059f1c/README.md)。
- 对完整 `src/cli.js` 检索 `gitmodules`、`submodule`、`git submodule` 均无命中。源码的 Git 特殊行为只有初始化时可执行 `git init`，以及 attach / sync 时用 `git rev-parse`、`git status --porcelain` 产生 dirty warning；没有 `git submodule add / init / update`。来源：[create-yss-spec `src/cli.js`](https://github.com/iloveZzz/create-yss-spec/blob/8216b5c7c0d4f712828b7122b8718e9239059f1c/src/cli.js)，函数 `initializeGitRepository`、`gitDirtyWarning`、`runAttach`、`runSync`。
- `scripts/sync-template.js` 通过临时 clone 模板源、`git ls-files` 和普通文件复制构建 CLI 内置快照；当前 `template.manifest.json` 既没有声明 submodule，也没有 submodule 操作。该投影逻辑不是重建 gitlink 的 `git submodule add` 工作流。来源：[create-yss-spec `scripts/sync-template.js`](https://github.com/iloveZzz/create-yss-spec/blob/8216b5c7c0d4f712828b7122b8718e9239059f1c/scripts/sync-template.js)，函数 `copyTrackedFiles`；[当前 `template.manifest.json`](https://github.com/iloveZzz/create-yss-spec/blob/8216b5c7c0d4f712828b7122b8718e9239059f1c/template.manifest.json)。

准确边界是：**当前 CLI 没有显式创建、初始化、更新或识别 `.gitmodules` / gitlink 的代码路径。** 这不等同于证明 CLI 对任意包含 `.gitmodules` 的未来普通文件输入一定采取某种行为；后者需要专门 fixture / dry-run 才能确认。本研究不声称本轮 CLI 已发布或已完成跨仓集成。

## 四种机制对照

| 对照项 | A. Git submodule（superproject 钉 gitlink SHA） | B. 本模板分仓接入（登记 + cross-repo slice） | C. Cursor Cloud multi-repo（dashboard repo group） | D. GitHub Actions 多次 checkout（side-by-side） |
|---|---|---|---|---|
| 核心提供 | 在一个 superproject 工作树内嵌独立仓库工作树；superproject commit 锁定每个子仓 commit | 治理层登记 `git_url`、真实 `project_root`、branch、MR / PR、CI、验证、交付 / 回滚顺序 | 为一个 agent environment 选择并 clone 多个独立仓库，跨仓修改、测试、分别开 PR | 在一个 workflow job 的 `$GITHUB_WORKSPACE` 内按多个 `path` checkout 多个仓库 |
| 不提供 | 不自动跟随子仓 branch；不自动创建跨仓 MR / PR 或统一 CI | 不负责 clone / 嵌套工作树，不生成 gitlink，不把多个 Git 历史变成一个 | 不生成 `.gitmodules` / gitlink，不给一个仓库增加“组合版本 commit” | 不生成 `.gitmodules` / gitlink，不持久化仓库组合版本到某个 superproject commit |
| 一次普通 `git clone Harness` 是否带出 FE / BE 工作树 | 否；默认 submodule 目录未 checkout。`git clone --recurse-submodules` 才可一次命令递归带出 | 否；clone Harness 只得到 Harness。实现仓工作树来自各自 clone / 已登记 `local_worktree` / Agent 环境 | 不是“一次 git clone Harness”；创建环境时 dashboard 多选，Cursor 分别 clone 每个 selected repo 到同一机器 | 不是一次 git clone；workflow 明确执行多次 `actions/checkout` |
| FE / BE 是否仍可独立 MR / PR | 是；子仓历史和 remote 独立。另需处理 superproject gitlink 更新 commit | 是；模板字段本来就分别记录 frontend / backend MR / PR | 是；Cursor 文档明确可在被修改的 repos 中开 pull requests | 是；每次 checkout 指向独立 repository，PR 仍属于各自 repo |
| FE / BE 新 commit 后，Harness / superproject 是否必须再 commit 才能“看见” | 是；必须更新并提交 gitlink，才能形成新的可复现组合快照 | 否；没有 gitlink。Harness 通过登记 / slice 记录引用 branch、MR / PR、CI 和验证；是否更新记录由流程事实决定 | 否；repo group 不钉另一个仓库的 gitlink。环境 / Build 可分别记录 repo commit，但不是 Harness Git commit | 否；每次 checkout 由 workflow 的 `repository` / `ref` 输入决定 |
| 默认 clone / CI 是否可能漏 FE / BE | 普通 clone 会漏 submodule 内容；Actions `submodules` 默认 false；GitLab Runner 需 `GIT_SUBMODULE_STRATEGY` | clone Harness 本来就不承诺取实现仓；必须由独立工作树 / 多仓环境另行提供 | 选入 repo group 的仓库会被 Cursor clone；未选入的仓库不会因登记文件自动出现 | 会；少写一次 checkout 就没有该仓。每个 checkout 都是显式 step |
| private repo token 范围 | 每个 private submodule 都必须可认证；GitLab job token 需角色与 allowlist，跨 instance 另需 token；GitHub Pages 不支持 private submodule | 登记合同不发 token，也不扩大 token scope；凭据属于实际 Git / CI / Agent 环境 | dashboard 选择依赖已连接 SCM 访问；`repositoryDependencies` 文本只负责把 dependent repos 纳入生成的 GitHub token | 默认 `${{ github.token }}` 只作用当前仓；另一个 private repo 要提供相应 PAT |
| 代码写路径 | 直接在 superproject 内的 submodule 目录改；先 checkout 子仓 branch，再在子仓 commit / push；随后在 superproject 提交新 gitlink | 在登记的独立 clone / `local_worktree` 与真实 `project_root` 改；onboarding clone 只允许临时目录且默认不修改实现仓 | 在同一 agent machine 上各 selected repo 的独立工作树改；不是某仓库的 submodule 目录语义 | 在 job 中各 checkout `path` 下读写；job 结束后要持久化仍须向对应 repo commit / push |
| CI 是否仍可独立 | 可以保留各子仓 CI；superproject 若需要集成 CI，必须显式递归 checkout 并配置跨仓验证 | 是；模板分别登记实现仓 CI，并另记 integration verification | 是；各 repo 仍独立，环境只提供跨仓工作面 | 是；该 job 可做组合验证，但不取代各 repo 自己的 workflow |
| 与 onboarding“不复制源码进 Harness”是否同一操作 | 不是；submodule 长期把子仓 checkout 嵌入 superproject 工作树，并提交 gitlink / `.gitmodules` | 本身就是该 onboarding 语义：只读发现 + 外部仓登记，远端 clone 只进临时目录 | 不是复制进 Harness Git 树；是环境层 clone 多个选中仓库 | 不是复制进 Harness Git 历史；是 CI 临时工作区的多个 checkout |

表中来源：Git 行为见本文 §1–§3；GitHub 见 §4；GitLab 见 §5；Cursor 见 §6；YSS 当前合同见 §7–§8。

## 尚未确认项

- **Cursor 多仓的物理目录合同：** 官方页面确认“每个 selected repo clone 到同一 agent machine”，但没有公开固定目录名、父子层级或“必为某种 sibling 相对路径”的 schema。本文只确认 repo group 中的并列独立 clone 语义和“不是 Git submodule”，不把未公开路径写成事实。
- **YSS 是否要新增 submodule 拓扑 / `layout_policy`：** 当前 ADR-0008 指向默认分仓 + Cursor Cloud 多仓，当前枚举没有 `git-submodule`。是否未来增加、如何登记 gitlink SHA、谁负责 superproject 更新 PR，是尚未做出的架构 / 流程决策。
- **某个实际产品三仓的权限：** 未提供 Harness / FE / BE 的具体 GitHub / GitLab URL、可见性、fork 模式、CI token 或 branch protection，不能确认递归 checkout 是否能通过认证。
- **`create-yss-spec` 对人为预置 `.gitmodules` 的端到端结果：** 当前 README / `src` 没有显式支持，当前模板也没有 `.gitmodules`；但未在临时 fixture 对 `init` / `attach` / `sync --dry-run` 注入该文件。本研究不把未执行的 fixture 结果写成事实。
- **跨仓一致性的原子性：** Git 官方资料描述先发布 submodule commit、再发布 superproject commit，并提供 push check / on-demand；没有确认 GitHub / GitLab 能把三个独立 MR / PR 和三条 CI 做成单一原子事务。具体协调仍取决于托管与流水线配置。

## 结论边界

- 对“机制上能否”：**能。** 两个实现仓作为 Harness superproject 的 submodule，可以在递归 clone 后组成一个工作树，并保持三个仓库的独立历史、独立 remote，以及各自 MR / PR、CI 的能力。
- 对“以何种语义”：它是**固定 commit 的组合版本**，不是 branch 浮动聚合。子仓变更要先在子仓 branch / MR / CI 中落成；superproject 还要提交新的 gitlink，新的组合快照才可被其他人复现。默认 update 为 detached `HEAD`，进入子仓开发前需显式 checkout branch。
- 对“是否等于当前 YSS 分仓接入”：**不等于。** 当前分仓接入事实源定义的是外部仓登记 + cross-repo slice，ADR-0008 指定 Cursor Cloud 多仓环境；onboarding 还禁止把远端实现仓 clone 进 Harness。submodule 会新增 nested checkout、`.gitmodules`、gitlink 和 superproject 更新提交，这些语义当前合同没有。
- 对“一体仓”：submodule 的文件系统外观可以是一个外层工作树，但 Git 历史仍分离；按 `CONTEXT.md`，“一体仓”要求同一 Git 仓库 / 同一 Git 历史，因此不能仅因目录嵌套就把 submodule 组合称为 YSS“一体仓”。
- 本文不把“应该用 / 不应该用 submodule”写成事实，不修改当前拓扑决定，不声称 `create-yss-spec` 已支持或本轮已发布。

## 来源路径

### 已有研究（只引用，不重复）

- `docs/reviews/research-existing-fe-be-harness-integration-2026-08-24.md:133-184`（§6–§8）

### 本仓库权威文件

- `yss-project.yaml:1-2`
- `CONTEXT.md:69-75`
- `docs/adr/0008-split-repo-and-monorepo-harness-topology.md:1-3`
- `docs/process/implementation-repo-integration.md:1-35`（§1、§1.0、§1.1）
- `.agents/skills/implementation-repo-onboarding/SKILL.md:18-29,40-45`
- `docs/templates/implementation-repo-registry-template.md:8-45`
- `docs/templates/cross-repo-slice-template.md:8-54`
- `.agents/skills/yss-router/references/slice-implementation-contract.md:38-52,84-88`
- `.cursor/environment.json:1-5`
- 工作区根目录 `.gitmodules` 递归查找：2026-08-24 为 0 个文件

### Git 官方

- https://git-scm.com/docs/gitsubmodules （DESCRIPTION；Workflow for a third party library；Workflow for an artificially split repo；Implementation details）
- https://git-scm.com/docs/git-submodule （`add`；`init`；`update`；`--remote`；`--checkout` / `--merge` / `--rebase`）
- https://git-scm.com/docs/gitmodules （DESCRIPTION；`path`；`url`；`update`；`branch`）
- https://git-scm.com/book/en/v2/Git-Tools-Submodules （Cloning a Project with Submodules；Working on a Submodule；Publishing Submodule Changes）

### GitHub 第一方

- https://github.com/actions/checkout/blob/main/README.md （Usage / `submodules`；Checkout multiple repos side by side / nested / private）
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-submodules-with-github-pages
- https://docs.github.com/en/rest/repos/contents#get-repository-content

### GitLab 第一方

- https://docs.gitlab.com/ci/runners/git_submodules/ （absolute / relative URLs；CI/CD strategy；nested submodules；cross-instance authentication）

### Cursor 第一方

- https://cursor.com/docs/cloud-agent/setup#multi-repo-environments
- https://www.cursor.com/schemas/environment.schema.json （`repositoryDependencies`）

### `create-yss-spec` 第一方只读源码

- https://api.github.com/repos/iloveZzz/create-yss-spec/git/trees/8216b5c7c0d4f712828b7122b8718e9239059f1c?recursive=1
- https://github.com/iloveZzz/create-yss-spec/blob/8216b5c7c0d4f712828b7122b8718e9239059f1c/README.md
- https://github.com/iloveZzz/create-yss-spec/blob/8216b5c7c0d4f712828b7122b8718e9239059f1c/src/cli.js
- https://github.com/iloveZzz/create-yss-spec/blob/8216b5c7c0d4f712828b7122b8718e9239059f1c/scripts/sync-template.js
- https://github.com/iloveZzz/create-yss-spec/blob/8216b5c7c0d4f712828b7122b8718e9239059f1c/template.manifest.json
