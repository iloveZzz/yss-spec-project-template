---
design_id: architecture-iteration-v1-plan
version: 0.2.0
status: accepted
repository_mode: template-source
spec: architecture-iteration-v1.md
updated_at: 2026-10-11
---

# 架构迭代执行计划

本计划执行[架构迭代规格](architecture-iteration-v1.md)。规格负责需求、验收和未决项；本文只负责顺序、写入范围、验证和回退。两者冲突时以规格为准，并修正本文。

## 1. 执行规则

1. **从干净提交起步。** 每个工作包使用独立的 worktree 和分支 `arch/ar-<编号>`（`using-git-worktrees`）。多个会话共用同一工作目录，动手前先确认分支和工作区。
2. **一个工作包一个 PR。** 跨仓的工作包每个仓一个 PR，PR 描述互相引用。PR 标题带工作包编号，描述里列出命中的 FR / AC，以及 `harness-metrics` 的前后对比（AR-00 之后）。
3. **维护 checkpoint。** 每个工作包按 `.template-source/process/templates/maintenance-checkpoint-template.yaml` 建立 checkpoint，用 `scripts/maintenance-path checkpoints/arch-ar-<编号>/checkpoint.yaml` 取得仓外路径。`intensity` 与 `triggers` 按第 3 节填写；命中 `permission-boundary`、`release-semantics`、`lifecycle-gate` 时附反例证据。
4. **验证。** 根仓依次运行：`scripts/verify-template-fast --plan` → 执行所选集合 → `scripts/ci-gate --mode pr --base <base SHA>` → `scripts/verify-maintenance-checkpoint <checkpoint>`。yss-cli 仓库维持「不放测试」的政策，只做构建；FR-011 的 fixture 回放放在根仓，用固定版本的 `yss` 执行。
5. **跨仓顺序。** 先 yss-cli，后根仓。AR-02 之前，根仓更新 yss-cli 的 gitlink；AR-02 之后，改为更新固定版本文件。
6. **检查随对象一起删除。** 工作包删掉某个检查对象（锁、投影、同步脚本、Profile 副本等）时，在同一个 PR 里删掉对应的检查和验证 profile 登记（FR-015），不留悬空检查。
7. **不加概念。** 任何工作包如需新增流程文档、术语或门禁，先停下，修订规格并取得维护者确认（NFR-006）。
8. **外部动作逐次授权。** 推送、打 tag、发布 CLI、在 GitHub 上归档旧仓库，每次都要维护者单独授权。
9. **立项收尾（已完成）。** 规格转为 `accepted` 的同一个提交里，已在[模板加固执行计划](harness-hardening-v1-plan.md)第 7 节把 WP-08 标为「移交 architecture-iteration-v1」；仓外的 repo-slimming 地图中已重开的 5 张票同时标为 superseded。

## 2. 阶段与依赖

```mermaid
flowchart LR
  AR00[AR-00 基线度量] --> AR01[AR-01 迁移能力]
  AR01 --> AR02[AR-02 版本与钉住]
  AR02 --> AR03[AR-03 生成物]
  AR03 --> AR04[AR-04 投影根收敛]
  AR01 --> AR04
  AR02 --> AR05[AR-05 组合能力扩展]
  AR05 --> AR06[AR-06 Profile 并入]
  AR03 --> AR06
  AR06 --> AR16[AR-16 验证两档]
  AR06 --> AR07[AR-07 Node 分层]
  AR02 --> AR08[AR-08 Go 拆子包]
  AR07 --> AR09[AR-09 退役第 1 步]
  AR08 --> AR09
  AR09 --> AR10[AR-10 退役第 2 步]
  AR10 --> AR11[AR-11 退役第 3 步]
  AR11 --> AR12[AR-12 退役第 4 步]
  AR07 --> AR13[AR-13 合同拆分]
  AR13 --> AR14[AR-14 route 规则摘录]
  AR08 --> AR14
  AR01 --> AR15[AR-15 schema 两代]
  AR12 --> AR17[AR-17 复测]
  AR14 --> AR17
  AR15 --> AR17
  AR16 --> AR17
```

