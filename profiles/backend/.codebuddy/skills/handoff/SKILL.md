---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Run only when the user explicitly requests handoff. Ordinary analysis, phase completion, Wayfinder completion and prototype return do not trigger it.

Write a handoff document so a fresh agent can continue the current objective. Save to the temporary directory of the user's OS, then return its actual absolute path.

Record the current objective, completed work, remaining work and blockers, existing authorization scope, and the next executable action. Distinguish verified results from planned or unexecuted checks. Record material and artifact references with the source information actually available; do not require a template format, source project identity or source approval. Current local records may be sufficient even when original materials are offline; retrieve them only on demand, without mandatory change detection, synchronization or recovery. Preserve the references and versions needed to resume; a handoff does not grant approval, implementation, commit, push or release authority.

Only an explicit request for formal packaging, offline delivery or import selects the existing protocol in `.template-spec/process/strategic-handoff-package.md`. A plain handoff request or next-session description uses the temporary document above. Verify original approvals, package integrity and historical semantics unchanged; missing package prerequisites block only that package action. Packaging does not authorize import, deployment or publication; import requires authorization covering destination writes.

Include a "suggested skills" section in the document, which suggests skills that the agent should invoke.

Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.
