# AR-10 进展：task 已完成，checkpoint 已量测，slice 待决定

状态：task 校验入口完成；checkpoint 完成对拍量测并固化为回放（§4），薄壳待决定；slice 停在输出形态决定点（§3）。沿用 AR-09 的口径：删除 Node 实现与删除规则随 AR-11，本包做回放、薄壳和委托。

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
