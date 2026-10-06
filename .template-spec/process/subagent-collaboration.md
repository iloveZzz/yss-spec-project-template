# Subagent 协作规则

Subagent 和其它运行时实例只接收边界清晰的任务包。主控数字人负责仓库身份、门禁计算、Ticket 状态、Git checkpoint 和完成结论。数字人角色、`runtime_id` 与 Explorer / Drafter / Worker / Reviewer / Verifier 执行态正交，任务包必须同时写明。

写入范围不得与其他执行者重叠；实现者不得同时担任同一切片的独立审查者，也不得会签自己起草的资产。写隔离以任务包为准。某运行时若共享磁盘或会话，不得把不同实例当成安全边界。

## 任务包

凡主控向数字人角色或独立运行时正式派发生命周期工作单元，都必须使用 `.template-spec/process/schemas/digital-human-task-package.schema.json` 定义的任务包，并写明 `task_id`、`work_unit_id`、`actor_id`、数字人角色 ID、`runtime_id`、执行态、工作流状态、从 `.template-spec/agents/digital-human-roles.yaml` 复制的 `core_skills` / `forbidden_skills`（可用 `taskPackageDefaults`）、合同类型和版本、输入资产、目标、允许写路径、禁止事项、验收标准、验证命令及其实际退出码 / 执行时间 / 证据引用、下游消费者和汇合方式。`slice-implementation` 才额外绑定 Slice Implementation Contract；禁止手写第二套技能包；任务包由 `scripts/verify-digital-human-task-package` 校验，`scripts/verify-subagent-task-package` 仅为兼容入口。

正式任务仍用 schema v1；Reviewer / Verifier 专业审查任务增加 `review_context`，绑定检查、所需能力、当前候选、当前策略、批准范围、依据摘要和相互独立的审查 / 起草主体。能力定义及补充只读技能只由角色表 `review_capabilities` 和检查策略编译为 `skill_source.review_skills`；不更改角色 `core_skills` / `forbidden_skills`，也不授予实施权限。缺能力、未声明当前上下文或身份相同即阻断，不能只换职称补足独立性。

主控按阻塞原因推进：专业等待先自主派发或检查原任务并等待，验证失败修复或路由；未知影响先调查，只有真实决定或新授权缺失才展示可审阅资产后询问。等待期间继续无依赖的已授权工作，不因需要专业审查或即将提出完成结论结束整条编排链。

## 汇合

返回结果必须符合 `workflow-execution-result-v1`，至少包括 `work_unit`、`workflow_reference`、`result`、`skill`、`changed_files` / `changed_artifacts`、`evidence_refs`、实际验证结果、`deferred_seams`、`drift`、`violation`、`new_impacts`、`stale_candidates`、`blocking_signals` 和 `next_route`。主控必须重新执行 fresh verification，并在集中 checkpoint 中保留阶段因果。会签写入 `docs/.scratch/<feature>/gates/<gate-id>-approval.yaml`（形状见 `.template-spec/templates/approval-record-template.yaml`），不能用聊天表情代替。恢复前校验 `scripts/verify-approval-record --require-approved --checkpoint <current checkpoint>`，期望上下文来自消费者，不复制待验记录来证明当前性。

新会签与组合审查使用 schema v2，绑定当前 `review_task_ref/digest`、`capability_ids` 和 `basis`；组合内保留逐项主体、范围、依据和结论。历史记录只读保留，`--history` 不授予当前放行；旧消费者拒绝 v2 后升级，不降级绕过。首轮完整覆盖适用检查，修复后按差异影响定向复审，复用项说明未受影响依据，并将全部消费结论重新绑定当前候选。摘要变化、UI 或 `new_impacts` 不构成全轴默认复审理由，未知先调查。

## 只读分诊任务包 v2

schema v1 及三种正式合同继续执行原规则。v2 仅用于 `read-only-intake`：`Explorer`、注册表已有 `work-unit.entry-triage` 或专职 Profile 的 `work-unit.harness-entry`、`allowed_write_paths: []`，不带 checkpoint、Slice 或正式审查合同。研究完成只回传来源和结论，不更新阶段、Ticket、批准或 `next_route`；写正式资产前由主控重新分析影响并生成正式任务包。旧消费者必须拒绝 v2 并升级，禁止改写为 v1 绕过边界。

`prepare-read-only-intake --input <选择.yaml> --output <仓库外/task.json>` 从角色默认值生成任务包；输入沿用任务 ID、角色、运行时、分诊入口、合同 ID/版本/来源、输入、目标、禁止事项、预期输出、下游消费者和汇合字段。`run-read-only-intake --task <task.json> --run-dir <仓库外新目录> [--timeout-ms <毫秒>] -- <命令> <参数>` 保存观测与日志；不传命令时明确未执行验证。复核使用 `verify-digital-human-task-package <run-dir/task-result.json> --run-dir <绝对目录>`。

运行证据使用 `run:` 相对引用，禁止绝对路径、`..` 与符号链接逃逸。命令、退出码、时间、stdout/stderr 与摘要必须一致；源码引用不能冒充运行日志。派发器观察 Git 跟踪、未跟踪及忽略文件的新增、删除、修改及已初始化子仓，结果中的空变更声明不能覆盖实际差异。未初始化子仓阻断观测。此工具是合同与结果审计，不是 OS 沙箱：执行期间改后恢复及可信派发器证据被恶意同步伪造不在终态观测能力内；运行目录应由派发器持有，不扩大 Agent 仓库写权限，运行时仍须采用只读权限。恢复后重新观察，不能直接复用旧完成状态。

同一次派发可在内存中复用文件摘要：每次重新枚举文件、Git HEAD / index 和子仓，只有设备、inode、权限、大小及纳秒级修改 / 状态变更 / 创建时间均未变化时才复用；新文件和变化文件重新读取字节，首次读取期间变化即阻断。不持久化摘要 memo，不缓存验证结论；独立复核与恢复重新读取全部字节。快照格式和观察范围保持不变，运行记录另列实际摘要读取与复用数量。文件系统元数据不可靠时，`run-read-only-intake --fresh-inputs` 使用完整字节观测。
