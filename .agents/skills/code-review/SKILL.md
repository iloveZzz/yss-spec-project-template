---
name: code-review
description: 审查分支、PR、固定候选或工作树改动，按仓库规范、Spec 及适用 UI 还原要求报告有证据的缺陷。
---

Review the current candidate against the user's acceptance criteria and repository standards. Standalone review needs no tracker setup, route qualification, checkpoint, executor registry or formal Slice.

1. Establish the real repository and diff. Use the supplied Git base; if none is available, inspect repository history and the requested scope before asking for a missing choice. Include staged, unstaged and relevant untracked files. Keep review read-only.
2. Find acceptance criteria in the user's request, issue, ticket or spec. A separate Spec file is optional. If no usable basis exists, state that the Spec axis cannot be evaluated; do not create an empty spec or claim that axis passed.
3. Read actual repository standards and the engineering guidance relevant to the change. Use [smell baseline](references/smell-baseline.md) for judgment where useful, not as a new mandatory gate. Run or consume actual applicable machine checks; do not treat unexecuted checks as passed.
4. Review Standards and Spec separately; add UI fidelity only when relevant. Default to an honest self-check. A real user or external requirement can require an independent execution context; the number of axes does not determine reviewer count.
5. Report actionable findings with severity, file location, evidence and consequence. State applicable checks, actual results and limits in the existing conversation or task record. A stale candidate invalidates affected conclusions; after repairs compare the diff and rerun affected checks rather than restarting unrelated review.

Keep unresolved violations and missing evidence explicit. Do not approve contracts, promote tickets, or edit implementation during a frozen review. Reuse authorized local work without asking for internal IDs or evidence forms.

Only when the caller explicitly supplies an existing formal task, use the [governed workflow](references/governed-workflow.md) and its actual required inputs. Its stage policy does not apply to ordinary standalone review.
