---
name: implement
description: 按用户明确的开发、修复或 Spec/Ticket 实现请求完成单仓或跨仓研发；只读分析、规格确认与准备交接不自动转实现。
---

首次研发写入及委派写入前，按 [写入前核对](references/repository-scope.md#写入前核对) 核对本次采用的确认和目标 Git 信息。续办时如输入或目标改变，重新核对受影响部分。

Implement the user's goal in the authorized repository or repositories using the current request, spec or tickets. Read the relevant code, map the accepted behavior to concrete changes and finish the affected callers and configuration. A direct engineering request can proceed without a ticket; a small task does not need a tracking item first.

This shared entry handles the engineering request's source and scope, repository coordination, resumption and result reporting. Select specialist skills by the actual target repository's rules, technology and available capabilities. For frontend implementation, use available `yss-frontend-application` for design fidelity, interaction, Vue, API integration and verification. Backend targets retain their own `implement` override and specialist skills where available. The current host profile neither determines the writable target nor grants authorization; missing Backend skills in a Frontend installation do not prevent supported frontend work.

When accepting or resuming work from a Ticket URL, number or existing tracker item, organizing an explicit request for complex engineering work, or coordinating cross-repository integration, environment delivery or runtime feedback, read `.template-spec/agents/issue-tracker-operations.md` from the project root. Use its shared method to locate the actual item, read current content and relationships, reconcile changes and act within the authorization for each operation. Ticket means a work item; an Issue is one way to carry it. Refer to the actual title with its link, and continue independent work supported by available inputs when access is incomplete.

Keep the observable goal, actual repository and paths, interface dependencies, acceptance and applicable skills in the existing task. Business rules stay in their original source: a source file remains authoritative, and an Issue body is authoritative only when the Issue is itself the source. When using a tracker, keep current execution status there and link the actual engineering results without creating a parallel rule set, status ledger or implementation contract.

接续已登记 Spec 的研发、日常终端任务、工作台作业及 PR/MR/CI 进展时，按项目根读取 `.template-spec/agents/workbench-progress.md`。沿用同一 dataDir、specId、实际 Spec 摘要及目标版本，关联真实参与工程、采用版本和原验收，报告实际阶段证据。按本次本地实现、合并或环境验证目标完成，关键需求、业务验收及最终交付沿用户实际确认接续。仅工作台同步能力缺失且写入条件已齐备时，继续原授权研发并在原任务注明工作台待同步。

For an explicit request for complex engineering work, or when the engineering scope needs decomposition, read `.agents/skills/to-tickets/references/engineering-tickets.md` from the project root. Follow its method to check ownership, dependencies and continuation needs, reuse or organize the minimum necessary work items, and continue within the current authorization. Read the leaf directly without installing or invoking the whole `to-tickets` skill. Persist remote work items only within the authorization for those operations.

复杂拆分、跨仓集成、跨会话续办或执行已有计划时，读取 [实现计划与执行](references/implementation-plan.md)，按原验收安排工作，用实际证据推进和续办。清晰的小改动直接完成。

When a parent business ticket exists, aggregate actual results against its AC and identify unmet or unverified acceptance. Child tickets being closed or PRs/MRs being merged do not establish business completion. Engineering completion, business acceptance and permission to update or close the parent are separate facts; report only the facts supported by results and the current authorization.

When entering an engineering repository from Home, working across repositories or submodules, or resolving an unclear project root, read [repository scope and protection](references/repository-scope.md). Follow the actual target repository's rules and effective skills; changing the shell directory does not reload host instructions. A read-only investigation does not authorize implementation writes; the current request determines which repositories and actions are allowed.

用户要求 PR/MR 修复、持续跟进或合并，或明确要求交付后继续跟进时，读取 [PR/MR 持续跟进](references/pr-mr-followup.md)，在当前会话内处理反馈、CI 与版本变化，直到指定结果或明确受阻。复用已有动作授权，按实际版本与平台结果判断完成；普通研发和只读审查不自动转为长期跟进。

Select the engineering skills needed for the work. Do not require lifecycle routing, a formal contract, TDD, a test report or a review package to start or finish. Run tests or request a review when the user asks or the particular task needs it; report only observed results.

Preserve user changes, input validation, permission checks and error handling. Reuse existing authorization for local work; commit, push, publish and deploy only within the authorization for those actions. On resumption, inspect the current sources, existing changes, active work, PRs/MRs and command results before continuing; do not repeat completed or uncertain operations without checking their results.

Delegation is optional, only when authorized, useful and supported by the host. Give each independent task a fresh context with its goal, acceptance, permissions, owned paths, source/version pointers and expected output; with Codex's supported API use `fork_turns: "none"`. Confirm pointers are readable, otherwise supply the minimum relevant source text or work sequentially. A writing worker must know others share the codebase, must not revert their changes, and must respect path ownership; appoint one integrator for shared indexes. Do not copy the whole conversation as a substitute for the brief, or invent cross-host parameters, branches or automatic commits.
