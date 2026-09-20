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

```yaml
review_mode: committed # or worktree
review_base_ref: <fixed-point>
merge_base: <resolved-sha>
implementation_candidate_ref: HEAD # or working-tree
candidate_snapshot_ref: <immutable-commit-or-captured-snapshot>
candidate_digest: <sha256-or-immutable-tree-id>
tracked_diff_command: <command>
untracked_inventory_command: <command-or-null>
untracked_files: []
commit_list_command: <command>
```

For a Committed candidate, resolve `HEAD` to an immutable commit and tree before review. Its manifest must include `merge_base`, `tracked_diff_command` and `commit_list_command`. For a Worktree candidate, the manifest must additionally include `untracked_inventory_command`, `untracked_diff_command` and the exact `untracked_files` inventory.

For a Worktree candidate, capture the tracked binary diff and every untracked file's bytes once into an immutable snapshot, compute `candidate_digest`, and make that **captured candidate** available to the assigned reviewer(s). The following is normative, not illustrative: use the `yss-worktree-candidate-v1` byte stream. Start with ASCII `YSS-WORKTREE-CANDIDATE-V1` followed by one NUL byte. Append one tracked record: byte `0x54`, unsigned 64-bit big-endian binary-diff byte length, then the exact stdout bytes from `git diff --no-ext-diff --binary --full-index <merge-base>`. Then append one untracked record for each NUL-delimited raw path from `git ls-files -z --others --exclude-standard`, sorted bytewise by the raw path: byte `0x55`, unsigned 64-bit big-endian path length, raw path bytes, unsigned 32-bit big-endian `lstat` mode, entry-kind byte (`0x52` regular or `0x4c` symlink), unsigned 64-bit big-endian content length, then raw regular-file bytes or raw symlink-target bytes. Other entry kinds block capture. This is the sole length-prefixed framing and bytewise path order for the digest. SHA-256 is calculated over exactly this stream. New captures use a previously nonexistent directory under `.template-source/evidence/maintenance/`, land atomically, and store exactly `candidate-manifest.yaml`, `candidate.bin` and `tracked.diff`; `candidate.bin` already contains every untracked byte, so do not duplicate hundreds of `untracked-content/000xxx` files. Explicit exclusions are fail-closed to `.template-source/evidence/maintenance/` evidence and cannot exclude implementation or authority assets. Historical per-file snapshots remain readable. Every assigned reviewer must consume the captured stream and must not independently treat a live worktree as the reviewed candidate.

Before going further, confirm the fixed point and merge-base resolve. A committed candidate must have a non-empty committed diff. A Worktree candidate is non-empty when either its tracked diff or untracked inventory is non-empty. A bad ref, missing candidate part or empty candidate should fail here — not during professional review. Do not silently downgrade Worktree review to `HEAD`-only review.
