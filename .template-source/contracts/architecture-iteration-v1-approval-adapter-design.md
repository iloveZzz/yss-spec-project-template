# 批准记录族 Node→Go 适配层设计（AR-09c）

状态：设计；分片 1～4 已实现（见 §8～§11）。
前置：`architecture-iteration-v1-plan.md` 的 AR-09b 行（用户决定入口已委托）。

## 1. 要解决的问题

批准记录的校验在 Node 里被约 25 个调用方以「进程内函数」方式使用。它们的共同点：

1. 核心是 `assertCurrentApproval(record, expected, context)`：`record` 是待验记录，`expected` 是调用方**独立**算出的当前消费期望（边界、主体引用与摘要、批准范围、依据、起草者、实施者、审查上下文），`context` 提供 root、可选的 rolesDoc/registry。
2. `expected` 的来源有三种：调用方直接给出（`approvalExpectationForBoundAsset` 等，读取磁盘上的资产算出）、由 checkpoint 里的门禁状态推出（`approvalExpectationFromState`）、由正式审查任务推出（`approvalExpectedFromTask`）。
3. `record`、`checkpoint` 常常是尚未落盘的内存对象；它们引用的**证据资产**（主体、依据、用户决定、审查任务）已经在磁盘上。

Go 一侧的 `evidence verify --kind approval` 目前只支持上述来源里的后两种（`--checkpoint`、`--task`），第一种没有入口，这是适配层缺的那一块。

## 2. 关键发现：Go 内核已经有同一个核心

`kernel.AssertCurrentApprovalSemantic(s, record, expected)` 与 Node 的 `validateCurrentApproval` 逻辑逐段对应（签署人规则、v2 审查任务绑定、起草者独立性、摘要新鲜度、依据覆盖、用户决定复用），`kernel.ApprovalExpectationFromState` 对应 `approvalExpectationFromState`。缺的只是命令行入口把 `expected` 直接交给它。所以本设计**不新增校验语义**，只新增入口与返回字段。

## 3. 设计

### 3.1 Go：`--expected <文件>`

`yss evidence verify --kind approval --file <记录> --expected <期望文件> --require-approved`

- 期望文件是单个期望对象，或按 `boundary` 区分的数组（与 Node `expectedFor` 对 `options.expected` 的处理一致）；批准包按每个 gate 取对应一项。
- 与 `--checkpoint`、`--task` 互斥，同用返回 `APPROVAL_CONTEXT_REQUIRED`。
- 期望对象字段沿用 Node：`boundary`、`subject_ref`、`subject_digest`、`approval_scope`、`basis[]`、`drafter_principal_ref`、`implementer_principal_ref`、`subject_id`、`subject_version`、`review_package`、`review_context`。
- 不改变默认：不给 `--expected`、`--checkpoint`、`--task` 仍返回 `APPROVAL_CONTEXT_REQUIRED`（当前批准必须由独立消费者提供期望）。
- **返回**：`coverage.approval_validated` 行 `{gate_id, bucket, subject_ref, approval_scope, execution_authorization}`，对应 Node 返回的规则与主体信息。

### 3.2 Node：`nativeApprovalRecord`

放在 `scripts/lib/native-evidence.mjs`，与已有的 `nativeUserDecisionRequirement` 同一模式：

- 把内存里的记录与期望写到根下 `.work/native-candidates/<uuid>/`（用完即删），调用上面的命令；有 `options.checkpoint` 时同样写出候选 checkpoint 并传 `--checkpoint`（Plan 聚合批准走 Go 现有的 `plan-aggregate` 校验）。
- 委托条件与用户决定入口一致：能唯一定位 yss；根是完整治理根；引用都在根内（对根做 realpath）；调用方没有注入 rolesDoc/read/registry。不满足则走进程内实现（过渡期）。
- 失败时抛出带 yss 拒绝码的错误；成功返回与进程内同形的 `{bucket, subject_ref, approval_scope, execution_authorization}`。

### 3.3 期望的计算留在哪

分两步，不在本设计一次做完：

1. 先让 Node 继续算 `expected`（`approval-consumption.mjs`、`approvalExpectationFromState` 等约 160 行，读取磁盘资产），只把**判定**交给 Go。判定是风险最集中、逻辑最重的部分。
2. 期望的计算随后由 Go 提供（`ApprovalExpectationFromState` 已有，缺 `ForBoundAsset`/`ForCheckpoint`），Node 的这几个函数在最后一步随 Node 库一起删除。

## 4. 原型验证（已做）

yss-cli 分支 `arch/ar-09c` 加入 `--expected`（约 40 行，只接线，不含新校验逻辑）。在模板源仓根用合成夹具对比 Node 的 `validateApprovalRecord(record,{requireApproved,root,expected})` 与 Go 的 `--expected`，8 组结论与拒绝码全部一致：

