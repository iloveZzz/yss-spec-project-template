# AR-10 进展：task、checkpoint 已完成，slice 待决定

状态：task、checkpoint 的校验入口已换成 yss 薄壳（§4、§6）；slice 停在输出形态决定点（§3）。沿用 AR-09 的口径：删除 Node 实现与删除规则随 AR-11，本包做回放、薄壳和委托。

## 1. 已完成：task（`contract verify --kind task`）

- 回放：`tests/go-validator-replay.test.mjs` 增 7 类任务包（通过含目录条目、无尾斜杠、角色未覆盖阶段、写路径绝对、缺目标、未知工作单元、合同引用不可读）对拍 Node 的 `validateTaskPackage` 与 yss，结论一致；薄壳冒烟 1 个。回放共 103 个通过（含 pin 测试）。
- 发现并修掉的 Go/Node 差异（即 Q-004 的一例）：Node 生成的任务包把写范围写成目录前缀 `docs/.scratch/`（尾部 `/`），yss 把尾部空段判为非法路径，所以会拒绝 Node 自己生成的每一个任务包。yss 现在允许**单个**尾部 `/`，其余仍按可移植项目相对路径校验（`taskSafePath`）。
- 有意保留的差异：写范围里的通配符 `docs/**`——Node 的路径检查碰巧放行（把 `**` 当作目录名），yss 拒绝；仓库内没有任何生产代码在任务包写范围里写 `**`，不是支持的写法，不为此放宽 yss。
- 薄壳：`scripts/verify-digital-human-task-package` 只翻译参数、透传 yss 的结论与退出码（失败退出码为 yss 的 1/2）；根固定为脚本所在仓根，任务包路径必须在根内。已有调用方（`project-governance`、`asset-transactions`、`lifecycle-status`、分发冒烟）都在项目根内调用。
- 任务包全生命周期压力场景（含 CLI 一支）在新固定二进制下通过。
- 固定二进制：yss-cli `d25928e091fef78f6641b3994b4f5d011e68492c`（darwin 两次构建摘要相同）。

## 2. 未做：进程内委托

`validateTaskPackage` 在 Node 里有约 30 个调用点，传入 registry、runDir、`checkpointRef` 等多种注入，且包内会触发 `assertTrackingEntry`、`assertProgressionEntry`、`assertPlanSpecEntry` 等。按 AR-09 的做法需要再做一轮「调用方分类 → 标记默认等价注入 → 补回放」。本包没有做，原因是 task 的命令行入口已经覆盖了主要的生产调用（`project-governance` 的任务包检查、事务前后的资产检查）；进程内委托留给需要时再做，不阻塞 AR-11。

## 3. 停在决定点：slice 与 checkpoint

### slice
- `scripts/slice-contract verify` 并不等价于 `yss contract verify --kind slice`：前者是**执行前检查**（`inspectSliceContract`，约 47 行，输出含 `checks`、`blockers`、`approval` 的结构化报告，调用方读取 `report.blockers`）；后者是对合同本身的**语义校验**（信封里的诊断）。
- `slice-contract` 的 `prepare`、`migrate`、`view`、`diff` 属于工作流工具，计划规定留在 Node。
- 要薄壳化 `verify`，需要先定：yss 是否提供与 Node 报告同形的「执行前检查」输出，还是 Node 保留 `inspect` 的报告拼装、只把其中的合同语义判定交给 yss。

### checkpoint
- `scripts/verify-lifecycle-checkpoint` 是约 12 个 Node 子校验的组合：schema、阶段边界、业务票、业务批准依据、执行范围、阶段追踪、批准（已委托）、Plan checkpoint、用户决定（已委托）、context 对账。
- yss 的 `lifecycle verify --checkpoint` 是否覆盖同一集合、结论是否一致，还没有量过；夹具来自 stage-tracking、lifecycle-progression、plan 夹具，每类要单独构造，成本高于 task。
- 其中 Node 独有的校验（Q-004 提到的 context 对账、业务票与阶段追踪细节）补进 Go 的工作量需要先量。

### 建议
先对 checkpoint 做一次「对拍量测」（复用现有 stage-tracking、lifecycle-progression 夹具生成真实 checkpoint，用 Node 与 yss 各校验一次，只统计结论一致率与不一致类别，不改任何入口），再决定补 Go 还是缩范围；slice 先定输出形态。两者都需要维护者拍板，不适合我自行选择。

