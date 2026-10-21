---
name: diagnosing-bugs
description: Diagnosis loop for hard bugs and performance regressions. Use when the user says "diagnose"/"debug this", or reports something broken/throwing/failing/slow.
---

# Diagnosing Bugs

A discipline for hard bugs. Skip phases only when explicitly justified.

When exploring the codebase, read `CONTEXT.md` (if it exists) to get a clear mental model of the relevant modules, and check ADRs in the area you're touching.

## Redact

This skill has you show commands, outputs and captured artifacts. **Redact every secret first** — write `<REDACTED>` in its place. Build loops against env vars, so the credential stays in the environment rather than in what you show. Captured artifacts carry auth headers: quote only the lines that carry the signal.

If the redacted output is not enough to diagnose the bug, say so and ask the user.

## Simple fixes and complex investigations

When a bounded defect has confirmed inputs and a known public seam, run a direct reproducer, make the authorized minimal fix and run the regression check. Do not restart an interview, minimize an already minimal case, or invent extra hypotheses. Use the phases below when the cause, environment or reproduction is uncertain.

## Phase 1 — Build a feedback loop

复现命令尚不存在、信号不稳定或环境不可达时，读取 [反馈循环构造](references/feedback-loop.md)。进入 Phase 2 前必须实际运行能捕获用户原症状的命令；无法建立循环时报告已尝试方法和缺少的输入，不凭猜测继续。

## Phases 2–4 — Reproduce, hypothesise, instrument

原因或复现条件仍不明确时，读取 [收敛复现、假设与探针](references/investigation.md)。缩小案例应消除有意义的不确定性；假设须可证伪，探针一次只改变一个变量，性能问题先测基线。

## Phase 5 — Fix + regression test

Write the regression test **before the fix** — but only if there is a **correct seam** for it.

A correct seam is one where the test exercises the **real bug pattern** as it occurs at the call site. If the only available seam is too shallow (single-caller test when the bug needs multiple callers, unit test that can't replicate the chain that triggered the bug), a regression test there gives false confidence.

**If no correct seam exists, that itself is the finding.** Note it. The codebase architecture is preventing the bug from being locked down. Flag this for the next phase.

If a correct seam exists:

1. Turn the minimised repro into a failing test at that seam.
2. Watch it fail.
3. Apply the fix.
4. Watch it pass.
5. Re-run the Phase 1 feedback loop against the original (un-minimised) scenario.

## Phase 6 — Cleanup

Required before declaring done:

- [ ] Original repro no longer reproduces (re-run the Phase 1 loop)
- [ ] Regression test passes (or absence of seam is documented)
- [ ] All `[DEBUG-...]` instrumentation removed (`grep` the prefix)
- [ ] Throwaway prototypes deleted (or moved to a clearly-marked debug location)
- [ ] The hypothesis that turned out correct is stated in the commit / PR message, so the next debugger learns
