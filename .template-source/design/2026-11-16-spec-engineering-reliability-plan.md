# Spec 工程能力增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 修订现有方法并完成 Codex 首轮受控对照，使来源采用、项目验证接续和技能改版效果具有可追溯证据。

**Architecture:** 复用五个参考文件，由现有技能入口消费，同步各 Profile 有效内容与分发。固定修改前输入，独立准备留出案例，再将候选装入隔离工程并观察真实新会话。来源、分发、执行和改善结论分别记录。

**Tech Stack:** Markdown、既有 JSON 清单、Git、Node 标准库、现有 Rust `yss-bundle` 与 YSS CLI、Codex。受控工程沿用既有 Vue/Vite 与 Node HTTP Demo。

**Spec:** [Spec 下一版工程能力增强设计与验收方案](2026-11-16-spec-engineering-reliability-design.md)。用户已选择方案 A，首轮 Codex，其他宿主分别记录，实际验证在实施阶段完成。执行者同时阅读设计和本计划。

## Global Constraints

- 本仓不维护或分发脚本与测试套件。
- 不为普通任务建立统一开工或交付门禁。
- 首轮主要验收宿主为 Codex，实际运行验证留到后续实施阶段。
- 共享源和 Backend 专有源各自维护，不复制整个共享技能覆盖 Backend 专有方法。
- 保留 `sourceRevision`、`upstreamHash` 的原始来源含义。
- 提交、推送、部署、发行及向外部发送内容使用对应动作的真实授权，复用仍有效的授权。
- 本轮不需要修改 CLI 命令或数据结构。
- 真实业务规则与规格冲突时保留原始依据，不得修改规格来迁就实现。
- 未取得原始记录的成本指标写未知。受阻、人工纠正后的完成与首次独立完成分别记录。
- 保护用户全局配置、原 Demo、已有进程与无关工作。观察不得扩大为真实 SCRM 试点。

用户于 2026-11-16 批准执行，采用推荐的 Native 方式。以下复选框记录实际完成状态。方法正文采用先确定预期、保存基线、再修订与观察的顺序，不为 Markdown 改动增加代码测试套件，也不要求原方法必须失败。

## Review Focus

1. 默认安装恰好带齐 setup，可能掩盖 implement 单项缺少宿主参考。任务 2、4 检查四处显式资源声明和最小选择视图。
2. 同名资源、工程根引用与技能目录相对引用混用，可能读到另一版本。任务 2、5 核对真实路径、必要资源与 S2/S3。
3. HEAD 未变但正文、资源或模型已变，可能把不同输入混成一次比较。任务 1、5、6 检查 S4/C5，输入变化后单独分批。
4. 端口属于其他工作树，或中断后进程身份已变，可能清理错误资源。任务 3、6 检查 V3/V5，停止前重新核对当前身份和归属。
5. 失败重试、人工提示及缺失 Token 被遗漏，可能制造改善结论。任务 1、6 检查 C4/C5，保留每次尝试和缺失值。

---

## 文件结构与任务依赖

下列仓内路径相对 `/Users/zhudaoming/Projects/yss-spec-project-template`。编制时 HEAD 为 `bc008f11252507601549f079511f957ce73d301e`，研究报告和设计为未跟踪文件。执行开始重查状态，保留这些输入及其他会话修改。

| 文件或目录 | 责任与任务 |
| --- | --- |
| `.agents/skills/i-have-adhd/references/pr-and-retro.md` | 对照方法，任务 1 |
| `.agents/skills/implement/references/repository-scope.md` | 任务来源、相对资源与受限接续，任务 2 |
| `.agents/skills/setup-yss-harness/references/host-compatibility.md` | 宿主证据层次，任务 2；本轮结果追加，任务 6 |
| `.agents/skills/yss-frontend-application/references/verification.md` | 项目验证入口，任务 3 |
| `profiles/backend/.agents/skills/implement/references/build-deploy-guide.md` | Backend 项目入口，任务 3 |
| `.template-source/distribution/bundle-profile.json` | Spec 的 project、skills 两处 implement 叶子资源，任务 2 |
| `profiles/backend/.template-source/distribution/bundle-profile.json` | Backend 对应两处叶子资源，任务 2 |
| `profiles/backend/skills-lock.json` | 仅受影响的三个既有 `effectiveHash`，各内容任务同步，主执行者负责 |
| `.template-spec/agents/matt-skills-adaptation.md` | 方法来源及本轮实际适配结果，任务 6 |
| `profiles/backend/.template-spec/agents/matt-skills-adaptation.md` | 同步适配记录，任务 6 |
| `profiles/frontend/.template-spec/agents/matt-skills-adaptation.md` | 同步适配记录，任务 6 |
| `.workbuddy/skills/`、`profiles/backend/.workbuddy/skills/`、`profiles/frontend/.workbuddy/skills/` | 下表列出的 11 个普通副本，随所属任务同步 |
| `.claude/skills/` | 现有共享软链接只核对。Backend/Frontend 的视图由 Bundle 派生 |
| 本次隔离证据目录 | 固定输入、匿名映射、原始运行、产物与 `RECORD.md`。任务内材料，不放入模板分发 |

