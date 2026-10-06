---
name: tdd
description: Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants integration tests.
---

# Test-Driven Development

TDD is the red → green loop. This skill is the reference that makes that loop produce tests worth keeping: what a good test is, where tests go, the anti-patterns, and the rules of the loop. Every section applies on every cycle — consult them before and during the loop, not after.

When exploring the codebase, read `CONTEXT.md` (if it exists) so test names and interface vocabulary match the project's domain language, and respect ADRs in the area you're touching.

## What a good test is

Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't. A good test reads like a specification — "user can checkout with valid cart" tells you exactly what capability exists — and survives refactors because it doesn't care about internal structure.

See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for mocking guidelines.

## Seams — where tests go

A **seam** is the public boundary you test at: the interface where you observe behavior without reaching inside. Tests live at seams, never against internals.

**Test only at pre-agreed seams.** Use the delivery path already established by the lifecycle owner. A qualified Spec `daily` task takes its public seam from the confirmed Ticket / PR acceptance examples and current engineering baseline; it does not first create an approved Slice or a stage decision. That path requires the local enabled `request_triage.delivery_path` policy and a fixed CLI supporting `route` / `verify-daily`; other Profiles and old CLIs are explicitly unsupported. Do not invent daily qualification inside this skill.

For `governed` YSS implementation, first read the current approved Slice Implementation Contract, its public seam references and the applicable user-decision evidence. Reuse confirmed seams covered by the same valid contract/decision version, scope and basis without asking the user again; follow the existing user-decision protocol selected by root `AGENTS.md` and the lifecycle owner when checking approval continuation.

If a seam or acceptance is missing or materially changed, investigate the missing facts and stop the dependent tests and implementation until it is confirmed. In a daily task update the same task evidence; new policy-excluded impacts stop affected actions and return to the lifecycle owner for governed routing. In governed work, a stale contract or unverifiable confirmation returns to the lifecycle owner to update the contract and obtain any required decision. Independent work may continue. Elapsed time and unrelated file changes do not expire seam confirmation; changed relevant inputs require freshness and scope checks under the same protocol. No test is written at an unconfirmed seam. Agreeing seams directs testing effort to critical paths and complex logic.

When the shape of that interface is itself in question — how deep the module is, where the seam belongs, what the interface should expose — use the `/codebase-design` skill for the vocabulary. It is the shared source of the module, interface, depth, seam, adapter, leverage and locality terms, and it is a reference to consult, not a session to run.

## Anti-patterns

- **Implementation-coupled** — mocks internal collaborators, tests private methods, or verifies through a side channel (querying the database instead of using the interface). The tell: the test breaks when you refactor but behavior hasn't changed.
- **Tautological** — the assertion recomputes the expected value the way the code does (`expect(add(a, b)).toBe(a + b)`, a snapshot derived by hand the same way, a constant asserted equal to itself), so it passes by construction and can never disagree with the code. Expected values must come from an independent source of truth — a known-good literal, a worked example, the spec.
- **Horizontal slicing** — writing all tests first, then all implementation. Bulk tests verify _imagined_ behavior: you test the _shape_ of things rather than user-facing behavior, the tests go insensitive to real changes, and you commit to test structure before understanding the implementation. Work in **vertical slices** instead — one test → one implementation → repeat, each test a **tracer bullet** that responds to what the last cycle taught you.

## Rules of the loop

- **Red before green.** Write the failing test first, then only enough code to pass it. Don't anticipate future tests or add speculative features.
- **One slice at a time.** One seam, one test, one minimal implementation per cycle.
- **Refactoring follows evidence.** The implementer performs necessary in-scope refactoring with green behavior tests. The independent Reviewer reads and reports findings; it does not edit the implementation or review its own changes. The implementer fixes findings, then returns the changed candidate for fresh review.
