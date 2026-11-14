# Spec 目标语义与实际分发验证 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正已观察的目标范围收窄，并通过候选 CLI 的临时安装、同步及自然请求检验实际表现。

**Architecture:** 在实际读取的共享规格方法和模板中定点修改，逐文件同步唯一现存平台副本。使用原 CLI 的临时副本构建内嵌候选 Bundle，在临时项目验证；结果回到既有适配记录，不建立新执行系统。

**Tech Stack:** Markdown、现有 JSON 配置/锁、Git、Rust/Cargo 1.99.1、YSS CLI 3.3.3 源码、Codex CLI、系统临时目录与内联检查；不新增依赖或维护脚本。

**Spec:** [Spec 目标语义与实际分发验证设计](2026-11-14-spec-goal-and-delivery-validation-design.md)。执行者先读设计及上一轮实际观察。

日期：2026-11-14。状态：用户已于 2026-11-14 批准执行；三个任务已完成；独立复核未发现阻断问题，保留一项已记录的状态表达限制。沿用仓库 `.template-source/design/`；`docs/superpowers/` 被忽略，不改忽略规则。当前工作树包含上一轮已完成但未提交的改动，不能恢复或重做它们。

## Global Constraints

- 仅修改本仓列明的模板、技能源、实际副本和观察记录，以及追加授权的 CLI `src/bundle/build.rs`；候选仍在临时副本构建，不修改用户业务项目。
- 保留业务规格、高保真交互原型、交互说明三类交付；业务票仅按明确拆票请求组织，技术设计与实现切片由研发承担。
- 保持技能名称、发现描述、调用政策、默认集合和分发路径；Spec 16、Backend 41、Frontend 13 项默认集合不变。
- 不新增技能、依赖、维护脚本、测试套件、强制指标表、阶段审批或产品成果；临时输入与内联检查放系统临时目录。
- 保留上一轮未提交改动、并行用户改动、Backend 专有覆盖及原始来源字段；只同步本次改变的文件。
- 不修改全局技能、现有 CLI 或宿主设置；不自动提交、推送、发行、对外发送或同步用户实例。
- 未执行或失败的检查如实记录；源码、分发、实际读取、真实业务效果分别说明。

## Review Focus

1. 只有分配功能证据、目标却是总体等待：保留原目标，不把候选度量写成已确认范围；Task 3 G1。
2. 来源已经确认具体统计区间：直接沿用，不能为防止推断而重复询问或抹掉确认；Task 3 G2。
3. 纯展示或简单说明：不强迫技能读取、状态矩阵或新增动作；Task 3 R3。
4. 来源与本地同时改动受管文件：拒绝写入并保留全部项目内容；来源未变时保留用户编辑；Task 2 I3/I4。
5. 旧程序、复制的源码或同名全局技能被误当候选证据：核对二进制、Bundle、收据和可见读取路径；Task 2 I1/I2、Task 3。

---

## 文件结构与执行顺序

| 责任 | 文件 |
|---|---|
| 目标综合方法 | `.agents/skills/yss-product-lifecycle/references/spec-workflow.md` |
| 方法普通文件副本 | `.workbuddy/skills/yss-product-lifecycle/references/spec-workflow.md` |
| Spec 目标提示 | `.template-spec/templates/spec-template.md` |
| G1 实际读取路径补强 | `.agents/skills/yss-stage-decision/references/business-analysis.md`；根及 Backend 的同路径 WorkBuddy 副本 |
| 业务分析有效树哈希 | `profiles/backend/skills-lock.json` 的 `skills.shared.yss-stage-decision.effectiveHash` |
| 实际观察及副本 | `.template-spec/agents/matt-skills-adaptation.md`；`profiles/backend/.template-spec/agents/matt-skills-adaptation.md`；`profiles/frontend/.template-spec/agents/matt-skills-adaptation.md` |

Task 1→2→3 顺序执行；构建候选时不并行改模板。沿用上一轮当前会话执行方式，可委派独立只读取证，完成后一次独立复核；不设逐任务批准或自动提交。真实项目采样是设计 D4 的后续条件动作，不作为本轮前置。

## Task 1：定点修正目标语义并同步

**Files:** 修改上表前三份文件；只读核对根 `skills-lock.json`、三份 `.template-source/distribution/bundle-profile.json` 和 `.claude/skills/yss-product-lifecycle`。

**Interfaces:** Consumes 设计 D1 和 O4 已观察失败；Produces 同路径目标方法及其副本，供 Task 2 构建候选。没有新调用接口或哈希字段；G1 实际失败后的补强复用业务分析段和 Backend 已有 effectiveHash。

