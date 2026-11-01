# Design It Twice

When the user wants alternative interfaces for a chosen candidate, explore meaningfully different designs before recommending one. Use [the module vocabulary](SKILL.md) and the project's existing domain terminology. This method does not authorize implementation.

## Frame the question

State the real constraints, callers, invariants and dependencies, using [dependency categories](DEEPENING.md) where helpful. A short sketch can clarify the problem without preselecting a design. Reuse already chosen direction; ask only for an unresolved material trade-off.

## Explore alternatives

Choose the number of alternatives from the actual trade-offs and available resources, not a fixed agent count. Useful contrasts include a smaller interface, the common caller's simplest path, or a different placement of an external seam. Avoid speculative flexibility or arbitrary method-count targets.

When delegation is authorized and supported, each independent design task gets a fresh context (Codex's supported API: `fork_turns: "none"`), not the complete conversation. Supply:

- the goal and distinct design constraint;
- read-only scope, or explicitly owned paths if a separate writing task was authorized;
- current source/version pointers, caller facts, invariants and relevant vocabulary;
- expected output and limitations.

Ensure pointers are readable; provide minimum necessary excerpts when not, or proceed sequentially. Tell writing agents they share the codebase, must not revert others, and must respect ownership; shared indexes have one integrator. No host support means sequential design, not a simulated dispatch. No fixed model name or mandatory branch/commit workflow.

Each alternative explains its interface (types, parameters, invariants, ordering and errors), caller example, hidden complexity, dependency strategy and trade-offs. State uncertainties rather than inventing facts.

## Compare and recommend

Compare depth, locality and seam placement against actual callers. Recommend a design with reasons, optionally combine compatible elements. Keep analysis vocabulary from renaming domain concepts; implementation follows only when authorized.
