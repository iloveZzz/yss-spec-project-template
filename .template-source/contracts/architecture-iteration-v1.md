---
design_id: architecture-iteration-v1
version: 0.3.0
status: accepted
content_profile: plan-spec-v1
repository_mode: template-source
intensity: L2
owner: maintainer
updated_at: 2026-10-13
execution_plan: architecture-iteration-v1-plan.md
---

# 架构迭代规格：单仓、单实现、按版本钉住

## 文档状态与范围

本文是 `template-source` 的维护合同，状态为 `accepted`：各项决定已于 2026-10-11 由维护者在 wayfinder 决策地图里逐票确认，地图在仓外 `.work/architecture-iteration/`，决定摘要见[执行计划](architecture-iteration-v1-plan.md)第 6 节；同日维护者确认了本文措辞并解决 Q-001、Q-002。`accepted` 的含义是可以按执行计划派发工作包，每个工作包只能写入计划第 3 节列出的路径；推送、打 tag、发布 CLI、归档旧仓库仍按计划第 1 节第 8 条逐次授权。本文规定这轮改造要达到的可观察结果；执行顺序、写入范围和验证命令见执行计划。本文不是产品 Spec，不触发产品 Spec、OpenAPI、原型或 `context_reconciliation`，这些项记为 `not-applicable：模板源架构维护`。

2026-10-13 续推校正：本版回写执行计划第 6 节已记录的 AR-03、AR-04、AR-09、AR-11 与 AR-12c 决定，不新增批准。现役 Profile 为 spec、design、backend；前端技能保留，前端 Profile 与 Spec 本地前端实现已退役，旧前端实例明确拒绝升级且保留原文件。现状证据表保留立项时的四 Profile 基线。当前进度、欠项和 Codex 分工以执行计划第 8 节为准；本地实现、集成、发布和效果复测分别验收。

本轮的主目标是**迭代速度**：一次内核改动从修改到实例可用，要经过多少个提交、多少个仓库、多少个人工步骤。次要目标是减少 Agent 起步要读的规则。本轮不推翻[模板加固规格](harness-hardening-v1.md)已交付的结果；hardening 的 WP-08 移交给本合同，WP-11 不受影响，照常签署。

## 问题陈述

迭代慢主要不是因为哪个脚本慢，而是分发方式和钉住方式本身带来的固定成本：

- 治理内核在根仓和三个 Profile 子模块里各有一份副本，再整份复制进每个实例。
- 五个仓库没有任何版本号，只能按 commit SHA 互相钉住。根仓用 gitlink 钉 yss-cli，yss-cli 又反过来钉根仓，于是每次修复后面都要跟一个重钉提交。
- 同一套治理语义在 Node 和 Go 里各实现一份，对拍测试已经不存在。
- Node 内核有一个 34 个模块的导入环。
- 编排合同只增不减，Agent 起步就要读大量规则。

## 现状证据

以下数据于 2026-10-11 在 main（`d63786d2`）只读实测。提交统计窗口为 2026-08-27 至 2026-10-11，截止到 `ec1edda0`。