11 个副本的精确归属如下。表内路径相对于对应 Profile 的 `.workbuddy/skills/`。

| 任务 | 根 Spec | Backend | Frontend |
| --- | --- | --- | --- |
| 1 | `i-have-adhd/references/pr-and-retro.md` | 同左 | 同左 |
| 2 | `implement/references/repository-scope.md`、`setup-yss-harness/references/host-compatibility.md` | 同左 | `setup-yss-harness/references/host-compatibility.md` |
| 3 | `yss-frontend-application/references/verification.md` | `implement/references/build-deploy-guide.md` | `yss-frontend-application/references/verification.md` |

顺序为任务 1 → 2 → 3 → 4 → 5 → 6。三项能力共同使用来源定位、候选分发和比较证据，保持一份计划。主执行者维护共享源、锁和适配记录，独立执行者只领取单个受控场景及其目录。若委派写入，明确文件所有权并要求保留其他人的修改。

任务 1 的冻结目录称为 `baseline`，任务 4 冻结的集成候选称为 `candidate`。这两个名称仅为本次目录标签。各任务的接口是文件、路径和证据，没有新增函数签名或运行时协议。需要隔离 worktree 时，在执行阶段先使用 `superpowers:using-git-worktrees`；持久修改分支沿用 `codex/` 前缀。

## 已核查的操作依据

候选打包从 CLI 仓的现有入口执行，输出放本次证据目录。下列命令中的 `spec_run_root` 在任务 1 创建，并记录其实际绝对路径。

```sh
CARGO_TARGET_DIR="$spec_run_root/bundle-target" cargo run --locked --manifest-path /Users/zhudaoming/Projects/yss-cli/Cargo.toml --bin yss-bundle -- --source-root /Users/zhudaoming/Projects/yss-spec-project-template --out "$spec_run_root/baseline/bundle.tar.gz"
```

如果执行者使用隔离模板工作树，把 `--source-root` 换为该实际路径。后续候选打包只改变输出目录及所选源状态。构建结果应输出含 `path`、`sha256`、`bytes`、`objects`、`source` 的 JSON。内部构建与加载会检查对象和声明，但不会解析 Markdown 引用，不能据此证明正文引用全部正确。

现有 `Bundle::select` 会并入默认技能。因此“默认安装成功”不替代单项闭包检查。现有 CLI 没有 effectiveHash 子命令或外部 Bundle 安装参数，不使用虚构的 `verify`、`--bundle` 或 `YSS_BUNDLE_PATH`。

Backend 摘要按 [现有算法](../agents/skills-maintenance.md) 计算。先合并共享树和 Backend 覆盖，忽略 `.DS_Store`、`__pycache__`、`.iml/.pyc/.pyo`，以技能根相对路径用 Node `localeCompare` 排序。逐项向 SHA-256 输入路径、NUL、内容、NUL，无 NUL 文本将 CRLF 归一为 LF。一次性内联 Node 核对即可，不恢复旧脚本。权限、链接和普通副本字节另行核对。三个字段为 `skills.shared.i-have-adhd.effectiveHash`、`skills.shared.implement.effectiveHash`、`skills.shared.setup-yss-harness.effectiveHash`。

## Task 1：落实比较方法并保存修改前输入

**Files**

- 修改 `.agents/skills/i-have-adhd/references/pr-and-retro.md` 的“真实任务观察与反馈关闭”，当前第 24—41 行。
- 同步文件表中任务 1 的三份副本，更新 `profiles/backend/skills-lock.json` 的 i-have-adhd 既有摘要。
- 只读 `.agents/skills/maintaining-skills/SKILL.md` 和 `.agents/skills/writing-for-agents/SKILL.md` 的现有调用。
- 本次证据目录创建 `baseline/`、`cases/`、`runs/`、`RECORD.md`。不提交这些临时执行材料。