## 4. checkpoint 对拍量测结果（已固化为回放测试）

- 方法：在真实实例里用 `yss stage plan/apply` 生成带阶段跟踪的 checkpoint（`stage_tracking`、`feature_id`、路径登记），同一批变体分别交给**实例自带的** `scripts/verify-lifecycle-checkpoint`（Node）与 `yss lifecycle verify --checkpoint`，只比通过/拒绝。回放测试 20 类全部一致：原样、mode/status 变化、完成与会签前缺对账、blocked、下一工作单元未登记/为空/缺 Plan 审阅包/缺业务票、阶段与 trace 不一致、边界决定、缺 gates、引用不存在的用户决定、仓库身份矛盾、多余字段、schema 版本。量测阶段用了 37 类，同样全部一致。
- 关键前置：没有阶段跟踪的 checkpoint 两边都会在「跟踪」上拒绝；要比较其余语义必须先让 checkpoint 是已登记、已跟踪的。唯一一次差异出现在未跟踪的 `next_work_unit: null`（Node 放行，yss 要求功能身份与路径一致），在已跟踪的 checkpoint 上不存在。这条差异意味着：yss 对**所有**checkpoint 要求登记的功能身份，Node 在不需要跟踪时不要求。
- 覆盖缺口（未量）：已批准门禁与其批准记录（批准路径已委托，但整份 checkpoint 带批准的场景未对拍）、Plan 聚合、业务票与已通过业务审查的组合、执行范围终点（`loadExecutionScope`）、`--history`。
- 薄壳化 `verify-lifecycle-checkpoint` 的代价：有 6 个测试在模板源仓根用合成的 project-instance checkpoint 跑这个 Node 脚本（`checkpoint-boundary`、`project-ci`、`flow-verification-routing`、`verify-lifecycle-operator-scenarios`、`verify-maintenance-risk-scenarios`、`lifecycle-status-feedback`），换成 yss 薄壳后它们在模板源仓根会因仓库身份矛盾失败，需要像 5b 那样迁到真实实例根。

## 5. 建议

- checkpoint：对拍一致率足够，建议换薄壳并把上述 6 个测试迁到真实实例；先补一轮「带批准门禁」的对拍再换。
- slice：先定输出形态（见 §3）。

## 6. checkpoint 薄壳完成（按 §5 建议执行）

- 补对拍：带已批准门禁的 checkpoint（`gate.spec-baseline-approved`，门禁状态、v1 批准记录、用户决定、主体与依据全落在实例内）8 类（有效、审查人自签、会签角色不对、主体被改、依据被改、状态范围与记录不同、缺批准引用、批准引用不存在），含对基线夹具本身必须通过的断言，结论一致；旧实例（tracker 无 `lifecycle_tracking_version`）的未跟踪 checkpoint 7 类，结论一致。checkpoint 回放共 35 类。
- 对拍中发现并修掉的 Go/Node 差异（yss-cli `40926d1`）：
  1. 旧实例的未跟踪 checkpoint：Node 不要求功能身份，yss 一律要求路径与 `feature_id` 一致，会拒绝旧实例的 checkpoint。现在没有 `feature_id` 也没有 `stage_tracking` 时不要求（任一出现仍须与登记一致）。
  2. 没有消费上下文时的顺序：Node 先核验会签身份与规则（否决、角色）再要求期望，yss 先要求期望，导致维护反例里「生物人否决」被报成「缺少上下文」。现在先核验会签再要求上下文。
  3. 拒绝原因合并成一句：yss 把「非会签门禁、decision 不是 approved、被生物人否决」合并成同一条文案；现在分开，措辞与 Node 一致。
- 薄壳：`scripts/verify-lifecycle-checkpoint [--history]`；yss 只读项目根内路径，输入在根外时（如维护反例生成器把输入写在仓外）薄壳先把文件复制到根下临时目录再校验、用完即删，对 `verify-lifecycle-checkpoint`、`verify-approval-record`、`verify-user-decision`、`verify-digital-human-task-package` 四个薄壳都生效。
- **这顺带修了一处 AR-09 遗留的回归**：AR-09 把 `verify-approval-record` 换成薄壳后，维护反例生成器（`tests/scenarios/verify-maintenance-risk-scenarios.mjs`）因输入在仓外而失败，当时没跑到它。现已修复并在新固定二进制下生成成功；生成器里对 checkpoint 反例的期望诊断改为 yss 的措辞（`missing properties 'source_ref'`）。
- 迁移的测试：`tests/checkpoint-boundary.test.mjs` 改在真实实例里运行并按旧实例未启用追踪处理；`tests/project-ci.test.mjs` 不用改（修好后 15 个通过）；`flow-verification-routing`、`lifecycle-status-feedback`、`verify-lifecycle-operator-scenarios` 本来就通过。
- 仍未覆盖：Plan 聚合、业务票通过审查的组合、执行范围终点（`loadExecutionScope`）、`--history` 与 yss 的对拍。
- 固定二进制：`40926d1542a2537ae74278c5c56169049268f13d`（四个平台已重建、固定档已更新）。**从下一片起按维护者新要求：每片只在本机验证，攒几片再统一重建并更新固定档。**

