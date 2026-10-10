---
design_id: spec-delta-rebaseline-design
version: 0.1.0
status: proposed
repository_mode: template-source
intensity: L2
owner: maintainer
updated_at: 2026-10-11
spec: harness-hardening-v1.md
work_package: WP-10
---

# Spec Delta 合并回基线：设计

本文是 [模板加固规格](harness-hardening-v1.md) FR-013 与 AC-018 的设计交付，对应 [执行计划](harness-hardening-v1-plan.md) 的 WP-10。**只做设计**：不改生命周期注册表、批准记录 schema、交接包格式与任何脚本，实现另立合同（规格“非目标范围”）。状态为 `proposed`，第 12 节的决策记录由维护者签署后才算 AC-018 完成。

## 1. 要解决的问题

Spec Delta 模板定义了 `ADDED / MODIFIED / REMOVED` 三类行为差异，但整套资产里没有“Delta 批准并交付后，把差异并回 Spec、产生新基线版本”的流程（规格证据 11）。后果是：

- 第二个 Delta 对着哪份 Spec 比较没有规定。只能对着最初冻结的 Spec 再叠加人工记忆里的第一个 Delta。
- 实现与验收引用的 FR / AC 编号，在 Spec 正文里并不反映已交付的行为，新来的人读 Spec 读到的是过期状态。
- ID 复用无人把关：Delta 模板要求“删除项保留旧 ID，不复用”，但没有账本可查。
- 每个 Delta 都要重新论证“这次改动没有破坏上一次”，缺少一个可验证的当前基线。

## 2. 现有事实（设计的约束来源）

| 事实 | 位置 | 对设计的约束 |
|---|---|---|
| Delta 行用稳定 ID 引用 FR/NFR/AC，注明旧/新基线文件；删除项保留旧 ID，不复用；`inspect-plan-spec diff` 只是辅助证据，“不判定语义等价、不延续批准、不缩小验证范围” | `.template-spec/templates/spec-delta-template.md` | 合并不能以 diff 工具的结论代替人的判断；合并本身不延续批准 |
| `artifact.spec-delta` 属于 `stage.spec-architecture`，触发条件是“已有冻结 Spec 的高风险行为变化” | `.template-spec/process/lifecycle-registry.yaml` | 合并发生在现有阶段内，不新增阶段、门禁或工作单元 |
| `gate.spec-baseline-approved` 的触发是“新功能、行为变化或范围扩大进入 Spec 基线；已授权范围内细化复用当前有效授权，实质变化重新决定” | 同上 | 新基线字节变了，必须重新取得批准，或在授权明确覆盖时走授权延续 |
| 批准记录用 `basis` 绑定 `ref` 与 `digest`，Spec 批准必须覆盖当前 Spec 的原始字节 | `.template-spec/process/schemas/approval-record.schema.json`、`scripts/lib/spec-baseline.mjs` | 批准之后任何字节变化都使批准失效，所以批准引用不能写回 Spec 本身 |
| `inspect-plan-spec diff --before --after --json` 按 ID 输出 `added / removed / modified / unassessed`，附 `reference_changes`、原始字节差异和前后 SHA-256；状态可能是 `compared`、`partially-compared` 或“无法比较旧内容” | `scripts/lib/plan-spec-quality.mjs` | 可以机械核对“合并结果恰好等于 Delta 声明的改动”；`unassessed` 与超出 Delta 的差异必须有人解释 |
| 跨实例交接用不可变包 `docs/spec-baselines/<baseline_id>/<version>/package` 与 `receipt.json`，同身份同版本不同摘要拒绝覆盖 | `.template-spec/process/spec-baseline.md`、`scripts/lib/spec-baseline.mjs` | 新基线版本天然对应新包版本，旧包与已导入的回执保持不变 |

## 3. 设计原则

1. **合并是起草者的机械工作，不是批准。** 合并产出新字节，批准另走 `gate.spec-baseline-approved`。
2. **旧版本不可变。** 合并只新增版本，从不改写已批准的文件。
3. **不新增概念。** 不加阶段、门禁、状态机；只在 `stage.spec-architecture` 内多一次“起草新版本”。血缘记录用一份旁路文件，不引入新的注册表字段。
4. **ID 永不复用。** 被删除的 ID 进入账本，之后任何 Delta 的 ADDED 不得取用。
5. **冲突一律阻断，不自动消解。** 阻断后由起草者修订 Delta，而不是由工具猜测意图。