| 编号 | 事实 | 位置 |
|---|---|---|
| 证据 1 | 396 个非合并提交里，149 个（37.6%）只改锁、指针、投影或清单，311 个（78.5%）至少碰到其中一种（口径与复现命令见执行计划附录 A；最近 30 天窗口为 289 个里 122 个，42.2%）。改动最多的文件：`skills-lock.json` 137 次，三个 Profile 指针各 97～99 次，`strategic-handoff-tools.lock.json` 89 次 | 根仓 Git 历史 |
| 证据 2 | 每个 Profile 有 174～209 个 `scripts/` 文件与根仓逐字节相同。扣掉测试、证据和 wiki 后，每个 Profile 只剩约 50 个独有文件，其中 4 个 lib 三个 Profile 都有 | `submodules/yss-harness-*-agent/` |
| 证据 3 | 根仓、三个 Profile、yss-cli 都是 0 个 tag。yss-cli 的来源锁固定 spec 于 `cad38300`，落后 42 个提交；它内嵌的 8.9 MB `bundles.json.gz` 在 82 个提交里被改了 17 次 | `submodules/yss-cli/docs/source-lock.json`；`submodules/yss-cli/internal/bundle/assets/` |
| 证据 4 | 三个 Profile 都没有独立 CI，`.github/workflows` 已删；根仓验证 profile 有 19 处直接引用 `submodules/yss-harness-*` | `.template-source/process/template-verification-profiles.yaml` |
| 证据 5 | Node `scripts/lib` 有一个 34 个模块的导入环，内部 88 条边，切断 5 条即可消除。验证子系统自身另有一个 7 模块的环 | `scripts/lib/`；`.template-source/scripts/lib/` |
| 证据 6 | Go `internal/governance` 共 33,320 行，全在一个包里；yss-cli 在 `d8e1517` 删除了全部测试，现有 0 个 `_test.go`，根仓也没有 Node↔Go 对拍 | `submodules/yss-cli/internal/governance/` |
| 证据 7 | spec 实例分发的 59 个入口里，只有 3 个调用 `yss`；约 25 个入口没有任何对应的 Go 子命令；daily 路由（`lifecycle route`、`verify-daily`）只有 Go 有。13 个只覆盖了一部分的领域里，有 9 个由 Agent 技能实际调用 Node | `submodules/yss-cli/docs/porting-status.md`；`.agents/skills/` |
| 证据 8 | 实例只认 profileId 和 `templateCommit`，不记录来源仓库；新 bundle 不再包含的文件，旧实例默认原样保留（`retired-preserved`）；删除规则必须精确匹配历史来源，四个 Profile 都还没有任何规则 | `scripts/lib/instance-metadata.mjs`；`submodules/yss-cli/internal/project/upgrade.go` |
| 证据 9 | 按官方文档，Codex、Cursor、Pi 都直接读 `.agents/skills`，只有 Claude Code 需要 `.claude/skills`（支持符号链接）。打包器会把 `.codex`、`.cursor`、`.pi` 下的链接展开成完整副本，却不认 `.claude` | `submodules/yss-cli/internal/bundle/producer.go` |
| 证据 10 | 编排合同有 63 个顶层策略、95 KB，其中 35 个（38% 的字节）没有任何代码引用，25 个只存在于合同里。daily 起步必读约 56 KB | `.agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml` |
| 证据 11 | 验证 profile 3,219 行、引用 201 个检查 id、分 4 档；`gate_policy.activation` 仍是 `legacy-full` | `.template-source/process/template-verification-profiles.yaml` |
| 证据 12 | `.codex/skills/product-design` 是 OpenAI 的第三方 Codex 插件（`role-specific-plugins`，v0.1.41，带 `.codex-plugin`、`.app.json`），不是本仓编写的技能；根仓和 design Profile 各有 56 个受追踪文件。注册表把它登记为 Codex 平台技能（`platform_skills`），默认不可发现 | `.codex/skills/product-design`；`.template-spec/agents/yss-skill-registry.yaml`；`skills-lock.json` |

外部参照（只用于判断方向，不作为本仓规则来源）：Codex、Cursor、Claude Code 的官方技能文档，以及 Pi 0.27.4 的发布记录。实施时按当期文档复核，见 Q-003。

## 解决方案

分五个阶段推进，验证收缩贯穿全程。前一阶段的出口没通过，就不开始后一阶段的写入：

1. **S0 版本与迁移底座**：引入语义化版本；CLI 改钉模板 tag；迁移规则支持版本区间，删除动作可以逐文件拒绝；根仓去掉 yss-cli 子模块（FR-001～FR-004）。
2. **S1 生成物与投影**：根锁瘦身、生成物只在发布时重新生成（提交的副本由 CI 校验）；不再有任何技能投影根，只保留 `.agents/skills`（FR-005、FR-006；维护者 2026-10-12 决定连 `.claude/skills` 也不保留）。
3. **S2 Profile 并入**：打包时由内核与覆盖层组合；Profile 并入根仓 `profiles/*`，同步机制随之删除；AR-12c 后仅保留 design、backend 与共享覆盖层（FR-007、FR-008）。
4. **S3 分层与单一实现**：内核分四层，不再有导入环；校验归 Go，工作流归 Node，分四步退役（FR-009～FR-011）。
5. **S4 规则与 Agent 上下文**：编排合同拆分；Agent 通过 `yss lifecycle route` 获取规则摘录；schema 常驻两代（FR-012～FR-014）。
6. **贯穿各阶段**：每个阶段删掉随之失去对象的检查，最后只留两档（FR-015）；实例迁移按版本分批进行（FR-016）。

