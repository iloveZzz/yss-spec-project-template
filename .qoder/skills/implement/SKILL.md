---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Do not commit or push. Implementation authorization does not include git commit/push. Natural language such as "do it and commit" is not structured Git authorization. Stop after review unless a structured Git authorization is already present.
