# AR-10 进展：task 已完成，slice 与 checkpoint 待决定

状态：task 校验入口完成；slice、checkpoint 经调研后停在决定点（见 §3）。沿用 AR-09 的口径：删除 Node 实现与删除规则随 AR-11，本包做回放、薄壳和委托。

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