| 阶段 | 工作包 | 出口条件 |
|---|---|---|
| S0 版本与迁移底座 | AR-00、AR-01、AR-02 | AC-001～AC-004 通过；基线已存档 |
| S1 生成物与投影 | AR-03、AR-04 | AC-005、AC-006 通过 |
| S2 Profile 并入 | AR-05、AR-06，随后 AR-16 | AC-007、AC-008、AC-015 通过 |
| S3 分层与单一实现 | AR-07～AR-12 | AC-009 通过；每一步退役后 AC-010、AC-011、AC-016 通过 |
| S4 规则与 Agent 上下文 | AR-13～AR-15 | AC-012～AC-014 通过 |
| 复测 | AR-17 | 全部阶段完成后满 30 天，AC-017 通过 |

S3 的 AR-08 可以和 S1、S2 并行。S4 的 AR-15 只依赖 AR-01，可以提前做。

## 3. 工作包总表

| 编号 | 规格引用 | 维护强度与触发 | 涉及仓库 | 允许写入（概要） | 依赖 | 未决项 |
|---|---|---|---|---|---|---|
| AR-00 | NFR-001～NFR-003 | L2：non-core-validator | 根仓 | `scripts/lib/harness-metrics.mjs` 增加管道提交占比与 daily 起步必读两项（只读）、对应测试、验证 profile 登记 | 无 | — |
| AR-01 | FR-003、FR-004、NFR-004 | L2：release-semantics、cross-repo-contract（需反例） | yss-cli | 迁移规则的版本区间匹配、删除动作的「保留」决定、「commit → 版本」对照表生成工具与产物 | AR-00 | — |
| AR-02 | FR-001、FR-002 | L2：release-semantics、cross-repo-contract（需反例） | yss-cli、根仓 | 来源锁改钉 tag，`refresh-source-lock` 并入发布流程；根仓删除 `submodules/yss-cli` gitlink，新增固定版本文件，改写 `check.cli-content-identity`，删除 N7 的手动落后工具及其登记；首个 tag 为 `v4.0.0` | AR-01 | — |
| AR-03 | FR-005 | L2：generation-semantics、release-semantics | yss-cli、根仓 | 同步上游 yss-cli 后收窄：根 `skills-lock.json` 不再提交 `effectiveHash`，`skill-supply-chain.mjs` 与读取方现算或按实例锁严格比较，打包器缺哈希时按旧键序补回；yss-cli 的 `bundles.json.gz`、离线帮助 JSON、`docs/cli-help.md` 保持提交，由上游 CI 校验、只在发布时重新生成；固定二进制改按上游的 `tools/build-candidate.mjs` 构建 | AR-02 | — |
| AR-04 | FR-006 | L2：generation-semantics、cross-repo-contract、release-semantics（需反例） | yss-cli、根仓 | 删除 `.codex/skills`、`.cursor/skills`、`.pi/skills`；`projectionLink` 接受 `.claude`；根仓移出 `.codex/skills/product-design`，注册表 `platform_skills` 与锁的平台技能组清空；实例运行时模型、注册表与锁、`bundle-profile.json`、`skill-migrations.md` 登记 | AR-01、AR-03 | Q-003 |
| AR-05 | FR-007 | L2：generation-semantics、cross-repo-contract | yss-cli | `internal/bundle/skill_composition.go`、`producer.go` 的来源读取、`rules/*.json`；组合配置格式 | AR-02 | — |
| AR-06 | FR-008、NFR-002 | L2：template-structure、generation-semantics、cross-repo-contract | 根仓（旧 Profile 仓只归档） | `profiles/**`（新增，导入时排除 design Profile 里的 `product-design` 副本）、`.gitmodules`、删除同步脚本、`strategic-handoff-tools.lock.json`、`profile-variants.json`、`.strategic-design-skills-manifest.json` 与对应检查；来源锁 `sourcePath`；evidence 与 wiki 移到仓外归档 | AR-03、AR-05 | — |
| AR-07 | FR-009 | L2：core-validator | 根仓 | `scripts/lib/**` 中切断 5 条边、把 user-decision 的读写与摘要工具下沉到 core；新增导入方向检查与登记 | AR-06 | — |
| AR-08 | FR-009 | L2：core-validator、cross-repo-contract | yss-cli | `internal/governance` 按领域拆成子包，对外行为不变 | AR-02 | — |
| AR-09 | FR-010、FR-011、FR-016 | L2：core-validator、lifecycle-gate、release-semantics（需反例） | yss-cli、根仓 | 第 1 步（approval、user-decision、verification、spec-baseline）：根仓 fixture 回放、同名薄壳与冒烟检查、删除对应的 Node 实现、对应版本的删除规则 | AR-01、AR-07、AR-08 | — |
| AR-10 | 同上 | 同上 | yss-cli、根仓 | 第 2 步：checkpoint、slice、task 的校验 | AR-09 | Q-004 |
| AR-11 | 同上 | 同上 | yss-cli、根仓 | 第 3 步：handoff、context | AR-10 | Q-004 |
| AR-12 | 同上 | 同上 | yss-cli、根仓 | 第 4 步：backend、frontend 的校验部分 | AR-11 | — |
| AR-13 | FR-012 | L2：lifecycle-gate、template-structure（需反例） | 根仓 | 编排合同按层和领域拆成多个文件，`work_unit_routes` 每个工作单元一个文件；逐项写明策略的 owner 与消费者，写不出来的删除；读取合同的 Node 与 Go 代码相应调整 | AR-07 | — |
| AR-14 | FR-013、NFR-003 | L2：lifecycle-gate、cross-repo-contract（需反例） | yss-cli、根仓 | `lifecycle route --json` 返回规则摘录；`AGENTS.md` 只保留入口与硬门禁；lifecycle 技能入口相应修改 | AR-08、AR-13 | — |
| AR-15 | FR-014 | L2：release-semantics、cross-repo-contract | yss-cli、根仓 | 每个 schema 常驻两代；更早版本移入 `yss migrate` 的读取范围；实例分发相应调整 | AR-01 | — |
| AR-16 | FR-015、NFR-006 | L2：core-validator、release-semantics（需反例） | 根仓 | `template-verification-profiles.yaml` 只留 `fast` 与 `release` 两档；删除 `candidate`、`legacy-full`、`legacy_coverage`；删除资格校验层（`verification-qualification*`、`verification-report-validator`）或并入选择与报告模块；`ci-gate` 步骤相应调整 | AR-06 | — |
| AR-17 | NFR-001、NFR-002 | L1：textual-only | 根仓 | 本计划第 7 节、规格状态 | AR-12、AR-14、AR-15、AR-16 | — |

