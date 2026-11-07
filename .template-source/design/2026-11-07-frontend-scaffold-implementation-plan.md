# Frontend 脚手架与 CLI 集成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用精简 Rust CLI 生成安全、可运行的最小 Vue 工程，并将 scaffold/application 技能接入 Frontend 分发。

**Architecture:** 静态 starter 仅进入 Frontend Bundle；新 Rust 模块定点修改 package 名并复用既有安全发布。技能负责实际能力识别和任务路由，不携带生成执行脚本。主题消费[计划 A](2026-11-07-spec-design-upgrade-plan.md)的共享源，项目安装收据与源码生成收据保持独立。

**Tech Stack:** Rust/Clap/Serde、现有 Bundle/RenderedTree、安全文件系统；Vue 3、VueUse 15、Reka、Tailwind 4、Vite、TypeScript、pnpm。

**Spec:** [已确认设计](2026-11-07-frontend-scaffold-integration-design.md)，第 1–8、10–13 节。2026-11-07 已确认设计、计划并批准执行；实际结果见末尾记录。

## Global Constraints

- 模板基线为 `24e5ef0ae394686f4883820a5318e808ff31bcdd`，CLI 基线为 `c15731df9a8aea8f9797cf5a62b73f12561a7c52`；实施前核对漂移和无关修改，使用 `codex/` 分支，必要时隔离 worktree。
- 新命令仅为 `yss scaffold frontend --project-name <kebab-case> --output-dir <existing-parent> [--dry-run]`，复用全局 `--json`；不增加 force/install/framework/with-skills 参数。
- 父目录存在、目标目录不存在；空目录也拒绝。保留路径、符号链接、设备名、子模块、并发和取消保护。
- 新工程 Node `^24.14.1`、`pnpm@10.15.0`，优先复用保留依赖精确版本；只因实际兼容问题最小修正并记录。Spec 原型的独立锁不随之升级。
- 不默认带请求、OpenAPI、路由、Pinia、权限、模拟客户业务、测试套件或维护脚本；按任务使用 application 中既有请求参考。
- 生成不安装依赖、不联网、不做 Git 初始化/提交等写操作；现有 Git 父目录的只读边界查询保留。非 Git 父目录可在没有 Node/pnpm/Git 时生成。
- Frontend 默认/可用 13/17，Spec 默认 16、Backend 默认 41；Spec 可选 scaffold，Backend 排除。不新增 Design Profile。
- 文档与技能不声称 CLI 3.2.0 已支持新命令；PATH CLI 实测仅 3.1.4，全部验收使用本次候选的绝对路径，不修改全局安装。
- 两仓不维护或分发脚本与测试套件；本计划的断言/故障注入仅在临时目录使用并清理，不提交产品测试开关。
- macOS ARM64 与 Windows x86_64 的原生生成证据分别记录。没有 Windows 条件时保留缺口，不以交叉构建代替原生回放。
- 计划编写后用户已批准实施及计划中的本地提交。推送、PR/主分支合并与发行继续使用各动作的真实授权；不预定版本、不伪造 SHA、不重发已有 5.2.0/3.2.0。

## Review Focus

1. **预检后目标抢占、暂存目录被改动：** 不覆盖外部内容，清理只针对已登记且匹配的文件；B2/B3 临时故障与并发断言。
2. **rename 成功而目录同步失败：** 用户能从普通错误读到已发布/残留路径，不被告知零写入或 recover 可清理；B2 注入验证。
3. **Vue 插值和 JSON 特殊字符：** 除 package.name 外静态字节不变，收据摘要对应实际文件；B3 逐字节验证。
4. **旧 managed `.gitignore` 收据与用户修改/删除：** 不迁移旧 ownership/hash，不重建删除文件；doctor 如实报告；B4 五态验证。
5. **父 pnpm workspace 与旧 CLI：** 安装前查父配置，新生成能力由实际帮助判断；B1/B4 验证命令作用域与旧版本路由。

