---
name: code-review
description: 审查分支、合并请求、指定版本或工作树的改动，对照仓库规范、规格及适用的界面设计，指出缺陷及其依据。
---

Review the requested diff against the user's acceptance criteria and the relevant engineering guidance. Keep the review read-only unless fixes are also requested.

Locate the actual repository, Git base and current changes. Read enough surrounding code to substantiate findings. Report concrete defects with severity, file location and consequence; distinguish facts from uncertainty.

A review does not require a Spec file, lifecycle status, test report, frozen candidate or separate reviewer. Tests are optional supporting evidence; missing test execution alone is not a finding. Explain the actual scope and any unresolved limitations without inventing a pass or approval.

For branch/PR/worktree scope, read [candidate capture](references/candidate-capture.md). For applicable repository and YSS rules, read [review standards](references/yss-review-standards.md); separate requirements and standards using [review axes](references/review-axis-checklists.md). Consult [smell heuristics](references/smell-baseline.md) only when structural maintainability is relevant. These are methods, not prerequisites for review permission.