「允许写入」之外的路径只读。`lifecycle-registry.yaml` 的阶段、门禁和工作单元结构，以及批准记录、交接包、数字人会签的语义，在本轮全部只读（规格「非目标范围」）。

## 4. 工作包说明

- **AR-00 基线度量**：按附录 A 的口径扩展 `harness-metrics`，记录 NFR-001～NFR-003 的起点。每个阶段的开始和结束各跑一次，结果存入维护命名空间。
- **AR-01 迁移能力**：先于一切删除动作合入，因为后面所有清理都依赖「逐文件拒绝」和「版本区间匹配」。对照表找不到的 commit 必须明确报告，不能猜（规格风险表）。
- **AR-02 版本与钉住**：首个模板 tag 为 `v4.0.0`（Q-001 已决）。根仓删除 gitlink 后，本地联调靠 `YSS_NATIVE_BINARY` 加 `YSS_NATIVE_BINARY_OVERRIDE=1`。**打 tag 本身不在本工作包内**：第 1 节第 8 条要求打 tag 单独授权。本工作包交付机制（来源锁与刷新脚本支持钉 tag、yss-cli 固定文件、预检与发行验证核对、`ci-setup` 按固定文件构建并核对摘要、移除 gitlink 与 N7 工具）；真实的来源锁在打 tag 之前仍按提交钉住，AC-001 的完整验收（来源锁记录 tag、普通提交后没有重钉提交）要等维护者授权打 tag 并执行 `tools/refresh-source-lock.mjs --tag v4.0.0` 之后才能做，机制已在一次性的临时模板副本里演练过。
- **AR-03 生成物**：原计划是让 bundle 与帮助不再提交、发布时先生成再构建。动工前核对上游（yss-cli 的 PR #2～#7）发现，上游已经把生成物做成「提交的副本 + 工具校验 + CI 校验」：`tools/artifacts.mjs` 的 `check`/`generate`、`artifacts.yml`、可复现的候选构建和分段 JSON 写入器；再改成不提交会与之冲突，也没有换来收益。所以本工作包收窄为：(1) 先同步上游并按其构建配方重新固定二进制；(2) 只做根锁瘦身，让打包器对缺 `effectiveHash` 的模板锁照样渲染出与旧版逐字节一致的实例锁。**要点**：`effectiveHash` 本来就由 `RenderedSkillLock` 按分发的技能树重算并覆盖，所以模板锁里的这个值是多余的；唯一要补的是键序（缺失时插到 `skillPath` 之后）。读取方（`lifecycle-context-query`、`backend-standards-coverage`）对没有该字段的模板锁放行、对带该字段的实例锁仍严格比较，共用 `lockedTreeHashMatches`。生成物在 yss-cli 里的校验与重新生成沿用上游工具，不在本工作包内重做。
- **AR-04 投影根收敛**：接手 hardening WP-08 已完成的研究，不重做。旧实例里的投影根副本（含 `product-design`），通过 AR-01 的删除规则清理，并且可以拒绝。`product-design` 在根仓随 AR-04 移出；design Profile 里的 56 个文件在 AR-06 导入时排除。两者之间 design 新实例仍会带它，这是已知的短暂窗口。README 或升级计划里注明用户自行安装的来源。
- **AR-05 组合能力扩展**：扩展完成后，旧形态（子模块）的来源必须仍然可以构建，AR-06 的逐文件对比依赖这一点。
- **AR-06 Profile 并入**：一次性导入，不留过渡期。合入前提是 AC-007 的逐文件摘要映射一致。GitHub 上归档旧仓库属于外部动作，按第 1 节第 8 条单独授权。
- **AR-07 Node 分层**：5 条边见规格证据 5。导入方向检查必须亚秒级、只读（NFR-005）。
- **AR-08 Go 拆子包**：只重组包结构，对外命令与输出保持不变。
- **AR-09～AR-12 退役四步**：每一步的顺序固定：先补 fixture 回放 → 再换薄壳 → 再删 Node 实现 → 最后随模板版本发布删除规则。每一步结束时检索技能，确认技能里已经不再引用被退役的实现。
- **AR-13～AR-15 规则与 Agent 上下文**：AR-13 的策略清单写入执行记录；被删除的策略逐条列出。
- **AR-16 验证两档**：S2 完成后进行，此时大部分检查对象已经消失。
- **AR-17 复测**：全部阶段完成后满 30 天，按附录 A 统计并写入第 7 节；没达标时记录差距和原因，不能调高目标后宣称完成。