## 文件、接口与顺序

`T` 为模板仓根，`C` 为 CLI 仓根；以下路径都明确所属，不是待创建的同名目录。顺序：A1 → B1；B2 可与 A/B1 独立进行；B3 依赖 B1+B2；B4 依赖 B3；B5 汇总 A3+B4。共享政策、清单与 CI 文件由最后接入它的任务单独写入，不能让并行执行者相互覆盖。

| 任务 | 主要文件 | 独立结果 |
| --- | --- | --- |
| B1 | `T/profiles/frontend/.template-spec/templates/frontend-starter/`（新）；Frontend `bundle-profile.json` 的 starter manifest 条目 | 可冻结安装和运行的静态最小工程 |
| B2 | `C/src/fs/publish.rs`、`C/src/fs/mod.rs` | 安全发布失败阶段与路径准确可见，既有调用者保持安全 |
| B3 | 新 `C/src/scaffold/frontend.rs`；`src/scaffold/mod.rs`、`context.rs`、`src/cli.rs`；CLI 帮助文档 | 新命令、catalog、来源收据可用 |
| B4 | 新 scaffold 技能；application 路由；注册/锁/公开清单、入口、教程和 Profile 分发 | 默认安装与源码生成职责分离，attach/sync 保留应用文件 |
| B5 | 模板 `.gitlab-ci.yml`；CLI `.github/workflows/rust-release.yml`、`.gitlab-ci.yml`；实际运行说明 | 固定真实跨仓来源、针对性回归和可审阅集成结果 |

## Task B1: 建立最小静态 starter