- [x] **Step 1：保存本轮基线。** 在当前隔离工作树运行 `git status --short`，用 `mktemp -d -t yss-spec-followup` 建立临时根，保存六份拟改文件、三份分发配置和三个锁文件的字节快照。记录该路径为 `validation_root`，当前模板根为 `template_root`；后续 shell 调用显式传入同一绝对值，不假设变量跨调用保留。
- [x] **Step 2：应用设计 D1 两段精确文案。** 方法段放在 spec-workflow 开头的综合说明处，短提示放在 spec-template“问题与目标”；保留原功能验收/业务效果提示，不改已有确认和其他章节。
- [x] **Step 3：同步唯一普通文件副本。** 将源 spec-workflow 逐文件复制到对应 `.workbuddy` 路径；不创建 Backend/Frontend 副本、不改技能入口、不添加 effectiveHash。
- [x] **Step 4：核对修改边界。** `cmp .agents/skills/yss-product-lifecycle/references/spec-workflow.md .workbuddy/skills/yss-product-lifecycle/references/spec-workflow.md` 应退出 0；`readlink .claude/skills/yss-product-lifecycle` 应为 `../../.agents/skills/yss-product-lifecycle`；`git diff --check` 应退出 0。首次对比本轮基线只增加上述三文件的定点差异；G1 路径补强后另计三份 business-analysis 及 Backend 指定有效哈希，分发配置和其余锁字段不变。行为观察留给 Task 3，不把文字检查称作运行成功。

## Task 2：构建候选并验证真实分发

**Files:** 模板仓只读；追加授权修改 `/Users/zhudaoming/Projects/yss-cli/src/bundle/build.rs` 的 kernel 一项目录，并将同一差异同步到临时 CLI 副本。创建 `${validation_root}/cli`、候选程序、Bundle、命令输出及下表各临时项目；不修改已安装 yss。

**Interfaces:** Consumes Task 1 的当前模板工作树。Produces `candidate_bin=${validation_root}/yss-candidate`、`${validation_root}/cli/assets/bundle.tar.gz`、`fresh-project`、`fresh-skills` 及可核对的来源/收据；Task 3 从真实安装创建独立案例目录，不补复制完整模板树。

- [x] **Step 1：核实工具与固定来源。** 检查 `/Users/zhudaoming/.local/bin/yss --version`、`init --help`、`sync --help`、`codex exec --help`；检查原 CLI 的 `git status --short` 和 HEAD、临时副本所需 Rust 1.99.1。记录真实输出。若已装版本或源码变化，重新说明旧端来源；不要把 3.3.3 固定结论套到其他版本。
- [x] **Step 2：修复共享选择并生成临时候选。** 原命令已实际失败；用户于 2026-11-14 追加授权，在 CLI kernel 加入 `.template-spec/design/templates` 并核对新增资源仍受原白名单过滤。实际 Frontend 新增三份模板，Backend Bundle 额外包含两份未被任何安装选择引用的示例；Spec 集合不变，Backend 实际安装集合不变，保留这项与原预期的差异。先固定 CLI 提交，再将获授权的一行差异同步至临时副本、以真实 working-tree 来源打包当前模板；每步需退出 0，构建期间停止模板写入。保留候选版本、Bundle digest、manifest source 与模板 snapshot。失败时保留错误并说明未覆盖，不替换用户工具或绕过资源校验。CLI 变更运行 cargo fmt 检查；回归材料仅在临时目录。

```sh
git clone --local /Users/zhudaoming/Projects/yss-cli "$validation_root/cli"
git -C "$validation_root/cli" checkout --detach c9d2d9ddae54457b0cd53998ffa9f80a9a678dea
cp /Users/zhudaoming/Projects/yss-cli/src/bundle/build.rs "$validation_root/cli/src/bundle/build.rs"
cd "$validation_root/cli"
cargo run --locked --bin yss-bundle -- --source-root "$template_root" --out assets/bundle.tar.gz
cargo build --locked --release --bin yss
cp target/release/yss "$validation_root/yss-candidate"
"$validation_root/yss-candidate" --version
cd "$template_root"
```

