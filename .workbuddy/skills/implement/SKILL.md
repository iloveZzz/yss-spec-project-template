---
name: implement
description: 按用户明确的开发、修复或 Spec/Ticket 实现请求完成单仓或跨仓研发；只读分析、规格确认与准备交接不自动转实现。
---

Implement the user's goal in the authorized repository using the current request, spec or tickets. Read the relevant code, map the accepted behavior to concrete changes and finish the affected callers and configuration.

When given a Ticket URL or number, resolve the actual tracker, repository/instance and issue type, then read the real title, body and relevant comments before implementation. Refer to it by title with its link. A bare number with multiple possible targets needs only a locating question; access failure is not proof of absence. Continue independent work supported by existing inputs without inventing ticket contents.

Keep the observable goal, actual repository and paths, interface dependencies, acceptance and applicable skills in the existing task. For YSS work, use yss-domain / yss-application for DDD behavior and orchestration, and the existing Service boundary for MVC; use yss-repository / yss-web-controller for persistence and HTTP boundaries. Do not create a parallel implementation contract.

When entering an engineering repository from Home, working across repositories or submodules, or resolving an unclear project root, read [repository scope and protection](references/repository-scope.md). Follow the actual target repository's rules and effective skills; changing the shell directory does not reload host instructions. A read-only investigation does not authorize implementation writes; the current request determines which repositories and actions are allowed.

用户要求 PR/MR 修复、持续跟进或合并，或明确要求交付后继续跟进时，读取 [PR/MR 持续跟进](references/pr-mr-followup.md)，在当前会话内处理反馈、CI 与版本变化，直到指定结果或明确受阻。复用已有动作授权，按实际版本与平台结果判断完成；普通研发和只读审查不自动转为长期跟进。

Select the engineering skills needed for the work. Do not require lifecycle routing, a formal contract, TDD, a test report or a review package to start or finish. Run tests or request a review when the user asks or the particular task needs it; report only observed results.

Preserve user changes and error handling. Reuse existing authorization for local work; commit, push, publish and deploy only within the authorization for those actions. On resumption, inspect existing changes and command results before continuing.

Delegation is optional, only when authorized, useful and supported by the host. Give each independent task a fresh context with its goal, acceptance, permissions, owned paths, source/version pointers and expected output; with Codex's supported API use `fork_turns: "none"`. Confirm pointers are readable, otherwise supply the minimum relevant source text or work sequentially. A writing worker must know others share the codebase, must not revert their changes, and must respect path ownership; appoint one integrator for shared indexes. Do not copy the whole conversation as a substitute for the brief, or invent cross-host parameters, branches or automatic commits.
