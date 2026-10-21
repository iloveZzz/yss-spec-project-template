# 项目准备与基线验证

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。Git、依赖安装和测试命令从当前仓库或选定的工作树根目录执行。

## Step 2: Project Setup

Auto-detect and run appropriate setup:

```bash
# Node.js: inspect packageManager, lockfile and project instructions first.
# In a pnpm project, use the recorded version and frozen lockfile:
# pnpm install --frozen-lockfile
# Use npm/yarn only when the repository actually declares them.

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

## Step 3: Verify Clean Baseline

Run tests to ensure workspace starts clean:

```bash
# Use project-appropriate command
pnpm test / cargo test / pytest / go test ./... # select the declared project runner
```

**If tests fail:** Record the existing failure and investigate within the authorized scope. Ask only if a new decision or access is needed; do not label the baseline clean.

**If tests pass:** Report ready.

### Report

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```