## 4. 术语对齐

避免与现有词混用：

- **Spec 基线版本**：已批准的一份 Spec 文件及其字节摘要，用整数 `revision` 编号，从 1 开始。本文的“新基线”指它。
- **交接包版本**：`spec-baseline.md` 里 `baseline_id` 下的 `version`，是跨实例交接的不可变包。两者一一对应：导出第 N 版 Spec 基线时，包版本取 `revision` 的值。本轮不改导出格式，对应关系写在实现合同里。
- **Delta**：现有 `artifact.spec-delta`。本文不改它的模板，只规定它被“合并”之后发生什么。

## 5. 触发时点

合并在同时满足下列条件时到期（称“到期”，不是新状态）：

1. Delta 已通过其批准（在 `gate.spec-baseline-approved` 或 Delta 自带的批准范围内）；
2. Delta 的“相关 Ticket / 切片”列出的垂直切片全部完成交付验收（`gate.delivery-accepted` 通过，使用当前验证证据）；
3. 对同一 Spec 没有更早的、尚未合并的已批准 Delta（顺序合并，见第 9 节）。

**不在批准当刻合并，也不在起草时预合并。** 原因：基线应只描述已经交付的行为。批准后立刻合并，会让基线先于代码，回滚一个切片时基线与现实对不上；起草时预合并则让批准绑定的字节在审阅期间继续变化。

“到期”由主控在交付验收之后、同一功能的下一个 Delta 开始之前检查。若下一个 Delta 已经起草而前一个仍未合并，先合并前者，再把后者的对比基线改为新版本（第 9 节“基线过期”）。

## 6. 合并规则

输入：父基线 Spec（版本 N）与已批准且到期的 Delta。输出：候选 Spec（版本 N+1，待批准）。规则按 Delta 行的稳定 ID 逐条应用，顺序按 Spec 现有章节顺序，结果确定、可重复。

| Delta 类型 | 前置检查 | 应用 | 账本 |
|---|---|---|---|
| `ADDED` | ID 不存在于父基线，也不在历史账本（含已退休 ID） | 在对应章节追加条目，字段取“目标状态” | 记入 `changes` |
| `MODIFIED` | ID 存在于父基线 | 用“目标状态”替换该条目的需求、验收引用、优先级等字段，ID 不变 | 记入 `changes`，附修改前后条目的摘要 |
| `REMOVED` | ID 存在于父基线 | 从有效章节移除条目 | 记入 `retired_ids`，之后任何版本都不得复用 |

应用后必须同时满足：

- **引用闭包。** 每个 FR 的验收引用能解析到现存 AC；被移除 ID 的所有入向引用，都已被同一 Delta 的 `MODIFIED` 行改掉或一并移除。
- **叙述章节不被悄悄改写。** 问题陈述、解决方案、用户故事不是按 ID 管理的条目。Delta 若需要改动它们，必须在 Delta 里显式写出该章节的替换文本；否则合并结果的这些章节与父基线逐字节相同。
- **幂等。** 对同一父基线与同一 Delta 重复合并，结果字节相同。
- **差异自证。** 用 `inspect-plan-spec diff --before <父基线> --after <候选>` 复核：按 ID 的条目集合与 Delta 声明的 ID 集合及类型完全一致；出现 `unassessed`、未声明的条目或超出 Delta 的原始字节差异时，候选不得送审。

## 7. 版本与血缘

血缘放在与 Spec 同目录的旁路文件 `<spec 文件名>.lineage.yaml`，**不写进 Spec 本身**：批准绑定 Spec 的原始字节，而批准引用是批准之后才产生的；写进 Spec 会让批准立刻失效。

每个已批准版本在旁路文件里有一条记录，追加不覆盖：

```yaml
revision: 2                       # 整数，从 1 起，单调递增
spec_ref: <项目根相对路径>
spec_digest: sha256:<…>
parent: { revision: 1, spec_ref: <…>, spec_digest: sha256:<…> }
delta: { ref: <…>, digest: sha256:<…> }
diff_report: { ref: <…>, digest: sha256:<…> }   # inspect-plan-spec diff --json 的原始输出
merge: { by_principal_ref: <起草者>, at: <时间>, tool: <名称与版本> }
changes: [ { id: FR-014, type: MODIFIED, before_digest: sha256:<…>, after_digest: sha256:<…> } ]
retired_ids: [ FR-009 ]           # 累计账本，含历史版本退休的 ID
approval: { gate: gate.spec-baseline-approved, approval_ref: <…>, approval_digest: sha256:<…> }   # 批准后补写
withdrawn: null                   # 撤回时写 { at, reason, by }，不删除记录
```