**Interfaces**

- 消费设计第五、七部分及当前有效文件，输入尚未被本轮方法改动覆盖。
- 产出固定的 baseline Bundle、相关原文件依据、场景输入与冻结预期，以及后续任务采用的统一比较口径。
- 留出案例由独立评审者保存，改稿者只接收类别和冻结依据，不能读取具体输入或答案。

- [x] **步骤 1，确认工作范围并建立本次证据位置。** 分别运行模板与 CLI 的 `git status --short`、`git rev-parse HEAD`，读取相关未提交差异。用 `mktemp -d /Users/zhudaoming/.codex/verification/spec-engineering-XXXXXXXX` 创建本次目录，设置 `spec_run_root`，创建 `baseline/`、`cases/`、`runs/` 子目录，在 `RECORD.md` 写实际路径、两仓版本、允许修改范围和工具版本。父目录不存在时先创建该证据父目录。
- [x] **步骤 2，冻结修改前内容。** 用上节真实 `yss-bundle` 命令生成 baseline 包，保存其输出及 SHA-256。保存本次五个参考、两份清单、Backend 锁和相关差异的原始依据，纳入未跟踪输入。期望包可读，来源及工作树状态可定位。打包受阻时仍保存输入并记录原因，不能把缺包记为完成。
- [x] **步骤 3，确定受控预期和独立留出案例。** 把设计 S1—S5、V1—V5、C1—C5 映射到任务 5、6，指定来源及运行记录位置。独立评审者另外准备来源冲突、项目异常接续、授权范围三类留出输入与预期，先保存摘要和日期，候选冻结后才交执行者。已知历史 Demo 案例只作为回归输入。
- [x] **步骤 4，修订 pr-and-retro。** 只补可比条件、自然发现与明确来源分组、独立上下文、匿名评审、留出污染处理、全尝试成本与人工纠正。保留原有“不为普通任务自动建立复盘”“缺失指标未知”“不改全局配置”的边界。
- [x] **步骤 5，核对方法解释。** 以明确标注的模拟记录检查表述。输入为首次工具失败、第二次经人工纠正后完成、耗时可得但 Token 缺失、第三次候选内容改变。预期必须保留前两次、区分独立和辅助完成、Token 为未知、第三次另批。此项只验证方法解释，真实运行比较留到任务 6。
- [x] **步骤 6，同步三份副本和已有摘要。** 对每份副本与共享源执行 `cmp`，预期无输出且退出 0。按上节算法重算 i-have-adhd 有效树，核对锁中只有该摘要变化，原始来源字段不变。
- [x] **步骤 7，核对现有调用仍有效。** 直接读取两个调用方及 Spec/Backend 的 project、skills 引用清单，确认仍指向同一份 pr-and-retro。没有路由缺口就不修改调用方。记录本任务静态完成与待实际观察范围。

## Task 2：落实来源选择和单项关联资源

**Files**

- 修改 `.agents/skills/implement/references/repository-scope.md` 当前第 15—19 行。
- 修改 `.agents/skills/setup-yss-harness/references/host-compatibility.md` 当前第 5—12 行及必要条件说明。
- 修改 `.template-source/distribution/bundle-profile.json` 当前第 365、554 行的 implement 资源数组。
- 修改 `profiles/backend/.template-source/distribution/bundle-profile.json` 当前第 291、542 行的对应数组。
- 同步任务 2 的五份 WorkBuddy 副本，更新 Backend 锁中 implement 与 setup-yss-harness 的既有摘要。

**Interfaces**

- 消费任务 1 的 baseline 和冻结的来源场景。保留来源发现、实际读取、执行结果各层区别。
- 产出明确的工程根引用 `.agents/skills/setup-yss-harness/references/host-compatibility.md`，Spec/Backend 的 project、skills 四处 `skillReferences.implement` 均声明该资源。
- Backend 继续继承共享 repository-scope，专有 SKILL、openai.yaml 和其他参考保留。