## 功能需求

| ID | 需求 | 优先级 | 来源引用 | 验收引用 | 未决项 |
|---|---|---|---|---|---|
| FR-001 | 模板与 yss-cli 各有一条语义化版本线，现役三个 Profile（spec、design、backend）共用模板版本；模板的首个 tag 为 `v4.0.0`（高于 spec 旧 npm 包的最高版本 3.5.10，也不与 yss-cli 的 1.3.x 混淆）。yss-cli 的来源锁钉模板 tag，并记录对应 commit 作完整性校验；Bundle 只在 CLI 发布时从 tag 生成，模板的普通提交不触发任何重钉。实例记录 CLI 版本和模板版本。N3 的刷新脚本改为发布流程中的一步，N7 的手动落后检查删除 | P0 | .template-source/contracts/architecture-iteration-v1.md :: heading:现状证据 | AC-001 | 无 |
| FR-002 | 根仓不再用 submodule 固定 yss-cli，改为在一个文件里固定 `yss` 的版本号和 SHA-256；本地联调仍可用 `YSS_NATIVE_BINARY` 覆盖。`check.cli-content-identity` 改为核对这个固定版本。实现口径：固定文件 `.template-source/distribution/yss-cli-pin.json` 记录 `yss` 自报的版本号、构建所用的 yss-cli 提交、Go 版本，以及各平台二进制的 SHA-256；同一提交、同一 Go 版本、按 yss-cli 的 `tools/build-candidate.mjs` 构建出的二进制逐字节相同，所以摘要可以核对（配方固定 Go 环境并带 `-mod=readonly -trimpath -buildvcs=false`；AR-03 同步上游后由原来单独的 `-trimpath` 构建改为这条官方配方）。尚无包含本轮改动的 CLI 发行版，固定的是按该提交构建的二进制，CLI 发布后再改记发行包摘要。本地联调自己构建的二进制，用 `YSS_NATIVE_BINARY_OVERRIDE=1` 显式覆盖，结果标记为未固定；CI 与发行验证不接受覆盖 | P0 | .template-source/contracts/architecture-iteration-v1.md :: heading:现状证据 | AC-002 | 无 |
| FR-003 | yss-cli 的迁移规则支持按模板版本区间匹配。从 yss-cli 的来源锁历史和内嵌 bundle 历史，一次性生成「commit → 版本」对照表，随 CLI 发布 | P0 | .template-source/contracts/architecture-iteration-v1.md :: heading:现状证据 | AC-003 | 无 |
| FR-004 | 升级计划里的删除动作可以逐文件拒绝（选择「保留」）；用户拒绝时文件保留，升级不失败 | P0 | .template-spec/process/harness-upgrade.md :: heading:计划、冲突与保护 | AC-004 | 无 |
| FR-005 | 根仓 `skills-lock.json` 只记录上游来源与上游哈希，本地技能的树哈希（`effectiveHash`）不再提交，在验证或发布时现算；实例里的锁由打包器按分发的技能树重算 `effectiveHash`，格式与旧版逐字节一致。yss-cli 的生成物（`bundles.json.gz`、现役三个 Profile 的离线帮助 JSON、`docs/cli-help.md`）保持提交（离线帮助照旧在构建时嵌入），由上游 CI 的 artifacts 检查校验与源码一致，只在发布时重新生成（AR-03 同步上游后收窄：上游已用 `tools/artifacts.mjs` 与 `artifacts.yml` 把校验与生成做成同一套工具，不再改为不提交） | P1 | .template-source/contracts/architecture-iteration-v1.md :: heading:现状证据 | AC-005 | 无 |
| FR-006 | 投影根收敛：删除 `.codex/skills`、`.cursor/skills`、`.pi/skills`，`.agents/skills` 是唯一的技能目录，不再有任何投影根（维护者 2026-10-12 决定，连 `.claude/skills` 也删除）；注册表与锁的运行时、投影根清空，实例不再有「运行时 ↔ 投影根」的对应。第三方 Codex 插件 `product-design` 从模板、现役 Profile 与新实例分发中移出，由用户自行安装；注册表 `platform_skills` 里的登记和锁里的平台技能组随之清空，`platform_skills` 机制本身保留。已有实例里的 `.codex/skills`（含 `product-design`）按 FR-003、FR-004 的版本区间删除规则清理，用户可以拒绝。本条接手 hardening 的 FR-011 / WP-08 | P1 | .template-source/agents/skills-maintenance.md :: heading:权威内容与投影 | AC-006 | Q-003 |
| FR-007 | yss-cli 打包器支持「内核 + 覆盖层」组合：覆盖 spec、design、backend，范围包括技能、`scripts/`、`.template-spec/process/`、`.template-spec/templates/`；覆盖层里同路径的文件优先。现有的 9 种字节替换改为「统一路径布局 + 2 个参数」（查询 profile、编排合同路径） | P0 | .template-source/contracts/architecture-iteration-v1.md :: heading:现状证据 | AC-007 | 无 |
| FR-008 | Profile 并入根仓；AR-12c 后保留 `profiles/{backend,design}/`，共有内容放 `profiles/_specialist/`，每个目录只放覆盖层。采用快照导入，导入提交写明来源仓库与 commit；旧仓库归档为只读。同时删除：同步脚本、`strategic-handoff-tools.lock.json`、`profile-variants.json`、Profile 漂移检查、`.strategic-design-skills-manifest.json`、三个 submodule 指针。Profile 的 evidence 和 wiki 移到仓外归档，并附 SHA-256 清单 | P0 | .template-source/contracts/architecture-iteration-v1.md :: heading:现状证据 | AC-008 | 无 |
| FR-009 | 治理内核分四层：core（读写、schema、注册表、摘要与决定 IO）→ 领域校验 → 工作流 → 入口，上层只依赖下层。Node 侧消除导入环，并加一条亚秒级、只读的导入方向检查；Go 侧把 `internal/governance` 按领域拆成子包 | P1 | .template-source/contracts/architecture-iteration-v1.md :: heading:现状证据 | AC-009 | 无 |
| FR-010 | 每个治理领域只保留一份实现：门禁、批准、合同、交接、证据等校验语义归 Go，对应的 `scripts/verify-*` 改为同名薄壳；准备、派发、编译、生成、维护推进等工作流工具归 Node，不移植到 Go。按四步退役：(1) approval、user-decision、verification、spec-baseline；(2) checkpoint、slice、task 的校验；(3) handoff、context；(4) backend 的校验部分。前端整线按 AR-12c 移除，不再向 Go 迁移；AR-09～AR-12 已收口的入口与剩余 Node 实现删除分别验收，后者归 AR-12b | P1 | .template-source/contracts/architecture-iteration-v1.md :: heading:现状证据 | AC-010 | Q-004 |
| FR-011 | 唯一实现的最低测试：每个归 Go 的校验领域保留一组录制 fixture 回放，秒级跑完；每个薄壳一条冒烟检查，确认它调用的子命令存在、退出码能透传。fixture 与回放放在根仓，用固定版本的 `yss` 执行；yss-cli 仓库维持现行「不放测试」的政策 | P1 | .template-source/contracts/architecture-iteration-v1.md :: heading:现状证据 | AC-011 | 无 |
| FR-012 | 编排合同按四层和领域边界拆分，`work_unit_routes` 每个工作单元一个文件。没有代码引用的策略逐项写明 owner 和消费者（代码、技能或 Agent 步骤），写不出来的删除 | P1 | .template-source/contracts/architecture-iteration-v1.md :: heading:现状证据 | AC-012 | 无 |
| FR-013 | Agent 起步改为：AGENTS.md → `yss lifecycle route --json`，由引擎返回下一步和当前工作单元的规则摘录；AGENTS.md 只保留入口和硬门禁 | P1 | .template-source/contracts/architecture-iteration-v1.md :: heading:现状证据 | AC-013 | 无 |
| FR-014 | 每个 schema 常驻「当前版 + 上一版」两代，更早的版本只由 `yss migrate` 读取；注册表、批准记录、交接包的语义不变 | P2 | .template-source/contracts/architecture-iteration-v1.md :: heading:现状证据 | AC-014 | 无 |
| FR-015 | 验证收缩：失去检查对象的检查与它们的检查对象一起删除；新增导入方向、薄壳冒烟、fixture 回放三类检查；发布时做 bundle 逐文件摘要对比。S2 之后只留 `fast`（PR 与本地，按影响面选择）和 `release`（打 tag 时跑全量）两档；`candidate`、`legacy-full`、`legacy_coverage` 记账和资格校验层退役 | P1 | .template-source/contracts/architecture-iteration-v1.md :: heading:现状证据 | AC-015 | 无 |
| FR-016 | 已有实例的迁移：每个模板版本都通过 `yss upgrade` 给出可审阅的计划，不强制升级。被薄壳取代的入口作为同名受管文件更新。旧副本（退役的 Node 校验模块、投影根副本）按退役步骤，随对应版本的删除规则清理。旧 npm 家族实例维持现有的 `migrate` 路径；AR-12c 已退役的前端家族例外：明确拒绝 sync、doctor、diff、migrate plan，不生成计划或修改用户文件 | P0 | .template-spec/process/harness-upgrade.md :: heading:计划、冲突与保护 | AC-016 | 无 |

