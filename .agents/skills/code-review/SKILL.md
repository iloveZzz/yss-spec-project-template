---
name: code-review
description: 审查分支、PR、固定候选或工作树改动，按仓库规范、Spec 及适用 UI 还原要求报告有证据的缺陷。
---

Review of a pinned candidate against a fixed point on two core axes, plus UI fidelity when UI is in scope:

- **Standards** — does the code conform to this repo's documented coding standards **and**, for YSS slices, the specialist check inputs compiled in [yss-review-standards.md](references/yss-review-standards.md)?
- **Spec** — does the code faithfully implement the originating issue / spec?
- **UI fidelity** (only when the change has UI impact) — does the candidate match the confirmed prototype and `yss-design-system` / `yss-ui`? Type-check or claiming "already aligned" is not a pass. Invoke those skills' verification notes; do not collapse this axis into Standards or Spec. YSS page-module conventions stay on Standards.

普通功能默认由一名与实现者独立的审查者完成 Standards、Spec 和适用的 UI fidelity 检查，分别报告结论。只有专业能力缺口、结论冲突、明确外部制度或用户指定时，才拆成多个审查者；多个无依赖审查可以并行。检查轴不等于会签人数，不能要求用户为每个轴重复确认。

If `.template-spec/agents/issue-tracker.md` is missing, tell the user to run `/setup-matt-pocock-skills`; do not invoke another user-invoked skill yourself.

文档输出时按 `lifecycle-document-output` 条件调用 `i-have-adhd`，读取 `.template-spec/process/document-writing.md`；作用域仅限当前产物，派发时传递条件及引用。

## 文档写作

撰写审查报告时，读取 `.template-spec/process/document-writing.md` 的共用写法及审查指引；保留各审查轴的 findings、严重性、定位、证据及原裁决，不因压缩表达合并或降级。

## Process

### 1. 固定候选

开始审查前按 [候选捕获合同](references/candidate-capture.md) 选择 committed/worktree 模式，固定比较基点、内容摘要和未跟踪文件。保持只读；候选变化使相关审查失效。

### 2. Identify the spec source

Look for the originating spec, in this order:

1. A spec/Ticket/contract reference supplied by the user or an upstream lifecycle review input.
2. Issue references in the commit messages (`#123`, `Closes #45`, GitLab `!67`, etc.) — fetch via the workflow in `.template-spec/agents/issue-tracker.md`.
3. A spec file under `docs/`, `specs/`, or `docs/.scratch/` matching the branch name or feature.
4. If nothing is found, ask the user where the spec is. If they say there isn't one, the **Spec** sub-agent will skip and report "no spec available".

### 3. Identify the standards sources

Compile sources **before** review. For YSS implementation candidates follow [yss-review-standards.md](references/yss-review-standards.md): run machine checks that exist in the implementation repo; then collect repo docs (`CODING_STANDARDS.md` / `CONTRIBUTING.md` if present), every Slice `required_skills` skill file, the impact-conditioned specialist inputs (`alibaba-java-code-style`, `yss-ui`, `yss-domain`, …), and `.template-spec/templates/review-report-template.md`. Missing applicable coverage is `missing_evidence`, not a pass.

For YSS backend review, derive the review roots from the candidate project root, implementation-repository registry, Slice `project_roots` and `allowed_write_paths`. Review only the project itself and registered backend development projects; exclude frontend roots, unrelated submodules/vendor trees and unregistered directories. Never replace this resolution with a fixed `apps/backend` assumption.

Every backend candidate must explicitly assess `yss-repository` and `yss-mybatis`. When the candidate changes persistence structure, Mapper/XML, SQL, pagination, batch operations, scanning/configuration or data-source behavior, read both skills and the selected Repository Profile; exact component claims also require a current `yss-mybatis` source index. When no persistence impact exists, record a concrete `not-applicable` reason for both instead of silently skipping them.

Anything in the repo that documents how code should be written, such as `CODING_STANDARDS.md` or `CONTRIBUTING.md`, remains a source. It does **not** replace YSS or Alibaba specialist inputs.

On top of whatever the repo documents, the Standards axis always carries the **smell baseline** below — a fixed set of Fowler code smells (_Refactoring_, ch.3) that applies even when a repo documents nothing. Two rules bind it:

- **The repo overrides.** A documented repo standard always wins; where it endorses something the baseline would flag, suppress the smell.
- **Always a judgement call.** Each smell is a labelled heuristic ("possible Feature Envy"), never a hard violation — and, like any standard here, skip anything tooling already enforces.

Each smell reads *what it is* → *how to fix*; match it against the diff:

- **Mysterious Name** — a function, variable, or type whose name doesn't reveal what it does or holds. → rename it; if no honest name comes, the design's murky.
- **Duplicated Code** — the same logic shape appears in more than one hunk or file in the change. → extract the shared shape, call it from both.
- **Feature Envy** — a method that reaches into another object's data more than its own. → move the method onto the data it envies.
- **Data Clumps** — the same few fields or params keep travelling together (a type wanting to be born). → bundle them into one type, pass that.
- **Primitive Obsession** — a primitive or string standing in for a domain concept that deserves its own type. → give the concept its own small type.
- **Repeated Switches** — the same `switch`/`if`-cascade on the same type recurs across the change. → replace with polymorphism, or one map both sites share.
- **Shotgun Surgery** — one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.
- **Divergent Change** — one file or module is edited for several unrelated reasons. → split so each module changes for one reason.
- **Speculative Generality** — abstraction, parameters, or hooks added for needs the spec doesn't have. → delete it; inline back until a real need shows.
- **Message Chains** — long `a.b().c().d()` navigation the caller shouldn't depend on. → hide the walk behind one method on the first object.
- **Middle Man** — a class or function that mostly just delegates onward. → cut it, call the real target direct.
- **Refused Bequest** — a subclass or implementer that ignores or overrides most of what it inherits. → drop the inheritance, use composition.