- [x] **步骤 1，补条件式来源表述。** 在同名冲突、目标工程变化或来源受限时要求记录真实采用路径、内容版本和必要资源读取依据。明确技能目录相对路径与工程根引用的解析方式，保留宿主指令层级。不会遇到这些条件的局部任务直接执行。
- [x] **步骤 2，消除缺少技能时的自动安装歧义。** 当前 repository-scope 第 19 行的“沿原安装来源补齐”限定于安装同步任务或已有对应授权。普通任务准确说明依赖缺口并继续独立工作，不能默换版本、切 Profile 或触发升级。
- [x] **步骤 3，补宿主证据说明。** 在 host-compatibility 保留现有四项事实，补正文与必要资源的实际读取、静态摘要与读取记录各自限制、首次误用与纠正分别记录。显式读取接续不能算自然发现通过。保留 2026-11-15 历史表原意。
- [x] **步骤 4，声明新增叶子资源。** 在上述四个 implement 数组各加入完整工程根路径，不添加 setup 技能依赖或修改默认技能集合。核对该文件中新增的任务必需引用是否继续依赖其他文件，存在时只补真正需要的闭包。
- [x] **步骤 5，检查最小选择视图。** 从两份清单的两种模式分别取 implement、已有传递依赖及其 `skillReferences`，不并入默认集合。逐项解析本次正文引用，预期四份视图均包含宿主参考且路径可读。在隔离视图中临时去掉该声明，检查应能指出缺少此资源；不能靠保留整个 setup 目录通过。此视图只证明声明与文件关系，运行验证在任务 5。
- [x] **步骤 6，同步副本并核对 Backend 叠加。** 五份副本逐项 `cmp`，Backend repository-scope 对共享源，其他专有入口保持原样。重算 implement 和 setup-yss-harness 有效树摘要，检查差异只涉及已批准内容和摘要。
- [x] **步骤 7，完成来源规则审查。** 对设计 S2/S3/S5 逐条核对正常来源、资源缺失和可显式接续的处理。确认文件读取证据和实际行为均有各自验收位置，不能用本步静态核对报告 Codex 通过。

## Task 3：补齐前后端项目验证接续指引

**Files**

- 修改 `.agents/skills/yss-frontend-application/references/verification.md` 的代表路径与交付说明衔接处，当前第 39—48、63—69 行。
- 修改 `profiles/backend/.agents/skills/implement/references/build-deploy-guide.md` 的实际工程说明，当前第 5—18 行，保留第 40—44 行操作边界。
- 同步任务 3 的三份副本，更新 Backend implement 既有摘要。
- 只读原 Demo 的 web/api README、package.json 和 Home 合成规格。

**Interfaces**

- 消费设计第四部分及项目现有入口，使用任务 2 确定的来源规则。
- 产出按需读取项目入口的指引，包括前提、启动与就绪身份、相关正常和异常动作、预期与实际结果、资源归属及恢复。运行载体和真实预期交给任务 6。

- [x] **步骤 1，对照真实项目入口识别文字缺口。** 使用 `/Users/zhudaoming/.codex/demos/spec-home-repo-20261114/web/README.md` 和 `api/README.md`，将入口已有信息与设计第四部分核对。完整信息直接引用，候选方法只补如何发现和使用缺失信息的规则。
- [x] **步骤 2，修订前端验证指引。** 写清先找已有入口、检查命令副作用、实际服务来源、代表正常与异常路径、结果及必要副作用、证据保存和本次资源清理。保留现有视觉、交互、Mock 边界和局部重验要求，不要求普通文案任务启动服务。
- [x] **步骤 3，修订 Backend 运行说明指引。** 在现有结构中补可接续前提、启动与停止身份、健康与业务就绪的区别、异常结果及失败恢复。保留优先真实 `./mvnw`、其他工程沿用已有工具的规则，不给 Node Demo 编造 Maven 或鉴权步骤。
- [x] **步骤 4，检查失败分流。** 对 V3/V4/V5 明确入口漂移、产品偏差、环境缺失和清理失败各自处理。清理前重新核对当前 PID、命令、路径和任务归属，旧记录中的 PID 不足以授权停止。规格差异回到原决定，不直接迁就代码。
- [x] **步骤 5，同步副本与摘要。** 三份副本与各自正确源执行 `cmp`。重算 Backend implement 完整有效树摘要，包含专有 build-deploy-guide；不要只哈希本次修改文件。
- [x] **步骤 6，核对适用范围。** 逐条对照 V1—V5 的预期，确保前端和 Backend 方法都能引用原入口并说明接续。记录本任务仅完成方法修订，真实启动、UI 操作及清理结果由任务 6 提供。

## Task 4：验证集成分发并冻结候选