## 5. 交给 agent 执行时的指令

每个工作包都可以单独派发。派发指令模板：

```text
读取 .template-source/contracts/architecture-iteration-v1.md 与 architecture-iteration-v1-plan.md。
执行工作包 AR-<编号>：只修改计划第 3 节该行「允许写入」列出的路径；其他路径只读。
开工前确认依赖的工作包已合入、相关未决项已有答复；没有答复时停下来提问，不自行假设。
按计划第 1 节建立 worktree、分支和维护 checkpoint，按第 4 节的说明执行，按第 1 节第 4 条验证。
结束时报告：命中的 AC 及证据路径、harness-metrics 前后对比、删除的检查、未完成项。
```

## 6. 决策与例外记录

以下决定由维护者于 2026-10-11 在仓外的 wayfinder 决策地图（`.work/architecture-iteration/`）中逐票确认。

| 日期 | 项 | 决定 | 决定人 |
|---|---|---|---|
| 2026-10-11 | 沿用的约束 | hardening 的 NFR-006（实例兼容）与 FR-016（技能退役冻结）、research 在会话内完成，这几条沿用；「不增加流程概念」沿用，但删除或合并概念不受限；注册表、批准记录、交接包语义不变，旧 schema 版本可以只在迁移命令里读取 | 维护者 |
| 2026-10-11 | Profile 形态 | 并入根仓 `profiles/*`，只放覆盖层，共有部分放 `_specialist/`；这三个 Profile 仓没有外部使用者 | 维护者 |
| 2026-10-11 | 唯一权威 | 每个领域只保留一份实现（按领域划分） | 维护者 |
| 2026-10-11 | 版本与钉住 | 模板与 CLI 两条语义化版本线；CLI 钉模板 tag；根仓去掉 yss-cli 子模块，改为固定版本号和 SHA-256；迁移规则按版本区间匹配；N3 并入发布流程，N7 删除 | 维护者 |
| 2026-10-11 | 内核分层 | 四层；Node 切 5 条边并加导入方向检查；Go 拆子包；不触发 WP-11 的物理拆分 | 维护者 |
| 2026-10-11 | 并入方式 | 快照导入；旧仓库归档为只读；先改 yss-cli、再改根仓，共两个 PR；同步机制一次删除；evidence 与 wiki 移到仓外归档 | 维护者 |
| 2026-10-11 | 「部分」档领域 | 校验归 Go，工作流归 Node；按四步退役；每个领域留 fixture 回放，每个薄壳留冒烟检查 | 维护者 |
| 2026-10-11 | 生成物 | bundle 与 CLI 帮助改为发布时生成；`skills-lock.json` 只保留上游 revision；删除三个投影根，只保留 `.claude/skills` 的链接 | 维护者 |
| 2026-10-11 | 规则与 Agent 上下文 | 合同按层拆分；写不出 owner 的策略删除；Agent 经 `yss lifecycle route --json` 取规则摘录；schema 常驻两代 | 维护者 |
| 2026-10-11 | 实例迁移 | 沿用 `yss upgrade`，不强制升级；删除可以逐文件拒绝；旧副本按版本分批清理；对照表只生成一次 | 维护者 |
| 2026-10-11 | 验证收缩 | 只留 `fast` 与 `release` 两档；`candidate`、`legacy-full`、`legacy_coverage`、资格校验层退役 | 维护者 |
| 2026-10-11 | Q-001 首个 tag | `v4.0.0` | 维护者 |
| 2026-10-11 | Q-002 `product-design` | 它是 OpenAI 的第三方 Codex 插件，从模板、Profile、新实例分发中移出，由用户自行安装；`platform_skills` 机制保留 | 维护者 |
| 2026-10-11 | 规格转为 accepted | 维护者确认措辞，同日完成 WP-08 移交标注与旧图 5 张票的 superseded 标注 | 维护者 |
| 2026-10-11 | AR-02 固定 yss 的方式 | 固定「按指定 yss-cli 提交构建的二进制」的各平台 SHA-256，而不是发行包：目前没有包含本轮改动的 CLI 发行版，也不应为此提前发布。可行性已实测：同一提交、同一 Go 版本、`-trimpath` 构建，在不同检出目录得到逐字节相同的二进制。CLI 发布后再改记发行包摘要。已写入规格 FR-002 | 实施者（待维护者确认） |
| 2026-10-11 | AR-02 不创建 tag | 第 1 节第 8 条要求打 tag 单独授权，本次授权只覆盖「提交、不推送」。机制已就绪，真实来源锁在打 tag 前仍按提交钉住。维护者于 2026-10-11 授权打 tag v4.0.0 并执行 refresh-source-lock --tag；推送仍未授权 | 实施者（待维护者确认） |
| 2026-10-11 | AR-03 收窄 | 动工前核对上游最新 PR 后，bundle 与 CLI 帮助保持提交、由上游 CI 校验、只在发布时重新生成；本工作包只做根锁瘦身（规格 FR-005、AC-005 已据此改写）。维护者选择「先同步再收窄」 | 维护者 |
| 2026-10-11 | AR-03 固定二进制配方 | 同步上游后，固定文件按上游 `tools/build-candidate.mjs` 构建，取代单独的 `-trimpath`；同一提交在两个不同目录得到相同摘要（darwin-arm64 实测）。已写入规格 FR-002 | 实施者（维护者已于 2026-10-12 确认） |
| 2026-10-11 | 合流方式 | 另立本合同，不并入 hardening；hardening 的 WP-08 移交本合同，WP-11 照常签署 | 维护者 |
| 2026-10-11 | 重开的旧决定 | repo-slimming 地图中的「Profile 子模块形态」「Node 与 Go 单源方向」「共享脚本库单源化」「投影根收敛（WP-08）」「是否结束 `legacy-full`」五张票重开，由上面各项决定取代 | 维护者 |

