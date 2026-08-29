---
name: code-review
description: Use when the user wants to review a branch, PR, committed candidate, uncommitted work-in-progress changes, or changes since a fixed point. For YSS implementation, Standards must load Slice contract required_skills plus specialist check inputs such as alibaba-java-code-style and yss-ui; do not add a second generic review skill.
---

Review of a pinned candidate against a fixed point on two core axes, plus UI fidelity when UI is in scope:

- **Standards** — does the code conform to this repo's documented coding standards **and**, for YSS slices, the specialist check inputs compiled in [yss-review-standards.md](references/yss-review-standards.md)?
- **Spec** — does the code faithfully implement the originating issue / spec?
- **UI fidelity** (only when the change has UI impact) — does the candidate match the confirmed prototype and `yss-design-system` / `yss-ui`? Type-check or claiming "already aligned" is not a pass. Invoke those skills' verification notes; do not collapse this axis into Standards or Spec. YSS page-module conventions stay on Standards.

Standards and Spec run as **parallel sub-agents** so they don't pollute each other's context, then this skill aggregates their findings. When UI is in scope, add a separate UI fidelity pass after those two reports (do not merge it into either axis).

If `docs/agents/issue-tracker.md` is missing, tell the user to run `/setup-matt-pocock-skills`; do not invoke another user-invoked skill yourself.

## Process

### 1. Pin the fixed point and candidate

Whatever the user said is the fixed point — a commit SHA, branch name, tag, `main`, `HEAD~5`, etc. If they didn't specify one, ask for it.

Choose one candidate mode from the request or an upstream review contract:

- **Committed candidate** — review committed branch/PR state. Capture `git diff <fixed-point>...HEAD` and `git log <fixed-point>..HEAD --oneline`.
- **Worktree candidate** — review work in progress without requiring a commit. Resolve `<merge-base>` with `git merge-base <fixed-point> HEAD`, then capture:
  - `git diff --no-ext-diff --binary --full-index <merge-base>` for committed, staged and unstaged tracked content as it exists in the working tree;
  - `git ls-files -z --others --exclude-standard` for NUL-delimited raw untracked paths;
  - each untracked file's content, using `git diff --no-index --no-ext-diff --binary --full-index -- /dev/null <path>` when a diff representation is useful. Exit code `1` from this command means a difference was found, not that review failed;
  - `git log <fixed-point>..HEAD --oneline` for the committed portion of the candidate.

Record one **candidate manifest** before spawning reviewers:

```yaml
review_mode: committed # or worktree
review_base_ref: <fixed-point>
merge_base: <resolved-sha>
implementation_candidate_ref: HEAD # or working-tree
candidate_snapshot_ref: <immutable-commit-or-captured-snapshot>
candidate_digest: <sha256-or-immutable-tree-id>
tracked_diff_command: <command>
untracked_inventory_command: <command-or-null>
untracked_files: []
commit_list_command: <command>
```

For a Committed candidate, resolve `HEAD` to an immutable commit and tree before review. Its manifest must include `merge_base`, `tracked_diff_command` and `commit_list_command`. For a Worktree candidate, the manifest must additionally include `untracked_inventory_command`, `untracked_diff_command` and the exact `untracked_files` inventory.

For a Worktree candidate, capture the tracked binary diff and every untracked file's bytes once into an immutable snapshot, compute `candidate_digest`, and make that **captured candidate** available to both reviewers. The following is normative, not illustrative: use the `yss-worktree-candidate-v1` byte stream. Start with ASCII `YSS-WORKTREE-CANDIDATE-V1` followed by one NUL byte. Append one tracked record: byte `0x54`, unsigned 64-bit big-endian binary-diff byte length, then the exact stdout bytes from `git diff --no-ext-diff --binary --full-index <merge-base>`. Then append one untracked record for each NUL-delimited raw path from `git ls-files -z --others --exclude-standard`, sorted bytewise by the raw path: byte `0x55`, unsigned 64-bit big-endian path length, raw path bytes, unsigned 32-bit big-endian `lstat` mode, entry-kind byte (`0x52` regular or `0x4c` symlink), unsigned 64-bit big-endian content length, then raw regular-file bytes or raw symlink-target bytes. Other entry kinds block capture. This is the sole length-prefixed framing and bytewise path order for the digest. SHA-256 is calculated over exactly this stream. The immutable snapshot stores `candidate-manifest.yaml`, `tracked.diff` and the `untracked/` bytes under the digest identity; both reviewers must consume those captured bytes and must not independently reread a live worktree.