## 非功能需求

| ID | 需求 | 适用条件/负载 | 指标及单位 | 目标 | 确认状态 | 验证方法 | 来源引用 | 验收引用 | 未决项 |
|---|---|---|---|---|---|---|---|---|---|
| NFR-001 | 管道提交减少 | 根仓非合并提交，30 天窗口 | 只改锁、指针、投影、清单的提交占比 | 由 37.6%（2026-08-27 起；最近 30 天为 42.2%）降至 < 10% | 已确认 | 检查：`scripts/harness-metrics` 的 `pipeline_commits`，口径见执行计划附录 A | .template-source/contracts/architecture-iteration-v1.md :: heading:现状证据 | AC-017 | 无 |
| NFR-002 | 修一次内核只碰一个仓 | 只改工作流或规则、不改校验语义的修复 | 涉及的仓库数 | 由 5 个降至 1 个（改校验语义时另加 yss-cli） | 已确认 | 检查：S2 之后抽查 5 次修复 | .template-source/contracts/architecture-iteration-v1.md :: heading:问题陈述 | AC-008, AC-017 | 无 |
| NFR-003 | Agent 起步更轻 | daily 路径，首次进入 | 起步必读字节 | 由约 56 KB 降至 ≤ 10 KB | 已确认 | 检查：`harness-metrics` | .template-source/contracts/architecture-iteration-v1.md :: heading:现状证据 | AC-013 | 无 |
| NFR-004 | 已有实例兼容 | 已按旧版本初始化的现役 Profile 实例；前端退役按 FR-016 明确拒绝并保留文件 | 升级失败数；强制删除数 | 都为 0；所有删除都经可审阅、可逐文件拒绝的计划 | 已确认 | 测试：升级场景与删除拒绝场景 | .template-spec/process/harness-upgrade.md :: heading:计划、冲突与保护 | AC-004, AC-016 | 无 |
| NFR-005 | 新增检查轻量 | 本轮新增的每一项检查 | 单项耗时；是否只读；是否依赖构建二进制 | 亚秒级；只读；不依赖构建（fixture 回放在 `release` 档执行，不受此限） | 已确认 | 检查：fast 计划与耗时记录 | .template-source/contracts/architecture-iteration-v1.md :: heading:文档状态与范围 | AC-009, AC-011 | 无 |
| NFR-006 | 不增加流程概念 | 本轮全部变更 | 新增流程术语数、门禁数 | 0；删除或合并概念不受限 | 已确认 | 检查：`process-glossary.md` 与注册表前后对比 | .template-source/contracts/harness-hardening-v1.md :: heading:非功能需求 | AC-015 | 无 |

