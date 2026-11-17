---
name: implement
description: 按用户明确的开发、修复或 Spec/Ticket 实现请求完成单仓或跨仓研发；只读分析、规格确认与准备交接不自动转实现。
---

Implement the user's goal in the authorized repository or repositories using the current request, spec or tickets. Read the relevant code, map the accepted behavior to concrete changes and finish the affected callers and configuration. A direct engineering request can proceed without a ticket; a small task does not need a tracking item first.

When accepting or resuming work from a Ticket URL, number or existing tracker item, read `.template-spec/agents/issue-tracker-operations.md` from the project root. Use its shared method to locate the actual item, read current content and relationships, reconcile changes and act within the authorization for each operation. Ticket means a work item; an Issue is one way to carry it. Refer to the actual title with its link, and continue independent work supported by available inputs when access is incomplete.

Keep the observable goal, actual repository and paths, interface dependencies, acceptance and applicable skills in the existing task. Business rules stay in their original source: a source file remains authoritative, and an Issue body is authoritative only when the Issue is itself the source. When using a tracker, keep current execution status there and link the actual engineering results without creating a parallel rule set, status ledger or implementation contract. For YSS work, use yss-domain / yss-application for DDD behavior and orchestration, and the existing Service boundary for MVC; use yss-repository / yss-web-controller for persistence and HTTP boundaries.

When a parent business ticket exists, aggregate actual results against its AC and identify unmet or unverified acceptance. Child tickets being closed or PRs/MRs being merged do not establish business completion. Engineering completion, business acceptance and permission to update or close the parent are separate facts; report only the facts supported by results and the current authorization.

When entering an engineering repository from Home, working across repositories or submodules, or resolving an unclear project root, read [repository scope and protection](references/repository-scope.md). Follow the actual target repository's rules and effective skills; changing the shell directory does not reload host instructions. A read-only investigation does not authorize implementation writes; the current request determines which repositories and actions are allowed.

用户要求 PR/MR 修复、持续跟进或合并，或明确要求交付后继续跟进时，读取 [PR/MR 持续跟进](references/pr-mr-followup.md)，在当前会话内处理反馈、CI 与版本变化，直到指定结果或明确受阻。复用已有动作授权，按实际版本与平台结果判断完成；普通研发和只读审查不自动转为长期跟进。

Select the engineering skills needed for the work. Do not require lifecycle routing, a formal contract, TDD, a test report or a review package to start or finish. Run tests or request a review when the user asks or the particular task needs it; report only observed results.

Preserve user changes and error handling. Reuse existing authorization for local work; commit, push, publish and deploy only within the authorization for those actions. On resumption, inspect existing changes and command results before continuing.

Delegation is optional, only when authorized, useful and supported by the host. Give each independent task a fresh context with its goal, acceptance, permissions, owned paths, source/version pointers and expected output; with Codex's supported API use `fork_turns: "none"`. Confirm pointers are readable, otherwise supply the minimum relevant source text or work sequentially. A writing worker must know others share the codebase, must not revert their changes, and must respect path ownership; appoint one integrator for shared indexes. Do not copy the whole conversation as a substitute for the brief, or invent cross-host parameters, branches or automatic commits.