**Files**

- 核对任务 1—3 的全部源、副本、清单和 `profiles/backend/skills-lock.json`。
- 在本次证据目录生成 `candidate/bundle.tar.gz`、`candidate/build.json`、`install/` 和 `minimal/`。
- 只在隔离 CLI checkout 使用 `assets/bundle.tar.gz` 和现有 `ui/dist` 作为临时构建输入，不改 CLI 源码或原 checkout。

**Interfaces**

- 消费任务 1 的 baseline 包和任务 1—3 的集成候选。
- 产出两份可定位 Bundle、安装后实际路径与内容摘要、冻结候选摘要、六个 Profile/安装模式结果及四份最小选择视图。任务 5、6 只从这些固定输入运行。

- [x] **步骤 1，完成静态分发核对。** 解析两份 JSON，核对四处叶子引用、11 份副本、根 Claude 软链接和 Backend 专有覆盖。重新计算三个既有摘要并与锁比较。逐文件审查 git diff，根/Frontend 锁、技能名、发现描述、默认集合及来源字段应保持原含义。
- [x] **步骤 2，生成集成候选 Bundle。** 使用本计划已核查的 `yss-bundle` 命令，输出改为 `candidate/bundle.tar.gz`，保存构建 JSON。运行 `tar -xOzf "$spec_run_root/candidate/bundle.tar.gz" manifest.json`，核对三 Profile 的有效路径及对象。构建错误先定位受影响声明或视图，不关闭校验。
- [x] **步骤 3，准备能使用候选的临时 CLI。** 先核对 CLI 当前状态、`build.rs` 和帮助。现行实现固定内嵌本 checkout 的 `assets/bundle.tar.gz`，按照下列已有机制创建隔离编译输入。CLI 若已有相关未提交变化，明确选定当前来源，不能用 HEAD 静默遗漏它。

```sh
git -C /Users/zhudaoming/Projects/yss-cli worktree add --detach "$spec_run_root/cli" HEAD
mkdir -p "$spec_run_root/cli/assets"
cp "$spec_run_root/candidate/bundle.tar.gz" "$spec_run_root/cli/assets/bundle.tar.gz"
cp -R /Users/zhudaoming/Projects/yss-cli/ui/dist "$spec_run_root/cli/ui/dist"
CARGO_TARGET_DIR="$spec_run_root/target" cargo build --locked --manifest-path "$spec_run_root/cli/Cargo.toml" --bin yss
"$spec_run_root/target/debug/yss" --version
shasum -a 256 "$spec_run_root/cli/assets/bundle.tar.gz"
```

预期 `--version` 的 `bundleDigest` 与归档 SHA-256 相同。复用 `ui/dist` 只用于满足安装验证程序的编译输入，不验证 Workbench UI。该目录缺失时按 CLI 现有构建说明在隔离 checkout 生成，不能改编译入口绕过。

- [x] **步骤 4，执行六个隔离安装。** 使用上一步临时 CLI 的绝对路径和已核对的 `init --help`，对 `spec/backend/frontend × project/skills` 六种组合分别安装到全新目录。命令模式为 `"$spec_run_root/target/debug/yss" init --root "$spec_run_root/install/backend-skills" --profile backend --installation skills --json`，其他组合只替换目录及两项枚举。核对安装正文、必要资源、Claude 派生内容、普通副本及收据，不能只看进程退出码。
- [x] **步骤 5，独立核对最小关联资源。** 从候选归档对象和清单构成 Spec/Backend 两模式的最小 implement 视图，沿任务 2 的选择范围逐个解析本次引用。预期缺少默认 setup 技能整体时，新增宿主参考仍可读，Backend 专有入口仍保留。标注这是构成与读取观察，不冒充 CLI 严格单技能安装接口。
- [x] **步骤 6，固定实际运行输入。** 保存候选包、已安装路径及关键文件摘要，建立匿名标签到 baseline/candidate 的映射供评审者保管。用同一隔离编译机制和 baseline 包提供旧方法安装结果，保存各自 bundleDigest。候选冻结后只允许复制场景输入，不边跑边改候选。临时目录路径本身可以不同，任务、模型、权限与预算条件保持可比。

## Task 5：验证 Codex 新会话的实际来源

**Files**

- 读取任务 4 的两份固定安装载荷及当前宿主帮助。
- 在本次 `cases/source/` 和 `runs/source/` 保存场景输入、JSONL、必要子会话原记录与读取索引。
- 本任务不改模板方法。发现缺陷时回到责任任务形成新候选批次，保留旧记录。