### 4. Complete each applicable review axis

默认由当前独立 Reviewer 连续完成下列两份检查提纲，按轴保留结论，不派发额外 subagent。需要多专业参与时，按角色表和协作协议派发对应提纲；只增加缺少的能力，不默认启动两个额外 Agent。下面的 sub-agent prompts 同样是单 Reviewer 的检查清单。

**Standards sub-agent prompt** — include:

- The full candidate manifest, captured candidate, `candidate_digest`, diff/inventory commands and commit list. For Worktree candidates, explicitly include every untracked file.
- The list of standards-source files you found in step 3, **plus the smell baseline from step 3** pasted in full. Paste Fowler smells in full. For YSS specialist inputs, pass the exact skill file paths; the reviewer must read them and cite `skill + rule + location`. Do not summarise away mandatory Alibaba or YSS violations to fit a word cap. The 400-word cap applies only to the Fowler smell section.
- Machine-check commands, exit codes and evidence from step 3. Tooling failure is a hard Standards violation.
- The brief: "Report — per file/hunk where relevant — (a) every place the diff violates a documented standard or a required YSS / Alibaba specialist rule: cite the skill or file and the rule; (b) any baseline smell you spot: name it and quote the hunk. Distinguish hard violations from judgement calls — documented-standard and mandatory specialist breaches can be hard, but baseline smells are always judgement calls, and a documented repo standard overrides the baseline. Skip anything the machine checks already enforced. Smell section under 400 words; specialist findings have no word cap."

**Spec sub-agent prompt** — include:

- The same candidate manifest, captured candidate, `candidate_digest`, diff/inventory commands and commit list.
- The path or fetched contents of the spec.
- The brief: "Report: (a) requirements the spec asked for that are missing or partial; (b) behaviour in the diff that wasn't asked for (scope creep); (c) requirements that look implemented but where the implementation looks wrong. Quote the spec line for each finding. Under 400 words."

If the spec is missing, skip the Spec sub-agent and note this in the final report.

普通审查只复验修复影响的结论及其依赖；候选摘要变化后仍须重新绑定当前候选，不能沿用过期证据。未受影响项记录依据后复用。已明确采用下节历史候选/多轴合同的审查继续遵守其约定。

### 5. Aggregate

For template-maintenance task packages carrying `review_round`, preserve the frozen scope and apply the two-round convergence contract. A hard requirement added during review must cite a rule that already applied when the candidate was frozen; otherwise report it as `judgement-call` for the backlog. Round 1 blocking findings return to the implementer and require a new digest plus all review axes. If Round 2 still has an open `violation`, `drift`, or `new_impacts`, return `needs-human` and stop; do not silently start Round 3. Candidate byte changes invalidate every earlier axis report.

Present the reports under `## Standards` and `## Spec` headings, verbatim or lightly cleaned. If UI is in scope, add `## UI fidelity` from the separate pass. Fill `.template-spec/templates/review-report-template.md` specialist tables as part of Standards evidence, not a fourth axis. Do **not** merge or rerank findings — the axes are deliberately separate (see _Why separate axes_). A YSS candidate with blank applicable specialist rows, skipped `required_skills`, or unaddressed mandatory violations is `blocked`, not `completed`. Do not close findings by writing implementation in the review session. `violation` / machine-check failure / blank applicable rows go back to the implementer on the original contract path, then recapture the candidate and rerun affected axes and their dependencies; explicitly rebind unchanged evidence. `drift` / `new_impacts` / `required_skills` mismatch mark the contract `stale` and return to 实现合同编译器; do not keep coding on the old contract. `not-applicable` is only for untriggered impacts; mandatory gates have no waiver, only repair or a complete `seam-deferred` record.

For Worktree mode, recapture the candidate digest after all applicable checks finish. If it differs from `candidate_digest`, mark the affected reports as reviewing a **stale candidate** and return `blocked`; the caller may start a new review against a new capture, but this invocation must not aggregate findings from different bytes. Recheck the same digest again at the completion/checkpoint boundary.

State the reviewed `review_mode`, fixed point, candidate digest and coverage before the two reports. End with a one-line summary: total findings per axis, and the worst issue _within each axis_ (if any). Don't pick a single winner across axes — that's the reranking the separation exists to prevent.

## Why separate axes

A change can pass one axis and fail the other:

- Code that follows every standard but implements the wrong thing → **Standards pass, Spec fail.**
- Code that does exactly what the issue asked but breaks the project's conventions → **Spec pass, Standards fail.**
- Code that implements the spec but diverges from the confirmed prototype or design system → **Spec pass, UI fidelity fail.**

Reporting them separately stops one axis from masking the other.