**Files:** 在 `T/profiles/frontend/.template-spec/templates/frontend-starter/` 创建设计 §5.1 的树：`package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`.gitignore`、`index.html`、`README.md`、`DESIGN.md`、`vite.config.ts`、`eslint.config.mjs`、`tsconfig.json`、`src/main.ts`、`src/App.vue`、`src/views/Home/index.vue`、约定空目录的 `.gitkeep`、Button/Input 及 `src/lib/utils.ts`、`src/styles/{main,tokens,theme}.css`、`provenance/`。只在确有需要时拆分额外 tsconfig，不能保留不存在目录的 include/reference。

**Interfaces:**

- Consumes: A1 的 DESIGN/tokens 与所需组件语义映射；固定 SCRM 来源 `a5a3315…` 中原 scaffold `assets/template/` 的可复用工程资产。
- Produces: Bundle 的 `Profile::Frontend.files` 下 `.template-spec/templates/frontend-starter/` 前缀，文件内容/模式可直接变为 `RenderedTree`。只允许 `package.json.name` 在 B3 渲染时改变；源包名固定为 `yss-frontend-starter`。

- [x] **Step 1：按白名单建立资产。** 复制配置、Button/Input、utility 和许可，重写 App/Home 为中性开发入口；保留 `views/Home/{components,hooks,schemas}` 与全局 `hooks`。不复制 CustomerSearch、services、api、openapi、mocks、patches、scripts、tests 或原 Playwright/Orval 配置。`provenance/copied-files.json` 只记录实际保留文件及来源，去掉失效文件项和已移除依赖的专用许可。
- [x] **Step 2：裁剪 package 与配置。** 运行依赖保留 `vue`、`@vueuse/core`、`reka-ui`、`class-variance-authority`、`clsx`、`tailwind-merge`；开发依赖保留实际使用的 Vite/Vue/Tailwind/TS/ESLint 集合。命令仅 `dev`、`build`、`lint`、`lint:fix`、`typecheck`，`build` 为 `vite build`。移除 useRequest 补丁注册，`onlyBuiltDependencies` 只保留实际需要的 esbuild；本地包版本以 package/lock 为准。
- [x] **Step 3：装配 A1 主题与来源说明。** `src/styles/tokens.css` 来自共享亮色 token，`theme.css` 仅提供所需组件映射，`main.css` 全局引入；不复制原型布局/场景运行器/业务模式。根 DESIGN 是默认规范，README 无项目名占位符；没有无行为按钮或自动业务请求。记录固定源与改编，不手改 vendor 来源摘要。
- [x] **Step 4：更新锁并验证可运行性。** 在仓外、确认不受父 workspace 枚举的临时副本使用 pnpm 10.15.0 执行 `pnpm install --lockfile-only`，回写实际锁；再 `pnpm install --frozen-lockfile`、`pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm dev`。预期各检查退出 0，桌面/窄屏起始页可打开，键盘焦点可见，无业务网络请求；发生兼容问题时同步 package/lock 和原因，不升级无关依赖。
- [x] **Step 5：把资源加入 Bundle。** 修改 `T/profiles/frontend/.template-source/distribution/bundle-profile.json` 的 `manifest.allowFiles`，加入 `.template-spec/templates/frontend-starter`；不加入任何 `installations.*.files`、`skills` 或 `skillReferences`。校验静态树没有 `.yss/scaffold.json`、项目收据或 AGENTS/CLAUDE；B3 负责生成收据。
- [x] **Step 6：提交 starter 与来源。** 建议 `feat: add minimal Frontend starter assets`。记录实际依赖验证环境，供 B3 打包使用；B4 再修改同一 Frontend 政策的技能与 ownership 字段，保留此 manifest 条目。

## Task B2: 补足共享安全发布的失败说明

**Files:** `C/src/fs/publish.rs` 的 `publish_new_tree`；`C/src/fs/mod.rs` 的 `Root::rename`。消费方 `project::execute(Action::New)`、`updater::execute(Action::New)` 和 Java scaffold 只核对，不无故改业务逻辑。

**Interfaces:**

- Consumes/Produces: 保持 `Root::rename`、`fs::publish_new_tree` 的现有签名与 `YssError { code, message, path, context }`；不增加事务、恢复协议、覆盖选项或模板引擎。
- 新错误上下文约定为字符串：`renameApplied="true"` 与 `from/to` 表示系统 rename 已完成；publisher 加 `phase`（`staging/publishing/published`）、`targetPath`、`stagingPath`、`cleanup`（`not-needed/removed/retained/failed`），只记录真实已知阶段。

- [x] **Step 1：临时复现错误可见性缺口。** 当前清理使用 `let _ = root.remove(...)`，rename 后 fsync 失败未区分。使用一次性源码副本对 `sync_dir/remove` 注入失败，临时用例 `reports_cleanup_residue` 断言 `cleanup=failed` 且 stagingPath 指向实际残留；`reports_post_rename_failure` 断言 `renameApplied=true`、`phase=published`、目标字节仍在；两者同时断言普通错误 message/path 含实际路径。旧行为应缺少这些说明。故障注入及断言不落入正式产品。
- [x] **Step 2：在准确位置增加上下文。** 仅在系统 rename 已成功后的校验/同步错误添加 `renameApplied/from/to`；publisher 保存实际阶段与已登记快照，汇总清理结果。暂存创建可能已落盘的错误携带真实暂存路径；未确认归属的内容保留。目标已发布时不删除目标。
- [x] **Step 3：让普通输出也可行动。** 现普通错误只显示 message/path，故 message/path 必须简短指出“目标已发布”或“临时内容保留”及实际位置，JSON context 提供细节。不能只加 JSON 字段，也不能建议 recover 处理非事务暂存。
- [x] **Step 4：验证公共调用者和取消。** 用临时断言回放一次项目新建成功、Java scaffold 成功，以及发布前取消、发布时目标抢占、快照被修改、清理失败、发布后同步失败。预期原有用户/竞争者字节不变，既有成功行为不变，残留与错误阶段一致。可复用 `Cancellation::cancel()`，不新增产品环境开关。
- [x] **Step 5：格式检查并提交。** `cargo fmt --all -- --check` 退出 0；建议 `fix: report scaffold publish and cleanup failure states`。未覆盖的平台行为在 B5 如实列出，不放宽路径校验来通过检查。

## Task B3: 实现 Frontend 生成入口与报告

**Files:** 新增 `C/src/scaffold/frontend.rs`；修改 `src/scaffold/mod.rs`、`src/scaffold/context.rs`、`src/cli.rs`、`docs/scaffold.md`、`docs/cli-help.md` 和 README 的实际命令入口。

**Interfaces:** 新模块使用以下边界；内部类型的 derives/import 按现有风格，报告 camelCase。

```rust
pub struct FrontendInputs { pub project_name: String }
pub struct FrontendRequest {
    pub input: FrontendInputs,
    pub output_dir: PathBuf,
    pub dry_run: bool,
}
pub fn render(bundle: &Bundle, request: &FrontendRequest) -> Result<RenderedTree>;
pub fn generate(bundle: &Bundle, request: &FrontendRequest,
    cancel: &Cancellation) -> Result<FrontendReport>;
