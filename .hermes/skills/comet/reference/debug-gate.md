# Debug Gate Protocol

Canonical path: `comet/reference/debug-gate.md`

This protocol is shared by comet sub-skills that directly modify code, including build, hotfix, and tweak. Enter the Debug Gate when a crash, unexpected behavior, test failure, or build failure appears while running the program, tests, build, or manual verification.

## Core Rules

- Immediately use the Skill tool to load the Superpowers `systematic-debugging` skill
- Do not propose or implement source fixes before the root cause investigation is complete

## Four-Stage Flow

1. Reproduce and locate the root cause first by reading the full error, checking recent changes, and tracing data flow
2. If the root cause is a source bug, first add a minimal failing test that reproduces the crash or unexpected behavior, then modify the source
3. After the fix, run that failing test, related tests, and the project's build or verification commands until all pass
4. Keep the test, the source fix, and the tasks.md checkoff in the current change; do not replace the current change verification loop by starting a separate “write test cases” change