- 第一个基线（revision 1）没有 `parent` 与 `delta`。
- “当前基线”定义为最高的、已有 `approval` 且 `withdrawn` 为空的版本。下游合同、切片与交接包绑定的是具体 `spec_digest`，不依赖“当前”这个指针，所以指针移动不会让已绑定的资产悄悄漂移。
- `approval` 之外的字段在合并时由起草者写入；`approval` 由批准完成后的主控补写，补写前后 Spec 字节不变。

## 8. diff 报告与批准摘要的绑定

为让批准人看到的就是实际改动，批准记录的 `basis` 增加三类引用（沿用现有 `basis` 结构，不改 schema）：

1. 候选 Spec 的 `ref` 与 `digest`（既有要求）；
2. Delta 的 `ref` 与 `digest`；
3. `inspect-plan-spec diff --json` 输出的 `ref` 与 `digest`。

批准摘要（人读文本）由 diff 报告机械生成，包含：ADDED / MODIFIED / REMOVED 的数量与 ID 列表、`retired_ids` 的新增项、`reference_changes`，以及“原始字节差异中不属于任何 ID 的部分”（应为空）。批准人确认的是这份摘要对应的字节。`verify-approval-record` 复核 `basis` 摘要，任一引用字节变化即视为过期。

批准记录 `basis` 的条目只有 `ref` 与 `digest` 两个字段，其中 `digest` 是不带前缀的 64 位十六进制；血缘文件沿用 `spec-baseline.md` 一侧的 `sha256:` 前缀写法，两者在实现里互转，不要求改 schema。

diff 报告本身是诊断证据：它说明“改了什么”，不说明“改得对不对”。批准结论仍由有权会签的数字人或生物人作出。

## 9. 冲突与回退

| 冲突类型 | 触发 | 处理 |
|---|---|---|
| ID 冲突 | `ADDED` 的 ID 已存在或在账本中 | 阻断；起草者改 Delta |
| 目标缺失 | `MODIFIED` / `REMOVED` 的 ID 不在父基线 | 阻断；通常是 Delta 对着过期基线起草 |
| 基线过期 | 起草 Delta 之后，父基线已有更新的已批准版本 | 阻断；把 Delta 改为对最新版本重起草（新 Delta，旧 Delta 保留不改） |
| 引用断裂 | 合并后有悬空的验收引用或入向引用 | 阻断；补一条 `MODIFIED` 或把引用方一并 `REMOVED` |
| 叙述漂移 | 叙述章节与父基线不一致且 Delta 未声明 | 阻断 |
| 并发 Delta | 两个已批准 Delta 改同一 ID | 按批准顺序依次合并；后者必然“基线过期”，重起草 |

**不做自动消解。** 阻断后产物保持不变，错误信息指出冲突类型、ID 与应修订的 Delta 位置。

**回退。** 旧版本文件不可变，回退不改写任何文件：在血缘里给被撤回版本写 `withdrawn`，“当前基线”随之回到上一个有效版本。已绑定被撤回版本摘要的合同与切片不会自动改变，需要按各自的失效规则重新验证。已向其他实例导出过的交接包保持原样，下游继续使用其导入的版本，直到主动导入新版本。

## 10. 与 `spec-baseline.md` 现有不可变规则的关系

| `spec-baseline.md` 的规则 | 本设计怎么用 |
|---|---|
| 包路径含 `baseline_id` 与 `version`，同身份同版本不同摘要拒绝覆盖 | 新基线版本得到新的包版本，从不覆盖旧包；合并流程不触碰任何已导出的包 |
| 导入回执保持 `imported-pending-context-reconciliation` 与 `ready_for_agent=false` | 新版本被导入时是一次全新导入、全新回执、重新做 Context 对账；旧回执继续证明旧版本 |
| 目标形成新的本地批准后，旧回执继续保留来源，不强制继承旧批准 | 与本设计一致：每个版本各有批准，批准不跨版本延续 |
| `working-set.json` 映射源引用到包内快照 | 新版本的工作集由实现合同生成；合并本身不修改已有工作集 |

