---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the user's goal in the authorized repository using the available acceptance criteria. Reuse the current conversation, issue, ticket or spec; do not create a new record merely to start work.

Read the repository's applicable instructions and the code needed for this change. Resolve missing facts by inspection; ask only for a real missing decision. No tracker setup, lifecycle route, executor registration, checkpoint or Slice contract is required for standalone work.

Map every accepted criterion to an implementation task and verification method. Show the full task overview, expand only the current task with behavior, scope and dependencies, and keep progress separate from approved requirements. Reuse valid confirmation; ask together only for unresolved business decisions after inspection.

Select the relevant engineering skills. Use TDD for behavior changes, run the affected checks, and review the current diff against the acceptance criteria and repository standards with `code-review`. Default to an honest self-check; independent review is required only by an actual user or applicable external requirement. Fix findings and rerun affected checks after edits.

Report changes, actual verification and unresolved limitations. Never infer a passing check from a complete document. Reuse existing authorization for local implementation; commit, push, publish and deployment require authorization covering the actual action. Do not reset or overwrite user work.

On resumption, inspect existing changes, running commands and readable results before continuing. Recover finished results without replaying unknown side effects; diagnose repeated failures and report concrete blockers while continuing independent authorized work.

When the repository enables ordinary delivery, use its current entry policy and ordinary-delivery reference; standalone work still needs no governance installation. When the caller explicitly supplies a formal lifecycle task or contract, consume its current inputs and return results to its owner. This skill does not approve contracts or change formal task status. An existing formal project follows its declared entry policy until explicitly migrated.
