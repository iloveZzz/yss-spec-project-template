---
name: maintaining-skills
description: Use when creating, modifying, validating, or retiring reusable Agent skills.
---

# Maintaining Skills

Create skills that add useful, non-obvious guidance without constraining unrelated work.

## Working Contract

1. Inspect the skill's callers, ownership, projections, and validation policy before editing. Preserve user intent, authorization boundaries, supported runtimes, and existing metadata unless the requested change requires otherwise.
2. Assume the Agent already has general reasoning and tool competence. Record only domain knowledge, decision criteria, fragile invariants, or repeatable operations that materially improve outcomes. Do not turn one example or past failure into a universal rule.
3. Keep discovery precise: use a lowercase hyphenated name and a concise description that states the capability and when it applies. Avoid catchalls that attract unrelated requests.
4. Keep `SKILL.md` as short as the task permits. Put conditional detail in `references/`, deterministic repeated operations in `scripts/`, and files intended for generated output in `assets/`. Create only resources with a concrete use.
5. Match specificity and validation to risk. Prefer outcome and decision criteria when several approaches are valid; use fixed steps or absolute rules only for correctness, safety, permissions, or genuinely fragile workflows.
6. Follow the repository's declared maintenance and review policy. If none exists, run structural validation plus focused checks of the behavior or invariant changed. Use independent forward testing only when complexity or risk makes it meaningful; do not require a failing baseline for every ordinary edit.
7. After changes, validate frontmatter, naming, references, scripts, projections, locks, and affected callers. Retire obsolete names and resources unless the repository explicitly requires compatibility.
8. When a repository declares staged template verification, default the implementation loop to its fast impact profile and stop at `implementation-ready`. Promote explicitly to `review-ready`; do not create frozen candidates, review packages, or release evidence during ordinary iteration. Unknown paths and changes to the verification framework itself must fail safe to the full profile.
9. For L3 template maintenance, record maintainer self-check plus fresh verification and do not create a frozen candidate or formal independent review during ordinary iteration. Before release, run the repository's full `scripts/verify-template` gate once; historical formal-review records remain read-only compatible.

## Boundaries

- Project rules belong in the project's authoritative instructions, not duplicated inside a generic skill.
- Platform-private skills or absolute local paths are not portable shared dependencies.
- A validation command proves only what it checks; structural validation alone does not prove good Agent decisions.
- Do not create README files, changelogs, examples, routers, or placeholder directories without a concrete requirement.