- [x] **Step 3：执行 I1 新安装。** 用 `candidate_bin` 分别运行 `init --root <临时目标> --profile spec --installation project|skills --json`，目标为 `fresh-project`、`fresh-skills`。成功应为退出 0、`.status=ok`、`.result.status=applied`。运行相应 `skills list --root <目标> --json`，`.result.defaults` 各为 16 项；检查 `.yss/project.json` 的 `format=yss.project`、`formatVersion=1`、profile/installation、source 与 bundleDigest 均对应候选。
- [x] **Step 4：执行 I2 发行版到候选的同步。** 用已安装 yss 分别 init `sync-project`、`sync-skills`，新增 `docs/local-note.md`，保存写入前内容清单，再用 `candidate_bin sync --root <目标> --json` 同步两者。应保留各自安装范围、更新候选方法及对应收据、保持 local-note 字节；再次同步应 `.result.status=unchanged`。这是发行版到候选的组合验证，不是仅对 D1 的差分证明。
- [x] **Step 5：执行 I3 双边修改冲突。** 用旧端另建 `conflict-project`，在受管 `.agents/skills/yss-product-lifecycle/references/spec-workflow.md` 加本地标记；先确认旧端与候选的该文件原文确有差异。保存整个目录的文件内容/软链接清单和收据，真实执行候选 sync。预期退出 1、`.status=error`、`.error.code=CONFLICT`，`.error.context.paths` 的换行分隔字符串包含该相对路径；项目内容及收据不变。不用 dry-run 代替拒绝写入检查，不删本地改动继续强行同步。
- [x] **Step 6：执行 I4 本地保留。** 用旧端另建 `preserve-project`；先比较旧/候选 Bundle 中 `CONTEXT.md` 是否字节相同，相同时在本地追加标记。若该来源已改变，则从两 Bundle 中选择另一份字节相同的受管 Markdown 并记录路径。候选 sync 后标记字节保留，路径出现在 `.result.preserved`；同时其余应更新内容正常更新。不要在 skills 模式假定存在 CONTEXT.md，也不要伪造或手改收据制造场景。
- [x] **Step 7：核对实际载荷及 Backend 覆盖。** 对 I1/I2 的 `.yss/project.json.managed` 所列文件与 Bundle 对象核对，重点是目标方法、Spec 模板、状态矩阵和其引用；doctor 仅作补充诊断。另运行候选 `init --root "$validation_root/backend-skills" --profile backend --installation skills --json`，预期成功、默认 41 项；yss-stage-decision 实际为可选项，在该临时目录再执行 `skills ensure yss-stage-decision --root <目录> --json`，核对专有 SKILL.md/openai.yaml 与组合后的业务分析参考一致。默认集合不变，显式选择单独记录。按维护说明独立重算 Backend yss-stage-decision 有效树哈希，与锁的 effectiveHash、WorkBuddy 内容核对，不把对象 SHA-256 当技能哈希。

Bundle 是 gzip tar，读取 `manifest.json` 的 `profiles[profile].files[path].descriptor.sha256`，再读取 `objects/<sha256>` 即得字节；Backend 路径已展平。安装选择含 base、默认技能依赖闭包和 skillReferences，使用实际 managed 收据，不仅读 `.base` 判断完整性。有效树算法见 [维护说明](../agents/skills-maintenance.md)。临时内联核对即可，不加入仓库脚本。

## Task 3：在实际安装中观察方法并记录限制

**Files:** 修改上表三份适配记录；仅在 `${validation_root}/cases/` 创建教学 facts.md、prompt.txt、output.md、events.jsonl 和来源记录。Task 1 若需修订，优先实际读取位置；本轮 G1 证实 business-analysis 也是目标综合入口，补强仅涉及它的三份既有内容及 Backend 一项有效哈希。

**Interfaces:** Consumes Task 2 的候选安装及来源。Produces 五类实际观察、修正后的定向复查（如需）、已同步的适配记录；不产出总体准确率或真实收益结论。

- [x] **Step 1：准备五个独立案例。** 从 I1 的 fresh-project 创建案例目录，保留实际安装闭包和原收据，追加下表教学 facts.md 与自然 prompt。如 I1 未成功，本步骤标未执行；可独立完成 Task 1 文案，不改用源码复制冒充安装验证。

| 案例 | facts.md 事实 | 自然请求与结果断言 |
|---|---|---|
| G1 原 O4 | 希望减少事项等待时间，暂无当前等待时间基线。已知分配功能能按规则工作。目前没有已测得的业务改善结果。 | “补充目标与验收的写法，在回答中给出。”目标保持事项等待；分配耗时只能作为明确的建议口径；无虚构基线/收益，功能验收与改善证据分开。 |
| G2 已确认口径 | 目标仅限事项进入待分配至首次分配完成；已确认按自然分钟统计。暂无基线和目标值；分配功能可用，尚无效果数据。 | 同 G1 请求。直接沿用已确认区间和单位；仅保留真正未知项，不再次请求确认区间，不扩成总体处理效率。 |
| R1 状态矩阵 | R1 草稿提交成功进入审核中；R2 提交失败仍为草稿并保留输入；R3 审核中仅提交人可撤回至草稿；R4 审核通过为终态。审核人的权限未明确。 | “为申请页面整理业务、界面状态及转换矩阵，指出未知前提，只在回答中给出。”业务状态和界面失败分别表达；Guard/规则对应完整，审核权限保留未知，不补生产接口。 |
| R2 组合冲突 | R1 仅当前负责人可撤回待处理事项；R2 转交只改变负责人；R3 已撤回不可转交；同等权威的 R4 又称原负责人仍可撤回。A 已转交 B。 | “分析转交后的撤回及拒绝情形，只在回答中给出。”定位 R1/R4 冲突，A 的结果未决，B 在其他前提成立时可撤回、已撤回不可转交；不暗定优先级。 |
| R3 纯展示 | 页面只展示地址和电话，未要求操作入口。 | “简要说明这个页面的展示规则，只在回答中给出。”不造拨号、地图动作，不强制业务转换表或补建产物。 |

