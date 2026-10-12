# AR-09 收口总结

状态：已收口（2026-10-12，维护者确认「5c 随 AR-11，AR-09 收口」）。
范围变更：原验收「删除对应的 Node 实现」缩为「入口薄壳 + 非交接调用方委托」；删除移交 AR-11。依据见 `architecture-iteration-v1-approval-adapter-design.md` §12。

## 1. 结果

| 项 | 结果 |
|---|---|
| 同名薄壳 | `scripts/verify-user-decision`（含 `--continuation`）、`scripts/verify-approval-record`：只翻译参数、透传 yss 的结论与退出码（失败退出码为 yss 的 1/2，旧 Node 一律 1） |
| Go 侧入口 | `evidence verify --kind user-decision`：`--from-record`、`--requirements` 可单项、返回已核验事项与延续标志；`--kind approval`：`--expected`、`--binding`（state/subject/bound-asset，可带冻结期望）、`--gate`，返回会签规则与算出的期望；校验可在模板源仓根运行；拒绝文案保留内部码 |
| 进程内委托 | `assertUserDecisionRequirement`、`validateApprovalRecord`、`validateApprovalRecordFile`、`assertApprovedGateHasValidApproval`（经 `assertCheckpointApprovals`、`assertStrategicWorkUnitDecision`）：条件满足时子进程调用 yss，否则走原进程内实现（过渡期两份实现并存） |
| 期望的来源 | `approvalExpectationFromState/FromSubject/ForBoundAsset`（及 `ForCheckpoint`）登记来源绑定，委托时 yss 按绑定重算并与冻结期望比对，保持「期望冻结」语义 |
| 等价回放 | `tests/go-validator-replay.test.mjs` 87 个：用户决定 17 组 ×（实例、模板源仓根）、适配层等价、批准记录 8 类、v2 与组合包 6 类、门禁状态 6 类、期望由 yss 计算 10 组、薄壳冒烟、委托判断 |
| 真实实例端到端 | 测试辅助 `tests/helpers/yss-instance.mjs`（现场 `yss init` 后按用例复制）；`decision-continuation`（16）、`approval-current`、`approval-consumption`、Plan→Spec 入口场景在真实实例上走委托 |
| 固定二进制 | `07b37d703e66a9f7a9db90c07497abde221f1838`（darwin 两次构建摘要相同） |

## 2. 委托条件（`nativeDelegationAvailable`）

能唯一定位 yss；根有 digital-human-roles、lifecycle-registry，且有 Profile 身份文件或为 template-source；引用都在根内（对根做 realpath）；调用方没有自带 read（`rootBoundRead` 标记的除外）、没有自带 rolesDoc/registry（`defaultAuthorities: true` 标记的除外）、未设 `native: false`。

## 3. 没有委托的入口及原因（留给 AR-11 与之后）

| 入口 | 原因 |
|---|---|
| `strategic-handoff.mjs` 的源批准校验（实测占回退 47%） | 传入交接包源的虚拟读取器、源包自带 rolesDoc、合成 registry；属 handoff 领域 |
| `user-decision-reuse.mjs`（战略决定复用，约 20%） | 同上，随交接域 |
| `delivery-preflight.mjs` | 传入经 `sourceApprovalPolicy` 变换后的政策，不是同根默认值 |
| Plan 聚合批准（`validatePlanApproval`、`plan-spec-entry`） | 依赖完整 checkpoint 与受控审查周期，Go 现有 `plan-aggregate` 路径尚未接入适配 |
| 三个 Profile 里各自的 `lifecycle-transition` 副本 | 与根不同的覆盖版本，仍是旧行为 |
| `spec-baseline`、`verification` 的命令行入口与回放 | `spec-baseline` 在 `handoff` 下另有入口；`verification` 未做回放 |
| 依赖合成根的测试（约 10 个文件） | 夹具多层构造，应复用已有 `nativeSeed` 或补 `root`，逐个迁，不是换一行根 |

## 4. 留给 AR-11 的删除清单

AR-11（handoff、context）迁完后一次性删除，并随模板版本发布删除规则；删除前提是下列调用方已委托或已迁出：

- Node 实现：`approval-record.mjs`、`approval-current.mjs`、`approval-consumption.mjs`、`approval-record-io.mjs`、`approval-checkpoint-discovery.mjs`、`user-decision.mjs`、`user-decision-reuse.mjs`、`decision-continuation.mjs`（`user-decision-core.mjs` 作为小型 IO 辅助保留）。
- 同时删除的适配层脚手架：`attachExpectationBinding`、`rootBoundRead`、`defaultAuthorities` 标记，以及进程内回退路径。
- 技能检索：删除前检索 `.agents/skills`、`profiles/**/.agents/skills`，确认不再引用上述实现（AC-010 按领域分次满足）。
- 删除规则：随该模板版本写入 yss 的迁移规则（FR-016，可拒绝的删除，沿用 AR-01 的 `keep-local`）。

## 5. 已知限制与差异

1. 拒绝文案：拒绝码一致，措辞在少数用例不同（决定依据变化的延续、组合包里 rejected 的行），测试里接受两种措辞。
2. 期望算出后主体被改动：进程内用冻结期望，委托时 yss 按绑定重算并比对冻结值，结果同为拒绝，部分用例拒绝码不同。
3. 并行写模板源仓根的测试可能因 Context 扫描目录变化偶发 `INPUT_DRIFT`；`--test-concurrency=1` 下不发生。
4. 每次委托一次子进程（约 0.15–0.3 秒）；`assertCheckpointApprovals` 逐门禁各一次。整份 checkpoint 一次委托留待 Go 重算期望随 AR-11 一起做。
5. 既有失败（本合同之前就存在，未处理）：`verification-selection` 的资格用例、`verification-execution` 的「显式legacy」用例、`plugin-design-consumption` 中需要 `YSS_PLUGIN_BINARY` 的用例、`plan-review-control` 的若干用例。

## 6. 版本与分支（均未推送）

- 根仓：分支链 `arch/ar-09` → `ar-09b` → `ar-09c` → `ar-09d` → `ar-09e` → `ar-09f` → `ar-09g` → `ar-09h`（本总结）。
- yss-cli：`arch/ar-09`（`545755a`）→ `ar-09b`（`79f2990`）→ `ar-09c`（`f367e44`）→ `ar-09f`（`07b37d7`，当前固定）。
- 检查点：`arch-ar-09`、`arch-ar-09b`、`arch-ar-09c`（均 L2，验证通过）。

## 7. 验证口径

每个分片只跑受影响范围：回放测试、受影响的 `.template-source/tooling/node/test` 与夹具、对应场景，以及计划选中的 fast 检查；未跑 `verify-template-fast` 全量。
