### 1. Pin the fixed point and candidate

Whatever the user said is the fixed point — a commit SHA, branch name, tag, `main`, `HEAD~5`, etc. If they didn't specify one, ask for it.

Choose one candidate mode from the request or an upstream review contract:

- **Committed candidate** — review committed branch/PR state. Capture `git diff <fixed-point>...HEAD` and `git log <fixed-point>..HEAD --oneline`.
- **Worktree candidate** — review work in progress without requiring a commit. Resolve `<merge-base>` with `git merge-base <fixed-point> HEAD`, then capture:
  - `git diff --no-ext-diff --binary --full-index <merge-base>` for committed, staged and unstaged tracked content as it exists in the working tree;
  - `git ls-files -z --others --exclude-standard` for NUL-delimited raw untracked paths;
  - each untracked file's content, using `git diff --no-index --no-ext-diff --binary --full-index -- /dev/null <path>` when a diff representation is useful. Exit code `1` from this command means a difference was found, not that review failed;
  - `git log <fixed-point>..HEAD --oneline` for the committed portion of the candidate.

Record one **candidate manifest** before review:

For a Committed candidate, resolve `HEAD` to an immutable commit and tree before review. Its manifest must include `merge_base`, `tracked_diff_command` and `commit_list_command`. For a Worktree candidate, the manifest must additionally include `untracked_inventory_command`, `untracked_diff_command` and the exact `untracked_files` inventory.

Before going further, confirm the fixed point and merge-base resolve. A committed candidate must have a non-empty committed diff. A Worktree candidate is non-empty when either its tracked diff or untracked inventory is non-empty. A bad ref, missing candidate part or empty candidate should fail here — not during professional review. Do not silently downgrade Worktree review to `HEAD`-only review.
