# 执行与按需协作

新 identity2/Profile3/policy2 默认一个 Agent 连续完成技术工作并诚实自检。职责、Skill、检查和执行态不等于岗位、数字人或 Agent 数量；不预注册角色、运行时或固定审批人。用户明确要求或实际能力缺口才协作，复用已有任务、结果和授权，避免重复派发已完成工作。

独立复核只由当前明确用户或已知外部要求触发。核验不同真实上下文/执行轨迹、同一冻结候选和范围，复核期间只读。相同账号可有独立上下文；同一会话换名称不能独立。协作者允许写路径互不重叠，工具共享目录不构成安全沙箱。默认自检不能冒充独立或指定真人审批；必要来源不可核验只阻断依赖动作。

## 当前任务

普通任务复用同一 Ticket/PR，保存目标、AC、工程基线、范围、Skills、实际命令/结果、适用复核与回滚；不为了单执行者创建正式任务包或 checkpoint。无稳定 Agent/session ID 时记录原因和实际 tool/task/execution 引用，不伪造 ID。只读调查不创建 Ticket、批准或回归任务。

正式派发使用现有任务 Schema 的 task3 分支：work_unit_id、profile、policy、执行态、具体目标/验收、冻结 inputs/input_bindings、真实 baseline、provenance、允许写路径、禁止事项、预期产物/证据、验证命令、汇合与下游。`generateTaskPackageDefaults(undefined, overrides, {root})` 从当前工作单元和影响向 Go 查询 Skills/检查与实际 Git 基线；overrides 提供真实来源和明确范围，构造器不编造执行事实。Drafter/Explorer 的 expected_outputs 必须是派发前冻结的具体产出文件路径；描述放 objective/acceptance。Reviewer/Verifier 的候选来自实际完成实施任务；Worker 继续消费批准且当前的 Slice4。

所有派发/持久化仍通过现有 writer guard 和原生 task 校验；模板与版本号本身不授予写入。准备期可先形成 Plan、Spec、必要设计、AC 和明确范围，保持 draft，不生成真人批准、就绪或实现资格。首次正式完成/实施前集中确认已经形成的方案，见用户决定协议。真实结果才填执行时间、退出码、当前候选与可读日志，not-run 或失败不能填 passed。

## 汇合与恢复

正式结果继续使用 workflow-execution-result-v1，保留实际变化、证据、命令及退出码、deferred_seams、drift、violation、new_impacts、stale_candidates、blocking_signals、next_route。检查 actual candidate、当前输入、当前范围与完整来源，不以总体 completed 掩盖逐项失败。新 approval3/review-bundle3 使用实际 review/provenance/check_ids/policy 和原字节依据，按检查逐项保留结论，不再复制角色能力表。

恢复先查看原任务和真实运行结果，复用仍有效证据；修复或输入变化只重验受影响结论和依赖。真正缺用户决定时先形成可审阅资产再询问。未授权 Git/发布/外部副作用分别停止；交付技术终点不授权整体业务验收或发布。

## 历史兼容

identity1/Profile1–2 的 task1/2、approval1/2、角色及 runtime 规则按原政策只读核验。不得按新单执行者政策解释旧批准，不降版本绕过，也不把旧记录改成新批准。新任务或阶段写入先显式迁移，旧批准、Receipt、ID 和用户字节保持不变。模板源维护仍消费其明确的维护合同，不能借产品任务生成资产。

以下 v2 分诊工具是历史读取/审计协议；当前只读咨询不要求创建任务包。

## 只读分诊任务包 v2

schema v1 及三种正式合同继续执行原规则。v2 仅用于 `read-only-intake`：`Explorer`、注册表已有 `work-unit.entry-triage` 或专职 Profile 的 `work-unit.harness-entry`、`allowed_write_paths: []`，不带 checkpoint、Slice 或正式审查合同。研究完成只回传来源和结论，不更新阶段、Ticket、批准或 `next_route`；写正式资产前由主控重新分析影响并生成正式任务包。旧消费者必须拒绝 v2 并升级，禁止改写为 v1 绕过边界。

`prepare-read-only-intake --input <选择.yaml> --output <仓库外/task.json>` 从角色默认值生成任务包；输入沿用任务 ID、角色、运行时、分诊入口、合同 ID/版本/来源、输入、目标、禁止事项、预期输出、下游消费者和汇合字段。`run-read-only-intake --task <task.json> --run-dir <仓库外新目录> [--timeout-ms <毫秒>] -- <命令> <参数>` 保存观测与日志；不传命令时明确未执行验证。复核使用 `verify-digital-human-task-package <run-dir/task-result.json> --run-dir <绝对目录>`。

运行证据使用 `run:` 相对引用，禁止绝对路径、`..` 与符号链接逃逸。命令、退出码、时间、stdout/stderr 与摘要必须一致；源码引用不能冒充运行日志。派发器观察 Git 跟踪、未跟踪及忽略文件的新增、删除、修改及已初始化子仓，结果中的空变更声明不能覆盖实际差异。未初始化子仓阻断观测。此工具是合同与结果审计，不是 OS 沙箱：执行期间改后恢复及可信派发器证据被恶意同步伪造不在终态观测能力内；运行目录应由派发器持有，不扩大 Agent 仓库写权限，运行时仍须采用只读权限。恢复后重新观察，不能直接复用旧完成状态。

同一次派发可在内存中复用文件摘要：每次重新枚举文件、Git HEAD / index 和子仓，只有设备、inode、权限、大小及纳秒级修改 / 状态变更 / 创建时间均未变化时才复用；新文件和变化文件重新读取字节，首次读取期间变化即阻断。不持久化摘要 memo，不缓存验证结论；独立复核与恢复重新读取全部字节。快照格式和观察范围保持不变，运行记录另列实际摘要读取与复用数量。文件系统元数据不可靠时，`run-read-only-intake --fresh-inputs` 使用完整字节观测。