pub fn catalog(bundle: &Bundle) -> Result<FrontendCatalog>;
```

| 结构 | 确定字段 |
| --- | --- |
| `FrontendReport` | `root:String`、`status`=`planned/generated`、`dryRun:bool`、`files:usize`（含收据）、`source:SourceProvenance`、`bundleDigest:Sha256` |
| `FrontendCatalog` | `command`=`scaffold frontend`、`requiredFlags:Vec<String>`=`[project-name,output-dir]`、`engines:BTreeMap<String,String>`、`packageManager:String`、`source:SourceProvenance`、`bundleDigest:Sha256` |
| private `FrontendReceipt` | `format`=`yss.scaffold`、`formatVersion`=1、`architecture`=`frontend`、`input`、`source`、`bundleDigest`、`files`、`directories`；camelCase、`deny_unknown_fields` |

`source` 沿用 `{commit,state,snapshot}`；`files/directories` 的集合类型沿用已有收据/RenderedTree，不新增包格式。Java `Architecture` 与 `ScaffoldReport` 不加入前端分支。

- [x] **Step 1：复用工程名校验。** 在 `context.rs` 提取现有 kebab-case 逻辑为 `pub(super) fn validate_project_name(name: &str) -> Result<()>`，Java 和 Frontend 共用；Frontend 同时用 `RelPath::new` 检查设备名/越界。不改变 Java 名称规则。
- [x] **Step 2：实现静态渲染。** 遍历 `bundle.profile(Profile::Frontend)?.files` 的 B1 前缀，用 `bundle.bytes(file)?` 取字节，剥离该前缀构成相对路径并保留模式。验证必要资源和 JSON，结构化修改 `package.json.name`；其他内容原样复制。禁止调用 Java 全局替换/拒绝 `{{`、Maven 平台、wrapper 或 Java 上下文逻辑。
- [x] **Step 3：生成前端收据。** 用 `FileDescriptor::new(bytes, fs::observable_mode(mode))` 描述实际文件，收据不纳入自己的摘要，目录集合含 `.yss`。现 `validate_control` 已接受 `yss.scaffold/1`，无需扩大控制目录白名单。收据只说明生成来源，不授予 sync 管理应用源码的权限。
- [x] **Step 4：实现预检与发布。** dry-run 与真实生成都要求父目录已存在并通过既有安全预检、目标不存在；不能复制 Java dry-run 允许父目录缺失的分支。预检完成且资源有效后才调用 B2 的发布函数。dry-run 不创建任何目录、锁、控制文件、缓存或计划。
- [x] **Step 5：接入 Clap 与报告。** 新增 `ScaffoldCommand::Frontend(FrontendScaffoldArgs)` 与独立 `Report` variant，参数仅 project_name/output_dir/dry_run。`CatalogReport` 只加 `frontend` 字段，保留 Java platforms/requiredFlags/source；读取 starter package 的 engines/packageManager，不手写另一份版本表。继续普通 pretty JSON / `--json` 的现有输出信封。
- [x] **Step 6：打包构建并执行临时断言。** 按下方构建命令生成专用 CLI；在非 Git 临时父目录中用绝对程序路径及 `PATH=''` 生成，证明不依赖 Node/pnpm/Git。对预览前后文件树做快照比较，预期完全不变。临时断言逐文件比较两次独立生成的静态字节、模式/摘要、Vue `{{ }}`、CSS/JS 花括号、`$ref`、package.name 和收据；非法名、保留名、空/非空目标、符号链接、缺父目录均拒绝且原内容不变。资源缺失/损坏的临时 Bundle 应在写入前报错；Git 父目录缺 Git 按既有边界拒绝，不为通过检查绕过保护。
- [x] **Step 7：核对兼容并提交。** `scaffold frontend --help` 参数正确、未知 Java 参数拒绝；catalog 原字段值保持，新增 frontend 指向实际环境；DDD/MVC 各一条代表生成通过。说明 Git 只读边界、错误残留、生成/运行区别及尚未发行状态。建议 `feat: add native Frontend scaffold command`。

```sh
# 在 CLI checkout 内；source-root 指向完成 B1 的实际模板 checkout。
cargo run --locked --bin yss-bundle -- --source-root /absolute/template-checkout --out assets/bundle.tar.gz
cargo fmt --all -- --check
cargo build --locked --release --bin yss --target aarch64-apple-darwin
# 后续所有 yss 调用都使用这里输出的绝对二进制路径。
```

## Task B4: 集成技能、分发政策和接入文档

**Files:**

- 新 `T/.agents/skills/yss-frontend-scaffold-generator/{SKILL.md,agents/openai.yaml,references/usage.md,references/source-adaptation.md}`；根 Claude 链接及根/Frontend 两份 WorkBuddy 副本。
- `T/.agents/skills/yss-frontend-application/{SKILL.md,references/bootstrap.md,references/integration-design.md,references/source-adaptation.md}` 及对应副本。
- 根与 Frontend 的 `.template-spec/agents/yss-skill-registry.yaml`、`skills-lock.json`、`yss-public-skills.json`；根、Frontend、Backend 的 `.template-source/distribution/bundle-profile.json`。
- `.template-spec/agents/frontend-skills-adaptation.md` 及 Frontend 副本；根注册表的 `retirement_contract.retired_ids`；`.template-spec/agents/skill-migrations.md` 的当前补充。
- `.template-source/distribution/entries/frontend-{project-AGENTS,skills-AGENTS,project-README}.md`、`profiles/frontend/{AGENTS,README}.md`、根 README；`.template-spec/user-guide/cli/{tutorial-frontend,command-reference}.md` 及 Frontend/Backend 对应副本。

**Interfaces:**

- Consumes: B3 的真实帮助/catalog，B1 的 Bundle 资源，现有所有权/选择器语义。
- Produces: 新建工程 → scaffold → application；已有工程 → application；安装技能不复制 starter。应用生成后通过单独 `attach --installation skills` 接入。

- [x] **Step 1：建立轻量技能与元数据。** scaffold 描述限定不存在的新目录，先识别实际 CLI 能力再调用 B3；仅创建源码和创建可运行应用按用户目标区分。旧 CLI 不支持时报告版本缺口，不能回退旧 Node 生成器。来源说明记录剪裁和当前调用方式，不携带 starter 本体。
- [x] **Step 2：更新应用技能与教程路由。** 移除现役“不提供 scaffold/空目录才初始化”冲突表述，保留设计还原、单一请求状态所有者、取消语义与纯样式的适度验证。目录约定统一为 B1；请求/OpenAPI 按任务接入原有小型参考，不进入默认工程。安装依赖前核对父 workspace 的真实范围。
- [x] **Step 3：同步注册、公开清单与锁。** 根 registry 移除新技能的 retired id，新增 specialist/supported 且 Spec 默认 false；Frontend 默认 true。Frontend 12/16→13/17，根 shared 59→60、public 40→41，Frontend shared/public 16→17；Backend shared/default/public 53/41/21 不变。根与 Frontend 锁无 effectiveHash，不新加；不新建运行期 `.yss-skills-manifest.json`。保留旧退役历史，只追加重新引入说明，不恢复旧 capability/recipe。
- [x] **Step 4：调整分发与文件归属。** Frontend manifest 加新技能 canonical/WorkBuddy 目录，两种安装加默认技能与必要引用；根两种安装只加必要 skillReferences、不改变默认集。Backend `excludePaths` 显式排除新技能 canonical 与 WorkBuddy 两路径。Frontend 两种安装的 `.gitignore` 改 `user-owned`、基础 files 保留；不改全局冲突算法。starter 继续只存在 manifest。不要创建 Frontend 重复 `.agents/skills` 主源或嵌套链接。
- [x] **Step 5：同步入口/副本并验证引用。** 普通 WorkBuddy 全目录与源一致，根 Claude 使用相对链接；来源与目录规范在 Spec/Frontend project/skills 都可达。`harness-profile.yaml` 的 `minimum_cli_version: 3.2.0` 继续表示 Profile 安装；新 scaffold 以实际能力识别，未发行前不虚构版本。
- [x] **Step 6：演练安装与旧收据。** 重建内嵌 B4 模板的候选，覆盖 Spec/Frontend 两种安装、Backend 排除及 Frontend sync 幂等；安装目录无 starter。生成工程后 attach skills，比较 app、package/lock、README/DESIGN 摘要不变，两类收据并存。对 `.gitignore` 执行下表断言。

| 状态 | 预期 |
| --- | --- |
| 新 attach 已有文件 | 原字节不变、无新增受管收据项 |
| 新 init/attach 缺文件 | 创建且记录 user-owned |
| 旧 managed 收据后 sync | 文件、旧 ownership/hash 保留，不自动迁移 |
| 用户修改有收据文件 | sync 保留；doctor 报实际差异 |
| 用户删除有收据文件 | sync 不重建；doctor 报缺失 |

doctor 即使存在差异也可能正常退出，必须断言 JSON `.result.differences` 的实际内容；不能只检查退出码。旧收据样本来自本轮改动前的临时安装，保留原字节，不手工伪造新的 ownership 作为“旧版本证明”。

- [x] **Step 7：验证技能触发并提交。** 用新建、已有改造、只读 review、只安装技能、请求/OpenAPI、旧 CLI 六个简短任务核对正确入口、产物与无越权动作；可用新执行上下文演练但不写持久 eval 套件。建议 `feat: integrate Frontend scaffold skill and distribution`。

## Task B5: 固定跨仓来源并完成针对性集成验证

**Files:** 上表 CI 文件、`C/docs/build-install.md`（仅实际方式有变化时）、两仓已修改的帮助与来源说明。发行版本文件和历史 release 记录不在此任务修改范围。

**Interfaces:**

- Consumes: A3+B4 完整模板、B2+B3 CLI 真实提交、实际 Bundle digest。
- Produces: 可审阅的实施结果与验证范围；不把计划、交叉编译或本地源码等同发布产物。

- [x] **Step 1：固定真实提交。** 先形成包含全部功能的模板提交和 CLI 提交；CLI 的两个 CI 来源指向包含 starter 的真实模板提交，模板 `.gitlab-ci.yml` 三处 CLI pin（fetch、checkout 验证、version source）同步指向含新入口的真实 CLI 提交。不要求两个仓库最终 HEAD 相互引用；只固定功能完整、可取得的提交，避免循环制造 SHA。
- [x] **Step 2：补充现有 CI 内联演练。** 模板既有 `verify-scaffolds` job 加 frontend 的直接生成/预览检查，复用其临时目录和程序；不恢复脚本或测试目录。若固定提交尚未推送而 CI 无法取得，记录等待远端可达，不能声称 CI 已通过；推送按实际授权另行执行。
- [x] **Step 3：从最终干净候选重新打包构建。** 使用 B3 命令，核对 `source.commit/state/snapshot` 和 Bundle 摘要；执行一次 `cargo clippy --locked --bin yss -- -D warnings` 与格式检查。前面已有检查无变动时复用结果，只重跑新改动影响的断言；最终生成/来源检查必须对应当前二进制。
- [x] **Step 4：完成最终生成→运行→接入回放。** 候选生成、冻结依赖安装、lint/typecheck/build、实际起始页、attach skills、sync/doctor；保留各步骤不同结论。核对 A/B 重叠 token、许可证与来源说明一致；不宣称业务 UI 已还原。生成模式依赖包声明，不能把失败安装当作成功工程。
- [x] **Step 5：按平台记录证据。** macOS ARM64 原生执行生成和保护场景；Windows x86_64 在可用原生环境执行至少生成、dry-run、重复/保留名称/路径保护及收据核验。应用运行另记环境与结果；平台不可用时明确未覆盖，不新增远程服务或购买工具来替代。
- [x] **Step 6：范围审查与交接。** 检查两仓最终 diff、无持久验证材料/无来源项目修改、受影响 Java/安装/发布错误行为、技能与清单一致。说明实际执行命令、最终提交/摘要、未覆盖项；建议提交 `chore: align Frontend scaffold integration sources`。PR/合并/发行不是本计划已完成的动作。

## 覆盖与执行选择

已有安装/生成命令按当前源码核对如下；在隔离临时目录执行，用实际产物替换路径。这里是后续命令样例，不是本轮执行记录。

```sh
candidate_yss=/absolute/cli-checkout/target/aarch64-apple-darwin/release/yss
frontend_check_root="$(mktemp -d "${TMPDIR:-/tmp}/yss-frontend-check.XXXXXX")"
"$candidate_yss" version --json
"$candidate_yss" scaffold catalog --json
"$candidate_yss" scaffold frontend --project-name my-frontend --output-dir "$frontend_check_root" --dry-run --json
"$candidate_yss" scaffold frontend --project-name my-frontend --output-dir "$frontend_check_root" --json
"$candidate_yss" attach --root "$frontend_check_root/my-frontend" --profile frontend --installation skills --json
"$candidate_yss" skills list --root "$frontend_check_root/my-frontend" --json
"$candidate_yss" sync --root "$frontend_check_root/my-frontend" --dry-run --json
"$candidate_yss" sync --root "$frontend_check_root/my-frontend" --json
"$candidate_yss" doctor --root "$frontend_check_root/my-frontend" --json
```

Java 回放只验证生成结构和旧字段，不扩大为全量 Maven 构建；先确认 catalog 仍含该组合：

```sh
for architecture in ddd mvc; do
  "$candidate_yss" scaffold "$architecture" --project-name "$architecture-sample" \
    --base-package com.example.sample --output-dir "$frontend_check_root" \
    --platform-profile spring-boot-3.5-jdk17 --spring-boot-version 3.5.16 \
    --java-version 17 --group-id com.example --project-version 1.0.0-SNAPSHOT \
    --parent-group-id com.yss.cloud --parent-artifact-id yss-cloud-microservice \
    --parent-version 3.2.0-SNAPSHOT --yss-components-version 3.2.0-SNAPSHOT --json
done
```

| 设计要求 | 任务 |
| --- | --- |
| §1–4 目标、边界、职责路由 | B1、B4 |
| §5 工程内容与环境 | B1 |
| §6 分发和引用 | B1、B4 |
| §7 命令/catalog/渲染/收据 | B2、B3 |
| §8 接入及 `.gitignore` | B4 |
| §9 Spec 设计能力 | 配套计划 A；B1/B5 消费与核对主题 |
| §10 消费方与固定来源 | B4、B5 |
| §11 验收与平台边界 | B1–B5 |

计划自查覆盖了已确认设计、公开类型/字段、共享发布调用者和五项风险；没有新增通用引擎或测试基础设施。建议采用当前会话顺序实施，主题/CLI 发布函数可按文件责任并行调查，最后一次完整分支 review；若选择逐任务子代理实施，则每个任务明确文件归属并保留其他执行者改动。执行方式由用户审阅后选择。

## 执行记录（2026-11-07）

B1–B4 已实施。模板功能提交 `0205c5eb`、`56707076`；CLI 功能提交 `385be7b`、`1258ce1`。新技能默认分发后 Frontend 为 13/17，Spec 默认 16、Backend 默认 41 不变。安装入口的 Java 文案另作限定，并核实旧算法后只更新受影响 Backend effectiveHash。

最小 starter 在 Node 24.14.1、pnpm 10.15.0 完成冻结安装、lint、typecheck、build 和 Chromium 桌面/窄屏入口及焦点检查。原生 macOS ARM64 CLI 完成 PATH 为空的生成、零写入 dry-run、两次生成字节/模式/收据一致、非法/保留名称、空/非空目标、链接及缺父目录保护；Java DDD/MVC 生成与原 catalog 字段保持兼容。临时 Rust 断言验证缺资源/损坏 package 在写入前拒绝，Vue 插值、JS 字面量和 $ref 原样复制。

共享 publisher 在一次性源码副本中先复现旧行为缺少失败上下文，再通过清理失败、rename 后同步失败、被修改快照、取消、目标抢占和成功发布断言。测试及故障开关均未进入产品。

六个 Profile/安装范围完成实际 init；Spec 按需补装、Backend 排除、Frontend sync 幂等成立。生成工程 attach 后应用、package/lock、README/DESIGN/.gitignore 字节保留，两类收据并存。缺失 .gitignore 新建为 user-owned；修改/删除后 sync 保留现状且 doctor 分别报告 modified/deleted；本轮旧候选产生的 managed 收据保持原 ownership/hash。六种技能路由完成文本演练，不把它当作宿主发现实测。

B5 已固定真实功能提交并扩展既有 CI 内联演练，未新增脚本或测试套件。Clippy `-D warnings` 通过。Windows 原生环境不可用，未将交叉编译当作运行证据；CI pin 尚未推送，远端 pipeline 未运行。已从干净提交重建候选，完成生成→冻结安装→lint/typecheck/build→浏览器→attach→sync/doctor 回放；适用源码和文档摘要保持不变。本地执行了既有 verify-scaffolds 内联 job，不能将其报告为远端 CI 通过。尚未推送、合并或发行。

独立完整分支 review 使用新上下文完成，发现两项 Important/P2：两份注册表新增条目离开 skills 列表导致 YAML 解析失败；starter Input 的错误边框被默认/focus 样式覆盖。两项均先用临时断言复现，再修正并通过：注册表可解析且 active/default 标记正确；实际 vendor Input 在默认、hover、focus 状态都保留错误色，vendor 未改。全部 20 个变更 JSON/YAML 可解析，starter 再次完成 lint/typecheck/build 与浏览器检查。遗留客户演示标题也按已确认的中性入口范围改正；功能修复提交 `1a2aee42`。

CLI CI 固定含修复的模板提交 `1a2aee4270f96cd923724a09eeeef5b3fd09d60a`；模板 CI 固定 CLI 提交 `9f3fcc43ddea61d501365d65d5e7f36a9987b7e0`。两者均是真实本地提交，尚待对应推送后远端可取。评审后仅做一次定向修复和验证，无二次独立 review；没有未处理的重要发现。Windows、远端 CI/发行、宿主实际发现、跨浏览器/读屏/触摸继续保留为未验证范围。

实施判断：仓库不持久化脚本/套件约定优先于通用技能的全量套件要求，临时断言只证明列明范围；标题修正属于已确认中性工程范围，影响仅浏览器标题；本次保留本地分支与 worktree，不重复询问集成选项，也不把此前已完成发行的授权扩展为新发行。