| 场景 | Node | Go |
|---|---|---|
| 通过 | 通过 | 通过 |
| 审查人不是原回复者 | `APPROVAL_CURRENT_INVALID` | `APPROVAL_CURRENT_INVALID` |
| 起草者自签 | `APPROVAL_CURRENT_INVALID` | `APPROVAL_CURRENT_INVALID` |
| 期望范围不同 | `APPROVAL_CURRENT_INVALID` | `APPROVAL_CURRENT_INVALID` |
| 主体被改动 | `APPROVAL_CURRENT_INVALID` | `APPROVAL_CURRENT_INVALID` |
| 依据过期 | `APPROVAL_CURRENT_INVALID` | `APPROVAL_CURRENT_INVALID` |
| 缺少起草者来源 | `APPROVAL_CONTEXT_REQUIRED` | `APPROVAL_CONTEXT_REQUIRED` |
| 生物人门禁由数字人签 | `APPROVAL_CURRENT_INVALID` | `APPROVAL_CURRENT_INVALID` |

覆盖范围：v1 记录、非 Plan 聚合、无 review-bundle、无 v2 审查任务。**未验证**：v2 记录与审查任务、review-bundle、Plan 聚合批准、continuation 复用。这些必须在对应分片里逐类补回放后才能委托。

## 5. 已知差异与风险

1. **拒绝文本不同**：拒绝码一致，但文案不同。Node 把内部码拼进文案（如 `user-decision-responder-mismatch: …`），Go 只给文案。依赖文案正则的测试或调用方，委托后会失败；迁移时要么改为匹配拒绝码，要么让 Go 在文案里保留内部码。建议后者，范围小。
2. **`.md` 主体**：Node 的 `parseAsset` 接受正文为 JSON 的 `.md` 文件；Go 对 `.md` 要求 frontmatter。夹具里这样写的主体在 Go 下会报「审阅包身份或依据缺失」。真实资产是否有此写法需在分片 1 前扫描；有则以 Go 为准并修资产，不放宽 Go。
3. **合成根的测试**：很多测试在只有 `yss-project.yaml` 的合成目录里跑进程内校验，不能委托。退出过渡期要把这些测试改成现场 `yss init` 的实例；这是最后的删除阻塞项，量大，需单独估算。
4. **性能**：每次委托一次子进程，约 0.15–0.3 秒。`assertCheckpointApprovals` 会对每个已批准门禁各校验一次，一个 checkpoint 可能产生十几次调用。分片 3 里改为一次调用整份 checkpoint（`--checkpoint` 路径 Go 已支持逐门禁校验）。
5. **候选文件的并发与残留**：临时文件名含 pid 与 uuid，`finally` 删除；进程被杀可能残留在 `.work/native-candidates`，该目录加入忽略并由 `yss` 的现有清理规则覆盖，实现时确认。

## 6. 实现分片（每片独立可合并，均要求「等价回放」先于「改调用」）

| 片 | 内容 | 回放要补的类别 | 调用方 |
|---|---|---|---|
| 1 | Go `--expected` + 返回字段；Node `nativeApprovalRecord`；`validateApprovalRecord` 在 v1、非聚合时委托 | v1 记录、各拒绝路径（原型已覆盖 8 类，补入仓库测试） | `lifecycle-transition`、`strategic-handoff`、`business-ticket-lifecycle`、`lifecycle-readiness`、`approved-execution-context`、`delivery-preflight`、`existing-backend-architecture`、`backend-review`、`backend-scaffold-prerequisites`、`yss-stage-decision` 的两个脚本 |
| 2 | v2 记录与审查任务、review-bundle | v2 能力绑定、组合包 | 同上，含 `review-capabilities` 路径 |
| 3 | `assertCheckpointApprovals` / `assertApprovedGateHasValidApproval` 整份 checkpoint 委托（含 Plan 聚合） | 聚合批准、门禁多状态 | `verify-lifecycle-checkpoint`（四份）、`plan-spec-entry` |
| 4 | 期望的计算改由 Go 提供；`assertCurrentApproval`、`approvalExpectationFor*` 的调用方改传「门禁状态/资产」而非「期望」 | 期望计算对拍 | `lifecycle-controls`、`plan-spec-entry`、`business-ticket-lifecycle` 等 |
| 5 | 退出过渡期：合成根测试改为 `yss init` 实例；删除 Node 实现与对应删除规则；技能里不再引用被退役实现 | —— | 全部 |

## 7. 需要维护者确认

1. 拒绝文案差异按 §5.1 建议处理（Go 在文案里保留内部码）？
2. 分片 1 之前是否先扫描现有资产中「`.md` 主体但正文为 JSON」的用法（§5.2）？
3. 分片 5 的合成根测试迁移是否单独成包并先估算？

## 8. 分片 1 实现记录

- 维护者确认：拒绝文案由 Go 保留内部码；先扫描 `.md` 主体；合成根测试迁移单独成包并先估算。
- `.md` 主体扫描：仓库内只有 `tests/scenarios/verify-user-decision-scenarios.mjs` 的一处夹具把 JSON 写进 `subject.md`，真实资产没有；该夹具只在 Node 场景里用，未改动，新回放用 `.json` 主体。
- Go：`--expected`（`arch/ar-09c`）；批准拒绝文案保留 `user-decision-responder-mismatch`。**未加** §3.1 的 `coverage.approval_validated`：仓库内没有调用方使用 `validateApprovalRecord` / `assertCurrentApproval` 的返回值（唯一一处在传入 rolesDoc 的 `plan-spec-entry`，不委托），适配层自行返回 `{subject_ref, approval_scope, execution_authorization}`。
- Node：`nativeApprovalRecord`，`validateApprovalRecord` 在「v1、非 review-bundle、调用方给出显式期望、无 checkpoint、非 Plan 聚合、引用都在根内、无注入的 rolesDoc/read/registry」时委托。
- 回放：`tests/go-validator-replay.test.mjs` 增 8 组（进程内与委托的结论、拒绝码一致，内部码保留），共 64 个通过。

