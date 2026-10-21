---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

This is an explicit compatibility entry. Before implementation, return to the active lifecycle orchestrator to verify repository identity, registered implementation paths, a current approved Slice Implementation Contract and applicable gates. Reuse existing approved inputs; do not restart planning merely because this entry was invoked. Implement only that contract and return artifacts, actual verification, drift and new impacts for acceptance. Do not approve the contract or upgrade Ticket state yourself. Template-source changes follow the template maintenance route instead of creating product assets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once implementation and applicable verification are ready, return the candidate and evidence to the lifecycle owner, who dispatches an independent reviewer using /code-review. The implementer fixes reported findings and supplies fresh evidence for the affected conclusions; it does not review its own work or declare acceptance.

Git commit and push require separate explicit authorization under the existing user-decision protocol selected by root `AGENTS.md` and the lifecycle owner. The Agent may normalize a real, readable user reply that identifies the Git action and repository/change scope into the required authorization, scope and source-reference fields; do not ask the user to fill internal fields again. Implementation authorization or a generic request to continue does not authorize Git actions, and commit authorization does not authorize push. If the source is unreadable, authorization was revoked or the action exceeds its scope, do not execute that Git action; return the checkpoint judgment for the lifecycle owner.