结论：本设计不需要放松任何不可变规则，反而依赖它们。需要在实现阶段补的只有一点：导出清单增加 `parent_version`，把包版本链与血缘的 `parent` 对上。该字段属于交接包格式变化，本轮不做。

## 11. 落点决策（Q-006）：先脚本，后 CLI

选项：

- **A. 模板脚本先行**：新增 `scripts/merge-spec-delta`，提供 `--plan`（只读，输出候选与冲突报告）与 `--apply`（写候选与血缘草稿）。
- **B. 直接做进 `yss` CLI**：像 `yss handoff` 一样走原生 plan / 事务 apply。

**建议 A。** 理由：

1. 合并是对 Markdown 条目的确定性文本变换加验证，脚本已够；`inspect-plan-spec` 就是同类的 Node 脚本，可以直接复用其按 ID 解析的能力。
2. 不引入对 yss-cli 的依赖。本轮 WP-05、WP-08 已经暴露模板与 CLI 的发布错位成本，再增加一个需要同步发布的功能没有必要。
3. 先用脚本跑完至少一个真实 Delta 周期，再把已验证的规则搬进 CLI，需要事务与回执时再升级，风险更小。

升级到 CLI 的触发条件建议为：脚本在两个以上真实功能上稳定运行，且出现需要原子写入或跨仓回执的需求。

## 12. 决策记录（待维护者签署）

| 编号 | 决策点 | 建议 | 决定 | 签署人 | 日期 |
|---|---|---|---|---|---|
| D-1 | 合并时点 | 交付验收之后、下一个 Delta 之前（第 5 节）；不在批准当刻，不预合并 |  |  |  |
| D-2 | 血缘存放 | 与 Spec 同目录的旁路 `.lineage.yaml`，追加不覆盖（第 7 节） |  |  |  |
| D-3 | 新基线是否需要新批准 | 需要；合并本身不延续批准，授权延续按现有规则判断（第 3、8 节） |  |  |  |
| D-4 | 批准 `basis` 内容 | 候选 Spec、Delta、diff 报告三类引用（第 8 节） |  |  |  |
| D-5 | 冲突策略 | 一律阻断，不自动消解（第 9 节） |  |  |  |
| D-6 | 落点（Q-006） | 脚本先行，达到升级条件后进 CLI（第 11 节） |  |  |  |
| D-7 | 导出清单增加 `parent_version` | 实现阶段做；本轮不改交接包格式（第 10 节） |  |  |  |

## 13. 验收对照（AC-018）

| AC-018 要求 | 本文位置 |
|---|---|
| 合并规则 | 第 6 节 |
| 版本血缘字段 | 第 7 节 |
| 冲突与回退处理 | 第 9 节 |
| 与 `spec-baseline.md` 现有不可变规则的关系 | 第 10 节 |
| 维护者签署决策记录 | 第 12 节，**待签署** |

## 14. 下一份实现合同应包含

- `scripts/merge-spec-delta` 的 `--plan` / `--apply` 行为与退出码；
- 血缘文件的 schema，以及 `verify-approval-record` 对三类 `basis` 的复核；
- 反例：ID 冲突、目标缺失、基线过期、引用断裂、叙述漂移、并发 Delta、重复合并字节不同；
- 与 `inspect-plan-spec diff` 的集成测试，覆盖 `partially-compared` 与 `unassessed`；
- 对一个真实既有 Spec 的试合并记录，作为升级到 CLI 的证据。

## 15. 风险与未决项

| 风险 | 影响 | 应对 |
|---|---|---|
| Spec 条目的结构化解析依赖 `plan-spec-v1` 的 ID 与章节提取，叙述章节没有 ID | 叙述改动难以机械核对 | 要求 Delta 显式给出替换文本；合并后叙述章节做字节对比（第 6 节） |
| 交付验收与 Delta 的“相关切片”列靠人工维护 | 到期判断可能漏切片 | 实现合同要求脚本读取 Delta 的切片列并核对每个切片的验收证据 |
| 多人并发起草 Delta | 频繁“基线过期” | 接受；顺序合并本来就是目的，冲突早暴露比晚暴露好 |
| 回退时下游已绑定被撤回版本 | 需要逐个重新验证 | 本设计不自动处理，只保证旧文件不被改写、绑定的摘要可追溯 |
