---
name: resolving-merge-conflicts
description: "Use when you need to resolve an in-progress git merge/rebase conflict."
---

1. **See the current state** of the merge/rebase. Check git history, and the conflicting files.

2. **Find the primary sources** for each conflict. Understand deeply why each change was made, and what the original intent was. Read the commit messages, check the PRs, check original issues/tickets.

3. **Resolve each hunk.** Preserve both intents where possible. Where incompatible, pick the one matching the merge's stated goal and note the trade-off. Do **not** invent new behaviour. If the intents cannot be reconciled safely, report the conflicting decision. Abort only when the user has authorized it; do not discard work to hide a conflict.

4. Discover the project's **automated checks** and run them — typically typecheck, then tests, then format. Fix anything the merge broke.

5. **Return the resolved files and verification.** Preserve the initial index and unrelated dirty files. Stage only the explicitly authorized conflict paths, never the entire working tree. Commit, or continue a merge/rebase when that creates commits, only with current authorization covering that action; otherwise leave the resolution ready for review and report the next command.
