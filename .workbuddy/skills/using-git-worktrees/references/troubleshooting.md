# 工作树常见错误

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。Git、依赖安装和测试命令从当前仓库或选定的工作树根目录执行。

## Quick Reference

| Situation | Action |
|-----------|--------|
| Current execution unit has a suitable linked worktree | Reuse it (Step 0) |
| Parent is a linked worktree, another concurrent writer is not | Reuse independent isolation or select an external sibling; never default inside the parent |
| In a submodule | Treat as normal repo (Step 0 guard) |
| Native worktree tool available | Use it (Step 1a) |
| No native tool | Git worktree fallback (Step 1b) |
| Main checkout has `.worktrees/` | Use it after target containment and ignore checks |
| Main checkout has `worktrees/` | Use it after target containment and ignore checks |
| Both exist in the main checkout | Prefer `.worktrees/` |
| Neither exists in the main checkout | Default to its `.worktrees/`; linked worktrees use external siblings |
| Candidate resolves inside a linked worktree, including through a symlink | Reject that location; select an authorized independent target |
| Directory not ignored | Add to .gitignore; commit only when authorized |
| Permission error on create | Report failure; preserve the requested isolation boundary |
| Tests fail during baseline | Record failures; continue authorized diagnosis |
| No package.json/Cargo.toml | Skip dependency install |

### Fighting the harness

- **Problem:** Using `git worktree add` when the platform provides a native workspace tool
- **Fix:** Step 0 detects existing isolation. Step 1a defers to native tools.

### Skipping detection

- **Problem:** Creating a nested worktree inside an existing one
- **Fix:** Run Step 0 for each execution unit; linked worktrees skip internal directory defaults. Resolve the target and its existing ancestors, then check against registered worktree roots before creation

### Skipping ignore verification

- **Problem:** Worktree contents get tracked, pollute git status
- **Fix:** Run `git check-ignore` from the containing main checkout for the actual selected target; an ignored alternative directory does not suffice

### Assuming directory location

- **Problem:** Creates inconsistency, violates project conventions
- **Fix:** Follow [directory selection and target validation](git-fallback.md); distinguish the main checkout from a linked worktree before applying defaults

### Losing prerequisites

- **Problem:** A new worktree starts from HEAD while the prerequisite exists only as an uncommitted change
- **Fix:** Verify the actual required files, preserve user edits, and continue sequentially in the source workspace if reliable transfer is unavailable; never commit or reset user work just to clean the baseline

### Proceeding with failing tests

- **Problem:** Can't distinguish new bugs from pre-existing issues
- **Fix:** Distinguish baseline failures from new defects; ask only for a missing decision
