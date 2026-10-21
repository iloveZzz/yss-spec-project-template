---
name: writing-for-agents
description: Writing documents for agents. Use when creating or editing skills, or modifying AGENTS.md or CLAUDE.md.
---

# Writing for Agents

Write instructions that help an Agent make the right decision in the intended task. Preserve the host repository's authority, user authorization and existing conventions.

- Put the distinguishing trigger first. Separate source facts, mandatory boundaries and optional methods.
- Keep necessary inputs, branch choices, fragile invariants, stopping conditions and completion evidence visible.
- Link conditional detail at its decision point. Explain when to load it; do not make every task load every reference.
- Prefer outcomes and criteria for flexible work. Use exact steps for genuinely fragile operations, not arbitrary counts or a desired writing length.
- Remove duplicated generic advice only when the remaining instruction preserves the real decision boundary.
- Verify changed triggers and behavior with representative requests, neighboring non-triggers and applicable authorization counterexamples; structural checks do not prove Agent behavior.

When editing skill metadata or invocation policy, read [skill mechanics](SKILL-MECHANICS.md). When deciding how to split a long document or repair an unreliable context pointer, read [writing principles and examples](references/writing-principles.md). These references do not impose a uniform writing length or override project governance.