## 验收标准

| ID | 需求引用 | 前提 | 触发 | 可观察结果 | 场景类型 | 未决项 |
|---|---|---|---|---|---|---|
| AC-001 | FR-001 | 模板已打首个 tag `v4.0.0` | 在 yss-cli 发布流程中刷新来源锁 | 来源锁记录 tag 和 commit；在模板上做一次普通提交后，yss-cli 与根仓都没有新增重钉提交 | 成功 | 无 |
| AC-002 | FR-002 | S0 完成 | 检查根仓的 `.gitmodules` 与固定版本文件，运行 fast | 没有 yss-cli gitlink；固定文件写有版本号和 SHA-256；版本或摘要不符时 `cli-content-identity` 失败 | 成功 / 拒绝 | 无 |
| AC-003 | FR-003 | 一个按历史 commit 初始化的实例 | 用新 CLI 生成升级计划 | 能借对照表识别出该实例的模板版本；按版本区间匹配的删除规则生效；对照表里找不到的 commit 明确报告，不猜测 | 成功 / 边界 | 无 |
| AC-004 | FR-004, NFR-004 | 升级计划里含删除动作 | 用户对其中一个文件选择「保留」后应用 | 该文件原样保留，其余动作照常执行，升级不失败 | 状态变化 | 无 |
| AC-005 | FR-005 | S1 完成 | 检查根仓受追踪的 `skills-lock.json`，并让打包器分别用带与不带 `effectiveHash` 的模板锁渲染实例锁 | 根锁里没有 `effectiveHash`；两种输入渲染出的实例锁逐字节相同；改动技能正文不再改动根锁（相对上游的适配状态没有变化时）；实例锁里的哈希与分发的技能树不符时，读取方仍报漂移 | 成功 / 拒绝 | 无 |
| AC-006 | FR-006 | S1 完成 | 用新版本初始化现役三个 Profile，核对技能目录、注册表与技能引用；自动发现能力按运行时分别记录 | 实例里没有 `.codex/skills`、`.cursor/skills`、`.pi/skills`，也没有 `.claude/skills` 与 `product-design`；`.agents/skills` 里有全部技能，`skills resolve` 不需要运行时参数；注册表 `platform_skills` 为空且校验通过；已有实例里的投影文件（含 `product-design`）以可拒绝的删除列出，拒绝时原样保留 | 成功 / 状态变化 | Q-003 |
| AC-007 | FR-007 | yss-cli 组合能力已扩展 | 对同一组源码，分别按旧形态（子模块）和新形态（覆盖层）构建 | 现役 Profile 的「路径 → digest、mode、ownership」映射在未调整范围内逐项一致；已批准的投影与前端退役差异逐项单列，不伪称零差异 | 成功 | 无 |
| AC-008 | FR-008, NFR-002 | S2 完成 | 检查 `.gitmodules`、`profiles/` 和同步机制；修改一个共享内核文件 | 没有 Profile submodule；同步脚本、工具锁、有意定制登记、设计技能清单都已删除；这次修改只需根仓 1 个 PR，构建出的现役三个 Profile 都带上了它 | 成功 | 无 |
| AC-009 | FR-009, NFR-005 | S3 第一步完成 | 运行导入方向检查；故意加一条反向导入 | Node 没有导入环，检查在 1 秒内通过；加了反向导入后检查失败，并指出这条边 | 成功 / 拒绝 | 无 |
| AC-010 | FR-010 | 某一步退役完成 | 检索技能和实例分发清单；运行对应的薄壳 | 技能里不再引用被退役的 Node 实现；薄壳只调用 `yss`，输出与退出码透传 | 成功 | Q-004 |
| AC-011 | FR-011, NFR-005 | 一个归 Go 的校验领域 | 运行 fixture 回放和薄壳冒烟 | 回放秒级完成；改动 fixture 里的判定结果后，回放失败 | 成功 / 拒绝 | 无 |
| AC-012 | FR-012 | S4 完成 | 检索编排合同 | 合同已按层和领域拆分；每条策略都写明 owner 和消费者；被删除的策略列在执行记录里 | 成功 | 无 |
| AC-013 | FR-013, NFR-003 | S4 完成 | Agent 走一次 daily 路径的起步流程 | 只读 AGENTS.md 和 `yss lifecycle route --json` 的输出；起步必读 ≤ 10 KB | 成功 | 无 |
| AC-014 | FR-014 | S4 完成 | 检查实例里常驻的 schema；对旧版本资产运行 `yss migrate` | 每个 schema 最多常驻两代；更早的版本只能经 `yss migrate` 读取并升级 | 成功 | 无 |
| AC-015 | FR-015, NFR-006 | S2 之后 | 查看验证 profile 与 ci-gate | 只剩 `fast` 与 `release` 两档；没有失去对象的检查；资格校验层已删除，验证子系统没有导入环；流程术语与门禁数没有增加 | 成功 | 无 |
| AC-016 | FR-016, NFR-004 | 一个现役 Profile 的旧版本实例，本地改过某个将被薄壳取代的文件；另备一个已退役前端实例 | 对现役实例运行升级计划；对旧前端实例运行 `sync/doctor/diff/migrate plan` | 现役实例被改过的文件以冲突形式列出，由用户选择；退役副本以可拒绝的删除列出；不升级时实例照常可用。旧前端实例明确拒绝且不生成计划，目录、文件和暂存区保持不变；拒绝场景可复用 AR-12c 已绑定的回归证据 | 状态变化 / 拒绝 | 无 |
| AC-017 | NFR-001, NFR-002 | 全部阶段完成后的 30 天 | 按执行计划附录口径统计 | 管道提交占比 < 10%；抽查的 5 次内核修复都只涉及根仓 | 成功 | 无 |

