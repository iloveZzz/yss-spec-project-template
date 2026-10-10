---
name: maintaining-skills
description: Use when creating, modifying, validating, or retiring reusable Agent skills.
---

# Maintaining Skills

Create skills that add useful, non-obvious guidance without constraining unrelated work.

## Working Contract

1. Inspect the skill's callers, ownership, projections, and validation policy before editing. Preserve user intent, authorization boundaries, supported runtimes, and existing metadata unless the requested change requires otherwise.
2. Assume the Agent already has general reasoning and tool competence. Record only domain knowledge, decision criteria, fragile invariants, or repeatable operations that materially improve outcomes. Do not turn one example or past failure into a universal rule.
3. Keep discovery precise: use a lowercase hyphenated name and a concise description with the distinguishing task and trigger first. Avoid broad keyword lists that attract unrelated requests. For discovery or prompt redesign, use [authoring guidance](references/authoring.md).
4. Keep `SKILL.md` as short as the task permits. Put conditional detail in `references/`, deterministic repeated operations in `scripts/`, and files intended for generated output in `assets/`. Create only resources with a concrete use.
5. Match specificity and validation to risk. Prefer outcome and decision criteria when several approaches are valid; use fixed steps or absolute rules only for correctness, safety, permissions, or genuinely fragile workflows.
6. Follow the repository's declared maintenance and review policy. If none exists, run structural validation plus focused checks of the behavior or invariant changed. Use independent forward testing only when complexity or risk makes it meaningful; do not require a failing baseline for every ordinary edit.
7. After changes, validate frontmatter, naming, references, scripts, projections, locks, and affected callers. Retire obsolete names and resources unless the repository explicitly requires compatibility.
8. For staged template verification, distinguish ordinary implementation delivery from formal candidate or release tasks. Inspect the host's impact plan; use its fast profile or explicitly supported focused checks for the current change and dependencies, and stop at `implementation-ready`. A full fallback plan does not turn ordinary delivery into a release task. Investigate unknown paths and invalid dependencies before selecting checks; retain the host's full reference requirement for candidate or release evidence when optimization is unqualified or stale. Do not edit a selected plan to manufacture a passing profile report.
9. Let the repository intensity policy determine the required self-check, fresh verification and risk-triggered counterexample evidence. Ordinary template maintenance does not require a failing baseline or a universal counterexample package; preserve existing regression coverage and validate any voluntarily supplied run evidence. An intensity level does not by itself require independent review, candidate freezing or a complete suite. Reuse only evidence whose inputs and boundary remain current under host policy; repeat affected checks after a change. Formal candidate, release and adopted mandatory CI requirements remain binding, and scoped implementation evidence cannot replace them. Historical formal-review records remain read-only compatible.
10. Carry the authorized change through affected callers, projections and focused verification. A first edit is not completion. Reuse the user's existing authorization for routine local corrections; stop at a real missing input, authority boundary, or the requested deliverable. New user constraints steer the remaining work without discarding completed work.

## Boundaries

- Project rules belong in the project's authoritative instructions, not duplicated inside a generic skill.
- Platform-private skills or absolute local paths are not portable shared dependencies.
- A validation command proves only what it checks; structural validation alone does not prove good Agent decisions.
- Do not create README files, changelogs, examples, routers, or placeholder directories without a concrete requirement.