## 9. 分片 2 实现记录

- 范围：v2 记录（带 `review_task_ref`/`review_task_digest`，期望携带 `review_context`）与 review-bundle 组合包；仍要求调用方给出显式期望。`validateApprovalRecord` 放开 v1 限制，新增 `validateApprovalRecordFile` 的委托（已落盘的记录或组合包，逐行取期望，任何一行缺期望、含 Plan 聚合行、引用越出根或 v2 缺审查任务上下文都不委托）。
- Go 无需改动（`--expected` 数组按 boundary 取项已覆盖组合包；固定二进制仍是 `c03edea`）。
- 回放：在模板源仓根用真实注册表与角色政策生成待审包（`prepareReviewPackage`），批准后对拍进程内与委托，6 类（通过、仍 pending、审查人自签、期望范围与任务不符、任务摘要过期、主体被改动）× 组合包文件与单行记录，结论与拒绝码一致；除「审查人自签」在读取记录结构的进程内前置检查就被拒绝外，其余拒绝都经过委托。共 70 个通过。
- 影响范围测试：approval-current、review-capabilities、approval-consumption、lifecycle-progression、lifecycle-controls 共 94 个，以及生命周期转换场景，全部通过。

## 10. 分片 3 实现记录（缩小范围）

- 设计原定「整份 checkpoint 一次委托」。实现时改为在 `assertApprovedGateHasValidApproval`（`assertCheckpointApprovals` 与 `assertStrategicWorkUnitDecision` 都经过它）里，把由门禁状态算出的期望交给分片 1、2 已有的显式期望入口，并用 `--gate` 让组合包只取该门禁的行。原因：期望的计算分片 4 才迁移，整份 checkpoint 委托会让 Go 重算期望，与 Node 同时存在两套；逐门禁委托不改任何校验语义，只改判定的执行位置，且每个门禁各一次子进程的开销与进程内逐门禁校验同量级。
- `assertCheckpointApprovals` 向内传 `defaultAuthorities`：它自己加载的 rolesDoc/registry 只是同一根的默认值，不再因此拒绝委托；调用方自己传入的 rolesDoc/registry 仍然不委托。
- 不委托、仍在进程内：Plan 聚合批准、门禁检查（`assertGateChecks`）、自定义 rolesDoc/registry/read。
- 回放：门禁状态 6 类（通过、审查人非原回复者、起草者自签、状态范围与记录不同、主体被改动、依据过期），进程内与委托结论和拒绝码一致，拒绝都经过委托。回放测试共 76 个通过；影响范围测试（approval-current、digital-human-roles、lifecycle-controls、用户决定场景）通过。

## 11. 分片 4 实现记录

- 做法与 §6 略有不同：不让调用方改传「状态/资产」，而是让 Node 的三个期望构造函数（`approvalExpectationFromState`、`approvalExpectationFromSubject`、`approvalExpectationForBoundAsset`，`ForCheckpoint` 经由第一个）在算出期望时登记「它是怎么来的」（`attachExpectationBinding`，WeakMap 保存绑定与期望快照）。委托时若期望对象与登记时完全一致，就把绑定交给 yss（`--binding`，与 `--expected` 互斥），由 yss 自己计算期望并判定；调用方改过期望的任何字段则退回显式期望。调用方代码不用改。
- Go：`--binding`（模式 `state`、`subject`、`bound-asset`），新增 `ApprovalExpectationFromSubject`、`ApprovalExpectationForBoundAsset`，`FromState` 增加调用方 `review_package` 覆盖；算出的期望写入 `coverage.approval_expected`，供对拍。
- 对拍：三种来源 × （通过、审查人非原回复者、主体被改动）；通过时 yss 算出的期望与 Node 的期望在关键字段（边界、主体引用与摘要、范围、依据、起草者、审阅包标志）逐项一致。
- 已知差异：期望算出之后、校验之前主体被改动时，进程内用冻结期望报「摘要过期」，委托时 yss 按绑定在校验当下重算，报「缺少上下文」；两边都拒绝，码不同，已在测试中登记。
- 仍在 Node：这三个构造函数的实现还在（调用方仍要拿到期望对象，进程内路径也要用）。删除它们属于分片 5，与「调用方改为只传绑定」一起做。
- 影响范围测试：回放 86 个（含期望由 yss 计算 9 组与改动期望 1 组）、approval-current、approval-consumption、lifecycle-controls、digital-human-roles、review-capabilities、生命周期转换/用户决定/Plan→Spec 场景，全部通过。