## 7. 能力协商（实测暴露的健壮性问题）

- 问题：着手 slice 时在一个没设置 `YSS_NATIVE_BINARY` 的环境里跑夹具，进程内委托去调用了 PATH 上**较旧的 yss**，它不认识 `--binding`，返回 `ARGUMENT`，委托把它当成校验失败抛出——旧版 yss 加新版脚本会让原本通过的校验失败。这违反「实例不强制升级」（FR-016）。
- 修复：yss 的 `capabilities --json` 新增 `nodeDelegation` 能力令牌列表（`user-decision.from-record.v1`、`user-decision.requirements-object.v1`、`user-decision.validated-rows.v1`、`approval.expected.v1`、`approval.binding.v1`、`approval.rule-rows.v1`、`task.directory-write-scope.v1`、`lifecycle.legacy-untracked-checkpoint.v1`、`template-source.verify-root.v1`）。Node 每个委托路径声明所需令牌（`NEEDS`），进程内入口缺令牌时**退回 Node 实现**，命令行薄壳缺令牌时给出「当前 yss 缺少能力…请升级 yss」。结果按二进制缓存，每个进程最多查询一次。
- 回放测试新增能力协商用例（用只声明一个令牌的桩 yss 验证：缺令牌不委托、薄壳提示升级、齐全时放行）。
- 以后新增委托路径必须同时新增令牌与 `NEEDS` 条目。
- 本片按维护者新要求只在本机构建验证（固定档未更新，仍指向 `40926d1`，不含 `nodeDelegation`）。**统一重建固定档之前，固定二进制下委托路径不会生效（缺令牌→退回 Node）**，统一重建时必须一并更新。

## 8. slice：维护者选了「yss 提供同形的执行前检查输出」，量过后建议随 AR-12 做

维护者在 §3 的两个选项里选了第一个（yss 输出与 Node `slice-contract verify` 同形的报告）。动手前量了范围：

- 报告形状：`{read_only, ref/id/version/digest, checks:{readable, structure, approval, freshness}, approval_validity, execution_allowed, blockers[]}`，调用方读取 `blockers`。
- 结构部分（可读性、`slice_contract_required` 必填字段、三个 `required_skills`、工作单元与合同的 id/version 一致、`primary_skill`）：yss 已有 `loadNativeSlice` 做规范化，补一个必填字段检查即可，量小。
- **批准与新鲜度部分是大头**：`blockers` 的内容来自 `evaluateContractFreshness`（`implementation-contract-compiler.mjs`，Node 独有）与 `createApprovedExecutionContext`（`approved-execution-context.mjs`，167 行），原因码至少包括 `registry-digest-changed`、`compiler-contract-digest-changed`、`technical-design-stale-or-unavailable`、`frontend-delivery-stale-or-unavailable`、`architecture-identity-invalid`、`architecture-identity-digest-changed`、`architecture-evidence-stale-or-unavailable`、`component-binding-drift` 等。这些依赖后端架构证据与前端交付证据，正是 AR-12（backend、frontend 的校验部分）要迁的内容。
- yss 现有的 slice 校验要求必须带批准引用（无批准引用返回 `SLICE_APPROVAL_REQUIRED`），而 Node 的检查没有批准引用时仍给出结构报告，两者的前置条件也不同。

结论：结构部分现在能做，但有批准引用的真实用法占绝大多数，只做结构部分得到的是半个入口；完整做需要先迁新鲜度原因码，与 AR-12 的后端/前端架构证据校验重叠。建议 slice 的 `verify` 并入 AR-12，输出形态按维护者的选择（yss 输出同形报告）实现；AR-10 在此收口（task、checkpoint 完成，slice 移交 AR-12）。需要维护者确认这一调整。
