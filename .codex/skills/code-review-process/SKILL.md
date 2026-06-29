---
name: code-review-process
description: Run the department code review process for GitLab Merge Requests and code changes. Use when asked to perform or prepare code review, review a branch/MR/diff, define reviewer responsibilities, enforce GitLab approval gates, combine manual review with SonarQube/SonarLint/Alibaba Java rules, record review findings, or guide a developer-reviewer feedback loop.
---

# Code Review Process

This skill turns the provided `代码审查流程规范` PDF into a practical workflow for Codex-assisted code review. Use it to execute review work, prepare MR feedback, define gate checks, or help teams set up a consistent review process.

## Workflow

1. Identify the review target: MR, branch, diff, commit range, changed files, or proposed patch.
2. Read `references/review-workflow.md` before reviewing or designing a review flow.
3. Read `references/automation-and-standards.md` when the task mentions GitLab settings, CI/CD, SonarQube, SonarLint, Alibaba Java rules, or quality gates.
4. If the review target is Java, also use `$alibaba-java-code-style` when available for rule-level Java findings.
5. Review in this order:
   - Gate readiness: MR exists, reviewer assigned, CI/static analysis available, merge target clear.
   - Correctness and safety: behavioral regressions, security, data consistency, error handling, permissions.
   - Maintainability: structure, readability, dependency direction, duplicated logic, magic values.
   - Quality signals: tests, coverage, Sonar findings, lint findings, comments and logging.
6. Return findings first, ordered by severity. Include exact file/line references where possible, impact, and concrete fix guidance.
7. Mark unresolved must-fix issues as blocking merge. Allow merge only when mandatory findings are resolved or explicitly accepted by a responsible human.

## Review Loop

Follow the MR loop from the source document:

1. Developer creates a Merge Request.
2. Developer assigns one or more reviewers.
3. Reviewer reviews code and records comments, suggestions, and required changes on the MR.
4. If compliant, merge to the main target branch.
5. If non-compliant, developer fixes issues and replies on the MR.
6. Reviewer re-reviews the updated code until it is compliant or explicitly rejected.

## Roles

- Reviewer should be a core senior developer, project development lead, project owner, architect, or similarly responsible engineer.
- Reviewer combines automated lint/static-analysis results with experience and classifies findings by priority and importance.
- Developer must reply to and confirm findings. If unclear, the developer must communicate with the reviewer instead of silently ignoring the item.
- Reviewer is responsible for the merged branch code. Multiple reviewers may review the same MR to reduce conflicts and prevent problematic code from merging.

## Output Format

Use this structure for review results:

```markdown
**Findings**
- [Blocker|Major|Minor] [file:line] Problem summary. Impact. Required fix.

**Gate Status**
- MR/branch:
- Reviewer:
- CI/static analysis:
- Merge decision: approved / changes requested / blocked

**Follow-Up**
- Items requiring developer reply:
- Items requiring re-review:
```

When there are no findings, say that clearly and still mention any residual risk, missing test evidence, or unavailable CI/static-analysis results.

## Source

Based on the user-provided PDF: `代码审查流程规范`, initial version `v1.0.0`, author `朱道明`, document date shown as `2023510`.
