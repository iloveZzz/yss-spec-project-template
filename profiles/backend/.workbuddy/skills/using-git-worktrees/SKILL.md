---
name: using-git-worktrees
description: "Set up Git worktree isolation for concurrent work."
---

# Using Git Worktrees

## Overview

Ensure work happens in an isolated workspace. Prefer your platform's native worktree tools. Fall back to manual git worktrees only when no native tool is available.

**Core principle:** Detect existing isolation first. Then use native tools. Then fall back to git. Never fight the harness.

**Announce at start:** "I'm using the using-git-worktrees skill to set up an isolated workspace."

## Step 0: Detect Existing Isolation

**Before creating anything, check isolation for the execution unit that will write, not only for its parent Agent.**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**Submodule guard:** `GIT_DIR != GIT_COMMON` is also true inside git submodules. Before concluding "already in a worktree," verify you are not in a submodule:

```bash
# If this returns a path, you're in a submodule, not a worktree — treat as normal repo
git rev-parse --show-superproject-working-tree 2>/dev/null
```

**If `GIT_DIR != GIT_COMMON` (and not a submodule):** This checkout is a linked worktree. Reuse it when it isolates the current execution unit. A parent being isolated does not isolate another concurrent writer: reuse a suitable independent workspace or create a sibling via Step 1, never a nested worktree. Also check shared build outputs, test databases and ports; directories alone do not isolate them.

Report with branch state:
- On a branch: "Already in isolated workspace at `<path>` on branch `<name>`."
- Detached HEAD: "Already in isolated workspace at `<path>` (detached HEAD, externally managed). Keep the host-managed state; create a branch only when the task needs one."

**If `GIT_DIR == GIT_COMMON` (or in a submodule):** You are in a normal repo checkout.

Reuse the caller's existing authorization for local isolation and the user's directory preference. This shared method does not grant parallel-development or Git commit permission. If creating isolation is not already authorized, ask for consent:

> "Would you like me to set up an isolated worktree? It protects your current branch from changes."

Honor existing authorization without asking again. If declined, work in place only within the task's allowed isolation boundary; otherwise continue independent work and explain the constraint.

## Step 1: Create Isolated Workspace

**You have two mechanisms. Try them in this order.**

### 1a. Native Worktree Tools (preferred)

Local isolation is authorized (Step 0). Do you already have a way to create a worktree? It might be a tool with a name like `EnterWorktree`, `WorktreeCreate`, a `/worktree` command, or a `--worktree` flag. If you do, use it and verify the resulting workspace and actual baseline.

Native tools handle directory placement, branch creation, and cleanup automatically. Using `git worktree add` when you have a native tool creates phantom state your harness can't see or manage.

Only proceed to Step 1b if you have no native worktree tool available.

### 1b. Git Worktree Fallback

仅无原生工具且创建已获授权时，读取 [手工 Git worktree 创建](references/git-fallback.md)。目录遵循用户偏好；已有 linked worktree 时选择外部并列目录，不沿用其内部 `.worktrees/` 默认值。创建前按该方法核对实际路径包含关系及适用忽略规则；失败时保留当前 checkout 和隔离边界。

## 工作区准备

核对当前执行单元实际读取的基线和未提交前置修改，不擅自 stash、reset、提交用户工作或整目录复制。新工作区不能可靠取得必要前置内容时，将依赖它的工作留在原工作区顺序完成。依赖安装和检查由实际工程及当前任务决定；不因创建工作树自动安装或运行全部测试。

## 排查

遇到目录选择、嵌套工作树、忽略规则或基线失败时，读取 [常见错误速查](references/troubleshooting.md)。

## Red Flags

**Never:**
- Duplicate a suitable workspace for the same execution unit, or assume the parent's worktree isolates every concurrent writer
- Use `git worktree add` when you have a native worktree tool (e.g., `EnterWorktree`). This is the #1 mistake — if you have it, use it.
- Skip Step 1a by jumping straight to Step 1b's git commands
- Create worktree without verifying it's ignored (project-local)

**Always:**
- Run Step 0 detection first
- Prefer native tools over git fallback
- Follow explicit directory preferences after validating containment; use sibling locations for linked worktrees and project-local defaults only for the main checkout
- Verify directory is ignored for project-local
- Verify the actual baseline and preserve user changes; prepare the project only as the task requires
