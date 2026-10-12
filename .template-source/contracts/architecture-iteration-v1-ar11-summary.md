# AR-11 进展（第 3 步：handoff、context）

状态：进行中。第一片（战略交接包校验）完成；其余入口与 AR-09 移交的删除清单未做。沿用口径：回放 → 薄壳/委托 → 最后统一删除；每片只在本机单平台验证，固定档攒几片再统一重建（维护者 2026-10-12 要求）。

## 1. 起点调研

- **context** 的 API 层早已迁移：`scripts/lib/native-context.mjs` 只是传输（定位 yss、拼 `context check` 参数、解码信封），语义归 yss。剩下的 Node 入口是 `verify-context-reconciliation` 与 `verify-strategic-context-import`。
- **handoff 的生产写入已经是 Go**：`scripts/fixtures/spec-baseline/package.mjs` 头注释写明「Synthetic protocol fixtures only. Production writes use native Go saved plans/transactions」；Node 的 `strategic-handoff.mjs`（618 行）里导出、导入、终结交付属于夹具与旧入口，校验类函数是 `sourceApproval`、`inspectSource`、`openBundle`、`openDelivery`。
- spec-baseline 场景（`scripts/fixtures/spec-baseline/scenarios.mjs`）早已有「Node 夹具生成包、native yss 校验」的对拍（`YSS_SPEC_BASELINE_NATIVE_CLI`），本机构建的 yss 下通过。

## 2. 第一片：战略交接包校验（`handoff verify --kind package`）

- 回放：`tests/go-validator-replay.test.mjs` 增 8 类：原包、载荷文件被改一个字节、清单列出的文件被删、包里多出清单没有的文件、清单 `bundle_digest` 被改、清单版本被改但摘要未更新、索引文件被改、缺清单。Node 的 `exportBundle` 生成包、`openBundle` 校验，对拍 yss 在真实 design 实例里的校验，结论全部一致；yss 对 ZIP 同样可校验。
- yss：`handoff verify --kind package` 在报告里返回 `coverage.handoff_package`（`bundle_id`、`version`、`bundle_digest`、`rules`、`scenarios`），能力令牌 `handoff.package-identity.v1`。
- Node：`scripts/strategic-handoff verify --bundle` 对**目录与 ZIP 包**委托给 yss，输出与旧实现同形；`delivery-record.json` 交付目录和旧版 yss 仍走进程内实现（缺令牌退回）。薄壳对根外的包先复制到根下临时目录再校验（目录也支持）。
- 验证：回放、`verify-strategic-handoff-package-scenarios`（16）、`verify-delivery-preflight-scenarios` 通过；在模板源仓根与 design 实例都可校验。

## 3. 待做

| 入口 | 现状 |
|---|---|
| `verify-strategic-handoff-consumption` ↔ `handoff verify --kind consumption` | **已做（§4）** |
| `spec-baseline verify --bundle` | **已做（§5）**；`--checkpoint` 绑定校验仍在 Node（yss 的 `--file <receipt> --checkpoint` 语义不同） |
| `verify-context-reconciliation` | **已做（§5）**：公开为 `evidence verify --kind context-reconciliation` |
| `verify-strategic-context-import` | 无对应的公开 Go 命令（交接 YAML 对目标 Context 与对账的导入前检查，yss 在 `handoff import` 计划内部做同类检查）；需决定退役还是公开，未做 |
| `strategic-handoff.mjs` 的 `sourceApproval`（约占 approval/user-decision 进程内回退的 47%）、`user-decision-reuse`（约 20%） | 它们是 AR-09 删除清单的前置，需随 consumption 对拍一起迁 |
| AR-09 移交的删除（approval/user-decision 的 Node 实现与删除规则） | 以上迁完后一次性删除 |

## 4. 第二片：战略交接消费（`handoff verify --kind consumption`）