**Interfaces**

- 消费设计 S1—S5、任务 1 的预期和任务 4 的实际安装路径。
- 产出分层的来源观察、首次误用与恢复、可获得的成本及场景限制，供任务 6 汇总。

- [x] **步骤 1，确认真实新会话入口。** 查看 `codex --version`、`codex exec --help`，对照既有 Demo `evidence/EXECUTION.md`。现有历史入口使用独立 `codex exec`、`-C`、明确目录权限、`--json` 和 `-o`，实际参数以本次帮助为准。使用调用级配置和已授权能力，不修改全局配置，不新建用户可见聊天。
- [x] **步骤 2，准备 S1/S2 的同名条件。** 使用现存且可核实的全局同名技能作为只读干扰源，在受控工程安装本次固定载荷。记录两处内容差异，资源应可区分。不存在可用同名来源时标明该条件未满足，不能偷偷改用户全局技能来制造场景。
- [x] **步骤 3，运行自然发现组。** 对两份固定载荷分别从新会话发送同一自然任务，不提供技能路径、正文、答案或改稿历史。观察 S1 及适用的 S4/S5，保存真实读取和动作。记录可见会话标识，证明上下文没有沿用前一轮结果。
- [x] **步骤 4，运行明确来源组与失败恢复。** S2 提供任务要求的目标路径，核对技能相对资源与工程根引用。S3 在隔离场景副本中缺失必要资源，同时保留其他来源旧资源，预期指出缺口而不默借。S4 在固定的场景变体中保留相同 HEAD、不同未提交内容，预期采用指定有效内容。S5 以真实能力限制或明确标注的受控缺口检查准确受阻，模拟能力缺失不能冒充真实宿主故障。所有变体独立记录差异，两侧施加相同的场景变化，原始冻结包保持不变。
- [x] **步骤 5，整理读取证据。** 从 JSONL 和实际子会话记录建立路径索引，回链原始事件。只存在目录枚举时不报告 catalog 注入，最终自述不证明读取。首次读错后改正的记录必须包含首次动作、人工介入和恢复，不能计为首次自然选择成功。
- [x] **步骤 6，给出来源场景结论。** 分别标记文件、原生发现、实际采用和行为结果。全部适用来源场景已有观察或明确受阻范围才完成本任务记录。原生发现不可观测时保留未知，后续其他层通过也不能消除该限制。

## Task 6：验证项目接续并形成前后比较结论

**Files**

- 原始载体只读 `/Users/zhudaoming/.codex/demos/spec-home-repo-20261114/{home,web,api}`，尤其 Home `docs/spec/2026-11-14-follow-up-todo/`。
- 使用本次隔离目录中的等价 web/api 副本、独占数据和输出，不修改原 Demo。
- 记录本次 `runs/project/`、`runs/heldout/` 与 `RECORD.md`。
- 最后更新 `.template-spec/agents/matt-skills-adaptation.md` 及 Backend/Frontend 同名副本。需要记录本轮宿主结果时追加 host-compatibility 的新日期段，并同步其三份 WorkBuddy 副本及 Backend 摘要。

**Interfaces**

- 消费任务 4 的固定安装版本、任务 5 的来源证据，以及设计 V1—V5、C1—C5。
- 产出实际运行与留出结果、产物和遗漏对照、人工纠正与成本、宿主分层状态、保留或修订建议和资源结局。
- 验收后的记录性变化单独标记，不能声称未再次运行的最后记录版已经全量实跑。

