# Review Workflow

Use this reference when executing a review, preparing MR feedback, or defining responsibilities.

## Purpose

Code review exists to:

- Improve code quality through collaborative inspection.
- Reduce defects, outages, and security vulnerabilities before merge.
- Promote knowledge sharing across team members.
- Improve team efficiency by helping developers understand project code faster.
- Raise software security by finding potential vulnerabilities early.

The process applies to department developers and people involved in project development, testing, and release.

## GitLab Enforcement Rules

Configure GitLab so the process is enforceable rather than optional:

- Protect branches so code can merge only after review.
- Require Merge Requests for all code changes into target branches.
- Require at least one reviewer approval before merge.
- Require CI/automated test execution before merge.
- Assign project reviewers and require their review for relevant changes.
- Limit merge permission to approved reviewers or maintainers.

## MR Review Steps

1. Developer finishes work on a feature/fix branch.
2. Developer creates a GitLab Merge Request targeting the correct branch.
3. Developer assigns one or more reviewers, either specific people or GitLab auto-assignment.
4. Reviewer reads the code and checks it against review standards.
5. Reviewer leaves inline comments, discussion notes, and required-change feedback in GitLab.
6. Developer replies to each item and pushes fixes.
7. Reviewer rechecks the updated MR.
8. If compliant, reviewer approves and merges or allows merge according to project permission.
9. If still non-compliant, continue the fix/re-review loop.

## Review Scope

Set review depth based on complexity and importance. Focus on:

- Readability and maintainability.
- Security and permission control.
- Performance and resource usage.
- Code structure, dependency direction, and module boundaries.
- Variable names, function names, constants, magic values, comments.
- Error handling and fallback behavior.
- Logging quality and operational usefulness.
- Tests and CI evidence.
- Historical technical debt touched by the change.

## Finding Severity

Use clear severity to decide whether merge is allowed:

- `Blocker`: must fix before merge. Includes security holes, correctness bugs, data loss risk, failed required CI, broken permission checks, severe dependency/cycle issues, or rule violations that will propagate debt.
- `Major`: should fix before merge unless a responsible human explicitly accepts the risk. Includes maintainability problems, missing important tests, poor error handling, risky performance regressions, and high-priority Sonar/lint findings.
- `Minor`: improvement suggestion that does not block merge. Includes naming polish, small readability improvements, optional refactors, or non-critical style issues.

## Reviewer Guidance

- Review changed behavior first, style second.
- Prefer precise, actionable comments over broad criticism.
- Include why the issue matters and what fix is expected.
- Record both required fixes and optional optimization suggestions.
- Acknowledge good solutions where useful, but do not let encouragement hide blockers.
- Require developer response on every blocking or major finding.
- Re-review after fixes and verify the actual patch, not just the reply.

## Developer Guidance

- Keep MRs small enough for meaningful review.
- Reply to every reviewer item.
- Push fixes promptly and explain intentional non-fixes.
- Ask the reviewer when a finding is unclear.
- Do not resolve discussions without code change or an explicit reviewer agreement.

## Agile Integration

In agile delivery, Code Review is a team responsibility:

- Build a review culture around collaboration and knowledge sharing.
- Make rules and standards consistent across reviewers.
- Timebox reviews so they do not block the sprint unnecessarily.
- Assign responsible reviewers clearly.
- Encourage developers to participate in review and share experience.