- [x] **Step 2：运行独立上下文并检查真实读取。** 实际帮助仍支持时，每例执行 `codex exec --ephemeral --ignore-user-config --json --skip-git-repo-check -C <案例目录> -s read-only -o <output.md>`，从 stdin 输入 prompt，JSON 轨迹保存到案例目录。记录版本、可取得的模型信息和运行限制；不指定新模型、不修改全局设置。检查回答断言、案例项目零写入以及可见本地/全局方法路径；未读参考与回答错误分别记录。
- [x] **Step 3：处理实际失败。** G1/G2 若仍有目标漂移，按可见轨迹定点修订实际读取的目标方法，不通过强制路由解决，重建候选，重跑受影响的安装/同步及案例，使记录对应最终字节。其他案例出现必要资源缺失或内容错误时定位文件和影响，保留未完成项；没有实质遗漏时，不为增加读取次数修改入口。CLI、宿主或网络失败单列，不当作语义通过或失败。
- [x] **Step 4：追加实际记录并同步。** 在适配记录新增 2026-11-14 小节，列候选内容指纹、各安装/同步与案例的真实结果、实际读取及未验证项；明确记录写回发生在被测 Bundle 之后，仅观察记录有新增，不能声称最终源码整树即被测快照。保留上一轮 O4 失误身份、O2 已修复身份及原上游比较。逐文件同步 Backend、Frontend 两份记录；D4 真实任务观察仍列后续条件事项。
- [x] **Step 5：完成差异核对与交付。** 三对源/副本运行 cmp 均退出 0；`git diff --check` 退出 0；模板相对本轮基线仅九份既有内容文件及 Backend 一项有效哈希变化，CLI 仅获授权的一行目录规则变化，分发配置/其他锁字段/默认集合不变。一次独立只读复核聚焦目标范围、临时安装证据、文件保护和结论边界。更新本计划完成项和实际限制，返回文件位置；不提交、发布或同步用户项目。

## 计划自审与交接

设计 D1 对应 Task 1 和 G1/G2；D2 对应 Task 2 I1–I4 及 Backend 核对；D3 对应 Task 3 R1–R3；D4 明确为未来真实任务条件，未以教学样本代替。五项 Review Focus 均有具体断言。计划只读引用 CLI 的现有接口，没有新增接口、生成器、依赖、统一测试要求或发布步骤。

推荐沿用当前会话执行：三个任务顺序依赖同一候选内容，集中维护来源与观察最省重复工作。规划完成后先交由用户审阅；本计划本身不代表已经实施或验证成功。

## 实际执行记录（2026-11-14）

- 原计划遇到 CLI 共享资源缺口后暂停了依赖步骤；用户明确追加授权，随后只改 CLI kernel 一项目录。实际选择多出 Frontend 三份可选模板和 Backend 两份不参与安装的示例，原“Backend Bundle 集合不变”预期已校正为实际安装集合不变。
- G1 首轮仍收窄目标，实际读取 business-analysis；据此补强该现有入口及副本、更新 Backend 既有哈希，未强制绕行生命周期技能。最终同输入 G1/G2 均符合本例预期，R1–R3 保留首轮观察身份。
- Spec 两模式完成新装、发行版到候选的同步及重复同步；双边修改真实冲突且目录不变，来源未变的本地编辑与非受管笔记均保留。Backend/Frontend 可选技能通过临时 skills ensure 验证，不加入默认集合。
- 构建与运行材料保存在 `/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-spec-followup-20261114-4qx1jodn`；其中 round1 保留初版，installation-final、selection-regression-final、report-goals-final 为最终候选证据。原目录路径经 realpath 转为 /private/var 后通过既有路径安全检查。
- 具体来源和分层结果见 [实际适配记录](../../.template-spec/agents/matt-skills-adaptation.md#2026-11-14-目标语义与实际分发验证)。R1 拒绝行未显式写保持审核中，真实业务收益、跨宿主、Windows 与浏览器仍未验证；未提交、发行或更新用户实例。

独立只读复核再次核对了 8 个最终来源安装的收据与实际文件、非渲染载荷与 Bundle、两份 G-final 的真实方法读取、五对副本、Backend 有效哈希及 CLI 原白名单过滤关系。未发现 Critical/Important 缺陷；R1 拒绝后的状态未显式写明作为非阻断表达限制保留。全部 16 个实施步骤已完成，工作树及临时证据保留，未提交或发布。
