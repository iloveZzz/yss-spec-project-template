# Context Compression Recovery Protocol

Canonical path: `comet/reference/context-recovery.md`

This protocol is shared by all comet sub-skills that may trigger context compression. When the agent suspects context compression has occurred (previous conversation summarized, cannot find previously discussed content), follow this protocol to recover.

## Recovery Steps

```bash
"$COMET_BASH" "$COMET_STATE" check <change-name> <phase> --recover
```

The script outputs structured recovery context (phase, completed fields, pending fields, recovery action). Follow the **Recovery action** output for next steps.

## Build Phase Special Recovery

If the recovery script outputs `build_mode: subagent-driven-development`:

1. Use the Skill tool to reload the Superpowers `subagent-driven-development` skill
2. Re-read `comet/reference/subagent-dispatch.md` for Comet-specific extensions
3. Read `openspec/changes/<name>/.comet/subagent-progress.md` to recover the current task or final review, implementation commit, RED/GREEN evidence, passed reviews, unresolved feedback, and review-fix round
4. Do not execute tasks directly in the main session
5. Resume from the checkpoint's exact stage; begin implementer dispatch for the first unchecked task only when the checkpoint is missing or mismatched
6. After dual review and targeted checkoff verification pass, immediately continue to the next task without summarizing or asking whether to continue

## Design Phase Special Recovery

- If the user has not yet confirmed the design approach, return to brainstorming
- If the user has confirmed, continue creating the Design Doc
- On recovery, reload `brainstorm-summary.md` + handoff context files

## Verify/Archive Phase Recovery

- Verify: script outputs verification status, branch status, and recovery action
- Archive: if `archived: true` and archive directory exists, archival is complete — do not re-execute