- [x] **步骤 1，固定前后端受控载体。** 重新核对 web/api Git 状态和入口，编制时提交分别为 `8dbc5808392691456160599844c77f04fa9ed848`、`877a3bdd7f6ce536d45d5008da0fd20bad006013`。复制必要源码、锁文件及合成规格到隔离目录，排除旧运行数据和历史证据。API 是 Backend Profile 的 Node 示例，只覆盖通用工程接续，Java/Spring Boot 和生产鉴权保持未验证。
- [x] **步骤 2，检查运行前提并固定环境。** Web 要求 Node `^24.14.1`，现有 README 使用 `corepack pnpm@10.15.0 install --frozen-lockfile`。在两个副本各执行一次所需安装，记录真实版本。每轮从同一初始数据开始，API 的 `TODO_DATA_FILE` 指向任务独占绝对路径。
- [x] **步骤 3，按已有入口验证启动身份。** API 使用 `PORT=0 TODO_DATA_FILE=<本轮数据绝对路径> corepack pnpm@10.15.0 dev`，从真实日志取得分配端口。Web 使用 `TODO_API_PORT=<该端口> corepack pnpm@10.15.0 dev --port <本轮空闲端口> --strictPort`。命令在相应工程根执行，端口来自实际检查。核对当前进程、路径和 API 业务响应，不以页面可打开代替来源核对。
- [x] **步骤 4，运行已有工程检查。** web 运行现有 `test`、`typecheck`、`lint`、`build`，api 运行现有 `test`，使用上一步同一 pnpm 版本。预期各自退出 0，保存实际输出。源码和依赖未变时保留有效结果，不为每个来源案例重复工程全量检查。它们不替代下一步 UI 与 API 操作。
- [x] **步骤 5，逐对运行 V1/V2。** 从新 Codex 会话按自然任务读取项目入口，执行下表冻结路径，分别保存基线与候选的读取、动作、实际结果和清理。每轮恢复初始数据，两侧模型、权限、工具和预算尽量一致，无法核实的条件写未知。

| 受控行为 | 冻结预期 |
| --- | --- |
| API 初始 `GET /api/todos?status=all` | 200，`todos` 为空列表 |
| `POST /api/todos`，标题“受控验收待办” | 201，字符串 ID、原标题、`done:false`、UTC ISO 创建时间、`completedAt:null`，后续 GET 可读 |
| `POST /api/todos`，空标题 | 400，错误体包含 error，列表无新增 |
| 对新 ID `PATCH /api/todos/<id>`，先 completed 再 pending | 两次均 200，完成时有时间，重开后 `completedAt:null`，ID、标题、创建时间保留 |
| 对不存在 ID 的同一路径 PATCH | 404，已有数据不变 |
| 前端创建、完成、筛选、重开、刷新 | 列表与状态符合 Home 合成规格，正常持久化可核对 |
| 仅停本轮 API，再刷新前端 | 显示加载失败，草稿可编辑且创建暂停；恢复本轮 API、点击重试后恢复操作 |

- [x] **步骤 6，运行 V3/V4/V5。** 在独立场景副本中安排已知其他工作树的受控服务，以及验证中断后的剩余资源。V4 使用两个独立输入，一个将复制 README 的启动脚本名改为不存在的名称，另一个在隔离 API 中注入“空标题错误返回 201 并创建记录”的可逆偏差，保存注入差异并向两侧提供相同故障条件。预期识别错误服务并保持其存活，分别判断说明漂移与产品偏差，新会话可接续且只清理本任务资源。核对实际响应、数据、进程和文件差异，合成偏差不计为真实产品缺陷。缺少驱动能力时保留受阻，不用口述代替执行。
- [x] **步骤 7，执行邻近任务与独立留出。** C2 至少包含“只审核方法并给出结论”的请求，断言任务目录前后无未授权修改且无安装、发布或外发动作。独立执行者运行任务 1 预存的三类留出输入，改稿者在候选冻结前不能接触答案。留出失败后若改稿，该案例转为已知回归，新的独立检查另选输入。
- [x] **步骤 8，逐例形成 C1/C3/C4/C5 比较。** 先按冻结预期匿名判断真实产物，再查看来源解释。每个适用场景首轮一组成对观察，保留全部尝试。工具故障、人工提示、缺失 Token 和版本变化按任务 1 的方法记录，运行耗时与 Token 使用原始事件，可共用的环境准备成本单列。条件允许时交替运行两侧，需要追加时先记录原因、成对次数与停止条件，不只重跑失败侧直到成功。
- [x] **步骤 9，通过现有调用方检查复盘方法的实际采用。** 将同一组固定运行记录交给两个新会话，分别用基线和候选处理自然请求“复盘这些技能修改前后的结果，给出保留建议和证据限制”。核对是否经 maintaining-skills 或 writing-for-agents 的现有引用读取对应 pr-and-retro，并准确报告产物、遗漏、纠正、全部尝试成本和未知值。来源发现受限时另做明确来源观察，分开记录。复盘结论再与任务 1 冻结的判断规则核对，避免仅凭候选自评判优。
- [x] **步骤 10，处理回退与代价。** 来源误用、越权、错误结果或资源损害回到所属任务修正或撤回，重新冻结受影响候选并运行必要对照。两侧均满足预期就报告未观察到增益，缩减无价值文字。质量改善但成本上升时分别报告，不自动判优，不捏造提升比例。
- [x] **步骤 11，沉淀本轮实际结果。** 适配记录写清方法变化、原始来源不变、实际固定版本、Codex 结果与未知项。其他宿主逐一记录内容适配、文件分发、原生发现、实际采用和任务结果，未运行明确写未运行。历史 2026-11-15 结果保持独立。原始本机路径和敏感日志留在本次记录中，分发正文只保留必要可移植结论。
- [x] **步骤 12，核对记录变化与资源结局。** 若 host-compatibility 追加本轮事实，同步其副本和 Backend 摘要，重做受影响的字节、引用和打包检查。区分“运行过的冻结候选”与“追加记录后的最终内容”，只有行为变化才安排新的相关运行。检查本任务进程与数据清理结果，保留证据，移除隔离 worktree 前先审查其差异；有残留则明确位置与接续动作。