## 非目标范围

- 除执行计划已记录的 AR-12c 前端退役外，不改生命周期注册表的阶段、门禁、工作单元结构；不新增阶段或门禁。AR-12c 保留已发布稳定 ID 的弃用登记。
- 不改批准记录与数字人会签语义。交接包保留兼容形状，但按 AR-12c 拒绝前端声明与消费；其余语义不变。旧 schema 常驻方式由 FR-014 调整。
- 不把 Node 的工作流工具移植到 Go。
- 不触发 hardening WP-11 的物理拆分（治理核心层 / YSS 技术栈 profile 层）；本轮的分层在同一个仓内完成。
- 不强制已有实例升级，也不静默改写它们。
- 不迁移仓库托管位置，不处理第二维护者（hardening FR-017 / Q-007）。

## 风险

| 风险 | 影响 | 应对 | 责任人 | 时点 |
|---|---|---|---|---|
| 一次性并入三个 Profile，改动面大 | 漏删或漏并，新实例内容变化 | 用 AC-007 的逐文件摘要映射对比作为合入前提；先改 yss-cli、再改根仓，分两个 PR | 实施者 | S2 |
| 唯一的 Go 校验实现没有测试兜底 | 退役 Node 后，校验悄悄出错 | 每退一步，先补 FR-011 的 fixture 回放，再删 Node 实现 | 实施者 | S3 每一步 |
| Windows 不能直接创建符号链接 | `.claude/skills` 链接在 Windows 实例里失效 | 已消除：不再有投影链接，Q-003 不再适用 | 实施者 | S1 |
| 历史实例在对照表里找不到 | 版本区间规则匹配不到，旧副本清理不了 | 找不到的明确报告，旧副本保留（满足 NFR-004），不猜测 | 实施者 | S0 |
| design 实例的用户依赖 `product-design` | 新实例不再带该插件，用户需自行安装 | 升级计划和 README 注明安装来源；已有实例默认保留该目录 | 实施者 | AR-04 |
| 多个会话共用同一工作目录 | 改动混进别人的分支 | 每个工作包使用独立 worktree 和分支，动手前先确认分支 | 维护者 | 每个工作包开始前 |

## 未决项

| ID | 问题 | 判断依据 | 责任人 | 解决时点 | 接收方 / 解决证据 |
|---|---|---|---|---|---|
| Q-001 | 模板第一个 tag 的版本号 | **已决（2026-10-11）**：`v4.0.0` | 维护者 | 已解决 | FR-001、AC-001；计划第 6 节 |
| Q-002 | Codex 独有的第三方插件 `product-design` 的归宿 | **已决（2026-10-11）**：从模板移出，由用户自行安装 | 维护者 | 已解决 | FR-006、AC-006；计划第 6 节 |
| Q-003 | **已消除（2026-10-12）**：不再有 `.claude/skills` 链接，Windows 联接与 Cursor 符号链接问题不再适用。原问题：Windows 实例的 `.claude/skills` 用目录联接还是副本？ | 官方文档没写 Windows 的行为；Cursor 社区有符号链接相关的问题报告 | 实施者 | AR-04 | 实施记录，附当期官方文档链接与本机实测 |
| Q-004 | Node 独有的校验（context 对账与 UI 基线导入、handoff 消费细节等）补进 Go 的工作量有多大？ | 影响退役第 2、3 步的排期 | 实施者 | AR-09 开工前 | 实施记录 |