- 对拍方法：Node 夹具导出交接包，导入**真实 backend 实例**（`makeRoot` 增 profile 参数），生成战术合同与目标对账，再让 Node 的 `verifyConsumption` 与 yss 各校验一次。
- 发现并修掉的差异：
  1. yss 的消费校验只给通过/拒绝，Node 报告里有 `issues`（每条 `source_id` + `reason`：`missing-mapping`、`stale-source`、`deferred`、`pending/conflict`、`removed-or-unknown-source`、`business-rule-scenario-dependency-incomplete`、`business-ticket-stale`、`deferred-scope-stale`、`upstream-asset-stale`、`upstream-design-stale`）、`block_all`、`blocked_slice_refs`、`coverage_complete`、`scope` 与各摘要。yss 现在按同样的规则（依赖未知或未声明阻断整个消费者，否则只阻断依赖它的切片）记录并在 `coverage.handoff_consumption` 返回同形报告，摘要逐字节一致。
  2. 命令行层 `handoff verify --kind consumption` 没有暴露 `--slice`（语义层有），现已暴露。
  3. yss 要求合同有 `schema_version`（1 或 2），Node 对未写版本的战术合同放行；对拍用例补 `schema_version: 1`，这是已知保留差异（实际由 yss-tactical-design 生成的合同带版本）。
- 回放 10 类（通过、延期阻断依赖切片、延期不阻断无关切片、未知依赖扩大阻断、缺承接行、来源摘要过期、承接行指向不存在的来源、战术落点悬空、非 approved 合同、重复承接）：Node 返回报告的用例与 yss 报告逐字段深度相等（含 `tactical_digest`），Node 抛错的用例 yss 同样拒绝。
- 委托：`scripts/verify-strategic-handoff-consumption` 对旧 yss 退回进程内实现，其余委托，输出键顺序与旧实现一致；进程内 `verifyConsumption`（`frontend-delivery` 等调用方）在真实项目根且 yss 具备能力 `handoff.consumption-report.v1` 时委托，4 类等价对拍（含 `native:false` 为进程内）一致。
- 意义：委托后，战略交接消费不再经过 Node 的 `openBundle` → `assertImportReceipt` → `sourceApproval` 链，这条链正是 approval/user-decision 进程内回退的最大来源（见 AR-09 总结 §3）。仍待迁的是这条链上其余的使用者（交接导入、`delivery-preflight`、`user-decision-reuse` 的其他调用点）。

## 5. 第三片：spec-baseline 包校验与 Context 对账

- **spec-baseline `--bundle`**：`handoff verify --kind spec-baseline --package` 在报告里返回 `coverage.spec_baseline_package`（`baseline_id`、`version`、`bundle_digest`），能力令牌 `handoff.spec-baseline-package.v1`；`scripts/spec-baseline verify --bundle` 委托给 yss。对拍：用 spec-baseline 场景在 native 模式下由 yss 导出的真实基线包，委托输出与进程内实现逐字节相同；被篡改的包两边都拒绝（措辞不同）。该场景本身（`YSS_SPEC_BASELINE_NATIVE_CLI`）早已把 Node 夹具与 yss 校验对拍，所以没有再造一份回放。`--checkpoint` 绑定模式留在 Node。
- **Context 对账**：公开 `evidence verify --kind context-reconciliation`（能力令牌 `evidence.context-reconciliation.v1`），回放 10 类（已对账、blocked 且有未解决术语、project-instance 但 pending、reconciled 却有未解决术语、变更不存在的术语、同一术语跨分类重复、证据不存在、快照摘要不一致、仓库身份矛盾、缺必填字段）与 Node 结论一致，且基线必须通过、拒绝原因不能是「找不到文件」（早期版本的用例因相对路径对 Node 无效而恒真，已修正）。`scripts/verify-context-reconciliation` 的普通校验委托给 yss；`--validation-dependencies`（内部依赖清单模式）、旧版 yss、合成根仍走进程内实现。进程内 `verifyConsumption` 的回退路径固定用依赖清单模式调用该脚本，不受薄壳影响。
- 误操作记录：中途不小心在共享仓库里执行了裸 `git stash`，立即用该条目的哈希 `git stash apply` 恢复并只删除自己的那一条，其他会话的 stash 条目未动。