## 交付与执行选择

完成任务 1—4 可以说明方法与分发的实际状态。任务 5—6 才能说明具体 Codex 场景结果和相对基线的差异。场景未执行、证据受限或没有观察到增益均允许如实交付，不能勾选为该能力已经通过。版本号、发行和真实项目收益另按真实授权与证据处理。

本计划不自动产生提交授权。已有明确授权时，可按三个方法改动单元及最终观察记录分别提交，先检查每次暂存范围。没有授权时保留工作树差异，不阻断本次已授权工作。

推荐 **Native**，由主执行者顺序整合六项任务，独立执行者准备留出案例、承担隔离观察，最后做一次独立整体审查。共享摘要、来源记录及候选状态有连续依赖，顺序维护能减少重复上下文。另一选择是 **Subagent-driven**，每任务使用全新实现者和全新评审者，再做整体审查，独立检查更密集，成本更高。两种方式均保留本计划已有的独立留出与宿主证据要求。

## 计划自审

自审由计划作者完成，不以子代理审查替代。设计覆盖对应为来源第三部分 → 任务 2/5，项目第四部分 → 任务 3/6，比较第五部分 → 任务 1/6，分发第六部分 → 任务 2/4，验收第七部分 → 任务 5/6，宿主第八部分与撤回第九部分 → 任务 6。

逐步检查内容、接口和五项 Review Focus，已为原始输入、最小引用闭包、未提交变化、资源身份与全尝试成本安排具体核对。文档任务采用内容与文件检查，运行任务使用既有命令和冻结预期，没有新增维护套件。工具支持、基线与候选、原生发现和显式读取均分别标记。

本次计划编制只做源码与文档读取、现有入口帮助核查和计划自审。未执行以上构建、临时安装、宿主实验或工程验证。现有 Demo 的当前可运行性、Codex 原生发现证据可获得性、Java 专项覆盖及真实项目收益仍有明确边界。


## 2026-11-16 实施结果

按 Native 完成六项任务及38次真实新会话观察。复选框记录计划动作已经执行，具体通过、受阻、辅助恢复及证据限制以执行结果为准。五个参考、四处清单、11份副本与既有摘要已更新。最终记录包经过独立静态核对，运行候选与记录性更新分别固定。

主结果与原始证据位于 `/Users/zhudaoming/.codex/verification/spec-engineering-c8sp5u3h/RESULTS.md`。两侧选定正常与异常路径最终满足预期，清理受阻时由外层核实身份后完成。留出文件冻结较晚、部分自然请求未采用本轮方法、catalog不可观测及中断成本未知等限制保留。基线同样完成任务，本轮未观察到稳定收益，未据此发行新版本。

实施验收阶段的独立整体审查未发现必须修正项，执行证据与原始轨迹、成本汇总一致。当时的改动保留在工作区，后续提交情况见下节。

## 2026-11-16 Review 与主分支集成

用户批准完成 review、修复并提交到主分支。提交前复核发现一项 P2 文档历史状态歧义，已明确研究与设计的定稿时点，并将四个链接指向实施结果。修后复核没有剩余必须修正项。

本轮 25 个文件已提交本地 main。11 份副本、四处资源声明、三个有效树摘要和 41 处本地链接核对通过，共享锁只提交本轮三个字段。其他会话工作按原归属保留。提交阶段复用已保存的受控运行证据，本次文档状态修正只做受影响静态核对，发行尚未执行。
