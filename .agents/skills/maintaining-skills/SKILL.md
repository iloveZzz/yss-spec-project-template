---
name: maintaining-skills
description: Use when creating, modifying, validating, or retiring reusable Agent skills.
---

Maintain concise skills that add useful domain knowledge without constraining unrelated work.

1. Inspect actual callers, canonical ownership and distribution before editing. Respect user changes and declared write scope.
2. Keep name and description precise. Use [authoring guidance](references/authoring.md) for discovery and instruction design. Put conditional detail in references and repeated deterministic operations in scripts.
3. Prefer outcomes and decision criteria. Require fixed steps only for concrete correctness, permissions or fragile operations. Do not turn every past incident into a permanent rule.
4. Separate necessary task inputs from optional context. Standalone skills must not require lifecycle registration, tracker setup, checkpoints or a complete governance installation merely to begin work.
5. Validate the behavior changed and its real consumers, using existing coverage where sufficient. For skill prose use representative task cases; do not add tests that only search for required phrases.
6. Update affected references, scripts, projections and locks through the existing generators. Run checks selected by actual impact. Record actual results and limits in the existing task or PR; no checkpoint, candidate freeze, maintenance receipt or failing baseline is required for ordinary prose edits.
7. Preserve installation path/overwrite protection and source checks at write boundaries. A structural check proves structure, not good model decisions. Independent review depends on actual need, not task labels.
8. Carry authorized work through callers and distribution. Reuse existing authorization; do not request a second confirmation for routine local corrections. Commit, push and release require authorization for those actions.

If this task explicitly produces a formal release or an existing governed maintenance contract, use the [formal maintenance reference](references/governed-maintenance.md). Its qualification protocol does not become the default skill workflow.