Before going further, confirm the fixed point and merge-base resolve. A committed candidate must have a non-empty committed diff. A Worktree candidate is non-empty when either its tracked diff or untracked inventory is non-empty. A bad ref, missing candidate part or empty candidate should fail here — not inside two parallel sub-agents. Do not silently downgrade Worktree review to `HEAD`-only review.

### 2. Identify the spec source

Look for the originating spec, in this order:

1. A spec/Ticket/contract reference supplied by the user or an upstream lifecycle review input.
2. Issue references in the commit messages (`#123`, `Closes #45`, GitLab `!67`, etc.) — fetch via the workflow in `docs/agents/issue-tracker.md`.
3. A spec file under `docs/`, `specs/`, or `docs/.scratch/` matching the branch name or feature.
4. If nothing is found, ask the user where the spec is. If they say there isn't one, the **Spec** sub-agent will skip and report "no spec available".

### 3. Identify the standards sources

Compile sources **before** spawning reviewers. For YSS implementation candidates follow [yss-review-standards.md](references/yss-review-standards.md): run machine checks that exist in the implementation repo; then collect repo docs (`CODING_STANDARDS.md` / `CONTRIBUTING.md` if present), every Slice `required_skills` skill file, the impact-conditioned specialist inputs (`alibaba-java-code-style`, `yss-ui`, `yss-domain`, …), and `docs/templates/review-report-template.md`. Missing applicable coverage is `missing_evidence`, not a pass.

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

### 4. Spawn both sub-agents in parallel

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

### 5. Aggregate

Present the reports under `## Standards` and `## Spec` headings, verbatim or lightly cleaned. If UI is in scope, add `## UI fidelity` from the separate pass. Fill `docs/templates/review-report-template.md` specialist tables as part of Standards evidence, not a fourth axis. Do **not** merge or rerank findings — the axes are deliberately separate (see _Why separate axes_). A YSS candidate with blank applicable specialist rows, skipped `required_skills`, or unaddressed mandatory violations is `blocked`, not `completed`. Do not close findings by writing implementation in the review session. `violation` / machine-check failure / blank applicable rows go back to the implementer on the original contract path, then recapture the candidate and rerun every axis. `drift` / `new_impacts` / `required_skills` mismatch mark the contract `stale` and return to Router; do not keep coding on the old contract. `not-applicable` is only for untriggered impacts; mandatory gates have no waiver, only repair or a complete `seam-deferred` record.

For Worktree mode, recapture the candidate digest after both reports return. If it differs from `candidate_digest`, mark both reports as reviewing a **stale candidate** and return `blocked`; the caller may start a new review against a new capture, but this invocation must not aggregate findings from different bytes. Recheck the same digest again at the completion/checkpoint boundary.

State the reviewed `review_mode`, fixed point, candidate digest and coverage before the two reports. End with a one-line summary: total findings per axis, and the worst issue _within each axis_ (if any). Don't pick a single winner across axes — that's the reranking the separation exists to prevent.

## Why separate axes

A change can pass one axis and fail the other:

- Code that follows every standard but implements the wrong thing → **Standards pass, Spec fail.**
- Code that does exactly what the issue asked but breaks the project's conventions → **Spec pass, Standards fail.**
- Code that implements the spec but diverges from the confirmed prototype or design system → **Spec pass, UI fidelity fail.**

Reporting them separately stops one axis from masking the other.