## 7. 执行状态

| 工作包 | 状态 | 分支 | 说明 |
|---|---|---|---|
| AR-00 | 已完成，待合并 | `arch/ar-00`（基于 `arch/architecture-iteration-v1`，未推送） | `harness-metrics` 增加 `pipeline_commits`（管道提交占比，可用 `--rev`、`--since`、`--until` 复现历史口径）与 `daily_start`（daily 起步必读）；11 个测试通过；登记为 fast 检查 `check.harness-metrics`，原补充检查改名 `-supplemental`；fast 通过。基线（S0 开始）存仓外 `maintenance:checkpoints/arch-ar-00/metrics-before.json`：daily 起步 57,013 B；管道提交 2026-08-27 起 149/396（37.6%），最近 30 天 122/289（42.2%）。**修正**：规格立项时写的 398 / 330 / 83% 偏高，原因是临时统计把名字里带 source-lock 的脚本和测试也算成管道文件；纯管道提交数 149 不变，已按 396 / 311 / 78.5% 改正规格证据 1、NFR-001 与附录 A。NFR-002（修一次内核涉及的仓库数）无法从 Git 历史算出，按规格由 AR-17 抽查 |
| AR-01 | 已完成，待合并 | 根仓 `arch/ar-01`（基于 `arch/ar-00`）；yss-cli `arch/ar-01`，提交 `aa0cf47`（均未推送） | yss-cli：迁移规则支持版本区间（`from.versions`，左闭右开）；规则提议的 `delete` 可用 `keep-local` 逐文件拒绝，拒绝后升级成功、文件原样保留，并在之后的计划里继续生效；`tools/version-table.mjs` 一次性生成历史「模板 commit → 版本」对照表（spec 25、design 20、backend 20、frontend 22 条，记为 `4.0.0-pre.N`）。根仓：gitlink 指向 `aa0cf47`。验证：`CGO_ENABLED=0 go build ./...`、`go vet`、`gofmt` 通过；行为用 10 个一次性场景验证后已删除（yss-cli 不放测试）。**没有持久回归覆盖**：删除拒绝与区间匹配的回归检查要等 AR-09 的根仓 fixture 回放。AC-003 的「按历史 commit 初始化的真实实例」只覆盖到当前内嵌 Bundle 的来源，2026-10-06 之前的旧 CLI 实例不在表内，规则对它们不适用并如实报告。**推送顺序**：先 yss-cli，后根仓；根仓 gitlink 指向的提交在 yss-cli 推送前，别处检出会找不到它 |
| AR-02 | 机制已完成，待合并；**打 tag 与真实钉 tag 未做** | 根仓 `arch/ar-02`（基于 `arch/ar-01`）；yss-cli `arch/ar-02`，提交 `ca1e0b9`（均未推送） | yss-cli：来源锁可选 `templateTag`，打包时校验「tag 为正式 vX.Y.Z、存在、指向锁里的提交、`templateVersion` 与之一致」，实例因此记录语义化版本；`refresh-source-lock.mjs --tag` 成为发布流程中的一步，已钉 tag 的来源拒绝按 HEAD 刷新。根仓：新增 `.template-source/distribution/yss-cli-pin.json`（版本 1.3.5、提交 `ca1e0b9`、Go 1.27.1、darwin-arm64 / linux-amd64 / linux-arm64 的 SHA-256）与 `yss-cli-pin.mjs`；预检的 `native-cli`、`tests/cli-retirement.test.mjs`、发行验证 `collectReleaseSources` 核对二进制摘要与源码提交；`ci-setup --yss-commit pin` 取固定提交与 Go 版本、构建后核对摘要；删除 `submodules/yss-cli` gitlink 与 `.gitmodules` 条目；删除 N7 的手动落后检查，被删路径在验证登记里留到合入之后再移除。**限制**：(1) 没有创建 tag，真实来源锁仍按提交钉住，AC-001 的完整验收要等授权打 tag 后做；(2) 固定的是按提交构建的二进制而非发行包，见第 6 节；(3) 摘要在 darwin-arm64 上用本机验证过可复现，linux-amd64 / linux-arm64 的摘要来自交叉编译，CI 首次构建若与之不符，`ci-setup` 会明确失败，届时需按报告的实际值更新固定文件；(4) 对照表与 AR-01 的区间规则都不依赖 tag 是否已建。**取回与推送顺序**：yss-cli 的 `aa0cf47`、`ca1e0b9` 只在本 worktree 的 `.work/yss-cli` 克隆里；根仓固定文件里的提交在 yss-cli 推送前，CI 取不到它 |
| AR-03 | 已完成（范围已收窄），待合并 | 根仓 `arch/ar-03`（基于 `arch/ar-02`）；yss-cli `arch/ar-03`，提交 `d91df2f`（含与上游 main `9c3c984` 的合并 `5fea7ce`；均未推送） | **同步上游**：yss-cli 的上游 main 比 AR-01 起点多了 PR #2～#7（候选构建、artifacts 校验与生成、分段 JSON 写入器、性能记录），与 AR-01、AR-02 无冲突，合并后 `go build ./...`、`go vet` 通过；固定文件改指新提交并按上游构建配方重算三个平台摘要，同一提交在两个目录构建的 darwin-arm64 摘要相同；`ci-setup` 优先用 `tools/build-candidate.mjs`。**瘦身**：yss-cli `RenderedSkillLock` 对缺 `effectiveHash` 的模板锁按旧键序（`skillPath` 之后）补回，已用一次性用例验证带与不带该字段渲染出的实例锁逐字节相同，并验证把插入位置改错后用例失败，用例随后删除（yss-cli 不放测试）；根仓 `skill-supply-chain.mjs` 不再写入 `effectiveHash`（只现算用于判断是否需要 `adaptationRef`），`update-skill-lock` 重新生成后根锁恰好少 80 行（79 共享 + 1 平台），没有别的变化；`lifecycle-context-query`、`backend-standards-coverage` 共用 `lockedTreeHashMatches`：无该字段放行、有则严格比较、未登记仍拒绝；`skill-governance` 现算。新增 fast 检查 `check.skill-lock-readers`（`tests/skill-lock-readers.test.mjs`，3 个用例，约 60 ms，只读、不依赖二进制）。**限制**：(1) 没有创建 tag，也没有推送，固定文件里的提交只在 `.work/yss-cli`，CI 取不到它；(2) linux 两个平台摘要来自交叉编译，未在 linux 上运行；(3) `tests/scenarios/verify-lifecycle-context-query-scenarios.mjs` 在第 102 行因 `yss-product-lifecycle/SKILL.md`（15,076 B）超过它断言的 8,192 B 预算而失败，这是本分支之前就存在、与本工作包无关的失败，该脚本不在 fast 里，所以它覆盖的实例哈希漂移场景由新增的检查补上；另有 `skill-supply-chain.test.mjs` 对投影根数量的旧断言（仍是 3 个，已有 `.claude/skills`）与 `skill-registry.test.mjs` 读取 backend 子模组里不存在的 `git-commit-core` 技能，两处与本包无关的失败，同样不在 fast 里；(4) 生成物的「发布时重新生成」沿用上游工具，yss-cli 的 `docs/source-lock.json` 要等发布打 tag 时才会因根锁变化而刷新 |
| AR-04～AR-17 | 未开始 | — | 规格与计划已 `accepted` |

