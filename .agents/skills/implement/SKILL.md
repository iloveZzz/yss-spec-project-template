---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

This is an explicit compatibility entry. Before implementation, return to the active lifecycle orchestrator to verify repository identity, registered implementation paths, a current approved Slice Implementation Contract and applicable gates. Reuse existing approved inputs; do not restart planning merely because this entry was invoked. Implement only that contract and return artifacts, actual verification, drift and new impacts for acceptance. Do not approve the contract or upgrade Ticket state yourself. Template-source changes follow the template maintenance route instead of creating product assets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Do not commit or push. Implementation authorization does not include git commit/push. Natural language such as "do it and commit" is not structured Git authorization. Stop after review unless a structured Git authorization is already present.