## 附录 A：度量口径

- **管道提交（NFR-001）**：根仓的非合并提交里，只改下列路径的提交算作管道提交：`skills-lock.json`、`submodules/*`、`*.lock.json`、`*manifest.json`、`.codex/skills/**`、`.cursor/skills/**`、`.pi/skills/**`、`.claude/skills/**`、`profile-skill-sync.json`、`pnpm-lock.yaml`、来源锁（文件名为 `source-lock*.json`，不含名字里带 source-lock 的脚本和测试）。之后这些路径即使已被删除，口径也保持不变，以便前后可比。实现是 `scripts/lib/harness-metrics.mjs` 的 `pipelineCommitStats`，输出在 `scripts/harness-metrics` 的 `pipeline_commits`；没有改动任何文件的提交不计入。
  - 起点：2026-08-27 至 2026-10-11 共 396 个非合并提交，其中 149 个是管道提交（37.6%），311 个至少触及一个管道文件（78.5%）。复现：`scripts/harness-metrics --rev ec1edda0 --since 2026-08-27`。
  - 默认窗口是 rev 的提交时间往前 30 天，同一个提交上结果可重复；本计划立项时（`e4873299`）最近 30 天为 289 个提交里 122 个，42.2%。
- **修一次内核涉及的仓库数（NFR-002）**：一次修复从提交到新实例可用，需要提交的仓库个数，即 PR 所在仓库个数。起点是 5 个：根仓、三个 Profile、yss-cli。
- **daily 起步必读（NFR-003）**：
  - 起点 57,013 B（约 56 KiB），由这些文件构成：`AGENTS.md`、`CONTEXT.md`、`.agents/skills/yss-product-lifecycle/SKILL.md`、`.agents/skills/yss-product-lifecycle/references/daily-delivery.md`、`.agents/skills/yss-product-lifecycle/references/user-decisions.md`，加上编排合同的 `request_triage` 段（原文 6,094 B）。
  - 实现是 `scripts/harness-metrics` 的 `daily_start`，`profile` 为 `pre-s4`；AR-14 切换口径时把 profile 改为新值，前后数字不混用。
  - S4 之后的口径：`AGENTS.md`、`CONTEXT.md`、`yss lifecycle route --json` 的输出。
